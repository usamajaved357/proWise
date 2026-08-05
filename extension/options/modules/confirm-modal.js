// ── Custom confirm dialog — replaces the native window.confirm() popup ───────
let resolveActive = null;

function ensureModal() {
  if (document.getElementById('cf-modal-backdrop')) return;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div id="cf-modal-backdrop" style="display:none;position:fixed;inset:0;background:rgba(4,6,12,.68);backdrop-filter:blur(2px);z-index:999999;align-items:center;justify-content:center;padding:24px">
      <div style="width:100%;max-width:360px;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius-lg);box-shadow:0 30px 80px -20px rgba(0,0,0,.6);padding:22px">
        <div id="cf-modal-title" style="font-size:17px;font-weight:800;letter-spacing:-.01em;color:var(--white);margin-bottom:10px"></div>
        <div id="cf-modal-message" style="font-size:13px;font-weight:400;color:rgba(240,238,234,.55);line-height:1.65;margin-bottom:22px"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button id="cf-modal-cancel" style="padding:9px 16px;border-radius:999px;border:1px solid #232838;background:transparent;color:var(--white2);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Cancel</button>
          <button id="cf-modal-confirm" style="padding:9px 18px;border-radius:999px;border:none;background:linear-gradient(90deg,#a855f7,#ec4899);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Confirm</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap.firstElementChild);

  document.getElementById('cf-modal-cancel').addEventListener('click', () => settle(false));
  document.getElementById('cf-modal-confirm').addEventListener('click', () => settle(true));
  document.getElementById('cf-modal-backdrop').addEventListener('click', e => {
    if (e.target.id === 'cf-modal-backdrop') settle(false);
  });
}

function settle(result) {
  const backdrop = document.getElementById('cf-modal-backdrop');
  if (backdrop) backdrop.style.display = 'none';
  if (resolveActive) { resolveActive(result); resolveActive = null; }
}

// Returns a Promise<boolean> — same shape as window.confirm(), so call sites
// just add `await`. `message` supports \n for line breaks.
export function showConfirm({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel' } = {}) {
  ensureModal();
  document.getElementById('cf-modal-title').textContent = title;
  document.getElementById('cf-modal-message').innerHTML = message.split('\n').map(line => line || '<br>').join('<br>');
  document.getElementById('cf-modal-confirm').textContent = confirmLabel;
  document.getElementById('cf-modal-cancel').textContent = cancelLabel;
  document.getElementById('cf-modal-backdrop').style.display = 'flex';

  return new Promise(resolve => { resolveActive = resolve; });
}
