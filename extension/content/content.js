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
    ov.addEventListener('click', closePanel);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });
  }

  let isOpen = false;

  function toggle() { isOpen ? closePanel() : openAndGenerate(); }

  async function openAndGenerate() {
    document.getElementById('sn-overlay').classList.add('vis');
    document.getElementById('sn-panel').classList.add('vis');
    isOpen = true;
    showLoading();

    // Check limit BEFORE generating — client-side gate
    try {
      const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      if (status && status.remaining !== undefined && status.remaining <= 0) {
        showPaywall(status);
        return;
      }
    } catch(e) {
      // If status check fails, let server handle it
    }

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

    // Extract additional questions from job description
    // Upwork questions usually appear after "Questions" heading or numbered list at end
    let description = fullDesc;
    let questions = '';
    const qMatch = fullDesc.match(/(?:additional\s+questions?|screening\s+questions?|please\s+answer|answer\s+the\s+following)[:\s]*([\s\S]+)/i);
    if (qMatch) {
      questions = qMatch[1].trim().slice(0, 800);
    }

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

    // Proposals submitted
    let proposalCount = null;
    const pm = pageText2.match(/(\d+)\s*(?:to\s*\d+\s*)?(?:proposals?|bids?|applicants?)/i);
    if (pm) proposalCount = parseInt(pm[1]);

    // Time posted
    let timePosted = null;
    const tm = pageText2.match(/(\d+)\s+(minutes?|hours?|days?|weeks?)\s+ago/i);
    if (tm) timePosted = tm[1] + ' ' + tm[2] + ' ago';

    // Client avg hourly rate paid
    let clientAvgRate = null;
    const arm = pageText2.match(/\$([0-9,]+(?:\.\d+)?)\s*\/hr\s+avg/i);
    if (arm) clientAvgRate = parseFloat(arm[1].replace(',',''));

    // Client total spent
    let clientTotalSpent = null;
    const sm = pageText2.match(/\$([0-9,.]+[KMkB]?)\s+total\s+spent/i);
    if (sm) clientTotalSpent = sm[1];

    // Client hire rate
    let clientHireRate = null;
    const hrm = pageText2.match(/(\d+)%\s+hire\s+rate/i);
    if (hrm) clientHireRate = parseInt(hrm[1]);

    // Client jobs posted
    let clientJobsPosted = null;
    const jpm = pageText2.match(/(\d+)\s+jobs?\s+posted/i);
    if (jpm) clientJobsPosted = parseInt(jpm[1]);

    // Client rating count
    let clientRating = null;
    const crm = pageText2.match(/Rating is (\d+(?:\.\d+)?) out of 5/i);
    if (crm) clientRating = parseFloat(crm[1]);

    // Interviewing count
    let interviewingCount = null;
    const im = pageText2.match(/Interviewing:\s*(\d+)/i);
    if (im) interviewingCount = parseInt(im[1]);

    const jobStats = { proposalCount, timePosted, clientAvgRate, clientTotalSpent, clientHireRate, clientJobsPosted, clientRating, interviewingCount };
    console.log('Job stats:', JSON.stringify(jobStats));

    const finalClientName = clientNameFromReview || clientName;
    return { title, description, skills, budget, location, clientName: finalClientName, questions, reviewText, type: jobType, jobStats };
  }

  // Generate
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

      // Small delay to let dynamic content (reviews) finish rendering
      await new Promise(r => setTimeout(r, 800));

      const job = getJob();
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_PROPOSAL',
        payload: { job }
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

  // ── Win Probability Calculator ────────────────────────────────────────────
  function calcWinProbability(job, profile, jobStats) {
    let score = 50; // baseline
    const factors = [];
    const warnings = [];

    // 1. Competition level
    const proposals = jobStats.proposalCount;
    let competitionLabel = 'Unknown';
    if (proposals !== null) {
      if (proposals <= 5) {
        score += 20; competitionLabel = 'Very Low';
        factors.push({ label: 'Competition', value: proposals + ' proposals', good: true, note: 'Apply immediately' });
      } else if (proposals <= 15) {
        score += 10; competitionLabel = 'Low';
        factors.push({ label: 'Competition', value: proposals + ' proposals', good: true, note: 'Good timing' });
      } else if (proposals <= 30) {
        score += 0; competitionLabel = 'Medium';
        factors.push({ label: 'Competition', value: proposals + ' proposals', good: null, note: 'Stand out with specifics' });
      } else if (proposals <= 50) {
        score -= 10; competitionLabel = 'High';
        factors.push({ label: 'Competition', value: proposals + ' proposals', good: false, note: 'Be very specific' });
      } else {
        score -= 20; competitionLabel = 'Very High';
        factors.push({ label: 'Competition', value: proposals + ' proposals', good: false, note: 'Hard to win' });
        warnings.push('Over 50 proposals — only apply if you perfectly match');
      }
    }

    // 2. Timing bonus
    const timeStr = jobStats.timePosted || '';
    const minMatch = timeStr.match(/(\d+)\s*minute/i);
    const hrMatch  = timeStr.match(/(\d+)\s*hour/i);
    const dayMatch = timeStr.match(/(\d+)\s*day/i);
    if (minMatch || (hrMatch && parseInt(hrMatch[1]) <= 2)) {
      score += 15;
      factors.push({ label: 'Timing', value: timeStr, good: true, note: 'Early applicant — big advantage' });
    } else if (hrMatch && parseInt(hrMatch[1]) <= 6) {
      score += 8;
      factors.push({ label: 'Timing', value: timeStr, good: true, note: 'Good timing' });
    } else if (hrMatch && parseInt(hrMatch[1]) <= 24) {
      factors.push({ label: 'Timing', value: timeStr, good: null, note: 'Apply now' });
    } else if (dayMatch) {
      score -= 5;
      factors.push({ label: 'Timing', value: timeStr, good: false, note: 'Late application' });
    }

    // 3. Rate alignment
    const freelancerRate = parseFloat((profile.hourlyRate || '0').replace(/[^0-9.]/g, '')) || 0;
    const clientAvgRate  = jobStats.clientAvgRate;
    if (clientAvgRate && freelancerRate) {
      const diff = Math.abs(clientAvgRate - freelancerRate);
      const pct  = diff / clientAvgRate;
      if (pct <= 0.15) {
        score += 12;
        factors.push({ label: 'Rate match', value: '$' + freelancerRate + '/hr vs $' + clientAvgRate + '/hr avg', good: true, note: 'Perfect rate alignment' });
      } else if (pct <= 0.35) {
        score += 5;
        factors.push({ label: 'Rate match', value: '$' + freelancerRate + '/hr vs $' + clientAvgRate + '/hr avg', good: null, note: 'Close match' });
      } else if (freelancerRate > clientAvgRate * 1.4) {
        score -= 8;
        factors.push({ label: 'Rate match', value: '$' + freelancerRate + '/hr vs $' + clientAvgRate + '/hr avg', good: false, note: 'Your rate is high for this client' });
        warnings.push('Client avg $' + clientAvgRate + '/hr — consider adjusting your pitch');
      } else {
        factors.push({ label: 'Rate match', value: '$' + freelancerRate + '/hr vs $' + clientAvgRate + '/hr avg', good: null, note: 'Rate gap noted' });
      }
    }

    // 4. Client quality
    const clientRating = jobStats.clientRating;
    const totalSpent   = jobStats.clientTotalSpent;
    const hireRate     = jobStats.clientHireRate;
    if (clientRating && clientRating >= 4.5) {
      score += 5;
      factors.push({ label: 'Client quality', value: clientRating + '★ rating', good: true, note: hireRate ? hireRate + '% hire rate' : '' });
    } else if (clientRating && clientRating < 4.0) {
      warnings.push('Client has low rating (' + clientRating + '★) — review carefully');
    }

    // 5. Freelancer tier bonus
    const tierScores = { new: 0, rising: 5, top_rated: 12, top_rated_plus: 18, expert: 25 };
    const tierBonus  = tierScores[profile.tier] || 0;
    if (tierBonus > 0) {
      score += tierBonus;
      const tierLabels = { rising: 'Rising Talent', top_rated: 'Top Rated', top_rated_plus: 'Top Rated Plus', expert: 'Expert Vetted' };
      factors.push({ label: 'Your tier', value: tierLabels[profile.tier] || profile.tier, good: true, note: 'Badge visible to client' });
    }

    // 6. JSS score
    const jss = parseFloat((profile.jss || '0').replace(/[^0-9.]/g, '')) || 0;
    if (jss >= 90) {
      score += 8;
      factors.push({ label: 'JSS', value: jss + '%', good: true, note: 'Strong success score' });
    } else if (jss >= 80) {
      score += 3;
      factors.push({ label: 'JSS', value: jss + '%', good: null, note: 'Good' });
    } else if (jss > 0 && jss < 70) {
      score -= 10;
      warnings.push('JSS below 70% — clients may skip your profile');
    }

    // Cap between 5 and 95
    score = Math.max(5, Math.min(95, score));

    // Win verdict
    let verdict, verdictColor;
    if (score >= 75) { verdict = 'Strong match'; verdictColor = '#34d399'; }
    else if (score >= 55) { verdict = 'Good chance'; verdictColor = '#c9a84c'; }
    else if (score >= 35) { verdict = 'Possible'; verdictColor = '#f59e0b'; }
    else { verdict = 'Long shot'; verdictColor = '#f87171'; }

    return { score, verdict, verdictColor, factors, warnings, competitionLabel };
  }


  // Render proposal
  function renderProposal(data) {
    const { letter, hookType, hookDesc, tips, usage, questions } = data;
    if (!letter) { showError('Empty proposal. Please try again.'); return; }

    const remaining = usage?.remaining;
    const plan = usage?.plan || 'free';

    // Update header
    document.getElementById('sn-hook-label').textContent = hookType || 'Proposal ready';

    // Usage badge
    const badge = document.getElementById('sn-usage-badge');
    if (remaining !== undefined) {
      badge.style.display = 'flex';
      if (remaining <= 5) {
        badge.className = 'sn-usage-badge sn-badge-danger';
        badge.textContent = `${remaining} left`;
      } else if (remaining <= 20) {
        badge.className = 'sn-usage-badge sn-badge-warn';
        badge.textContent = `${remaining} left`;
      } else {
        badge.className = 'sn-usage-badge sn-badge-ok';
        badge.textContent = `${remaining} left`;
      }
    }

    document.getElementById('sn-body').innerHTML = `
      <div class="sn-proposal">

        ${hookDesc ? `<div class="sn-hook-info">
          <span class="sn-hook-chip">${esc(hookType||'')}</span>
          <span class="sn-hook-why">${esc(hookDesc)}</span>
        </div>` : ''}

        <div class="sn-letter-container" id="sn-letter-container">
          <div class="sn-letter" id="sn-letter" contenteditable="true">${esc(letter)}</div>
          <div class="sn-letter-footer">
            <span class="sn-edit-hint">Click to edit</span>
            <button class="sn-copy-btn" id="sn-copy">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
          </div>
        </div>

        ${(() => {
          const jobStats = window._snagJobStats || {};
          const profile  = window._snagProfile  || {};
          const wp = calcWinProbability({}, profile, jobStats);
          const hasStats = Object.values(jobStats).some(v => v !== null && v !== undefined);

          return `<div class="sn-intel">
            <div class="sn-intel-head">
              <div class="sn-intel-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Job Intelligence
              </div>
              <div class="sn-win-score" style="color:${wp.verdictColor}">
                <span class="sn-win-pct">${wp.score}%</span>
                <span class="sn-win-label">${wp.verdict}</span>
              </div>
            </div>

            <div class="sn-win-bar-wrap">
              <div class="sn-win-bar" style="width:${wp.score}%;background:${wp.verdictColor}"></div>
            </div>

            ${hasStats ? `<div class="sn-intel-factors">
              ${wp.factors.map(f => `
                <div class="sn-factor">
                  <div class="sn-factor-dot ${f.good === true ? 'green' : f.good === false ? 'red' : 'yellow'}"></div>
                  <div class="sn-factor-body">
                    <span class="sn-factor-label">${esc(f.label)}:</span>
                    <span class="sn-factor-value">${esc(f.value)}</span>
                    ${f.note ? `<span class="sn-factor-note">${esc(f.note)}</span>` : ''}
                  </div>
                </div>`).join('')}
            </div>` : '<div class="sn-no-stats">No client stats available for this job</div>'}

            ${wp.warnings.length ? `<div class="sn-warnings">
              ${wp.warnings.map(w => `<div class="sn-warning">⚠ ${esc(w)}</div>`).join('')}
            </div>` : ''}

            ${tips?.length ? `<div class="sn-intel-tips">
              <div class="sn-tips-label">Strategy tips</div>
              ${tips.map(t => `<div class="sn-tip"><span class="sn-tip-line"></span><span>${esc(t)}</span></div>`).join('')}
            </div>` : ''}
          </div>`;
        })()}

        ${questions ? `
        <div class="sn-questions">
          <div class="sn-questions-head">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Additional questions
          </div>
          <div class="sn-questions-body" id="sn-questions-text">${esc(questions)}</div>
          <div class="sn-letter-footer" style="margin-top:8px">
            <span class="sn-edit-hint">Copy and paste below your proposal</span>
            <button class="sn-copy-btn" id="sn-copy-q">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Q&amp;A
            </button>
          </div>
        </div>` : ''}

        ${remaining !== undefined && remaining <= 10 ? `
        <div class="sn-low-bar">
          <span>${remaining === 0 ? '🚫 No proposals left' : `⚡ ${remaining} proposal${remaining === 1 ? '' : 's'} left this month`}</span>
          <button class="sn-low-upgrade" id="sn-low-upgrade">Upgrade →</button>
        </div>` : ''}

        <div class="sn-actions">
          <button class="sn-regen-btn" id="sn-regen">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Rewrite
          </button>
        </div>
      </div>
    `;

    // Copy button
    document.getElementById('sn-copy').addEventListener('click', () => {
      const text = document.getElementById('sn-letter').innerText;
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('sn-copy');
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
          btn.classList.remove('copied');
        }, 2500);
      });
    });

    // Copy Q&A button
    const copyQBtn = document.getElementById('sn-copy-q');
    if (copyQBtn) {
      copyQBtn.addEventListener('click', () => {
        const text = document.getElementById('sn-questions-text').innerText;
        navigator.clipboard.writeText(text).then(() => {
          copyQBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
          copyQBtn.classList.add('copied');
          setTimeout(() => {
            copyQBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Q&A`;
            copyQBtn.classList.remove('copied');
          }, 2500);
        });
      });
    }

    // Rewrite
    document.getElementById('sn-regen').addEventListener('click', () => {
      showLoading(); generate();
    });

    // Low upgrade
    const lowBtn = document.getElementById('sn-low-upgrade');
    if (lowBtn) lowBtn.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_PRICING' }));
  }

  // SPA observer
  new MutationObserver(() => {
    if (location.href.includes('/jobs/') || location.href.includes('/proposals/')) injectUI();
  }).observe(document.body, { childList: true, subtree: true });

  setTimeout(injectUI, 1500);
})();
