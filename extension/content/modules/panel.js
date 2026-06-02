// ── Panel container — inject UI, drag/resize, open/close, loading states ─────
window.SnagAI.injectUI = function() {
  if (document.getElementById('sn-trigger')) return;

  const ov = document.createElement('div');
  ov.id = 'sn-overlay';
  document.body.appendChild(ov);

  const panel = document.createElement('div');
  panel.id = 'sn-panel';
  panel.innerHTML = `
    <div class="sn-head">
      <div class="sn-brand">
        <div class="sn-logo">
          <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
            <path d="M10 20.5C10 20.5 11.5 22 14 22C16.5 22 18 20.5 18 18.5C18 16.5 16 15.5 14 14.5C12 13.5 10.5 12.5 10.5 10.5C10.5 8.5 12 7 14.5 7C17 7 18 8.5 18 8.5" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
            <path d="M16 9L22 9C22 9 24 11 22 13C24 13 26 15 24 17C25 17 26 19 24 21C25 21 25 23 23 24L16 24" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <div class="sn-title">Snag AI</div>
          <div class="sn-hook-label" id="sn-hook-label">AI proposal writer</div>
        </div>
      </div>
      <div class="sn-head-right">
        <div class="sn-usage-badge" id="sn-usage-badge" style="display:none"></div>
        <button class="sn-close" id="sn-close" title="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div class="sn-body" id="sn-body">
      <div class="sn-loading" id="sn-loading">
        <div class="sn-spinner"></div>
        <div class="sn-loading-text">Reading job · crafting proposal…</div>
        <div class="sn-loading-sub">Using the best hook for this job</div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  const trig = document.createElement('div');
  trig.id = 'sn-trigger';
  trig.innerHTML = `
    <button id="sn-btn">
      <div class="sn-btn-icon">
        <svg width="13" height="13" viewBox="0 0 32 32" fill="none">
          <path d="M10 20.5C10 20.5 11.5 22 14 22C16.5 22 18 20.5 18 18.5C18 16.5 16 15.5 14 14.5C12 13.5 10.5 12.5 10.5 10.5C10.5 8.5 12 7 14.5 7C17 7 18 8.5 18 8.5" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M16 9L22 9C22 9 24 11 22 13C24 13 26 15 24 17C25 17 26 19 24 21C25 21 25 23 23 24L16 24" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span>Write Proposal</span>
      <span class="sn-live-dot"></span>
    </button>
  `;
  document.body.appendChild(trig);

  document.getElementById('sn-btn').addEventListener('click', () => SnagAI.toggle());
  document.getElementById('sn-close').addEventListener('click', () => SnagAI.closePanel());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') SnagAI.closePanel(); });

  // ── Drag + resize ──────────────────────────────────────────────────────────
  const head = panel.querySelector('.sn-head');
  const EDGE = 8, MIN_W = 560, MIN_H = 400;
  let action = null;
  let startX, startY, startW, startH, startT, startL, resizeDir;

  head.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    action = 'drag';
    const r = panel.getBoundingClientRect();
    startX = e.clientX - r.left;
    startY = e.clientY - r.top;
    e.preventDefault();
  });

  panel.addEventListener('mousemove', e => {
    if (action) return;
    const r = panel.getBoundingClientRect();
    const onTop = e.clientY - r.top < EDGE, onBot = r.bottom - e.clientY < EDGE;
    const onL   = e.clientX - r.left < EDGE, onR = r.right - e.clientX < EDGE;
    if      (onTop && onL)  panel.style.cursor = 'nw-resize';
    else if (onTop && onR)  panel.style.cursor = 'ne-resize';
    else if (onBot && onL)  panel.style.cursor = 'sw-resize';
    else if (onBot && onR)  panel.style.cursor = 'se-resize';
    else if (onTop)         panel.style.cursor = 'n-resize';
    else if (onBot)         panel.style.cursor = 's-resize';
    else if (onL)           panel.style.cursor = 'w-resize';
    else if (onR)           panel.style.cursor = 'e-resize';
    else                    panel.style.cursor = '';
  });

  panel.addEventListener('mousedown', e => {
    const r = panel.getBoundingClientRect();
    const onTop = e.clientY - r.top < EDGE, onBot = r.bottom - e.clientY < EDGE;
    const onL   = e.clientX - r.left < EDGE, onR = r.right - e.clientX < EDGE;
    if (!onTop && !onBot && !onL && !onR) return;
    action = 'resize';
    resizeDir = (onTop?'n':'') + (onBot?'s':'') + (onL?'w':'') + (onR?'e':'');
    const r2 = panel.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    startW = r2.width;  startH = r2.height;
    startT = r2.top;    startL = r2.left;
    e.preventDefault();
  });

  const onMove = e => {
    if (!action) return;
    if (action === 'drag') {
      const nx = Math.max(0, Math.min(window.innerWidth  - MIN_W, e.clientX - startX));
      const ny = Math.max(0, Math.min(window.innerHeight - 60,    e.clientY - startY));
      panel.style.left = nx + 'px';
      panel.style.top  = ny + 'px';
    } else {
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (resizeDir.includes('e')) panel.style.width  = Math.max(MIN_W, startW + dx) + 'px';
      if (resizeDir.includes('s')) panel.style.height = Math.max(MIN_H, startH + dy) + 'px';
      if (resizeDir.includes('w')) {
        const nw = Math.max(MIN_W, startW - dx);
        panel.style.width = nw + 'px';
        panel.style.left  = (startL + startW - nw) + 'px';
      }
      if (resizeDir.includes('n')) {
        const nh = Math.max(MIN_H, startH - dy);
        panel.style.height = nh + 'px';
        panel.style.top    = (startT + startH - nh) + 'px';
      }
    }
  };

  const onUp = () => { action = null; panel.style.cursor = ''; };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onUp);
  document.addEventListener('selectstart', e => { if (action) e.preventDefault(); });
};

window.SnagAI.centerPanel = function() {
  const p = document.getElementById('sn-panel');
  const pw = Math.min(860, window.innerWidth * 0.96);
  const ph = Math.min(600, window.innerHeight * 0.88);
  p.style.width  = pw + 'px';
  p.style.height = ph + 'px';
  p.style.left   = Math.round((window.innerWidth  - pw) / 2) + 'px';
  p.style.top    = Math.round((window.innerHeight - ph) / 2) + 'px';
  p.style.transform = 'none';
};

window.SnagAI.closePanel = function() {
  document.getElementById('sn-overlay').classList.remove('vis');
  document.getElementById('sn-panel').classList.remove('vis');
  SnagAI.state.isOpen = false;
};

window.SnagAI.showLoading = function() {
  document.getElementById('sn-body').innerHTML = `
    <div class="sn-loading">
      <div class="sn-spinner"></div>
      <div class="sn-loading-text">Reading job · crafting proposal…</div>
      <div class="sn-loading-sub">Picking the best hook for this job</div>
    </div>
  `;
  document.getElementById('sn-hook-label').textContent = 'AI proposal writer';
  document.getElementById('sn-usage-badge').style.display = 'none';
};

window.SnagAI.showError = function(msg) {
  document.getElementById('sn-body').innerHTML = `
    <div class="sn-error">
      <div class="sn-error-icon">⚠</div>
      <div class="sn-error-msg">${SnagAI.esc(msg)}</div>
    </div>
  `;
};
