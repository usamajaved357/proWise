'use strict';

const express = require('express');
const router  = express.Router();
const { callClaude, extractClientName, SYSTEM, buildUserMessage, processBold } = require('../modules/claude');
const { canGenerate, recordUsage, canAnonGenerate, recordAnonUsage, getUserStatus } = require('../modules/usage');
const { getAnon, getUser, getAnonByDevice, upsertAnon } = require('../modules/db');

router.post('/', async (req, res) => {
  const { job, profile, settings, email: userEmail, anonId, deviceId } = req.body;

  if (!job?.title && !job?.description) {
    return res.status(400).json({ error: 'Could not read job from page.' });
  }

  const isRealEmail = userEmail && userEmail.includes('@') && !userEmail.includes('propwise.local');

  // Require email — no more anonymous free trials
  if (!isRealEmail) {
    return res.status(403).json({
      error: 'Please add and verify your email in Settings to use Snag AI.',
      requiresEmail: true,
    });
  }

  // Email must be verified before generating proposals
  try {
    const userRecord = await getUser(userEmail);
    // Existing paid users are grandfathered in (don't lock them out)
    const isPaid = userRecord?.plan && userRecord.plan !== 'free' && userRecord.active !== false;
    if (!isPaid && !userRecord?.email_verified) {
      return res.status(403).json({
        error: 'Please verify your email before generating proposals.',
        requiresVerification: true,
      });
    }
  } catch(e) { /* db error — proceed rather than block */ }

  // Device check for free tier: 1 free trial per device
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

  try {
    if (isRealEmail) {
      const ok = await canGenerate(userEmail);
      if (!ok) {
        const status = await getUserStatus(userEmail);
        console.log(`Limit reached: ${userEmail} | plan: ${status.plan} | used: ${status.used}/${status.limit}`);
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
        console.log(`Anon limit reached: ${anonId}`);
        return res.status(402).json({
          error: 'You\'ve used your 2 free proposals. Subscribe to keep winning jobs.',
          showPaywall: true,
          plan: 'free', limit: 2, used: 2, remaining: 0
        });
      }
    }

    // Sanitize client name — reject common English words that aren't first names
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

    // Only call Claude for name extraction when review text actually exists
    if (!job.clientName && job.reviewText && job.reviewText.length > 20) {
      job.clientName = await extractClientName(job.reviewText, job.description || '');
    }
    console.log('Client name:', job.clientName || 'not found');

    const refineInstruction = req.body.refineInstruction || '';
    const currentLetter     = req.body.currentLetter     || '';
    const categories        = Array.isArray(req.body.categories) ? req.body.categories : [];
    const freelancerType    = req.body.freelancerType    || 'developer';
    const isRefinement      = !!(refineInstruction && currentLetter);

    const rawPortfolios = profile.portfolio || [];
    console.log('[DEBUG] portfolios received:', rawPortfolios.length);
    rawPortfolios.forEach((p, i) => {
      console.log(`  [${i}] title="${p.title||p.name||'?'}" urls=${JSON.stringify(p.urls||[p.url||''])} skills=${JSON.stringify(p.skills||[])} desc="${(p.desc||'').slice(0,40)}"`);
    });

    const hourlyRate = parseFloat((profile.hourlyRate || '0').replace(/[^0-9.]/g, '')) || 0;
    console.log(`[PRICING] jobType=${job.jobStats?.jobType||'unknown'} budget="${job.budget||''}" isOngoing=${/more than 6 months|ongoing|long.?term|part.?time/i.test((job.description||'').toLowerCase())}`);
    const { msg: userMsg, systemWithLimit } = buildUserMessage({ job, profile, settings, refineInstruction, currentLetter, freelancerType, categories });

    const ptStart = userMsg.indexOf('PORTFOLIO (match');
    const ptEnd   = userMsg.indexOf('\n\n', ptStart);
    if (ptStart > -1) console.log('[DEBUG] portfolioText in prompt:\n' + userMsg.slice(ptStart, ptEnd > -1 ? ptEnd : ptStart + 400));

    const result = await callClaude(systemWithLimit, userMsg);

    // Education tip — override TIP2 when no portfolio URLs so user knows to add them
    const hasPortfolioUrls = (profile.portfolio || []).some(p =>
      (p.urls && p.urls.some(u => u && u.trim())) || (p.url && p.url.trim())
    );
    if (!hasPortfolioUrls && result.tips) {
      result.tips[1] = 'Add live URLs to your portfolio items in Options → Profiles. The AI selects the 2 most relevant ones per job and explains how they match — this significantly improves proposal quality across all categories.';
    }

    // Replace {{PRICE}} and {{TIMELINE}} placeholders using Claude's hour estimate
    if (result.hours) console.log(`[SCOPE] Claude hour estimate: ${result.hours}`);
    if (result.letter && result.letter.includes('{{PRICE}}') !== result.letter.includes('{{TIMELINE}}')) {
      console.warn('[SCOPE] WARNING: Claude used only one placeholder — both {{PRICE}} and {{TIMELINE}} are required');
    }
    if (result.letter && result.letter.includes('{{') && hourlyRate > 0) {
      const hoursStr = result.hours || '';
      const hm = hoursStr.match(/(\d+)\s*[-–]\s*(\d+)|(\d+)/);
      if (hm) {
        const loHrs = parseInt(hm[1] || hm[3]);
        const hiHrs = parseInt(hm[2] || hm[3]);

        const loPrice = Math.round(loHrs * hourlyRate / 500) * 500;
        const hiPrice = Math.round(hiHrs * hourlyRate / 500) * 500;
        const priceStr = loPrice === hiPrice
          ? `$${loPrice.toLocaleString()}`
          : `$${loPrice.toLocaleString()}-$${hiPrice.toLocaleString()}`;

        const loWeeks = Math.ceil(loHrs / 40);
        const hiWeeks = Math.ceil(hiHrs / 40);

        function weeksToMonths(w) {
          return Math.round(w / 4.3 * 2) / 2; // round to nearest 0.5
        }

        let timeline;
        if (hiWeeks <= 10) {
          // Short project — say weeks
          timeline = loWeeks === hiWeeks ? loWeeks + ' weeks' : loWeeks + '-' + hiWeeks + ' weeks';
        } else {
          // Long project — say months as a clean single range
          const loM = Math.floor(weeksToMonths(loWeeks));
          const hiM = Math.ceil(weeksToMonths(hiWeeks));
          timeline = loM === hiM ? loM + ' months' : loM + '-' + hiM + ' months';
        }

        result.letter = result.letter
          .replace(/\{\{PRICE\}\}/g, priceStr)
          .replace(/\{\{TIMELINE\}\}/g, timeline);

        console.log(`[SCOPE] Claude estimated ${loHrs}-${hiHrs} hrs → ${priceStr}, ${timeline}`);
      }
    }

    // Strip em dashes and fix sentence capitalization
    if (result.letter) {
      result.letter = result.letter
        .replace(/\s*—\s*/g, '. ')                           // em dash with spaces → period
        .replace(/—/g, ', ')                                 // em dash without spaces → comma
        .replace(/\.\s+([a-z])/g, (m, c) => '. ' + c.toUpperCase()); // capitalize after period
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

    // Refinements don't consume a proposal credit — only fresh generations do
    if (isRealEmail) {
      if (!isRefinement) {
        await recordUsage(userEmail);
        // Store deviceId on first free usage so same device can't reuse another email
        if (deviceId) {
          try { await upsertAnon(userEmail, { device_id: deviceId }); } catch(e) {}
        }
      }
      const status = await getUserStatus(userEmail);
      return res.json({ success: true, ...result, usage: status });
    }

    res.json({ success: true, ...result });
  } catch(err) {
    console.error('Proposal error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
