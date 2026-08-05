// ── Subscription: status, plan UI, billing card, upgrade ─────────────────────
import { SERVER_URL, SITE_URL, PLAN_LABELS, PLAN_QUOTAS } from './config.js';
import { state } from './state.js';
import { fmtDate, daysUntil, showSaved } from './helpers.js';
import { showConfirm } from './confirm-modal.js';

const MANAGE_BILLING_ICON = `<svg class="bc-manage-icon" width="16" height="12" viewBox="0 0 24 18" fill="none">
  <defs><linearGradient id="bc-manage-grad" x1="0" y1="0" x2="24" y2="18" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/>
  </linearGradient></defs>
  <rect x="0.5" y="0.5" width="23" height="17" rx="3" fill="url(#bc-manage-grad)"/>
  <rect x="0.5" y="5" width="23" height="3" fill="rgba(255,255,255,.3)"/>
</svg>`;
const MANAGE_BILLING_LABEL = `${MANAGE_BILLING_ICON} Manage billing`;

const CHECKOUT_BADGE_STYLES = {
  starter: { color: '#5EEAD4', background: 'rgba(94,234,212,0.14)' },
  pro:     { color: '#C084FC', background: 'rgba(168,85,247,0.16)' },
  agency:  { color: '#F5A9C7', background: 'rgba(236,72,153,0.14)' }
};

export async function openCheckout(plan) {
  const { userEmail, emailVerified } = await chrome.storage.sync.get(['userEmail', 'emailVerified']);
  if (!userEmail || !emailVerified) {
    alert('Please verify your email in Settings → Account before purchasing. This keeps your account secure.');
    return;
  }

  const backdrop = document.getElementById('checkout-modal-backdrop');
  const panel    = document.getElementById('checkout-modal-panel');
  const frame    = document.getElementById('checkout-modal-frame');
  const label    = document.getElementById('checkout-modal-plan-label');
  if (!backdrop || !panel || !frame) return;

  const badge = CHECKOUT_BADGE_STYLES[plan] || CHECKOUT_BADGE_STYLES.pro;
  if (label) {
    label.textContent = PLAN_LABELS[plan] || '';
    label.style.color = badge.color;
    label.style.background = badge.background;
  }

  frame.src = `${SITE_URL}/checkout-embed.html?plan=${encodeURIComponent(plan)}&email=${encodeURIComponent(userEmail)}`;
  backdrop.style.display = 'block';
  void panel.offsetWidth; // force reflow so the slide-in transition runs
  panel.style.transform = 'translateX(0)';
  document.body.style.overflow = 'hidden';
}

function closeCheckoutModal() {
  const backdrop = document.getElementById('checkout-modal-backdrop');
  const panel    = document.getElementById('checkout-modal-panel');
  const frame    = document.getElementById('checkout-modal-frame');
  if (panel) panel.style.transform = 'translateX(100%)';
  document.body.style.overflow = '';
  setTimeout(() => {
    if (backdrop) backdrop.style.display = 'none';
    if (frame) frame.src = 'about:blank';
  }, 300);
}

document.getElementById('checkout-modal-close')?.addEventListener('click', closeCheckoutModal);
document.getElementById('checkout-modal-backdrop')?.addEventListener('click', e => {
  if (e.target.id === 'checkout-modal-backdrop') closeCheckoutModal();
});

window.addEventListener('message', e => {
  if (!e.data || e.data.source !== 'snagai-checkout') return;
  if (e.data.event === 'checkout.completed') {
    closeCheckoutModal();
    loadStatus();
  } else if (e.data.event === 'checkout.closed') {
    closeCheckoutModal();
  }
});

export async function upgradePlan(newPlan) {
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);
  if (!userEmail) {
    alert('Please add your subscription email in Settings first.');
    return;
  }

  const planLabel  = PLAN_LABELS[newPlan] || newPlan;
  const planPrices = { starter: '$19', pro: '$35', agency: '$55' };
  const fromLabel  = PLAN_LABELS[state.activePlan] || state.activePlan;
  const direction  = ['starter','pro','agency'].indexOf(newPlan) > ['starter','pro','agency'].indexOf(state.activePlan)
    ? 'Upgrade' : 'Downgrade';

  const confirmed = await showConfirm({
    title: `${direction} to ${planLabel}?`,
    message: `You'll move from ${fromLabel} to ${planLabel} at <strong style="color:var(--white)">${planPrices[newPlan] || ''}/mo</strong>. ` +
      `Your new plan takes effect immediately and will be charged on a prorated basis.`,
    confirmLabel: direction
  });
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

