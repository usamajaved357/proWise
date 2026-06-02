// ── Snag AI Background — message router ───────────────────────────────────────
import { handleGenerate } from './modules/generate.js';
import { getStatus }      from './modules/status.js';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GENERATE_PROPOSAL') {
    handleGenerate(msg.payload).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'GET_STATUS') {
    getStatus().then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'OPEN_OPTIONS_TAB') {
    const tab = msg.tab || 'subscription';
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') + '?tab=' + tab });
    sendResponse({ ok: true }); return true;
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
