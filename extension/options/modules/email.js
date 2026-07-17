// ── Email management + magic-link verification ─────────────────────────────
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
    val.style.color = '';
    if (toggle) toggle.textContent = 'Change';
    if (badge) {
      badge.style.display = 'inline-flex';
      badge.title = 'Email verified';
      badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C13.5 2 14.2 3.5 15.5 4C16.8 4.5 18.5 3.8 19.3 4.7C20.2 5.5 19.5 7.2 20 8.5C20.5 9.8 22 10.5 22 12C22 13.5 20.5 14.2 20 15.5C19.5 16.8 20.2 18.5 19.3 19.3C18.5 20.2 16.8 19.5 15.5 20C14.2 20.5 13.5 22 12 22C10.5 22 9.8 20.5 8.5 20C7.2 19.5 5.5 20.2 4.7 19.3C3.8 18.5 4.5 16.8 4 15.5C3.5 14.2 2 13.5 2 12C2 10.5 3.5 9.8 4 8.5C4.5 7.2 3.8 5.5 4.7 4.7C5.5 3.8 7.2 4.5 8.5 4C9.8 3.5 10.5 2 12 2Z" fill="#14a800"/>
        <path d="M8.5 12.5L11 15L15.5 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }
  } else if (email && !verified) {
    val.textContent = email;
    val.style.color = '';
    if (toggle) toggle.textContent = 'Verify now';
    if (badge) {
      badge.style.display = 'inline-flex';
      badge.title = 'Email not verified — click Verify now';
      badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#ef4444"/>
        <path d="M12 7v5.5" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="12" cy="16.5" r="1.2" fill="white"/>
      </svg>`;
    }
  } else {
    val.textContent = 'Not set';
    val.style.color = 'rgba(240,238,234,.3)';
    if (toggle) toggle.textContent = 'Add & Verify';
    if (badge) badge.style.display = 'none';
  }
}

export function initEmail() {
  const toggle   = document.getElementById('email-toggle');
  const editWrap = document.getElementById('email-edit');
  if (!toggle || !editWrap) return;

  toggle.addEventListener('click', async () => {
    const isOpen = editWrap.style.display !== 'none';
    editWrap.style.display = isOpen ? 'none' : 'block';
    stopPolling();
    if (!isOpen) renderVerifyForm();
  });
}

async function renderVerifyForm() {
  const wrap = document.getElementById('email-edit');
  if (!wrap) return;
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);

  const INP  = 'flex:1;padding:9px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:999px;color:#f0eeff;font-size:12.5px;font-family:inherit;outline:none;min-width:0;transition:border-color .15s';
  const BTN  = 'padding:9px 20px;border-radius:999px;background:#6366f1;color:#fff;font-size:12px;font-weight:700;border:none;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0';
  const RMVB = 'background:none;border:none;color:rgba(248,113,113,.45);font-size:11px;cursor:pointer;font-family:inherit;text-decoration:underline;padding:0;transition:color .12s';

  wrap.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <div style="display:flex;gap:8px">
        <input id="email-inp" type="email" placeholder="your@email.com"
          value="${userEmail || ''}" style="${INP}">
        <button id="send-link-btn" style="${BTN}">Send link</button>
      </div>
      <div id="waiting-section" style="display:none;flex-direction:column;gap:6px">
        <div style="font-size:11px;color:rgba(240,238,255,.4);line-height:1.5">Check your inbox and click the link — this updates automatically once you do.</div>
        <button id="resend-link-btn" style="background:none;border:none;color:rgba(240,238,255,.28);font-size:11px;cursor:pointer;font-family:inherit;text-align:left;padding:0">
          Didn't receive it? Resend link
        </button>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div id="email-msg" style="font-size:12px;min-height:16px"></div>
        ${userEmail ? `<button id="remove-email-btn" style="${RMVB}">Remove email</button>` : ''}
      </div>
    </div>
  `;

  document.getElementById('send-link-btn')?.addEventListener('click', () => sendMagicLink());
  document.getElementById('resend-link-btn')?.addEventListener('click', () => sendMagicLink());
  document.getElementById('email-inp')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMagicLink();
  });
  document.getElementById('remove-email-btn')?.addEventListener('click', async () => {
    if (!confirm('Remove your account email? You will need to re-add and verify it to use Snag AI.')) return;
    stopPolling();
    await chrome.storage.sync.remove(['userEmail', 'emailVerified']);
    renderEmailUI(null, false);
    const editWrap = document.getElementById('email-edit');
    if (editWrap) editWrap.style.display = 'none';
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
  if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
  if (msg) msg.textContent = '';
  stopPolling();

  try {
    const res  = await fetch(SERVER_URL + '/verify/send-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (data.alreadyVerified) {
      await chrome.storage.sync.set({ userEmail: email, emailVerified: true });
      if (msg) msg.innerHTML = '<span style="color:#4ade80">✓ Email already verified.</span>';
      renderEmailUI(email, true);
      setTimeout(() => { document.getElementById('email-edit').style.display = 'none'; }, 1500);
      return;
    }
    if (!res.ok) {
      if (msg) msg.innerHTML = `<span style="color:#f87171">${data.error || 'Failed to send link.'}</span>`;
    } else {
      await chrome.storage.sync.set({ userEmail: email, emailVerified: false });
      const waiting = document.getElementById('waiting-section');
      if (waiting) waiting.style.display = 'flex';
      if (msg) msg.innerHTML = '<span style="color:#4ade80">Link sent — check your inbox.</span>';
      startPolling(email);
    }
  } catch(e) {
    if (msg) msg.innerHTML = '<span style="color:#f87171">Network error. Try again.</span>';
  }
  if (btn) { btn.textContent = 'Resend link'; btn.disabled = false; }
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
        setTimeout(() => { const w = document.getElementById('email-edit'); if (w) w.style.display = 'none'; }, 2000);
      }
    } catch(e) { /* try again next tick */ }
  }, 4000);
}
