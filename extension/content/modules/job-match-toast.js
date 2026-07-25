// ── Job match toast — top-right notification shown when a job page loads ────
// Replaces the old pre-generation "prob alert" modal (page-alert.js, removed):
// that one only fired when the user clicked to generate a proposal. This
// fires automatically on page load/navigation, for every job, using the
// exact same match logic (SnagAI.calcWinProbability) so the reasons shown
// here match whatever the Job Audit sidebar already computes.
window.SnagAI.showMatchToast = async function() {
  try {
    // SPA re-navigation — drop the previous toast before building a new one.
    document.getElementById('sn-match-toast')?.remove();

    await SnagAI.waitForJobActivitySection();
    const job = SnagAI.getJob();
    if (!job?.title && !job?.description) return;

    try {
      const storeData = await chrome.runtime.sendMessage({ type: 'GET_JOB_DATA' });
      if (storeData && job.jobStats) {
        Object.entries(storeData).forEach(([k, v]) => { if (v !== null && v !== undefined) job.jobStats[k] = v; });
      }
    } catch(e) { /* fall back to DOM-parsed stats */ }

    const localStored = await new Promise(r => chrome.storage.local.get(['registeredProfiles', 'activeProfileId', 'primaryProfileId'], r));
    const regProfiles = localStored.registeredProfiles || [];
    const primaryId    = localStored.primaryProfileId || localStored.activeProfileId;
    const primaryMeta  = (primaryId && regProfiles.find(p => p?.id === primaryId)) || regProfiles[0];
    const localKey     = primaryMeta?.id ? 'profileFull_' + primaryMeta.id : null;
    const localFull    = localKey ? await new Promise(r => chrome.storage.local.get([localKey], r)) : {};
    const prof         = localFull[localKey] || primaryMeta || {};

    // No profile set up yet — nothing to match this job against.
    if (!prof.name && !prof.jss && !prof._readAt) return;

    const filters        = prof.jobFilters || {};
    const hired          = job.jobStats?.hiredCount || 0;
    const jobUnavailable = job.jobStats?.jobUnavailable || false;
    const autoSkip       = filters.autoSkipHired !== false;

    // Nothing useful to tell the user in these cases.
    if (jobUnavailable || (hired > 0 && autoSkip)) return;

    const wp      = SnagAI.calcWinProbability(job.jobStats || {}, prof, filters);
    const reasons = wp.riskItems || [];
    const isGood  = reasons.length === 0;

    const title      = isGood ? wp.verdict + ' match' : reasons.length + ' mismatch' + (reasons.length > 1 ? 'es' : '');
    // Pink end of the border's teal→violet→pink gradient, so the mismatch
    // title reads as part of the same color story instead of a plain red.
    const titleColor = isGood ? wp.verdictColor : '#ec4899';

    const toast = document.createElement('div');
    toast.id = 'sn-match-toast';
    toast.innerHTML = `
      <div class="sn-mt-row">
        <div class="sn-mt-logo">
          <img src="${chrome.runtime.getURL('icons/icon128.png')}" width="24" height="24" alt="">
        </div>
        <div class="sn-mt-title" style="color:${titleColor}">${SnagAI.esc(title)}</div>
        ${!isGood ? `
        <button class="sn-mt-chevron" id="sn-mt-chevron" title="Show reasons">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>` : ''}
        <button class="sn-mt-close" id="sn-mt-close" title="Dismiss">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      ${!isGood ? `
      <div class="sn-mt-dropdown" id="sn-mt-dropdown">
        ${reasons.map(r => `
          <div class="sn-mt-reason">
            <span class="sn-mt-reason-dot"></span>
            <span class="sn-mt-reason-text">${SnagAI.esc(r)}</span>
          </div>
        `).join('')}
      </div>` : ''}
    `;
    document.body.appendChild(toast);

    document.getElementById('sn-mt-close')?.addEventListener('click', () => toast.remove());
    document.getElementById('sn-mt-chevron')?.addEventListener('click', () => {
      const dd   = document.getElementById('sn-mt-dropdown');
      const chev = document.getElementById('sn-mt-chevron');
      if (!dd) return;
      const open = dd.classList.toggle('sn-mt-dropdown-open');
      chev.classList.toggle('sn-mt-chevron-open', open);
    });
  } catch(e) { /* non-fatal — never let a notification block the page */ }
};
