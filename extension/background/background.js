// Snag AI Background v8 — local storage for full profile data
const SERVER = 'https://prowise-4e5t.onrender.com';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GENERATE_PROPOSAL') {
    handleGenerate(msg.payload).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'GET_STATUS') {
    getStatus().then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'OPEN_PRICING') {
    chrome.tabs.create({ url: 'https://snagai.netlify.app/#pricing' });
    sendResponse({ ok: true }); return true;
  }
  if (msg.type === 'OPEN_CHECKOUT') {
    chrome.tabs.create({ url: 'https://snagai.netlify.app/checkout.html?plan=' + (msg.plan || 'pro') });
    sendResponse({ ok: true }); return true;
  }
  if (msg.type === 'SET_PRIMARY_PROFILE') {
    chrome.storage.local.set({ primaryProfileId: msg.profileId }, () => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'GET_PRIMARY_PROFILE_ID') {
    chrome.storage.local.get(['primaryProfileId'], d => sendResponse({ primaryProfileId: d.primaryProfileId || null }));
    return true;
  }
});

async function getStatus() {
  const { userEmail, anonId } = await chrome.storage.sync.get(['userEmail', 'anonId']);
  const res = await fetch(SERVER + '/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail || null, anonId: anonId || null })
  });
  return res.json();
}

async function handleGenerate(payload) {
  // Step 1: get sync data (metadata) + local primary choice
  const [syncData, localMeta] = await Promise.all([
    chrome.storage.sync.get(['userEmail', 'anonId', 'profile', 'settings', 'registeredProfiles', 'activeProfileId']),
    chrome.storage.local.get(['primaryProfileId'])
  ]);

  const regProfiles = syncData.registeredProfiles || [];
  const primaryId   = localMeta.primaryProfileId;

  // Find the primary profile metadata
  const primaryMeta =
    (primaryId && regProfiles.find(p => p && p.id === primaryId && (p.name || p.jss || p._readAt))) ||
    regProfiles.find(p => p && (p.name || p.jss || p._readAt)) ||
    regProfiles[0];

  // Step 2: load full profile data from local storage (no quota limits)
  let profileFull = null;
  if (primaryMeta?.id) {
    const localKey  = 'profileFull_' + primaryMeta.id;
    const localData = await new Promise(resolve => chrome.storage.local.get([localKey], resolve));
    profileFull = localData[localKey] || null;
  }

  // Step 3: build the profile object — full local data preferred, sync profile as fallback
  const baseProfile = profileFull || syncData.profile || {};
  const profile = {
    ...baseProfile,
    skills:    Array.isArray(baseProfile.skillsArr) && baseProfile.skillsArr.length
                 ? baseProfile.skillsArr.join(', ')
                 : (typeof baseProfile.skills === 'string' ? baseProfile.skills : ''),
    skillsArr: Array.isArray(baseProfile.skillsArr) ? baseProfile.skillsArr
                 : (typeof baseProfile.skills === 'string' ? baseProfile.skills.split(',').map(s=>s.trim()).filter(Boolean) : []),
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
      refineInstruction: payload.refineInstruction || ''
    })
  });

  const data = await res.json();
  if (res.status === 402 || data.showPaywall) return { showPaywall: true, plan: data.plan, error: data.error, usage: data };
  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
}
