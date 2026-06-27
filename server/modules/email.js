'use strict';

const https = require('https');
const { PLANS } = require('./config');

function sendWelcomeEmail(to, plan) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.log(`[EMAIL SKIP] To:${to} Plan:${plan}`); return Promise.resolve(); }
  const planLabel = { starter:'Starter', pro:'Pro', agency:'Agency' }[plan] || plan;
  const limit = PLANS[plan]?.limit || 0;
  const body = JSON.stringify({
    from: 'Snag AI <onboarding@resend.dev>',
    to: [to],
    subject: `✦ Your Snag AI ${planLabel} plan is active`,
    html: `
<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:28px">
    <div style="width:52px;height:52px;margin:0 auto 12px;background:linear-gradient(135deg,#c9a84c,#e8c878);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px">🎯</div>
    <h1 style="font-size:22px;font-weight:700;margin:0">Welcome to Snag AI</h1>
    <p style="color:#666;margin:6px 0 0">${planLabel} — ${limit} proposals/month</p>
  </div>
  <div style="background:#f5f4f0;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
    <p style="font-size:14px;margin:0">Your plan is active. Open the Snag AI extension and enter <strong>${to}</strong> as your email to unlock your proposals.</p>
  </div>
  <ol style="color:#444;font-size:14px;line-height:1.9;padding-left:20px;margin:0 0 24px">
    <li>Open the Snag AI Chrome extension</li>
    <li>Enter your email: <strong>${to}</strong></li>
    <li>Open any Upwork job → click <strong>Write Proposal</strong></li>
    <li>Snag the job before anyone else 🚀</li>
  </ol>
  <p style="font-size:12px;color:#aaa;text-align:center">Snag AI · Cancel anytime from your Paddle billing portal</p>
</div>`
  });
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ console.log('Email sent:', res.statusCode); resolve(); }); });
    req.on('error', e => { console.error('Email error:', e.message); resolve(); });
    req.write(body); req.end();
  });
}

function sendOTPEmail(to, otp) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.log(`[OTP EMAIL SKIP] To:${to} Code:${otp}`); return Promise.resolve(); }
  const body = JSON.stringify({
    from: 'Snag AI <onboarding@resend.dev>',
    to: [to],
    subject: `${otp} — your Snag AI verification code`,
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:28px">
    <div style="width:52px;height:52px;margin:0 auto 12px;background:linear-gradient(135deg,#c9a84c,#e8c878);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:24px">🔐</div>
    <h1 style="font-size:22px;font-weight:700;margin:8px 0 4px">Verify your email</h1>
    <p style="color:#888;font-size:14px;margin:0">Enter this code in the Snag AI extension</p>
  </div>
  <div style="background:#f7f6f2;border-radius:14px;padding:32px;text-align:center;margin-bottom:24px">
    <div style="font-size:40px;font-weight:800;letter-spacing:10px;color:#1a1a1a;font-variant-numeric:tabular-nums">${otp}</div>
    <p style="font-size:12px;color:#aaa;margin:14px 0 0">Expires in 10 minutes</p>
  </div>
  <p style="font-size:12px;color:#bbb;text-align:center;margin:0">If you didn't request this, ignore this email. Someone may have entered your address by mistake.</p>
</div>`
  });
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ console.log('OTP email sent:', res.statusCode); resolve(); }); });
    req.on('error', e => { console.error('OTP email error:', e.message); resolve(); });
    req.write(body); req.end();
  });
}

module.exports = { sendWelcomeEmail, sendOTPEmail };
