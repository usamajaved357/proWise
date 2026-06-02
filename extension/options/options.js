// ── Snag AI Options v15 ───────────────────────────────────────────────────────

const PLAN_LIMITS  = { free: 1, starter: 1, pro: 3, agency: 5 };
const PLAN_LABELS  = { free: 'Free', starter: 'Starter', pro: 'Pro', agency: 'Agency' };
const PLAN_QUOTAS  = { free: 2, starter: 150, pro: 400, agency: 900 };
const SKILLS_SHOW  = 8; // visible before "x more"

// Tracks the user's current plan and subscription state so plan buttons route correctly
let _activePlan         = 'free';
let _subscriptionStatus = 'active'; // 'active' | 'canceling' | 'canceled'
let currentSlide        = 0;

// ── Section navigation ────────────────────────────────────────────────────────
function switchSection(name) {
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const item = document.querySelector(`.sb-item[data-section="${name}"]`);
  const sec  = document.getElementById('section-' + name);
  if (item) item.classList.add('active');
  if (sec)  sec.classList.add('active');
}
document.querySelectorAll('.sb-item[data-section]').forEach(el =>
  el.addEventListener('click', () => switchSection(el.dataset.section))
);
// URL param routing: options.html?tab=subscription
const _tab = new URLSearchParams(window.location.search).get('tab');
if (_tab) switchSection(_tab);

// ── Storage change listener — live refresh when profile syncs ─────────────────
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    const hasProfile = Object.keys(changes).some(k => k.startsWith('profileFull_') || k === 'primaryProfileId' || k === 'registeredProfiles' || k === 'activeProfileId');
    if (hasProfile) { renderProfilesPage(); return; }
  }
  if (area !== 'sync') return;
  if (changes.registeredProfiles || changes.profile) {
    renderProfilesPage();
    renderProfileSlots();
  }
  if (changes.userPlan || changes.usageCount) {
    const plan  = changes.userPlan?.newValue;
    const used  = changes.usageCount?.newValue;
    if (plan !== undefined || used !== undefined) {
      chrome.storage.sync.get(['userPlan','usageCount','usageLimit'], s => {
        updatePlanUI(s.userPlan || 'free', s.usageCount || 0, s.usageLimit || PLAN_QUOTAS[s.userPlan] || 2);
      });
    }
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function showSaved(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
function openCheckout(plan) {
  chrome.tabs.create({ url: `https://snagai.netlify.app/checkout.html?plan=${plan}` });
}

// Upgrade/downgrade an existing subscription instead of opening a new checkout
async function upgradePlan(newPlan) {
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);
  if (!userEmail) {
    alert('Please add your subscription email in Settings first.');
    return;
  }

  const planLabel   = PLAN_LABELS[newPlan] || newPlan;
  const planPrices  = { starter: '$19', pro: '$39', agency: '$69' };
  const fromLabel   = PLAN_LABELS[_activePlan] || _activePlan;
  const direction   = ['starter','pro','agency'].indexOf(newPlan) > ['starter','pro','agency'].indexOf(_activePlan)
    ? 'Upgrade' : 'Downgrade';

  const confirmed = confirm(
    `${direction} from ${fromLabel} to ${planLabel} (${planPrices[newPlan] || ''}/mo)?\n\n` +
    `Your new plan takes effect immediately and will be charged on a prorated basis.`
  );
  if (!confirmed) return;

  // Show loading state on all plan buttons
  document.querySelectorAll('.pcv2-btn[data-plan]').forEach(b => { b.disabled = true; });
  const targetBtn = document.querySelector(`.pcv2-btn[data-plan="${newPlan}"]`);
  if (targetBtn) targetBtn.textContent = 'Updating…';

  try {
    const res  = await fetch(SERVER_URL + '/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, plan: newPlan })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      if (data.needsCheckout) {
        // Subscription is canceled — open a fresh checkout silently instead
        document.querySelectorAll('.pcv2-btn[data-plan]').forEach(b => { b.disabled = false; });
        openCheckout(newPlan);
        return;
      }
      alert(data.error || 'Could not update your plan. Please try again.');
      // Restore buttons
      document.querySelectorAll('.pcv2-btn[data-plan]').forEach(b => { b.disabled = false; });
      return;
    }

    // Refresh status so UI updates immediately
    await loadStatus();
  } catch(e) {
    alert('Connection error. Please check your internet and try again.');
    document.querySelectorAll('.pcv2-btn[data-plan]').forEach(b => { b.disabled = false; });
  }
}
function getSkillsArr(profile) {
  if (!profile) return [];
  if (Array.isArray(profile.skillsArr) && profile.skillsArr.length) return profile.skillsArr;
  if (typeof profile.skills === 'string' && profile.skills.trim())
    return profile.skills.split(',').map(s => s.trim()).filter(Boolean);
  if (Array.isArray(profile.skills) && profile.skills.length) return profile.skills;
  return [];
}

// ── Billing date helpers ──────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

