// PropWise Server v5
// - 2 free proposals for every new user (no payment needed)
// - Monthly subscription packages: Starter $19/150, Pro $39/400, Agency $69/900
// - Auto-resets usage on new billing month
// - Paddle webhook handles subscription events
// - Resend.com sends license emails

// Snag AI Server v7 — Supabase persistent storage
'use strict';
const express = require('express');
const https   = require('https');

const app    = express();
const PORT   = process.env.PORT || 3000;
const SECRET = process.env.LICENSE_SECRET || 'changeme';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const PADDLE_PRICE_STARTER = process.env.PADDLE_PRICE_STARTER;
const PADDLE_PRICE_PRO     = process.env.PADDLE_PRICE_PRO;
const PADDLE_PRICE_AGENCY  = process.env.PADDLE_PRICE_AGENCY;

const PRICE_MAP = {
  [PADDLE_PRICE_STARTER]: 'starter',
  [PADDLE_PRICE_PRO]:     'pro',
  [PADDLE_PRICE_AGENCY]:  'agency',
};

const LIMITS = { free: 2, starter: 150, pro: 400, agency: 900 };

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Supabase HTTP helper ────────────────────────────────────────────────────
function supabase(method, table, body, query = '') {
  return new Promise((resolve, reject) => {
    const path = `/rest/v1/${table}${query}`;
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: SUPABASE_URL.replace('https://', ''),
      path,
      method,
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        method === 'POST' ? 'resolution=merge-duplicates,return=representation' : 'return=representation',
      },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(raw ? JSON.parse(raw) : []); }
        catch { resolve([]); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getUser(email) {
  const rows = await supabase('GET', 'users', null, `?email=eq.${encodeURIComponent(email)}&limit=1`);
  return Array.isArray(rows) ? rows[0] : null;
}

async function upsertUser(email, fields) {
  return supabase('POST', 'users', { email, ...fields });
}

async function updateUser(email, fields) {
  return supabase('PATCH', 'users', fields, `?email=eq.${encodeURIComponent(email)}`);
}

async function getAnon(anonId) {
  const rows = await supabase('GET', 'anon_users', null, `?anon_id=eq.${encodeURIComponent(anonId)}&limit=1`);
  return Array.isArray(rows) ? rows[0] : null;
}

async function upsertAnon(anonId, fields) {
  return supabase('POST', 'anon_users', { anon_id: anonId, ...fields });
}

// ─── Resend email helper ─────────────────────────────────────────────────────
function sendWelcomeEmail(email, plan) {
  if (!process.env.RESEND_API_KEY) return;
  const planNames = { starter: 'Starter (150/mo)', pro: 'Pro (400/mo)', agency: 'Agency (900/mo)' };
  const body = JSON.stringify({
    from:    'Snag AI <hello@snagai.io>',
    to:      [email],
    subject: `Welcome to Snag AI ${planNames[plan] || plan}!`,
    html:    `<p>Hi there 👋</p><p>You're now on the <strong>${planNames[plan] || plan}</strong> plan.</p><p>Open the Snag AI extension and start generating winning proposals!</p><p>— The Snag AI Team</p>`,
  });
  const req = https.request({
    hostname: 'api.resend.com', path: '/emails', method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
  });
  req.write(body);
  req.end();
}

// ─── Middleware ──────────────────────────────────────────────────────────────
// Raw body needed for Paddle signature (kept for future, but sig check disabled)
app.use('/webhook/paddle', express.raw({ type: 'application/json' }));
app.use(express.json());

// ─── Health ──────────────────────────────────────────────────────────────────
app.get('/', (_, res) => res.json({ status: 'ok', service: 'Snag AI API v7' }));

// ─── Generate proposal ───────────────────────────────────────────────────────
app.post('/generate', async (req, res) => {
  const { jobText, email, anonId } = req.body;
  if (!jobText) return res.status(400).json({ error: 'jobText required' });

  const month = currentMonth();

  // Resolve user & check limits
  let plan = 'free';
  let used = 0;

  if (email) {
    let user = await getUser(email);
    if (!user) {
      await upsertUser(email, { plan: 'free', used: 0, billing_month: month, active: false });
      user = { plan: 'free', used: 0, billing_month: month };
    }
    // Reset counter on new billing month
    if (user.billing_month !== month) {
      await updateUser(email, { used: 0, billing_month: month });
      user.used = 0;
    }
    plan = user.active ? user.plan : 'free';
    used = user.used || 0;

    const limit = LIMITS[plan] ?? 2;
    if (used >= limit) return res.status(403).json({ error: 'limit_reached', plan });

    // Increment
    await updateUser(email, { used: used + 1 });

  } else if (anonId) {
    let anon = await getAnon(anonId);
    if (!anon) {
      await upsertAnon(anonId, { used: 0 });
      anon = { used: 0 };
    }
    used = anon.used || 0;
    if (used >= 2) return res.status(403).json({ error: 'limit_reached', plan: 'free' });
    await upsertAnon(anonId, { used: used + 1 });
  } else {
    return res.status(400).json({ error: 'email or anonId required' });
  }

  // ── Call Claude ─────────────────────────────────────────────────────────────
  const systemPrompt = `You are Snag AI, an expert Upwork proposal writer. 
Your proposals are 120-160 words, human-sounding, and always start with one of these 7 hooks rotated randomly:
1. PROOF hook — lead with a specific past result
2. RELATABILITY hook — show you understand their exact problem  
3. GUARANTEE hook — bold promise upfront
4. EXTRA VALUE hook — offer something extra for free
5. CALL hook — open with a direct question
6. NUMBERS hook — lead with a specific stat or metric
7. CLIENT-CENTERED hook — make it 100% about them, not you

Rules:
- NEVER start with "I" — always start with the hook
- Only mention skills directly relevant to THIS job
- Detect if fixed price or hourly and match your tone
- End with a clear, low-pressure CTA
- Sound like a smart human freelancer, not AI
- No fluff, no generic claims
- 120-160 words MAX`;

  const userPrompt = `Write a winning Upwork proposal for this job:\n\n${jobText.slice(0, 2000)}`;

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    const proposal = claudeData?.content?.[0]?.text;
    if (!proposal) throw new Error('No proposal returned');

    res.json({ proposal, used: used + 1, limit: LIMITS[plan] ?? 2, plan });
  } catch (err) {
    console.error('Claude error:', err);
    res.status(500).json({ error: 'Generation failed. Try again.' });
  }
});

// ─── Check status ─────────────────────────────────────────────────────────────
app.post('/status', async (req, res) => {
  const { email, anonId } = req.body;
  const month = currentMonth();

  if (email) {
    let user = await getUser(email);
    if (!user) return res.json({ plan: 'free', used: 0, limit: 2 });
    if (user.billing_month !== month) {
      await updateUser(email, { used: 0, billing_month: month });
      user.used = 0;
    }
    const plan  = user.active ? user.plan : 'free';
    const limit = LIMITS[plan] ?? 2;
    return res.json({ plan, used: user.used || 0, limit });
  }

  if (anonId) {
    const anon = await getAnon(anonId);
    return res.json({ plan: 'free', used: anon?.used || 0, limit: 2 });
  }

  res.status(400).json({ error: 'email or anonId required' });
});

// ─── Paddle Webhook (signature verification DISABLED for now) ────────────────
app.post('/webhook/paddle', async (req, res) => {
  let event;
  try {
    const raw = req.body;
    event = typeof raw === 'string' ? JSON.parse(raw) : (Buffer.isBuffer(raw) ? JSON.parse(raw.toString()) : raw);
  } catch {
    console.error('Failed to parse Paddle webhook body');
    return res.sendStatus(400);
  }

  console.log('Paddle webhook received:', event?.event_type || event?.alert_name, JSON.stringify(event).slice(0, 300));

  const type = event?.event_type || event?.alert_name || '';
  const data = event?.data || event || {};

  if (type === 'subscription.activated' || type === 'subscription_payment_succeeded') {
    const email  = data?.customer?.email || data?.email || event?.email;
    const priceId = data?.items?.[0]?.price?.id || data?.subscription_plan_id;
    const plan    = PRICE_MAP[priceId] || 'starter';
    const subId   = data?.id || data?.subscription_id;

    if (!email) { console.error('No email in webhook payload'); return res.sendStatus(200); }

    await upsertUser(email, {
      plan, active: true, sub_id: subId,
      used: 0, billing_month: currentMonth(),
    });
    console.log(`✅ Subscribed: ${email} → ${plan}`);
    sendWelcomeEmail(email, plan);
  }

  if (type === 'subscription.renewed' || type === 'subscription_payment_succeeded') {
    const email = data?.customer?.email || data?.email;
    if (email) {
      await updateUser(email, { used: 0, billing_month: currentMonth() });
      console.log(`🔄 Renewed + reset: ${email}`);
    }
  }

  if (['subscription.canceled', 'subscription.paused', 'subscription_cancelled'].includes(type)) {
    const email = data?.customer?.email || data?.email;
    if (email) {
      await updateUser(email, { plan: 'free', active: false, sub_id: '' });
      console.log(`❌ Cancelled: ${email}`);
    }
  }

  res.sendStatus(200);
});

// ─── Admin ────────────────────────────────────────────────────────────────────
app.post('/admin/grant', async (req, res) => {
  if (req.headers['x-admin-secret'] !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const { email, plan = 'pro' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  await upsertUser(email, { plan, active: true, used: 0, billing_month: currentMonth() });
  res.json({ ok: true, email, plan });
});

app.get('/admin/users', async (req, res) => {
  if (req.headers['x-admin-secret'] !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const users = await supabase('GET', 'users', null, '?order=created_at.desc&limit=100');
  res.json({ count: users.length, users });
});

app.listen(PORT, () => console.log(`🚀 Snag AI v7 running on port ${PORT}`));
