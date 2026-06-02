'use strict';

const express = require('express');
const router  = express.Router();
const { currentMonth } = require('../modules/config');
const { getUser, upsertUser, updateUser, supabase } = require('../modules/db');
const { getUserStatus } = require('../modules/usage');

const SECRET = process.env.LICENSE_SECRET || 'dev-secret';

// Routes use full paths so this router can be mounted at root ('/')

// Manual activate — for testing without Paddle
router.post('/activate', async (req, res) => {
  const { email, plan = 'agency', secret } = req.body;
  if (secret !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  if (!email) return res.status(400).json({ error: 'Email required' });

  const existing = await getUser(email);
  if (existing) {
    await updateUser(email, { plan, active: true, sub_id: 'manual', billing_month: currentMonth() });
    console.log('Updated existing user:', email, '→', plan);
  } else {
    await upsertUser(email, { plan, active: true, used: 0, billing_month: currentMonth() });
    console.log('Created new user:', email, '→', plan);
  }

  await new Promise(r => setTimeout(r, 300));
  const status = await getUserStatus(email);
  console.log('Status after activate:', status);
  res.json({ ok: true, email, plan, status });
});

router.post('/admin/grant', async (req, res) => {
  if (req.headers['x-admin-secret'] !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const { email, plan = 'pro' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  await upsertUser(email, { plan, active: true, used: 0, billing_month: currentMonth() });
  res.json({ ok: true, email, plan });
});

router.get('/admin/users', async (req, res) => {
  if (req.headers['x-admin-secret'] !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const users = await supabase('GET', 'users', null, '?order=created_at.desc&limit=100');
  res.json({ count: users.length, users });
});

module.exports = router;
