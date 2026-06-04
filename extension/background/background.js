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
  if (msg.type === 'GET_PORTFOLIO_DATA') {
    // Runs in the page's JS context (MAIN world) — bypasses CSP, can access __vue__
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: async () => {
        // Scroll to portfolio section to trigger Upwork's lazy load
        const shelf = document.querySelector('.portfolio-v2-editor-shelf, [class*="portfolio-v2-shelf"]');
        if (shelf) shelf.scrollIntoView({ behavior: 'instant', block: 'center' });

        // Poll until publishedCurrentPageProjects is populated (up to 5s)
        for (let i = 0; i < 13; i++) {
          await new Promise(r => setTimeout(r, 400));
          try {
            const store = document.getElementById('__nuxt').__vue__.$store;
            const pv2   = store.state.profileViewer.portfolioV2;
            const all   = [...(pv2.publishedCurrentPageProjects || []), ...(pv2.draftCurrentPageProjects || [])];
            if (all.length > 0 || i >= 12) {
              return all.filter(p => p && p.title).map(p => {
                const urls = [];
                if (p.projectUrl && /^https?:\/\//.test(p.projectUrl)) urls.push(p.projectUrl);
                (p.attachments || []).forEach(a => {
                  const u = (a.type === 'embeddedLink' && /^https?:\/\//.test(a.link)) ? a.link : null;
                  const o = /^https?:\/\//.test(a.originalAttachment || '') ? a.originalAttachment : null;
                  const url = o || u;
                  if (url && !urls.includes(url)) urls.push(url);
                });
                const skills = (p.tags || []).map(t => (t.ontologySkill && t.ontologySkill.prefLabel) || t.freeText || '').filter(Boolean);
                return { title: p.title.trim(), desc: (p.description || '').trim().slice(0, 500), role: (p.role || '').trim(), urls, skills, _autoRead: true };
              });
            }
          } catch(e) {}
        }
        return [];
      },
    }).then(results => sendResponse(results?.[0]?.result || []))
      .catch(() => sendResponse([]));
    return true;
  }
});
