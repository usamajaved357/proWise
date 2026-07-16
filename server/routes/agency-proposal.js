'use strict';

// ── POST /agency-proposal ────────────────────────────────────────────────
// Mirrors server/routes/proposal.js's engineering (email/usage gating,
// client-name extraction, {{PRICE}}/{{TIMELINE}} placeholder math, em-dash
// stripping, bold conversion) but takes an `agency` payload shaped like
// extension/background/modules/agency-data.js's output instead of a
// freelancer `profile`, and uses the agency prompt/rate-range math.

const express = require('express');
const router  = express.Router();
const { callClaude, extractClientName, processBold } = require('../modules/claude');
const { buildAgencyUserMessage } = require('../prompt-agency-proposal');
const { canGenerate, recordUsage, canAnonGenerate, recordAnonUsage, getUserStatus, hasFreeRevision, consumeFreeRevision } = require('../modules/usage');
const { getAnon, getUser, getAnonByDevice, upsertAnon } = require('../modules/db');

router.post('/', async (req, res) => {
  const { job, agency, settings, email: userEmail, anonId, deviceId } = req.body;

  if (!job?.title && !job?.description) {
    return res.status(400).json({ error: 'Could not read job from page.' });
  }
  if (!agency?.name) {
    return res.status(400).json({ error: 'Could not read agency profile.' });
  }

  const isRealEmail = userEmail && userEmail.includes('@') && !userEmail.includes('propwise.local');

  if (!isRealEmail) {
    return res.status(403).json({
      error: 'Please add and verify your email in Settings to use Snag AI.',
      requiresEmail: true,
    });
  }

  try {
    const userRecord = await getUser(userEmail);
    const isPaid = userRecord?.plan && userRecord.plan !== 'free' && userRecord.active !== false;
    if (!isPaid && !userRecord?.email_verified) {
      return res.status(403).json({
        error: 'Please verify your email before generating proposals.',
        requiresVerification: true,
      });
    }
  } catch(e) { /* db error — proceed rather than block */ }

  if (deviceId) {
    try {
      const existingDevice = await getAnonByDevice(deviceId);
      const userRecord = await getUser(userEmail);
      const isPaid = userRecord?.plan && userRecord.plan !== 'free' && userRecord.active !== false;
      if (!isPaid && existingDevice && existingDevice.anon_id !== userEmail) {
        return res.status(403).json({
          error: 'A free trial has already been used on this device. Upgrade to continue.',
          showPaywall: true,
          deviceBlocked: true,
          plan: 'free', limit: 2, used: 2, remaining: 0,
        });
      }
    } catch(e) { /* db error — proceed */ }
  }

  const refineInstruction = req.body.refineInstruction || '';
  const currentLetter     = req.body.currentLetter     || '';
  const isRefinement      = !!(refineInstruction && currentLetter);

  try {
    // A refinement on a job that hasn't used its 1 free revision yet bypasses
    // the pool gate entirely — see routes/proposal.js for the full reasoning.
    const freeRevision = isRealEmail && isRefinement && await hasFreeRevision(userEmail, job);

    if (!freeRevision) {
      if (isRealEmail) {
        const ok = await canGenerate(userEmail);
        if (!ok) {
          const status = await getUserStatus(userEmail);
          console.log(`[AGENCY_PROPOSAL] Limit reached: ${userEmail} | plan: ${status.plan} | used: ${status.used}/${status.limit}`);
          return res.status(402).json({
            error: status.plan === 'free'
              ? 'You\'ve used your 2 free proposals. Subscribe to keep winning jobs.'
              : `You\'ve used all ${status.limit} proposals this month. Resets on the 1st.`,
            showPaywall: true,
            ...status
          });
        }
      } else if (anonId) {
        const ok = await canAnonGenerate(anonId);
        if (!ok) {
          return res.status(402).json({
            error: 'You\'ve used your 2 free proposals. Subscribe to keep winning jobs.',
            showPaywall: true,
            plan: 'free', limit: 2, used: 2, remaining: 0
          });
        }
      }
    }

    const NOT_A_NAME = new Set([
      'this','that','the','and','for','our','but','all','has','with','your',
      'they','have','from','will','been','when','more','also','just','than',
      'into','over','what','which','their','would','there','could','other',
      'these','those','some','such','even','were','well','then','only','time',
      'like','each','need','want','work','same','know','here','where','most',
      'down','made','both','very','said','high','real','name','call','back',
      'good','days','team','none','great','nice','dear','hello','sure','glad',
      'hope','best','much','many','next','last','first','very','client','owner'
    ]);
    if (job.clientName && NOT_A_NAME.has(job.clientName.toLowerCase())) {
      job.clientName = '';
    }
    if (!job.clientName && job.reviewText && job.reviewText.length > 20) {
      job.clientName = await extractClientName(job.reviewText, job.description || '');
    }
    console.log('[AGENCY_PROPOSAL] Client name:', job.clientName || 'not found');

    const categories        = Array.isArray(req.body.categories) ? req.body.categories : [];

    const minRate = parseFloat(agency.minRate) || 0;
    const maxRate = parseFloat(agency.maxRate) || 0;
    const midRate = minRate && maxRate ? (minRate + maxRate) / 2 : (minRate || maxRate || 0);

    console.log(`[AGENCY_PROPOSAL] Auditing agency: ${agency.name} | Rate: ${minRate}-${maxRate}`);
    const { msg: userMsg, systemWithLimit } = buildAgencyUserMessage({ job, agency, settings, refineInstruction, currentLetter, categories });

    const result = await callClaude(systemWithLimit, userMsg);

    const hasPortfolioUrls = (agency.portfolio || []).some(p => p.url && p.url.trim());
    if (!hasPortfolioUrls && result.tips) {
      result.tips[1] = 'Add live project URLs to your agency portfolio in Options → Agency Profiles. The AI selects the 2 most relevant ones per job and explains how they match — this significantly improves proposal quality across all categories.';
    }

    if (result.hours) console.log(`[AGENCY_PROPOSAL] Claude hour estimate: ${result.hours}`);
    if (result.letter && result.letter.includes('{{PRICE}}') !== result.letter.includes('{{TIMELINE}}')) {
      console.warn('[AGENCY_PROPOSAL] WARNING: Claude used only one placeholder — both {{PRICE}} and {{TIMELINE}} are required');
    }
    if (result.letter && result.letter.includes('{{') && midRate > 0) {
      const hoursStr = result.hours || '';
      const hm = hoursStr.match(/(\d+)\s*[-–]\s*(\d+)|(\d+)/);
      if (hm) {
        const loHrs = parseInt(hm[1] || hm[3]);
        const hiHrs = parseInt(hm[2] || hm[3]);

        const loPrice = Math.round(loHrs * midRate / 500) * 500;
        const hiPrice = Math.round(hiHrs * midRate / 500) * 500;
        const priceStr = loPrice === hiPrice
          ? `$${loPrice.toLocaleString()}`
          : `$${loPrice.toLocaleString()}-$${hiPrice.toLocaleString()}`;

        const loWeeks = Math.ceil(loHrs / 40);
        const hiWeeks = Math.ceil(hiHrs / 40);

        function weeksToMonths(w) { return Math.round(w / 4.3 * 2) / 2; }

        let timeline;
        if (hiWeeks <= 10) {
          timeline = loWeeks === hiWeeks ? loWeeks + ' weeks' : loWeeks + '-' + hiWeeks + ' weeks';
        } else {
          const loM = Math.floor(weeksToMonths(loWeeks));
          const hiM = Math.ceil(weeksToMonths(hiWeeks));
          timeline = loM === hiM ? loM + ' months' : loM + '-' + hiM + ' months';
        }

        result.letter = result.letter
          .replace(/\{\{PRICE\}\}/g, priceStr)
          .replace(/\{\{TIMELINE\}\}/g, timeline);
        if (result.questions) result.questions = result.questions
          .replace(/\{\{PRICE\}\}/g, priceStr)
          .replace(/\{\{TIMELINE\}\}/g, timeline);

        console.log(`[AGENCY_PROPOSAL] Estimated ${loHrs}-${hiHrs} hrs at $${midRate}/hr midpoint → ${priceStr}, ${timeline}`);
      }
    }

    if (result.letter) {
      result.letter = result.letter
        .replace(/\s*—\s*/g, '. ')
        .replace(/—/g, ', ')
        .replace(/\.\s+([a-z])/g, (m, c) => '. ' + c.toUpperCase());
    }

    if (result.letter) result.letter = processBold(result.letter);
    if (result.questions) result.questions = processBold(result.questions);

    if (result.portfolioLinks && result.portfolioLinks.length > 0) {
      const validLinks = result.portfolioLinks.filter(p => p.url);
      if (validLinks.length > 0) {
        result.letter = result.letter
          .replace(/\n{0,2}[\s\S]*?[Pp]ortfolio[:\s][\s\S]*?(?=\n\nRegards|\nRegards|$)/g, (match) => {
            if (/https?:\/\//.test(match)) return '';
            return match;
          })
          .trimEnd();
      }
    }

    // 1 free revision per job per billing month — see routes/proposal.js for
    // the full reasoning. 2nd+ revision on the same job, or any fresh
    // generation, costs 1 unit from the main pool like normal.
    if (isRealEmail) {
      if (freeRevision) {
        await consumeFreeRevision(userEmail, job);
      } else {
        await recordUsage(userEmail);
      }
      if (!isRefinement && deviceId) {
        try { await upsertAnon(userEmail, { device_id: deviceId }); } catch(e) {}
      }
      const status = await getUserStatus(userEmail);
      return res.json({ success: true, ...result, usage: status, freeRevision: !!freeRevision });
    }

    res.json({ success: true, ...result });
  } catch(err) {
    console.error('[AGENCY_PROPOSAL] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
