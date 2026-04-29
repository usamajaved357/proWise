// PropWise Server v5
// - 2 free proposals for every new user (no payment needed)
// - Monthly subscription packages: Starter $19/150, Pro $39/400, Agency $69/900
// - Auto-resets usage on new billing month
// - Paddle webhook handles subscription events
// - Resend.com sends license emails

const express = require('express');
const https   = require('https');
const crypto  = require('crypto');

const app    = express();
const PORT   = process.env.PORT || 3000;
const SECRET = process.env.LICENSE_SECRET || 'dev-secret';

// ── In-memory store (replace with Supabase/PlanetScale at 200+ users) ─────────
// users[email] = { plan, active, subId, billingMonth, used, freeUsed, createdAt }
const users = new Map();

// ── Plan config ───────────────────────────────────────────────────────────────
const PLANS = {
  free:    { limit: 2,   price: 0,  label: 'Free' },
  starter: { limit: 150, price: 19, label: 'Starter' },
  pro:     { limit: 400, price: 39, label: 'Pro' },
  agency:  { limit: 900, price: 69, label: 'Agency' },
};

// ── Middleware ────────────────────────────────────────────────────────────────
app.use('/webhook/paddle', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '30kb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-license-key, x-admin-secret');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function currentMonth() {
  return new Date().toISOString().slice(0, 7); // "2026-04"
}

function generateKey(email) {
  const h = crypto.createHmac('sha256', SECRET)
    .update(email.toLowerCase().trim())
    .digest('hex').toUpperCase().slice(0, 12);
  return `PW-${h.slice(0,4)}-${h.slice(4,8)}-${h.slice(8,12)}`;
}

function emailFromKey(key) {
  // reverse lookup
  for (const [email, data] of users) {
    if (generateKey(email) === key) return email;
  }
  return null;
}

function isValidKeyFormat(k) {
  return k && /^PW-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(k);
}

function getOrCreateUser(email) {
  if (!users.has(email)) {
    users.set(email, {
      plan: 'free',
      active: true,
      subId: null,
      billingMonth: currentMonth(),
      used: 0,
      createdAt: Date.now(),
    });
  }
  const u = users.get(email);
  // Reset usage on new billing month
  if (u.billingMonth !== currentMonth()) {
    u.used = 0;
    u.billingMonth = currentMonth();
  }
  return u;
}

function canGenerate(email) {
  const u = getOrCreateUser(email);
  const limit = PLANS[u.plan]?.limit ?? 2;
  return u.used < limit;
}

function recordUsage(email) {
  const u = getOrCreateUser(email);
  u.used++;
}

function getUserStatus(email) {
  const u = getOrCreateUser(email);
  const plan   = PLANS[u.plan] || PLANS.free;
  const limit  = plan.limit;
  const used   = u.used;
  const remaining = Math.max(0, limit - used);
  return { plan: u.plan, limit, used, remaining, active: u.active, billingMonth: u.billingMonth };
}

// ── Email via Resend ──────────────────────────────────────────────────────────
function sendWelcomeEmail(to, key, plan) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[EMAIL SKIP] To:${to} Key:${key} Plan:${plan}`);
    return Promise.resolve();
  }
  const planLabel = PLANS[plan]?.label || plan;
  const limit     = PLANS[plan]?.limit || 0;
  const body = JSON.stringify({
    from: 'PropWise <noreply@propwise.app>',
    to: [to],
    subject: `✦ Your PropWise ${planLabel} plan is active`,
    html: `