// ── Status / plan UI ──────────────────────────────────────────────────────────
function updatePlanUI(plan, used, quota, billing = {}) {
  const rem = Math.max(0, quota - used);
  const pct = Math.min(100, (used / quota) * 100);
  const label = PLAN_LABELS[plan] || 'Free';

  // Sidebar widget
  const badge = document.getElementById('sb-plan-badge');
  badge.textContent = label;
  badge.className   = 'sb-plan-badge badge-' + plan;
  document.getElementById('sb-remaining').textContent = rem + ' left';
  document.getElementById('sb-count').textContent     = used + ' / ' + quota + ' used';
  document.getElementById('sb-bar').style.width       = pct + '%';

  // Usage stats — proposals card
  const planBadgeEl = document.getElementById('ud-plan-badge');
  if (planBadgeEl) { planBadgeEl.textContent = label; planBadgeEl.className = 'us-plan-badge badge-' + plan; }
  const remEl = document.getElementById('ud-proposals-rem');
  if (remEl) remEl.textContent = rem;
  const usedEl = document.getElementById('ud-used');
  if (usedEl) usedEl.textContent = used;
  const limEl = document.getElementById('ud-limit');
  if (limEl) limEl.textContent = quota;
  const barEl = document.getElementById('ud-bar');
  if (barEl) {
    barEl.style.width = pct + '%';
    barEl.style.background = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--yellow)' : '';
  }
  const _ue = document.getElementById('ud-urgency');
  if (_ue) {
    let msg='', cls='ud-urgency';
    if (pct>=100)    { msg='Out of proposals — upgrade to keep applying.'; cls+=' ud-danger'; }
    else if(pct>=90) { msg='Only '+rem+' left this month.'; cls+=' ud-danger'; }
    else if(pct>=70) { msg=used+' used · '+rem+' remaining.'; cls+=' ud-warn'; }
    _ue.textContent=msg; _ue.className=cls;
  }

  // Show next reset date in proposals card footnote
  const resetEl = document.getElementById('ud-reset-date');
  if (resetEl) {
    const resetIso = billing.cancelsAt || billing.nextBilledAt || null;
    resetEl.textContent = resetIso ? fmtDate(resetIso) : 'monthly';
    resetEl.style.color = (billing.subscriptionStatus === 'canceling') ? '#facc15' : 'inherit';
  }

  // Usage stats — profiles card
  chrome.storage.local.get(['registeredProfiles'], d => {
    const profiles = (d.registeredProfiles || []).filter(p => p && p.url);
    const profilesUsed  = profiles.length;
    const profilesLimit = PLAN_LIMITS[plan] || 1;
    const profilesPct   = Math.min(100, (profilesUsed / profilesLimit) * 100);
    const puEl = document.getElementById('ud-profiles-used');
    if (puEl) puEl.textContent = profilesUsed;
    const plEl = document.getElementById('ud-profiles-limit');
    if (plEl) plEl.textContent = profilesLimit;
    const pbEl = document.getElementById('ud-profiles-bar');
    if (pbEl) pbEl.style.width = profilesPct + '%';
  });

  // Plan cards — reset all
  document.querySelectorAll('.pcv2-card').forEach(c => {
    c.classList.remove('current');
    const btn = c.querySelector('.pcv2-btn[data-plan]');
    if (btn) {
      const p = btn.dataset.plan;
      const btnLabels = { starter:'Get Starter →', pro:'Get Pro →', agency:'Get Agency →' };
      btn.textContent = btnLabels[p] || 'Upgrade →';
      btn.disabled    = false;
      btn.className   = 'pcv2-btn ' + (p === 'pro' ? 'pcv2-btn-gold' : 'pcv2-btn-outline');
    }
  });
  // Track plan + subscription status so plan buttons route to upgrade vs checkout correctly
  _activePlan         = plan;
  _subscriptionStatus = billing.subscriptionStatus || 'active';

  // Mark active plan card
  const activeCard = document.getElementById('plan-' + plan);
  if (activeCard && plan !== 'free') {
    activeCard.classList.add('current');
    const btn = activeCard.querySelector('.pcv2-btn[data-plan]');
    if (btn) {
      btn.textContent = '✓ Current plan';
      btn.disabled    = true;
      btn.className   = 'pcv2-btn pcv2-btn-current';
    }
  }

  // Billing card — only for paid plans
  renderBillingCard(plan, used, quota, billing);
}

// ── Billing card ──────────────────────────────────────────────────────────────
const SERVER_URL = 'https://prowise-4e5t.onrender.com';

