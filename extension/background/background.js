// PropWise Background v5
// Talks to server, handles free tier, routes to paywall

const SERVER = 'https://prowise-4e5t.onrender.com'; // ← update after deploy

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GENERATE_PROPOSAL') {
    handleGenerate(msg.payload).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'GET_STATUS') {
    getStatus().then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'VALIDATE_KEY') {
    validateKey(msg.key).then(sendResponse).catch(e => sendResponse({ valid: false }));
    return true;
  }
  if (msg.type === 'OPEN_PRICING') {
    chrome.tabs.create({ url: 'https://propwise.app/#pricing' }); // ← update to your landing page
    sendResponse({ ok: true });
    return true;
  }
});

async function getStatus() {
  const { licenseKey, anonId } = await chrome.storage.sync.get(['licenseKey', 'anonId']);
  const res = await fetch(SERVER + '/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(licenseKey ? { 'x-license-key': licenseKey } : {})
    },
    body: JSON.stringify({ anonId: anonId || null })
  });
  return res.json();
}

async function validateKey(key) {
  const res = await fetch(SERVER + '/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: key })
  });
  return res.json();
}

async function handleGenerate(payload) {
  const stored = await chrome.storage.sync.get(['licenseKey', 'anonId', 'profile', 'settings']);

  // Generate stable anon ID for free tier tracking
  let anonId = stored.anonId;
  if (!anonId) {
    anonId = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await chrome.storage.sync.set({ anonId });
  }

  const res = await fetch(SERVER + '/proposal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(stored.licenseKey ? { 'x-license-key': stored.licenseKey } : {})
    },
    body: JSON.stringify({
      job: payload.job,
      profile: stored.profile || {},
      settings: stored.settings || {},
      tempEmail: anonId + '@propwise.local'
    })
  });

  const data = await res.json();

  if (res.status === 402 || data.showPaywall) {
    return { showPaywall: true, plan: data.plan, error: data.error, usage: data };
  }

  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
}