export function updatePlanUI(plan, used, quota, billing = {}, auditInfo = {}, jobAuditInfo = {}) {
  const rem   = Math.max(0, quota - used);
  const pct   = Math.min(100, (used / quota) * 100);
  const label = PLAN_LABELS[plan] || 'Free';

  // Profile/agency audits — separate quota from the main job-audit+proposal
  // pool (10x pricier, used far less often — see server/modules/usage.js).
  const auditLimit = auditInfo.auditLimit ?? 0;
  const usedAudits = auditInfo.usedAudits ?? 0;
  const auditsCard = document.getElementById('ud-audits-card');
  if (auditsCard) {
    const auditPct  = auditLimit > 0 ? Math.min(100, (usedAudits / auditLimit) * 100) : 0;
    const gaugeEl   = document.getElementById('ud-gauge-audits');
    if (gaugeEl) gaugeEl.style.setProperty('--gauge-pct', auditPct + '%');
    const gaugeWrap = document.getElementById('ud-audits-gauge');
    if (gaugeWrap) gaugeWrap.classList.toggle('locked', auditLimit === 0);
    const usedAuditsEl = document.getElementById('ud-audits-used');
    if (usedAuditsEl) usedAuditsEl.textContent = usedAudits;
    const limAuditsEl = document.getElementById('ud-audits-limit');
    if (limAuditsEl) limAuditsEl.textContent = auditLimit;
    const resetAuditsEl = document.getElementById('ud-audits-reset-date');
    if (resetAuditsEl) {
      const resetIso = billing.cancelsAt || billing.nextBilledAt || null;
      resetAuditsEl.textContent = resetIso ? fmtDate(resetIso) : 'monthly';
    }
    // Toggle between the two .us-big-num elements — same pattern as Job Audits —
    // instead of overwriting .us-footnote's innerHTML, which would permanently
    // destroy the used/limit/reset spans it holds.
    const usedNumEl = document.getElementById('ud-audits-usednum');
    if (usedNumEl) usedNumEl.style.display = auditLimit === 0 ? 'none' : '';
    const bignumEl = document.getElementById('ud-audits-bignum');
    if (bignumEl) bignumEl.style.display = auditLimit === 0 ? '' : 'none';
    const footEl  = document.getElementById('ud-audits-footnote');
    const hintEl  = document.getElementById('ud-audits-upgrade-hint');
    if (footEl) footEl.style.display = auditLimit === 0 ? 'none' : '';
    if (hintEl) hintEl.style.display = auditLimit === 0 ? '' : 'none';
  }

  const badge = document.getElementById('sb-plan-badge');
  badge.textContent = label;
  badge.className   = 'sb-plan-badge badge-' + plan;
  document.getElementById('sb-remaining').textContent = rem + ' left';
  document.getElementById('sb-count').textContent     = used + ' / ' + quota + ' used';
  document.getElementById('sb-bar').style.width       = pct + '%';

  const usedEl = document.getElementById('ud-used');
  if (usedEl) usedEl.textContent = used;
  const limEl = document.getElementById('ud-limit');
  if (limEl) limEl.textContent = quota;
  const gaugeProposals = document.getElementById('ud-gauge-proposals');
  if (gaugeProposals) gaugeProposals.style.setProperty('--gauge-pct', pct + '%');

  // Job Audits — separate pool from Proposals (see server/modules/usage.js).
  // Not included on the Basic plan, same "locked" treatment as Profile audits.
  const jaLimit = jobAuditInfo.jobAuditLimit ?? 0;
  const jaUsed  = jobAuditInfo.usedJobAudits ?? 0;
  const jaPct   = jaLimit > 0 ? Math.min(100, (jaUsed / jaLimit) * 100) : 0;
  const jaUsedEl = document.getElementById('ud-jobaudits-used');
  if (jaUsedEl) jaUsedEl.textContent = jaUsed;
  const jaLimEl = document.getElementById('ud-jobaudits-limit');
  if (jaLimEl) jaLimEl.textContent = jaLimit;
  const gaugeJobAudits = document.getElementById('ud-gauge-jobaudits');
  if (gaugeJobAudits) gaugeJobAudits.style.setProperty('--gauge-pct', jaPct + '%');
  const jaGaugeWrap = document.getElementById('ud-jobaudits-gauge');
  if (jaGaugeWrap) jaGaugeWrap.classList.toggle('locked', jaLimit === 0);
  const jaUsedNumEl = document.getElementById('ud-jobaudits-usednum');
  if (jaUsedNumEl) jaUsedNumEl.style.display = jaLimit === 0 ? 'none' : '';
  const jaBignumEl = document.getElementById('ud-jobaudits-bignum');
  if (jaBignumEl) jaBignumEl.style.display = jaLimit === 0 ? '' : 'none';
  const jaFootEl = document.getElementById('ud-jobaudits-footnote');
  const jaHintEl = document.getElementById('ud-jobaudits-upgrade-hint');
  if (jaFootEl) jaFootEl.style.display = jaLimit === 0 ? 'none' : '';
  if (jaHintEl) jaHintEl.style.display = jaLimit === 0 ? '' : 'none';

  const _ue = document.getElementById('ud-urgency');
  if (_ue) {
    let msg = '', cls = 'ud-urgency';
    if (pct >= 100)    { msg = 'Out of proposals — upgrade to keep applying.'; cls += ' ud-danger'; }
    else if (pct >= 90) { msg = 'Only ' + rem + ' left this month.'; cls += ' ud-danger'; }
    else if (pct >= 70) { msg = used + ' used · ' + rem + ' remaining.'; cls += ' ud-warn'; }
    _ue.textContent = msg; _ue.className = cls;
  }

  const resetIso = billing.cancelsAt || billing.nextBilledAt || null;
  const resetTxt = resetIso ? fmtDate(resetIso) : 'monthly';
  const resetEl = document.getElementById('ud-reset-date');
  if (resetEl) {
    resetEl.textContent = resetTxt;
    resetEl.style.color = (billing.subscriptionStatus === 'canceling') ? '#facc15' : 'inherit';
  }
  const jaResetEl = document.getElementById('ud-jobaudits-reset-date');
  if (jaResetEl) jaResetEl.textContent = resetTxt;

  document.querySelectorAll('.pcv2-card').forEach(c => {
    c.classList.remove('current');
    const btn = c.querySelector('.pcv2-btn[data-plan]');
    if (btn) {
      const p = btn.dataset.plan;
      const btnLabels = { starter:'Get Basic', pro:'Get Pro', agency:'Get Agency' };
      btn.textContent = btnLabels[p] || 'Upgrade';
      btn.disabled    = false;
      btn.className   = 'pcv2-btn ' + (p === 'pro' ? 'pcv2-btn-gold' : p === 'agency' ? 'pcv2-btn-agency' : 'pcv2-btn-outline');
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
    const titleEl = document.getElementById('plan-section-title');
    if (titleEl) titleEl.textContent = 'Choose a plan';
    wrap.innerHTML = `
      <div class="billing-card-border"><div class="billing-card">
        <div class="bc-header">
          <div class="bc-header-left">
            <div class="bc-badges-row">
              <span class="bc-plan-badge badge-free">◇</span>
              <span class="bc-plan-name badge-free">Free</span>
            </div>
            <div class="bc-plan-title">$0<span class="bc-plan-price">/mo</span></div>
          </div>
        </div>
        <div class="bc-body-divider"></div>
        <div class="bc-stats bc-stats-pending">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Upgrade anytime for more proposals, job audits, and profile audits.
        </div>
      </div></div>
    `;
    return;
  }

  const titleEl = document.getElementById('plan-section-title');
  if (titleEl) titleEl.textContent = 'Upgrade your plan';

  const planPrices  = { starter: '$19', pro: '$35', agency: '$55' };
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

  let statusHtml = '';
  if (isCanceling) {
    statusHtml = `<span class="bc-status bc-canceling"><span class="bc-status-dot"></span>Cancels ${keyDateFmt}</span>`;
  } else if (subStatus === 'canceled') {
    statusHtml = '<span class="bc-status bc-canceled"><span class="bc-status-dot"></span>Canceled</span>';
  }
  const badgeIcon = { starter: '◆', pro: '◆◆', agency: '◆◆◆' }[plan] || '◆';

  let statsHtml;
  if (isCanceling && hasCancelDate) {
    const daysVal = days !== null
      ? (days <= 0 ? '<span class="bc-sval bc-sval-red">Today</span>'
        : days <= 7 ? `<span class="bc-sval bc-sval-amber">${days} day${days===1?'':'s'}</span>`
        : `<span class="bc-sval bc-sval-indigo">${days} days</span>`)
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
        : `<span class="bc-sval bc-sval-indigo">${days} days</span>`)
      : '<span class="bc-sval">—</span>';
    statsHtml = `
      <div class="bc-stats">
        <div class="bc-stat"><div class="bc-slabel">Current period</div><div class="bc-sval">${periodStart}</div></div>
        <div class="bc-sdiv"></div>
        <div class="bc-stat"><div class="bc-slabel">Next billing date</div><div class="bc-sval bc-sval-indigo">${keyDateFmt}</div><div class="bc-ssub">proposals reset on this date</div></div>
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
    <div class="billing-card-border"><div class="billing-card">
      <div class="bc-header">
        <div class="bc-header-left">
          <div class="bc-badges-row">
            <span class="bc-plan-badge badge-${plan}">${badgeIcon}</span>
            <span class="bc-plan-name badge-${plan}">${planLabel}</span>
            ${statusHtml}
          </div>
          <div class="bc-plan-title">${price}<span class="bc-plan-price">/mo</span></div>
        </div>
        <div class="bc-header-right">
          <button class="bc-manage-btn" id="bc-manage-btn">${MANAGE_BILLING_LABEL}</button>
        </div>
      </div>
      <div class="bc-body-divider"></div>
      ${statsHtml}
    </div></div>
  `;

  document.getElementById('bc-manage-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('bc-manage-btn');
    if (btn) { btn.textContent = 'Opening…'; btn.disabled = true; }
    try {
      const { userEmail } = await chrome.storage.sync.get(['userEmail']);
      if (!userEmail) {
        alert('Please add your subscription email in Settings first.');
        if (btn) { btn.innerHTML = MANAGE_BILLING_LABEL; btn.disabled = false; }
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
      if (b) { b.innerHTML = MANAGE_BILLING_LABEL; b.disabled = false; }
    }
  });
}

export async function loadStatus() {
  const cached = await chrome.storage.sync.get(['userPlan','usageCount','usageLimit','userActive','nextBilledAt','currentPeriodStart','subscriptionStatus','cancelsAt','auditLimit','usedAudits','jobAuditLimit','usedJobAudits']);
  const cPlan  = cached.userPlan   || 'free';
  const cUsed  = cached.usageCount || 0;
  const cQuota = cached.usageLimit || PLAN_QUOTAS[cPlan] || 2;
  updatePlanUI(cPlan, cUsed, cQuota, {
    active:              cached.userActive,
    subscriptionStatus:  cached.subscriptionStatus  || 'active',
    nextBilledAt:        cached.nextBilledAt         || null,
    currentPeriodStart:  cached.currentPeriodStart   || null,
    cancelsAt:           cached.cancelsAt            || null,
  }, {
    auditLimit: cached.auditLimit ?? 0,
    usedAudits: cached.usedAudits ?? 0,
  }, {
    jobAuditLimit: cached.jobAuditLimit ?? 0,
    usedJobAudits: cached.usedJobAudits ?? 0,
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
        auditLimit:          status.auditLimit           ?? 0,
        usedAudits:          status.usedAudits           ?? 0,
        jobAuditLimit:       status.jobAuditLimit         ?? 0,
        usedJobAudits:       status.usedJobAudits         ?? 0,
      });
      updatePlanUI(plan, used, quota, {
        active:              status.active !== false,
        subscriptionStatus:  status.subscriptionStatus  || 'active',
        nextBilledAt:        status.nextBilledAt         || null,
        currentPeriodStart:  status.currentPeriodStart   || null,
        cancelsAt:           status.cancelsAt            || null,
      }, {
        auditLimit:      status.auditLimit      ?? 0,
        usedAudits:      status.usedAudits      ?? 0,
        remainingAudits: status.remainingAudits ?? undefined,
      }, {
        jobAuditLimit:      status.jobAuditLimit      ?? 0,
        usedJobAudits:      status.usedJobAudits      ?? 0,
        remainingJobAudits: status.remainingJobAudits  ?? undefined,
      });
    }
  } catch(e) { /* use cached */ }
}
