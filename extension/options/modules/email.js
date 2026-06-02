// ── Email management ──────────────────────────────────────────────────────────
import { showSaved } from './helpers.js';
import { loadStatus } from './subscription.js';

export async function loadEmail() {
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);
  updateEmailUI(userEmail);
}

export function updateEmailUI(email) {
  document.getElementById('email-dot').style.background = email ? '#34d399' : '#374151';
  document.getElementById('email-val').textContent      = email || 'Not set';
  document.getElementById('email-toggle').textContent   = email ? 'Change' : 'Add';
}

export function initEmail() {
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
}
