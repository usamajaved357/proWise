// ── Status check ──────────────────────────────────────────────────────────────
const SERVER = 'https://prowise-4e5t.onrender.com';

export async function getStatus() {
  const { userEmail, anonId } = await chrome.storage.sync.get(['userEmail', 'anonId']);
  const res = await fetch(SERVER + '/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail || null, anonId: anonId || null })
  });
  return res.json();
}
