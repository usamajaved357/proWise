// ── Snag AI Content — entry point ─────────────────────────────────────────────
// Modules loaded before this file (via manifest):
//   utils.js → job-reader.js → probability.js → panel.js →
//   page-paywall.js → page-alert.js → page-proposal.js
(function () {
  'use strict';

  // ── Sidebar toggle (new primary action on job page) ───────────────────────
  SnagAI.toggle = function() {
    const sidebar = document.getElementById('sn-sidebar');
    if (sidebar) {
      sidebar.classList.contains('sn-sb-open') ? SnagAI.closeSidebar() : SnagAI.openSidebar();
    } else {
      // Fallback: open full panel for CL generation
      SnagAI.state.isOpen ? SnagAI.closePanel() : openAndGenerate();
    }
  };

  SnagAI.openSidebar = function() {
    const sb = document.getElementById('sn-sidebar');
    if (!sb) return;
    sb.classList.add('sn-sb-open');
    // Populate with latest cached score
    chrome.storage.local.get([`sn_score_${SnagAI.state.cachedJobId}`], r => {
      const cached = r[`sn_score_${SnagAI.state.cachedJobId}`];
      if (cached) renderSidebarScore(cached);
    });
  };

  SnagAI.closeSidebar = function() {
    document.getElementById('sn-sidebar')?.classList.remove('sn-sb-open');
  };

  function openAndGenerate() {
    SnagAI.centerPanel();
    document.getElementById('sn-overlay').classList.add('vis');
    document.getElementById('sn-panel').classList.add('vis');
    SnagAI.state.isOpen = true;
    SnagAI.showLoading();
    SnagAI.generate();
  }

  // ── Silent job scoring on page load ──────────────────────────────────────
  async function silentScore() {
    try {
      await new Promise(r => setTimeout(r, 1200)); // wait for page to settle
      const job = SnagAI.getJob();
      if (!job?.title && !job?.description) return;

      // Get enhanced stats from Vuex store
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

      if (prof.skillsArr?.length) prof._skillsForMatching = prof.skillsArr;

      const jobFilters = prof.jobFilters || {};
      const wp = SnagAI.calcWinProbability(job.jobStats || {}, prof, jobFilters);

      // Extract the numeric ~XXXX job ID (consistent with submission page URL format)
      const jobIdMatch = location.href.match(/(~[\w]+)/);
      const jobId = jobIdMatch?.[1] || 'current';
      SnagAI.state.cachedJobId = jobId;

      // Cache job data for use on the proposal submission page
      chrome.storage.local.set({
        [`sn_job_${jobId}`]: {
          title:       job.title       || '',
          description: job.description || '',
          jobStats:    job.jobStats    || {},
          skills:      job.skills      || [],
          cachedAt:    Date.now(),
        },
        [`sn_score_${jobId}`]: {
          wp, job, cachedAt: Date.now()
        }
      });

      // Update sidebar if it's open
      renderSidebarScore({ wp, job });

    } catch(e) { /* non-fatal */ }
  }

  // ── Sidebar rendering ─────────────────────────────────────────────────────
  function renderSidebarScore({ wp, job }) {
    const body = document.getElementById('sn-sb-body');
    if (!body) return;

    const probColor  = wp.probScore  >= 70 ? '#4ade80' : wp.probScore  >= 45 ? '#facc15' : '#f87171';
    const matchColor = wp.matchScore >= 70 ? '#4ade80' : wp.matchScore >= 45 ? '#e8a020' : '#f87171';
    const combined   = wp.combined ?? wp.probScore;
    const verdict    = combined >= 70 ? 'Good opportunity' : combined >= 50 ? 'Proceed with caution' : 'High risk';
    const verdictCol = combined >= 70 ? '#4ade80'          : combined >= 50 ? '#facc15'              : '#f87171';

    // Build correct apply URL from cached jobId
    const jobId    = SnagAI.state.cachedJobId;
    const applyUrl = jobId && jobId !== 'current'
      ? `https://www.upwork.com/nx/proposals/job/${jobId}/apply/`
      : '#';

    const negProb  = (wp.topProb  || []).filter(f => f.delta < 0).sort((a,b) => a.delta - b.delta);
    const negMatch = (wp.topMatch || []).filter(f => f.delta < 0).sort((a,b) => a.delta - b.delta);

    function factorRow(f, positive) {
      const lbl  = f.label + (f.value ? ': ' + (typeof f.value === 'object' ? JSON.stringify(f.value) : f.value) : '');
      const dot  = positive ? '#4ade80' : '#f87171';
      const dcol = positive ? 'rgba(74,222,128,.9)' : 'rgba(248,113,113,.9)';
      const dbg  = positive ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.14)';
      const sign = positive ? '+' + f.delta : f.delta;
      return `<div class="sn-sb-factor">
        <div class="sn-sb-fdot" style="background:${dot}"></div>
        <div class="sn-sb-fbody">
          <div class="sn-sb-fname">${SnagAI.esc(lbl)}</div>
          ${f.note ? `<div class="sn-sb-fnote">${SnagAI.esc(f.note)}</div>` : ''}
        </div>
        <span class="sn-sb-fscore" style="color:${dcol};background:${dbg}">${sign}</span>
      </div>`;
    }

    const isClean   = !negProb.length && !negMatch.length;
    const posProb   = (wp.topProb  || []).filter(f => f.delta > 0).sort((a,b) => b.delta - a.delta).slice(0, 4);
    const posMatch  = (wp.topMatch || []).filter(f => f.delta > 0).sort((a,b) => b.delta - a.delta).slice(0, 3);

    body.innerHTML = `
      <!-- Verdict pill -->
      <div class="sn-sb-verdict" style="color:${verdictCol};border-color:${verdictCol}22;background:${verdictCol}12">
        <span class="sn-sb-vdot" style="background:${verdictCol}"></span>
        ${verdict}
      </div>

      <!-- Score row: side by side -->
      <div class="sn-sb-score-row">
        <div class="sn-sb-score-cell">
          <div class="sn-sb-slbl">Win probability</div>
          <div class="sn-sb-snum" style="color:${probColor}">${wp.probScore}%</div>
          <div class="sn-sb-sbar"><div class="sn-sb-sfill" style="width:${wp.probScore}%;background:${probColor}"></div></div>
        </div>
        <div class="sn-sb-sdivider"></div>
        <div class="sn-sb-score-cell">
          <div class="sn-sb-slbl">Profile match</div>
          <div class="sn-sb-snum" style="color:${matchColor}">${wp.matchScore}%</div>
          <div class="sn-sb-sbar"><div class="sn-sb-sfill" style="width:${wp.matchScore}%;background:${matchColor}"></div></div>
        </div>
      </div>

      ${isClean ? `
        <!-- Green light: flip to show WHY it's good -->
        ${posProb.length ? `
          <div class="sn-sb-section sn-sb-section-green">Why you'll win</div>
          ${posProb.map(f => factorRow(f, true)).join('')}
        ` : ''}
        ${posMatch.length ? `
          <div class="sn-sb-section sn-sb-section-green">Profile strengths</div>
          ${posMatch.map(f => factorRow(f, true)).join('')}
        ` : ''}
        ${!posProb.length && !posMatch.length ? `
          <div class="sn-sb-empty">✓ All signals clear — apply with confidence!</div>
        ` : ''}
      ` : `
        <!-- Has negatives: show risk factors as usual -->
        ${negProb.length ? `
          <div class="sn-sb-section">Risk factors</div>
          ${negProb.map(f => factorRow(f, false)).join('')}
        ` : ''}
        ${negMatch.length ? `
          <div class="sn-sb-section">Profile gaps</div>
          ${negMatch.map(f => factorRow(f, false)).join('')}
        ` : ''}
      `}

      <div class="sn-sb-apply-row">
        <a class="sn-sb-apply-btn" href="${applyUrl}" target="_blank">
          Apply Now →
        </a>
      </div>
    `;
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

      const currentLetter = SnagAI.state.currentLetter || '';
      SnagAI.state.refineInstruction = '';
      SnagAI.state.currentLetter = '';
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_PROPOSAL',
        payload: { job, refineInstruction, currentLetter }
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

  // ── Sidebar injection ─────────────────────────────────────────────────────
  function injectSidebar() {
    if (document.getElementById('sn-sidebar')) return;
    const sb = document.createElement('div');
    sb.id = 'sn-sidebar';
    sb.innerHTML = `
      <div class="sn-sb-head">
        <div class="sn-sb-logo">
          <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
            <rect x="5" y="5" width="64" height="78" rx="10" stroke="white" stroke-width="5.5" fill="none"/>
            <line x1="14" y1="23" x2="57" y2="23" stroke="white" stroke-width="5" stroke-linecap="round"/>
            <line x1="14" y1="35" x2="57" y2="35" stroke="white" stroke-width="5" stroke-linecap="round"/>
            <line x1="14" y1="47" x2="57" y2="47" stroke="white" stroke-width="5" stroke-linecap="round"/>
            <line x1="14" y1="59" x2="40" y2="59" stroke="white" stroke-width="5" stroke-linecap="round"/>
            <circle cx="76" cy="77" r="23" fill="#4338ca"/>
            <polygon points="80,59 70,78 77,78 73,95 88,74 81,74" fill="white"/>
          </svg>
        </div>
        <div class="sn-sb-head-text">
          <div class="sn-sb-title">Snag AI</div>
          <div class="sn-sb-sub">Job score</div>
        </div>
        <button class="sn-sb-close" id="sn-sb-close">✕</button>
      </div>
      <div class="sn-sb-body" id="sn-sb-body">
        <div class="sn-sb-loading">Analyzing job…</div>
      </div>
    `;
    document.body.appendChild(sb);
    document.getElementById('sn-sb-close')?.addEventListener('click', SnagAI.closeSidebar);

    // Close sidebar when clicking outside it
    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sn-sidebar');
      const trigger = document.getElementById('sn-trigger');
      if (!sidebar || !sidebar.classList.contains('sn-sb-open')) return;
      if (!sidebar.contains(e.target) && !trigger.contains(e.target)) {
        SnagAI.closeSidebar();
      }
    }, true);
  }

  // ── SPA observer — re-inject on navigation ────────────────────────────────
  let _lastUrl = location.href;
  new MutationObserver(() => {
    const cur = location.href;
    if (cur !== _lastUrl) {
      _lastUrl = cur;
      if (cur.includes('/jobs/') || cur.includes('/ab/proposals/')) {
        SnagAI.injectUI();
        injectSidebar();
        setTimeout(silentScore, 500);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    SnagAI.injectUI();
    injectSidebar();
    silentScore();
  }, 1500);
})();
