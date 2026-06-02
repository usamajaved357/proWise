// ── Profile URL slots — register Upwork profile URLs ─────────────────────────
import { PLAN_LIMITS } from './config.js';
import { showSaved } from './helpers.js';
import { renderProfilesPage } from './profiles.js';

export async function renderProfileSlots() {
  const [_sp, _lp] = await Promise.all([
    chrome.storage.sync.get(['userPlan']),
    chrome.storage.local.get(['registeredProfiles'])
  ]);
  const userPlan           = _sp.userPlan || 'free';
  const registeredProfiles = _lp.registeredProfiles || [];
  const limit = PLAN_LIMITS[userPlan] || 1;

  const fullKeys = registeredProfiles.filter(p => p?.id).map(p => 'profileFull_' + p.id);
  const fullData = fullKeys.length ? await new Promise(r => chrome.storage.local.get(fullKeys, r)) : {};

  const slots = document.getElementById('profile-slots');
  slots.innerHTML = '';

  for (let i = 0; i < limit; i++) {
    const p      = registeredProfiles[i];
    const hasUrl = p?.url;
    const div    = document.createElement('div');
    div.className = 'profile-slot';
    div.innerHTML = `
      <div class="slot-num">${i + 1}</div>
      <input class="slot-input" type="url" placeholder="https://www.upwork.com/freelancers/~..." value="${p?.url || ''}" data-slot="${i}">
      ${hasUrl ? `<button class="btn-slot-open" data-slot="${i}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Sync</button>` : ''}
    `;
    slots.appendChild(div);
  }
  slots.querySelectorAll('.btn-slot-open').forEach(btn => {
    const i   = parseInt(btn.dataset.slot);
    const url = slots.querySelectorAll('.slot-input')[i]?.value;
    if (url) btn.addEventListener('click', () => chrome.tabs.create({ url }));
  });
}

export function initProfileUrls() {
  // Empty-state inline form on Profiles page
  document.getElementById('empty-save-profile-btn')?.addEventListener('click', async () => {
    const inp = document.getElementById('empty-profile-url-inp');
    const url = inp?.value?.trim();
    if (!url || !url.includes('upwork.com/freelancers/')) {
      if (inp) { inp.style.borderColor = 'var(--red)'; setTimeout(() => inp.style.borderColor = '', 2000); }
      return;
    }
    const { registeredProfiles = [] } = await chrome.storage.local.get(['registeredProfiles']);
    const id = 'profile_1';
    const existing = registeredProfiles[0] || {};
    registeredProfiles[0] = { ...existing, url, id, syncEnabled: true };
    await chrome.storage.local.set({ registeredProfiles });
    await renderProfileSlots();
    await renderProfilesPage();
    // Open the profile URL so auto-sync can run
    chrome.tabs.create({ url });
  });

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

  document.getElementById('add-profile-btn')?.addEventListener('click', () => {
    const panel  = document.getElementById('apd-panel');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    if (isOpen) {
      document.getElementById('save-profile-urls')?.click();
      setTimeout(() => {
        panel.style.display = 'none';
        const btn = document.getElementById('add-profile-btn');
        if (btn) btn.textContent = 'Manage Profile';
      }, 300);
    } else {
      panel.style.display = 'block';
      document.getElementById('add-profile-btn').textContent = '✕ Close';
    }
  });
}
