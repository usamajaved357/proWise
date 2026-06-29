// ── Snag AI Job Analysis Sidebar ───────────────────────────────────────────
// Manages the right-side analysis panel UI
// Loaded before content.js via manifest

window.SnagAI = window.SnagAI || {};

// ── Inject sidebar DOM (once per page) ─────────────────────────────────────
window.SnagAI.injectSidebar = function() {
  if (document.getElementById('sn-sidebar')) return;

  const sb = document.createElement('div');
  sb.id = 'sn-sidebar';
  sb.innerHTML = `
    <div class="sn-sb-head">
      <div class="sn-sb-logo">
        <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
          <rect x="5" y="5" width="64" height="78" rx="10" stroke="white" stroke-width="5.5" fill="none"/>
          <line x1="14" y1="23" x2="57" y2="23" stroke="white" stroke-width="5" stroke-linecap="round"/>
          <line x1="14" y1="35" x2="57" y2="35" stroke="white" stroke-width="5" stroke-linecap="round"/>
          <line x1="14" y1="47" x2="57" y2="47" stroke="white" stroke-width="5" stroke-linecap="round"/>
          <line x1="14" y1="59" x2="40" y2="59" stroke="white" stroke-width="5" stroke-linecap="round"/>
          <circle cx="76" cy="77" r="23" fill="#4338ca"/>
          <polygon points="80,59 70,78 77,78 73,95 88,74 81,74" fill="white"/>
        </svg>
      </div>
      <div class="sn-sb-head-text">
        <div class="sn-sb-title">Snag AI</div>
        <div class="sn-sb-sub">Job analysis</div>
      </div>
      <button class="sn-sb-close" id="sn-sb-close">✕</button>
    </div>
    <div class="sn-sb-body" id="sn-sb-body">
      <div class="sn-sb-placeholder">Click "Analyse job" to get AI-powered scoring for this job.</div>
    </div>
  `;

  document.body.appendChild(sb);

  document.getElementById('sn-sb-close')?.addEventListener('click', SnagAI.closeSidebar);

  // Close on outside click
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sn-sidebar');
    const trigger = document.getElementById('sn-trigger');
    if (!sidebar?.classList.contains('sn-sb-open')) return;
    if (!sidebar.contains(e.target) && !trigger?.contains(e.target)) {
      SnagAI.closeSidebar();
    }
  }, true);
};

// ── Open / Close ────────────────────────────────────────────────────────────
window.SnagAI.openSidebar = function() {
  document.getElementById('sn-sidebar')?.classList.add('sn-sb-open');
};

window.SnagAI.closeSidebar = function() {
  document.getElementById('sn-sidebar')?.classList.remove('sn-sb-open');
};

// ── Show loading state in sidebar body ─────────────────────────────────────
window.SnagAI.showSidebarLoading = function() {
  const body = document.getElementById('sn-sb-body');
  if (!body) return;
  body.innerHTML = `
    <div class="sn-sb-loading-state">
      <div class="sn-sb-spinner"></div>
      <div class="sn-sb-loading-text">Analysing with AI…</div>
      <div class="sn-sb-loading-sub">Reading job, profile and competition signals</div>
    </div>
  `;
};

// ── Show error state ────────────────────────────────────────────────────────
window.SnagAI.showSidebarError = function(msg) {
  const body = document.getElementById('sn-sb-body');
  if (!body) return;
  body.innerHTML = `
    <div class="sn-sb-error-state">
      <div class="sn-sb-error-icon">⚠</div>
      <div class="sn-sb-error-msg">${msg || 'Analysis failed. Try again.'}</div>
    </div>
  `;
};

