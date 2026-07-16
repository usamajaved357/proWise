'use strict';

const express = require('express');
const router  = express.Router();
const { getUserStatus } = require('../modules/usage');
const { getAnon }       = require('../modules/db');
const { PLANS }         = require('../modules/config');

// Anonymous/no-email callers still need the full feature shape (auditLimit,
// jobAuditLimit, features, ...) — content scripts gate UI buttons off these
// fields, and a response missing them (undefined !== 0) used to leave
// plan-gated buttons visible by default instead of hidden.
function freeStatus(used = 0) {
  const cfg = PLANS.free;
  return {
    plan: 'free', limit: cfg.coverLetters.limit, used, remaining: Math.max(0, cfg.coverLetters.limit - used),
    auditLimit: cfg.profileAudits.limit, usedAudits: 0, remainingAudits: cfg.profileAudits.limit,
    jobAuditLimit: cfg.jobAudits.limit, usedJobAudits: 0, remainingJobAudits: cfg.jobAudits.limit,
    features: cfg,
  };
}

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
      return res.json(freeStatus(used));
    }
    res.json(freeStatus());
  } catch(e) {
    console.error('Status error:', e.message);
    res.json(freeStatus());
  }
});

module.exports = router;
