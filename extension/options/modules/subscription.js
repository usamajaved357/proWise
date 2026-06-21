// ── Subscription: status, plan UI, billing card, upgrade ─────────────────────
import { SERVER_URL, PLAN_LABELS, PLAN_QUOTAS, PLAN_LIMITS } from './config.js';
import { state } from './state.js';
import { fmtDate, daysUntil, showSaved } from './helpers.js';

export async function openCheckout(plan) {
  const { userEmail, emailVerified } = await chrome.storage.sync.get(['userEmail', 'emailVerified']);
  if (!userEmail || !emailVerified) {
    alert('Please verify your email in Settings → Account before purchasing. This keeps your account secure.');
    return;
  }
  chrome.tabs.create({ url: `https://snagai.netlify.app/checkout.html?plan=${plan}` });
}

export async function upgradePlan(newPlan) {
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);
  if (!userEmail) {
    alert('Please add your subscription email in Settings first.');
    return;
  }

  const planLabel  = PLAN_LABELS[newPlan] || newPlan;
  const planPrices = { starter: '$19', pro: '$39', agency: '$69' };
  const fromLabel  = PLAN_LABELS[state.activePlan] || state.activePlan;
  const direction  = ['starter','pro','agency'].indexOf(newPlan) > ['starter','pro','agency'].indexOf(state.activePlan)
    ? 'Upgrade' : 'Downgrade';

  const confirmed = confirm(
    `${direction} from ${fromLabel} to ${planLabel} (${planPrices[newPlan] || ''}/mo)?\n\n` +
    `Your new plan takes effect immediately and will be charged on a prorated basis.`
  );
  if (!confirmed) return;

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
        document.querySelectorAll('.pcv2-btn[data-plan]').forEach(b => { b.disabled = false; });
        openCheckout(newPlan);
        return;
      }
      alert(data.error || 'Could not update your plan. Please try again.');
      document.querySelectorAll('.pcv2-btn[data-plan]').forEach(b => { b.disabled = false; });
      return;
    }

    await loadStatus();
  } catch(e) {
    alert('Connection error. Please check your internet and try again.');
    document.querySelectorAll('.pcv2-btn[data-plan]').forEach(b => { b.disabled = false; });
  }
}

