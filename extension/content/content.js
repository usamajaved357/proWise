// Snag AI Content v6 — Professional UI
(function () {
  'use strict';

  const SERVER = 'https://prowise-4e5t.onrender.com';
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function injectUI() {
    if (document.getElementById('sn-trigger')) return;

    // Overlay
    const ov = document.createElement('div');
    ov.id = 'sn-overlay';
    document.body.appendChild(ov);

    // Panel
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

    // Floating button
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

    document.getElementById('sn-btn').addEventListener('click', toggle);
    document.getElementById('sn-close').addEventListener('click', closePanel);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
    // ov click no longer closes panel — user needs to click through to job page

    // ── Drag + resize — unified, no text selection ───────────────────────
    const head = panel.querySelector('.sn-head');
    const EDGE = 8, MIN_W = 560, MIN_H = 400;
    let action = null; // 'drag' | 'resize'
    let startX, startY, startW, startH, startT, startL, resizeDir;

    // Drag from header
    head.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return;
      action = 'drag';
      const r = panel.getBoundingClientRect();
      startX = e.clientX - r.left;
      startY = e.clientY - r.top;
      e.preventDefault();
    });

    // Resize from edges/corners
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

    // Shared mousemove on document — no text selection
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

    // Prevent text selection during drag/resize
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    document.addEventListener('selectstart', e => { if (action) e.preventDefault(); });
  }

  let isOpen = false;

  function toggle() { isOpen ? closePanel() : openAndGenerate(); }

  function centerPanel() {
    const p = document.getElementById('sn-panel');
    const pw = Math.min(860, window.innerWidth * 0.96);
    const ph = Math.min(600, window.innerHeight * 0.88);
    p.style.width  = pw + 'px';
    p.style.height = ph + 'px';
    p.style.left   = Math.round((window.innerWidth  - pw) / 2) + 'px';
    p.style.top    = Math.round((window.innerHeight - ph) / 2) + 'px';
    p.style.transform = 'none';
  }

  async function openAndGenerate() {
    centerPanel();
    document.getElementById('sn-overlay').classList.add('vis');
    document.getElementById('sn-panel').classList.add('vis');
    isOpen = true;
    showLoading();
    generate();
  }

  function closePanel() {
    document.getElementById('sn-overlay').classList.remove('vis');
    document.getElementById('sn-panel').classList.remove('vis');
    isOpen = false;
  }

  function showLoading() {
    document.getElementById('sn-body').innerHTML = `
      <div class="sn-loading">
        <div class="sn-spinner"></div>
        <div class="sn-loading-text">Reading job · crafting proposal…</div>
        <div class="sn-loading-sub">Picking the best hook for this job</div>
      </div>
    `;
    document.getElementById('sn-hook-label').textContent = 'AI proposal writer';
    document.getElementById('sn-usage-badge').style.display = 'none';
  }

  function showError(msg) {
    document.getElementById('sn-body').innerHTML = `
      <div class="sn-error">
        <div class="sn-error-icon">⚠</div>
        <div class="sn-error-msg">${esc(msg)}</div>
      </div>
    `;
  }

  // Paywall
  function showPaywall(data) {
    const isFree = !data.plan || data.plan === 'free';
    document.getElementById('sn-hook-label').textContent = 'Subscription required';
    document.getElementById('sn-body').innerHTML = `
      <div class="sn-paywall">
        <div class="sn-paywall-icon">✦</div>
        <div class="sn-paywall-title">${isFree ? 'Upgrade to keep winning' : 'Monthly limit reached'}</div>
        <div class="sn-paywall-sub">${isFree
          ? "You've used your <strong>2 free proposals</strong>. Subscribe to unlock your full limit."
          : `You've used all <strong>${data.limit} proposals</strong> this month. Resets on the 1st.`
        }</div>
        <div class="sn-plans" id="sn-plans">
          <div class="sn-plan" data-plan="starter">
            <div class="sn-plan-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="sn-plan-name">Starter</div>
            <div class="sn-plan-price">$19<span>/mo</span></div>
            <div class="sn-plan-limit">150 proposals</div>
          </div>
          <div class="sn-plan sn-plan-feat sn-plan-selected" data-plan="pro">
            <div class="sn-plan-pop">BEST</div>
            <div class="sn-plan-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="sn-plan-name">Pro</div>
            <div class="sn-plan-price">$39<span>/mo</span></div>
            <div class="sn-plan-limit">400 proposals</div>
          </div>
          <div class="sn-plan" data-plan="agency">
            <div class="sn-plan-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="sn-plan-name">Agency</div>
            <div class="sn-plan-price">$69<span>/mo</span></div>
            <div class="sn-plan-limit">900 proposals</div>
          </div>
        </div>
        <button class="sn-cta-btn" id="sn-upgrade-btn">Subscribe to Pro →</button>
        ${!isFree ? '<div class="sn-reset-note">Resets on the 1st of next month</div>' : ''}
      </div>
    `;

    let selectedPlan = 'pro';

    function openPlanCheckout(plan) {
      chrome.runtime.sendMessage({ type: 'OPEN_CHECKOUT', plan: plan || 'pro' });
    }

    function selectPlan(plan) {
      selectedPlan = plan;
      document.querySelectorAll('.sn-plan').forEach(el => {
        el.classList.toggle('sn-plan-selected', el.dataset.plan === plan);
      });
      const labels = { starter: 'Starter', pro: 'Pro', agency: 'Agency' };
      document.getElementById('sn-upgrade-btn').textContent = 'Subscribe to ' + (labels[plan] || plan) + ' →';
    }

    // Cards select only — no direct checkout on click
    document.querySelectorAll('.sn-plan').forEach(el => {
      el.addEventListener('click', () => selectPlan(el.dataset.plan));
    });

    // Only button opens checkout
    document.getElementById('sn-upgrade-btn').addEventListener('click', () => openPlanCheckout(selectedPlan));
  }

  // Read job
  function getJob() {
    const title = (
      document.querySelector('h1[data-test="job-title"]') ||
      document.querySelector('h1.m-0') ||
      document.querySelector('h1')
    )?.innerText?.trim() || '';

    const descEl = (
      document.querySelector('[data-test="Description"] .air3-truncation') ||
      document.querySelector('[data-test="Description"]') ||
      document.querySelector('.job-description') ||
      document.querySelector('[class*="description"]')
    );
    const fullDesc = descEl?.innerText?.trim() || document.body.innerText.slice(0, 3000);
    const description = fullDesc; // alias for return object

    // Extract additional questions — Upwork shows these in a separate section below the job
    // Pattern: "You will be asked to answer the following questions when submitting a proposal:"
    let questions = '';
    try {
      const fullPageText = document.body.innerText;

      // Method 1: Upwork's exact phrase for screening questions
      const asked = fullPageText.indexOf('You will be asked to answer the following questions');
      if (asked > -1) {
        const after = fullPageText.slice(asked);
        const colonIdx = after.indexOf(':');
        if (colonIdx > -1) {
          // Grab everything after the colon up to next major section break
          let chunk = after.slice(colonIdx + 1).trim();
          // Stop at "About the client" or similar
          const stopAt = chunk.search(/\nAbout the client|\nRequired Connects|\nActivity on this job/);
          if (stopAt > -1) chunk = chunk.slice(0, stopAt);
          questions = chunk.trim().slice(0, 1500);
        }
      }

      // Method 2: Look for numbered questions at end of description
      if (!questions) {
        const lines = fullDesc.split('\n');
        const qLines = [];
        let inQ = false;
        for (const line of lines) {
          if (/^\d+[\.\)]/.test(line.trim())) { inQ = true; }
          if (inQ && line.trim()) qLines.push(line.trim());
        }
        if (qLines.length >= 2) questions = qLines.join('\n').slice(0, 1500);
      }
    } catch(e) { questions = ''; }


    // Extract client name — pass raw review text to AI for extraction
    let clientName = '';
    let clientNameFromReview = '';

    // Try job description self-intro first (fast)
    const descNameMatch = fullDesc.match(/(?:I'm|I am|My name is|This is)\s+([A-Z][a-z]{2,})(?:\s|,|\.)/);
    if (descNameMatch) clientName = descNameMatch[1];

    // Extract review text from "Client's recent history" section
    let reviewText = '';
    try {
      const pt = document.body.innerText;
      const histIdx = pt.indexOf("Client's recent history");
      if (histIdx > -1) {
        reviewText = pt.slice(histIdx, histIdx + 2000);
        // Extract name from patterns like "Abduljalil is an exceptional client"
        const namePatterns = [
          /([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?)\s+is\s+(?:an?\s+)?(?:exceptional|great|wonderful|amazing|fantastic|excellent|outstanding|awesome)\s+client/,
          /([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?)\s+(?:was|is)\s+(?:a\s+)?great\s+(?:client|person|partner)/,
          /working\s+with\s+([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?)\s+(?:was|is|has)/i,
          /[Tt]hanks?\s+(?:to\s+)?([A-Z][a-z]{2,})\s+for/,
        ];
        for (const pat of namePatterns) {
          const m = reviewText.match(pat);
          if (m && m[1]) { clientNameFromReview = m[1].split(' ')[0]; break; }
        }
      }
    } catch(e) { reviewText = ''; }

    const skills   = Array.from(document.querySelectorAll('[data-test="Skill"] span, .air3-badge span'))
      .map(s => s.innerText.trim()).filter(Boolean).join(', ');
    const budget   = document.querySelector('[data-test="budget"] strong, [data-test="Budget"] strong')?.innerText?.trim() || '';
    const location = document.querySelector('[data-test="client-location"] strong')?.innerText?.trim() || '';

// Extract job type
    const jobType = document.querySelector('[data-test="job-type"], [class*="jobType"]')?.innerText?.trim() || '';

    // Job Intelligence Stats
    const pageText2 = document.body.innerText;

    // ── Activity stats (from "Activity on this job" section) ──────────────
    function extractNum(label) {
      const re = new RegExp(label + '[:\\s]+(\\d+(?:\\s+to\\s+\\d+)?)', 'i');
      const m  = pageText2.match(re);
      return m ? m[1] : null;
    }

    const proposalsRaw  = extractNum('Proposals');
    // proposals might be "20 to 50" — take the lower bound
    let proposalCount = null;
    if (proposalsRaw) {
      const nums = proposalsRaw.match(/\d+/g);
      proposalCount = nums ? parseInt(nums[0]) : null;
    }

    // Last viewed by client
    let lastViewed = null;
    const lvMatch = pageText2.match(/Last viewed by client[:\s]+([^\n]+)/i);
    if (lvMatch) lastViewed = lvMatch[1].trim();

    // Interviewing, invites sent, unanswered invites
    let interviewingCount = null, invitesSent = null, unansweredInvites = null, hiredCount = null;
    const intM = pageText2.match(/Interviewing[:\s]+(\d+)/i);
    if (intM) interviewingCount = parseInt(intM[1]);
    const invM = pageText2.match(/Invites sent[:\s]+(\d+)/i);
    if (invM) invitesSent = parseInt(invM[1]);
    const unM = pageText2.match(/Unanswered invites[:\s]+(\d+)/i);
    if (unM) unansweredInvites = parseInt(unM[1]);
    const hirM = pageText2.match(/Hired[:\s]+(\d+)/i);
    if (hirM) hiredCount = parseInt(hirM[1]);

    // Time posted — "Posted X ago" on job page
    let timePosted = null;
    let timePostedMinutes = null; // normalized to minutes for scoring
    const tm = pageText2.match(/Posted\s+(\d+)\s+(minutes?|hours?|days?|weeks?)\s+ago/i)
            || pageText2.match(/(\d+)\s+(minutes?|hours?|days?|weeks?)\s+ago/i);
    if (tm) {
      const num = parseInt(tm[1]), unit = tm[2].toLowerCase();
      timePosted = num + ' ' + unit + ' ago';
      if (unit.startsWith('minute'))     timePostedMinutes = num;
      else if (unit.startsWith('hour'))  timePostedMinutes = num * 60;
      else if (unit.startsWith('day'))   timePostedMinutes = num * 1440;
      else if (unit.startsWith('week'))  timePostedMinutes = num * 10080;
    }

    // Client hire rate (very important for quality signal)
    let clientHireRate = null;
    const hrm = pageText2.match(/(\d+)%\s+hire\s+rate/i);
    if (hrm) clientHireRate = parseInt(hrm[1]);

    // Client total spent
    let clientTotalSpent = null;
    const sm = pageText2.match(/\$([0-9,.]+[KkMmBb]?)\s+total\s+spent/i);
    if (sm) clientTotalSpent = sm[1];

    // Client stats (for profile match section)
    let clientAvgRate = null, clientRating = null;
    const arm = pageText2.match(/\$([0-9,]+(?:\.\d+)?)\s*\/hr\s+avg/i);
    if (arm) clientAvgRate = parseFloat(arm[1].replace(',',''));
    // Client rating is the FIRST one — appears right after "Payment method verified"
    // Later ratings belong to freelancers in the review section
    const paymentIdx = pageText2.indexOf('Payment method verified');
    const ratingSearchArea = paymentIdx > -1
      ? pageText2.slice(paymentIdx, paymentIdx + 200)
      : pageText2.slice(0, 1000);
    const crm = ratingSearchArea.match(/Rating is (\d+(?:\.\d+)?) out of 5/i);
    if (crm) clientRating = parseFloat(crm[1]);
    console.log('Client rating found:', clientRating, 'from area:', ratingSearchArea.slice(0,80));

    // ── Job requirements (Preferred qualifications section) ──────────────
    let reqJSS = null, reqTalentType = null, reqEnglish = null;
    const jssReqM  = pageText2.match(/Job Success Score[:\s]+At least\s*(\d+)%/i);
    if (jssReqM) reqJSS = parseInt(jssReqM[1]);
    const talentM  = pageText2.match(/Talent Type[:\s]+(Independent|Agency|Any)/i);
    if (talentM) reqTalentType = talentM[1];
    const engM     = pageText2.match(/English level[:\s]+([^\n]+)/i);
    if (engM) reqEnglish = engM[1].trim();

    const jobStats = {
      proposalCount, lastViewed, interviewingCount, invitesSent, unansweredInvites, hiredCount,
      timePosted, timePostedMinutes, clientAvgRate, clientHireRate, clientTotalSpent, clientRating,
      reqJSS, reqTalentType, reqEnglish
    };
    console.log('Job stats:', JSON.stringify(jobStats));

    const finalClientName = clientNameFromReview || clientName;
    return { title, description, skills, budget, location, clientName: finalClientName, questions, reviewText, type: jobType, jobStats };
  }

  // ── Pre-generation probability alert ────────────────────────────────────────
  function showProbAlert(wp, hired) {
    return new Promise(resolve => {
      const isHired   = hired > 0;
      const scoreCol  = wp.probScore >= 60 ? '#34d399' : wp.probScore >= 40 ? '#f59e0b' : '#f87171';
      const topIssues = wp.topProb.filter(f => f.delta < 0).slice(0,3);

      // Show all negative factors + warnings on alert
      const allIssues = [...(wp.topProb || []), ...(wp.topMatch || [])]
        .filter(f => f.delta < 0)
        .sort((a,b) => a.delta - b.delta)
        .slice(0,5);
      // Also include any positive factors that give context (posted time, proposals)
      const contextFactors = [...(wp.topProb || [])].filter(f => 
        f.delta >= 0 && ['Posted','Proposals','Hire rate','Hired'].includes(f.label)
      ).slice(0,2);
      const displayIssues = allIssues.length > 0 ? allIssues : contextFactors;
      document.getElementById('sn-body').innerHTML = `
        <div class="sn-alert-wrap">
          <div class="sn-alert-header" style="background:${isHired ? 'rgba(248,113,113,.08)' : 'rgba(245,158,11,.07)'}; border-bottom:1px solid ${isHired ? 'rgba(248,113,113,.2)' : 'rgba(245,158,11,.2)'}">
            <div class="sn-alert-score-ring" style="border-color:${scoreCol}">
              <span class="sn-alert-ring-pct" style="color:${scoreCol}">${isHired ? '0' : wp.probScore}</span>
              <span class="sn-alert-ring-label">%</span>
            </div>
            <div class="sn-alert-header-text">
              <div class="sn-alert-title">${isHired ? 'Already hired' : 'Low win odds'}</div>
              <div class="sn-alert-sub" style="color:${scoreCol}">${isHired ? 'This job is closed' : wp.probScore >= 40 ? 'Possible but unlikely' : 'Very hard to win'}</div>
            </div>
          </div>
          <div class="sn-alert-body">
            <div class="sn-alert-msg">
              ${isHired
                ? '<strong>Someone was already hired.</strong> Applying now will only waste your Connects — which are real money.'
                : 'Your <strong>Connects cost real money</strong>. With ' + wp.probScore + '% job odds, this job is a tough fight. Here\'s why:'}
            </div>
            ${displayIssues.length ? '<div class="sn-alert-issues">' + displayIssues.map(f =>
              '<div class="sn-alert-issue"><div class="sn-alert-issue-dot" style="background:' + (f.delta < 0 ? '#f87171' : '#34d399') + '"></div><div><span class="sn-alert-issue-label">' + f.label + ':</span> ' + f.value + (f.note ? ' — ' + f.note : '') + '</div></div>'
            ).join('') + '</div>' : ''}
            ${wp.warnings.length ? '<div class="sn-alert-warns-list">' + wp.warnings.slice(0,3).map(w => '<div class="sn-alert-warn-item">⚠ ' + w + '</div>').join('') + '</div>' : ''}
          </div>
          <div class="sn-alert-footer">
            <button class="sn-alert-cancel" id="sn-alert-cancel">← Skip this job</button>
            ${isHired ? '' : '<button class="sn-alert-anyway" id="sn-alert-anyway">Write anyway</button>'}
          </div>
        </div>
      `;

      document.getElementById('sn-alert-cancel').addEventListener('click', () => {
        closePanel();
        resolve(true); // blocked
      });

      const anywayBtn = document.getElementById('sn-alert-anyway');
      if (anywayBtn) {
        anywayBtn.addEventListener('click', () => {
          showLoading();
          resolve(false); // proceed
        });
      }
    });
  }

  // ── Generate
  async function generate() {
    try {
      const stored = await chrome.storage.sync.get(['profile', 'userEmail', 'anonId', 'settings']);
      if (!stored.profile?.name) {
        showError('Fill in your profile first — click the Snag AI icon in the Chrome toolbar → Settings.');
        return;
      }

      // Ensure anonId exists
      let anonId = stored.anonId;
      if (!anonId) {
        anonId = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        await chrome.storage.sync.set({ anonId });
      }

      // Read job immediately for probability check (no delay needed)
      const job = getJob();
      const refineInstruction = window._snagRefineInstruction || '';

      // STEP 1: Instant probability check (pure client-side — no server needed)
      if (!refineInstruction) {
        const preProfile = stored.profile || {};
        const preWp = calcWinProbability(job.jobStats || {}, preProfile);
        const hired = job.jobStats?.hiredCount;
        if (hired > 0 || preWp.probScore < 60) {
          const blocked = await showProbAlert(preWp, hired);
          if (blocked) return; // cancelled — zero server calls made
        }
      }

      // STEP 2: Check usage limit (may wake Render — show loading first)
      showLoading();
      try {
        const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
        if (status && status.remaining !== undefined && status.remaining <= 0) {
          showPaywall(status); return;
        }
      } catch(e) { /* let server enforce */ }

      // STEP 3: Short delay to let reviews render for name extraction
      await new Promise(r => setTimeout(r, 500));
      const jobWithReviews = getJob();
      Object.assign(job, { clientName: jobWithReviews.clientName, reviewText: jobWithReviews.reviewText });
      window._snagRefineInstruction = ''; // clear after use
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_PROPOSAL',
        payload: { job, refineInstruction }
      });
      // Store job stats and profile for win probability rendering
      window._snagJobStats = job.jobStats;
      window._snagProfile  = stored.profile || {};

      if (!response) { showError('No response. Try refreshing the page.'); return; }
      if (response.showPaywall) { showPaywall(response.usage || response); return; }
      if (response.error) { showError(response.error); return; }
      renderProposal(response);
    } catch(err) {
      showError(err.message || 'Something went wrong.');
    }
  }

  // ── Win Probability Calculator (calibrated) ───────────────────────────────
  function calcWinProbability(jobStats, profile) {
    let probScore = 30; // conservative baseline — most jobs are hard
    let matchScore = 50;
    const probFactors  = []; // all factors with scores
    const matchFactors = [];
    const warnings = [];

    // ══ PROBABILITY FACTORS (job activity only) ══════════════════════════════

    // 1. Posted time — MOST IMPORTANT. Early = massive advantage
    const mins = jobStats.timePostedMinutes;
    if (mins !== null && mins !== undefined) {
      if      (mins <= 30)   { probScore += 30; probFactors.push({ label: 'Posted', value: jobStats.timePosted, delta: +30, note: 'Very early — huge advantage' }); }
      else if (mins <= 120)  { probScore += 22; probFactors.push({ label: 'Posted', value: jobStats.timePosted, delta: +22, note: 'Early — apply now' }); }
      else if (mins <= 360)  { probScore += 14; probFactors.push({ label: 'Posted', value: jobStats.timePosted, delta: +14, note: 'Good timing' }); }
      else if (mins <= 1440) { probScore += 5;  probFactors.push({ label: 'Posted', value: jobStats.timePosted, delta: +5,  note: 'Still within 24h' }); }
      else if (mins <= 4320) { probScore -= 5;  probFactors.push({ label: 'Posted', value: jobStats.timePosted, delta: -5,  note: 'Job is aging' }); }
      else                   { probScore -= 15; probFactors.push({ label: 'Posted', value: jobStats.timePosted, delta: -15, note: 'Old posting — may be filled' }); warnings.push('Posted ' + jobStats.timePosted + ' — client may already have shortlisted'); }
    }

    // 2. Proposals count — competitive pressure
    const p = jobStats.proposalCount;
    if (p !== null && p !== undefined) {
      if      (p <= 5)  { probScore += 20; probFactors.push({ label: 'Proposals', value: p + ' bids', delta: +20, note: 'Very low competition' }); }
      else if (p <= 10) { probScore += 12; probFactors.push({ label: 'Proposals', value: p + ' bids', delta: +12, note: 'Low competition' }); }
      else if (p <= 20) { probScore += 4;  probFactors.push({ label: 'Proposals', value: p + ' bids', delta: +4,  note: 'Moderate' }); }
      else if (p <= 35) { probScore -= 5;  probFactors.push({ label: 'Proposals', value: p + '-50 bids', delta: -5,  note: 'High competition' }); }
      else              { probScore -= 15; probFactors.push({ label: 'Proposals', value: '50+ bids', delta: -15, note: 'Very competitive' }); warnings.push('50+ proposals — very hard to stand out'); }
    }

    // 3. Client hire rate — VERY IMPORTANT: shows if client is serious
    const hr = jobStats.clientHireRate;
    if (hr !== null && hr !== undefined) {
      if      (hr >= 90) { probScore += 15; probFactors.push({ label: 'Hire rate', value: hr + '%', delta: +15, note: 'Serious client — almost always hires' }); }
      else if (hr >= 70) { probScore += 8;  probFactors.push({ label: 'Hire rate', value: hr + '%', delta: +8,  note: 'Usually hires' }); }
      else if (hr >= 50) { probScore += 0;  probFactors.push({ label: 'Hire rate', value: hr + '%', delta: 0,   note: 'Average' }); }
      else if (hr >= 30) { probScore -= 8;  probFactors.push({ label: 'Hire rate', value: hr + '%', delta: -8,  note: 'Rarely hires' }); warnings.push('Only ' + hr + '% hire rate — client may not hire'); }
      else               { probScore -= 18; probFactors.push({ label: 'Hire rate', value: hr + '%', delta: -18, note: 'Almost never hires' }); warnings.push(hr + '% hire rate — high chance of no hire'); }
    }

    // 4. Interviewing (slots already taken)
    const ic = jobStats.interviewingCount;
    if (ic !== null && ic !== undefined) {
      if      (ic === 0) { probScore += 10; probFactors.push({ label: 'Interviewing', value: 'None yet', delta: +10, note: 'No one shortlisted yet' }); }
      else if (ic <= 2)  { probScore += 0;  probFactors.push({ label: 'Interviewing', value: ic + ' in progress', delta: 0, note: 'Still open' }); }
      else               { probScore -= 12; probFactors.push({ label: 'Interviewing', value: ic + ' in progress', delta: -12, note: 'Client already shortlisting heavily' }); }
    }

    // 5. Hired count — if someone is already hired, probability = 0
    const hired = jobStats.hiredCount;
    if (hired !== null && hired !== undefined && hired > 0) {
      probScore = 0;
      probFactors.push({ label: 'Hired', value: hired + ' already hired', delta: -999, note: 'Job likely closed — do not apply' });
      warnings.push('Client already hired ' + hired + ' freelancer(s) — this job is likely closed');
    }

    // 6. Invites sent — important signal
    const invS = jobStats.invitesSent;
    if (invS !== null && invS !== undefined && !hired) {
      if (invS === 0) {
        probScore += 8; probFactors.push({ label: 'Invites', value: 'None sent', delta: +8, note: 'Client open to proposals' });
      } else if (invS <= 3) {
        probScore -= 5; probFactors.push({ label: 'Invites', value: invS + ' invited', delta: -5, note: 'Client prefers invited freelancers' });
        warnings.push('Client invited ' + invS + ' freelancers — proposal acceptance is lower');
      } else {
        probScore -= 12; probFactors.push({ label: 'Invites', value: invS + ' invited', delta: -12, note: 'Client mostly hiring via invites' });
        warnings.push('Client sent ' + invS + ' invites — they likely already have preferred candidates');
      }
    }

    // Client rating — low rating signals problematic client
    const cr = jobStats.clientRating;
    if (cr !== null && cr !== undefined) {
      if      (cr >= 4.8) { probScore += 5;  probFactors.push({ label: 'Client rating', value: cr + '★', delta: +5,  note: 'Excellent client' }); }
      else if (cr >= 4.0) { /* neutral */ }
      else if (cr >= 3.0) { probScore -= 8;  probFactors.push({ label: 'Client rating', value: cr + '★', delta: -8,  note: 'Below average — risk of disputes' }); warnings.push('Client rating ' + cr + '★ — below 4.0, may be difficult to work with'); }
      else                { probScore -= 18; probFactors.push({ label: 'Client rating', value: cr + '★', delta: -18, note: 'Poor client — high dispute risk' }); warnings.push('Client only ' + cr + '★ — serious risk of disputes or non-payment'); }
    }

    // Balance: if old posting but low competition + no interviewing, recover score
    if (jobStats.timePostedMinutes > 1440 && (jobStats.proposalCount || 99) <= 10 && interviewingCount === 0) {
      probScore += 8;
    }

    probScore = Math.max(0, Math.min(95, Math.round(probScore)));

    // ══ PROFILE MATCH FACTORS ════════════════════════════════════════════════

    // 1. JSS requirement
    const reqJSS  = jobStats.reqJSS;
    const userJSS = parseFloat((profile.jss || '0').replace(/[^0-9.]/g, '')) || 0;
    if (reqJSS) {
      if (!userJSS) {
        matchScore -= 5;
        matchFactors.push({ label: 'JSS', value: 'Req: ' + reqJSS + '%', delta: -5, note: 'Add your JSS in profile', warn: true });
      } else if (userJSS >= reqJSS) {
        matchScore += 15;
        matchFactors.push({ label: 'JSS', value: userJSS + '% ✓', delta: +15, note: 'Meets ' + reqJSS + '% requirement' });
      } else {
        matchScore -= 20;
        matchFactors.push({ label: 'JSS', value: userJSS + '% (need ' + reqJSS + '%)', delta: -20, note: 'Below requirement', warn: true });
        warnings.push('Your JSS ' + userJSS + '% is below the required ' + reqJSS + '%');
      }
    }

    // 2. English level — flag honestly, we don't know user's level
    const reqEng = jobStats.reqEnglish;
    if (reqEng && /native/i.test(reqEng)) {
      matchScore -= 8;
      matchFactors.push({ label: 'English', value: reqEng + ' required', delta: -8, note: 'Must be explicit in proposal', warn: true });
      warnings.push('Client requires ' + reqEng + ' English — make your fluency obvious');
    } else if (reqEng) {
      matchFactors.push({ label: 'English', value: reqEng, delta: 0, note: 'Showcase in proposal' });
    }

    // 3. Talent type
    if (jobStats.reqTalentType) {
      matchScore += 5;
      matchFactors.push({ label: 'Type', value: jobStats.reqTalentType + ' ✓', delta: +5, note: 'You qualify' });
    }

    // 4. Rate alignment
    const userRate   = parseFloat((profile.hourlyRate || '0').replace(/[^0-9.]/g, '')) || 0;
    const clientRate = jobStats.clientAvgRate;
    if (userRate && clientRate) {
      const pct = Math.abs(userRate - clientRate) / clientRate;
      if (pct <= 0.15) {
        matchScore += 12; matchFactors.push({ label: 'Rate', value: '$' + userRate + ' ≈ $' + clientRate + ' avg', delta: +12, note: 'Perfect alignment' });
      } else if (userRate < clientRate) {
        matchScore += 6;  matchFactors.push({ label: 'Rate', value: '$' + userRate + ' < $' + clientRate + ' avg', delta: +6,  note: 'Competitive rate' });
      } else if (pct <= 0.5) {
        matchScore += 0;  matchFactors.push({ label: 'Rate', value: '$' + userRate + ' vs $' + clientRate + ' avg', delta: 0,   note: 'Slightly above avg' });
      } else {
        matchScore -= 8;  matchFactors.push({ label: 'Rate', value: '$' + userRate + ' vs $' + clientRate + ' avg', delta: -8,  note: 'Well above client avg', warn: true });
        warnings.push('Your rate $' + userRate + '/hr is much higher than client avg $' + clientRate + '/hr');
      }
    }

    // 5. Tier
    const tierBonus = { new:0, rising:5, top_rated:12, top_rated_plus:18, expert:25 };
    const tl = { rising:'Rising Talent', top_rated:'Top Rated', top_rated_plus:'Top Rated Plus', expert:'Expert Vetted' };
    const tb = tierBonus[profile.tier] || 0;
    if (tb > 0) {
      matchScore += tb;
      matchFactors.push({ label: 'Badge', value: tl[profile.tier], delta: tb, note: 'Visible on proposal' });
    }

    matchScore = Math.max(5, Math.min(95, Math.round(matchScore)));

    // Pick TOP 3 factors for each section (by absolute delta impact)
    const topProb  = [...probFactors].sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0,3);
    const topMatch = [...matchFactors].sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0,3);

    // Overall verdict uses combined score
    const combined = Math.round((probScore * 0.6) + (matchScore * 0.4));
    let verdict, verdictColor;
    if      (combined >= 70) { verdict = 'Strong';    verdictColor = '#34d399'; }
    else if (combined >= 50) { verdict = 'Good';      verdictColor = '#c9a84c'; }
    else if (combined >= 30) { verdict = 'Possible';  verdictColor = '#f59e0b'; }
    else                     { verdict = 'Long shot'; verdictColor = '#f87171'; }

    const probColor  = probScore  >= 60 ? '#34d399' : probScore  >= 40 ? '#c9a84c' : '#f87171';
    const matchColor = matchScore >= 60 ? '#34d399' : matchScore >= 40 ? '#c9a84c' : '#f87171';

    return { probScore, matchScore, combined, verdict, verdictColor, probColor, matchColor, topProb, topMatch, warnings };
  }

  // ── Render proposal ───────────────────────────────────────────────────────
  function renderProposal(data) {
    const { letter, hookType, tips, usage, questions } = data;
    if (!letter) { showError('Empty proposal. Please try again.'); return; }

    const jobStats = window._snagJobStats || {};
    const profile  = window._snagProfile  || {};
    const wp = calcWinProbability(jobStats, profile);
    const remaining = usage && usage.remaining !== undefined ? usage.remaining : null;

    document.getElementById('sn-hook-label').textContent = hookType ? 'Hook: ' + hookType : 'Proposal ready';

    const badge = document.getElementById('sn-usage-badge');
    if (remaining !== null) {
      badge.style.display = 'flex';
      badge.className = 'sn-usage-badge ' + (remaining <= 5 ? 'sn-badge-danger' : remaining <= 20 ? 'sn-badge-warn' : 'sn-badge-ok');
      badge.textContent = remaining + ' left';
    }

    document.getElementById('sn-body').innerHTML = `
      <div class="sn-two-col">

        <!-- LEFT: Cover letter -->
        <div class="sn-col-letter">
          <div class="sn-letter" id="sn-letter" contenteditable="true">${esc(letter)}</div>
          <div class="sn-letter-actions">
            <button class="sn-copy-top-btn" id="sn-copy">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy letter
            </button>
          </div>
          <div class="sn-letter-bar">
            <textarea class="sn-refine-inp" id="sn-refine-inp" placeholder="Request changes… e.g. change hook to guarantee, add GitHub link below portfolio, make it shorter" rows="2"></textarea>
            <button class="sn-regen-inline-btn" id="sn-regen">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Generate
            </button>
          </div>
          ${questions ? '<div class="sn-qa-section"><div class="sn-qa-head"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Client questions &amp; answers <button class="sn-qa-copy-btn" id="sn-copy-q">Copy Q&amp;A</button></div><div class="sn-qa-body" id="sn-questions-text">' + esc(questions) + '</div></div>' : ''}
        </div>

        <!-- RIGHT: Intelligence panel -->
        <div class="sn-col-intel">

          <!-- Probability + Match chips -->
          <div class="sn-intel-scores">
            <div class="sn-score-row">
              <div class="sn-score-head">
                <span class="sn-score-label">Job odds</span>
                <span class="sn-score-val" style="color:${wp.probColor}">${wp.probScore}%</span>
              </div>
              <div class="sn-score-bar-wrap"><div class="sn-score-bar" style="width:${wp.probScore}%;background:${wp.probColor}"></div></div>
              <div class="sn-chips-row">
                ${wp.topProb.slice(0,3).map(f => '<span class="sn-chip2 ' + (f.delta > 0 ? 'c-g' : f.delta < 0 ? 'c-r' : 'c-y') + '" title="' + esc(f.note) + '">' + esc(f.label) + ': ' + esc(f.value) + '</span>').join('')}
              </div>
            </div>
            <div class="sn-score-row">
              <div class="sn-score-head">
                <span class="sn-score-label">Profile fit</span>
                <span class="sn-score-val" style="color:${wp.matchColor}">${wp.matchScore}%</span>
              </div>
              <div class="sn-score-bar-wrap"><div class="sn-score-bar" style="width:${wp.matchScore}%;background:${wp.matchColor}"></div></div>
              <div class="sn-chips-row">
                ${wp.topMatch.slice(0,3).map(f => '<span class="sn-chip2 ' + (f.delta > 0 ? 'c-g' : f.warn ? 'c-r' : 'c-y') + '" title="' + esc(f.note) + '">' + esc(f.label) + ': ' + esc(f.value) + '</span>').join('')}
              </div>
            </div>
          </div>

          ${wp.warnings.length ? '<div class="sn-intel-warns">' + wp.warnings.slice(0,2).map(w => '<div class="sn-intel-warn">⚠ ' + esc(w) + '</div>').join('') + '</div>' : ''}

          ${tips && tips.length ? '<div class="sn-intel-tips"><div class="sn-intel-tips-label">Tips</div>' + tips.map(t => '<div class="sn-itip">' + esc(t) + '</div>').join('') + '</div>' : ''}



          ${remaining !== null && remaining <= 10 ? '<div class="sn-low-bar"><span>' + (remaining === 0 ? '🚫 No proposals left' : '⚡ ' + remaining + ' left') + '</span><button class="sn-low-upgrade" id="sn-low-upgrade">Upgrade</button></div>' : ''}



        </div>
      </div>
    `;

    // Auto-expand textarea
    const refineInp = document.getElementById('sn-refine-inp');
    if (refineInp) {
      refineInp.addEventListener('input', () => {
        refineInp.style.height = 'auto';
        refineInp.style.height = refineInp.scrollHeight + 'px';
      });
    }

    document.getElementById('sn-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(document.getElementById('sn-letter').innerText).then(() => {
        const btn = document.getElementById('sn-copy');
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
        btn.style.background = 'var(--sn-green)';
        setTimeout(() => {
          btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
          btn.style.background = '';
        }, 2500);
      });
    });

    const copyQBtn = document.getElementById('sn-copy-q');
    if (copyQBtn) {
      copyQBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(document.getElementById('sn-questions-text').innerText).then(() => {
          copyQBtn.textContent = '✓ Copied'; setTimeout(() => copyQBtn.textContent = 'Copy', 2000);
        });
      });
    }

    document.getElementById('sn-regen').addEventListener('click', () => {
      window._snagRefineInstruction = document.getElementById('sn-refine-inp')?.value?.trim() || '';
      showLoading(); generate();
    });

    const lowBtn = document.getElementById('sn-low-upgrade');
    if (lowBtn) lowBtn.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_PRICING' }));
  }

  // SPA observer
  new MutationObserver(() => {
    if (location.href.includes('/jobs/') || location.href.includes('/proposals/')) injectUI();
  }).observe(document.body, { childList: true, subtree: true });

  setTimeout(injectUI, 1500);
})();