// ── Render Claude analysis (free-reasoning format) ─────────────────────────
window.SnagAI.renderAnalysis = function(analysis) {
  const body = document.getElementById('sn-sb-body');
  if (!body || !analysis) return;

  const esc = s => SnagAI.esc ? SnagAI.esc(String(s || '')) : String(s || '');

  // Verdict styling
  const vMap = {
    'Apply.':           { col: '#4ade80', bg: 'rgba(74,222,128,.06)',  border: '#4ade80', btnStyle: 'background:#6366f1;color:#fff',                        btnLabel: 'Apply Now' },
    'Apply carefully.': { col: '#facc15', bg: 'rgba(250,204,21,.05)',  border: '#facc15', btnStyle: 'background:#6366f1;color:#fff',                        btnLabel: 'Apply Now' },
    'Skip this.':       { col: '#f87171', bg: 'rgba(248,113,113,.06)', border: '#f87171', btnStyle: 'background:rgba(255,255,255,.07);color:rgba(240,238,234,.45)', btnLabel: 'Apply anyway' },
  };
  const vm = vMap[analysis.verdict] || vMap['Apply carefully.'];

  // Competition pressure bar
  const cpMap = { 'Low': { pct: 18, col: '#4ade80' }, 'Moderate': { pct: 45, col: '#facc15' }, 'High': { pct: 72, col: '#f97316' }, 'Extreme': { pct: 92, col: '#f87171' } };
  const cp = cpMap[analysis.competitionPressure] || cpMap['Moderate'];

  // Profile fit bar
  const pfMap = { 'Poor': { pct: 15, col: '#f87171' }, 'Moderate': { pct: 40, col: '#facc15' }, 'Good': { pct: 62, col: '#e8a020' }, 'Strong': { pct: 80, col: '#4ade80' }, 'Excellent': { pct: 95, col: '#4ade80' } };
  const pf = pfMap[analysis.profileFit] || pfMap['Moderate'];

  const concerns  = analysis.concerns  || [];
  const strengths = analysis.strengths || [];

  const jobId    = SnagAI.state.cachedJobId;
  const applyUrl = jobId && jobId !== 'current'
    ? `https://www.upwork.com/nx/proposals/job/${jobId}/apply/` : '#';

  function insight(item, positive) {
    const dot = positive ? '#4ade80' : '#f87171';
    return `<div class="sn-sb-insight">
      <div class="sn-sb-fdot" style="background:${dot};margin-top:5px"></div>
      <div class="sn-sb-fbody">
        <div class="sn-sb-fname">${esc(item.title)}</div>
        ${item.detail ? `<div class="sn-sb-fnote">${esc(item.detail)}</div>` : ''}
      </div>
    </div>`;
  }

  body.innerHTML = `
    <!-- Verdict hero -->
    <div class="sn-sb-verdict-hero" style="background:${vm.bg};border-bottom:2px solid ${vm.border}">
      <div class="sn-sb-verdict-word" style="color:${vm.col}">${esc(analysis.verdict)}</div>
      ${analysis.verdictReason ? `<div class="sn-sb-verdict-reason">${esc(analysis.verdictReason)}</div>` : ''}
    </div>

    <!-- Competition + Profile fit bars — label → bar → word -->
    <div class="sn-sb-score-row" style="margin-top:10px">
      <div class="sn-sb-score-cell">
        <div class="sn-sb-slbl">Competition</div>
        <div class="sn-sb-sbar" style="margin-bottom:5px"><div class="sn-sb-sfill" style="width:${cp.pct}%;background:${cp.col}"></div></div>
        <div class="sn-sb-sword" style="color:${cp.col}">${esc(analysis.competitionPressure)}</div>
      </div>
      <div class="sn-sb-sdivider"></div>
      <div class="sn-sb-score-cell">
        <div class="sn-sb-slbl">You vs the job</div>
        <div class="sn-sb-sbar" style="margin-bottom:5px"><div class="sn-sb-sfill" style="width:${pf.pct}%;background:${pf.col}"></div></div>
        <div class="sn-sb-sword" style="color:${pf.col}">${esc(analysis.profileFit)}</div>
      </div>
    </div>

    <!-- Concerns -->
    ${concerns.length ? `
      <div class="sn-sb-section" style="color:rgba(248,113,113,.55)">Why you won't win</div>
      ${concerns.map(c => insight(c, false)).join('')}
    ` : ''}

    <!-- Strengths -->
    ${strengths.length ? `
      <div class="sn-sb-section sn-sb-section-green" style="margin-top:${concerns.length ? '10px' : '0'}">What's genuinely good</div>
      ${strengths.map(s => insight(s, true)).join('')}
    ` : ''}

    <!-- Hook -->
    ${analysis.hookSuggestion && !analysis.hookSuggestion.toLowerCase().includes('not applicable') ? `
      <div class="sn-sb-hook">
        <span class="sn-sb-hook-label">Open your first 160 chars with</span>
        ${esc(analysis.hookSuggestion.replace(/^Hook\s*\d+\s*[—\-]\s*/i, ''))}
      </div>
    ` : analysis.hookSuggestion ? `
      <div class="sn-sb-hook" style="opacity:.6">
        <span class="sn-sb-hook-label">Note</span>
        ${esc(analysis.hookSuggestion)}
      </div>
    ` : ''}

    <div class="sn-sb-apply-row">
      <a class="sn-sb-apply-btn" href="${applyUrl}" target="_blank" style="${vm.btnStyle}">${vm.btnLabel}</a>
    </div>
    ${analysis.fromCache ? '<div class="sn-sb-cache-note">Cached · click to re-analyse</div>' : ''}
  `;
};
