'use strict';

const express = require('express');
const router  = express.Router();
const https   = require('https');
const { PLANS, currentMonth } = require('../modules/config');
const { getUser, updateUser }  = require('../modules/db');
const { getUserStatus }        = require('../modules/usage');

const PRICE_IDS = {
  starter: process.env.PADDLE_PRICE_STARTER,
  pro:     process.env.PADDLE_PRICE_PRO,
  agency:  process.env.PADDLE_PRICE_AGENCY,
};

router.post('/', async (req, res) => {
  const { email, plan } = req.body;
  if (!email || !email.includes('@'))            return res.status(400).json({ error: 'Email required.' });
  if (!['starter','pro','agency'].includes(plan)) return res.status(400).json({ error: 'Invalid plan.' });

  const user = await getUser(email);
  if (!user || !user.sub_id) return res.status(404).json({ error: 'No active subscription found for this email.' });
  if (user.plan === plan)    return res.status(400).json({ error: 'You are already on this plan.' });

  if (user.active === false || user.cancels_at) {
    return res.status(400).json({
      error: 'Your subscription has been canceled. Please subscribe again.',
      needsCheckout: true,
    });
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) return res.status(500).json({ error: `Price ID for "${plan}" is not configured on the server.` });

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey)  return res.status(500).json({ error: 'Paddle API key not configured.' });

  const isProd = process.env.PADDLE_ENVIRONMENT === 'production';
  const host   = isProd ? 'api.paddle.com' : 'sandbox-api.paddle.com';

  try {
    const result = await new Promise((resolve, reject) => {
      const body = JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        proration_billing_mode: 'prorated_immediately',
      });
      const request = https.request({
        hostname: host,
        path:     `/subscriptions/${user.sub_id}`,
        method:   'PATCH',
        headers: {
          'Authorization':  `Bearer ${apiKey}`,
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
        }
      }, response => {
        let d = '';
        response.on('data', c => d += c);
        response.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
      });
      request.on('error', reject);
      request.write(body);
      request.end();
    });

    if (result.error) {
      console.error('Paddle upgrade error:', JSON.stringify(result.error));
      const detail = (result.error.detail || result.error.message || '').toLowerCase();
      if (detail.includes('cancel') || detail.includes('inactive') || detail.includes('not active')) {
        await updateUser(email, { active: false, sub_id: '' }).catch(() => {});
        return res.status(400).json({
          error: 'Your subscription has been canceled. Please subscribe again.',
          needsCheckout: true,
        });
      }
      return res.status(400).json({ error: result.error.detail || 'Paddle could not update the subscription.' });
    }

    const newLimit           = PLANS[plan]?.limit ?? 2;
    const nextBilledAt       = result.data?.next_billed_at || user.next_billed_at || null;
    const currentPeriodStart = result.data?.current_billing_period?.starts_at || user.current_period_start || null;
    await updateUser(email, { plan, billing_month: currentMonth(), next_billed_at: nextBilledAt, current_period_start: currentPeriodStart });
    console.log(`Upgraded: ${email} → ${plan} (was ${user.plan})`);

    res.json({ ok: true, plan, limit: newLimit });
  } catch(e) {
    console.error('Upgrade error:', e.message);
    res.status(500).json({ error: 'Failed to contact Paddle. Try again.' });
  }
});

module.exports = router;
