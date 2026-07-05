// ── Snag AI Agency Reader v2 ───────────────────────────────────────────────
// Mirrors extension/content/profile-reader.js's toolbar/panel/render pattern
// for agency profiles. renderAudit and the quote-highlighting logic are
// copied verbatim (not imported) rather than extracted into a shared module
// yet — a refactor of the already-verified freelancer file right before this
// feature's first real test would conflate two risky changes in one pass.
// Extracting into extension/content/modules/audit-ui.js is a deliberate,
// flagged fast-follow once this is proven working, not skipped by accident.
//
// PDF export is intentionally NOT included in this pass — sidebar-only, so
// we can validate the rubric/data pipeline against real audits first.
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

  // ── Code-verified diff for progress-tracking — mirrors profile-reader.js's
  // computeProfileChanges, adapted to agency fields (rate range instead of a
  // single rate, portfolio/workHistory counts instead of certs/employment).
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

  // ── Toolbar — same visual pattern as profile-reader.js's shared capsule ────
  function injectToolbar(onAudit, onSync) {
    if (document.getElementById('snagai-agency-toolbar')) return;

    const AUDIT_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
    const SYNC_ICON_SVG  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';

    const style = document.createElement('style');
    style.textContent = `
      @keyframes snagai-a-pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes snagai-a-spin{to{transform:rotate(360deg)}}
      #snagai-agency-toolbar{position:fixed;bottom:28px;right:28px;z-index:2147483646;display:flex;align-items:stretch;background:#111827;border:1px solid rgba(99,102,241,.28);border-radius:999px;box-shadow:0 8px 28px rgba(0,0,0,.45);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;transition:transform .2s,box-shadow .2s}
      #snagai-agency-toolbar:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(0,0,0,.55)}
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
    `;
    document.head.appendChild(style);

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

    wrap.appendChild(auditBtn);
    wrap.appendChild(divider);
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
    }
    return panel;
  }

  // ── Render — identical shape/logic to profile-reader.js's renderAudit;
  // works unchanged because the agency JSON schema (sections[]/topWins/
  // topFixes/overallScore/status/headline/rateInsight) was deliberately
  // built to match it.
  function renderAudit(audit) {
    const body = document.getElementById('snagai-agency-audit-body');
    if (!body) return;

    const score  = parseFloat(audit.overallScore) || 0;
    const status = audit.status || 'Good';

    const SC = {
      Elite:    { c:'#c4b5fd', bg:'rgba(196,181,253,.08)', bd:'rgba(196,181,253,.18)' },
      Strong:   { c:'#4ade80', bg:'rgba(74,222,128,.07)',  bd:'rgba(74,222,128,.18)'  },
      Good:     { c:'#60a5fa', bg:'rgba(96,165,250,.07)',  bd:'rgba(96,165,250,.18)'  },
      Average:  { c:'#fbbf24', bg:'rgba(251,191,36,.07)',  bd:'rgba(251,191,36,.18)'  },
      Weak:     { c:'#fb923c', bg:'rgba(251,146,60,.07)',  bd:'rgba(251,146,60,.18)'  },
      Critical: { c:'#f87171', bg:'rgba(248,113,113,.07)', bd:'rgba(248,113,113,.18)' },
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
  }

  // ── Init ────────────────────────────────────────────────────────────────
  // No registeredProfiles gate yet — that's the options-page registration UI
  // for agencies, which doesn't exist yet. Toolbar shows on any /agencies/*
  // page for now, purely to unblock real-data testing; tightening this to
  // match the freelancer flow's registered-profile gating is a separate,
  // explicitly deferred piece of work.
  async function init() {
    const slug = location.href.split('/agencies/')[1]?.split('/')[0]?.split('?')[0] || '';
    if (!slug) return;

    const lastAuditKey = 'lastAgencyAudit_' + slug;
    const lastAuditProfileKey = lastAuditKey + '_profile';

    injectAuditStyles();

    injectToolbar(async (btn) => {
      btn.disabled = true;
      const icon = btn.querySelector('.snagai-a-icon');
      icon.innerHTML = `<span class="snagai-a-spin-icon" style="font-size:13px;color:#fff">↻</span>`;
      openAuditPanel();
      try {
        const agencyData = await readAgencyData();
        if (!agencyData) throw new Error('Could not read agency data — try refreshing the page.');

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
        icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
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
    }, async () => {
      const agencyData = await readAgencyData();
      if (!agencyData) throw new Error('Could not read agency data');
      await local.set({ ['agencyFull_' + slug]: agencyData });
      console.log('[SnagAI] Agency synced:', agencyData.name);
    });
  }

  init();
})();
