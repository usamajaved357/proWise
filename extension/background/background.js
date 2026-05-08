// PropWise Background v6 — email-based, no license keys
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
    const plan = msg.plan || 'pro';
    chrome.tabs.create({ url: 'https://snagai.netlify.app/checkout.html?plan=' + plan });
    sendResponse({ ok: true });
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
  const stored = await chrome.storage.sync.get(['userEmail', 'anonId', 'profile', 'settings', 'registeredProfiles', 'activeProfileId']);

  // Use active registered profile data if available (more up to date than legacy profile)
  const regProfiles = stored.registeredProfiles || [];
  const activeId    = stored.activeProfileId;
  const activeReg   = regProfiles.find(p => p.id === activeId) || regProfiles[0];
  if (activeReg && (activeReg.name || activeReg.jss)) {
    // Merge registered profile data into legacy profile for the request
    stored.profile = {
      ...(stored.profile || {}),
      ...activeReg,
      tier:     activeReg.tierKey || stored.profile?.tier,
      skills:   activeReg.skillsArr ? activeReg.skillsArr.join(', ') : (activeReg.skills || stored.profile?.skills || ''),
      portfolio: activeReg.portfolios || stored.profile?.portfolio || [],
    };
  }

  // Generate stable anon ID for free tier tracking
  let anonId = stored.anonId;
  if (!anonId) {
    anonId = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await chrome.storage.sync.set({ anonId });
  }

  const res = await fetch(SERVER + '/proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job:              payload.job,
      profile:          stored.profile || {},
      settings:         stored.settings || {},
      email:            stored.userEmail || null,
      anonId:           anonId,
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
