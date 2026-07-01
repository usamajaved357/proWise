// ── Snag AI Content — entry point ─────────────────────────────────────────────
// Modules loaded before this file (via manifest):
//   utils.js → job-reader.js → probability.js → panel.js →
//   page-paywall.js → page-alert.js → page-proposal.js
(function () {
  'use strict';

  // ── Button state helpers ──────────────────────────────────────────────────
  const _SVG_BEAT_HTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L4.5 13.5H11L10 22L20.5 9.5H14L13 2Z" fill="white" stroke="white" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;

  const _SVG_BEAT = _SVG_BEAT_HTML;
  const _SVG_SPIN  = `<svg class="sn-btn-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
  const _SVG_CHECK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  function _setBtnState(state) {
    const btn = document.getElementById('sn-btn');
    if (!btn) return;
    if (state === 'loading') {
      btn.innerHTML = _SVG_SPIN; btn.disabled = true;
      btn.style.background = ''; btn.classList.remove('sn-btn-done');
    } else if (state === 'done') {
      btn.innerHTML = _SVG_CHECK; btn.disabled = false;
      btn.style.background = '#059669'; btn.classList.add('sn-btn-done');
    } else {
      btn.innerHTML = _SVG_BEAT; btn.disabled = false;
      btn.style.background = ''; btn.classList.remove('sn-btn-done');
    }
  }

  // Restore green button if job was already analysed (on page load)
  function _restoreBtnIfAnalysed() {
    SnagAI.isJobAnalysed().then(done => { if (done) _setBtnState('done'); });
  }

  // ── Sidebar toggle — main action on job page ──────────────────────────────
  SnagAI.toggle = async function() {
    const sidebar = document.getElementById('sn-sidebar');
    if (!sidebar) return;

    // If already open — close it
    if (sidebar.classList.contains('sn-sb-open')) {
      SnagAI.closeSidebar();
      return;
    }

    // Check job availability immediately from page text — works for both cached and fresh paths
    const _pageUnavailable = /this job is no longer available/i.test(document.body.innerText);
    if (_pageUnavailable) {
      _setBtnState('done');
      const _sbBody = document.getElementById('sn-sb-body');
      if (_sbBody) _sbBody.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;text-align:center;gap:12px">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div style="color:#f87171;font-size:14px;font-weight:600;letter-spacing:.01em">Job No Longer Available</div>
          <div style="color:rgba(240,238,234,.45);font-size:12.5px;line-height:1.6;max-width:220px">This job has been closed or removed by the client. No audit available.</div>
        </div>`;
      SnagAI.openSidebar();
      return;
    }

    // Already analysed — open instantly with cached data, no API call
    const alreadyDone = await SnagAI.isJobAnalysed();
    if (alreadyDone) {
      const cacheKey = 'sn_analysis_' + SnagAI.state.cachedJobId;
      chrome.storage.local.get([cacheKey], r => {
        const cached = r[cacheKey];
        if (cached?.analysis) SnagAI.renderAnalysis({ ...cached.analysis, fromCache: true });
        SnagAI.openSidebar();
      });
      _setBtnState('done');
      return;
    }

    // Fresh analysis — spinner on button, sidebar stays CLOSED until ready
    _setBtnState('loading');

    try {
      await new Promise(r => setTimeout(r, 600));
      const job = SnagAI.getJob();
      try {
        const storeData = await chrome.runtime.sendMessage({ type: 'GET_JOB_DATA' });
        if (storeData && job.jobStats) {
          Object.entries(storeData).forEach(([k, v]) => { if (v !== null && v !== undefined) job.jobStats[k] = v; });
        }
      } catch(e) {}

      const localStored = await new Promise(r => chrome.storage.local.get(['registeredProfiles','activeProfileId','primaryProfileId'], r));
      const regProfiles = localStored.registeredProfiles || [];
      const primaryId   = localStored.primaryProfileId || localStored.activeProfileId;
      const primaryMeta = (primaryId && regProfiles.find(p => p?.id === primaryId)) || regProfiles[0];
      const localKey    = primaryMeta?.id ? 'profileFull_' + primaryMeta.id : null;
      const localFull   = localKey ? await new Promise(r => chrome.storage.local.get([localKey], r)) : {};
      const prof        = localFull[localKey] || primaryMeta || {};
      const filters     = prof.jobFilters || {};

      const analysis = await SnagAI.analyseJob(job, filters);

      // Render then open sidebar — user sees result immediately, no loading state
      SnagAI.renderAnalysis(analysis);
      SnagAI.openSidebar();

      _setBtnState('done');

    } catch(err) {
      console.error('[SnagAI] Analysis error:', err.message);
      SnagAI.showSidebarError(err.message || 'Analysis failed. Check your profile is set up.');
      SnagAI.openSidebar();
      _setBtnState('idle');
    }
  };

  // ── Re-analyse (manual refresh, max 3 times per job) ─────────────────────
  SnagAI.reAnalyse = async function() {
    const status = await SnagAI.getReAnalyseStatus();
    if (status.locked) return;

    // Swap footer to loading state immediately
    const footer = document.getElementById('sn-sb-footer');
    if (footer) footer.innerHTML = `<span class="sn-sb-reanalyse-locked" style="opacity:.5">Re-analysing…</span>`;

    SnagAI.showSidebarLoading();

    try {
      const job = SnagAI.getJob();
      try {
        const storeData = await chrome.runtime.sendMessage({ type: 'GET_JOB_DATA' });
        if (storeData && job.jobStats) {
          Object.entries(storeData).forEach(([k, v]) => { if (v !== null && v !== undefined) job.jobStats[k] = v; });
        }
      } catch(e) {}

      const localStored = await new Promise(r => chrome.storage.local.get(['registeredProfiles','activeProfileId','primaryProfileId'], r));
      const regProfiles = localStored.registeredProfiles || [];
      const primaryId   = localStored.primaryProfileId || localStored.activeProfileId;
      const primaryMeta = (primaryId && regProfiles.find(p => p?.id === primaryId)) || regProfiles[0];
      const localKey    = primaryMeta?.id ? 'profileFull_' + primaryMeta.id : null;
      const localFull   = localKey ? await new Promise(r => chrome.storage.local.get([localKey], r)) : {};
      const prof        = localFull[localKey] || primaryMeta || {};
      const filters     = prof.jobFilters || {};

      const analysis = await SnagAI.analyseJob(job, filters, true); // forceRefresh = true
      SnagAI.renderAnalysis(analysis);

    } catch(err) {
      console.error('[SnagAI] Re-analyse error:', err.message);
      SnagAI.showSidebarError(err.message || 'Re-analysis failed.');
    }
  };

  function openAndGenerate() {
    SnagAI.centerPanel();
    document.getElementById('sn-overlay').classList.add('vis');
    document.getElementById('sn-panel').classList.add('vis');
    SnagAI.state.isOpen = true;
    SnagAI.showLoading();
    SnagAI.generate();
  }

  // ── Silently cache job data on page load (for proposal submission page) ────
  async function cacheJobData() { // returns promise — callers can .then()
    try {
      await new Promise(r => setTimeout(r, 1200));
      const job = SnagAI.getJob();
      if (!job?.title && !job?.description) return;

      try {
        const storeData = await chrome.runtime.sendMessage({ type: 'GET_JOB_DATA' });
        if (storeData && job.jobStats) {
          Object.entries(storeData).forEach(([k, v]) => { if (v !== null && v !== undefined) job.jobStats[k] = v; });
        }
      } catch(e) {}

      const jobIdMatch = location.href.match(/(~[\w]+)/);
      const jobId      = jobIdMatch?.[1] || 'current';
      SnagAI.state.cachedJobId = jobId;

      chrome.storage.local.set({
        [`sn_job_${jobId}`]: {
          title:       job.title       || '',
          description: job.description || '',
          budget:      job.budget      || '',
          timeline:    job.timeline    || '',
          skills:      job.skills      || [],
          location:    job.location    || '',
          jobStats:    job.jobStats    || {},
          cachedAt:    Date.now(),
        }
      });
    } catch(e) { /* non-fatal */ }
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
        const autoSkip      = jobFilters.autoSkipHired !== false;
        const minScore      = jobFilters.minAlertScore ?? 60;
        const hired         = job.jobStats?.hiredCount || 0;
        const jobUnavailable = job.jobStats?.jobUnavailable || false;

        // Auto-skip immediately if hired and user enabled that filter
        if (hired > 0 && autoSkip) { SnagAI.closePanel(); return; }

        const preWp   = SnagAI.calcWinProbability(job.jobStats || {}, prof, jobFilters);
        const hasRisk = (preWp.riskItems || []).length > 0;

        if (jobUnavailable || hired > 0 || preWp.combined < minScore || hasRisk) {
          const blocked = await SnagAI.showProbAlert(preWp, hired, jobUnavailable);
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

      const currentLetter = SnagAI.state.currentLetter || '';
      SnagAI.state.refineInstruction = '';
      SnagAI.state.currentLetter = '';
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_PROPOSAL',
        payload: { job, refineInstruction, currentLetter }
      });

      SnagAI.state.jobStats      = job.jobStats;
      SnagAI.state.jobUnavailable = job.jobStats?.jobUnavailable || false;
      SnagAI.state.profile       = stored.profile || {};

      if (!response) { SnagAI.showError('No response. Try refreshing the page.'); return; }
      if (response.showPaywall) { SnagAI.showPaywall(response.usage || response); return; }
      if (response.error) { SnagAI.showError(response.error); return; }
      SnagAI.renderProposal(response);
    } catch(err) {
      SnagAI.showError(err.message || 'Something went wrong.');
    }
  };

  // ── SPA observer — re-inject on navigation ────────────────────────────────
  let _lastUrl = location.href;
  new MutationObserver(() => {
    const cur = location.href;
    if (cur !== _lastUrl) {
      _lastUrl = cur;
      if (cur.includes('/jobs/') || cur.includes('/ab/proposals/')) {
        SnagAI.injectUI();
        SnagAI.injectSidebar();
        setTimeout(() => cacheJobData().then(() => _restoreBtnIfAnalysed()), 500);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    SnagAI.injectUI();
    SnagAI.injectSidebar();
    cacheJobData().then(() => _restoreBtnIfAnalysed());
  }, 1500);
})();
