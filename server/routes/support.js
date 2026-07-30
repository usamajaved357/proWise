'use strict';

const express = require('express');
const router  = express.Router();
const { sendSupportRequestEmail } = require('../modules/email');

// Simple in-memory throttle — one request per email every 2 minutes, resets on restart.
// Good enough to stop accidental double-submits/spam without adding a new dependency.
const lastSentAt = new Map();
const THROTTLE_MS = 2 * 60 * 1000;

router.post('/contact', async (req, res) => {
  const email    = (req.body.email || '').trim().toLowerCase();
  const category = (req.body.category || 'General').trim().slice(0, 80);
  const message  = (req.body.message || '').trim().slice(0, 2000);

  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required.' });
  if (!message || message.length < 5) return res.status(400).json({ error: 'Add a few words about what you need help with.' });

  const last = lastSentAt.get(email);
  if (last && Date.now() - last < THROTTLE_MS) {
    return res.status(429).json({ error: 'Already sent. Give us a moment before sending another.' });
  }

  await sendSupportRequestEmail(email, category, message);
  lastSentAt.set(email, Date.now());

  res.json({ ok: true, message: "Thanks, we'll get back to you soon." });
});

module.exports = router;
