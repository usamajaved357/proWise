// ── Profile Audit — background module ──────────────────────────────────────

const SERVER = 'http://localhost:3000'; // Local Host
// const SERVER = 'https://prowise-4e5t.onrender.com'; // Production

export async function handleProfileAudit(msg) {
  const profile = msg.profile || {};

  const res = await fetch(SERVER + '/profile-audit', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ profile }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Profile audit failed');
  }

  return data.audit;
}
