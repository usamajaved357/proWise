// ── Shared constants ──────────────────────────────────────────────────────────
// export const SERVER_URL   = 'https://prowise-4e5t.onrender.com'; // Production 
export const SERVER_URL = 'http://localhost:3000'; // Local Host 
export const PLAN_LIMITS  = { free: 1, starter: 1, pro: 3, agency: 5 };
export const PLAN_LABELS  = { free: 'Free', starter: 'Starter', pro: 'Pro', agency: 'Agency' };
export const PLAN_QUOTAS  = { free: 2, starter: 150, pro: 400, agency: 900 };
// Slots for registering an Upwork AGENCY-type profile for audit — unrelated
// to the "agency" plan name above (that's the existing tier for managing
// multiple freelancer profiles). Provisional numbers pending the real
// agency-audit pricing decision — easy to change here once that's finalized.
export const PLAN_AGENCY_PROFILE_LIMITS = { free: 0, starter: 0, pro: 1, agency: 1 };
export const SKILLS_SHOW  = 8;
