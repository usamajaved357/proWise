'use strict';

const express = require('express');
const router  = express.Router();
const { sendOTPEmail }          = require('../modules/email');
const { getUser, upsertUser }   = require('../modules/db');

// In-memory OTP store — { email: { code, expires } }
// Lost on server restart (user just re-requests — 10 min window)
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /verify/send  — generate & email a 6-digit code
router.post('/send', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required.' });
  }

  // If already verified and on paid plan, skip (don't lock out existing customers)
  try {
    const user = await getUser(email);
    if (user?.email_verified && user?.plan && user.plan !== 'free') {
      return res.json({ ok: true, alreadyVerified: true });
    }
  } catch(e) { /* proceed */ }

  const code    = generateOTP();
  const expires = Date.now() + 10 * 60 * 1000; // 10 min
  otpStore.set(email, { code, expires, attempts: 0 });

  console.log(`[OTP] Sent to ${email}: ${code}`);
  await sendOTPEmail(email, code);

  res.json({ ok: true, message: 'Verification code sent. Check your email.' });
});

// POST /verify/confirm  — validate code, mark email verified
router.post('/confirm', async (req, res) => {
  const email    = (req.body.email || '').trim().toLowerCase();
  const code     = (req.body.code  || '').trim();
  const deviceId = req.body.deviceId || '';

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }

  const entry = otpStore.get(email);
  if (!entry) {
    return res.status(400).json({ error: 'No code was requested for this email. Send a new one.' });
  }
  if (Date.now() > entry.expires) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'Code expired. Request a new one.' });
  }

  // Limit brute-force attempts
  entry.attempts = (entry.attempts || 0) + 1;
  if (entry.attempts > 5) {
    otpStore.delete(email);
    return res.status(429).json({ error: 'Too many attempts. Request a new code.' });
  }

  if (entry.code !== code) {
    return res.status(400).json({ error: 'Incorrect code. Try again.' });
  }

  // Code correct — mark verified in Supabase
  otpStore.delete(email);
  try {
    await upsertUser(email, { email_verified: true });
  } catch(e) {
    console.error('[VERIFY] Supabase update failed:', e.message);
  }

  console.log(`[OTP] Verified: ${email} | device: ${deviceId}`);
  res.json({ ok: true, message: 'Email verified successfully.' });
});

// GET /verify/status — check if email is verified (used on extension load)
router.get('/status', async (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email required.' });
  try {
    const user = await getUser(email);
    res.json({ verified: !!(user?.email_verified) });
  } catch(e) {
    res.json({ verified: false });
  }
});

module.exports = router;
