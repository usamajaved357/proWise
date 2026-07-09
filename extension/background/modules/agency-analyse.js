// ── Agency Job Analysis — background module ─────────────────────────────────
// Mirrors extension/background/modules/analyse.js's handleAnalyse, but loads
// agency data (registeredAgencies + agencyFull_<slug>) instead of a
// freelancer profile, and posts to /agency-analyse instead of /analyse.
// No "primary agency" concept exists yet — PLAN_AGENCY_PROFILE_LIMITS caps
// every plan at 0 or 1 registered agency today, so the first registered
// agency with real cached data is equivalent to a primary-profile pick.
const SERVER = 'http://localhost:3000'; // Local Host

export async function handleAgencyAnalyse(payload) {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(['userEmail', 'anonId']),
    chrome.storage.local.get(['registeredAgencies'])
  ]);

  const regAgencies = localData.registeredAgencies || [];
  const agencyMeta = regAgencies.find(a => a && a.slug) || regAgencies[0];

  let agencyFull = null;
  if (agencyMeta?.slug) {
    const lk = 'agencyFull_' + agencyMeta.slug;
    const stored = await new Promise(r => chrome.storage.local.get([lk], r));
    agencyFull = stored[lk] || null;
  }

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
      email:   syncData.userEmail || null,
      anonId:  syncData.anonId   || null,
    })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Analysis failed');
  }

  return data.analysis;
}
