// ── Snag AI Agency Reader v3 ───────────────────────────────────────────────
// Mirrors extension/content/profile-reader.js's toolbar/panel/render/PDF
// pattern for agency profiles. renderAudit, the quote-highlighting logic,
// and the PDF export are copied verbatim (not imported) rather than
// extracted into a shared module yet — a refactor of the already-verified
// freelancer file right before this feature's testing would conflate two
// risky changes in one pass. Extracting into
// extension/content/modules/audit-ui.js is a deliberate, flagged fast-follow
// once this is proven working, not skipped by accident.
(function () {
  if (!location.href.includes('/agencies/')) return;

  const local = {
    get: keys => new Promise(r => chrome.storage.local.get(keys, r)),
    set: data => new Promise((res, rej) => chrome.storage.local.set(data, () =>
      chrome.runtime.lastError ? rej(new Error(chrome.runtime.lastError.message)) : res()
    )),
  };

  async function readAgencyData() {
    return await chrome.runtime.sendMessage({ type: 'GET_AGENCY_DATA' });
  }

  // ── Suggestion-quote detection — identical to profile-reader.js's version ──
  function parseSuggestionSegments(text) {
    if (!text) return [{ text: '', hl: false }];
    const re = /(^|[\s(])["“]([^"”]{4,}?)["”](?=[\s.,!?;:)]|$)/g;
    const segments = [];
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      const lead = m[1] || '';
      const start = m.index + lead.length;
      if (start > last) segments.push({ text: text.slice(last, start), hl: false });
      segments.push({ text: `“${m[2]}”`, hl: true });
      last = m.index + m[0].length;
    }
    if (last < text.length) segments.push({ text: text.slice(last), hl: false });
    return segments.length ? segments : [{ text, hl: false }];
  }

  function renderSuggestionHTML(text) {
    return parseSuggestionSegments(text)
      .map(seg => seg.hl ? `<span class="sn-quote-hl">${seg.text}</span>` : seg.text)
      .join('');
  }

  // ── PDF-only: word-wrap text into lines while tracking which words fall inside
  // a highlighted suggestion quote — identical to profile-reader.js's version.
  function layoutRichWords(doc, text, fontSize, font, maxWidth) {
    doc.setFont(font, 'normal'); doc.setFontSize(fontSize);
    const spaceW = doc.getTextWidth(' ');
    const lines = [[]];
    let lineW = 0;
    parseSuggestionSegments(text).forEach(seg => {
      seg.text.split(' ').forEach(word => {
        if (word === '') return;
        const ww = doc.getTextWidth(word);
        if (lineW > 0 && lineW + spaceW + ww > maxWidth) {
          lines.push([]);
          lineW = 0;
        } else if (lineW > 0) {
          lineW += spaceW;
        }
        lines[lines.length - 1].push({ text: word, hl: seg.hl });
        lineW += ww;
      });
    });
    return lines;
  }

  function drawRichLines(doc, lines, x, startY, lineHeightMm, normalColor, hlColor, fontSize, font) {
    doc.setFont(font, 'normal'); doc.setFontSize(fontSize);
    const spaceW = doc.getTextWidth(' ');
    let y = startY;
    lines.forEach(line => {
      let cx = x;
      line.forEach(w => {
        doc.setTextColor(...(w.hl ? hlColor : normalColor));
        doc.text(w.text, cx, y);
        cx += doc.getTextWidth(w.text) + spaceW;
      });
      y += lineHeightMm;
    });
  }

  // ── Code-verified diff for progress-tracking — mirrors profile-reader.js's
  // computeProfileChanges, adapted to agency fields.
  function computeAgencyChanges(prev, cur) {
    if (!prev) return null;
    const lines = [];

    lines.push((prev.summary || '') === (cur.summary || '')
      ? 'SUMMARY: unchanged'
      : `SUMMARY: changed — "${prev.summary || ''}" → "${cur.summary || ''}"`);

    const prevDescLen = (prev.description || '').length, curDescLen = (cur.description || '').length;
    lines.push((prev.description || '') === (cur.description || '')
      ? 'DESCRIPTION: unchanged'
      : `DESCRIPTION: changed (${prevDescLen} → ${curDescLen} chars)`);

    const oldSet = new Set((prev.skills || []).map(s => s.toLowerCase().trim()));
    const newSet = new Set((cur.skills || []).map(s => s.toLowerCase().trim()));
    const added = (cur.skills || []).filter(s => !oldSet.has(s.toLowerCase().trim()));
    const removed = (prev.skills || []).filter(s => !newSet.has(s.toLowerCase().trim()));
    lines.push(`SKILLS ADDED: ${added.length ? added.join(', ') : 'none'}`);
    lines.push(`SKILLS REMOVED: ${removed.length ? removed.join(', ') : 'none'}`);

    const prevRate = `${prev.minRate ?? '?'}-${prev.maxRate ?? '?'}`;
    const curRate = `${cur.minRate ?? '?'}-${cur.maxRate ?? '?'}`;
    lines.push(prevRate === curRate
      ? `RATE RANGE: unchanged ($${curRate}/hr)`
      : `RATE RANGE: changed — $${prevRate}/hr → $${curRate}/hr`);

    const prevPort = (prev.portfolio || []).length, curPort = (cur.portfolio || []).length;
    lines.push(prevPort === curPort
      ? `PORTFOLIO ITEMS: unchanged (${curPort})`
      : `PORTFOLIO ITEMS: ${prevPort} → ${curPort}`);

    const prevServ = (prev.services || []).length, curServ = (cur.services || []).length;
    lines.push(prevServ === curServ
      ? `SERVICES: unchanged (${curServ})`
      : `SERVICES: ${prevServ} → ${curServ}`);

    const prevClients = (prev.featuredClients || []).length, curClients = (cur.featuredClients || []).length;
    lines.push(prevClients === curClients
      ? `FEATURED CLIENTS: unchanged (${curClients})`
      : `FEATURED CLIENTS: ${prevClients} → ${curClients}`);

    const prevClosed = ((prev.workHistory || {}).closedTotal) || 0;
    const curClosed = ((cur.workHistory || {}).closedTotal) || 0;
    lines.push(prevClosed === curClosed
      ? `WORK HISTORY (closed): unchanged (${curClosed})`
      : `WORK HISTORY (closed): ${prevClosed} → ${curClosed}`);

    const prevTeam = (prev.managers || []).length + (prev.members || []).length;
    const curTeam = (cur.managers || []).length + (cur.members || []).length;
    lines.push(prevTeam === curTeam
      ? `TEAM SIZE (shown): unchanged (${curTeam})`
      : `TEAM SIZE (shown): ${prevTeam} → ${curTeam}`);

    return lines.join('\n');
  }

  const AUDIT_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
  const SYNC_ICON_SVG  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';

  function injectToolbarStyles() {
    if (document.getElementById('snagai-agency-toolbar-styles')) return;
    const style = document.createElement('style');
    style.id = 'snagai-agency-toolbar-styles';
    style.textContent = `
      @keyframes snagai-a-pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes snagai-a-spin{to{transform:rotate(360deg)}}
      #snagai-agency-toolbar,#snagai-agency-add{position:fixed;bottom:28px;right:28px;z-index:2147483646;display:flex;align-items:stretch;background:#111827;border:1px solid rgba(99,102,241,.28);border-radius:999px;box-shadow:0 8px 28px rgba(0,0,0,.45);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;transition:transform .2s,box-shadow .2s}
      #snagai-agency-toolbar:hover,#snagai-agency-add:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(0,0,0,.55)}
      .snagai-a-btn{display:flex;align-items:center;justify-content:center;background:none;border:none;padding:9px;cursor:pointer;position:relative;transition:background .15s}
      .snagai-a-btn:hover:not(:disabled){background:rgba(255,255,255,.06)}
      .snagai-a-btn:disabled{opacity:.6;cursor:default}
      .snagai-a-btn:first-child{border-radius:999px 0 0 999px}
      .snagai-a-btn:last-child{border-radius:0 999px 999px 0}
      .snagai-a-icon{width:24px;height:24px;background:#6366f1;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s}
      .snagai-a-div{width:1px;margin:8px 0;background:rgba(255,255,255,.1);flex-shrink:0}
      .snagai-a-dot{position:absolute;top:6px;right:6px;width:6px;height:6px;background:#34d399;border-radius:50%;border:1.5px solid #111827;animation:snagai-a-pulse 2s ease-in-out infinite}
      .snagai-a-spin-icon{display:inline-block;animation:snagai-a-spin .7s linear infinite}
      .snagai-a-tip{position:absolute;bottom:calc(100% + 9px);right:0;transform:translateY(4px);background:#1a1f2e;color:#f0eeea;font-size:11px;font-weight:500;line-height:1.3;padding:6px 10px;border-radius:7px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s,transform .15s;box-shadow:0 6px 20px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.08)}
      .snagai-a-tip::after{content:'';position:absolute;top:100%;right:14px;border:5px solid transparent;border-top-color:#1a1f2e}
      .snagai-a-btn:hover .snagai-a-tip{opacity:1;transform:translateY(0)}
      #snagai-agency-add-btn{display:flex;align-items:center;gap:8px;background:none;border:none;color:#f0eeea;font-size:12.5px;font-weight:600;padding:11px 18px;cursor:pointer;border-radius:999px;font-family:inherit}
      #snagai-agency-add-btn:hover:not(:disabled){background:rgba(255,255,255,.06)}
      #snagai-agency-add-btn:disabled{opacity:.6;cursor:default}
    `;
    document.head.appendChild(style);
  }

  // ── Toolbar — same visual pattern as profile-reader.js's shared capsule ────
  function injectToolbar(onAudit, onSync, showAudit = true) {
    if (document.getElementById('snagai-agency-toolbar')) return;
    injectToolbarStyles();

    const wrap = document.createElement('div');
    wrap.id = 'snagai-agency-toolbar';

    const auditBtn = document.createElement('button');
    auditBtn.id = 'snagai-agency-audit-btn';
    auditBtn.className = 'snagai-a-btn';
    auditBtn.innerHTML = `
      <div class="snagai-a-icon">${AUDIT_ICON_SVG}</div>
      <span class="snagai-a-tip">Get an AI audit of this agency profile</span>
    `;
    auditBtn.addEventListener('click', () => onAudit(auditBtn));

    const divider = document.createElement('div');
    divider.className = 'snagai-a-div';

    const syncBtn = document.createElement('button');
    syncBtn.id = 'snagai-agency-sync-btn';
    syncBtn.className = 'snagai-a-btn';
    syncBtn.innerHTML = `
      <div class="snagai-a-icon">${SYNC_ICON_SVG}</div>
      <span class="snagai-a-dot"></span>
      <span class="snagai-a-tip">Sync this agency to Snag AI</span>
    `;
    syncBtn.addEventListener('click', async () => {
      syncBtn.disabled = true;
      const icon = syncBtn.querySelector('.snagai-a-icon');
      icon.innerHTML = `<span class="snagai-a-spin-icon" style="font-size:13px;color:#fff">↻</span>`;
      try {
        await onSync();
        icon.innerHTML = SYNC_ICON_SVG;
        icon.style.background = '#16a34a';
      } catch(e) {
        icon.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        icon.style.background = '#dc2626';
      }
      syncBtn.disabled = false;
    });

    // Audit is gated by "Profile audit" (not on Basic) — Sync never is, so
    // it always stays. Hide the button + divider entirely rather than a
    // paywall, per product decision.
    if (showAudit) {
      wrap.appendChild(auditBtn);
      wrap.appendChild(divider);
    }
    wrap.appendChild(syncBtn);
    document.body.appendChild(wrap);
  }

  // ── Panel styles — same visual language as profile-reader.js's panel ──────
  function injectAuditStyles() {
    if (document.getElementById('snagai-agency-audit-styles')) return;
    const s = document.createElement('style');
    s.id = 'snagai-agency-audit-styles';
    s.textContent = `
      @keyframes sn-a-slide-in{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
      @keyframes snagai-a-spin2{to{transform:rotate(360deg)}}

      #snagai-agency-audit-panel{all:initial;position:fixed!important;top:0!important;right:0!important;width:340px!important;height:100vh!important;background:#0d0d12!important;border-left:1px solid rgba(255,255,255,.08)!important;z-index:2147483647!important;display:flex!important;flex-direction:column!important;animation:sn-a-slide-in .22s ease!important;overflow:hidden!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;box-sizing:border-box!important}
      #snagai-agency-audit-panel *{box-sizing:border-box;font-family:inherit}

      .sn-hd{display:flex;align-items:center;gap:8px;padding:16px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
      .sn-hd-ico{width:26px;height:26px;background:#6366f1;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .sn-hd-lbl{font-size:13px;font-weight:600;color:#f0eeea;flex:1}
      .sn-hd-export{display:flex;align-items:center;gap:5px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.3);color:#a5a8f5;border-radius:999px;padding:5px 10px;font-size:10.5px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background .15s,border-color .15s}
      .sn-hd-export:hover:not(:disabled){background:rgba(99,102,241,.2);border-color:rgba(99,102,241,.45)}
      .sn-hd-export:disabled{opacity:.35;cursor:default}
      .sn-hd-export svg{flex-shrink:0}
      .sn-hd-close{background:none;border:none;color:rgba(255,255,255,.35);font-size:15px;cursor:pointer;line-height:1;padding:2px}
      .sn-hd-close:hover{color:rgba(255,255,255,.7)}

      .sn-bd{flex:1;overflow-y:auto;padding-bottom:40px}
      .sn-bd::-webkit-scrollbar{width:3px}
      .sn-bd::-webkit-scrollbar-thumb{background:rgba(99,102,241,.2);border-radius:2px}

      .sn-ehero{padding:26px 24px 20px;border-bottom:1px solid rgba(255,255,255,.06)}
      .sn-escore-row{display:flex;align-items:center;gap:8px;margin-bottom:12px}
      .sn-escore-circle{width:34px;height:34px;border-radius:50%;border-width:1.5px;border-style:solid;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .sn-escore-num{font-size:13px;font-weight:700}
      .sn-estatus{font-size:10px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:rgba(240,238,234,.35)}
      .sn-eheadline{font-family:Georgia,'Times New Roman',serif;font-size:20px;font-style:italic;line-height:1.4;color:#f0eeea}

      .sn-ebody{padding:20px 24px}
      .sn-esec-title{font-family:Georgia,'Times New Roman',serif;font-size:13px;font-weight:700;color:#f0eeea;margin-bottom:6px}
      .sn-esec-body{font-size:12px;color:rgba(240,238,234,.55);line-height:1.75;margin-bottom:18px}
      .sn-quote-hl{color:#a5b4fc}

      .sn-equote{padding:14px 16px;border-left:2px solid #4ade80;background:rgba(74,222,128,.04);margin-bottom:18px}
      .sn-equote-txt{font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:12.5px;color:rgba(240,238,234,.75);line-height:1.6}

      .sn-efix-title{font-family:Georgia,'Times New Roman',serif;font-size:13px;font-weight:700;color:#f0eeea;margin-bottom:8px}
      .sn-efix-primary{font-size:12px;color:rgba(240,238,234,.7);line-height:1.8;margin-bottom:8px}
      .sn-efix-secondary{font-size:11px;color:rgba(240,238,234,.4);line-height:1.7;margin-top:4px}

      .sn-erate{font-size:11px;color:rgba(240,238,234,.35);font-style:italic;line-height:1.6;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.05)}

      .sn-load{display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:11px}
      .sn-spin{width:28px;height:28px;border:2px solid rgba(99,102,241,.12);border-top-color:#6366f1;border-radius:50%;animation:snagai-a-spin2 .6s linear infinite}
      .sn-load-t{font-size:12.5px;font-weight:500;color:rgba(240,238,234,.5)}
      .sn-load-s{font-size:11px;color:rgba(240,238,234,.22);text-align:center;max-width:190px;line-height:1.6}
    `;
    document.head.appendChild(s);
  }

  function openAuditPanel() {
    let panel = document.getElementById('snagai-agency-audit-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'snagai-agency-audit-panel';
      panel.innerHTML = `
        <div class="sn-hd">
          <div class="sn-hd-ico">
            <svg width="13" height="13" viewBox="0 0 100 100" fill="none">
              <rect x="5" y="5" width="64" height="78" rx="10" stroke="white" stroke-width="7" fill="none"/>
              <line x1="16" y1="24" x2="55" y2="24" stroke="white" stroke-width="7" stroke-linecap="round"/>
              <line x1="16" y1="40" x2="55" y2="40" stroke="white" stroke-width="7" stroke-linecap="round"/>
              <line x1="16" y1="56" x2="38" y2="56" stroke="white" stroke-width="7" stroke-linecap="round"/>
              <circle cx="76" cy="77" r="23" fill="#4338ca"/>
              <polygon points="80,59 70,78 77,78 73,95 88,74 81,74" fill="white"/>
            </svg>
          </div>
          <span class="sn-hd-lbl">Agency Audit</span>
          <button class="sn-hd-export" id="snagai-agency-audit-export" disabled title="Export as PDF">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
            <span>PDF</span>
          </button>
          <button class="sn-hd-close" id="snagai-agency-audit-close">✕</button>
        </div>
        <div class="sn-bd" id="snagai-agency-audit-body">
          <div class="sn-load">
            <div class="sn-spin"></div>
            <div class="sn-load-t">Auditing your agency…</div>
            <div class="sn-load-s">Scoring 10 sections against top agency benchmarks</div>
          </div>
        </div>
      `;
      document.body.appendChild(panel);
      document.getElementById('snagai-agency-audit-close').addEventListener('click', () => panel.remove());
      document.getElementById('snagai-agency-audit-export').addEventListener('click', exportAuditPDF);
    }
    return panel;
  }

  // ── Audit PDF export state — holds the most recently rendered audit ──────
  let latestAuditResult = null;
  let latestAgencyName  = null;

  // ── Export the audit as a downloadable PDF — same native-jsPDF approach as
  // profile-reader.js's exportAuditPDF, adapted labels/section count only.
  async function exportAuditPDF() {
    const btn = document.getElementById('snagai-agency-audit-export');
    if (!btn || btn.disabled || !latestAuditResult) return;
    if (!window.jspdf) {
      console.log('[SnagAI] PDF export unavailable — jsPDF not loaded');
      return;
    }

    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span>Exporting…</span>`;

    try {
      const audit = latestAuditResult;
      const agencyName = latestAgencyName || 'Your agency';
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

      const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
      const INK = hx('#17171f'), MUTED = hx('#63636f'), FAINT = hx('#9b9ba6'), LINE = hx('#e4e4ea');
      const INDIGO = hx('#4f46e5'), INDIGO_BG = hx('#eef0fd'), INDIGO_DK = hx('#3730a3');
      const GREEN = hx('#15803d'), GREEN_BG = hx('#f0fdf4');
      const AMBER = hx('#b45309'), AMBER_BG = hx('#fffbeb');
      const RED = hx('#b91c1c'), RED_BG = hx('#fef2f2');
      const BLUE = hx('#1d4ed8'), BLUE_BG = hx('#eff6ff');
      const PURPLE = hx('#6d28d9'), ORANGE = hx('#c2410c');
      const STATUS_COLOR = { Elite: PURPLE, Strong: GREEN, Good: BLUE, Average: AMBER, Weak: ORANGE, Critical: RED };
      const BUCKET = n => n >= 8 ? { fg: GREEN, bg: GREEN_BG } : n >= 6 ? { fg: BLUE, bg: BLUE_BG } : n >= 4 ? { fg: AMBER, bg: AMBER_BG } : { fg: RED, bg: RED_BG };
      const IMPACT = { High: { fg: RED, bg: RED_BG }, Medium: { fg: AMBER, bg: AMBER_BG }, Low: { fg: BLUE, bg: BLUE_BG } };

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginX = 18, marginTop = 18, marginBottom = 16;
      const contentW = pageW - marginX * 2;
      let y = marginTop;

      const lineH = (size, factor = 1.32) => size * factor * 0.3528;
      const wrapped = (text, size, font = 'helvetica', style = 'normal', width = contentW) => {
        doc.setFont(font, style); doc.setFontSize(size);
        return doc.splitTextToSize(String(text || ''), width);
      };

      function drawHeader(full) {
        if (full) {
          doc.setFillColor(...INDIGO);
          doc.roundedRect(marginX, y, 9, 9, 2, 2, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
          doc.text('S', marginX + 4.5, y + 6.3, { align: 'center' });

          doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...INK);
          doc.text('Snag AI — Agency Audit Report', marginX + 13, y + 5.6);

          doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
          doc.text(`${agencyName}  ·  ${dateStr}`, marginX + 13, y + 10.6);

          y += 16;
        } else {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...INDIGO);
          doc.text('SNAG AI — AGENCY AUDIT REPORT', marginX, y);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...FAINT);
          doc.text(`${agencyName}`, pageW - marginX, y, { align: 'right' });
          y += 5;
        }
        doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
        doc.line(marginX, y, pageW - marginX, y);
        y += full ? 9 : 8;
      }

      function ensureSpace(needed) {
        if (y + needed > pageH - marginBottom) {
          doc.addPage();
          y = marginTop;
          drawHeader(false);
        }
      }

      drawHeader(true);

      const score = parseFloat(audit.overallScore) || 0;
      const status = audit.status || 'Good';
      const stColor = STATUS_COLOR[status] || BLUE;
      const r = 11, cx = marginX + r, cy = y + r;

      doc.setDrawColor(...stColor); doc.setLineWidth(1.1);
      doc.circle(cx, cy, r, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...stColor);
      doc.text(score.toFixed(1), cx, cy + 1.6, { align: 'center' });

      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...FAINT);
      doc.text(`${status.toUpperCase()} AGENCY`, cx + r + 7, cy - 0.5);

      y += r * 2 + 7;

      if (audit.headline) {
        const lines = wrapped(`“${audit.headline}”`, 15, 'times', 'italic');
        doc.setTextColor(...INK);
        doc.text(lines, marginX, y);
        y += lines.length * lineH(15) + 8;
      }

      doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
      doc.line(marginX, y, pageW - marginX, y);
      y += 10;

      (audit.sections || []).forEach(sec => {
        ensureSpace(16);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...INK);
        doc.text(sec.label || '', marginX, y);

        const b = BUCKET(sec.score);
        const badgeLabel = `${sec.score}/10`;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        const bw = doc.getTextWidth(badgeLabel) + 6;
        doc.setFillColor(...b.bg);
        doc.roundedRect(pageW - marginX - bw, y - 4.2, bw, 5.6, 1.4, 1.4, 'F');
        doc.setTextColor(...b.fg);
        doc.text(badgeLabel, pageW - marginX - bw / 2, y - 0.5, { align: 'center' });
        y += 7;

        if (sec.finding) {
          const lines = wrapped(sec.finding, 9.5);
          const h = lines.length * lineH(9.5);
          ensureSpace(h + 4);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...MUTED);
          doc.text(lines, marginX, y);
          y += h + 4;
        }

        if (sec.fix) {
          const innerW = contentW - 14;
          const richLines = layoutRichWords(doc, sec.fix, 9.5, 'helvetica', innerW);
          const boxH = richLines.length * lineH(9.5) + 11;
          ensureSpace(boxH + 6);
          doc.setFillColor(...INDIGO_BG);
          doc.roundedRect(marginX, y, contentW, boxH, 2, 2, 'F');
          doc.setFillColor(...INDIGO);
          doc.rect(marginX, y, 1.3, boxH, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.3); doc.setTextColor(...INDIGO_DK);
          doc.text('SUGGESTED FIX', marginX + 6, y + 5.5);
          drawRichLines(doc, richLines, marginX + 6, y + 10.3, lineH(9.5), INK, INDIGO, 9.5, 'helvetica');
          y += boxH + 9;
        } else {
          y += 5;
        }
      });

      const wins = audit.topWins || [];
      if (wins.length) {
        const quoteText = `“${wins.join('. ')}.”`;
        const qLines = wrapped(quoteText, 10, 'times', 'italic', contentW - 14);
        const boxH = qLines.length * lineH(10) + 10;
        ensureSpace(boxH + 8);
        doc.setFillColor(...GREEN_BG);
        doc.roundedRect(marginX, y, contentW, boxH, 2, 2, 'F');
        doc.setFillColor(...GREEN);
        doc.rect(marginX, y, 1.3, boxH, 'F');
        doc.setFont('times', 'italic'); doc.setFontSize(10); doc.setTextColor(...INK);
        doc.text(qLines, marginX + 7, y + 7);
        y += boxH + 10;
      }

      const fixes = audit.topFixes || [];
      if (fixes.length) {
        ensureSpace(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...INK);
        doc.text('What to fix first', marginX, y);
        y += 9;

        fixes.forEach(f => {
          const imp = IMPACT[f.impact] || IMPACT.Medium;
          const lines = wrapped(f.action, 9.8, 'helvetica', 'normal', contentW - 14);
          const textH = lines.length * lineH(9.8);
          ensureSpace(textH + 13);

          doc.setFillColor(...imp.fg);
          doc.circle(marginX + 3, y + 2.4, 3, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
          doc.text(String(f.priority), marginX + 3, y + 3.5, { align: 'center' });

          doc.setFont('helvetica', 'normal'); doc.setFontSize(9.8); doc.setTextColor(...INK);
          doc.text(lines, marginX + 9, y + 1.6);

          const impLabel = `${(f.impact || '').toUpperCase()} IMPACT`;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
          const iw = doc.getTextWidth(impLabel) + 5;
          const impY = y + 1.6 + textH + 2;
          doc.setFillColor(...imp.bg);
          doc.roundedRect(marginX + 9, impY - 3.6, iw, 4.8, 1.2, 1.2, 'F');
          doc.setTextColor(...imp.fg);
          doc.text(impLabel, marginX + 9 + iw / 2, impY - 0.3, { align: 'center' });

          y += textH + 13;
        });
      }

      if (audit.rateInsight) {
        const lines = wrapped(audit.rateInsight, 9, 'times', 'italic');
        const h = lines.length * lineH(9);
        ensureSpace(h + 10);
        doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
        doc.line(marginX, y, pageW - marginX, y);
        y += 7;
        doc.setFont('times', 'italic'); doc.setFontSize(9); doc.setTextColor(...MUTED);
        doc.text(lines, marginX, y);
        y += h;
      }

      const total = doc.internal.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...FAINT);
        doc.text('Generated by Snag AI', marginX, pageH - 9);
        doc.text(`Page ${p} of ${total}`, pageW - marginX, pageH - 9, { align: 'right' });
      }

      const safeName = String(agencyName).trim().replace(/[^a-z0-9]+/gi, '-').replace(/(^-+|-+$)/g, '') || 'agency';
      doc.save(`SnagAI-Agency-Audit-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);

      btn.innerHTML = `<span>Saved ✓</span>`;
    } catch (e) {
      console.log('[SnagAI] Agency PDF export failed:', e.message);
      btn.innerHTML = `<span>Export failed</span>`;
    } finally {
      setTimeout(() => { btn.disabled = false; btn.innerHTML = originalBtnHtml; }, 1800);
    }
  }

  // ── Render — identical shape/logic to profile-reader.js's renderAudit ─────
  function renderAudit(audit) {
    const body = document.getElementById('snagai-agency-audit-body');
    if (!body) return;

    const score  = parseFloat(audit.overallScore) || 0;
    const status = audit.status || 'Good';

    const SC = {
      Elite:    { c:'#c4b5fd' }, Strong: { c:'#4ade80' }, Good: { c:'#60a5fa' },
      Average:  { c:'#fbbf24' }, Weak:   { c:'#fb923c' }, Critical: { c:'#f87171' },
    };
    const st = SC[status] || SC.Good;
    const IC = { High:'#f87171', Medium:'#fbbf24', Low:'#60a5fa' };

    const secsHtml = (audit.sections || []).map(sec => {
      const txt = sec.fix
        ? `${renderSuggestionHTML(sec.finding || '')} — ${renderSuggestionHTML(sec.fix)}`
        : renderSuggestionHTML(sec.finding || '');
      return `<div class="sn-esec-title">${sec.label}</div><div class="sn-esec-body">${txt}</div>`;
    }).join('');

    const wins = audit.topWins || [];
    const quoteHtml = wins.length
      ? `<div class="sn-equote"><div class="sn-equote-txt">"${renderSuggestionHTML(wins.join('. '))}."</div></div>`
      : '';

    const fixes = audit.topFixes || [];
    const primary = fixes[0];
    const fixHtml = primary ? `
      <div class="sn-efix-title">What to fix first</div>
      <div class="sn-efix-primary">${renderSuggestionHTML(primary.action)} — <span style="color:${IC[primary.impact] || '#60a5fa'}">${primary.impact} impact, fix this first.</span></div>
      ${fixes.slice(1).map(f => `<div class="sn-efix-secondary">${renderSuggestionHTML(f.action)} — <span style="color:${IC[f.impact] || '#60a5fa'}">${(f.impact||'').toLowerCase()} impact</span></div>`).join('')}
    ` : '';

    body.innerHTML = `
      <div class="sn-ehero">
        <div class="sn-escore-row">
          <div class="sn-escore-circle" style="border-color:${st.c}"><span class="sn-escore-num" style="color:${st.c}">${score.toFixed(1)}</span></div>
          <span class="sn-estatus">${status} agency</span>
        </div>
        ${audit.headline ? `<div class="sn-eheadline">"${audit.headline}"</div>` : ''}
      </div>
      <div class="sn-ebody">
        ${secsHtml}
        ${quoteHtml}
        ${fixHtml}
        ${audit.rateInsight ? `<div class="sn-erate">${renderSuggestionHTML(audit.rateInsight)}</div>` : ''}
      </div>
    `;

    latestAuditResult = audit;
    const exportBtn = document.getElementById('snagai-agency-audit-export');
    if (exportBtn) exportBtn.disabled = false;
  }

  // ── Init ────────────────────────────────────────────────────────────────
  async function init() {
    const slug = location.href.split('/agencies/')[1]?.split('/')[0]?.split('?')[0] || '';
    if (!slug) return;

    // Same gate as profile-reader.js's freelancer flow: the toolbar only
    // ever appears for a URL registered via the options page's Agency
    // Profiles panel (extension/options/modules/agency-urls.js). No in-page
    // "add" prompt — registration happens in the extension UI only.
    const { registeredAgencies = [] } = await local.get(['registeredAgencies']);
    const isRegistered = registeredAgencies.some(a => a?.slug === slug);
    if (!isRegistered) return;

    const lastAuditKey = 'lastAgencyAudit_' + slug;
    const lastAuditProfileKey = lastAuditKey + '_profile';

    async function runAudit(btn) {
      btn.disabled = true;
      const icon = btn.querySelector('.snagai-a-icon');
      icon.innerHTML = `<span class="snagai-a-spin-icon" style="font-size:13px;color:#fff">↻</span>`;
      injectAuditStyles();
      openAuditPanel();
      try {
        const agencyData = await readAgencyData();
        if (!agencyData) throw new Error('Could not read agency data — try refreshing the page.');
        latestAgencyName = agencyData.name || null;

        const profileSnapshotForDiff = { ...agencyData };
        const { [lastAuditKey]: previousAudit, [lastAuditProfileKey]: previousProfileSnapshot } =
          await local.get([lastAuditKey, lastAuditProfileKey]);
        if (previousAudit) agencyData.previousAudit = previousAudit;
        if (previousProfileSnapshot) agencyData.profileChanges = computeAgencyChanges(previousProfileSnapshot, agencyData);

        console.log('[SnagAI] Agency audit request data:', agencyData);
        const audit = await chrome.runtime.sendMessage({ type: 'AUDIT_AGENCY', agency: agencyData });
        if (audit?.error) throw new Error(audit.error);

        renderAudit(audit);
        await local.set({ [lastAuditKey]: audit, [lastAuditProfileKey]: profileSnapshotForDiff });
        icon.innerHTML = AUDIT_ICON_SVG;
        icon.style.background = '#16a34a';
        btn.disabled = false;
        btn.onclick = () => {
          const p = document.getElementById('snagai-agency-audit-panel');
          if (!p) { openAuditPanel(); renderAudit(audit); }
        };
      } catch(e) {
        const body = document.getElementById('snagai-agency-audit-body');
        if (body) body.innerHTML = `<div style="padding:40px 24px;text-align:center;color:#f87171;font-size:13px">Audit failed: ${e.message}</div>`;
        icon.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        icon.style.background = '#dc2626';
        btn.disabled = false;
      }
    }

    async function runSync() {
      const agencyData = await readAgencyData();
      if (!agencyData) throw new Error('Could not read agency data');
      await local.set({ ['agencyFull_' + slug]: agencyData });
      console.log('[SnagAI] Agency synced:', agencyData.name);
    }

    // Fail-open on a network error — don't hide the button for an entitled
    // user just because GET_STATUS timed out; the server still enforces the
    // real gate when the button is clicked.
    let showAuditBtn = true;
    try {
      const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      if (status && status.auditLimit === 0) showAuditBtn = false;
    } catch(e) {}

    injectToolbar(runAudit, runSync, showAuditBtn);
  }

  init();
})();
