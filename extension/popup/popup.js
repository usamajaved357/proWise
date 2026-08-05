import { SERVER_URL as SERVER } from '../options/modules/config.js';

// Same tier language as extension/options/modules/config.js's PLAN_LABELS —
// "starter" is always shown to users as "Basic".
const PLAN_META = {
  free:    { label: 'FREE',   badgeBg: 'rgba(168,85,247,.16)',  badgeColor: '#C084FC', glow: 'rgba(168,85,247,.14)',  bar: 'linear-gradient(90deg, #A855F7, #EC4899)' },
  starter: { label: 'BASIC',  badgeBg: 'rgba(45,212,191,.16)',  badgeColor: '#5EEAD4', glow: 'rgba(45,212,191,.14)',  bar: 'linear-gradient(90deg, #2DD4BF, #A855F7)' },
  pro:     { label: 'PRO',    badgeBg: 'rgba(168,85,247,.16)',  badgeColor: '#C084FC', glow: 'rgba(168,85,247,.14)',  bar: 'linear-gradient(90deg, #A855F7, #EC4899)' },
  agency:  { label: 'AGENCY', badgeBg: 'rgba(245,169,199,.16)', badgeColor: '#f5a9c7', glow: 'rgba(245,169,199,.14)', bar: 'linear-gradient(90deg, #EC4899, #f5a9c7)' },
};

// Only Free and Basic lack job/profile audits (server/modules/config.js's
// PLANS) — Pro and Agency get no callout at all.
const AUDIT_COPY = {
  free:    { bg: 'rgba(245,169,80,.08)', border: 'rgba(245,169,80,.28)', icon: '#F5B95E', text: '#E8C99A', msg: 'Job audits and profile audits aren’t on Free.', link: 'Available on Pro' },
  starter: { bg: 'rgba(168,85,247,.08)', border: 'rgba(168,85,247,.24)', icon: '#C084FC', text: '#C6CBDA', msg: 'Pro adds job audits and profile audits.', link: 'See what’s included' },
};

document.getElementById('settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
document.getElementById('open-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Upgrade button + audit callout link — both open the extension's own Subscription page
document.getElementById('upgrade-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_TAB', tab: 'subscription' });
});
document.getElementById('audit-link').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_TAB', tab: 'subscription' });
});

async function loadStatus() {
  try {
    const { userEmail, anonId } = await chrome.storage.sync.get(['userEmail', 'anonId']);
    const res = await fetch(SERVER + '/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail || null, anonId: anonId || null })
    });
    const data = await res.json();
    updateStatusUI(data);
  } catch(e) {
    console.log('Status error:', e);
  }
}

function updateStatusUI(data) {
  const { plan = 'free', used = 0, limit = 2, remaining = 2 } = data;
  const pct  = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const meta = PLAN_META[plan] || PLAN_META.free;

  // Plan badge
  const badge = document.getElementById('plan-badge');
  badge.style.background = meta.badgeBg;
  badge.style.color = meta.badgeColor;
  document.getElementById('plan-badge-label').textContent = meta.label;

  document.getElementById('usage-glow').style.background = `radial-gradient(circle, ${meta.glow}, transparent 70%)`;

  // Counts
  document.getElementById('used-count').textContent = used;
  document.getElementById('limit-count').textContent = limit;

  // Bar
  const bar = document.getElementById('usage-bar');
  bar.style.width = pct + '%';
  bar.style.background = meta.bar;

  // Status text
  const statusEl = document.getElementById('usage-status');
  const upgBtn   = document.getElementById('upgrade-btn');

  if (remaining === 0) {
    statusEl.textContent = 'No proposals remaining';
    statusEl.className = 'usage-status danger';
    upgBtn.style.display = 'flex';
  } else if (remaining <= 10) {
    statusEl.textContent = `Only ${remaining} proposals left this month`;
    statusEl.className = 'usage-status danger';
    upgBtn.style.display = plan === 'free' ? 'flex' : 'none';
  } else if (remaining <= 30) {
    statusEl.textContent = `${remaining} proposals remaining — use wisely`;
    statusEl.className = 'usage-status warn';
    upgBtn.style.display = plan === 'free' ? 'flex' : 'none';
  } else {
    statusEl.textContent = `${remaining} proposals remaining this month`;
    statusEl.className = 'usage-status';
    upgBtn.style.display = plan === 'free' ? 'flex' : 'none';
  }

  // Audit callout
  const auditEl = document.getElementById('audit-banner');
  const copy = AUDIT_COPY[plan];
  if (copy) {
    auditEl.style.display = 'flex';
    auditEl.style.background = copy.bg;
    auditEl.style.border = `1px solid ${copy.border}`;
    document.getElementById('audit-icon').style.color = copy.icon;
    const msgEl  = document.getElementById('audit-msg');
    const linkEl = document.getElementById('audit-link');
    msgEl.textContent  = copy.msg;
    msgEl.style.color  = copy.text;
    linkEl.textContent = copy.link;
    linkEl.style.color = copy.icon;
  } else {
    auditEl.style.display = 'none';
  }
}

// Close popup when it loses focus (clicking outside)
window.addEventListener('blur', () => window.close());

// Init — show cached data instantly, then refresh from server
(async () => {
  const cached = await chrome.storage.sync.get(['userPlan','usageCount','usageLimit']);
  if (cached.userPlan) {
    const limit = cached.usageLimit || 2;
    const used  = cached.usageCount || 0;
    updateStatusUI({ plan: cached.userPlan, used, limit, remaining: Math.max(0, limit - used) });
  }
  await loadStatus();
})();