<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:32px">
    <div style="width:52px;height:52px;background:#5b4fff;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:26px;font-weight:700;margin-bottom:12px">P</div>
    <h1 style="font-size:22px;font-weight:700;margin:0">Welcome to PropWise</h1>
    <p style="color:#666;margin:6px 0 0">${planLabel} — ${limit} proposals/month</p>
  </div>
  <div style="background:#f5f4f0;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
    <p style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px">Your license key</p>
    <p style="font-size:26px;font-weight:700;font-family:monospace;color:#5b4fff;margin:0;letter-spacing:.1em">${key}</p>
  </div>
  <h2 style="font-size:16px;font-weight:600;margin:0 0 14px">Get started in 3 minutes</h2>
  <ol style="color:#444;font-size:14px;line-height:1.9;padding-left:20px;margin:0 0 24px">
    <li><a href="https://propwiseapp.netlify.app" style="color:#5b4fff">Visit propwiseapp.netlify.app</a> and follow the install instructions</li>
    <li>Click the PropWise icon in your toolbar</li>
    <li>Enter your license key: <strong style="font-family:monospace">${key}</strong></li>
    <li>Fill in your profile (name, skills, portfolio)</li>
    <li>Open any Upwork job → click <strong>Write Proposal</strong></li>
  </ol>
  <div style="background:#f0f0ff;border-radius:8px;padding:14px 16px;margin-bottom:20px">
    <p style="font-size:13px;color:#3d3d52;margin:0">Your ${limit} proposals reset on the 1st of each month. Questions? Reply to this email.</p>
  </div>
  <p style="font-size:12px;color:#aaa;text-align:center">PropWise · Cancel anytime from your Paddle billing portal</p>
</div>`
  });
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ console.log('Email sent:',res.statusCode); resolve(); }); });
    req.on('error', e => { console.error('Email error:', e.message); resolve(); });
    req.write(body); req.end();
  });
}

function sendLowCreditsEmail(to, remaining, plan) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return Promise.resolve();
  const body = JSON.stringify({
    from: 'PropWise <noreply@propwise.app>',
    to: [to],
    subject: `⚠️ You have ${remaining} PropWise proposals left this month`,
    html: `
<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;color:#1a1a1a">
  <h2 style="font-size:20px;font-weight:700;margin:0 0 12px">Running low on proposals</h2>
  <p style="color:#444;font-size:14px;line-height:1.7">You have <strong>${remaining} proposals remaining</strong> this month on your ${plan} plan. They reset on the 1st.</p>
  <p style="color:#444;font-size:14px;line-height:1.7;margin-top:12px">If you need more now, upgrade your plan from the PropWise extension or visit <a href="https://propwise.app/#pricing" style="color:#5b4fff">propwise.app</a>.</p>
</div>`
  });
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => { res.on('data',()=>{}); res.on('end', resolve); });
    req.on('error', resolve);
    req.write(body); req.end();
  });
}

// ── Claude API ────────────────────────────────────────────────────────────────
function callClaude(system, user) {
  return new Promise((resolve, reject) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return reject(new Error('Server not configured — add ANTHROPIC_API_KEY'));
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: user }]
    });
    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(d);
          if (p.error) return reject(new Error(p.error.message));
          const m = (p.content?.[0]?.text || '').match(/\{[\s\S]*\}/);
          if (!m) return reject(new Error('Bad AI response — no JSON found'));
          resolve(JSON.parse(m[0]));
        } catch(e) { reject(new Error('Parse error: ' + e.message)); }
      });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

const SYSTEM = `You are an elite Upwork proposal writer. You write short, human, winning proposals.

OPENING HOOKS — pick the best one for the job:
- PROOF: Lead with a specific past result ("I built X for Y, it hit Z")
- RELATABILITY: "I've solved this exact problem — here's how"
- GUARANTEE: Bold risk-removing commitment specific to their project
- EXTRA VALUE: Offer something concrete beyond what they asked
- CALL: Push for a quick call today, make it urgent and easy
- NUMBERS: Hard stats — years, projects, ratings, numbers
- CLIENT-CENTERED: Show you understood their exact problem better than they explained it

PRICING RULE:
- FIXED PRICE job: end naturally mentioning you can do it for their budget
- HOURLY job: end with your hourly rate naturally
- UNKNOWN: end with call to action

RULES:
1. Opening MUST be specific to THIS job — never generic
2. Only mention skills matching THIS job
3. Include portfolio link naturally (not at start)
4. 120-160 words MAX — every word earns its place
5. Sound like a confident human, not performing AI
6. Short sentences. Vary rhythm. Use contractions.
7. NEVER: "passionate", "extensive experience", "great fit", "excited about", "leverage", "seamlessly", "robust", "look no further"
8. Start some sentences with And, But, So
9. One detail proving you actually read the job

