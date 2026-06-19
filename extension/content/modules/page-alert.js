// ── Win probability alert page ────────────────────────────────────────────────
window.SnagAI.showProbAlert = function(wp, hired) {
  return new Promise(resolve => {
    const isHired = hired > 0;

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

    const label = isHired ? 'Job Closed'
      : combined >= 70 ? 'Good Opportunity'
      : combined >= 55 ? 'Proceed with Caution'
      : combined >= 35 ? 'Warning — Low Odds'
      : 'Warning — High Risk';

    const summary = isHired
      ? 'Already hired — applying only burns your Connects with zero chance.'
      : combined >= 70 ? 'Strong opportunity. Low competition and your profile is a good match.'
      : combined >= 55 ? 'Some factors against you — worth applying if you can stand out.'
      : combined >= 35 ? 'Multiple red flags. High chance your proposal gets ignored.'
      : combined >= 20 ? 'Poor match — very high competition or profile mismatch. Skip it.'
      : 'Critical mismatch. Your profile does not meet this job. Save your Connects.';

    // Separate + annotate
    const filterNotes  = wp.filterNotes || {};
    const probFactors  = (wp.topProb  || []).map(f => {
      const n = { ...f }; if (filterNotes[f.label]) n.filterNote = filterNotes[f.label]; return n;
    }).sort((a, b) => a.delta - b.delta);
    const matchFactors = (wp.topMatch || []).map(f => {
      const n = { ...f }; if (filterNotes[f.label]) n.filterNote = filterNotes[f.label]; return n;
    }).sort((a, b) => a.delta - b.delta);

    // Action tip — always visible, based on worst signal
    const allSorted = [...probFactors, ...matchFactors].sort((a, b) => a.delta - b.delta);
    const top = allSorted[0];
    const topText = ((top?.label || '') + ' ' + (top?.value || '') + ' ' + (top?.note || '')).toLowerCase();
    let actionTip = '';
    if (isHired)                               { actionTip = 'Someone is already hired. Skip to save your Connects.'; }
    else if (topText.includes('proposal'))     { actionTip = '50+ proposals — your first 160 chars are everything. Use a hook with a specific result.'; }
    else if (topText.includes('skill') || topText.includes('mismatch')) { actionTip = 'Skill gap detected. Acknowledge it early and pivot to what you can deliver.'; }
    else if (topText.includes('interview'))    { actionTip = 'Someone is interviewing. Speed and specificity in your hook are your only edge.'; }
    else if (topText.includes('hire rate') || topText.includes('never hires')) { actionTip = "Client rarely hires from proposals. A direct CTA asking for a quick call works best."; }
    else if (topText.includes('invite'))       { actionTip = 'Client prefers invited freelancers. Open by referencing their specific requirements exactly.'; }
    else if (combined >= 70)                   { actionTip = 'Strong opportunity. Lead with your most relevant portfolio result in the opening line.'; }
    else if (combined >= 55)                   { actionTip = 'Worth applying. Stand out by opening with a specific result, not a generic intro.'; }
    else if (combined >= 35)                   { actionTip = 'Tough odds. Your only chance is an exceptional hook in the first 160 chars.'; }
    else                                       { actionTip = 'Very low odds. If you apply anyway, focus everything on the opening sentence.'; }

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

    document.getElementById('sn-body').innerHTML = `
      <div class="sn-alv2-wrap">

        <div class="sn-alb-top">
          <div class="sn-alert-status-badge" style="color:${barColor};background:${barColor}14;border-color:${barColor}30">
            <span class="sn-alert-status-dot" style="background:${barColor}"></span>
            ${label}
          </div>
          <p class="sn-alv2-summary">${summary}</p>
        </div>

        <div class="sn-score-cards">
          <div class="sn-score-card">
            <div class="sn-score-card-lbl">Win Probability</div>
            <div class="sn-score-card-num" style="color:${probColor}">${wp.probScore}%</div>
            <div class="sn-bar-track"><div class="sn-bar-fill" style="width:${wp.probScore}%;background:${probColor}"></div></div>
            <div class="sn-score-card-sub">Competition factors</div>
          </div>
          <div class="sn-score-card">
            <div class="sn-score-card-lbl">Profile Match</div>
            <div class="sn-score-card-num" style="color:${matchColor}">${wp.matchScore}%</div>
            <div class="sn-bar-track"><div class="sn-bar-fill" style="width:${wp.matchScore}%;background:${matchColor}"></div></div>
            <div class="sn-score-card-sub">Your profile vs job</div>
          </div>
        </div>

        <div class="sn-factor-cols">
          <div class="sn-factor-col">
            <div class="sn-col-label">Competition</div>
            ${probFactors.length ? probFactors.map(f => factorPill(f)).join('') : '<div class="sn-af-empty">No data</div>'}
          </div>
          <div class="sn-factor-col">
            <div class="sn-col-label">Profile match</div>
            ${matchFactors.length ? matchFactors.map(f => factorPill(f)).join('') : '<div class="sn-af-empty">No data</div>'}
          </div>
        </div>

        <div class="sn-alb-tip">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,.7)" stroke-width="2" style="flex-shrink:0;margin-top:1px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>${actionTip}</span>
        </div>

        <div class="sn-alv2-footer" id="sn-alert-footer">
          <button class="sn-alv2-cancel" id="sn-alert-cancel">Skip this job</button>
          ${isHired ? '' : '<button class="sn-alv2-anyway" id="sn-alert-anyway"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c0 0 .7 5.8 2.1 7.2C15.5 10.6 21 12 21 12s-5.5 1.4-6.9 2.8C12.7 16.2 12 22 12 22s-.7-5.8-2.1-7.2C8.5 13.4 3 12 3 12s5.5-1.4 6.9-2.8C11.3 7.8 12 2 12 2z"/></svg>Write proposal</button>'}
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
    if (ab) ab.addEventListener('click', () => { SnagAI.showLoading(); resolve(false); });
  });
};
