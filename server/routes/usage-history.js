'use strict';

// ── GET /usage-history ──────────────────────────────────────────────────────
// Returns the day-by-day usage_daily rows for a date range — powers the
// Analytics page's charts. Same verification gate as every other
// account-data route (proposal.js, analyse.js, status.js): typing a
// stranger's email must not reveal their real activity.

const express = require('express');
const router  = express.Router();
const { getUser, supabase } = require('../modules/db');

router.get('/', async (req, res) => {
  try {
    const email = (req.query.email || '').trim().toLowerCase();
    const from  = (req.query.from || '').trim();
    const to    = (req.query.to   || '').trim();

    const isRealEmail = email && email.includes('@') && !email.includes('propwise.local');
    if (!isRealEmail) {
      return res.status(403).json({ error: 'Please add and verify your email in Settings to use Snag AI.', requiresEmail: true });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'from and to must be YYYY-MM-DD.' });
    }

    const userRecord = await getUser(email);
    const isPaid = userRecord?.plan && userRecord.plan !== 'free' && userRecord.active !== false;
    if (!isPaid && !userRecord?.email_verified) {
      return res.status(403).json({ error: 'Please verify your email to view usage history.', requiresVerification: true });
    }

    const rows = await supabase('GET', 'usage_daily', null,
      `?email=eq.${encodeURIComponent(email)}&day=gte.${from}&day=lte.${to}&order=day.asc`);

    res.json({ history: Array.isArray(rows) ? rows : [] });
  } catch(err) {
    console.error('[USAGE_HISTORY] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
