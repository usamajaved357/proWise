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

    if (!job.clientName && (job.reviewText || job.description)) {
      job.clientName = await extractClientName(job.reviewText || '', job.description || '');
    }
    console.log('Client name:', job.clientName || 'not found');

    const refineInstruction = req.body.refineInstruction || '';
    const currentLetter     = req.body.currentLetter     || '';
    const isRefinement      = !!(refineInstruction && currentLetter);

    const rawPortfolios = profile.portfolio || [];
    console.log('[DEBUG] portfolios received:', rawPortfolios.length);
    rawPortfolios.forEach((p, i) => {
      console.log(`  [${i}] title="${p.title||p.name||'?'}" urls=${JSON.stringify(p.urls||[p.url||''])} skills=${JSON.stringify(p.skills||[])} desc="${(p.desc||'').slice(0,40)}"`);
    });

    const userMsg = buildUserMessage({ job, profile, settings, refineInstruction, currentLetter });

    const ptStart = userMsg.indexOf('PORTFOLIO (match');
    const ptEnd   = userMsg.indexOf('\n\n', ptStart);
    if (ptStart > -1) console.log('[DEBUG] portfolioText in prompt:\n' + userMsg.slice(ptStart, ptEnd > -1 ? ptEnd : ptStart + 400));

    const result = await callClaude(SYSTEM, userMsg);

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
