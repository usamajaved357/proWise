// ── Agency Profile URL slots — register Upwork AGENCY-type profile URLs ─────
// Mirrors extension/options/modules/profile-urls.js's freelancer flow exactly
// (same slot/save/validate pattern), but for Upwork Agency-type accounts —
// a completely different Upwork account type from a freelancer profile, not
// related to the existing "agency" PLAN tier name in config.js.
import { PLAN_AGENCY_PROFILE_LIMITS } from './config.js';
import { showSaved } from './helpers.js';

function extractAgencySlug(url) {
  return url.split('/agencies/')[1]?.split('/')[0]?.split('?')[0] || '';
}

export async function renderAgencySlots() {
  const [_sp, _la] = await Promise.all([
    chrome.storage.sync.get(['userPlan']),
    chrome.storage.local.get(['registeredAgencies'])
  ]);
  const userPlan = _sp.userPlan || 'free';
  const registeredAgencies = _la.registeredAgencies || [];
  const limit = PLAN_AGENCY_PROFILE_LIMITS[userPlan] || 0;

  const slots = document.getElementById('agency-profile-slots');
  const emptyMsg = document.getElementById('agency-profile-upgrade-msg');
  if (!slots) return;
  slots.innerHTML = '';

  if (limit === 0) {
    slots.style.display = 'none';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  slots.style.display = '';
  if (emptyMsg) emptyMsg.style.display = 'none';

  for (let i = 0; i < limit; i++) {
    const a = registeredAgencies[i];
    const hasUrl = a?.url;
    const div = document.createElement('div');
    div.className = 'profile-slot';
    div.innerHTML = `
      <div class="slot-num">${i + 1}</div>
      <input class="agency-slot-input" type="url" placeholder="https://www.upwork.com/agencies/..." value="${a?.url || ''}" data-slot="${i}">
      ${hasUrl ? `<button class="btn-slot-open" data-slot="${i}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Open</button>` : ''}
    `;
    slots.appendChild(div);
  }
  slots.querySelectorAll('.btn-slot-open').forEach(btn => {
    const i = parseInt(btn.dataset.slot);
    const url = slots.querySelectorAll('.agency-slot-input')[i]?.value;
    if (url) btn.addEventListener('click', () => chrome.tabs.create({ url }));
  });
}

export function initAgencyUrls() {
  document.getElementById('save-agency-urls')?.addEventListener('click', async () => {
    const { userPlan = 'free' } = await chrome.storage.sync.get(['userPlan']);
    const { registeredAgencies = [] } = await chrome.storage.local.get(['registeredAgencies']);
    const inputs = document.querySelectorAll('.agency-slot-input');
    const updated = [...registeredAgencies];
    let hadInvalid = false;
    inputs.forEach((inp, i) => {
      const url = inp.value.trim();
      if (!url) return;
      if (!url.includes('upwork.com/agencies/')) {
        inp.style.borderColor = 'var(--red)';
        setTimeout(() => inp.style.borderColor = '', 2000);
        hadInvalid = true;
        return;
      }
      const slug = extractAgencySlug(url);
      if (!slug) { hadInvalid = true; return; }
      const existing = updated[i] || {};
      updated[i] = { ...existing, url, slug, id: existing.id || ('agency_' + (i + 1)), syncEnabled: existing.syncEnabled !== false };
    });
    if (hadInvalid) return;
    await chrome.storage.local.set({ registeredAgencies: updated });
    showSaved('saved-agency-urls-msg');
    await renderAgencySlots();
  });
}
