// ── Profile Audit — background module ──────────────────────────────────────

import { SERVER_URL as SERVER } from '../../options/modules/config.js';

export async function handleProfileAudit(msg) {
  const profile = msg.profile || {};
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);

  const res = await fetch(SERVER + '/profile-audit', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ profile, email: userEmail || null }),
  });

  const data = await res.json();
  if (res.status === 402 || data.showPaywall) return { showPaywall: true, error: data.error, usage: data };
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Profile audit failed');
  }

  return data.audit;
}
