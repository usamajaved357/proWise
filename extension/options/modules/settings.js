// ── Proposal settings — tone and length pickers (auto-save) ───────────────────
import { showSaved } from './helpers.js';
import { renderJobFilters, loadPrimaryProfileForFilters } from './profiles.js';

async function saveSettings() {
  await chrome.storage.sync.set({ settings: {
    tone:   document.getElementById('tone')?.value   || 'professional',
    length: document.getElementById('length')?.value || 'medium',
    freelancerType: 'developer', // kept for backward compat with generate.js fallback
  }});
}

export function initOptionPicker(containerId, hiddenId) {
  const container = document.getElementById(containerId);
  const hidden    = document.getElementById(hiddenId);
  if (!container || !hidden) return;
  container.querySelectorAll('.jf-seg-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      container.querySelectorAll('.jf-seg-opt').forEach(o => o.classList.remove('jf-active'));
      opt.classList.add('jf-active');
      hidden.value = opt.dataset.val;
      saveSettings();
    });
  });
}

export function applySettingsToUI(settings) {
  const tone   = settings?.tone   || 'professional';
  const length = settings?.length || 'medium';

  const toneC = document.getElementById('st-tone-opts');
  const lenC  = document.getElementById('st-length-opts');

  if (toneC) {
    toneC.querySelectorAll('.jf-seg-opt').forEach(o => o.classList.toggle('jf-active', o.dataset.val === tone));
    const toneHidden = document.getElementById('tone');
    if (toneHidden) toneHidden.value = tone;
  }
  if (lenC) {
    lenC.querySelectorAll('.jf-seg-opt').forEach(o => o.classList.toggle('jf-active', o.dataset.val === length));
    const lenHidden = document.getElementById('length');
    if (lenHidden) lenHidden.value = length;
  }
}

export function initSettings() {
  initOptionPicker('st-tone-opts',   'tone');
  initOptionPicker('st-length-opts', 'length');
  // No save button — auto-saves on every selection change
}

// ── Job Filters — lives here now (was per-profile-card on the Profiles page).
// Always applies to the primary profile (loadPrimaryProfileForFilters already
// falls back to the only profile when there's just one, so a single-profile
// plan needs no explicit "primary" to be set for this to work).
export async function renderJobFiltersSettings() {
  const body  = document.getElementById('jf-settings-body');
  const empty = document.getElementById('jf-settings-empty');
  if (!body) return;

  const profile = await loadPrimaryProfileForFilters();
  if (!profile) {
    body.innerHTML = '';
    body.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }
  body.style.display = '';
  if (empty) empty.style.display = 'none';
  renderJobFilters(body, profile);
}
