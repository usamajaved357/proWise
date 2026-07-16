'use strict';

// One entry per plan, one key per pricing-card feature (extension/options/
// options.html's .pcv2-list, 6 rows: profiles, coverLetters, jobMatchAlerts,
// jobAudits, profileAudits, prioritySupport). Usage-limited features carry
// { limit: N } (0 = not included); on/off features carry { enabled: bool }.
// This is the single source of truth — the frontend should gate buttons/UI
// off what getUserStatus() echoes back (status.features), not off a
// hardcoded copy of this table.
const PLANS = {
  free: {
    profiles:        { limit: 1 },
    coverLetters:    { limit: 2 },
    jobMatchAlerts:  { enabled: false },
    jobAudits:       { limit: 0 },
    profileAudits:   { limit: 0 },
    prioritySupport: { enabled: false },
  },
  starter: { // "Basic" $19
    profiles:        { limit: 1 },
    coverLetters:    { limit: 150 },
    jobMatchAlerts:  { enabled: true },
    jobAudits:       { limit: 0 },
    profileAudits:   { limit: 0 },
    prioritySupport: { enabled: false },
  },
  pro: { // "Pro" $35
    profiles:        { limit: 1 },
    coverLetters:    { limit: 400 },
    jobMatchAlerts:  { enabled: true },
    jobAudits:       { limit: 400 },
    profileAudits:   { limit: 1 },
    prioritySupport: { enabled: false },
  },
  agency: { // "Agency" $55 — 2 profile audit reports (freelancer + agency)
    profiles:        { limit: 2 },
    coverLetters:    { limit: 700 },
    jobMatchAlerts:  { enabled: true },
    jobAudits:       { limit: 700 },
    profileAudits:   { limit: 4 },
    prioritySupport: { enabled: true },
  },
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

module.exports = { PLANS, currentMonth };
