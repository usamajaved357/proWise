// ── Job Analysis — background module ───────────────────────────────────────
// Fetches the freelancer profile from storage and calls the /analyse endpoint

// const SERVER = 'https://prowise-4e5t.onrender.com'; // Production
const SERVER = 'http://localhost:3000'; // Local Host

export async function handleAnalyse(payload) {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(['userEmail', 'anonId']),
    chrome.storage.local.get(['registeredProfiles', 'activeProfileId', 'primaryProfileId', 'deviceId'])
  ]);

  // Resolve primary profile
  const regProfiles = localData.registeredProfiles || [];
  const primaryId   = localData.primaryProfileId || localData.activeProfileId;
  const primaryMeta =
    (primaryId && regProfiles.find(p => p && p.id === primaryId && (p.name || p.jss || p._readAt))) ||
    regProfiles.find(p => p && (p.name || p.jss || p._readAt)) ||
    regProfiles[0];

  let profileFull = null;
  if (primaryMeta?.id) {
    const lk     = 'profileFull_' + primaryMeta.id;
    const stored = await new Promise(r => chrome.storage.local.get([lk], r));
    profileFull  = stored[lk] || null;
  }

  const baseProfile = profileFull || primaryMeta || {};
  const profile = {
    ...baseProfile,
    skills:    Array.isArray(baseProfile.skillsArr) && baseProfile.skillsArr.length
                 ? baseProfile.skillsArr.join(', ')
                 : (typeof baseProfile.skills === 'string' ? baseProfile.skills : ''),
    skillsArr: Array.isArray(baseProfile.skillsArr) ? baseProfile.skillsArr : [],
    portfolio: baseProfile.portfolios || baseProfile.portfolio || [],
  };

  const res = await fetch(SERVER + '/analyse', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      job:     payload.jobData || {},
      profile,
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
