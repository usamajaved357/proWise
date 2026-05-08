// Snag AI Background v7
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
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'OPEN_CHECKOUT') {
    chrome.tabs.create({ url: 'https://snagai.netlify.app/checkout.html?plan=' + (msg.plan || 'pro') });
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === 'SET_PRIMARY_PROFILE') {
    // Store primary profile ID locally on this device (not synced)
    chrome.storage.local.set({ primaryProfileId: msg.profileId }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.type === 'GET_PRIMARY_PROFILE_ID') {
    chrome.storage.local.get(['primaryProfileId'], (data) => {
      sendResponse({ primaryProfileId: data.primaryProfileId || null });
    });
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
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(['userEmail', 'anonId', 'profile', 'settings', 'registeredProfiles', 'activeProfileId']),
    chrome.storage.local.get(['primaryProfileId'])
  ]);

  const regProfiles     = syncData.registeredProfiles || [];
  const primaryId       = localData.primaryProfileId; // device-local primary selection
  const syncActiveId    = syncData.activeProfileId;

  // Priority: local primary → sync active → first profile
  const primaryProfile =
    (primaryId   && regProfiles.find(p => p.id === primaryId && (p.name || p.jss || p._readAt))) ||
    (syncActiveId && regProfiles.find(p => p.id === syncActiveId && (p.name || p.jss || p._readAt))) ||
    regProfiles.find(p => p && (p.name || p.jss || p._readAt)) ||
    regProfiles[0];

  if (primaryProfile) {
    syncData.profile = {
      ...(syncData.profile || {}),
      ...primaryProfile,
      tier:      primaryProfile.tierKey || syncData.profile?.tier,
      skills:    Array.isArray(primaryProfile.skillsArr) && primaryProfile.skillsArr.length
                   ? primaryProfile.skillsArr.join(', ')
                   : (typeof primaryProfile.skills === 'string' ? primaryProfile.skills : syncData.profile?.skills || ''),
      skillsArr: Array.isArray(primaryProfile.skillsArr) ? primaryProfile.skillsArr
                   : (typeof primaryProfile.skills === 'string' ? primaryProfile.skills.split(',').map(s=>s.trim()).filter(Boolean) : []),
      portfolio: primaryProfile.portfolios || syncData.profile?.portfolio || [],
      extra:     primaryProfile.extra || syncData.profile?.extra || '',
    };
  }

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
      profile:           syncData.profile || {},
      settings:          syncData.settings || {},
      email:             syncData.userEmail || null,
      anonId:            anonId,
      refineInstruction: payload.refineInstruction || ''
    })
  });

  const data = await res.json();
  if (res.status === 402 || data.showPaywall) {
    return { showPaywall: true, plan: data.plan, error: data.error, usage: data };
  }
  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
}
