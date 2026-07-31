'use strict';

const https = require('https');
const { PLANS } = require('./config');

function sendWelcomeEmail(to, plan) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.log(`[EMAIL SKIP] To:${to} Plan:${plan}`); return Promise.resolve(); }
  const planLabel = { starter:'Starter', pro:'Pro', agency:'Agency' }[plan] || plan;
  const limit = PLANS[plan]?.coverLetters?.limit || 0;
  const body = JSON.stringify({
    from: 'Snag AI <noreply@snagai.pro>',
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
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ console.log('Email sent:', res.statusCode, res.statusCode >= 300 ? d : ''); resolve(); }); });
    req.on('error', e => { console.error('Email error:', e.message); resolve(); });
    req.write(body); req.end();
  });
}

function sendMagicLinkEmail(to, link) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.log(`[MAGIC LINK EMAIL SKIP] To:${to} Link:${link}`); return Promise.resolve(); }
  const body = JSON.stringify({
    from: 'Snag AI <noreply@snagai.pro>',
    to: [to],
    subject: 'Verify your email for Snag AI',
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:28px">
    <div style="width:52px;height:52px;margin:0 auto 12px;background:linear-gradient(135deg,#c9a84c,#e8c878);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:24px">🔐</div>
    <h1 style="font-size:22px;font-weight:700;margin:8px 0 4px">Verify your email</h1>
    <p style="color:#888;font-size:14px;margin:0">Click the button below to verify ${to} for Snag AI</p>
  </div>
  <div style="background:#f7f6f2;border-radius:14px;padding:32px;text-align:center;margin-bottom:24px">
    <a href="${link}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:999px">Verify email</a>
    <p style="font-size:12px;color:#aaa;margin:16px 0 0">Expires in 30 minutes</p>
  </div>
  <p style="font-size:12px;color:#bbb;text-align:center;margin:0">If you didn't request this, ignore this email. Someone may have entered your address by mistake.</p>
</div>`
  });
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ console.log('Magic link email sent:', res.statusCode, res.statusCode >= 300 ? d : ''); resolve(); }); });
    req.on('error', e => { console.error('Magic link email error:', e.message); resolve(); });
    req.write(body); req.end();
  });
}

function sendReviewInviteEmail(to, link) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.log(`[REVIEW INVITE EMAIL SKIP] To:${to} Link:${link}`); return Promise.resolve(); }
  const body = JSON.stringify({
    from: 'Snag AI <noreply@snagai.pro>',
    to: [to],
    subject: 'Share your Snag AI experience',
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:28px">
    <div style="width:52px;height:52px;margin:0 auto 12px;background:linear-gradient(135deg,#c9a84c,#e8c878);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:24px">⭐</div>
    <h1 style="font-size:22px;font-weight:700;margin:8px 0 4px">Share your experience</h1>
    <p style="color:#888;font-size:14px;margin:0">You're a verified Snag AI customer, we'd love your feedback</p>
  </div>
  <div style="background:#f7f6f2;border-radius:14px;padding:32px;text-align:center;margin-bottom:24px">
    <a href="${link}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:999px">Write your review</a>
    <p style="font-size:12px;color:#aaa;margin:16px 0 0">This link expires in 48 hours and can only be used once</p>
  </div>
  <p style="font-size:12px;color:#bbb;text-align:center;margin:0">If you didn't request this, ignore this email. Someone may have entered your address by mistake.</p>
</div>`
  });
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ console.log('Review invite email sent:', res.statusCode, res.statusCode >= 300 ? d : ''); resolve(); }); });
    req.on('error', e => { console.error('Review invite email error:', e.message); resolve(); });
    req.write(body); req.end();
  });
}

function sendSupportRequestEmail(fromEmail, category, message, transcript, attachments) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SUPPORT_INBOX_EMAIL || 'support@snagai.pro';
  if (!apiKey) { console.log(`[SUPPORT EMAIL SKIP] From:${fromEmail} Category:${category} Message:${message}`); return Promise.resolve(); }
  const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const safeMessage = escapeHtml(message).replace(/\n/g,'<br>');
  const steps = Array.isArray(transcript) ? transcript.filter(Boolean) : [];
  const transcriptHtml = steps.length ? `
  <div style="margin-bottom:18px">
    <p style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#aaa;margin:0 0 8px">Conversation summary (internal, not sent to customer)</p>
    <ol style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#444">
      ${steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
    </ol>
  </div>` : '';
  const attachmentList = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
  const attachmentNoteHtml = attachmentList.length
    ? `<p style="font-size:12px;color:#888;margin:10px 0 0">&#128206; Attached: ${attachmentList.map(a => escapeHtml(a.filename)).join(', ')}</p>`
    : '';
  const payload = {
    from: 'Snag AI Support Widget <noreply@snagai.pro>',
    to: [to],
    reply_to: fromEmail,
    subject: `Support request: ${category}`,
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;color:#1a1a1a">
  <h1 style="font-size:19px;font-weight:700;margin:0 0 4px">New support request</h1>
  <p style="color:#888;font-size:13px;margin:0 0 20px">via the landing page support widget</p>
  <table style="width:100%;font-size:14px;margin-bottom:18px">
    <tr><td style="color:#888;padding:4px 0;width:90px">From</td><td>${fromEmail}</td></tr>
    <tr><td style="color:#888;padding:4px 0">Category</td><td>${category}</td></tr>
  </table>
  ${transcriptHtml}
  <div style="background:#f7f6f2;border-radius:12px;padding:18px 20px;font-size:14px;line-height:1.6">${safeMessage}</div>
  ${attachmentNoteHtml}
  <p style="font-size:12px;color:#aaa;margin:18px 0 0">Reply directly to this email to respond to ${fromEmail}.</p>
</div>`
  };
  if (attachmentList.length) {
    payload.attachments = attachmentList.map(a => ({ filename: a.filename, content: a.dataBase64 }));
  }
  const body = JSON.stringify(payload);
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ console.log('Support request email sent:', res.statusCode, res.statusCode >= 300 ? d : ''); resolve(); }); });
    req.on('error', e => { console.error('Support request email error:', e.message); resolve(); });
    req.write(body); req.end();
  });
}

module.exports = { sendWelcomeEmail, sendMagicLinkEmail, sendReviewInviteEmail, sendSupportRequestEmail };
