// ── Proposal generation ───────────────────────────────────────────────────────
// const SERVER = 'https://prowise-4e5t.onrender.com'; // Production
const SERVER = 'http://localhost:3000'; // Local Host

export async function handleGenerate(payload) {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(['userEmail', 'anonId', 'settings']),
    chrome.storage.local.get(['registeredProfiles', 'activeProfileId', 'primaryProfileId', 'deviceId'])
  ]);

  const regProfiles = localData.registeredProfiles || [];
  const primaryId   = localData.primaryProfileId;

  const primaryMeta =
    (primaryId && regProfiles.find(p => p && p.id === primaryId && (p.name || p.jss || p._readAt))) ||
    regProfiles.find(p => p && (p.name || p.jss || p._readAt)) ||
    regProfiles[0];

  let profileFull = null;
  if (primaryMeta?.id) {
    const localKey  = 'profileFull_' + primaryMeta.id;
    const stored    = await new Promise(resolve => chrome.storage.local.get([localKey], resolve));
    profileFull = stored[localKey] || null;
  }

  const baseProfile = profileFull || syncData.profile || {};
  const profile = {
    ...baseProfile,
    skills:    Array.isArray(baseProfile.skillsArr) && baseProfile.skillsArr.length
                 ? baseProfile.skillsArr.join(', ')
                 : (typeof baseProfile.skills === 'string' ? baseProfile.skills : ''),
    skillsArr: Array.isArray(baseProfile.skillsArr) ? baseProfile.skillsArr
                 : (typeof baseProfile.skills === 'string' ? baseProfile.skills.split(',').map(s => s.trim()).filter(Boolean) : []),
    portfolio: baseProfile.portfolios || baseProfile.portfolio || [],
    extra:     baseProfile.extra || '',
  };

  let anonId = syncData.anonId;
  if (!anonId) {
    anonId = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await chrome.storage.sync.set({ anonId });
  }

  const res = await fetch(SERVER + '/proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job:               payload.job,
      profile,
      settings:          syncData.settings || {},
      email:             syncData.userEmail || null,
      anonId,
      refineInstruction: payload.refineInstruction || '',
      currentLetter:     payload.currentLetter     || '',
      deviceId:          localData.deviceId        || ''
    })
  });

  const data = await res.json();
  if (res.status === 402 || data.showPaywall) return { showPaywall: true, plan: data.plan, error: data.error, usage: data };
  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
}
