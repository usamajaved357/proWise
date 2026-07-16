'use strict';

const crypto = require('crypto');
const { PLANS, currentMonth } = require('./config');
const { getUser, updateUser, upsertUser, getAnon, upsertAnon } = require('./db');
const { getPaddleSubscription } = require('./paddle');

// ── Per-user usage — a single jsonb column (usage_data) instead of a flat
// column pair per feature. All features share one billingMonth: whichever
// reset trigger fires first (Paddle renewal date for paid users, calendar
// month otherwise — see the reset block in getUserStatus) resets everything
// at once, since they're all meant to refill together on the same cycle.
function emptyUsage() {
  return {
    billingMonth:  currentMonth(),
    coverLetters:  { used: 0, revisedJobHashes: [] },
    jobAudits:     { used: 0 },
    profileAudits: { used: 0 },
  };
}

function currentUsage(u) {
  if (u?.usage_data && u.usage_data.billingMonth === currentMonth()) {
    return {
      billingMonth:  u.usage_data.billingMonth,
      coverLetters:  { used: 0, revisedJobHashes: [], ...u.usage_data.coverLetters },
      jobAudits:     { used: 0, ...u.usage_data.jobAudits },
      profileAudits: { used: 0, ...u.usage_data.profileAudits },
    };
  }
  return emptyUsage();
}

async function getUserStatus(email) {
  const u = await getUser(email);
  if (!u) {
    const cfg = PLANS.free;
    return {
      plan: 'free', limit: cfg.coverLetters.limit, used: 0, remaining: cfg.coverLetters.limit,
      auditLimit: cfg.profileAudits.limit, usedAudits: 0, remainingAudits: cfg.profileAudits.limit,
      jobAuditLimit: cfg.jobAudits.limit, usedJobAudits: 0, remainingJobAudits: cfg.jobAudits.limit,
      features: cfg,
    };
  }

  let plan = u.plan || 'free';
  let cfg  = PLANS[plan] || PLANS.free;
  let usage = currentUsage(u);

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
        plan = 'free';
        cfg  = PLANS.free;
        usage = emptyUsage();
      }
    }
  }

  const isCanceling = u.cancels_at && new Date(u.cancels_at) > new Date();

  let shouldReset = false;
  if (!isCanceling && u.next_billed_at) {
    const nextBilledMs = new Date(u.next_billed_at).getTime();
    if (!isNaN(nextBilledMs) && Date.now() >= nextBilledMs && usage.billingMonth !== currentMonth()) {
      shouldReset = true;
    }
  } else if (!isCanceling && !u.next_billed_at) {
    if (usage.billingMonth !== currentMonth()) shouldReset = true;
  }
  if (shouldReset) {
    usage = emptyUsage();
    await updateUser(email, { usage_data: usage });
  }

  let subscriptionStatus = 'active';
  if (u.cancels_at) {
    subscriptionStatus = new Date(u.cancels_at) > new Date() ? 'canceling' : 'canceled';
  } else if (u.active === false) {
    subscriptionStatus = 'canceled';
  }

  const used           = usage.coverLetters.used;
  const usedAudits      = usage.profileAudits.used;
  const usedJobAudits    = usage.jobAudits.used;

  return {
    plan,
    limit: cfg.coverLetters.limit,
    used,
    remaining: Math.max(0, cfg.coverLetters.limit - used),
    auditLimit: cfg.profileAudits.limit,
    usedAudits,
    remainingAudits: Math.max(0, cfg.profileAudits.limit - usedAudits),
    jobAuditLimit: cfg.jobAudits.limit,
    usedJobAudits,
    remainingJobAudits: Math.max(0, cfg.jobAudits.limit - usedJobAudits),
    active:              u.active !== false,
    subscriptionStatus,
    nextBilledAt:        u.next_billed_at        || null,
    currentPeriodStart:  u.current_period_start  || null,
    cancelsAt:           u.cancels_at            || null,
    features: cfg,
  };
}

async function saveUsage(email, u, usage) {
  if (u) await updateUser(email, { usage_data: usage });
  else await upsertUser(email, { plan: 'free', active: true, usage_data: usage });
}

async function canGenerate(email) {
  const status = await getUserStatus(email);
  return status.remaining > 0;
}

async function recordUsage(email) {
  const u = await getUser(email);
  const usage = currentUsage(u);
  usage.coverLetters.used += 1;
  await saveUsage(email, u, usage);
}

// ── Profile/agency audit quota — separate pool from cover letters/job
// audits. Audits cost ~10x a proposal/job-audit ($0.10 vs $0.01) and are
// used far less often, so they get their own counter (profileAudits.used)
// rather than sharing a pool — otherwise a handful of audits could silently
// consume a user's whole month of proposals.
async function canAudit(email) {
  const status = await getUserStatus(email);
  return status.remainingAudits > 0;
}

async function recordAuditUsage(email) {
  const u = await getUser(email);
  const usage = currentUsage(u);
  usage.profileAudits.used += 1;
  await saveUsage(email, u, usage);
}

// ── Job audit quota — separate pool from cover letters. Both cost the same
// $0.01/call, but they're two distinct features on the pricing page with
// their own advertised limits, so they're tracked independently rather than
// sharing a counter.
async function canJobAudit(email) {
  const status = await getUserStatus(email);
  return status.remainingJobAudits > 0;
}

async function recordJobAuditUsage(email) {
  const u = await getUser(email);
  const usage = currentUsage(u);
  usage.jobAudits.used += 1;
  await saveUsage(email, u, usage);
}

// ── 1 free revision per letter — identifies "the same letter" by hashing the
// job's title+description (no client-side changes needed, since both fields
// are already required on every /proposal and /agency-proposal call). Each
// distinct job gets exactly one free revision per billing month; the 2nd+
// revision on that same job draws from the coverLetters pool like a fresh
// generation.
function hashJob(job) {
  const key = (job?.title || '') + '|' + (job?.description || '').slice(0, 500);
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}

async function hasFreeRevision(email, job) {
  const u = await getUser(email);
  if (!u) return true; // no record yet — first-ever revision is free
  const usage = currentUsage(u);
  return !usage.coverLetters.revisedJobHashes.includes(hashJob(job));
}

async function consumeFreeRevision(email, job) {
  const u = await getUser(email);
  const usage = currentUsage(u);
  const h = hashJob(job);
  if (!usage.coverLetters.revisedJobHashes.includes(h)) usage.coverLetters.revisedJobHashes.push(h);
  await saveUsage(email, u, usage);
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

// Fresh, all-zero usage object stamped with the current billing month — used
// wherever a plan change/renewal should reset every feature's counter at
// once (webhook.js, admin.js, upgrade.js).
function resetUsage() {
  return emptyUsage();
}

module.exports = { getUserStatus, canGenerate, recordUsage, canAnonGenerate, recordAnonUsage, canAudit, recordAuditUsage, canJobAudit, recordJobAuditUsage, hasFreeRevision, consumeFreeRevision, resetUsage };
