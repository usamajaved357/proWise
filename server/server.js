// Snag AI Server v7 — Supabase persistent storage
const express = require('express');
const { SYSTEM, buildUserMessage, processBold } = require('./prompt');
const https   = require('https');
const crypto  = require('crypto');

const app    = express();
const PORT   = process.env.PORT || 3000;
const SECRET = process.env.LICENSE_SECRET || 'dev-secret';

// ── Supabase client (lightweight, no SDK needed) ──────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function supabase(method, table, body = null, filters = '') {
  return new Promise((resolve, reject) => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return reject(new Error('Supabase not configured'));
    }
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}${filters}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': filters.includes('on_conflict')
          ? 'return=representation,resolution=merge-duplicates'
          : 'return=representation'
      }
    };
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d || '[]')); }
        catch(e) { resolve([]); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// DB helpers
async function getUser(email) {
  const rows = await supabase('GET', 'users', null, `?email=eq.${encodeURIComponent(email)}&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function upsertUser(email, data) {
  return supabase('POST', 'users', { email, ...data }, '?on_conflict=email');
}

async function updateUser(email, data) {
  return supabase('PATCH', 'users', data, `?email=eq.${encodeURIComponent(email)}`);
}

async function getAnon(anonId) {
  const rows = await supabase('GET', 'anon_users', null, `?anon_id=eq.${encodeURIComponent(anonId)}&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function upsertAnon(anonId, data) {
  return supabase('POST', 'anon_users', { anon_id: anonId, ...data }, '?on_conflict=anon_id');
}

// ── Plan config ───────────────────────────────────────────────────────────────
const PLANS = {
  free:    { limit: 2 },
  starter: { limit: 150 },
  pro:     { limit: 400 },
  agency:  { limit: 900 },
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

async function getUserStatus(email) {
  const u = await getUser(email);
  if (!u) return { plan: 'free', limit: 2, used: 0, remaining: 2 };

  const plan  = u.plan || 'free';
  const limit = PLANS[plan]?.limit ?? 2;

  // Reset usage if new billing month
  let used = u.used || 0;
  if (u.billing_month !== currentMonth()) {
    used = 0;
    await updateUser(email, { used: 0, billing_month: currentMonth() });
  }

  return { plan, limit, used, remaining: Math.max(0, limit - used) };
}

async function canGenerate(email) {
  const status = await getUserStatus(email);
  return status.remaining > 0;
}

async function recordUsage(email) {
  const u = await getUser(email);
  const used = (u?.billing_month === currentMonth() ? u.used || 0 : 0) + 1;
  if (u) {
    await updateUser(email, { used, billing_month: currentMonth() });
  } else {
    await upsertUser(email, { plan: 'free', used, billing_month: currentMonth(), active: true });
  }
}

async function canAnonGenerate(anonId) {
  const u = await getAnon(anonId);
  return !u || (u.used || 0) < 2;
}

async function recordAnonUsage(anonId) {
  const u = await getAnon(anonId);
  const used = (u?.used || 0) + 1;
  await upsertAnon(anonId, { used });
}

// ── Middleware ────────────────────────────────────────────────────────────────
// CORS — works with Chrome extensions and browsers
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

// ── Email via Resend ──────────────────────────────────────────────────────────
function sendWelcomeEmail(to, plan) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.log(`[EMAIL SKIP] To:${to} Plan:${plan}`); return Promise.resolve(); }
  const planLabel = { starter:'Starter', pro:'Pro', agency:'Agency' }[plan] || plan;
  const limit = PLANS[plan]?.limit || 0;
  const body = JSON.stringify({
    from: 'Snag AI <noreply@snagai.io>',
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

// ── Claude API ────────────────────────────────────────────────────────────────
function callClaude(system, user) {
  return new Promise((resolve, reject) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return reject(new Error('ANTHROPIC_API_KEY not set'));
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
          const rawText = p.content?.[0]?.text || '';
          console.log('Claude raw (first 200):', rawText.slice(0, 200));

          // Strip markdown code fences
          let jsonText = rawText
            .replace(/^```(?:json)?[\r\n]*/i, '')
            .replace(/[\r\n]*```\s*$/i, '')
            .trim();

          // Find JSON object boundaries
          const start = jsonText.indexOf('{');
          const end   = jsonText.lastIndexOf('}');
          if (start === -1 || end === -1) return reject(new Error('No JSON found in response'));
          jsonText = jsonText.slice(start, end + 1);

          // Fix unescaped control chars inside JSON strings using state machine
          // This correctly handles escaped quotes (") within strings
          let fixed = '';
          let inStr = false;
          let escaped = false;
          for (let i = 0; i < jsonText.length; i++) {
            const ch = jsonText[i];
            if (escaped) {
              fixed += ch;
              escaped = false;
            } else if (ch === '\\') {
              fixed += ch;
              escaped = true;
            } else if (ch === '"') {
              fixed += ch;
              inStr = !inStr;
            } else if (inStr) {
              // Inside a string — escape any raw control characters
              if (ch === '\n')      fixed += '\\n';
              else if (ch === '\r') fixed += '\\r';
              else if (ch === '\t') fixed += '\\t';
              else if (ch.charCodeAt(0) < 32) fixed += '';
              else fixed += ch;
            } else {
              fixed += ch;
            }
          }

          let parsed;
          try {
            parsed = JSON.parse(fixed);
          } catch(e) {
            console.error('Parse failed, sample:', fixed.slice(0, 400));
            return reject(new Error('Parse error: ' + e.message));
          }
          resolve(parsed);
        } catch(e) { reject(new Error('Parse error: ' + e.message)); }
      });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}


// ── Extract client name using AI ─────────────────────────────────────────────
function extractClientName(reviewText, description) {
  if (!reviewText && !description) return Promise.resolve('');
  return new Promise((resolve) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return resolve('');

    const textToSearch = [
      reviewText ? 'CLIENT HISTORY/REVIEWS:\n' + reviewText.slice(0, 800) : '',
      description ? 'JOB DESCRIPTION:\n' + description.slice(0, 300) : ''
    ].filter(Boolean).join('\n\n');

    const prompt = `Extract the client's first name from this text.

Upwork labels each review with "To client: FirstName LastName" — this is the most reliable source.
The text may look like: "TO CLIENT LABELS: John Doe, John Doe, John Doe"

Text:
${textToSearch}

Rules:
- If you see "TO CLIENT LABELS:" — use that first name, it is 100% the client
- Return ONLY the first name (one word, e.g. "John" not "John Doe")
- If no name found, reply: none`;

    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 15,
      messages: [{ role: 'user', content: prompt }]
    });

    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(d);
          const name = (p.content?.[0]?.text || '').trim();
          console.log('Name extraction result:', name);
          if (name && name.toLowerCase() !== 'none' && /^[A-Z][a-z]{1,20}$/.test(name)) {
            resolve(name);
          } else {
            resolve('');
          }
        } catch(e) { resolve(''); }
      });
    });
    req.on('error', () => resolve(''));
    req.write(body); req.end();
  });
}

