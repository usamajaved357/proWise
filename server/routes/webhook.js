'use strict';

const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const { getUser, upsertUser, updateUser } = require('../modules/db');
const { sendWelcomeEmail } = require('../modules/email');
const { getPaddleCustomer } = require('../modules/paddle');
const { resetUsage } = require('../modules/usage');

const PRICE_MAP = {
  [process.env.PADDLE_PRICE_STARTER]: 'starter',
  [process.env.PADDLE_PRICE_PRO]:     'pro',
  [process.env.PADDLE_PRICE_AGENCY]:  'agency',
};

// Paddle signs each webhook with `Paddle-Signature: ts=<unix>;h1=<hex hmac>`,
// computed over `${ts}:${rawBody}` using the secret from Developer Tools →
// Notifications → this endpoint. Without this check, anyone who finds the
// webhook URL could POST a fake subscription.created event and grant
// themselves any plan for free — this must fail closed (reject) on any
// missing/malformed/mismatched signature, not just log a warning.
function isValidPaddleSignature(req) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) { console.error('PADDLE_WEBHOOK_SECRET not set — rejecting webhook'); return false; }

  const header = req.headers['paddle-signature'];
  if (!header || !req.rawBody) return false;

  const parts = Object.fromEntries(header.split(';').map(p => p.split('=')));
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const expected = crypto.createHmac('sha256', secret)
    .update(`${ts}:${req.rawBody}`)
    .digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(h1, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

router.post('/', async (req, res) => {
  if (!isValidPaddleSignature(req)) {
    console.error('Rejected webhook: invalid or missing Paddle-Signature');
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;
  if (!event || typeof event !== 'object') {
    return res.status(400).send('Bad JSON');
  }

  const type = event.event_type || event.alert_name;
  console.log('Paddle event:', type);

  if (['subscription.created','subscription.activated','transaction.completed'].includes(type)) {
    const data    = event.data || event;
    let email     = data.customer?.email || data.email;
    const priceId = data.items?.[0]?.price?.id || data.subscription_plan_id;
    const planFromCustomData = data.items?.[0]?.price?.custom_data?.plan;
    const plan    = planFromCustomData || PRICE_MAP[priceId] || 'starter';
    const subId   = data.subscription_id || data.id;
    const custId  = data.customer_id;

    const nextBilledAt       = data.next_billed_at
                             || data.current_billing_period?.ends_at
                             || data.billing_period?.ends_at
                             || null;
    const currentPeriodStart = data.current_billing_period?.starts_at
                             || data.billing_period?.starts_at
                             || new Date().toISOString();

    if (!email && custId && process.env.PADDLE_API_KEY) {
      try {
        const custData = await getPaddleCustomer(custId);
        email = custData?.email;
      } catch(e) {
        console.error('Failed to fetch customer:', e.message);
      }
    }

    if (!email) {
      console.error('No email found for customer_id:', custId);
      return res.sendStatus(200);
    }

    const existingUser = await getUser(email);
    if (existingUser) {
      await updateUser(email, { plan, active: true, sub_id: subId, customer_id: custId || existingUser.customer_id || null, usage_data: resetUsage(), next_billed_at: nextBilledAt, current_period_start: currentPeriodStart, cancels_at: null });
    } else {
      await upsertUser(email, { plan, active: true, sub_id: subId, customer_id: custId || null, usage_data: resetUsage(), next_billed_at: nextBilledAt, current_period_start: currentPeriodStart, cancels_at: null });
    }
    console.log('DB updated:', email, '→', plan, '| customer_id:', custId, '| next_billed_at:', nextBilledAt);
    await sendWelcomeEmail(email, plan);
  }

  if (type === 'subscription.renewed') {
    const email              = event.data?.customer?.email;
    const nextBilledAt       = event.data?.next_billed_at || null;
    const currentPeriodStart = event.data?.current_billing_period?.starts_at || new Date().toISOString();
    if (email) {
      await updateUser(email, { usage_data: resetUsage(), next_billed_at: nextBilledAt, current_period_start: currentPeriodStart, cancels_at: null, active: true });
      console.log(`Renewed + reset: ${email} | next_billed_at: ${nextBilledAt}`);
    }
  }

  if (type === 'subscription.updated') {
    const data  = event.data || {};
    const email = data.customer?.email;
    if (email) {
      const priceId            = data.items?.[0]?.price?.id;
      const nextBilledAt       = data.next_billed_at || null;
      const currentPeriodStart = data.current_billing_period?.starts_at || null;
      const PRICE_MAP_UP       = {
        [process.env.PADDLE_PRICE_STARTER]: 'starter',
        [process.env.PADDLE_PRICE_PRO]:     'pro',
        [process.env.PADDLE_PRICE_AGENCY]:  'agency',
      };
      const newPlan = PRICE_MAP_UP[priceId];
      const updates = { active: true };
      if (newPlan)            updates.plan                 = newPlan;
      if (nextBilledAt)       updates.next_billed_at       = nextBilledAt;
      if (currentPeriodStart) updates.current_period_start = currentPeriodStart;
      await updateUser(email, updates);
      console.log(`subscription.updated: ${email} → plan:${newPlan || 'unchanged'}`);
    }
  }

  if (['subscription.canceled','subscription.paused'].includes(type)) {
    let email    = event.data?.customer?.email;
    const custId = event.data?.customer_id;

    if (!email && custId && process.env.PADDLE_API_KEY) {
      try {
        const custData = await getPaddleCustomer(custId);
        email = custData?.email;
      } catch(e) {
        console.error('Could not fetch customer email for cancellation:', e.message);
      }
    }

    if (email) {
      const cancelsAt = event.data?.current_billing_period?.ends_at
                      || event.data?.scheduled_change?.effective_at
                      || event.data?.canceled_at
                      || null;
      await updateUser(email, { active: false, sub_id: '', cancels_at: cancelsAt });
      console.log(`Cancelled: ${email} | access until: ${cancelsAt || 'now'}`);
    } else {
      console.error('subscription.canceled: could not resolve email, customer_id:', custId);
    }
  }

  res.sendStatus(200);
});

module.exports = router;
