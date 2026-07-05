'use strict';

// ── POST /profile-audit ─────────────────────────────────────────────────────
// Receives scraped profile data, scores it with Claude, returns structured audit

const express = require('express');
const https   = require('https');
const router  = express.Router();
const { AUDIT_SYSTEM, buildAuditMessage } = require('../prompt-audit');

// Weights must match the "overallScore = weighted average" line in prompt-audit.js
// and sum to exactly 1 (they previously summed to 1.10 in the prompt text, which
// let the model's own arithmetic drift — this is now the single source of truth).
const SECTION_WEIGHTS = {
  title: 0.08, bio: 0.15, skills: 0.08, portfolio: 0.15, history: 0.15,
  credibility: 0.08, certificates: 0.08, completeness: 0.08, positioning: 0.15,
};

// Claude computes overallScore itself inside a one-shot JSON response with no
// room to actually work through 9 weighted terms, so it drifts from the section
// scores it just wrote — the same profile audited twice with visibly different
// section scores can come back with an identical overallScore. Recomputing it
// deterministically here guarantees the number always reflects the sections.
function recomputeOverallScore(audit) {
  const sections = Array.isArray(audit.sections) ? audit.sections : [];
  let weightedSum = 0, weightTotal = 0;
  sections.forEach(sec => {
    const w = SECTION_WEIGHTS[sec.id];
    if (typeof w === 'number' && typeof sec.score === 'number') {
      weightedSum += sec.score * w;
      weightTotal += w;
    }
  });
  if (weightTotal === 0) return; // malformed sections — leave Claude's own value as a fallback
  const score = Math.round((weightedSum / weightTotal) * 10) / 10;
  audit.overallScore = score;
  audit.status =
    score >= 9   ? 'Elite' :
    score >= 7.5 ? 'Strong' :
    score >= 6   ? 'Good' :
    score >= 4.5 ? 'Average' :
    score >= 3   ? 'Weak' : 'Critical';
}

// Same quote-detection regex the extension uses to highlight literal fixes in
// the sidebar/PDF (extension/content/profile-reader.js parseSuggestionSegments).
// A fix or topFixes.action written without a matched quote pair still renders
// fine — it just silently falls back to plain, unhighlighted text — so this
// only logs a warning rather than failing the request.
// Double quotes only — a straight/curly single quote must never be a
// delimiter, or an apostrophe inside a quoted script ("I've", "Here's")
// breaks the match entirely (see profile-reader.js for the full explanation).
const QUOTE_RE = /(^|[\s(])["“]([^"”]{4,}?)["”](?=[\s.,!?;:)]|$)/;
// Same pattern with the global flag, for extracting every quoted span rather
// than just testing whether one exists (used by checkTitleLength below).
const QUOTE_RE_GLOBAL = /(^|[\s(])["“]([^"”]{4,}?)["”](?=[\s.,!?;:)]|$)/g;

// Upwork's profile title field has a documented 70-character hard limit —
// support.upwork.com/hc/en-us/articles/34958631345171-Profile-title. Anything
// longer is silently truncated on the live profile with no error, so this is
// worth catching even though the prompt now instructs Claude to self-check.
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

function checkQuoteFormatting(audit) {
  let missing = 0, total = 0;
  (audit.sections || []).forEach(sec => {
    if (sec.fix) {
      total++;
      if (!QUOTE_RE.test(sec.fix)) missing++;
    }
  });
  (audit.topFixes || []).forEach(tf => {
    if (tf.action) {
      total++;
      if (!QUOTE_RE.test(tf.action)) missing++;
    }
  });
  if (missing > 0) {
    console.warn(`[AUDIT] ${missing}/${total} fixes missing quoted literal text — these will render as plain, unhighlighted text in the sidebar/PDF`);
  }
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

    const { text: rawText, usage } = await callClaudeRaw(AUDIT_SYSTEM, userMessage);
    console.log('[AUDIT] Raw response length:', rawText.length);
    if (usage) {
      console.log(`[AUDIT] Tokens — input: ${usage.input_tokens}, output: ${usage.output_tokens}, cache_write: ${usage.cache_creation_input_tokens || 0}, cache_read: ${usage.cache_read_input_tokens || 0}`);
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[AUDIT] No JSON in response:', rawText.slice(0, 200));
      return res.status(500).json({ error: 'No structured response from AI' });
    }

    let audit;
    try {
      audit = JSON.parse(jsonMatch[0]);
    } catch(e) {
      console.error('[AUDIT] JSON parse error:', e.message);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    if (typeof audit.overallScore !== 'number' || !audit.sections) {
      return res.status(500).json({ error: 'Incomplete audit response' });
    }

    const claudeScore = audit.overallScore;
    recomputeOverallScore(audit);
    checkQuoteFormatting(audit);
    checkTitleLength(audit);
    console.log('[AUDIT] Score:', audit.overallScore, '(Claude said:', claudeScore, ') | Status:', audit.status);
    return res.json({ success: true, audit });

  } catch(e) {
    console.error('[AUDIT] Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

function callClaudeRaw(system, userMsg) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return reject(new Error('ANTHROPIC_API_KEY not set'));

    // AUDIT_SYSTEM is byte-identical on every request (~6K tokens, well above
    // Sonnet 4.6's 2048-token cache minimum). 1h TTL over the 5m default:
    // observed audit traffic clusters loosely by the hour, not the minute, so
    // 5m almost never got reused (write premium paid, read discount never
    // claimed). 1h costs more per write (2x vs 1.25x) but survives long enough
    // to actually get read back within a real cluster of requests — check
    // cache_read_input_tokens in the usage log to confirm it's paying off for
    // your actual traffic, and drop back to 5m/no caching if it stays near 0.
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4200,
      system: [
        { type: 'text', text: system, cache_control: { type: 'ephemeral', ttl: '1h' } },
      ],
      messages: [{ role: 'user', content: userMsg }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, rsp => {
      let raw = '';
      rsp.on('data', d => raw += d);
      rsp.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) return reject(new Error(parsed.error.message || 'Claude error'));
          resolve({ text: parsed.content?.[0]?.text || '', usage: parsed.usage || null });
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = router;
