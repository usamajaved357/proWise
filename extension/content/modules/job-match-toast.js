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
    const jobUnavailable = job.jobStats?.jobUnavailable || false;

    // Only skip for a genuinely gone job — the page shows its own "no
    // longer available" messaging elsewhere for that case. "Already
    // hired" is NOT skipped here: autoSkipHired only controls whether
    // SnagAI.generate() silently declines to write a proposal for a
    // closed job — it has nothing to do with whether this toast should
    // warn the user, and this toast is exactly where that warning
    // belongs (calcWinProbability already reports it as a risk item).
    if (jobUnavailable) return;

    const wp = SnagAI.calcWinProbability(job.jobStats || {}, prof, filters);
    // "Already hired" is the one reason that makes every other one moot —
    // applying is pointless regardless of how well you'd otherwise match.
    // Always float it to the top so it can't get lost below 4-5 other
    // rows the user has no real reason to read past.
    const isHiredReason = r => /already hired/i.test(r);
    const reasons = [...(wp.riskItems || [])].sort((a, b) => (isHiredReason(b) ? 1 : 0) - (isHiredReason(a) ? 1 : 0));
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
        ${reasons.map(r => {
          // probability.js wraps the key phrase of each reason in {{...}} —
          // turn that into a colored span, same color for every factor, no
          // bold/size change so it still reads like the rest of the sentence.
          const text = SnagAI.esc(r).replace(/\{\{(.+?)\}\}/g, '<span class="sn-mt-highlight">$1</span>');
          return `
          <div class="sn-mt-reason">
            <span class="sn-mt-reason-dot"></span>
            <span class="sn-mt-reason-text">${text}</span>
          </div>
        `;
        }).join('')}
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
