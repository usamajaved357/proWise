# ProWise

Chrome extension + Node.js backend + Netlify landing page.

## Structure

```
├── server/      → Render.com (auto-deploy from main)
├── extension/   → Chrome (load unpacked or Web Store)
├── landing/     → Netlify (auto-deploy from main)
└── README.md
```

## Quick Setup

See `docs/SETUP.md` for full deployment guide.

## Tech Stack

- Server: Node.js / Express / Render
- Database: Supabase (Postgres)
- Payments: Paddle
- Email: Resend
- Landing: Netlify