Return ONLY valid JSON:
{
  "letter": "complete proposal 120-160 words",
  "hookType": "hook name",
  "hookDesc": "one line why this hook fits this job",
  "tips": ["tip 1 specific to this job", "tip 2", "tip 3"]
}`;

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.json({ status: 'ok', service: 'PropWise API v5', plans: PLANS }));

// Called by extension on load — returns user status
app.post('/status', (req, res) => {
  const key = req.headers['x-license-key'];
  if (!key || !isValidKeyFormat(key)) {
    // No key = brand new user, give them free tier
    return res.json({ plan: 'free', limit: 2, used: 0, remaining: 2, needsKey: true });
  }
  const email = emailFromKey(key);
  if (!email) return res.status(401).json({ error: 'Invalid license key', needsKey: true });
  res.json(getUserStatus(email));
});

// Validate license key — called when user enters key in popup
app.post('/validate', (req, res) => {
  const { licenseKey } = req.body;
  if (!isValidKeyFormat(licenseKey)) return res.json({ valid: false });
  const email = emailFromKey(licenseKey);
  if (!email) return res.json({ valid: false });
  const status = getUserStatus(email);
  res.json({ valid: true, ...status });
});

// Generate proposal
app.post('/proposal', async (req, res) => {
  const key = req.headers['x-license-key'];
  const { job, profile, settings, tempEmail } = req.body;

  if (!job?.title && !job?.description) {
    return res.status(400).json({ error: 'Could not read job from page.' });
  }

  // Resolve user email
  let email = null;
  if (key && isValidKeyFormat(key)) {
    email = emailFromKey(key);
    if (!email) return res.status(401).json({ error: 'Invalid license key.', showPaywall: true });
  } else {
    // Anonymous user — use temp identifier stored in extension
    email = tempEmail || `anon_${crypto.randomBytes(8).toString('hex')}@propwise.local`;
  }

  const u = getOrCreateUser(email);

  // Check if they can generate
  if (!canGenerate(email)) {
    const status = getUserStatus(email);
    return res.status(402).json({
      error: u.plan === 'free'
        ? 'You have used your 2 free proposals. Subscribe to continue winning jobs.'
        : `You have used all ${PLANS[u.plan].limit} proposals this month. They reset on the 1st.`,
      showPaywall: true,
      plan: u.plan,
      ...status
    });
  }

  // Smart skill matching
  const jobText = ((job.title||'')+' '+(job.description||'')+' '+(job.skills||'')).toLowerCase();
  const allSkills = (profile.skills||'').split(',').map(s => s.trim()).filter(Boolean);
  const matched = allSkills.filter(s => jobText.includes(s.toLowerCase()));
  const relevantSkills = matched.length ? matched.slice(0,4) : allSkills.slice(0,2);

  const isHourly = /hourly|\/hr|per hour/.test((job.description||'').toLowerCase());
  const isFixed  = /fixed/.test((job.description||'').toLowerCase());
  const pricingType = isHourly ? 'HOURLY' : isFixed ? 'FIXED' : 'UNKNOWN';
  const links = (profile.portfolioLinks||[]).filter(Boolean);

  const userMsg = `
JOB TITLE: ${job.title}
JOB DESCRIPTION: ${(job.description||'').slice(0,1200)}
REQUIRED SKILLS: ${job.skills||'not listed'}
BUDGET/RATE: ${job.budget||'not specified'}
PRICING TYPE: ${pricingType}
CLIENT LOCATION: ${job.location||'unknown'}
CLIENT SPENT ON UPWORK: ${job.spent||'unknown'}

FREELANCER:
Name: ${profile.name}
Role: ${profile.title}
RELEVANT skills: ${relevantSkills.join(', ')}
Pitch: ${profile.pitch||''}
Hourly rate: ${profile.hourlyRate||'not set'}
${links.length ? 'Portfolio: '+links[0] : ''}
${profile.extra ? 'Extra: '+profile.extra : ''}
${settings?.alwaysInclude ? 'Always include: '+settings.alwaysInclude : ''}

