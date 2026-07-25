'use strict';

const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const { sendMagicLinkEmail }    = require('../modules/email');
const { getUser, upsertUser }   = require('../modules/db');

// Base URL the emailed link points at — must match whichever server is
// actually running (dev vs prod), or the link 404s / points at the wrong
// place. Defaults to local dev; set PUBLIC_BASE_URL in production.
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min — longer than the old OTP's 10,
// since checking email takes longer than reading a code off the same screen.

// Token lives on the user row itself (verify_token/verify_token_expires),
// not in-memory — an in-memory store would silently break if the server
// restarts between "link sent" and "link clicked", which is a much longer
// and more realistic gap for email than it was for a live-entered OTP.

function renderConfirmPage({ ok, message }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Snag AI</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0d1120;color:#f0eeea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.card{max-width:380px;padding:40px 32px;text-align:center}
.icon{width:52px;height:52px;margin:0 auto 18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;background:${ok ? 'rgba(52,211,153,.14)' : 'rgba(248,113,113,.14)'};color:${ok ? '#34d399' : '#f87171'}}
h1{font-size:19px;font-weight:700;margin:0 0 8px}
p{font-size:14px;color:rgba(240,238,234,.55);line-height:1.6;margin:0}
</style></head>
<body><div class="card">
<div class="icon">${ok ? '✓' : '✕'}</div>
<h1>${ok ? 'Email verified' : 'Verification failed'}</h1>
<p>${message}</p>
</div></body></html>`;
}

// POST /verify/send-link — generate a token, email a magic link
router.post('/send-link', async (req, res) => {
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

  const token   = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  try {
    await upsertUser(email, { verify_token: token, verify_token_expires: expires });
  } catch(e) {
    return res.status(500).json({ error: 'Could not start verification. Try again.' });
  }

  const link = `${PUBLIC_BASE_URL}/verify/confirm-link?token=${token}&email=${encodeURIComponent(email)}`;
  console.log(`[VERIFY] Link for ${email}: ${link}`);
  await sendMagicLinkEmail(email, link);

  res.json({ ok: true, message: 'Verification link sent. Check your email.' });
});

// GET /verify/confirm-link — the emailed link itself
router.get('/confirm-link', async (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  const token = (req.query.token || '').trim();

  if (!email || !token) {
    return res.status(400).send(renderConfirmPage({ ok: false, message: 'This link is missing information. Request a new one from the Snag AI extension.' }));
  }

  let user;
  try {
    user = await getUser(email);
  } catch(e) {
    return res.status(500).send(renderConfirmPage({ ok: false, message: 'Something went wrong. Try again in a moment.' }));
  }

  if (!user?.verify_token || user.verify_token !== token) {
    return res.status(400).send(renderConfirmPage({ ok: false, message: 'This link is invalid or has already been used. Request a new one from the Snag AI extension.' }));
  }
  if (!user.verify_token_expires || Date.now() > new Date(user.verify_token_expires).getTime()) {
    return res.status(400).send(renderConfirmPage({ ok: false, message: 'This link has expired. Request a new one from the Snag AI extension.' }));
  }

  try {
    await upsertUser(email, { email_verified: true, verify_token: null, verify_token_expires: null });
  } catch(e) {
    return res.status(500).send(renderConfirmPage({ ok: false, message: 'Something went wrong saving your verification. Try again.' }));
  }

  console.log(`[VERIFY] Confirmed: ${email}`);
  res.send(renderConfirmPage({ ok: true, message: 'You can close this tab and return to the Snag AI extension — it updates automatically.' }));
});

// GET /verify/status — check if email is verified (used to poll after sending a link)
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
