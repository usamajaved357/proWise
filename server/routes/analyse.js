'use strict';

// ── POST /analyse ───────────────────────────────────────────────────────────
// Receives job + profile + filters, calls Claude, returns structured analysis

const express = require('express');
const https   = require('https');
const router  = express.Router();
const { ANALYSE_SYSTEM, buildAnalyseMessage } = require('../prompt-analyse');

router.post('/', async (req, res) => {
  try {
    const { job, profile, filters } = req.body;

    if (!job || !profile) {
      return res.status(400).json({ error: 'job and profile are required' });
    }

    const userMessage = buildAnalyseMessage({ job, profile, filters });
    console.log('[ANALYSE] Job:', (job.title || '').slice(0, 60));

    const rawText = await callClaudeRaw(ANALYSE_SYSTEM, userMessage);
    console.log('[ANALYSE] Raw response length:', rawText.length);

    // Extract JSON — Claude may wrap it in markdown fences
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[ANALYSE] No JSON found in response:', rawText.slice(0, 200));
      return res.status(500).json({ error: 'No structured response from AI' });
    }

    let analysis;
    try {
      // Sanitize invalid JSON patterns Claude sometimes produces:
      // +5 → 5 (JSON doesn't allow leading + on numbers)
      const cleaned = jsonMatch[0].replace(/:\s*\+(\d)/g, ': $1');
      analysis = JSON.parse(cleaned);
    } catch(e) {
      console.error('[ANALYSE] JSON parse error:', e.message);
      console.error('[ANALYSE] Raw tail (last 200 chars):', (jsonMatch?.[0] || rawText).slice(-200));
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Validate required fields
    if (!analysis.verdict || !analysis.competitionPressure || !analysis.profileFit) {
      return res.status(500).json({ error: 'Incomplete analysis — missing required fields' });
    }

    // Ensure arrays exist
    analysis.concerns  = Array.isArray(analysis.concerns)  ? analysis.concerns.slice(0, 3)  : [];
    analysis.strengths = Array.isArray(analysis.strengths) ? analysis.strengths.slice(0, 3) : [];

    console.log(`[ANALYSE] Result: ${analysis.verdict} | competition=${analysis.competitionPressure} fit=${analysis.profileFit} | concerns:${analysis.concerns.length} strengths:${analysis.strengths.length}`);

    res.json({ success: true, analysis });

  } catch(err) {
    console.error('[ANALYSE] Unhandled error:', err.message);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// ── Direct Claude call returning raw text (analysis uses JSON format, not LETTER tags) ──
function callClaudeRaw(system, user) {
  return new Promise((resolve, reject) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return reject(new Error('ANTHROPIC_API_KEY not set'));

    const body = JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      system,
      messages: [{ role: 'user', content: user }]
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers:  {
        'Content-Type':      'application/json',
        'x-api-key':         key,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(body)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(d);
          if (parsed.error) return reject(new Error(parsed.error.message));
          resolve(parsed.content?.[0]?.text || '');
        } catch(e) { reject(new Error('Claude response parse error: ' + e.message)); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = router;
