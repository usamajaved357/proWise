// ── Paywall page ──────────────────────────────────────────────────────────────
window.SnagAI.showPaywall = function(data) {
  const isFree = !data.plan || data.plan === 'free';
  document.getElementById('sn-hook-label').textContent = 'Subscription required';
  document.getElementById('sn-body').innerHTML = `
    <div class="sn-paywall">
      <div class="sn-paywall-icon">✦</div>
      <div class="sn-paywall-title">${isFree ? 'Upgrade to keep winning' : 'Monthly limit reached'}</div>
      <div class="sn-paywall-sub">${isFree
        ? "You've used your <strong>2 free proposals</strong>. Subscribe to unlock your full limit."
        : `You've used all <strong>${data.limit} proposals</strong> this month. Resets on the 1st.`
      }</div>
      <div class="sn-plans" id="sn-plans">
        <div class="sn-plan" data-plan="starter">
          <div class="sn-plan-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div class="sn-plan-name">Starter</div>
          <div class="sn-plan-price">$19<span>/mo</span></div>
          <div class="sn-plan-limit">150 proposals</div>
        </div>
        <div class="sn-plan sn-plan-feat sn-plan-selected" data-plan="pro">
          <div class="sn-plan-pop">BEST</div>
          <div class="sn-plan-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div class="sn-plan-name">Pro</div>
          <div class="sn-plan-price">$39<span>/mo</span></div>
          <div class="sn-plan-limit">400 proposals</div>
        </div>
        <div class="sn-plan" data-plan="agency">
          <div class="sn-plan-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div class="sn-plan-name">Agency</div>
          <div class="sn-plan-price">$69<span>/mo</span></div>
          <div class="sn-plan-limit">900 proposals</div>
        </div>
      </div>
      <button class="sn-cta-btn" id="sn-upgrade-btn">Subscribe to Pro →</button>
      ${!isFree ? '<div class="sn-reset-note">Resets on the 1st of next month</div>' : ''}
    </div>
  `;

  let selectedPlan = 'pro';

  function openPlanCheckout(plan) {
    chrome.runtime.sendMessage({ type: 'OPEN_CHECKOUT', plan: plan || 'pro' });
  }

  function selectPlan(plan) {
    selectedPlan = plan;
    document.querySelectorAll('.sn-plan').forEach(el => {
      el.classList.toggle('sn-plan-selected', el.dataset.plan === plan);
    });
    const labels = { starter: 'Starter', pro: 'Pro', agency: 'Agency' };
    document.getElementById('sn-upgrade-btn').textContent = 'Subscribe to ' + (labels[plan] || plan) + ' →';
  }

  document.querySelectorAll('.sn-plan').forEach(el => {
    el.addEventListener('click', () => selectPlan(el.dataset.plan));
  });

  document.getElementById('sn-upgrade-btn').addEventListener('click', () => openPlanCheckout(selectedPlan));
};
