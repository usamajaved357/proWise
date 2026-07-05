'use strict';

// ── POST /agency-audit ──────────────────────────────────────────────────────
// Receives scraped agency profile data, scores it with Claude, returns
// structured audit. Mirrors server/routes/profile-audit.js's engineering
// discipline exactly (deterministic score recompute, quote-format
// validation), but with agency-specific weights and no title-length check
// (agencies don't have the freelancer profile-title field).

const express = require('express');
const router  = express.Router();
const { AGENCY_AUDIT_SYSTEM, buildAgencyAuditMessage } = require('../prompt-agency-audit');
const { callClaudeRaw } = require('../claude-client');
const { checkQuoteFormatting, computeWeightedScore, logJsonParseFailure, repairAndParseJSON, buildAuditResponseSchema } = require('../audit-shared');

// Must match the "overallScore = weighted average" line in prompt-agency-audit.js
// and sum to exactly 1.
const SECTION_WEIGHTS = {
  summary: 0.10, description: 0.12, skills: 0.08, services: 0.08, portfolio: 0.15,
  featuredClients: 0.07, workHistory: 0.12, credibility: 0.10, team: 0.10, positioning: 0.08,
};

// Schema-enforced structured output — see claude-client.js's callClaudeRaw
// for why this replaced regex-extracting/repairing a freehand JSON response.
const AGENCY_AUDIT_SCHEMA = buildAuditResponseSchema(Object.keys(SECTION_WEIGHTS));

router.post('/', async (req, res) => {
  try {
    const { agency } = req.body;
    if (!agency) return res.status(400).json({ error: 'agency is required' });

    const userMessage = buildAgencyAuditMessage(agency);
    if (process.env.AUDIT_DEBUG === '1') {
      console.log('[AGENCY_AUDIT][DEBUG] Full rendered prompt sent to Claude:\n' + userMessage);
    }
    console.log('[AGENCY_AUDIT] Auditing agency:', (agency.name || '').slice(0, 40), '| Rate:', agency.minRate, '-', agency.maxRate);

    const { text: rawText, usage } = await callClaudeRaw(AGENCY_AUDIT_SYSTEM, userMessage, AGENCY_AUDIT_SCHEMA);
    console.log('[AGENCY_AUDIT] Raw response length:', rawText.length);
    if (usage) {
      console.log(`[AGENCY_AUDIT] Tokens — input: ${usage.input_tokens}, output: ${usage.output_tokens}, cache_write: ${usage.cache_creation_input_tokens || 0}, cache_read: ${usage.cache_read_input_tokens || 0}`);
    }

    // Schema-enforced output should already be valid JSON with no wrapper —
    // repairAndParseJSON is kept as defense-in-depth, not because it's
    // expected to trigger anymore.
    let audit;
    try {
      audit = repairAndParseJSON(rawText);
    } catch(e) {
      logJsonParseFailure('AGENCY_AUDIT', rawText, e);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    if (typeof audit.overallScore !== 'number' || !audit.sections) {
      return res.status(500).json({ error: 'Incomplete audit response' });
    }

    const claudeScore = audit.overallScore;
    computeWeightedScore(audit, SECTION_WEIGHTS);
    checkQuoteFormatting(audit);
    console.log('[AGENCY_AUDIT] Score:', audit.overallScore, '(Claude said:', claudeScore, ') | Status:', audit.status);
    return res.json({ success: true, audit });

  } catch(e) {
    console.error('[AGENCY_AUDIT] Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
