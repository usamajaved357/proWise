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
    if (!analysis.verdict) {
      return res.status(500).json({ error: 'Incomplete analysis — missing verdict' });
    }

    // Filled-job responses return N/A — normalise to valid values
    if (!analysis.competitionPressure || analysis.competitionPressure === 'N/A') {
      analysis.competitionPressure = analysis.verdict === 'Skip this.' ? 'Extreme' : 'Moderate';
    }
    if (!analysis.profileFit || analysis.profileFit === 'N/A') {
      analysis.profileFit = 'Moderate';
    }

    // Ensure verdict text ends with a period
    const validVerdicts = ['Apply.', 'Apply carefully.', 'Skip this.'];
    if (!validVerdicts.includes(analysis.verdict)) {
      // Fuzzy match
      if (/apply carefully/i.test(analysis.verdict)) analysis.verdict = 'Apply carefully.';
      else if (/skip/i.test(analysis.verdict)) analysis.verdict = 'Skip this.';
      else analysis.verdict = 'Apply.';
    }

    // Ensure arrays exist
    analysis.concerns  = Array.isArray(analysis.concerns)  ? analysis.concerns  : [];
    analysis.strengths = Array.isArray(analysis.strengths) ? analysis.strengths : [];

    // If job is filled and Claude returned empty arrays, inject the key concern
    if (analysis.verdict === 'Skip this.' && analysis.concerns.length === 0) {
      const jobStats = req.body.job?.jobStats || {};
      if (jobStats.hiredCount > 0) {
        analysis.concerns.push({
          title: 'Job is already filled',
          detail: 'Client has already hired someone. This position is closed.'
        });
      }
    }

    // ── RULE 10 ENFORCEMENT (server-side — deterministic, Claude-proof) ──────
    // If both payment + phone are verified, remove any concern about new client track record
    const paymentVerified = req.body.job?.jobStats?.paymentVerified;
    const phoneVerified   = req.body.job?.jobStats?.phoneVerified || req.body.job?.jobStats?.clientPhoneVerified;
    if (paymentVerified && phoneVerified) {
      const BANNED = [
        'hire history', 'prior hires', 'new account', 'feedback signal',
        'zero hires', 'no track record', 'new client risk', 'no hiring history',
        'first-time buyer', 'no completed contracts', 'zero spend', 'spend history',
        'unproven client', 'no reviews', 'no prior'
      ];
      const removedConcerns = [];
      analysis.concerns = analysis.concerns.filter(c => {
        const text = ((c.title || '') + ' ' + (c.detail || '')).toLowerCase();
        const banned = BANNED.some(w => text.includes(w));
        if (banned) removedConcerns.push(c.title);
        return !banned;
      });
      if (removedConcerns.length > 0) {
        console.log('[ANALYSE] Rule 10: removed banned concerns:', removedConcerns);
        // Add verified client to strengths if not already there
        const hasVerifiedStrength = analysis.strengths.some(s =>
          s.title?.toLowerCase().includes('verif') || s.detail?.toLowerCase().includes('verif')
        );
        if (!hasVerifiedStrength && analysis.strengths.length < 3) {
          analysis.strengths.push({
            title: 'Verified, organized client',
            detail: 'Payment and phone verified. Low financial risk and serious intent.'
          });
        }
      }
    }

    // ── RULE 4a ENFORCEMENT — milestone budget detection ──────────────────────
    // Detect ongoing/milestone jobs and flag over-penalizing budget concerns
    const jobDesc  = (req.body.job?.description || '').toLowerCase();
    const isMilestone = /first milestone|first sprint|first phase|milestone 1/i.test(jobDesc)
                     || req.body.job?.jobStats?.isContractToHire;
    if (isMilestone) {
      analysis.concerns = analysis.concerns.map(c => {
        const text = ((c.title || '') + ' ' + (c.detail || '')).toLowerCase();
        if (text.includes('budget') || text.includes('hours') || text.includes('scope')) {
          c._milestoneNote = true; // flag for debugging
          console.log('[ANALYSE] Rule 4a: milestone job — budget concern may be overstated:', c.title);
        }
        return c;
      });
    }

    // ── COMPETITION LEVEL ENFORCEMENT (server-side — Claude-proof) ───────────
    const jobStats      = req.body.job?.jobStats || {};
    const proposals     = jobStats.proposalCount ?? 0;
    const interviewing  = jobStats.interviewingCount ?? 0;
    const isShortTask   = !/3\+\s*month|long.term|ongoing/i.test(req.body.job?.description || '');

    function proposalLevel(p) {
      if (p < 5)  return 0; // Low
      if (p < 20) return 1; // Moderate
      if (p < 50) return 2; // High
      return 3;             // Extreme
    }
    function interviewLevel(i, short) {
      if (short) {
        if (i === 0)  return 0;
        if (i <= 4)   return 1;
        if (i <= 9)   return 2;
        return 3;
      } else {
        if (i <= 9)   return 1;
        if (i <= 20)  return 2;
        return 3;
      }
    }
    const LEVELS = ['Low', 'Moderate', 'High', 'Extreme'];
    const computedLevel = Math.max(proposalLevel(proposals), interviewLevel(interviewing, isShortTask));
    const computedPressure = LEVELS[computedLevel];

    if (analysis.competitionPressure !== computedPressure) {
      console.log(`[ANALYSE] Competition corrected: ${analysis.competitionPressure} → ${computedPressure} (proposals=${proposals}, interviewing=${interviewing})`);
      analysis.competitionPressure = computedPressure;
    }

    // Cap arrays
    analysis.concerns  = analysis.concerns.slice(0, 3);
    analysis.strengths = analysis.strengths.slice(0, 3);

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
