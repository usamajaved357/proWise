// ── Shared constants ──────────────────────────────────────────────────────────
// Flip this ONE flag to switch the entire extension between local dev and
// production. Every background module and the popup import SERVER_URL from
// here — nothing else needs editing.
const SNAG_IS_LIVE = false;
export const SERVER_URL = SNAG_IS_LIVE ? 'https://api.snagai.pro' : 'http://localhost:3000';
// Landing/checkout pages the extension opens or iframes (Subscription page
// checkout modal, "Add to Chrome" links, paywall upgrade tab). Local mode
// expects `cd landing && node build.js && cd publish && python3 -m http.server 8090`.
// Uses snagailocal.test (mapped to 127.0.0.1 in /etc/hosts) instead of
// localhost — Paddle's sandbox approved-domains list rejects bare "localhost".
export const SITE_URL = SNAG_IS_LIVE ? 'https://snagai.pro' : 'http://snagailocal.test:8090';
// NOTE: internal keys (free/starter/pro/agency) are unchanged from the old
// 4-tier design and stay that way — they're wired to real Paddle price IDs
// (PADDLE_PRICE_STARTER etc. in server/routes/webhook.js). Renaming them
// would mean recreating Paddle products. Only the LABEL and the numbers
// changed to match the finalized 3-tier plan: "starter" markets as "Basic".
export const PLAN_LABELS  = { free: 'Free', starter: 'Basic', pro: 'Pro', agency: 'Agency' };
// Combined pool: job audits + proposals + proposal revisions (all $0.01/action,
// share one counter — see server/modules/config.js PLANS for the matching
// server-side source of truth these must stay in sync with).
export const PLAN_QUOTAS  = { free: 2, starter: 150, pro: 400, agency: 700 };
// Separate, much lower quota for profile/agency audits ($0.10/action, ~10x
// pricier, used far less often) — mirrors server-side PLANS[x].auditLimit.
export const PLAN_AUDIT_QUOTAS = { free: 0, starter: 0, pro: 1, agency: 4 };
// ONE combined slot count — a "profile" is either a freelancer profile or an
// agency profile, registered in the same list, no separate freelancer-only
// vs agency-only caps anymore. Basic/Pro get 1 (either type); Agency plan
// gets 2 (room for one of each). Replaces the old PLAN_LIMITS (freelancer)
// + PLAN_AGENCY_PROFILE_LIMITS (agency) split.
export const PLAN_PROFILE_LIMITS = { free: 1, starter: 1, pro: 1, agency: 2 };
export const SKILLS_SHOW  = 8;
