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

router.post('/', async (req, res) => {
  try {
    const { profile } = req.body;
    if (!profile) return res.status(400).json({ error: 'profile is required' });

    const userMessage = buildAuditMessage(profile);
    console.log('[AUDIT] Auditing profile:', (profile.name || '').slice(0, 40), '| Rate:', profile.rate);

    const rawText = await callClaudeRaw(AUDIT_SYSTEM, userMessage);
    console.log('[AUDIT] Raw response length:', rawText.length);

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

    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4200,
      system,
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
          resolve(parsed.content?.[0]?.text || '');
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = router;
