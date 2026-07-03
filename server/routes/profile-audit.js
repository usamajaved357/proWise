'use strict';

// ── POST /profile-audit ─────────────────────────────────────────────────────
// Receives scraped profile data, scores it with Claude, returns structured audit

const express = require('express');
const https   = require('https');
const router  = express.Router();
const { AUDIT_SYSTEM, buildAuditMessage } = require('../prompt-audit');

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

    console.log('[AUDIT] Score:', audit.overallScore, '| Grade:', audit.grade);
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
