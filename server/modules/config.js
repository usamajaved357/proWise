'use strict';

// limit = combined pool for job audits + proposals + proposal revisions
// (all cost the same $0.01/action, so they share one counter — a user can
// spend it however they like, e.g. reviewing one proposal 10 times, rather
// than hitting an arbitrary per-proposal revision cap while unused quota
// sits idle). auditLimit = separate pool for profile/agency audits, the
// $0.10/action feature — kept apart because it's 10x pricier and used far
// less often, so folding it into the same counter would let a handful of
// audits silently eat a user's whole month of proposals.
const PLANS = {
  free:    { limit: 2,   auditLimit: 0 },
  starter: { limit: 150, auditLimit: 0 }, // "Basic" $19
  pro:     { limit: 400, auditLimit: 1 }, // "Pro" $35
  agency:  { limit: 700, auditLimit: 4 }, // "Agency" $55 — 2 reports each for freelancer + agency profile
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

module.exports = { PLANS, currentMonth };