export function updatePlanUI(plan, used, quota, billing = {}) {
  const rem   = Math.max(0, quota - used);
  const pct   = Math.min(100, (used / quota) * 100);
  const label = PLAN_LABELS[plan] || 'Free';

  const badge = document.getElementById('sb-plan-badge');
  badge.textContent = label;
  badge.className   = 'sb-plan-badge badge-' + plan;
  document.getElementById('sb-remaining').textContent = rem + ' left';
  document.getElementById('sb-count').textContent     = used + ' / ' + quota + ' used';
  document.getElementById('sb-bar').style.width       = pct + '%';

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
    let msg = '', cls = 'ud-urgency';
    if (pct >= 100)    { msg = 'Out of proposals — upgrade to keep applying.'; cls += ' ud-danger'; }
    else if (pct >= 90) { msg = 'Only ' + rem + ' left this month.'; cls += ' ud-danger'; }
    else if (pct >= 70) { msg = used + ' used · ' + rem + ' remaining.'; cls += ' ud-warn'; }
    _ue.textContent = msg; _ue.className = cls;
  }

  const resetEl = document.getElementById('ud-reset-date');
  if (resetEl) {
    const resetIso = billing.cancelsAt || billing.nextBilledAt || null;
    resetEl.textContent = resetIso ? fmtDate(resetIso) : 'monthly';
    resetEl.style.color = (billing.subscriptionStatus === 'canceling') ? '#facc15' : 'inherit';
  }

  chrome.storage.local.get(['registeredProfiles'], d => {
    const profiles      = (d.registeredProfiles || []).filter(p => p && p.url);
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

  state.activePlan         = plan;
  state.subscriptionStatus = billing.subscriptionStatus || 'active';

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

  renderBillingCard(plan, used, quota, billing);
}

export function renderBillingCard(plan, used, quota, billing) {
  const wrap = document.getElementById('billing-card-wrap');
  if (!wrap) return;

  if (plan === 'free') {
    wrap.innerHTML = '';
    const titleEl = document.getElementById('plan-section-title');
    if (titleEl) titleEl.textContent = 'Choose a plan';
    return;
  }

  const titleEl = document.getElementById('plan-section-title');
  if (titleEl) titleEl.textContent = 'Upgrade your plan';

  const planPrices  = { starter: '$19', pro: '$39', agency: '$69' };
  const planLabel   = PLAN_LABELS[plan] || plan;
  const price       = planPrices[plan]  || '';
  const subStatus   = billing.subscriptionStatus || (billing.active !== false ? 'active' : 'canceled');
  const isCanceling = subStatus === 'canceling';

  const hasBillingDates   = !!(billing.nextBilledAt);
  const hasCancelDate     = !!(billing.cancelsAt);
  const periodStart       = fmtDate(billing.currentPeriodStart);
  const keyDate           = isCanceling ? billing.cancelsAt : billing.nextBilledAt;
  const keyDateFmt        = fmtDate(keyDate);
  const days              = daysUntil(keyDate);

  let statusHtml;
  if (isCanceling) {
    statusHtml = `<span class="bc-status bc-canceling"><span class="bc-status-dot"></span>Cancels ${keyDateFmt}</span>`;
  } else if (subStatus === 'canceled') {
    statusHtml = '<span class="bc-status bc-canceled"><span class="bc-status-dot"></span>Canceled</span>';
  } else {
    statusHtml = '<span class="bc-status bc-active"><span class="bc-status-dot"></span>Active</span>';
  }

  let statsHtml;
  if (isCanceling && hasCancelDate) {
    const daysVal = days !== null
      ? (days <= 0 ? '<span class="bc-sval bc-sval-red">Today</span>'
        : days <= 7 ? `<span class="bc-sval bc-sval-amber">${days} day${days===1?'':'s'}</span>`
        : `<span class="bc-sval">${days} days</span>`)
      : '<span class="bc-sval">—</span>';
    statsHtml = `
      <div class="bc-stats">
        <div class="bc-stat"><div class="bc-slabel">Period started</div><div class="bc-sval">${periodStart}</div></div>
        <div class="bc-sdiv"></div>
        <div class="bc-stat"><div class="bc-slabel">Access ends</div><div class="bc-sval bc-sval-amber">${keyDateFmt}</div><div class="bc-ssub">then reverts to free</div></div>
        <div class="bc-sdiv"></div>
        <div class="bc-stat"><div class="bc-slabel">Days remaining</div>${daysVal}<div class="bc-ssub">of paid access</div></div>
      </div>`;
  } else if (!isCanceling && hasBillingDates) {
    const daysVal = days !== null
      ? (days <= 0 ? '<span class="bc-sval bc-sval-red">Today</span>'
        : days <= 7 ? `<span class="bc-sval bc-sval-amber">${days} day${days===1?'':'s'}</span>`
        : `<span class="bc-sval">${days} days</span>`)
      : '<span class="bc-sval">—</span>';
    statsHtml = `
      <div class="bc-stats">
        <div class="bc-stat"><div class="bc-slabel">Current period</div><div class="bc-sval">${periodStart}</div></div>
        <div class="bc-sdiv"></div>
        <div class="bc-stat"><div class="bc-slabel">Next billing date</div><div class="bc-sval bc-sval-gold">${keyDateFmt}</div><div class="bc-ssub">proposals reset on this date</div></div>
        <div class="bc-sdiv"></div>
        <div class="bc-stat"><div class="bc-slabel">Days remaining</div>${daysVal}<div class="bc-ssub">in current cycle</div></div>
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

export async function loadStatus() {
  const cached = await chrome.storage.sync.get(['userPlan','usageCount','usageLimit','userActive','nextBilledAt','currentPeriodStart','subscriptionStatus','cancelsAt']);
  const cPlan  = cached.userPlan   || 'free';
  const cUsed  = cached.usageCount || 0;
  const cQuota = cached.usageLimit || PLAN_QUOTAS[cPlan] || 2;
  updatePlanUI(cPlan, cUsed, cQuota, {
    active:              cached.userActive,
    subscriptionStatus:  cached.subscriptionStatus  || 'active',
    nextBilledAt:        cached.nextBilledAt         || null,
    currentPeriodStart:  cached.currentPeriodStart   || null,
    cancelsAt:           cached.cancelsAt            || null,
  });

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
