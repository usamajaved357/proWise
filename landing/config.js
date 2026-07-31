// ── Shared config for all landing pages ─────────────────────────────────────
// Flip this ONE flag to switch every landing page (index.html, write-review.html)
// between local dev and production. Nothing else needs editing.
const SNAG_IS_LIVE = false;
const SNAG_API_URL = SNAG_IS_LIVE ? 'https://api.snagai.pro' : 'http://localhost:3000';
