# PropWise — Upwork AI Proposal Writer

One repo, three parts:

```
propwise/
├── server/          ← Node.js backend (deploy to Render)
│   └── server.js
├── extension/       ← Chrome extension
│   ├── manifest.json
│   ├── background/
│   ├── content/
│   ├── popup/
│   └── icons/
├── landing/         ← Landing page (deploy to GitHub Pages / Netlify)
│   └── index.html
└── README.md
```

## Deploy

**Server** → Render.com (connect this repo, root dir: `server`)
**Landing** → Netlify (connect this repo, root dir: `landing`)
**Extension** → Load unpacked from `extension/` folder in Chrome

## Environment variables (Render)

```
ANTHROPIC_API_KEY=sk-ant-...
LICENSE_SECRET=your-secret
RESEND_API_KEY=re_...        (from resend.com — free email sending)
PADDLE_WEBHOOK_SECRET=...    (from Paddle dashboard)
PADDLE_PRICE_STARTER=pri_... (Paddle price ID for $19 plan)
PADDLE_PRICE_PRO=pri_...     (Paddle price ID for $39 plan)
PADDLE_PRICE_AGENCY=pri_...  (Paddle price ID for $69 plan)
```