function renderBillingCard(plan, used, quota, billing) {
  const wrap = document.getElementById('billing-card-wrap');
  if (!wrap) return;

  // Hide for free users — show for any paid plan regardless of date data
  if (plan === 'free') {
    wrap.innerHTML = '';
    // Reset plan section title for free users
    const titleEl = document.getElementById('plan-section-title');
    if (titleEl) titleEl.textContent = 'Choose a plan';
    return;
  }

  // Update plan section title for paid users
  const titleEl = document.getElementById('plan-section-title');
  if (titleEl) titleEl.textContent = 'Upgrade your plan';

  const planPrices        = { starter: '$19', pro: '$39', agency: '$69' };
  const planLabel         = PLAN_LABELS[plan] || plan;
  const price             = planPrices[plan]  || '';
  const subStatus         = billing.subscriptionStatus || (billing.active !== false ? 'active' : 'canceled');
  const isCanceling       = subStatus === 'canceling';

  // Dates — use cancels_at for canceling subs, next_billed_at for active
  const hasBillingDates   = !!(billing.nextBilledAt);
  const hasCancelDate     = !!(billing.cancelsAt);
  const periodStart       = fmtDate(billing.currentPeriodStart);

  // For canceling: show access end date; for active: show renewal date
  const keyDate           = isCanceling ? billing.cancelsAt : billing.nextBilledAt;
  const keyDateFmt        = fmtDate(keyDate);
  const days              = daysUntil(keyDate);

  const daysHtml = (keyDate && days !== null)
    ? (days <= 0
        ? '<span class="bc-days bc-days-due">Ends today</span>'
        : days <= 7
          ? `<span class="bc-days bc-days-soon">${days} day${days===1?'':'s'} left</span>`
          : `<span class="bc-days">${days} days left</span>`)
    : '';

  // Status badge
  let statusHtml;
  if (isCanceling) {
    statusHtml = `<span class="bc-status bc-canceling"><span class="bc-status-dot"></span>Cancels ${keyDateFmt}</span>`;
  } else if (subStatus === 'canceled') {
    statusHtml = '<span class="bc-status bc-canceled"><span class="bc-status-dot"></span>Canceled</span>';
  } else {
    statusHtml = '<span class="bc-status bc-active"><span class="bc-status-dot"></span>Active</span>';
  }

  // ── 3-column stats strip ─────────────────────────────────────────────────
  let statsHtml;

  if (isCanceling && hasCancelDate) {
    const daysVal = days !== null
      ? (days <= 0 ? '<span class="bc-sval bc-sval-red">Today</span>'
        : days <= 7 ? `<span class="bc-sval bc-sval-amber">${days} day${days===1?'':'s'}</span>`
        : `<span class="bc-sval">${days} days</span>`)
      : '<span class="bc-sval">—</span>';

    statsHtml = `
      <div class="bc-stats">
        <div class="bc-stat">
          <div class="bc-slabel">Period started</div>
          <div class="bc-sval">${periodStart}</div>
        </div>
        <div class="bc-sdiv"></div>
        <div class="bc-stat">
          <div class="bc-slabel">Access ends</div>
          <div class="bc-sval bc-sval-amber">${keyDateFmt}</div>
          <div class="bc-ssub">then reverts to free</div>
        </div>
        <div class="bc-sdiv"></div>
        <div class="bc-stat">
          <div class="bc-slabel">Days remaining</div>
          ${daysVal}
          <div class="bc-ssub">of paid access</div>
        </div>
      </div>`;

  } else if (!isCanceling && hasBillingDates) {
    const daysVal = days !== null
      ? (days <= 0 ? '<span class="bc-sval bc-sval-red">Today</span>'
        : days <= 7 ? `<span class="bc-sval bc-sval-amber">${days} day${days===1?'':'s'}</span>`
        : `<span class="bc-sval">${days} days</span>`)
      : '<span class="bc-sval">—</span>';

    statsHtml = `
      <div class="bc-stats">
        <div class="bc-stat">
          <div class="bc-slabel">Current period</div>
          <div class="bc-sval">${periodStart}</div>
        </div>
        <div class="bc-sdiv"></div>
        <div class="bc-stat">
          <div class="bc-slabel">Next billing date</div>
          <div class="bc-sval bc-sval-gold">${keyDateFmt}</div>
          <div class="bc-ssub">proposals reset on this date</div>
        </div>
        <div class="bc-sdiv"></div>
        <div class="bc-stat">
          <div class="bc-slabel">Days remaining</div>
          ${daysVal}
          <div class="bc-ssub">in current cycle</div>
        </div>
      </div>`;

  } else {
    statsHtml = `
      <div class="bc-stats bc-stats-pending">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        Exact billing dates will appear here after your next renewal cycle.
      </div>`;
  }

  wrap.innerHTML = `
    <div class="billing-card">
      <div class="bc-header">
        <div class="bc-header-left">
          <div class="bc-badges-row">
            <span class="bc-plan-badge badge-${plan}">${planLabel}</span>
            ${statusHtml}
          </div>
          <div class="bc-plan-title">${planLabel} Plan <span class="bc-plan-price">${price}/mo</span></div>
          <div class="bc-plan-quota">${quota.toLocaleString()} proposals / month</div>
        </div>
        <div class="bc-header-right">
          <button class="bc-manage-btn" id="bc-manage-btn">
            Manage billing
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
        </div>
      </div>
      <div class="bc-body-divider"></div>
      ${statsHtml}
    </div>
  `;

  // Wire up manage billing button
  document.getElementById('bc-manage-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('bc-manage-btn');
    if (btn) { btn.textContent = 'Opening…'; btn.disabled = true; }

    try {
      const { userEmail } = await chrome.storage.sync.get(['userEmail']);
      if (!userEmail) {
        alert('Please add your subscription email in Settings first.');
        if (btn) { btn.innerHTML = 'Manage billing <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'; btn.disabled = false; }
        return;
      }

      const res  = await fetch(SERVER_URL + '/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
      const data = await res.json();

      if (data.url) {
        chrome.tabs.create({ url: data.url });
      } else {
        alert(data.error || 'Could not open billing portal. Try again.');
      }
    } catch(e) {
      alert('Connection error. Check your internet and try again.');
    } finally {
      const b = document.getElementById('bc-manage-btn');
      if (b) { b.innerHTML = 'Manage billing <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'; b.disabled = false; }
    }
  });
}

async function loadStatus() {
  // 1. Show cached data immediately — no blank screen
  const cached = await chrome.storage.sync.get(['userPlan','usageCount','usageLimit','userActive','nextBilledAt','currentPeriodStart']);
  const cPlan  = cached.userPlan  || 'free';
  const cUsed  = cached.usageCount || 0;
  const cQuota = cached.usageLimit || PLAN_QUOTAS[cPlan] || 2;
  updatePlanUI(cPlan, cUsed, cQuota, {
    active:              cached.userActive,
    subscriptionStatus:  cached.subscriptionStatus  || 'active',
    nextBilledAt:        cached.nextBilledAt         || null,
    currentPeriodStart:  cached.currentPeriodStart   || null,
    cancelsAt:           cached.cancelsAt            || null,
  });

  // 2. Fetch fresh from server in background
  try {
    const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (status && !status.error) {
      const plan  = status.plan  || 'free';
      const used  = status.used  || 0;
      const quota = status.limit || PLAN_QUOTAS[plan] || 2;
      await chrome.storage.sync.set({
        userPlan:            plan,
        usageCount:          used,
        usageLimit:          quota,
        userActive:          status.active !== false,
        subscriptionStatus:  status.subscriptionStatus  || 'active',
        nextBilledAt:        status.nextBilledAt         || null,
        currentPeriodStart:  status.currentPeriodStart   || null,
        cancelsAt:           status.cancelsAt            || null,
      });
      updatePlanUI(plan, used, quota, {
        active:              status.active !== false,
        subscriptionStatus:  status.subscriptionStatus  || 'active',
        nextBilledAt:        status.nextBilledAt         || null,
        currentPeriodStart:  status.currentPeriodStart   || null,
        cancelsAt:           status.cancelsAt            || null,
      });
    }
  } catch(e) { /* use cached */ }
}

