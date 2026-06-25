// ── Email management + OTP verification ───────────────────────────────────────
import { SERVER_URL } from './config.js';

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
    if (!isOpen) renderVerifyForm();
  });
}

async function renderVerifyForm() {
  const wrap = document.getElementById('email-edit');
  if (!wrap) return;
  const { userEmail } = await chrome.storage.sync.get(['userEmail']);

  const INP  = 'flex:1;padding:9px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:999px;color:#f0eeff;font-size:12.5px;font-family:inherit;outline:none;min-width:0;transition:border-color .15s';
  const BTN  = 'padding:9px 20px;border-radius:999px;background:#6366f1;color:#fff;font-size:12px;font-weight:700;border:none;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0';
  const OTP  = 'flex:1;padding:9px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:999px;color:#f0eeff;font-size:18px;font-weight:700;font-family:monospace;letter-spacing:4px;text-align:center;outline:none;min-width:0;transition:border-color .15s';
  const VFY  = 'padding:9px 20px;border-radius:999px;background:rgba(52,211,153,.1);border:1.5px solid rgba(52,211,153,.28);color:#34d399;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0';
  const RMVB = 'background:none;border:none;color:rgba(248,113,113,.45);font-size:11px;cursor:pointer;font-family:inherit;text-decoration:underline;padding:0;transition:color .12s';

  wrap.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <div style="display:flex;gap:8px">
        <input id="email-inp" type="email" placeholder="your@email.com"
          value="${userEmail || ''}" style="${INP}">
        <button id="send-otp-btn" style="${BTN}">Send Code</button>
      </div>
      <div id="otp-section" style="display:none;flex-direction:column;gap:8px">
        <div style="font-size:11px;color:rgba(240,238,255,.4)">Enter the 6-digit code sent to your email</div>
        <div style="display:flex;gap:8px">
          <input id="otp-inp" type="text" inputmode="numeric" maxlength="6" placeholder="000000" style="${OTP}">
          <button id="verify-otp-btn" style="${VFY}">Verify</button>
        </div>
        <button id="resend-otp-btn" style="background:none;border:none;color:rgba(240,238,255,.28);font-size:11px;cursor:pointer;font-family:inherit;text-align:left;padding:0">
          Didn't receive it? Resend code
        </button>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div id="email-msg" style="font-size:12px;min-height:16px"></div>
        ${userEmail ? `<button id="remove-email-btn" style="${RMVB}">Remove email</button>` : ''}
      </div>
    </div>
  `;

  document.getElementById('send-otp-btn')?.addEventListener('click', () => sendOTP());
  document.getElementById('verify-otp-btn')?.addEventListener('click', () => confirmOTP());
  document.getElementById('resend-otp-btn')?.addEventListener('click', () => sendOTP());
  document.getElementById('otp-inp')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmOTP();
  });
  document.getElementById('remove-email-btn')?.addEventListener('click', async () => {
    if (!confirm('Remove your account email? You will need to re-add and verify it to use Snag AI.')) return;
    await chrome.storage.sync.remove(['userEmail', 'emailVerified']);
    renderEmailUI(null, false);
    const editWrap = document.getElementById('email-edit');
    if (editWrap) editWrap.style.display = 'none';
  });
}

async function sendOTP() {
  const email = document.getElementById('email-inp')?.value?.trim();
  const btn   = document.getElementById('send-otp-btn');
  const msg   = document.getElementById('email-msg');
  if (!email || !email.includes('@')) {
    if (msg) msg.innerHTML = '<span style="color:#f87171">Enter a valid email first.</span>';
    return;
  }
  if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
  if (msg) msg.textContent = '';

  try {
    const res  = await fetch(SERVER_URL + '/verify/send', {
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
      if (msg) msg.innerHTML = `<span style="color:#f87171">${data.error || 'Failed to send code.'}</span>`;
    } else {
      await chrome.storage.sync.set({ userEmail: email, emailVerified: false });
      document.getElementById('otp-section').style.display = 'flex';
      document.getElementById('otp-inp')?.focus();
      if (msg) msg.innerHTML = '<span style="color:#4ade80">Code sent — check your inbox.</span>';
    }
  } catch(e) {
    if (msg) msg.innerHTML = '<span style="color:#f87171">Network error. Try again.</span>';
  }
  if (btn) { btn.textContent = 'Resend Code'; btn.disabled = false; }
}

async function confirmOTP() {
  const email = document.getElementById('email-inp')?.value?.trim();
  const code  = document.getElementById('otp-inp')?.value?.trim();
  const btn   = document.getElementById('verify-otp-btn');
  const msg   = document.getElementById('email-msg');
  if (!code || code.length < 6) {
    if (msg) msg.innerHTML = '<span style="color:#f87171">Enter the 6-digit code.</span>';
    return;
  }
  if (btn) { btn.textContent = 'Verifying…'; btn.disabled = true; }
  if (msg) msg.textContent = '';

  const { deviceId } = await chrome.storage.local.get(['deviceId']);

  try {
    const res  = await fetch(SERVER_URL + '/verify/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, deviceId: deviceId || '' }),
    });
    const data = await res.json();

    if (res.ok && data.ok) {
      await chrome.storage.sync.set({ userEmail: email, emailVerified: true });
      renderEmailUI(email, true);
      if (msg) msg.innerHTML = '<span style="color:#4ade80">✓ Email verified! You\'re all set.</span>';
      setTimeout(() => { document.getElementById('email-edit').style.display = 'none'; }, 2000);
    } else {
      if (msg) msg.innerHTML = `<span style="color:#f87171">${data.error || 'Verification failed.'}</span>`;
      if (btn) { btn.textContent = 'Verify'; btn.disabled = false; }
    }
  } catch(e) {
    if (msg) msg.innerHTML = '<span style="color:#f87171">Network error. Try again.</span>';
    if (btn) { btn.textContent = 'Verify'; btn.disabled = false; }
  }
}
