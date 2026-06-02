// ── Proposal settings — tone and length pickers ───────────────────────────────
import { showSaved } from './helpers.js';

export function initOptionPicker(containerId, hiddenId) {
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

export function applySettingsToUI(settings) {
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

export function initSettings() {
  initOptionPicker('st-tone-opts',   'tone');
  initOptionPicker('st-length-opts', 'length');

  document.getElementById('save-settings')?.addEventListener('click', async () => {
    await chrome.storage.sync.set({ settings: {
      tone:   document.getElementById('tone')?.value   || 'professional',
      length: document.getElementById('length')?.value || 'medium',
    }});
    showSaved('saved-settings-msg');
  });
}