${pricingType==='HOURLY' ? `HOURLY job — mention rate: "${profile.hourlyRate||'skip'}"` : ''}
${pricingType==='FIXED'  ? `FIXED job — budget: ${job.budget}. Mention you can do it for this.` : ''}
${pricingType==='UNKNOWN'? 'Unknown pricing — end with CTA.' : ''}

Write the proposal. 120-160 words. Sound human.`.trim();

  try {
    const result = await callClaude(SYSTEM, userMsg);
    recordUsage(email);

    const status = getUserStatus(email);

    // Send low credits warning at 10 remaining (paid plans only)
    if (status.remaining === 10 && u.plan !== 'free') {
      sendLowCreditsEmail(email, 10, u.plan).catch(() => {});
    }

    res.json({
      success: true,
      ...result,
      usage: { used: status.used, limit: status.limit, remaining: status.remaining, plan: status.plan }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Paddle webhook ────────────────────────────────────────────────────────────
app.post('/webhook/paddle', async (req, res) => {
  const paddleSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (paddleSecret) {
    const sig = req.headers['paddle-signature'];
    if (!sig) return res.status(401).send('No signature');
    const parts = Object.fromEntries(sig.split(';').map(p => p.split('=')));
    const payload = `${parts.ts}:${req.body.toString()}`;
    const expected = crypto.createHmac('sha256', paddleSecret).update(payload).digest('hex');
    if (expected !== parts.h1) return res.status(401).send('Bad signature');
  }

  let event;
  try { event = JSON.parse(req.body.toString()); }
  catch(e) { return res.status(400).send('Bad JSON'); }

  const type = event.event_type || event.alert_name;
  console.log('Paddle event:', type);

  // Map Paddle price IDs → plans
  const PRICE_MAP = {
    [process.env.PADDLE_PRICE_STARTER]: 'starter',
    [process.env.PADDLE_PRICE_PRO]:     'pro',
    [process.env.PADDLE_PRICE_AGENCY]:  'agency',
  };

  if (type === 'subscription.created' || type === 'subscription.activated' || type === 'transaction.completed') {
    const data   = event.data || event;
    const email  = data.customer?.email || data.email;
    const priceId= data.items?.[0]?.price?.id || data.subscription_plan_id;
    const plan   = PRICE_MAP[priceId] || 'starter';
    const subId  = data.id || data.subscription_id;

    if (!email) { console.error('No email in webhook'); return res.sendStatus(200); }

    const u = getOrCreateUser(email);
    u.plan  = plan;
    u.active = true;
    u.subId  = subId;
    u.used   = 0; // reset on new subscription
    u.billingMonth = currentMonth();

    const key = generateKey(email);
    console.log(`Subscribed: ${email} | Plan: ${plan} | Key: ${key}`);
    await sendWelcomeEmail(email, key, plan);
  }

  // Monthly renewal — reset usage
  if (type === 'subscription.renewed' || type === 'transaction.completed') {
    const data  = event.data || event;
    const email = data.customer?.email;
    if (email && users.has(email)) {
      const u = users.get(email);
      u.used = 0;
      u.billingMonth = currentMonth();
      console.log(`Renewed + reset: ${email}`);
    }
  }

  if (type === 'subscription.canceled' || type === 'subscription.paused') {
    const email = event.data?.customer?.email;
    if (email && users.has(email)) {
      const u = users.get(email);
      u.plan   = 'free';
      u.active = false;
      u.subId  = null;
      console.log(`Cancelled: ${email}`);
    }
  }

  res.sendStatus(200);
});

// Admin endpoints
app.post('/admin/grant', (req, res) => {
  if (req.headers['x-admin-secret'] !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const { email, plan = 'pro' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const u = getOrCreateUser(email);
  u.plan = plan; u.active = true; u.used = 0; u.billingMonth = currentMonth();
  const key = generateKey(email);
  res.json({ key, email, plan, status: getUserStatus(email) });
});

app.get('/admin/users', (req, res) => {
  if (req.headers['x-admin-secret'] !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const list = Array.from(users.entries()).map(([email, u]) => ({ email, key: generateKey(email), ...u }));
  res.json({ count: list.length, users: list });
});

app.listen(PORT, () => console.log(`PropWise v5 on port ${PORT}`));