// ── Fetch customer email from Paddle API ─────────────────────────────────────
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

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.json({ status: 'ok', service: 'Snag AI API v7' }));

// Status — called by extension on load
app.post('/status', async (req, res) => {
  try {
    const { email, anonId } = req.body;
    if (email && email.includes('@') && !email.includes('propwise.local')) {
      const status = await getUserStatus(email);
      return res.json(status);
    }
    if (anonId) {
      const u = await getAnon(anonId);
      const used = u?.used || 0;
      return res.json({ plan: 'free', limit: 2, used, remaining: Math.max(0, 2 - used) });
    }
    res.json({ plan: 'free', limit: 2, used: 0, remaining: 2 });
  } catch(e) {
    console.error('Status error:', e.message);
    res.json({ plan: 'free', limit: 2, used: 0, remaining: 2 });
  }
});

// Generate proposal
app.post('/proposal', async (req, res) => {
  const { job, profile, settings, email: userEmail, anonId } = req.body;

  if (!job?.title && !job?.description) {
    return res.status(400).json({ error: 'Could not read job from page.' });
  }

  const isRealEmail = userEmail && userEmail.includes('@') && !userEmail.includes('propwise.local');

  // Require either email or anonId — no anonymous unlimited access
  if (!isRealEmail && !anonId) {
    return res.status(402).json({
      error: 'Add your email in the extension to track your free proposals.',
      showPaywall: false,
      plan: 'free', limit: 2, used: 0, remaining: 2
    });
  }

  try {
    // Check usage limits — ALWAYS enforced
    if (isRealEmail) {
      const ok = await canGenerate(userEmail);
      if (!ok) {
        const status = await getUserStatus(userEmail);
        console.log(`Limit reached: ${userEmail} | plan: ${status.plan} | used: ${status.used}/${status.limit}`);
        return res.status(402).json({
          error: status.plan === 'free'
            ? 'You\'ve used your 2 free proposals. Subscribe to keep winning jobs.'
            : `You\'ve used all ${status.limit} proposals this month. Resets on the 1st.`,
          showPaywall: true,
          ...status
        });
      }
    } else if (anonId) {
      const ok = await canAnonGenerate(anonId);
      if (!ok) {
        console.log(`Anon limit reached: ${anonId}`);
        return res.status(402).json({
          error: 'You\'ve used your 2 free proposals. Subscribe to keep winning jobs.',
          showPaywall: true,
          plan: 'free', limit: 2, used: 2, remaining: 0
        });
      }
    }

    // Extract client name using separate AI call (fast, focused)
    if (!job.clientName) {
      job.clientName = await extractClientName(job.reviewText || '', job.description || '');
      console.log('Client name extracted:', job.clientName || 'not found');
    }

    // Build message using prompt.js
    const userMsg = buildUserMessage({ job, profile, settings });
    const result  = await callClaude(SYSTEM, userMsg);

    // Convert **bold** markers to Unicode bold (Upwork-compatible)
    if (result.letter) result.letter = processBold(result.letter);
    if (result.questions) result.questions = processBold(result.questions);

    // Insert portfolio links before CTA/sign-off, not at the end
    if (result.portfolioLinks && result.portfolioLinks.length > 0) {
      const validLinks = result.portfolioLinks.filter(p => p.url);
      if (validLinks.length > 0) {
        const portSection = processBold(
          '\n\n**Portfolio:**\n' + validLinks.map(p => `- **${p.name}**: ${p.url}`).join('\n')
        );
        // Insert before "Regards" sign-off
        const regardsIdx = result.letter.lastIndexOf('Regards');
        if (regardsIdx > -1) {
          result.letter = result.letter.slice(0, regardsIdx).trimEnd() +
            portSection + '\n\n' + result.letter.slice(regardsIdx);
        } else {
          result.letter = result.letter + portSection;
        }
      }
    }

    // Record usage
    if (isRealEmail) {
      await recordUsage(userEmail);
      const status = await getUserStatus(userEmail);
      // Send low credits warning at 10 remaining
      if (status.remaining === 10 && status.plan !== 'free') {
        sendWelcomeEmail(userEmail, status.plan).catch(() => {});
      }
      return res.json({ success: true, ...result, usage: status });
    } else if (anonId) {
      await recordAnonUsage(anonId);
      const u = await getAnon(anonId);
      const used = u?.used || 1;
      return res.json({ success: true, ...result, usage: { plan: 'free', used, limit: 2, remaining: Math.max(0, 2 - used) } });
    }

    res.json({ success: true, ...result });

  } catch(err) {
    console.error('Proposal error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Paddle webhook ────────────────────────────────────────────────────────────
app.post('/webhook/paddle', async (req, res) => {
  // Body parsed by express.json middleware
  const event = req.body;
  if (!event || typeof event !== 'object') {
    return res.status(400).send('Bad JSON');
  }

  const type = event.event_type || event.alert_name;
  console.log('Paddle event:', type);

  const PRICE_MAP = {
    [process.env.PADDLE_PRICE_STARTER]: 'starter',
    [process.env.PADDLE_PRICE_PRO]:     'pro',
    [process.env.PADDLE_PRICE_AGENCY]:  'agency',
  };

  if (['subscription.created','subscription.activated','transaction.completed'].includes(type)) {
    const data    = event.data || event;
    let email     = data.customer?.email || data.email;
    const priceId = data.items?.[0]?.price?.id || data.subscription_plan_id;
    // Also try custom_data on the price for plan
    const planFromCustomData = data.items?.[0]?.price?.custom_data?.plan;
    const plan    = planFromCustomData || PRICE_MAP[priceId] || 'starter';
    const subId   = data.subscription_id || data.id;
    const custId  = data.customer_id;

    // No email in transaction.completed — fetch from Paddle API
    if (!email && custId && process.env.PADDLE_API_KEY) {
      try {
        const custData = await getPaddleCustomer(custId);
        email = custData?.email;
      } catch(e) {
        console.error('Failed to fetch customer:', e.message);
      }
    }

    if (!email) {
      console.error('No email found for customer_id:', custId);
      return res.sendStatus(200);
    }

    const existingUser = await getUser(email);
    if (existingUser) {
      await updateUser(email, { plan, active: true, sub_id: subId, billing_month: currentMonth() });
    } else {
      await upsertUser(email, { plan, active: true, sub_id: subId, used: 0, billing_month: currentMonth() });
    }
    console.log('DB updated:', email, '→', plan);
    await sendWelcomeEmail(email, plan);
  }

  if (type === 'subscription.renewed') {
    const email = event.data?.customer?.email;
    if (email) {
      await updateUser(email, { used: 0, billing_month: currentMonth() });
      console.log(`Renewed + reset: ${email}`);
    }
  }

  if (['subscription.canceled','subscription.paused'].includes(type)) {
    const email = event.data?.customer?.email;
    if (email) {
      await updateUser(email, { plan: 'free', active: false, sub_id: '' });
      console.log(`Cancelled: ${email}`);
    }
  }

  res.sendStatus(200);
});

// Manual activate — for testing without Paddle
app.post('/activate', async (req, res) => {
  const { email, plan = 'agency', secret } = req.body;
  if (secret !== SECRET) return res.status(401).json({ error: 'Unauthorized' });
  if (!email) return res.status(400).json({ error: 'Email required' });
  
  const existing = await getUser(email);
  if (existing) {
    // User exists — use PATCH to update
    await updateUser(email, { plan, active: true, sub_id: 'manual', billing_month: currentMonth() });
    console.log('Updated existing user:', email, '→', plan);
  } else {
    // New user — insert
    await upsertUser(email, { plan, active: true, used: 0, billing_month: currentMonth() });
    console.log('Created new user:', email, '→', plan);
  }
  
  // Small delay to ensure DB write completes
  await new Promise(r => setTimeout(r, 300));
  const status = await getUserStatus(email);
  console.log('Status after activate:', status);
  res.json({ ok: true, email, plan, status });
});

// Admin
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

app.listen(PORT, () => console.log(`Snag AI v7 on port ${PORT}`));
