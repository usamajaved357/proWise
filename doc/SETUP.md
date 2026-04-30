# Snag AI — Complete Setup & Architecture Guide

## How Everything Connects

```
User installs extension
       ↓
Enters email → stored in Chrome sync storage
       ↓
Clicks Write Proposal on Upwork job page
       ↓
content.js reads job data from the page
       ↓
background.js sends POST /proposal to Render server
       ↓
Server checks Supabase → is this email/anonId allowed to generate?
       ↓
If yes → calls Anthropic Claude API → returns proposal JSON
       ↓
Server records usage in Supabase → returns proposal to extension
       ↓
content.js renders proposal in overlay panel on Upwork

─────────────────────────────────────────────────────────────
SUBSCRIPTION FLOW
─────────────────────────────────────────────────────────────

User hits limit (2 free or monthly cap)
       ↓
Extension shows paywall
       ↓
User clicks Subscribe → opens snagai.netlify.app/checkout.html?plan=pro
       ↓
checkout.html loads Paddle.js → auto-opens Paddle overlay checkout
       ↓
User pays → Paddle fires webhook to server
       ↓
Server calls Paddle API to get customer email (customer_id → email)
       ↓
Server does PATCH on Supabase users table → plan updated
       ↓
Server sends welcome email via Resend
       ↓
User opens extension → enters same email → status call returns new plan
       ↓
Plan unlocked, proposals available
```

---

## Render (Server)

**URL:** https://prowise-4e5t.onrender.com
**Repo connection:** github.com/usamajaved357/proWise → root dir: `server`
**Auto-deploy:** GitHub webhook → Render deploy hook (added in repo Settings → Webhooks)

**Environment variables:**
```
ANTHROPIC_API_KEY       = sk-ant-...
LICENSE_SECRET          = propwise2026
PORT                    = 3000
SUPABASE_URL            = https://cbtkyhjijnvjzhqghrrm.supabase.co
SUPABASE_KEY            = service_role secret (from Supabase → Settings → API)
PADDLE_ENVIRONMENT      = sandbox (change to production when live)
PADDLE_API_KEY          = sandbox/live API key
PADDLE_WEBHOOK_SECRET   = pdl_ntfset_... (from Paddle → Notifications → webhook)
PADDLE_PRICE_STARTER    = pri_01kqatq4f1st85p5q2xgx792qj
PADDLE_PRICE_PRO        = pri_01kqats15v2v1kcx355gw24s5j
PADDLE_PRICE_AGENCY     = pri_01kqatwfp1fr3ch8xq32qpmdnt
RESEND_API_KEY          = re_... (from resend.com)
```

**Key server endpoints:**
```
GET  /                    → health check
POST /status              → returns user plan + usage (called on extension open)
POST /proposal            → generates proposal (main endpoint)
POST /webhook/paddle      → receives Paddle payment events
POST /activate            → manual plan grant (admin/support use)
GET  /admin/users         → list all users (requires x-admin-secret header)
POST /admin/grant         → manually grant a plan (requires x-admin-secret header)
```

---

## Supabase (Database)

**Project URL:** https://cbtkyhjijnvjzhqghrrm.supabase.co
**Dashboard:** supabase.com → project: snagai

**Tables:**
```sql
-- Registered users (have email)
users (
  email TEXT PRIMARY KEY,
  plan TEXT DEFAULT 'free',       -- free/starter/pro/agency
  used INT DEFAULT 0,             -- proposals used this month
  billing_month TEXT DEFAULT '',  -- format: 2026-04
  active BOOLEAN DEFAULT true,
  sub_id TEXT DEFAULT '',         -- Paddle subscription ID
  created_at TIMESTAMP
)

-- Anonymous users (no email, tracked by random ID)
anon_users (
  anon_id TEXT PRIMARY KEY,
  used INT DEFAULT 0,
  created_at TIMESTAMP
)
```

**Usage logic:**
- Free users get 2 proposals tracked by `anonId` in `anon_users`
- Paid users tracked by email in `users`
- `billing_month` resets `used` to 0 each new month automatically

---

## Netlify (Landing Page)

**URL:** https://snagai.netlify.app
**Repo connection:** github.com/usamajaved357/proWise
**Build settings:** Base dir: `landing` / Publish dir: `landing`
**Auto-deploys:** every push to `main`

