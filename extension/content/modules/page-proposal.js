// ── Proposal render page ──────────────────────────────────────────────────────
window.SnagAI.renderProposal = function(data) {
  const { letter, hookType, tips, usage } = data;
  if (!letter) { SnagAI.showError('Empty proposal. Please try again.'); return; }

  const jobStats = SnagAI.state.jobStats || {};
  const profile  = SnagAI.state.profile  || {};
  const wp = SnagAI.calcWinProbability(jobStats, profile);
  const remaining = usage && usage.remaining !== undefined ? usage.remaining : null;

  document.getElementById('sn-hook-label').textContent = hookType ? 'Hook: ' + hookType : 'Proposal ready';

  const badge = document.getElementById('sn-usage-badge');
  if (remaining !== null) {
    badge.style.display = 'flex';
    badge.className = 'sn-usage-badge ' + (remaining <= 5 ? 'sn-badge-danger' : remaining <= 20 ? 'sn-badge-warn' : 'sn-badge-ok');
    badge.textContent = remaining + ' left';
  }

  function buildCallouts(wp, jobStats, profile) {
    const out = [];
    const loc = (jobStats.location || '').toLowerCase();
    const myRate = parseInt((profile.hourlyRate || '0').replace(/[^0-9]/g, '')) || 0;
    const budget = parseInt((jobStats.budget || '0').replace(/[^0-9]/g, '')) || 0;

    if (/miami|florida|atlanta|eastern|charlotte|boston|new york|nyc/.test(loc))
      out.push({ type:'tip', text:'Client is in Eastern time — mention your US Eastern overlap directly.' });
    else if (/los angeles|san francisco|seattle|pacific|california/.test(loc))
      out.push({ type:'tip', text:'Client is Pacific time — note your availability overlap hours.' });
    else if (/london|uk|europe|berlin|amsterdam|paris/.test(loc))
      out.push({ type:'tip', text:'Client is in Europe — mention any overlap with their working hours.' });

    if (budget > 0 && myRate > 0) {
      if (budget < myRate * 0.8)
        out.push({ type:'warn', text:'Budget $'+budget+'/hr is below your $'+myRate+'/hr rate — address this directly.' });
      else if (budget >= myRate)
        out.push({ type:'ok', text:'Budget $'+budget+'/hr matches your rate — state your price confidently in the letter.' });
    }

    const compFactor = (wp.topProb||[]).find(f => /proposal/i.test(f.label));
    if (compFactor && compFactor.delta < 0)
      out.push({ type:'warn', text:'High competition — your first 160 chars must open with a specific result, not a generic intro.' });
    else if (compFactor && compFactor.delta > 0)
      out.push({ type:'ok', text:'Low competition — apply now while the field is small.' });

    const skillFactor = (wp.topMatch||[]).find(f => f.skillMatch);
    if (skillFactor && skillFactor.delta < 0)
      out.push({ type:'warn', text:'Skill gap detected — acknowledge it early and pivot to transferable experience.' });

    const hireFactor = (wp.topProb||[]).find(f => /hire rate/i.test(f.label));
    if (hireFactor) {
      if (hireFactor.delta < 0)
        out.push({ type:'warn', text:'Low hire rate — end your letter with a direct CTA asking for a 10-minute call.' });
      else if (hireFactor.delta > 0)
        out.push({ type:'ok', text:'Active hiring client — strong CTA works well here.' });
    }

    (wp.riskItems||[]).slice(0, 1).forEach(r => {
      out.push({ type:'risk', text: r });
    });

    return out.slice(0, 4);
  }

  const callouts = buildCallouts(wp, jobStats, profile);

  function countWords(el) {
    return (el?.innerText || '').trim().split(/\s+/).filter(w => w).length;
  }

  // Restore full panel size when showing proposal
  SnagAI.centerPanel();

  document.getElementById('sn-body').innerHTML = `
    <div class="sn-cl-wrap">
      <div class="sn-cl-left">
        <div class="sn-cl-header">
          <span class="sn-cl-title">Your Proposal</span>
          <div class="sn-cl-header-right">
            <span class="sn-word-count" id="sn-word-count">0 words</span>
            <button class="sn-copy-btn" id="sn-copy">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span id="sn-copy-label">Copy</span>
            </button>
          </div>
        </div>

        <div class="sn-letter" id="sn-letter" contenteditable="true">${SnagAI.esc(letter)}</div>

        <div class="sn-cl-bottom">
          <div class="sn-refine-chips">
            <button class="sn-chip" data-refine="Make it shorter — under 100 words. Keep hook and portfolio, cut the rest.">Shorter</button>
            <button class="sn-chip" data-refine="Make the tone more direct and confident. No hedging, no filler.">More confident</button>
            <button class="sn-chip" data-refine="Add my hourly rate naturally in the scope or CTA line.">Add my rate</button>
            <button class="sn-chip" data-refine="Address the client budget directly — explain how my rate fits or propose a number.">Adjust for budget</button>
          </div>
          <div class="sn-input-area">
            <div class="sn-input-wrap" id="sn-input-wrap">
              <textarea class="sn-refine-inp" id="sn-refine-inp"
                placeholder="Describe your changes — shorter, add GitHub, more confident, mention React…"
                rows="2"></textarea>
              <div class="sn-input-footer">
                <span class="sn-input-hint">Tip: pick a chip above or type your own</span>
                <button class="sn-regen-btn" id="sn-regen">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="sn-cl-right">
        <div class="sn-intel-card">
          <div class="sn-intel-label">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c0 0 .7 5.8 2.1 7.2C15.5 10.6 21 12 21 12s-5.5 1.4-6.9 2.8C12.7 16.2 12 22 12 22s-.7-5.8-2.1-7.2C8.5 13.4 3 12 3 12s5.5-1.4 6.9-2.8C11.3 7.8 12 2 12 2z"/></svg>
            Match scores
          </div>
          <div class="sn-score-item">
            <div class="sn-score-row">
              <span class="sn-score-name">Win probability</span>
              <span class="sn-score-pct" style="color:${wp.probScore>=70?'#4ade80':wp.probScore>=45?'#facc15':'#f87171'}">${wp.probScore}%</span>
            </div>
            <div class="sn-bar-track"><div class="sn-bar-fill" style="width:${wp.probScore}%;background:${wp.probScore>=70?'#4ade80':wp.probScore>=45?'#facc15':'#f87171'}"></div></div>
          </div>
          <div class="sn-score-item" style="margin-bottom:0">
            <div class="sn-score-row">
              <span class="sn-score-name">Profile match</span>
              <span class="sn-score-pct" style="color:${wp.matchScore>=70?'#4ade80':wp.matchScore>=45?'#e8a020':'#f87171'}">${wp.matchScore}%</span>
            </div>
            <div class="sn-bar-track"><div class="sn-bar-fill" style="width:${wp.matchScore}%;background:${wp.matchScore>=70?'#4ade80':wp.matchScore>=45?'#e8a020':'#f87171'}"></div></div>
          </div>
        </div>

        ${callouts.length ? `
        <div class="sn-intel-card">
          <div class="sn-intel-label">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6l-.7.5V18H9v-2.5l-.7-.5A7 7 0 0 1 12 2z"/></svg>
            Writing tips
          </div>
          ${callouts.map(c => {
            const col = c.type==='ok' ? '#4ade80' : c.type==='warn' ? '#facc15' : '#f87171';
            return '<div class="sn-callout-row"><span class="sn-callout-dot" style="background:'+col+'"></span><span class="sn-callout-txt">'+SnagAI.esc(c.text)+'</span></div>';
          }).join('')}
        </div>` : ''}

        ${tips && tips.length ? `
        <div class="sn-intel-card">
          <div class="sn-intel-label">Job signals</div>
          ${tips.slice(0,3).map(t => '<div class="sn-signal-row">'+SnagAI.esc(t.length>90?t.slice(0,90)+'…':t)+'</div>').join('')}
        </div>` : ''}

        ${remaining!==null&&remaining<=10 ? '<div class="sn-low-bar"><span>'+(remaining===0?'No proposals left':remaining+' left')+'</span><button class="sn-low-upgrade" id="sn-low-upgrade">Upgrade</button></div>' : ''}
      </div>
    </div>
  `;

  // Auto-expand textarea
  const refineInp = document.getElementById('sn-refine-inp');
  if (refineInp) {
    refineInp.addEventListener('input', () => {
      refineInp.style.height = 'auto';
      refineInp.style.height = Math.min(refineInp.scrollHeight, 120) + 'px';
    });
    refineInp.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        SnagAI.state.refineInstruction = refineInp.value.trim();
        SnagAI.state.currentLetter = document.getElementById('sn-letter')?.innerText?.trim() || '';
        SnagAI.showLoading(); SnagAI.generate();
      }
    });
  }

  // Word count
  const letterEl = document.getElementById('sn-letter');
  const wcEl     = document.getElementById('sn-word-count');
  function updateWordCount() {
    const n = countWords(letterEl);
    if (wcEl) wcEl.textContent = n + ' words';
    if (wcEl) wcEl.className = 'sn-word-count' + (n > 160 ? ' sn-wc-over' : n > 120 ? ' sn-wc-warn' : '');
  }
  updateWordCount();
  letterEl?.addEventListener('input', updateWordCount);

  // Refine chips
  document.querySelectorAll('.sn-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      SnagAI.state.refineInstruction = chip.dataset.refine;
      SnagAI.state.currentLetter = document.getElementById('sn-letter')?.innerText?.trim() || '';
      document.querySelectorAll('.sn-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      SnagAI.showLoading(); SnagAI.generate();
    });
  });

  // Copy button
  document.getElementById('sn-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('sn-letter').innerText).then(() => {
      const btn   = document.getElementById('sn-copy');
      const lbl   = document.getElementById('sn-copy-label');
      if (!btn || !lbl) return;
      lbl.textContent = 'Copied ✓';
      btn.classList.add('sn-copy-success');
      setTimeout(() => {
        lbl.textContent = 'Copy proposal';
        btn.classList.remove('sn-copy-success');
      }, 1500);
    });
  });

  const copyQBtn = document.getElementById('sn-copy-q');
  if (copyQBtn) {
    copyQBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(document.getElementById('sn-questions-text').innerText).then(() => {
        copyQBtn.textContent = '✓ Copied';
        setTimeout(() => copyQBtn.textContent = 'Copy', 2000);
      });
    });
  }

  // Regen button
  document.getElementById('sn-regen').addEventListener('click', () => {
    SnagAI.state.refineInstruction = document.getElementById('sn-refine-inp')?.value?.trim() || '';
    SnagAI.state.currentLetter = document.getElementById('sn-letter')?.innerText?.trim() || '';
    SnagAI.showLoading(); SnagAI.generate();
  });

  const lowBtn = document.getElementById('sn-low-upgrade');
  if (lowBtn) lowBtn.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_PRICING' }));
};
