// ── Snag AI Content — entry point ─────────────────────────────────────────────
// Modules loaded before this file (via manifest):
//   utils.js → job-reader.js → probability.js → panel.js →
//   page-paywall.js → job-match-toast.js → page-proposal.js
(function () {
  'use strict';

  // ── Button state helpers ──────────────────────────────────────────────────
  // The logo image itself is persistent (see panel.js) — states are just
  // classes toggled on it/the button, same pattern as the proposal page's
  // floating button: loading rotates the logo instead of swapping to a
  // separate spinner icon; done tints it with a colored glow instead of a
  // solid background fill.
  function _setBtnState(state) {
    const btn = document.getElementById('sn-btn');
    const img = document.getElementById('sn-btn-logo');
    if (!btn) return;
    btn.disabled = (state === 'loading');
    if (img) img.classList.toggle('sn-btn-logo-spin', state === 'loading');
    btn.classList.toggle('sn-btn-done', state === 'done');
  }

  // Restore green button if job was already analysed (on page load)
  function _restoreBtnIfAnalysed() {
    SnagAI.isJobAnalysed().then(done => { if (done) _setBtnState('done'); });
  }

  // ── Sidebar toggle — main action on job page ──────────────────────────────
  SnagAI.toggle = async function() {
    if (!chrome.runtime?.id) {
      console.warn('[SnagAI] Extension context invalidated — refresh the page.');
      return;
    }
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
      // Cache key must match job-analyser.js's primary-profile-suffixed
      // scheme exactly, or this fast path silently misses the entry
      // isJobAnalysed() just confirmed exists.
      const { primaryProfileId, activeProfileId } = await new Promise(r =>
        chrome.storage.local.get(['primaryProfileId', 'activeProfileId'], r));
      const suffix   = (primaryProfileId || activeProfileId || 'default') + '_';
      const cacheKey = 'sn_analysis_' + suffix + SnagAI.state.cachedJobId;
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
      await SnagAI.waitForJobActivitySection();
      const job = SnagAI.getJob();
      try {
        const storeData = await chrome.runtime.sendMessage({ type: 'GET_JOB_DATA' });
        if (storeData && job.jobStats) {
          // timePosted/timePostedMinutes skipped — store's computed value has
          // been unreliable; job-reader.js's DOM value (read from the "Posted
          // X ago" text) is the reliable source for this field.
          Object.entries(storeData).forEach(([k, v]) => {
            if (k === 'timePosted' || k === 'timePostedMinutes') return;
            if (v !== null && v !== undefined) job.jobStats[k] = v;
          });
          console.log('[SnagAI] Job stats enriched from Vuex store:', storeData);
        } else {
          console.warn('[SnagAI] GET_JOB_DATA returned nothing — jobStats will rely on DOM-parsed values only:', job.jobStats);
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
      await SnagAI.waitForJobActivitySection();
      const job = SnagAI.getJob();
      if (!job?.title && !job?.description) return;

      try {
        const storeData = await chrome.runtime.sendMessage({ type: 'GET_JOB_DATA' });
        if (storeData && job.jobStats) {
          // timePosted/timePostedMinutes skipped — store's computed value has
          // been unreliable; job-reader.js's DOM value (read from the "Posted
          // X ago" text) is the reliable source for this field.
          Object.entries(storeData).forEach(([k, v]) => {
            if (k === 'timePosted' || k === 'timePostedMinutes') return;
            if (v !== null && v !== undefined) job.jobStats[k] = v;
          });
          console.log('[SnagAI] Job stats enriched from Vuex store:', storeData);
        } else {
          console.warn('[SnagAI] GET_JOB_DATA returned nothing — jobStats will rely on DOM-parsed values only:', job.jobStats);
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
      await SnagAI.waitForJobActivitySection();
      const job = SnagAI.getJob();

      // Enrich jobStats from Vuex store — more reliable than DOM parsing for all activity stats
      try {
        const storeData = await chrome.runtime.sendMessage({ type: 'GET_JOB_DATA' });
        if (storeData && job.jobStats) {
          Object.entries(storeData).forEach(([k, v]) => {
            if (k === 'timePosted' || k === 'timePostedMinutes') return;
            if (v !== null && v !== undefined) job.jobStats[k] = v;
          });
          console.log('[SnagAI] Job stats from store:', storeData);
        }
      } catch(e) { /* fall back to DOM-parsed stats */ }

      const refineInstruction = SnagAI.state.refineInstruction || '';

      if (!refineInstruction) {
        const jobFilters = prof.jobFilters || {};
        const autoSkip    = jobFilters.autoSkipHired !== false;
        const hired       = job.jobStats?.hiredCount || 0;

        // Auto-skip immediately if hired and user enabled that filter.
        // (The old pre-generation "prob alert" modal that used to live here
        // has been replaced by the top-right match toast — see
        // job-match-toast.js — which now runs on page load instead.)
        if (hired > 0 && autoSkip) { SnagAI.closePanel(); return; }
      }

      SnagAI.showLoading();
      // Skip this client-side pre-check for revisions — a revision might be
      // free (1 free revision per letter, server-enforced) even when the
      // main pool is at 0, and this check has no way to know that in advance.
      if (!refineInstruction) {
        try {
          const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
          if (status && status.remaining !== undefined && status.remaining <= 0) {
            SnagAI.showPaywall(status); return;
          }
        } catch(e) { /* let server enforce */ }
      }

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
        SnagAI.showMatchToast();
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    SnagAI.injectUI();
    SnagAI.injectSidebar();
    cacheJobData().then(() => _restoreBtnIfAnalysed());
    SnagAI.showMatchToast();
  }, 1500);
})();