// ── Email ─────────────────────────────────────────────────────────────────────
async function loadEmail() {
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);
  updateEmailUI(userEmail);
}
function updateEmailUI(email) {
  document.getElementById('email-dot').style.background = email ? '#34d399' : '#374151';
  document.getElementById('email-val').textContent      = email || 'Not set';
  document.getElementById('email-toggle').textContent   = email ? 'Change' : 'Add';
}
document.getElementById('email-toggle').addEventListener('click', () => {
  const w = document.getElementById('email-edit');
  w.style.display = w.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('email-save').addEventListener('click', async () => {
  const email = document.getElementById('email-inp').value.trim();
  if (!email.includes('@')) return;
  await chrome.storage.sync.set({ userEmail: email });
  updateEmailUI(email);
  document.getElementById('email-edit').style.display = 'none';
  showSaved('saved-urls-msg');
});

// ── Profile URL slots ─────────────────────────────────────────────────────────
async function renderProfileSlots() {
  const [_sp, _lp] = await Promise.all([
    chrome.storage.sync.get(['userPlan']),
    chrome.storage.local.get(['registeredProfiles'])
  ]);
  const userPlan           = _sp.userPlan || 'free';
  const registeredProfiles = _lp.registeredProfiles || [];
  const limit = PLAN_LIMITS[userPlan] || 1;

  // Also load full data keys to check sync status accurately
  const fullKeys  = registeredProfiles.filter(p => p?.id).map(p => 'profileFull_' + p.id);
  const fullData  = fullKeys.length ? await new Promise(r => chrome.storage.local.get(fullKeys, r)) : {};

  const slots = document.getElementById('profile-slots');
  slots.innerHTML = '';

  for (let i = 0; i < limit; i++) {
    const p      = registeredProfiles[i];
    const hasUrl = p?.url;
    const div = document.createElement('div');
    div.className = 'profile-slot';
    div.innerHTML = `
      <div class="slot-num">${i + 1}</div>
      <input class="slot-input" type="url" placeholder="https://www.upwork.com/freelancers/~..." value="${p?.url || ''}" data-slot="${i}">
      ${hasUrl ? `<button class="btn-slot-open" data-slot="${i}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Sync</button>` : ''}
    `;
    slots.appendChild(div);
  }
  slots.querySelectorAll('.btn-slot-open').forEach(btn => {
    const i = parseInt(btn.dataset.slot);
    const url = slots.querySelectorAll('.slot-input')[i]?.value;
    if (url) btn.addEventListener('click', () => chrome.tabs.create({ url }));
  });
}

document.getElementById('save-profile-urls').addEventListener('click', async () => {
  const { userPlan = 'free' } = await chrome.storage.sync.get(['userPlan']);
  const { registeredProfiles = [] } = await chrome.storage.local.get(['registeredProfiles']);
  const inputs  = document.querySelectorAll('.slot-input');
  const updated = [...registeredProfiles];
  inputs.forEach((inp, i) => {
    const url = inp.value.trim();
    if (!url) return;
    const existing = updated[i] || {};
    updated[i] = { ...existing, url, id: existing.id || ('profile_' + (i + 1)), syncEnabled: existing.syncEnabled !== false };
  });
  await chrome.storage.local.set({ registeredProfiles: updated });
  showSaved('saved-urls-msg');
  await renderProfileSlots();
  await renderProfilesPage();
});

// ── Profiles page ──────────────────────────────────────────────────────────────
async function renderProfilesPage() {
  const [syncStored, localStored] = await Promise.all([
    chrome.storage.sync.get(['userPlan']),
    chrome.storage.local.get(['registeredProfiles','activeProfileId','primaryProfileId'])
  ]);
  const userPlan = syncStored.userPlan || 'free';
  const registeredProfiles = localStored.registeredProfiles || [];
  const primaryProfileId = localStored.primaryProfileId || null;

  // Load full profile data from local storage for each registered profile
  const registered = registeredProfiles.filter(p => p && p.url);
  const localKeys  = registered.map(p => p.id ? 'profileFull_' + p.id : null).filter(Boolean);
  const localFull  = localKeys.length
    ? await new Promise(resolve => chrome.storage.local.get(localKeys, resolve))
    : {};

  // Merge: local full data overrides sync metadata (sync just has id/url/name/jss for slot display)
  const mergedProfiles = registered.map(p => {
    const full = p.id ? localFull['profileFull_' + p.id] : null;
    return full ? { ...p, ...full } : p; // local takes priority
  });
  const limit     = PLAN_LIMITS[userPlan] || 1;
  const container = document.getElementById('profiles-container');
  const noMsg     = document.getElementById('no-profiles-msg');
  const addBtn    = document.getElementById('add-profile-btn');
  container.innerHTML = '';

  if (!mergedProfiles.length) {
    noMsg.style.display = 'block';
    addBtn.style.display = 'none';
    return;
  }
  noMsg.style.display  = 'none';
  addBtn.style.display = mergedProfiles.length < limit ? 'flex' : 'none';

  if (mergedProfiles.length === 1) {
    renderProfileCard(container, mergedProfiles[0], 0, mergedProfiles, primaryProfileId);
  } else {
    const wrap   = document.createElement('div');
    wrap.className = 'profile-slider-wrap';
    const slides = document.createElement('div');
    slides.className = 'profile-slides';
    mergedProfiles.forEach((p, i) => {
      const slide = document.createElement('div');
      slide.className = 'profile-slide' + (i === currentSlide ? ' active' : '');
      slide.id = 'slide-' + i;
      renderProfileCard(slide, p, i, mergedProfiles, primaryProfileId);
      slides.appendChild(slide);
    });
    wrap.appendChild(slides);

    // Centered slider controls: ‹  ● ● ○  ›
    const ctrl = document.createElement('div');
    ctrl.className = 'slider-controls';
    ctrl.innerHTML = `<button class="slider-arr" id="sl-prev">‹</button>`;
    mergedProfiles.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'slider-dot' + (i === currentSlide ? ' active' : '');
      dot.addEventListener('click', () => goToSlide(i));
      ctrl.appendChild(dot);
    });
    ctrl.innerHTML += `<button class="slider-arr" id="sl-next">›</button>`;
    wrap.appendChild(ctrl);
    container.appendChild(wrap);

    document.getElementById('sl-prev')?.addEventListener('click', () => goToSlide(Math.max(0, currentSlide - 1)));
    document.getElementById('sl-next')?.addEventListener('click', () => goToSlide(Math.min(registered.length - 1, currentSlide + 1)));
  }
}

function goToSlide(idx) {
  currentSlide = idx;
  document.querySelectorAll('.profile-slide').forEach((s, i) => s.classList.toggle('active', i === idx));
  document.querySelectorAll('.slider-dot').forEach((d, i)  => d.classList.toggle('active', i === idx));
}

function renderProfileCard(container, profile, idx, allProfiles, primaryProfileId) {
  const card = document.createElement('div');
  card.className = 'profile-card';
  card.dataset.profileIdx = idx;

  const synced       = !!(profile.name || profile.jss || profile._readAt);
  const avatarLetter = (profile.name || '?').charAt(0).toUpperCase();
  const syncChecked  = profile.syncEnabled !== false;
  const validProfiles = allProfiles.filter(p => p && p.url);
  // A profile is primary if: explicitly set, or it's the only one, or it's first and nothing set
  const isPrimary    = validProfiles.length <= 1
    ? true
    : (primaryProfileId
        ? profile.id === primaryProfileId
        : idx === 0);
  const readAt       = profile._readAt
    ? new Date(profile._readAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const skillsArr    = getSkillsArr(profile);
  const portfolios   = profile.portfolios || [];

  // ── Tier badge ────────────────────────────────────────────────────────────
  const tierClasses = { expert:'tier-expert', top_rated_plus:'tier-top_rated_plus', top_rated:'tier-top_rated', rising:'tier-rising' };
  const tierClass   = tierClasses[profile.tierKey] || 'tier-new';
  const tierIcons   = { expert:'⚡', top_rated_plus:'⭐', top_rated:'✦', rising:'🚀' };
  const tierIcon    = tierIcons[profile.tierKey] || '';
  const tierHtml    = tierClass !== 'tier-new'
    ? `<div class="tier-badge ${tierClass}">${tierIcon} ${profile.tier || ''}</div>` : '';

  // ── Pending (not synced yet) ───────────────────────────────────────────────
  if (!synced) {
    card.innerHTML = `
      <div class="profile-card-hdr">
        <div class="profile-avatar profile-avatar-pending">?</div>
        <div class="profile-info">
          <div class="profile-name" style="color:var(--white3)">Not synced yet</div>
          <div class="profile-meta" style="font-size:10px;word-break:break-all">${profile.url}</div>
        </div>
        <div class="profile-actions">
          <button class="btn-delete" title="Remove">×</button>
        </div>
      </div>
      <div class="pending-body">
        <div class="pending-icon">🔄</div>
        <div class="pending-title">One more step</div>
        <div class="pending-desc">Click below to open your Upwork profile. Snag AI will automatically read your data when the page loads.</div>
        <button class="btn-primary" id="open-pending-${idx}" style="margin-top:4px">Open my Upwork profile →</button>
      </div>
    `;
    card.querySelector(`#open-pending-${idx}`)?.addEventListener('click', () => chrome.tabs.create({ url: profile.url }));
    card.querySelector('.btn-delete')?.addEventListener('click', () => {
      if (!confirm('Remove this profile?')) return;
      const removedId = profile.id;
      allProfiles.splice(idx, 1);
      chrome.storage.local.set({ registeredProfiles: allProfiles });
      if (removedId) chrome.storage.local.remove('profileFull_' + removedId);
      renderProfilesPage();
    });
    container.appendChild(card);
    return;
  }

  // ── Profile Strength ────────────────────────────────────────────────────────
  (function() {
    let sc = 0, reasons = [], gaps = [];
    const bioL    = (profile.bio||'').trim().length;
    const jssN    = parseInt(String(profile.jss||'0').replace(/[^0-9]/g,'')) || 0;
    const portsOk = (portfolios||[]).filter(p => p.urls && p.urls.some(u => u && u.trim())).length;
    if (bioL > 150)         { sc += 20; reasons.push('Detailed bio ('+bioL+' chars)'); }
    else if (bioL > 50)     { sc += 10; gaps.push('Expand bio to 150+ chars'); }
    else                    {           gaps.push('Add a bio to your profile'); }
    if (skillsArr.length >= 8) { sc += 20; reasons.push(skillsArr.length + ' skills synced'); }
    else if (skillsArr.length > 0) { sc += 10; gaps.push('Sync more skills from Upwork'); }
    else                    {           gaps.push('Visit Upwork profile to sync skills'); }
    if (portsOk >= 3)       { sc += 30; reasons.push(portsOk + ' portfolio links'); }
    else if (portsOk > 0)   { sc += portsOk * 10; gaps.push('Add ' + (3-portsOk) + ' more portfolio links'); }
    else                    {           gaps.push('Add portfolio links'); }
    if (jssN >= 90)         { sc += 15; reasons.push(jssN + '% JSS'); }
    else if (jssN > 0)      { sc += 8;  gaps.push('Improve JSS above 90%'); }
    if ((profile.title||'').trim().length > 5) { sc += 10; reasons.push('Title set'); }
    else                    {           gaps.push('Add your professional title'); }
    if (profile.hourlyRate) { sc += 5; }
    sc = Math.min(100, sc);
    const col = sc >= 80 ? '#4ade80' : sc >= 55 ? '#e8a020' : '#f87171';
    const lbl = sc >= 80 ? 'Strong' : sc >= 55 ? 'Good' : 'Needs work';
    const reasonsHtml = reasons.length
      ? '<div class="ps-reasons">' + reasons.map(r => '<span class="ps-reason">✓ ' + r + '</span>').join('') + '</div>'
      : '';
    const gapsHtml = gaps.length
      ? '<div class="ps-gaps">' + gaps.slice(0,2).map(g => '<span class="ps-gap">↗ ' + g + '</span>').join('') + '</div>'
      : '';
    card._psHtml = '<div class="ps-wrap">'
      + '<div class="ps-header"><span class="ps-title">Profile Strength</span>'
      + '<span class="ps-score" style="color:' + col + '">' + sc + '% · ' + lbl + '</span></div>'
      + '<div class="ps-track"><div class="ps-fill" style="width:' + sc + '%;background:' + col + '"></div></div>'
      + reasonsHtml + gapsHtml + '</div>';
  })();
  const psHtml = card._psHtml || '';

  // ── Synced profile card ────────────────────────────────────────────────────
  card.innerHTML = `
    <div class="profile-card-hdr">
      <div class="profile-avatar">${avatarLetter}</div>
      <div class="profile-info">
        <div class="profile-name-row">
          <span class="profile-name">${profile.name || 'Unknown'}</span>
          ${isPrimary && validProfiles.length > 1 ? '<span class="badge-primary">★ Primary</span>' : ''}
        </div>
        <div class="profile-meta">
          ${[profile.tier || '', profile.jss ? profile.jss + ' JSS' : ''].filter(Boolean).join(' · ')}
          ${readAt ? `<span style="opacity:.5"> · Synced ${readAt}</span>` : ''}
        </div>
        <div class="profile-actions">
          ${!isPrimary && validProfiles.length > 1 ? `<button class="btn-set-primary" id="btn-primary-${idx}">Set primary</button>` : ''}
        </div>
      </div>
      <button class="btn-delete" title="Remove profile" style="margin-top:2px">×</button>
    </div>

    ${psHtml}
    <div class="profile-body">
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">${profile.jss || '—'}</div><div class="stat-lbl">JSS</div></div>
        <div class="stat-box"><div class="stat-val">${profile.rate || '—'}</div><div class="stat-lbl">Rate</div></div>
        <div class="stat-box"><div class="stat-val">${profile.jobs || '—'}</div><div class="stat-lbl">Jobs</div></div>
        <div class="stat-box"><div class="stat-val">${profile.earnings || '—'}</div><div class="stat-lbl">Earned</div></div>
      </div>
      ${tierHtml}

      <div class="edit-row"><span class="edit-lbl">Title</span><textarea class="edit-val" data-field="title" rows="2">${profile.title || ''}</textarea></div>
      <div class="edit-row"><span class="edit-lbl">Bio</span><textarea class="edit-val" rows="3" data-field="bio">${profile.bio || ''}</textarea></div>
      <div class="edit-row"><span class="edit-lbl">Country</span><input class="edit-val" type="text" data-field="country" value="${profile.country || ''}"></div>
      <div class="edit-row"><span class="edit-lbl">Availability</span><textarea class="edit-val" rows="2" data-field="extra" placeholder="e.g. Available 30+ hrs/week · Pakistan">${profile.extra || ''}</textarea></div>

      <!-- Skills -->
      <div class="profile-section">
        <div class="profile-section-hdr">
          <span class="profile-section-title">Skills</span>
          <span class="profile-section-count">${skillsArr.length} detected</span>
        </div>
        <div class="skills-wrap" id="skills-wrap-${idx}"></div>
        <div style="font-size:11px;color:var(--white3);margin-top:6px">Read automatically from your Upwork profile.</div>
      </div>

      <!-- Portfolio -->
      <div class="profile-section">
        <div class="portfolio-section-hdr">
          <span class="profile-section-title">Portfolio <span style="font-weight:400;opacity:.6">(${portfolios.length})</span></span>
          <div style="display:flex;align-items:center;gap:8px">
            ${profile._portfolioSyncedAt
              ? `<span style="font-size:10px;color:var(--white3)">Synced ${new Date(profile._portfolioSyncedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>`
              : `<span style="font-size:10px;color:var(--yellow)">⚠ Not synced</span>`}
            <button class="btn-sync-portfolios" id="sync-port-${idx}">⟳ Sync portfolios</button>
            <button class="btn-port-add" data-action="add-port">+ Add</button>
          </div>
        </div>
        <div class="port-grid" id="port-list-${idx}"></div>
        ${!portfolios.length ? `<div class="port-empty-msg">No portfolio items yet. Add them manually or visit your Upwork profile page.</div>` : ''}
      </div>
    </div>

  `;

  // Attach skills expand/collapse
  renderSkillsExpand(card.querySelector(`#skills-wrap-${idx}`), skillsArr);

  // Render portfolio items
  const portList = card.querySelector(`#port-list-${idx}`);
  portfolios.forEach((p, pi) => renderPortfolioItem(portList, p, pi, allProfiles, idx));

  // Set primary button — stores choice in chrome.storage.local (device-local)
  card.querySelector(`#btn-primary-${idx}`)?.addEventListener('click', () => {
    const profileId = profile.id || ('profile_' + (idx + 1));
    chrome.runtime.sendMessage({ type: 'SET_PRIMARY_PROFILE', profileId }, () => {
      renderProfilesPage(); // re-render to show updated primary badge
    });
  });

  // Sync portfolios button — sets flag then opens profile URL
  card.querySelector(`#sync-port-${idx}`)?.addEventListener('click', () => {
    if (!profile.id || !profile.url) return;
    const btn = card.querySelector(`#sync-port-${idx}`);
    if (btn) { btn.textContent = 'Opening…'; btn.disabled = true; }
    chrome.storage.local.set({ ['portfolioSync_' + profile.id]: true }, () => {
      chrome.tabs.create({ url: profile.url });
      setTimeout(() => { if (btn) { btn.textContent = '⟳ Sync portfolios'; btn.disabled = false; } }, 3000);
    });
  });



  // Delete profile — also wipe local full data
  card.querySelector('.btn-delete')?.addEventListener('click', () => {
    if (!confirm('Remove this profile?')) return;
    const removedId = profile.id;
    allProfiles.splice(idx, 1);
    chrome.storage.local.set({ registeredProfiles: allProfiles });
    if (removedId) chrome.storage.local.remove('profileFull_' + removedId);
    renderProfilesPage();
  });

  // Add portfolio
  card.querySelector('[data-action="add-port"]')?.addEventListener('click', () => {
    const newItem = { title: '', urls: [], desc: '', _manual: true };
    allProfiles[idx].portfolios = allProfiles[idx].portfolios || [];
    allProfiles[idx].portfolios.push(newItem);
    const pi = allProfiles[idx].portfolios.length - 1;
    // Remove empty state msg if present
    portList.querySelector('.port-empty-msg')?.remove();
    renderPortfolioItem(portList, newItem, pi, allProfiles, idx, true);
  });

  // Save card
  // Auto-save on blur of any editable field
  card.querySelectorAll('.edit-val').forEach(el => el.addEventListener('blur', () => saveCard(card, idx, allProfiles)));

  container.appendChild(card);
}

// ── Skills expand/collapse ────────────────────────────────────────────────────
function renderSkillsExpand(wrap, skillsArr, expanded) {
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!skillsArr.length) {
    wrap.innerHTML = '<span class="skills-hint">No skills found — visit your Upwork profile to sync.</span>';
    return;
  }
  const visible = expanded ? skillsArr : skillsArr.slice(0, SKILLS_SHOW);
  visible.forEach(s => {
    const chip = document.createElement('span');
    chip.className = 'skill-chip';
    chip.textContent = s;
    wrap.appendChild(chip);
  });
  if (skillsArr.length > SKILLS_SHOW) {
    const btn = document.createElement('button');
    btn.className = 'skills-toggle';
    if (!expanded) {
      btn.textContent = `+${skillsArr.length - SKILLS_SHOW} more`;
      btn.addEventListener('click', () => renderSkillsExpand(wrap, skillsArr, true));
    } else {
      btn.textContent = 'Show less';
      btn.addEventListener('click', () => renderSkillsExpand(wrap, skillsArr, false));
    }
    wrap.appendChild(btn);
  }
}

// HTML escape helper — prevents broken innerHTML when text has < > & chars
function _esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Portfolio item renderer — compact 3-per-row + expandable edit ────────────
function renderPortfolioItem(list, p, pi, allProfiles, profileIdx, autoOpen) {
  const hasLinks = p.urls && p.urls.some(u => u.trim());
  // Skills: handle both array and comma-separated string (older storage format)
  const skills = Array.isArray(p.skills)
    ? p.skills
    : (typeof p.skills === 'string' && p.skills.trim())
      ? p.skills.split(',').map(s => s.trim()).filter(Boolean)
      : [];
  const item     = document.createElement('div');
  item.className = 'port-item ' + (hasLinks ? 'has-url' : 'no-url');
  item.dataset.pi         = pi;
  item.dataset.portSkills = JSON.stringify(skills); // always array, even if stored as string
  item.dataset.portRole   = p.role || '';

  // Freshness
  const syncTs   = (allProfiles[profileIdx]?._portfolioSyncedAt) || 0;
  const syncAge  = syncTs ? Math.floor((Date.now() - syncTs) / 86400000) : null;
  const freshBdg = p._autoRead && syncAge !== null
    ? (syncAge > 30 ? '<span class="port-stale-badge">⚠ Re-sync</span>' : '<span class="port-fresh-badge">✓ Synced</span>')
    : '';

  const urlsHtml = (p.urls && p.urls.length ? p.urls : ['']).map(u =>
    '<div class="port-url-row"><input type="url" class="port-url-inp" value="' + _esc(u) + '" placeholder="https://apps.apple.com/..."><button class="btn-url-del">×</button></div>'
  ).join('');

  const firstUrl  = hasLinks ? (p.urls||[]).find(u=>u.trim()) : null;
  const urlDomain = firstUrl ? firstUrl.replace(/^https?:\/\//, '').split('/')[0] : '';

  const skillsChips = skills.length
    ? skills.slice(0,3).map(s=>'<span class="port-skill-tag">'+_esc(s)+'</span>').join('') + (skills.length>3?'<span class="port-skill-more-badge">+' + (skills.length-3) + ' more</span>':'')
    : '<span class="port-no-skills">No skills</span>';

  const urlChips = hasLinks
    ? '<div class="port-url-chips">' + (p.urls||[]).filter(u=>u.trim()).map(u=>'<a href="' + (u.startsWith('http')?u:'https://'+u) + '" target="_blank" class="port-url-chip">' + u.replace(/^https?:\/\//, '').slice(0,30) + '</a>').join('') + '</div>'
    : '';

  const skillsReadonly = skills.length
    ? skills.map(s=>'<span class="port-skill-tag-all">'+_esc(s)+'</span>').join('')
    : '<span style="font-size:11px;color:var(--white3)">Sync from Upwork profile.</span>';

  item.innerHTML =
    '<div class="port-compact">' +
      '<div class="port-compact-head">' +
        '<span class="port-compact-dot ' + (hasLinks?'ok':'warn') + '"></span>' +
        '<span class="port-compact-name">' + _esc(p.title || 'Untitled') + '</span>' +
        freshBdg +
        '<button class="btn-port-edit">Edit</button>' +
        '<button class="btn-port-del">×</button>' +
      '</div>' +
      '<div class="port-compact-meta">' +
        '<div class="port-skill-tags">' + skillsChips + '</div>' +
        (p.desc ? '<div class="port-compact-desc">' + _esc(p.desc) + '</div>' : '') +
        (urlDomain ? '<div class="port-compact-url">🔗 ' + _esc(urlDomain) + '</div>' : '<div class="port-compact-url muted">No link</div>') +
        urlChips +
      '</div>' +
    '</div>' +
    '<div class="port-edit-body" style="display:none">' +
      '<div class="field"><label>Project name</label>' +
        '<input type="text" class="port-title-inp" value="' + (p.title||'') + '" placeholder="e.g. Shypie iOS App"></div>' +
      '<div class="field"><label>Links</label>' +
        '<div class="port-urls-list">' + urlsHtml + '</div>' +
        '<button class="btn-url-add">+ Add link</button></div>' +
      '<div class="field"><label>Description</label>' +
        '<input type="text" class="port-desc-inp" value="' + (p.desc||'') + '" placeholder="e.g. Live, 10k+ downloads"></div>' +
      '<div class="field"><label>Skills <span style="font-size:10px;font-weight:400;opacity:.5">(auto-synced)</span></label>' +
        '<div class="port-skills-readonly">' + skillsReadonly + '</div></div>' +
      '<div class="port-edit-footer"><button class="btn-port-done">✓ Done</button></div>' +
    '</div>';

  const editBody = item.querySelector('.port-edit-body');
  const editBtn  = item.querySelector('.btn-port-edit');

  const openEdit = () => {
    list.querySelectorAll('.port-item.expanded').forEach(el => {
      if (el !== item) {
        el.classList.remove('expanded');
        el.querySelector('.port-edit-body').style.display = 'none';
        el.querySelector('.btn-port-edit').textContent = 'Edit';
      }
    });
    item.classList.add('expanded');
    editBody.style.display = 'block';
    editBtn.textContent = 'Close';
    item.querySelector('.port-title-inp')?.focus();
  };
  const closeEdit = () => {
    item.classList.remove('expanded');
    editBody.style.display = 'none';
    editBtn.textContent = 'Edit';
  };

  editBtn.addEventListener('click', () => editBody.style.display !== 'none' ? closeEdit() : openEdit());
  item.querySelector('.btn-port-done').addEventListener('click', closeEdit);

  item.querySelector('.btn-port-del').addEventListener('click', () => {
    allProfiles[profileIdx]?.portfolios?.splice(pi, 1);
    item.remove();
  });

  item.querySelector('.btn-url-add').addEventListener('click', () => {
    const ul = item.querySelector('.port-urls-list');
    const row = document.createElement('div'); row.className = 'port-url-row';
    row.innerHTML = '<input type="url" class="port-url-inp" placeholder="https://..."><button class="btn-url-del">×</button>';
    row.querySelector('.btn-url-del').addEventListener('click', () => {
      if (ul.querySelectorAll('.port-url-row').length > 1) row.remove();
    });
    ul.appendChild(row); row.querySelector('input')?.focus();
  });
  item.querySelectorAll('.btn-url-del').forEach(btn => btn.addEventListener('click', () => {
    const ul = item.querySelector('.port-urls-list');
    if (ul.querySelectorAll('.port-url-row').length > 1) btn.closest('.port-url-row')?.remove();
  }));

  list.appendChild(item);
  if (autoOpen) openEdit();
}

// ── Save card ─────────────────────────────────────────────────────────────────
function saveCard(card, idx, allProfiles) {
  const profile = allProfiles[idx];
  if (!profile?.id) return;

  const title   = card.querySelector('[data-field="title"]')?.value?.trim()   || '';
  const bio     = card.querySelector('[data-field="bio"]')?.value?.trim()     || '';
  const country = card.querySelector('[data-field="country"]')?.value?.trim() || '';
  const extra   = card.querySelector('[data-field="extra"]')?.value?.trim()   || '';

  // Collect only user-editable fields from DOM — do NOT read skills/role from DOM
  const domPorts = [...card.querySelectorAll('.port-item')].map(el => ({
    _pi:   parseInt(el.dataset.pi) || 0,
    title: el.querySelector('.port-title-inp')?.value?.trim() || '',
    urls:  [...el.querySelectorAll('.port-url-inp')].map(i => i.value.trim()).filter(Boolean),
    desc:  el.querySelector('.port-desc-inp')?.value?.trim()  || '',
  }));

  const localKey = 'profileFull_' + profile.id;

  // Load current storage first — then MERGE: preserve skills/role/metadata from storage
  chrome.storage.local.get([localKey], (localData) => {
    const existing     = localData[localKey] || profile;
    const storedPorts  = existing.portfolios || [];

    // Merge: use storage portfolio as base (keeps skills, role, _autoRead, urls etc.)
    // Override only the user-editable fields with what's in the DOM
    const portfolios = domPorts
      .filter(d => d.title || d.urls.length)
      .map(d => {
        // Match stored portfolio by index (pi) which was set when page rendered
        const stored = storedPorts[d._pi] || {};
        return {
          ...stored,         // preserve: skills, role, _autoRead, and any other synced fields
          title: d.title || stored.title || '',
          urls:  d.urls.length  ? d.urls  : (stored.urls  || []),
          desc:  d.desc  !== '' ? d.desc  : (stored.desc  || ''),
        };
      });

    const updated = { ...existing, title, bio, country, extra, portfolios };
    chrome.storage.local.set({ [localKey]: updated }, () => {
      // Update in-memory allProfiles to stay consistent
      if (allProfiles[idx]) allProfiles[idx].portfolios = portfolios;
      showSaved('saved-card-' + idx);
    });
  });
}

// ── Navigation shortcuts ──────────────────────────────────────────────────────
// Helper: close dropdown and restore button
function closeAddProfilePanel() {
  const panel = document.getElementById('apd-panel');
  if (panel) panel.style.display = 'none';
  const btn = document.getElementById('add-profile-btn');
  if (btn) btn.textContent = 'Manage Profile';
}

document.getElementById('add-profile-btn')?.addEventListener('click', () => {
  const panel = document.getElementById('apd-panel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  if (isOpen) {
    // Closing — save first, then close
    document.getElementById('save-profile-urls')?.click();
    setTimeout(closeAddProfilePanel, 300);
  } else {
    panel.style.display = 'block';
    document.getElementById('add-profile-btn').textContent = '✕ Close';
  }
});
document.getElementById('goto-sub-btn')?.addEventListener('click',    () => switchSection('subscription'));

// ── Plan cards — click animation + checkout / upgrade ────────────────────────
document.querySelectorAll('.pcv2-card').forEach(card => {
  card.addEventListener('click', () => {
    card.classList.remove('plan-selecting');
    void card.offsetWidth; // force reflow to restart animation
    card.classList.add('plan-selecting');
    setTimeout(() => card.classList.remove('plan-selecting'), 600);
  });
});
document.querySelectorAll('.pcv2-btn[data-plan]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const targetPlan = btn.dataset.plan;
    // Only upgrade/downgrade if the subscription is genuinely active (not canceling or canceled).
    // Canceling users have no patchable Paddle subscription — send them through fresh checkout.
    // When they complete it, subscription.created clears cancels_at and sets the new plan.
    const canUpgrade = _activePlan !== 'free' && _subscriptionStatus === 'active';
    if (canUpgrade) {
      upgradePlan(targetPlan);
    } else {
      openCheckout(targetPlan);
    }
  });
});

// ── Settings — option card pickers ───────────────────────────────────────────
function initOptionPicker(containerId, hiddenId) {
  const container = document.getElementById(containerId);
  const hidden    = document.getElementById(hiddenId);
  if (!container || !hidden) return;
  container.querySelectorAll('.st-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      container.querySelectorAll('.st-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      hidden.value = opt.dataset.val;
    });
  });
}
initOptionPicker('st-tone-opts',   'tone');
initOptionPicker('st-length-opts', 'length');

