'use strict';

// ── POST /agency-analyse ────────────────────────────────────────────────────
// Mirrors server/routes/analyse.js's engineering exactly — the deterministic
// post-processing rules (Rule 4, Rule 10, Rule 11, Rule 14, Rule 4a,
// competition-level enforcement, hook-length enforcement) all operate on
// req.body.job.jobStats / job.description only, never on the applicant
// profile, so they apply unchanged here. Only the prompt/message builder
// and the "agency" field name differ.

const express = require('express');
const https   = require('https');
const router  = express.Router();
const { AGENCY_ANALYSE_SYSTEM, buildAgencyAnalyseMessage } = require('../prompt-agency-analyse');
const { canJobAudit, recordJobAuditUsage, getUserStatus } = require('../modules/usage');
const { getUser } = require('../modules/db');

router.post('/', async (req, res) => {
  try {
    const { job, agency, filters, email: userEmail } = req.body;

    // Job audits have their own pool, separate from cover-letter proposals —
    // see server/modules/usage.js's canJobAudit/recordJobAuditUsage.
    const isRealEmail = userEmail && userEmail.includes('@') && !userEmail.includes('propwise.local');
    if (!isRealEmail) {
      return res.status(403).json({
        error: 'Please add and verify your email in Settings to use Snag AI.',
        requiresEmail: true,
      });
    }

    // Email must be verified before running job audits — same rule as
    // routes/proposal.js, otherwise anyone can spend a stranger's quota by
    // typing their email in Settings.
    try {
      const userRecord = await getUser(userEmail);
      const isPaid = userRecord?.plan && userRecord.plan !== 'free' && userRecord.active !== false;
      if (!isPaid && !userRecord?.email_verified) {
        return res.status(403).json({
          error: 'Please verify your email before running job audits.',
          requiresVerification: true,
        });
      }
    } catch(e) { /* db error — proceed rather than block */ }

    const ok = await canJobAudit(userEmail);
    if (!ok) {
      const status = await getUserStatus(userEmail);
      return res.status(402).json({
        error: status.jobAuditLimit === 0
          ? 'Job audits aren\'t included on your plan. Upgrade to Pro or Agency to unlock them.'
          : `You've used all ${status.jobAuditLimit} job audits this month. Resets on the 1st.`,
        showPaywall: true,
        ...status
      });
    }

    if (!job || !agency) {
      return res.status(400).json({ error: 'job and agency are required' });
    }

    const userMessage = buildAgencyAnalyseMessage({ job, agency, filters });
    console.log('[AGENCY_ANALYSE] Job:', (job.title || '').slice(0, 60));

    const rawText = await callClaudeRaw(AGENCY_ANALYSE_SYSTEM, userMessage);
    console.log('[AGENCY_ANALYSE] Raw response length:', rawText.length);

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[AGENCY_ANALYSE] No JSON found in response:', rawText.slice(0, 200));
      return res.status(500).json({ error: 'No structured response from AI' });
    }

    let analysis;
    try {
      const cleaned = jsonMatch[0].replace(/:\s*\+(\d)/g, ': $1');
      analysis = JSON.parse(cleaned);
    } catch(e) {
      console.error('[AGENCY_ANALYSE] JSON parse error:', e.message);
      console.error('[AGENCY_ANALYSE] Raw tail (last 200 chars):', (jsonMatch?.[0] || rawText).slice(-200));
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    if (!analysis.verdict) {
      return res.status(500).json({ error: 'Incomplete analysis — missing verdict' });
    }

    if (!analysis.competitionPressure || analysis.competitionPressure === 'N/A') {
      analysis.competitionPressure = analysis.verdict === 'Skip this.' ? 'Extreme' : 'Moderate';
    }
    if (!analysis.profileFit || analysis.profileFit === 'N/A') {
      analysis.profileFit = 'Moderate';
    }

    const validVerdicts = ['Apply.', 'Apply carefully.', 'Skip this.'];
    if (!validVerdicts.includes(analysis.verdict)) {
      if (/apply carefully/i.test(analysis.verdict)) analysis.verdict = 'Apply carefully.';
      else if (/skip/i.test(analysis.verdict)) analysis.verdict = 'Skip this.';
      else analysis.verdict = 'Apply.';
    }

    analysis.concerns  = Array.isArray(analysis.concerns)  ? analysis.concerns  : [];
    analysis.strengths = Array.isArray(analysis.strengths) ? analysis.strengths : [];

    if (analysis.verdict === 'Skip this.' && analysis.concerns.length === 0) {
      const jobStats = req.body.job?.jobStats || {};
      if (jobStats.hiredCount > 0) {
        analysis.concerns.push({
          title: 'Job is already filled',
          detail: 'Client has already hired someone. This position is closed.'
        });
      }
    }

    // ── RULE 4 ENFORCEMENT — unverified payment on fixed-price (server-side) ──
    const isFixedPrice    = req.body.job?.jobStats?.jobType === 'fixed'
                         || /fixed/i.test(req.body.job?.budget || '');
    const paymentOk       = req.body.job?.jobStats?.paymentVerified;
    if (isFixedPrice && !paymentOk && analysis.verdict === 'Apply.') {
      console.log('[AGENCY_ANALYSE] Rule 4: unverified payment on fixed-price → forced to Apply carefully.');
      analysis.verdict = 'Apply carefully.';
      const hasPaymentConcern = analysis.concerns.some(c =>
        (c.title + c.detail).toLowerCase().includes('payment') ||
        (c.title + c.detail).toLowerCase().includes('verif')
      );
      if (!hasPaymentConcern) {
        analysis.concerns.unshift({
          title: 'Payment unverified — financial risk',
          detail: 'Client has not verified payment on a fixed-price contract. Higher risk of non-payment or disputes.'
        });
        analysis.concerns = analysis.concerns.slice(0, 3);
      }
    }

    // ── RULE 10 ENFORCEMENT (server-side — deterministic, Claude-proof) ──────
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
      // Rule 14: if avg spend per hire < $200, remove any strength that praises client spending
      const _totalSpent = req.body.job?.jobStats?.clientSpentNum || 0;
      const _totalHires = req.body.job?.jobStats?.clientTotalHires || req.body.job?.jobStats?.hiredCount || 0;
      const avgPerHireCheck = _totalHires > 0 ? Math.round(_totalSpent / _totalHires) : null;
      if (avgPerHireCheck !== null && avgPerHireCheck < 200) {
        analysis.strengths = analysis.strengths.filter(s => {
          const t = ((s.title || '') + ' ' + (s.detail || '')).toLowerCase();
          const praisesSpend = (t.includes('pay') || t.includes('spend') || t.includes('invest') || t.includes('budget'))
                            && (t.includes('fair') || t.includes('well') || t.includes('good') || t.includes('reliable') || t.includes('quality'));
          if (praisesSpend) console.log('[AGENCY_ANALYSE] Rule 14: removed spend-praise strength for low avg/hire client ($' + avgPerHireCheck + '/hire)');
          return !praisesSpend;
        });
      }

      // Rule 11: remove phone verification concern on established clients
      const totalSpentNum2 = req.body.job?.jobStats?.clientSpentNum
        || parseFloat(String(req.body.job?.jobStats?.clientTotalSpent || '0').replace(/[^0-9.KkMm]/g, '').replace(/[Kk]$/, '000').replace(/[Mm]$/, '000000')) || 0;
      const totalHires2    = req.body.job?.jobStats?.clientTotalHires || req.body.job?.jobStats?.hiredCount || 0;
      if (totalSpentNum2 > 10000 && totalHires2 > 5) {
        analysis.concerns = analysis.concerns.filter(c => {
          const t = ((c.title || '') + ' ' + (c.detail || '')).toLowerCase();
          const isPhone = t.includes('phone') && (t.includes('verif') || t.includes('missing') || t.includes('unverif'));
          if (isPhone) console.log('[AGENCY_ANALYSE] Rule 11: removed phone concern for established client');
          return !isPhone;
        });
      }

      if (removedConcerns.length > 0) {
        console.log('[AGENCY_ANALYSE] Rule 10: removed banned concerns:', removedConcerns);
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
    const jobDesc  = (req.body.job?.description || '').toLowerCase();
    const isMilestone = /first milestone|first sprint|first phase|milestone 1/i.test(jobDesc)
                     || req.body.job?.jobStats?.isContractToHire;
    if (isMilestone) {
      analysis.concerns = analysis.concerns.map(c => {
        const text = ((c.title || '') + ' ' + (c.detail || '')).toLowerCase();
        if (text.includes('budget') || text.includes('hours') || text.includes('scope')) {
          c._milestoneNote = true;
          console.log('[AGENCY_ANALYSE] Rule 4a: milestone job — budget concern may be overstated:', c.title);
        }
        return c;
      });
    }

    // ── COMPETITION LEVEL ENFORCEMENT (server-side — Claude-proof) ───────────
    const jobStats      = req.body.job?.jobStats || {};
    const rawProposals  = jobStats.proposalCount;
    const proposals     = typeof rawProposals === 'string'
      ? (rawProposals.includes('+') ? parseInt(rawProposals) + 1 : parseInt(rawProposals) || 0)
      : (rawProposals ?? 0);
    const interviewing  = jobStats.interviewingCount ?? 0;
    const isShortTask   = !/3\+\s*month|long.term|ongoing/i.test(req.body.job?.description || '');

    function proposalLevel(p) {
      if (p < 5)  return 0;
      if (p < 20) return 1;
      if (p < 50) return 2;
      return 3;
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
      console.log(`[AGENCY_ANALYSE] Competition corrected: ${analysis.competitionPressure} → ${computedPressure} (proposals=${proposals}, interviewing=${interviewing})`);
      analysis.competitionPressure = computedPressure;
    }

    analysis.concerns  = analysis.concerns.slice(0, 3);
    analysis.strengths = analysis.strengths.slice(0, 3);

    // ── HOOK LENGTH ENFORCEMENT — hard cap at 160 chars ──────────────────────
    if (analysis.hookSuggestion) {
      let hook = analysis.hookSuggestion.replace(/^Hook\s*\d+\s*[—\-]\s*/i, '').trim();
      if (hook.length > 160) {
        const within = hook.slice(0, 160);
        const lastStop = Math.max(within.lastIndexOf('.'), within.lastIndexOf('!'), within.lastIndexOf('?'));
        if (lastStop > 80) {
          hook = hook.slice(0, lastStop + 1);
        } else {
          const lastSpace = within.lastIndexOf(' ');
          hook = hook.slice(0, lastSpace > 80 ? lastSpace : 157);
        }
        console.log('[AGENCY_ANALYSE] Hook trimmed to:', hook.length, 'chars');
      }
      analysis.hookSuggestion = hook;
    }

    console.log(`[AGENCY_ANALYSE] Result: ${analysis.verdict} | competition=${analysis.competitionPressure} fit=${analysis.profileFit} | concerns:${analysis.concerns.length} strengths:${analysis.strengths.length}`);

    await recordJobAuditUsage(userEmail);
    const status = await getUserStatus(userEmail);
    res.json({ success: true, analysis, usage: status });

  } catch(err) {
    console.error('[AGENCY_ANALYSE] Unhandled error:', err.message);
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
