'use strict';

const express = require('express');
const router  = express.Router();
const https   = require('https');
const { getUser } = require('../modules/db');

router.post('/', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Email required' });

  const user = await getUser(email);
  if (!user || !['starter','pro','agency'].includes(user.plan)) {
    return res.status(404).json({ error: 'No active subscription found for this email.' });
  }
  if (!user.customer_id) {
    return res.status(404).json({ error: 'Billing portal not available yet. Contact support.' });
  }

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Paddle API key not configured.' });

  const isProd = process.env.PADDLE_ENVIRONMENT === 'production';
  const host   = isProd ? 'api.paddle.com' : 'sandbox-api.paddle.com';

  try {
    const portalData = await new Promise((resolve, reject) => {
      const body = JSON.stringify({});
      const request = https.request({
        hostname: host,
        path: `/customers/${user.customer_id}/portal-sessions`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
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

    const url = portalData?.data?.urls?.general?.overview;
    if (!url) {
      console.error('Paddle portal response:', JSON.stringify(portalData));
      return res.status(500).json({ error: 'Could not generate billing portal URL.' });
    }
    res.json({ url });
  } catch(e) {
    console.error('Billing portal error:', e.message);
    res.status(500).json({ error: 'Failed to connect to Paddle.' });
  }
});

module.exports = router;
