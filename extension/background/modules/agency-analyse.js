// ── Agency Job Analysis — background module ─────────────────────────────────
// Mirrors extension/background/modules/analyse.js's freelancer logic, but
// posts to /agency-analyse with the agency data shape instead. Resolution of
// "which profile is primary" happens once, upstream, in analyse.js via
// resolvePrimaryEntity() — this function just takes the already-resolved
// agencyFull data and does the actual request.
import { syncUsageToStorage } from './sync-usage.js';

const SERVER = 'http://localhost:3000'; // Local Host

export async function handleAgencyAnalyse(payload, agencyFull) {
  const { userEmail, anonId } = await chrome.storage.sync.get(['userEmail', 'anonId']);

  if (!agencyFull) {
    throw new Error('No agency profile data found. Open your registered agency profile page once to sync it, then try again.');
  }

  const res = await fetch(SERVER + '/agency-analyse', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      job:     payload.jobData || {},
      agency:  agencyFull,
      filters: payload.filters || {},
      email:   userEmail || null,
      anonId:  anonId   || null,
    })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Analysis failed');
  }
  await syncUsageToStorage(data.usage);

  return data.analysis;
}
