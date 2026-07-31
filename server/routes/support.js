'use strict';

const express = require('express');
const router  = express.Router();
const { sendSupportRequestEmail } = require('../modules/email');

// Simple in-memory throttle — one request per email every 2 minutes, resets on restart.
// Good enough to stop accidental double-submits/spam without adding a new dependency.
const lastSentAt = new Map();
const THROTTLE_MS = 2 * 60 * 1000;

// image/svg+xml deliberately excluded — SVGs can carry embedded script/markup.
const ALLOWED_ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_ATTACHMENT_BASE64_CHARS = 7_000_000; // ~5MB binary once decoded
const MAX_ATTACHMENT_COUNT = 4;
const MAX_TOTAL_ATTACHMENT_BASE64_CHARS = 21_000_000; // ~15MB combined binary

function parseAttachment(raw) {
  if (!raw || typeof raw !== 'object') return { attachment: null, error: null };
  const filename    = String(raw.filename || 'attachment').trim().slice(0, 120).replace(/[^\w.\-() ]/g, '_');
  const contentType = String(raw.contentType || '').trim().toLowerCase();
  const dataBase64   = String(raw.dataBase64 || '').replace(/^data:[^;]+;base64,/, '');

  if (!ALLOWED_ATTACHMENT_TYPES.includes(contentType)) {
    return { attachment: null, error: 'Attachments must be an image (PNG, JPG, WEBP or GIF).' };
  }
  if (!dataBase64 || dataBase64.length > MAX_ATTACHMENT_BASE64_CHARS) {
    return { attachment: null, error: 'Each attachment must be under 5MB.' };
  }
  return { attachment: { filename, contentType, dataBase64 }, error: null };
}

function parseAttachments(rawList) {
  if (!Array.isArray(rawList) || !rawList.length) return { attachments: [], error: null };
  if (rawList.length > MAX_ATTACHMENT_COUNT) {
    return { attachments: null, error: `You can attach up to ${MAX_ATTACHMENT_COUNT} images.` };
  }
  const attachments = [];
  let totalChars = 0;
  for (const raw of rawList) {
    const { attachment, error } = parseAttachment(raw);
    if (error) return { attachments: null, error };
    if (!attachment) continue;
    totalChars += attachment.dataBase64.length;
    if (totalChars > MAX_TOTAL_ATTACHMENT_BASE64_CHARS) {
      return { attachments: null, error: 'Attachments must total under 15MB combined.' };
    }
    attachments.push(attachment);
  }
  return { attachments, error: null };
}

router.post('/contact', async (req, res) => {
  const email    = (req.body.email || '').trim().toLowerCase();
  const category = (req.body.category || 'General').trim().slice(0, 80);
  const message  = (req.body.message || '').trim().slice(0, 2000);
  const transcript = Array.isArray(req.body.transcript)
    ? req.body.transcript.filter(step => typeof step === 'string').map(step => step.trim().slice(0, 200)).slice(0, 30)
    : [];

  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required.' });
  if (!message || message.length < 5) return res.status(400).json({ error: 'Add a few words about what you need help with.' });

  const { attachments, error: attachmentError } = parseAttachments(req.body.attachments);
  if (attachmentError) return res.status(400).json({ error: attachmentError });

  const last = lastSentAt.get(email);
  if (last && Date.now() - last < THROTTLE_MS) {
    return res.status(429).json({ error: 'Already sent. Give us a moment before sending another.' });
  }

  await sendSupportRequestEmail(email, category, message, transcript, attachments);
  lastSentAt.set(email, Date.now());

  res.json({ ok: true, message: "Thanks, we'll get back to you soon." });
});

module.exports = router;
