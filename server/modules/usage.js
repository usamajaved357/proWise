'use strict';

const { PLANS, currentMonth } = require('./config');
const { getUser, updateUser, upsertUser, getAnon, upsertAnon } = require('./db');
const { getPaddleSubscription } = require('./paddle');

async function getUserStatus(email) {
  const u = await getUser(email);
  if (!u) return {
    plan: 'free', limit: 2, used: 0, remaining: 2,
    auditLimit: PLANS['free'].auditLimit, usedAudits: 0, remainingAudits: PLANS['free'].auditLimit,
  };

  let plan  = u.plan || 'free';
  let limit = PLANS[plan]?.limit ?? 2;
  let used  = u.used || 0;
  const auditLimit = PLANS[plan]?.auditLimit ?? 0;
  const usedAudits  = u.audit_billing_month === currentMonth() ? (u.used_audits || 0) : 0;

  // Auto-heal: fetch billing dates from Paddle if missing for a paid active user
  if (!u.next_billed_at && u.sub_id && plan !== 'free' && u.active !== false && !u.cancels_at) {
    try {
      const sub = await getPaddleSubscription(u.sub_id);
      if (sub) {
        const nextBilledAt       = sub.next_billed_at || null;
        const currentPeriodStart = sub.current_billing_period?.starts_at || null;
        if (nextBilledAt || currentPeriodStart) {
          await updateUser(email, { next_billed_at: nextBilledAt, current_period_start: currentPeriodStart });
          u.next_billed_at       = nextBilledAt;
          u.current_period_start = currentPeriodStart;
        }
      }
    } catch (e) {
      // non-fatal — continue with what we have
    }
  }

  // Cancellation check: downgrade once access period expires
  if (u.cancels_at) {
    const cancelsMs = new Date(u.cancels_at).getTime();
    if (!isNaN(cancelsMs) && Date.now() >= cancelsMs) {
      if (plan !== 'free') {
        await updateUser(email, { plan: 'free', active: false });
        plan  = 'free';
        limit = PLANS['free'].limit;
        used  = 0;
      }
    }
  }

  const isCanceling = u.cancels_at && new Date(u.cancels_at) > new Date();

  if (!isCanceling && u.next_billed_at) {
    const nextBilledMs = new Date(u.next_billed_at).getTime();
    if (!isNaN(nextBilledMs) && Date.now() >= nextBilledMs) {
      const newMonth = currentMonth();
      if (u.billing_month !== newMonth) {
        used = 0;
        await updateUser(email, { used: 0, billing_month: newMonth });
      }
    }
  } else if (!isCanceling && !u.next_billed_at) {
    if (u.billing_month !== currentMonth()) {
      used = 0;
      await updateUser(email, { used: 0, billing_month: currentMonth() });
    }
  }

  let subscriptionStatus = 'active';
  if (u.cancels_at) {
    subscriptionStatus = new Date(u.cancels_at) > new Date() ? 'canceling' : 'canceled';
  } else if (u.active === false) {
    subscriptionStatus = 'canceled';
  }

  return {
    plan,
    limit,
    used,
    remaining:           Math.max(0, limit - used),
    auditLimit,
    usedAudits,
    remainingAudits:     Math.max(0, auditLimit - usedAudits),
    active:              u.active !== false,
    subscriptionStatus,
    nextBilledAt:        u.next_billed_at        || null,
    currentPeriodStart:  u.current_period_start  || null,
    cancelsAt:           u.cancels_at            || null,
  };
}

async function canGenerate(email) {
  const status = await getUserStatus(email);
  return status.remaining > 0;
}

async function recordUsage(email) {
  const u = await getUser(email);
  const used = (u?.billing_month === currentMonth() ? u.used || 0 : 0) + 1;
  if (u) {
    await updateUser(email, { used, billing_month: currentMonth() });
  } else {
    await upsertUser(email, { plan: 'free', used, billing_month: currentMonth(), active: true });
  }
}

// ── Profile/agency audit quota — separate pool from canGenerate/recordUsage.
// Audits cost ~10x a proposal/job-audit ($0.10 vs $0.01) and are used far
// less often, so they get their own counter (used_audits/audit_billing_month)
// rather than sharing the main pool — otherwise a handful of audits could
// silently consume a user's whole month of proposals.
async function canAudit(email) {
  const u = await getUser(email);
  if (!u) return PLANS['free'].auditLimit > 0;
  const plan  = u.plan || 'free';
  const limit = PLANS[plan]?.auditLimit ?? 0;
  const used  = u.audit_billing_month === currentMonth() ? (u.used_audits || 0) : 0;
  return used < limit;
}

async function recordAuditUsage(email) {
  const u = await getUser(email);
  const usedAudits = (u?.audit_billing_month === currentMonth() ? u.used_audits || 0 : 0) + 1;
  if (u) {
    await updateUser(email, { used_audits: usedAudits, audit_billing_month: currentMonth() });
  } else {
    await upsertUser(email, { plan: 'free', used_audits: usedAudits, audit_billing_month: currentMonth(), active: true });
  }
}

async function canAnonGenerate(anonId) {
  const u = await getAnon(anonId);
  return !u || (u.used || 0) < 2;
}

async function recordAnonUsage(anonId) {
  const u = await getAnon(anonId);
  const used = (u?.used || 0) + 1;
  await upsertAnon(anonId, { used });
}

module.exports = { getUserStatus, canGenerate, recordUsage, canAnonGenerate, recordAnonUsage, canAudit, recordAuditUsage };
