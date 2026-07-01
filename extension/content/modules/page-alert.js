// ── Win probability alert page ────────────────────────────────────────────────
window.SnagAI.showProbAlert = function(wp, hired, jobUnavailable) {
  return new Promise(resolve => {
    const isHired = hired > 0 || !!jobUnavailable;

    const riskPenalty    = Math.min(40, (wp.riskItems || []).length * 12);
    const severeMismatch = (wp.topMatch || []).some(f => f.skillMatch && f.delta <= -25);
    const weakMismatch   = (wp.topMatch || []).some(f => f.skillMatch && f.delta <= -15);
    let combined = isHired ? 0 : Math.max(0, Math.min(95,
      Math.round(wp.probScore * 0.60 + wp.matchScore * 0.25 - riskPenalty * 0.15)
    ));
    if (severeMismatch) combined = Math.min(combined, 12);
    else if (weakMismatch) combined = Math.min(combined, 38);

    const barColor   = combined >= 70 ? '#4ade80' : combined >= 45 ? '#facc15' : '#f87171';
    const probColor  = wp.probScore  >= 70 ? '#4ade80' : wp.probScore  >= 45 ? '#facc15' : '#f87171';
    const matchColor = wp.matchScore >= 70 ? '#4ade80' : wp.matchScore >= 45 ? '#e8a020' : '#f87171';

    const label = jobUnavailable ? 'Job Unavailable'
      : isHired ? 'Job Closed'
      : combined >= 70 ? 'Good Opportunity'
      : combined >= 55 ? 'Proceed with Caution'
      : combined >= 35 ? 'Warning — Low Odds'
      : 'Warning — High Risk';

    const summary = jobUnavailable
      ? 'This job is no longer available. It has been removed or closed by the client.'
      : isHired
      ? 'Already hired — applying only burns your Connects with zero chance.'
      : combined >= 70 ? 'Strong opportunity. Low competition and your profile is a good match.'
      : combined >= 55 ? 'Some factors against you — worth applying if you can stand out.'
      : combined >= 35 ? 'Multiple red flags. High chance your proposal gets ignored.'
      : combined >= 20 ? 'Poor match — very high competition or profile mismatch. Skip it.'
      : 'Critical mismatch. Your profile does not meet this job. Save your Connects.';

    // Separate + annotate — only show negative factors
    const filterNotes  = wp.filterNotes || {};
    const probFactors  = (wp.topProb  || []).map(f => {
      const n = { ...f };
      n.value = n.value !== null && typeof n.value === 'object' ? JSON.stringify(n.value) : String(n.value || '');
      if (filterNotes[f.label]) n.filterNote = filterNotes[f.label]; return n;
    }).filter(f => f.delta < 0).sort((a, b) => a.delta - b.delta);
    const matchFactors = (wp.topMatch || []).map(f => {
      const n = { ...f };
      n.value = n.value !== null && typeof n.value === 'object' ? JSON.stringify(n.value) : String(n.value || '');
      if (filterNotes[f.label]) n.filterNote = filterNotes[f.label]; return n;
    }).filter(f => f.delta < 0).sort((a, b) => a.delta - b.delta);

    // Short inline tip merged into summary line
    const allSorted = [...probFactors, ...matchFactors].sort((a, b) => a.delta - b.delta);
    const top = allSorted[0];
    const topText = ((top?.label || '') + ' ' + (top?.value || '') + ' ' + (top?.note || '')).toLowerCase();
    let shortTip = '';
    if (isHired)                                                          { shortTip = 'Skip to save your Connects.'; }
    else if (topText.includes('proposal'))                                { shortTip = 'Hook them in the first 160 chars.'; }
    else if (topText.includes('skill') || topText.includes('mismatch'))  { shortTip = 'Acknowledge the gap, pivot to delivery.'; }
    else if (topText.includes('interview'))                               { shortTip = 'Speed is your only edge now.'; }
    else if (topText.includes('hire rate') || topText.includes('never')) { shortTip = 'Ask for a quick call directly.'; }
    else if (topText.includes('invite'))                                  { shortTip = 'Reference their exact requirements.'; }
    else if (combined >= 70)                                              { shortTip = 'Lead with your most relevant result.'; }
    else if (combined >= 55)                                              { shortTip = 'Open with a specific result, not a generic intro.'; }
    else if (combined >= 35)                                              { shortTip = 'Exceptional hook is your only chance.'; }
    else                                                                  { shortTip = 'Save your Connects.'; }

    function factorPill(f) {
      const isNeg = f.delta < 0, isPos = f.delta > 0;
      const col   = isPos ? '#4ade80' : isNeg ? '#f87171' : '#facc15';
      const lbl   = f.label + (f.value ? ': ' + f.value : '');
      const delta = isPos ? '+' + f.delta : isNeg ? String(f.delta) : '0';
      const dcol  = isPos ? 'rgba(74,222,128,.9)' : isNeg ? 'rgba(248,113,113,.9)' : 'rgba(250,204,21,.75)';
      const dbg   = isPos ? 'rgba(74,222,128,.12)' : isNeg ? 'rgba(248,113,113,.14)' : 'rgba(250,204,21,.12)';
      const extra = f.filterNote ? ' sn-af-item--filter' : '';
      return '<div class="sn-af-item' + extra + '">'
        + '<span class="sn-af-dot" style="background:' + col + '"></span>'
        + '<div class="sn-af-body">'
        + '<span class="sn-af-label">' + lbl + '</span>'
        + (f.note ? '<span class="sn-af-note">' + f.note + '</span>' : '')
        + (f.filterNote ? '<span class="sn-af-note" style="color:rgba(250,204,21,.65)">⚠ ' + f.filterNote + '</span>' : '')
        + '</div>'
        + '<span class="sn-af-score" style="color:' + dcol + ';background:' + dbg + '">' + delta + '</span>'
        + '</div>';
    }

    // Move action buttons to panel header (near close button)
    const headRight = document.querySelector('#sn-panel .sn-head-right');
    const closeBtn  = document.getElementById('sn-close');
    if (headRight && closeBtn) {
      const existing = headRight.querySelectorAll('.sn-alv2-cancel,.sn-alv2-anyway');
      existing.forEach(el => el.remove());
      closeBtn.insertAdjacentHTML('beforebegin',
        `<button class="sn-alv2-cancel" id="sn-alert-cancel">Skip</button>`
        + (isHired ? '' : `<button class="sn-alv2-anyway" id="sn-alert-anyway">✦ Write</button>`)
      );
    }

    // Center panel at compact size for the alert
    const p  = document.getElementById('sn-panel');
    const pw = Math.min(620, window.innerWidth * 0.55);
    p.style.width     = pw + 'px';
    p.style.height    = 'auto';
    p.style.maxHeight = '88vh';
    p.style.left      = Math.round((window.innerWidth - pw) / 2) + 'px';
    p.style.top       = Math.max(80, Math.round(window.innerHeight * 0.1)) + 'px';
    p.style.right     = '';
    p.classList.add('sn-alert-mode');

    document.getElementById('sn-body').innerHTML = `
      <div class="sn-alv2-wrap">

        <!-- Alert heading + summary only, no buttons -->
        <div class="sn-alb-actionbar">
          <div class="sn-alb-left">
            <div class="sn-alert-verdict">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Alert
            </div>
            <p class="sn-alv2-summary">${summary.replace(/\s*—\s*/g, ' ').trim()}${shortTip ? ' ' + shortTip : ''}</p>
          </div>
        </div>

        <!-- Score chips -->
        <div class="sn-score-chips">
          <div class="sn-score-chip">
            <span class="sn-chip-num" style="color:${probColor}">${wp.probScore}%</span>
            <span class="sn-chip-lbl">Win probability</span>
            <div class="sn-chip-bar"><div class="sn-chip-fill" style="width:${wp.probScore}%;background:${probColor}"></div></div>
          </div>
          <div class="sn-score-chip">
            <span class="sn-chip-num" style="color:${matchColor}">${wp.matchScore}%</span>
            <span class="sn-chip-lbl">Profile match</span>
            <div class="sn-chip-bar"><div class="sn-chip-fill" style="width:${wp.matchScore}%;background:${matchColor}"></div></div>
          </div>
        </div>

        <!-- Negative factors — two clean columns -->
        <div class="sn-factor-cols">
          <div class="sn-factor-col">
            <div class="sn-col-label">Risk factors</div>
            ${probFactors.length ? probFactors.map(f => factorPill(f)).join('') : '<div class="sn-af-empty">No risk factors</div>'}
          </div>
          <div class="sn-factor-col">
            <div class="sn-col-label">Profile gaps</div>
            ${matchFactors.length ? matchFactors.map(f => factorPill(f)).join('') : '<div class="sn-af-empty">No profile gaps</div>'}
          </div>
        </div>

      </div>
    `;

    document.getElementById('sn-alert-cancel')?.addEventListener('click', () => {
      const REASONS = [
        { v: 'too_competitive', l: 'Too competitive' },
        { v: 'wrong_budget',    l: 'Wrong budget'    },
        { v: 'not_my_niche',    l: 'Not my niche'    },
        { v: 'bad_client',      l: 'Bad client'      },
      ];
      document.getElementById('sn-body').innerHTML =
        '<div class="sn-skip-overlay">' +
          '<div class="sn-skip-title">Why are you skipping?</div>' +
          '<div class="sn-skip-subtitle">Helps tune your scoring over time</div>' +
          '<div class="sn-skip-options">' +
            REASONS.map(r =>
              '<label class="sn-skip-option">' +
                '<input type="radio" name="sr" value="' + r.v + '">' +
                '<div class="sn-skip-check"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>' +
                '<span>' + r.l + '</span>' +
              '</label>'
            ).join('') +
          '</div>' +
          '<button class="sn-skip-confirm" id="sn-skip-confirm" disabled>Skip this job</button>' +
          '<button class="sn-skip-noreason" id="sn-skip-noreason">Skip without reason</button>' +
        '</div>';

      document.querySelectorAll('.sn-skip-option input').forEach(radio => {
        radio.addEventListener('change', () => {
          document.querySelectorAll('.sn-skip-option').forEach(o => o.classList.remove('sn-opt-on'));
          radio.closest('.sn-skip-option').classList.add('sn-opt-on');
          document.getElementById('sn-skip-confirm').removeAttribute('disabled');
        });
      });
      document.getElementById('sn-skip-confirm')?.addEventListener('click', () => {
        const reason = document.querySelector('.sn-skip-option input:checked')?.value || 'other';
        chrome.storage.local.get(['skipReasons'], r => {
          const arr = r.skipReasons || [];
          arr.push({ reason, ts: Date.now() });
          if (arr.length > 200) arr.shift();
          chrome.storage.local.set({ skipReasons: arr });
        });
        SnagAI.closePanel(); resolve(true);
      });
      document.getElementById('sn-skip-noreason')?.addEventListener('click', () => {
        SnagAI.closePanel(); resolve(true);
      });
    });

    const ab = document.getElementById('sn-alert-anyway');
    if (ab) ab.addEventListener('click', () => {
      // Restore panel to full centered size before generating
      const headRight = document.querySelector('#sn-panel .sn-head-right');
      headRight?.querySelectorAll('.sn-alv2-cancel,.sn-alv2-anyway').forEach(el => el.remove());
      const pm = document.getElementById('sn-panel');
      if (pm) { pm.style.right = ''; pm.classList.remove('sn-alert-mode'); }
      SnagAI.centerPanel();
      SnagAI.showLoading();
      resolve(false);
    });
  });
};
