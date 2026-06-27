'use strict';

const https = require('https');

function getPaddleCustomer(customerId) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.PADDLE_API_KEY;
    const isProd = process.env.PADDLE_ENVIRONMENT === 'production';
    const hostname = isProd ? 'api.paddle.com' : 'sandbox-api.paddle.com';
    const req = https.request({
      hostname,
      path: `/customers/${customerId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)?.data || null); }
        catch(e) { resolve(null); }
      });
    });
    req.on('error', reject); req.end();
  });
}

function getPaddleSubscription(subId) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.PADDLE_API_KEY;
    const isProd = process.env.PADDLE_ENVIRONMENT === 'production';
    const hostname = isProd ? 'api.paddle.com' : 'sandbox-api.paddle.com';
    const req = https.request({
      hostname,
      path: `/subscriptions/${subId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)?.data || null); }
        catch(e) { resolve(null); }
      });
    });
    req.on('error', reject); req.end();
  });
}

module.exports = { getPaddleCustomer, getPaddleSubscription };
