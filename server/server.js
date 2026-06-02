// Snag AI Server v7 — modular architecture
'use strict';

const express = require('express');

const statusRoute   = require('./routes/status');
const proposalRoute = require('./routes/proposal');
const billingRoute  = require('./routes/billing');
const upgradeRoute  = require('./routes/upgrade');
const webhookRoute  = require('./routes/webhook');
const adminRoute    = require('./routes/admin');

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
app.use(express.json({ limit: '30kb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Snag AI API v7' }));

app.use('/status',          statusRoute);
app.use('/proposal',        proposalRoute);
app.use('/billing-portal',  billingRoute);
app.use('/upgrade',         upgradeRoute);
app.use('/webhook/paddle',  webhookRoute);
app.use(adminRoute); // handles /activate, /admin/grant, /admin/users

app.listen(PORT, () => console.log(`Snag AI v7 on port ${PORT}`));
