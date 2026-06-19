// ── Snag AI Content — entry point ─────────────────────────────────────────────
// Modules loaded before this file (via manifest):
//   utils.js → job-reader.js → probability.js → panel.js →
//   page-paywall.js → page-alert.js → page-proposal.js
(function () {
  'use strict';

  SnagAI.toggle = function() {
    SnagAI.state.isOpen ? SnagAI.closePanel() : openAndGenerate();
  };

  function openAndGenerate() {
    SnagAI.centerPanel();
    document.getElementById('sn-overlay').classList.add('vis');
    document.getElementById('sn-panel').classList.add('vis');
    SnagAI.state.isOpen = true;
    SnagAI.showLoading();
    SnagAI.generate();
  }

  SnagAI.generate = async function() {
    try {
      const [syncStored, localStored] = await Promise.all([
        chrome.storage.sync.get(['userEmail', 'anonId', 'settings']),
        chrome.storage.local.get(['registeredProfiles', 'activeProfileId', 'primaryProfileId']),
      ]);
      const stored = { ...syncStored };

      const regProfiles    = localStored.registeredProfiles || [];
      const primaryId      = localStored.primaryProfileId || localStored.activeProfileId;
      const primaryProfile = (primaryId && regProfiles.find(p => p && p.id === primaryId && (p.name || p.jss || p._readAt)))
                          || regProfiles.find(p => p && (p.name || p.jss || p._readAt))
                          || regProfiles[0];

      const localKey = primaryProfile?.id ? 'profileFull_' + primaryProfile.id : null;
      const localFull = localKey ? await new Promise(r => chrome.storage.local.get([localKey], r)) : {};
      const prof = localFull[localKey] || primaryProfile || {};
      const hasRegisteredUrl = regProfiles.some(p => p && p.url);
      const hasAutoReadData  = !!(prof.name || prof.jss || prof._readAt || regProfiles.some(p => p && (p.name || p.jss || p._readAt)));

      if (!hasRegisteredUrl) {
        document.getElementById('sn-body').innerHTML = `
          <div style="padding:32px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px">
            <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,rgba(201,168,76,.15),rgba(201,168,76,.05));border:1px solid rgba(201,168,76,.25);display:flex;align-items:center;justify-content:center;font-size:26px">👤</div>
            <div style="font-size:15px;font-weight:700;color:#f0eeea">Set up your profile first</div>
            <div style="font-size:12px;color:rgba(240,238,234,.5);line-height:1.8;max-width:300px">
              Go to <strong style="color:#c9a84c">Settings → Subscription</strong> and paste your Upwork profile URL.<br>
              Then visit that URL — Snag AI reads your data automatically.
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;width:100%;max-width:240px">
              <button id="sn-open-settings-btn" style="padding:11px 24px;background:#c9a84c;color:#0d1120;border-radius:9px;font-size:13px;font-weight:700;border:none;cursor:pointer;font-family:inherit;width:100%">
                Open Settings →
              </button>
            </div>
            <div style="font-size:11px;color:rgba(240,238,234,.3)">Takes 30 seconds to set up</div>
          </div>
        `;
        document.getElementById('sn-open-settings-btn')?.addEventListener('click', () => {
          chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_TAB', tab: 'subscription' });
        });
        return;
      }

      if (hasRegisteredUrl && !hasAutoReadData) {
        const firstUrl = regProfiles.find(p => p && p.url)?.url || 'https://www.upwork.com/freelancers/me';
        document.getElementById('sn-body').innerHTML = `
          <div style="padding:32px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px">
            <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,rgba(52,211,153,.12),rgba(52,211,153,.04));border:1px solid rgba(52,211,153,.2);display:flex;align-items:center;justify-content:center;font-size:26px">🔄</div>
            <div style="font-size:15px;font-weight:700;color:#f0eeea">Visit your profile to sync</div>
            <div style="font-size:12px;color:rgba(240,238,234,.5);line-height:1.8;max-width:300px">
              Your profile URL is saved. <strong style="color:#f0eeea">Open it once</strong> and Snag AI will read your skills, tier, and stats automatically.
            </div>
            <button id="sn-open-profile-btn" style="padding:11px 24px;background:#c9a84c;color:#0d1120;border-radius:9px;font-size:13px;font-weight:700;border:none;cursor:pointer;font-family:inherit;width:100%;max-width:240px">
              Open my Upwork profile →
            </button>
          </div>
        `;
        document.getElementById('sn-open-profile-btn')?.addEventListener('click', () => {
          window.open(firstUrl, '_blank');
        });
        return;
      }

      if (prof.skillsArr && prof.skillsArr.length) {
        prof._skillsForMatching = prof.skillsArr;
      }

      let anonId = stored.anonId;
      if (!anonId) {
        anonId = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        await chrome.storage.sync.set({ anonId });
      }

      await new Promise(r => setTimeout(r, 800));
      const job = SnagAI.getJob();

      // Enrich jobStats from Vuex store — more reliable than DOM parsing for all activity stats
      try {
        const storeData = await chrome.runtime.sendMessage({ type: 'GET_JOB_DATA' });
        if (storeData && job.jobStats) {
          Object.entries(storeData).forEach(([k, v]) => {
            if (v !== null && v !== undefined) job.jobStats[k] = v;
          });
          console.log('[SnagAI] Job stats from store:', storeData);
        }
      } catch(e) { /* fall back to DOM-parsed stats */ }

      const refineInstruction = SnagAI.state.refineInstruction || '';

      if (!refineInstruction) {
        const jobFilters   = prof.jobFilters || {};
        const autoSkip     = jobFilters.autoSkipHired !== false;
        const minScore     = jobFilters.minAlertScore ?? 60;
        const hired        = job.jobStats?.hiredCount || 0;

        // Auto-skip immediately if hired and user enabled that filter
        if (hired > 0 && autoSkip) { SnagAI.closePanel(); return; }

        const preWp   = SnagAI.calcWinProbability(job.jobStats || {}, prof, jobFilters);
        const hasRisk = (preWp.riskItems || []).length > 0;

        if (hired > 0 || preWp.combined < minScore || hasRisk) {
          const blocked = await SnagAI.showProbAlert(preWp, hired);
          if (blocked) return;
        }
      }

      SnagAI.showLoading();
      try {
        const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
        if (status && status.remaining !== undefined && status.remaining <= 0) {
          SnagAI.showPaywall(status); return;
        }
      } catch(e) { /* let server enforce */ }

      await new Promise(r => setTimeout(r, 500));
      const jobWithReviews = SnagAI.getJob();
      Object.assign(job, { clientName: jobWithReviews.clientName, reviewText: jobWithReviews.reviewText });

      SnagAI.state.refineInstruction = '';
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_PROPOSAL',
        payload: { job, refineInstruction }
      });

      SnagAI.state.jobStats = job.jobStats;
      SnagAI.state.profile  = stored.profile || {};

      if (!response) { SnagAI.showError('No response. Try refreshing the page.'); return; }
      if (response.showPaywall) { SnagAI.showPaywall(response.usage || response); return; }
      if (response.error) { SnagAI.showError(response.error); return; }
      SnagAI.renderProposal(response);
    } catch(err) {
      SnagAI.showError(err.message || 'Something went wrong.');
    }
  };

  // SPA observer — re-inject on navigation
  new MutationObserver(() => {
    if (location.href.includes('/jobs/') || location.href.includes('/proposals/')) {
      SnagAI.injectUI();
    }
  }).observe(document.body, { childList: true, subtree: true });

  setTimeout(() => SnagAI.injectUI(), 1500);
})();
