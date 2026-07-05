// ── Agency Audit — background module ────────────────────────────────────────

const SERVER = 'http://localhost:3000'; // Local Host
// const SERVER = 'https://prowise-4e5t.onrender.com'; // Production

export async function handleAgencyAudit(msg) {
  const agency = msg.agency || {};

  const res = await fetch(SERVER + '/agency-audit', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ agency }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Agency audit failed');
  }

  return data.audit;
}