function applySettingsToUI(settings) {
  const tone   = settings?.tone   || 'professional';
  const length = settings?.length || 'medium';
  const toneC  = document.getElementById('st-tone-opts');
  const lenC   = document.getElementById('st-length-opts');
  if (toneC) {
    toneC.querySelectorAll('.st-opt').forEach(o => o.classList.toggle('active', o.dataset.val === tone));
    const toneHidden = document.getElementById('tone');
    if (toneHidden) toneHidden.value = tone;
  }
  if (lenC) {
    lenC.querySelectorAll('.st-opt').forEach(o => o.classList.toggle('active', o.dataset.val === length));
    const lenHidden = document.getElementById('length');
    if (lenHidden) lenHidden.value = length;
  }
}

document.getElementById('save-settings')?.addEventListener('click', async () => {
  await chrome.storage.sync.set({ settings: {
    tone:   document.getElementById('tone')?.value   || 'professional',
    length: document.getElementById('length')?.value || 'medium',
  }});
  showSaved('saved-settings-msg');
});

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  // Load cached data first (instant render), then server in parallel
  loadStatus();     // async — shows cached immediately, fetches fresh in background
  loadEmail();      // instant from storage
  renderProfileSlots();
  renderProfilesPage();

  const { settings = {} } = await chrome.storage.sync.get(['settings']);
  applySettingsToUI(settings);
}

init();
