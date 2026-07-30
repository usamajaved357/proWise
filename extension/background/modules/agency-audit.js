// ── Agency Audit — background module ────────────────────────────────────────

import { SERVER_URL as SERVER } from '../../options/modules/config.js';

export async function handleAgencyAudit(msg) {
  const agency = msg.agency || {};
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);

  const res = await fetch(SERVER + '/agency-audit', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ agency, email: userEmail || null }),
  });

  const data = await res.json();
  if (res.status === 402 || data.showPaywall) return { showPaywall: true, error: data.error, usage: data };
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Agency audit failed');
  }

  return data.audit;
}
