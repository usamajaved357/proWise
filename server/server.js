// Snag AI Server v7 — modular architecture
'use strict';

const express = require('express');

const statusRoute   = require('./routes/status');
const proposalRoute = require('./routes/proposal');
const agencyProposalRoute = require('./routes/agency-proposal');
const analyseRoute  = require('./routes/analyse');
const agencyAnalyseRoute = require('./routes/agency-analyse');
const billingRoute  = require('./routes/billing');
const upgradeRoute  = require('./routes/upgrade');
const webhookRoute  = require('./routes/webhook');
const adminRoute    = require('./routes/admin');
const verifyRoute       = require('./routes/verify');
const profileAuditRoute = require('./routes/profile-audit');
const agencyAuditRoute   = require('./routes/agency-audit');
const usageHistoryRoute  = require('./routes/usage-history');
const reviewsRoute       = require('./routes/reviews');
const supportRoute       = require('./routes/support');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────────────────────────────
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret, x-license-key');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret, x-license-key');
  next();
});
// /support gets its own higher-limit parser first — up to 4 base64-encoded image
// attachments (15MB combined binary) inflate to ~21MB, well past the 150kb
// default below. Registered before the generic parser so support requests
// never hit that smaller cap.
app.use('/support', express.json({ limit: '24mb' }));

// Was 30kb — too small for agency profiles (32 portfolio items + 20 work-history
// entries + ~28 staff members measures ~41KB on a real, data-rich agency profile,
// well past the old cap). Raised with margin above that real measurement.
app.use(express.json({ limit: '150kb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Snag AI API v7' }));

app.use('/verify',          verifyRoute);
app.use('/status',          statusRoute);
app.use('/proposal',        proposalRoute);
app.use('/agency-proposal', agencyProposalRoute);
app.use('/analyse',         analyseRoute);
app.use('/agency-analyse',  agencyAnalyseRoute);
app.use('/billing-portal',  billingRoute);
app.use('/upgrade',         upgradeRoute);
app.use('/webhook/paddle',  webhookRoute);
app.use('/profile-audit',   profileAuditRoute);
app.use('/agency-audit',    agencyAuditRoute);
app.use('/usage-history',   usageHistoryRoute);
app.use('/reviews',         reviewsRoute);
app.use('/support',         supportRoute);
app.use(adminRoute); // handles /activate, /admin/grant, /admin/users

app.listen(PORT, () => console.log(`Snag AI v7 on port ${PORT}`));
