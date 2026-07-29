'use strict';

const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const { getUser, upsertUser, supabase } = require('../modules/db');
const { sendReviewInviteEmail } = require('../modules/email');

const PUBLIC_BASE_URL = process.env.PUBLIC_LANDING_URL || 'http://localhost:8080';
const TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48h — an emailed link, not a live-entered code
const SECRET = process.env.LICENSE_SECRET || 'dev-secret';

function isPaid(user) {
  return !!(user?.plan && user.plan !== 'free' && user.active !== false);
}

// POST /reviews/invite — verify the email is a real paying customer, email them a one-time review link
router.post('/invite', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required.' });
  }

  const user = await getUser(email);
  if (!isPaid(user)) {
    return res.status(404).json({ error: 'This email isn\'t registered with a Snag AI plan. Use the email tied to your account.' });
  }

  const existingReviews = await supabase('GET', 'reviews', null, `?email=eq.${encodeURIComponent(email)}&limit=1`);
  if (Array.isArray(existingReviews) && existingReviews.length > 0) {
    return res.status(409).json({ error: 'You\'ve already submitted a review with this email. Thank you!' });
  }

  const token   = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  await upsertUser(email, { review_token: token, review_token_expires: expires });

  const link = `${PUBLIC_BASE_URL}/write-review.html?token=${token}&email=${encodeURIComponent(email)}`;
  console.log(`[REVIEW INVITE] Link for ${email}: ${link}`);
  await sendReviewInviteEmail(email, link);

  res.json({ ok: true, message: 'Check your inbox for the review link.' });
});

// GET /reviews/invite/check — the write-review page calls this on load to decide whether to show the form
router.get('/invite/check', async (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  const token = (req.query.token || '').trim();
  if (!email || !token) return res.json({ ok: false, error: 'Missing link information.' });

  const user = await getUser(email);
  if (!user?.review_token || user.review_token !== token) {
    return res.json({ ok: false, error: 'This link is invalid or has already been used.' });
  }
  if (!user.review_token_expires || Date.now() > new Date(user.review_token_expires).getTime()) {
    return res.json({ ok: false, error: 'This link has expired. Request a new one from the homepage.' });
  }
  res.json({ ok: true, plan: user.plan });
});

// POST /reviews/submit — the write-review page's form submit
router.post('/submit', async (req, res) => {
  const email  = (req.body.email || '').trim().toLowerCase();
  const token  = (req.body.token || '').trim();
  const rating = Number(req.body.rating);
  const text   = (req.body.text || '').trim().slice(0, 800);
  const name   = (req.body.name || '').trim().slice(0, 60);
  const title  = (req.body.title || '').trim().slice(0, 60);

  if (!email || !token) return res.status(400).json({ error: 'Missing link information.' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Pick a rating from 1 to 5.' });
  if (!text || text.length < 10) return res.status(400).json({ error: 'Write a few words about your experience.' });
  if (!name) return res.status(400).json({ error: 'Enter your name.' });
  if (!title) return res.status(400).json({ error: 'Enter your role or title.' });

  const user = await getUser(email);
  if (!user?.review_token || user.review_token !== token) {
    return res.status(400).json({ error: 'This link is invalid or has already been used.' });
  }
  if (!user.review_token_expires || Date.now() > new Date(user.review_token_expires).getTime()) {
    return res.status(400).json({ error: 'This link has expired. Request a new one from the homepage.' });
  }

  await supabase('POST', 'reviews', { email, rating, review_text: text, reviewer_name: name, reviewer_title: title, plan: user.plan, approved: false });
  await upsertUser(email, { review_token: null, review_token_expires: null }); // single-use

  res.json({ ok: true, message: 'Thanks! Your review is in for approval.' });
});

// GET /reviews/public — approved reviews only, for the landing page
router.get('/public', async (req, res) => {
  try {
    const rows = await supabase('GET', 'reviews', null, '?approved=eq.true&order=created_at.desc&limit=30');
    const safe = rows.map(r => ({ rating: r.rating, text: r.review_text, name: r.reviewer_name, title: r.reviewer_title, plan: r.plan }));
    res.json({ reviews: safe });
  } catch(e) {
    res.json({ reviews: [] });
  }
});

// POST /reviews/:id/approve — admin-only, same gate as routes/admin.js
router.post('/:id/approve', async (req, res) => {
  if (req.headers['x-admin-secret'] !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  await supabase('PATCH', 'reviews', { approved: true }, `?id=eq.${encodeURIComponent(req.params.id)}`);
  res.json({ ok: true });
});

module.exports = router;
