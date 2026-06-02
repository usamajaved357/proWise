'use strict';

const express = require('express');
const router  = express.Router();
const { getUserStatus } = require('../modules/usage');
const { getAnon }       = require('../modules/db');

router.post('/', async (req, res) => {
  try {
    const { email, anonId } = req.body;
    if (email && email.includes('@') && !email.includes('propwise.local')) {
      const status = await getUserStatus(email);
      return res.json(status);
    }
    if (anonId) {
      const u    = await getAnon(anonId);
      const used = u?.used || 0;
      return res.json({ plan: 'free', limit: 2, used, remaining: Math.max(0, 2 - used) });
    }
    res.json({ plan: 'free', limit: 2, used: 0, remaining: 2 });
  } catch(e) {
    console.error('Status error:', e.message);
    res.json({ plan: 'free', limit: 2, used: 0, remaining: 2 });
  }
});

module.exports = router;
