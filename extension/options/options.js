// ── Snag AI Options — entry point ─────────────────────────────────────────────
import { PLAN_QUOTAS }                    from './modules/config.js';
import { state }                          from './modules/state.js';
import { loadStatus, updatePlanUI, upgradePlan, openCheckout } from './modules/subscription.js';
import { renderProfilesPage, initProfilesPage } from './modules/profiles.js';
import { loadEmail, initEmail } from './modules/email.js';
import { initSettings, applySettingsToUI, renderJobFiltersSettings } from './modules/settings.js';
import { initAnalytics } from './modules/analytics.js';

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
  el.addEventListener('click', () => {
    switchSection(el.dataset.section);
    if (el.dataset.section === 'profiles') renderProfilesPage();
  })
);
const _tab = new URLSearchParams(window.location.search).get('tab');
if (_tab) switchSection(_tab);

// ── Storage change listener — live refresh when profile syncs ─────────────────
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    const hasProfile = Object.keys(changes).some(k =>
      k.startsWith('profileFull_') || k.startsWith('agencyFull_') ||
      k === 'primaryProfileId' || k === 'registeredProfiles' ||
      k === 'registeredAgencies' || k === 'activeProfileId'
    );
    if (hasProfile) {
      // Skip re-render if only jobFilters changed — avoids collapsing the filter panel on every save
      const onlyFilters = Object.keys(changes).every(k => {
        if (!k.startsWith('profileFull_')) return false;
        const changed = Object.keys(changes[k].newValue || {}).filter(f =>
          JSON.stringify((changes[k].newValue || {})[f]) !== JSON.stringify((changes[k].oldValue || {})[f])
        );
        return changed.length === 1 && changed[0] === 'jobFilters';
      });
      if (!onlyFilters) {
        renderProfilesPage();
        renderJobFiltersSettings();
      }
      return;
    }
  }
  if (area !== 'sync') return;
  if (changes.registeredProfiles || changes.profile) {
    renderProfilesPage();
  }
  if (changes.userPlan || changes.usageCount || changes.usedAudits || changes.jobAuditLimit || changes.usedJobAudits) {
    chrome.storage.sync.get(['userPlan','usageCount','usageLimit','auditLimit','usedAudits','jobAuditLimit','usedJobAudits'], s => {
      updatePlanUI(s.userPlan || 'free', s.usageCount || 0, s.usageLimit || PLAN_QUOTAS[s.userPlan] || 2, {}, {
        auditLimit: s.auditLimit ?? 0,
        usedAudits: s.usedAudits ?? 0,
      }, {
        jobAuditLimit: s.jobAuditLimit ?? 0,
        usedJobAudits: s.usedJobAudits ?? 0,
      });
    });
  }
});

// ── Plan cards — click animation + checkout / upgrade ────────────────────────
document.querySelectorAll('.pcv2-card').forEach(card => {
  card.addEventListener('click', () => {
    card.classList.remove('plan-selecting');
    void card.offsetWidth;
    card.classList.add('plan-selecting');
    setTimeout(() => card.classList.remove('plan-selecting'), 600);
  });
});
document.querySelectorAll('.pcv2-btn[data-plan]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const targetPlan = btn.dataset.plan;
    const canUpgrade = state.activePlan !== 'free' && state.subscriptionStatus === 'active';
    if (canUpgrade) {
      upgradePlan(targetPlan);
    } else {
      openCheckout(targetPlan);
    }
  });
});

// ── Navigation shortcuts ──────────────────────────────────────────────────────
document.getElementById('goto-sub-btn')?.addEventListener('click', () => switchSection('subscription'));
document.getElementById('ud-audits-upgrade-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  switchSection('subscription');
});
document.getElementById('ud-jobaudits-upgrade-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  switchSection('subscription');
});

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  initEmail();
  initSettings();
  initProfilesPage();

  loadStatus();
  loadEmail();
  renderProfilesPage();
  renderJobFiltersSettings();
  initAnalytics();

  const { settings = {} } = await chrome.storage.sync.get(['settings']);
  applySettingsToUI(settings);
}

init();
