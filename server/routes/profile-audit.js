'use strict';

// ── POST /profile-audit ─────────────────────────────────────────────────────
// Receives scraped profile data, scores it with Claude, returns structured audit

const express = require('express');
const router  = express.Router();
const { AUDIT_SYSTEM, buildAuditMessage } = require('../prompt-audit');
const { callClaudeRaw } = require('../claude-client');
const { checkQuoteFormatting, computeWeightedScore, QUOTE_RE_GLOBAL, logJsonParseFailure, repairAndParseJSON, buildAuditResponseSchema } = require('../audit-shared');

// Weights must match the "overallScore = weighted average" line in prompt-audit.js
// and sum to exactly 1 (they previously summed to 1.10 in the prompt text, which
// let the model's own arithmetic drift — this is now the single source of truth).
const SECTION_WEIGHTS = {
  title: 0.08, bio: 0.15, skills: 0.08, portfolio: 0.15, history: 0.15,
  credibility: 0.08, certificates: 0.08, completeness: 0.08, positioning: 0.15,
};

// Schema-enforced structured output — see claude-client.js's callClaudeRaw
// for why this replaced regex-extracting/repairing a freehand JSON response.
const AUDIT_SCHEMA = buildAuditResponseSchema(Object.keys(SECTION_WEIGHTS));

// Upwork's profile title field has a documented 70-character hard limit —
// support.upwork.com/hc/en-us/articles/34958631345171-Profile-title. Anything
// longer is silently truncated on the live profile with no error, so this is
// worth catching even though the prompt now instructs Claude to self-check.
// Freelancer-specific — agencies don't have this field, so this stays local
// rather than moving to audit-shared.js.
const TITLE_LIMIT = 70;

function checkTitleLength(audit) {
  const titleSection = (audit.sections || []).find(sec => sec.id === 'title');
  if (!titleSection || !titleSection.fix) return;
  const quoted = [...titleSection.fix.matchAll(QUOTE_RE_GLOBAL)].map(m => m[2]);
  quoted.forEach(q => {
    if (q.length > TITLE_LIMIT) {
      console.warn(`[AUDIT] Suggested title is ${q.length} chars, exceeds Upwork's ${TITLE_LIMIT}-char limit and will be truncated on the live profile: "${q}"`);
    }
  });
}

router.post('/', async (req, res) => {
  try {
    const { profile } = req.body;
    if (!profile) return res.status(400).json({ error: 'profile is required' });

    const userMessage = buildAuditMessage(profile);
    // Gated full-prompt dump for debugging exactly what was sent — off by
    // default so it doesn't spam production logs on every audit.
    if (process.env.AUDIT_DEBUG === '1') {
      console.log('[AUDIT][DEBUG] Full rendered prompt sent to Claude:\n' + userMessage);
    }
    console.log('[AUDIT] Auditing profile:', (profile.name || '').slice(0, 40), '| Rate:', profile.rate);

    const { text: rawText, usage } = await callClaudeRaw(AUDIT_SYSTEM, userMessage, AUDIT_SCHEMA);
    console.log('[AUDIT] Raw response length:', rawText.length);
    if (usage) {
      console.log(`[AUDIT] Tokens — input: ${usage.input_tokens}, output: ${usage.output_tokens}, cache_write: ${usage.cache_creation_input_tokens || 0}, cache_read: ${usage.cache_read_input_tokens || 0}`);
    }

    // Schema-enforced output should already be valid JSON with no wrapper —
    // repairAndParseJSON is kept as defense-in-depth, not because it's
    // expected to trigger anymore.
    let audit;
    try {
      audit = repairAndParseJSON(rawText);
    } catch(e) {
      logJsonParseFailure('AUDIT', rawText, e);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    if (typeof audit.overallScore !== 'number' || !audit.sections) {
      return res.status(500).json({ error: 'Incomplete audit response' });
    }

    const claudeScore = audit.overallScore;
    computeWeightedScore(audit, SECTION_WEIGHTS);
    checkQuoteFormatting(audit);
    checkTitleLength(audit);
    console.log('[AUDIT] Score:', audit.overallScore, '(Claude said:', claudeScore, ') | Status:', audit.status);
    return res.json({ success: true, audit });

  } catch(e) {
    console.error('[AUDIT] Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