**Pages:**
```
index.html      → main landing page
checkout.html   → Paddle overlay checkout (opened by extension)
terms.html      → Terms of Service
privacy.html    → Privacy Policy
refund.html     → Refund Policy
```

**Checkout flow:**
- Extension opens `checkout.html?plan=pro`
- Page reads `?plan=` param
- Loads Paddle.js → auto-opens overlay after 800ms
- On success → redirects to `index.html?subscribed=true`
- On close → redirects to `index.html#pricing`

---

## Paddle (Payments)

**Sandbox dashboard:** sandbox-vendors.paddle.com
**Live dashboard:** vendors.paddle.com

**Sandbox price IDs:**
```
Starter $19: pri_01kqatq4f1st85p5q2xgx792qj
Pro     $39: pri_01kqats15v2v1kcx355gw24s5j
Agency  $69: pri_01kqatwfp1fr3ch8xq32qpmdnt
```

**Webhook setup:**
- URL: https://prowise-4e5t.onrender.com/webhook/paddle
- Events: transaction.completed, subscription.activated, subscription.created,
          subscription.canceled, subscription.paused, subscription.renewed
- Secret: copy from Paddle → add to Render as PADDLE_WEBHOOK_SECRET

**Paddle.js client token (sandbox):** test_774f670464415caafd3f6b20160

**How webhook activates a plan:**
1. Paddle sends webhook with customer_id (no email)
2. Server calls Paddle API: GET /customers/{customer_id}
3. Gets customer email
4. Checks if user exists in Supabase → PATCH or INSERT
5. Updates plan + resets used count
6. Sends welcome email via Resend

---

## Resend (Emails)

**Setup:** resend.com → create API key → add to Render as RESEND_API_KEY
**From address:** currently `noreply@snagai.io` (update when domain is live)
**Triggered:** automatically after successful Paddle subscription

---

## Extension

**Folder:** `extension/`
**Files:**
```
manifest.json         → permissions, version, CSP
background/           → service worker, handles API calls
content/              → injected into Upwork pages (button + proposal panel)
popup/                → minimal status popup (plan, usage, email)
options/              → full settings page (profile, settings, subscription)
icons/                → extension icons
```

**Extension → Server communication:**
- All API calls go through `background.js` (service worker)
- `content.js` sends messages to `background.js` via `chrome.runtime.sendMessage`
- `background.js` makes fetch calls to Render server
- Profile data stored in `chrome.storage.sync` (local, syncs across Chrome devices)

---

## Going Live Checklist

### Paddle
- [ ] Create 3 products in LIVE Paddle dashboard
- [ ] Copy live price IDs → update Render env vars
- [ ] Create live webhook → copy secret → update PADDLE_WEBHOOK_SECRET
- [ ] Remove `Paddle.Environment.set('sandbox')` from checkout.html
- [ ] Update Paddle.js token to live client-side token in checkout.html
- [ ] Update PADDLE_ENVIRONMENT=production in Render
- [ ] Update PADDLE_API_KEY to live key in Render

### Domain
- [ ] Buy snagai.io or snagai.net
- [ ] Connect to Netlify → Custom domains
- [ ] Update all URLs in extension files (background.js, popup.js, content.js, options.js)
- [ ] Update server.js welcome email `from` address
- [ ] Push + redeploy

### Resend
- [ ] Verify custom domain in Resend
- [ ] Update from address in server.js

### Chrome Web Store
- [ ] Zip extension/ folder
- [ ] Go to chrome.google.com/webstore/devconsole
- [ ] Pay $5 one-time developer fee
- [ ] Upload zip → add screenshots (1280x800), description, privacy policy URL
- [ ] Submit → wait 1-3 business days for review

### Paddle Support Email
- [ ] Email sellers@paddle.com to update branding (company name, URLs, legal pages)

---

## Useful Commands

**Check server health:**
```
https://prowise-4e5t.onrender.com
```

**Manually grant a plan (support use):**
```bash
curl -X POST https://prowise-4e5t.onrender.com/activate \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","plan":"pro","secret":"propwise2026"}'
```

**View all users (admin):**
```bash
curl https://prowise-4e5t.onrender.com/admin/users \
  -H "x-admin-secret: propwise2026"
```
