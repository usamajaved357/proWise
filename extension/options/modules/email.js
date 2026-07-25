// ── Email management + magic-link verification ─────────────────────────────
// Markup/styling mirrors the "SnagAI Settings Page" design mockup's account
// email card exactly (acct-* classes in options.html) — 4 states: verified,
// editing an existing email, empty (no email), editing from empty. The
// mockup didn't cover the "waiting for the link to be clicked" state (it
// predates the magic-link flow) or the "set but unverified" resting state,
// so those two are new, styled to match the same visual language.
import { SERVER_URL } from './config.js';

let pollTimer = null;
let pollDeadline = 0;

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

export async function loadEmail() {
  const { userEmail, emailVerified } = await chrome.storage.sync.get(['userEmail', 'emailVerified']);
  renderEmailUI(userEmail, emailVerified);
}

function renderEmailUI(email, verified) {
  const badge  = document.getElementById('email-verified-badge');
  const val    = document.getElementById('email-val');
  const toggle = document.getElementById('email-toggle');
  if (!val) return;

  if (email && verified) {
    val.textContent = email;
    val.classList.remove('unset');
    if (toggle) toggle.textContent = 'Edit';
    if (badge) {
      badge.style.display = 'flex';
      badge.className = 'acct-check';
      badge.title = 'Email verified';
      badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C13.5 2 14.2 3.5 15.5 4C16.8 4.5 18.5 3.8 19.3 4.7C20.2 5.5 19.5 7.2 20 8.5C20.5 9.8 22 10.5 22 12C22 13.5 20.5 14.2 20 15.5C19.5 16.8 20.2 18.5 19.3 19.3C18.5 20.2 16.8 19.5 15.5 20C14.2 20.5 13.5 22 12 22C10.5 22 9.8 20.5 8.5 20C7.2 19.5 5.5 20.2 4.7 19.3C3.8 18.5 4.5 16.8 4 15.5C3.5 14.2 2 13.5 2 12C2 10.5 3.5 9.8 4 8.5C4.5 7.2 3.8 5.5 4.7 4.7C5.5 3.8 7.2 4.5 8.5 4C9.8 3.5 10.5 2 12 2Z" fill="#14a800"/>
        <path d="M8.5 12.5L11 15L15.5 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }
  } else if (email && !verified) {
    val.textContent = email;
    val.classList.remove('unset');
    if (toggle) toggle.textContent = 'Verify now';
    if (badge) {
      badge.style.display = 'flex';
      badge.className = 'acct-check unverified';
      badge.title = 'Email not verified — click Verify now';
      badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#ef4444"/>
        <path d="M12 7v5.5" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="12" cy="16.5" r="1.2" fill="white"/>
      </svg>`;
    }
  } else {
    val.textContent = 'Not set';
    val.classList.add('unset');
    if (toggle) toggle.textContent = 'Add & Verify';
    if (badge) badge.style.display = 'none';
  }
}

// The top-right slot shows either the single "Edit"/"Add & Verify"/"Verify
// now" button, or (while editing) a "Cancel" + "Delete" pair in the exact
// same spot — never both at once.
async function openEdit() {
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);
  const toggle = document.getElementById('email-toggle');
  const cd     = document.getElementById('email-row-cd');
  const del    = document.getElementById('email-delete-btn');
  if (toggle) toggle.style.display = 'none';
  if (cd) cd.style.display = 'flex';
  if (del) del.style.display = userEmail ? '' : 'none';

  const editWrap = document.getElementById('email-edit');
  if (editWrap) editWrap.style.display = 'block';
  renderVerifyForm();
}

function closeEdit() {
  stopPolling();
  const toggle = document.getElementById('email-toggle');
  const cd     = document.getElementById('email-row-cd');
  const editWrap = document.getElementById('email-edit');
  if (toggle) toggle.style.display = '';
  if (cd) cd.style.display = 'none';
  if (editWrap) editWrap.style.display = 'none';
}

export function initEmail() {
  const toggle = document.getElementById('email-toggle');
  const cancel = document.getElementById('email-cancel-btn');
  const del    = document.getElementById('email-delete-btn');
  if (!toggle) return;

  toggle.addEventListener('click', () => openEdit());
  cancel?.addEventListener('click', () => closeEdit());
  del?.addEventListener('click', async () => {
    if (!confirm('Remove your account email? You will need to re-add and verify it to use Snag AI.')) return;
    await chrome.storage.sync.remove(['userEmail', 'emailVerified']);
    renderEmailUI(null, false);
    closeEdit();
  });
}

async function renderVerifyForm() {
  const wrap = document.getElementById('email-edit');
  if (!wrap) return;
  const { userEmail, emailVerified } = await chrome.storage.sync.get(['userEmail', 'emailVerified']);
  const hasEmail = !!userEmail;
  // If the current email is already verified, re-sending a link for that
  // same address is pointless — Send link stays disabled until the user
  // actually changes it to something else.
  const lockedEmail = (hasEmail && emailVerified) ? userEmail.toLowerCase() : null;

  wrap.innerHTML = `
    <div class="acct-edit-row">
      <div class="acct-inp-wrap">
        <input id="email-inp" type="text" placeholder="your@email.com" value="${userEmail || ''}" class="acct-inp">
        <button id="email-clear-btn" class="acct-inp-clear" aria-label="Clear" style="display:none"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 5L19 19M19 5L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
      </div>
      <button id="send-link-btn" class="acct-send-btn">Verify</button>
    </div>
    <div id="waiting-section" class="acct-waiting" style="display:none">
      <span class="ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3.5 6.5C3.5 5.4 4.4 4.5 5.5 4.5H18.5C19.6 4.5 20.5 5.4 20.5 6.5V17.5C20.5 18.6 19.6 19.5 18.5 19.5H5.5C4.4 19.5 3.5 18.6 3.5 17.5V6.5Z" stroke="currentColor" stroke-width="1.6"/><path d="M4 7L12 13L20 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <div>
        <div class="txt">Check your inbox and click the link — this updates automatically once you do.</div>
        <button id="resend-link-btn" class="acct-resend-btn">Didn't receive it? Resend link</button>
      </div>
    </div>
    <div id="email-msg" class="acct-msg"></div>
  `;

  const inp     = document.getElementById('email-inp');
  const clearBtn = document.getElementById('email-clear-btn');
  const sendBtn  = document.getElementById('send-link-btn');

  // Clear (✕) shows only when there's text to clear; Verify hides entirely
  // when the field still holds the already-verified address unchanged —
  // nothing to do until the user actually changes it.
  function syncInputState() {
    const val = inp.value.trim();
    if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
    if (sendBtn) sendBtn.style.display = (lockedEmail && val.toLowerCase() === lockedEmail) ? 'none' : '';
  }
  syncInputState();

  sendBtn?.addEventListener('click', () => sendMagicLink());
  document.getElementById('resend-link-btn')?.addEventListener('click', () => sendMagicLink());
  inp?.addEventListener('input', syncInputState);
  inp?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && sendBtn?.style.display !== 'none') sendMagicLink();
  });
  clearBtn?.addEventListener('click', () => {
    if (inp) {
      inp.value = '';
      inp.focus();
      inp.dispatchEvent(new Event('input'));
    }
  });
}

async function sendMagicLink() {
  const email = document.getElementById('email-inp')?.value?.trim();
  const btn   = document.getElementById('send-link-btn');
  const msg   = document.getElementById('email-msg');
  if (!email || !email.includes('@')) {
    if (msg) msg.innerHTML = '<span style="color:#f87171">Enter a valid email first.</span>';
    return;
  }
  if (btn) { btn.textContent = 'Verifying'; btn.disabled = true; }
  if (msg) msg.textContent = '';
  stopPolling();

  try {
    const res  = await fetch(SERVER_URL + '/verify/send-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    // Already verified server-side — nothing to send, just reflect that.
    if (data.alreadyVerified) {
      await chrome.storage.sync.set({ userEmail: email, emailVerified: true });
      renderEmailUI(email, true);
      setTimeout(() => closeEdit(), 1200);
      return;
    }
    if (!res.ok) {
      if (msg) msg.innerHTML = `<span style="color:#f87171">${data.error || 'Failed to send link.'}</span>`;
      if (btn) { btn.textContent = 'Verify'; btn.disabled = false; }
    } else {
      await chrome.storage.sync.set({ userEmail: email, emailVerified: false });
      const waiting = document.getElementById('waiting-section');
      if (waiting) waiting.style.display = 'flex';
      if (msg) msg.innerHTML = '<span style="color:#4ade80">Sending verification link</span>';
      if (btn) { btn.textContent = 'Resend Link'; btn.disabled = false; }
      startPolling(email);
    }
  } catch(e) {
    if (msg) msg.innerHTML = '<span style="color:#f87171">Network error. Try again.</span>';
    if (btn) { btn.textContent = 'Verify'; btn.disabled = false; }
  }
}

// The email link opens in a normal browser tab, not the extension, so there's
// no direct callback — poll /verify/status until it flips to verified (or
// give up after 5 minutes so an abandoned tab doesn't poll forever).
function startPolling(email) {
  pollDeadline = Date.now() + 5 * 60 * 1000;
  pollTimer = setInterval(async () => {
    if (Date.now() > pollDeadline) { stopPolling(); return; }
    try {
      const res  = await fetch(SERVER_URL + '/verify/status?email=' + encodeURIComponent(email));
      const data = await res.json();
      if (data.verified) {
        stopPolling();
        await chrome.storage.sync.set({ userEmail: email, emailVerified: true });
        renderEmailUI(email, true);
        const msg = document.getElementById('email-msg');
        if (msg) msg.innerHTML = '<span style="color:#4ade80">✓ Email verified! You\'re all set.</span>';
        setTimeout(() => closeEdit(), 2000);
      }
    } catch(e) { /* try again next tick */ }
  }, 4000);
}
