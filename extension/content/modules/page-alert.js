// ── Win probability alert page ────────────────────────────────────────────────
window.SnagAI.showProbAlert = function(wp, hired) {
  return new Promise(resolve => {
    const isHired = hired > 0;

    const riskPenalty = Math.min(40, (wp.riskItems || []).length * 12);
    const severeMismatch = (wp.topMatch || []).some(f => f.skillMatch && f.delta <= -25);
    const weakMismatch   = (wp.topMatch || []).some(f => f.skillMatch && f.delta <= -15);
    let combined = isHired ? 0 : Math.max(0, Math.min(95,
      Math.round(wp.probScore * 0.60 + wp.matchScore * 0.25 - riskPenalty * 0.15)
    ));
    if (severeMismatch) combined = Math.min(combined, 12);
    else if (weakMismatch) combined = Math.min(combined, 38);
    const nc = combined >= 70 ? '#34d399' : combined >= 45 ? '#f59e0b' : '#f87171';
    const label = isHired ? 'Job Closed'
      : combined >= 70 ? 'Good Opportunity'
      : combined >= 55 ? 'Proceed with Caution'
      : combined >= 35 ? 'Warning — Low Odds'
      : 'Warning — High Risk';

    const summary = isHired
      ? 'Already hired — applying only burns your Connects with zero chance.'
      : combined >= 70
        ? 'Strong opportunity. Low competition and your profile is a good match.'
        : combined >= 55
          ? 'Some factors against you — worth applying if you can stand out.'
          : combined >= 35
            ? 'Multiple red flags. High chance your proposal gets ignored.'
            : combined >= 20
              ? 'Poor match — very high competition or profile mismatch. Skip it.'
              : 'Critical mismatch. Your profile does not meet this job. Save your Connects.';

    const riskItems  = (wp.riskItems || []);
    const probFactors  = (wp.topProb  || []);
    const matchFactors = (wp.topMatch || []);

    // All score factors combined — sorted negative first, then positive
    const scoreFactors = [
      ...probFactors.map(f => ({ ...f, src: 'Competition' })),
      ...matchFactors.map(f => ({ ...f, src: 'Profile Match' })),
    ].sort((a, b) => a.delta - b.delta); // most negative first

    function factorPill(f) {
      const col = f.delta > 0 ? '#4ade80' : f.delta < 0 ? '#f87171' : '#facc15';
      const bg  = f.delta > 0 ? 'rgba(74,222,128,.07)' : f.delta < 0 ? 'rgba(248,113,113,.09)' : 'rgba(250,204,21,.07)';
      const labelText = f.label + (f.value ? ': ' + f.value : '');
      const note = f.note || '';
      const deltaStr = f.delta > 0 ? '+' + f.delta : f.delta < 0 ? String(f.delta) : '0';
      const scoreCol = f.delta > 0 ? 'rgba(74,222,128,.8)' : f.delta < 0 ? 'rgba(248,113,113,.8)' : 'rgba(250,204,21,.7)';
      return '<div class="sn-af-item" style="background:' + bg + '">'
        + '<span class="sn-af-dot" style="background:' + col + '"></span>'
        + '<div class="sn-af-body">'
        + '<span class="sn-af-label">' + labelText + '</span>'
        + (note ? '<span class="sn-af-note">' + note + '</span>' : '')
        + '</div>'
        + '<span class="sn-af-score" style="color:' + scoreCol + '">' + deltaStr + '</span>'
        + '</div>';
    }

    function riskPill(text) {
      return '<div class="sn-af-item" style="background:rgba(248,113,113,.09)">'
        + '<span class="sn-af-dot" style="background:#f87171"></span>'
        + '<div class="sn-af-body"><span class="sn-af-label">' + text + '</span></div>'
        + '<span class="sn-af-filter-tag">Filter</span>'
        + '</div>';
    }

    const topFactor = scoreFactors[0] || (riskItems.length ? { label: riskItems[0] } : null);
    const topLabel  = topFactor ? (topFactor.label || '').toLowerCase() : '';
    let actionTip = '';
    if (isHired) {
      actionTip = 'Someone is already hired. Skip to save your Connects.';
    } else if (topLabel.includes('50+') || topLabel.includes('proposal')) {
      actionTip = '50+ proposals — your first 160 chars are everything. Use a hook with a specific result.';
    } else if (topLabel.includes('skill') || topLabel.includes('match')) {
      actionTip = 'Skill gap detected. Acknowledge it early and pivot to what you can deliver.';
    } else if (topLabel.includes('interview') || topLabel.includes('already')) {
      actionTip = 'Someone is interviewing. Speed and specificity in your hook are your only edge.';
    } else if (topLabel.includes('budget') || topLabel.includes('rate')) {
      actionTip = "Budget mismatch. Address your rate directly in the letter — don't leave it unspoken.";
    } else if (topLabel.includes('hire rate') || topLabel.includes('rarely')) {
      actionTip = "Client rarely hires from proposals. A direct CTA asking for a quick call works best.";
    } else if (topLabel.includes('invite') || topLabel.includes('prefer')) {
      actionTip = 'Client prefers invited freelancers. Open by referencing their specific requirements exactly.';
    } else if (combined >= 70) {
      actionTip = 'Strong opportunity. Lead with your most relevant portfolio result in the opening line.';
    } else if (combined >= 55) {
      actionTip = 'Worth applying. Stand out by opening with a specific result, not a generic intro.';
    } else if (combined >= 35) {
      actionTip = 'Tough odds. Your only chance is an exceptional hook in the first 160 chars.';
    } else {
      actionTip = 'Very low odds. If you apply anyway, focus everything on the opening sentence.';
    }

    const barColor   = combined >= 70 ? '#4ade80' : combined >= 45 ? '#facc15' : '#f87171';
    const probColor  = wp.probScore  >= 70 ? '#4ade80' : wp.probScore  >= 45 ? '#facc15' : '#f87171';
    const matchColor = wp.matchScore >= 70 ? '#4ade80' : wp.matchScore >= 45 ? '#e8a020' : '#f87171';

    document.getElementById('sn-body').innerHTML = `
      <div class="sn-alv2-wrap">
        <div class="sn-alert-top">
          <div class="sn-alert-summary-col">
            <div class="sn-alert-status-badge" style="color:${barColor};background:${barColor}14;border-color:${barColor}30">
              <span class="sn-alert-status-dot" style="background:${barColor}"></span>
              ${label}
            </div>
            <p class="sn-alv2-summary">${summary}</p>
            ${!isHired ? '<div class="sn-alv2-cta">Your Connects are real money.</div>' : ''}
            <button class="sn-why-toggle" id="sn-why-toggle">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6l-.7.5V18H9v-2.5l-.7-.5A7 7 0 0 1 12 2z"/></svg>
              What should I do?
              <svg class="sn-why-chevron" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="sn-why-body" id="sn-why-body" style="display:none">
              <div class="sn-why-tip">${actionTip}</div>
            </div>
          </div>
          <div class="sn-alert-scores-col">
            <div class="sn-alert-scores-label">Scores</div>
            <div class="sn-score-item">
              <div class="sn-score-row">
                <span class="sn-score-name">Win probability</span>
                <span class="sn-score-pct" style="color:${probColor}">${wp.probScore}%</span>
              </div>
              <div class="sn-bar-track"><div class="sn-bar-fill" style="width:${wp.probScore}%;background:${probColor}"></div></div>
            </div>
            <div class="sn-score-item" style="margin-bottom:0">
              <div class="sn-score-row">
                <span class="sn-score-name">Profile match</span>
                <span class="sn-score-pct" style="color:${matchColor}">${wp.matchScore}%</span>
              </div>
              <div class="sn-bar-track"><div class="sn-bar-fill" style="width:${wp.matchScore}%;background:${matchColor}"></div></div>
            </div>
          </div>
        </div>

        <div class="sn-signals-divider"><div class="sn-signals-line"></div><span class="sn-signals-label">Signals</span><div class="sn-signals-line"></div></div>
        ${riskItems.length ? `
          <div class="sn-af-section-lbl">Filter Violations</div>
          <div class="sn-alv2-factors" style="margin-bottom:4px">
            ${riskItems.map(r => riskPill(r)).join('')}
          </div>
        ` : ''}
        ${scoreFactors.length ? `
          <div class="sn-af-section-lbl">Score Factors</div>
          <div class="sn-alv2-factors">
            ${scoreFactors.map(f => factorPill(f)).join('')}
          </div>
        ` : (!riskItems.length ? '<div class="sn-af-empty">No major issues detected</div>' : '')}

        <div class="sn-alv2-footer" id="sn-alert-footer">
          <button class="sn-alv2-cancel" id="sn-alert-cancel">Skip this job</button>
          ${isHired ? '' : '<button class="sn-alv2-anyway" id="sn-alert-anyway"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c0 0 .7 5.8 2.1 7.2C15.5 10.6 21 12 21 12s-5.5 1.4-6.9 2.8C12.7 16.2 12 22 12 22s-.7-5.8-2.1-7.2C8.5 13.4 3 12 3 12s5.5-1.4 6.9-2.8C11.3 7.8 12 2 12 2z"/></svg>Write proposal</button>'}
        </div>
      </div>
    `;

    document.getElementById('sn-why-toggle')?.addEventListener('click', () => {
      const body    = document.getElementById('sn-why-body');
      const chevron = document.querySelector('.sn-why-chevron');
      const open    = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      if (chevron) chevron.style.transform = open ? '' : 'rotate(180deg)';
      document.getElementById('sn-why-toggle').classList.toggle('sn-why-active', !open);
    });

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
