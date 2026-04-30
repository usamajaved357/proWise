# ProWise

## Repo Structure

```
proWise/
├── server/server.js     → Node.js backend (Render)
├── extension/           → Chrome extension (load unpacked)
│   ├── manifest.json
│   ├── background/
│   ├── content/
│   ├── popup/
│   ├── options/
│   └── icons/
├── landing/             → Website (Netlify)
│   ├── index.html
│   ├── checkout.html
│   ├── terms.html
│   ├── privacy.html
│   └── refund.html
└── README.md
```

---

## Render (Server)

- Connect repo → root dir: `server`
- Branch: `main` → auto-deploys on every push
- GitHub webhook: repo Settings → Webhooks → add Render deploy hook URL

**Environment variables:**
```
ANTHROPIC_API_KEY       = sk-ant-...
LICENSE_SECRET          = your-secret
PORT                    = 3000
SUPABASE_URL            = https://xxxx.supabase.co
SUPABASE_KEY            = service_role secret key
PADDLE_ENVIRONMENT      = sandbox → production (when live)
PADDLE_API_KEY          = sandbox/live API key
PADDLE_WEBHOOK_SECRET   = from Paddle → Notifications → your webhook
PADDLE_PRICE_STARTER    = pri_...
PADDLE_PRICE_PRO        = pri_...
PADDLE_PRICE_AGENCY     = pri_...
RESEND_API_KEY          = re_... (from resend.com)
```

---

## Netlify (Landing)

- Connect repo → base dir: `landing` → publish dir: `landing`
- Auto-deploys on push to `main`
- All pages live under `snagai.netlify.app/`

---

## Supabase (Database)

- Project URL in Render as `SUPABASE_URL`
- Use `service_role` secret key as `SUPABASE_KEY`
- Two tables — create via SQL Editor:

```sql
CREATE TABLE users (
  email TEXT PRIMARY KEY,
  plan TEXT DEFAULT 'free',
  used INT DEFAULT 0,
  billing_month TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  sub_id TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE anon_users (
  anon_id TEXT PRIMARY KEY,
  used INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Paddle (Payments)

**Sandbox → Live checklist:**

1. Create 3 products in live dashboard (same as sandbox)
2. Copy live price IDs → update Render env vars
3. Create webhook in live dashboard → same URL → copy new secret → update `PADDLE_WEBHOOK_SECRET`
4. In `landing/checkout.html` and `landing/index.html`:
   - Remove: `Paddle.Environment.set('sandbox');`
   - Change token to live client-side token
5. Update `PADDLE_ENVIRONMENT` in Render to `production`
6. Update `PADDLE_API_KEY` to live API key

**Webhook URL:** `https://your-render-url.onrender.com/webhook/paddle`

**Events to subscribe:** `transaction.completed`, `subscription.activated`, `subscription.created`, `subscription.canceled`, `subscription.paused`, `subscription.renewed`

---

## Resend (Emails)

- Sign up at resend.com → create API key → add to Render as `RESEND_API_KEY`
- Welcome email fires automatically after successful subscription
- Update sender address in `server.js` when custom domain is ready

---

## Chrome Web Store (Extension)

1. Zip the `extension/` folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Pay one-time $5 developer fee
4. Upload zip → fill in description, screenshots, privacy policy URL
5. Submit for review (1–3 business days)

---

## Going Live Checklist

- [ ] Buy domain and connect to Netlify
- [ ] Set up Resend with custom domain email
- [ ] Create live Paddle products + update all env vars
- [ ] Switch Paddle.js to live token in checkout.html
- [ ] Submit extension to Chrome Web Store
- [ ] Update server `from` email address in server.js
- [ ] Send Paddle support email to update branding + legal URLs
