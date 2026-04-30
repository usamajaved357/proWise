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

  function openAndGenerate() {
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
        <div class="sn-plans">
          <div class="sn-plan" data-plan="starter">
            <div class="sn-plan-name">Starter</div>
            <div class="sn-plan-price">$19<span>/mo</span></div>
            <div class="sn-plan-limit">150 proposals</div>
          </div>
          <div class="sn-plan sn-plan-feat" data-plan="pro">
            <div class="sn-plan-pop">BEST</div>
            <div class="sn-plan-name">Pro</div>
            <div class="sn-plan-price">$39<span>/mo</span></div>
            <div class="sn-plan-limit">400 proposals</div>
          </div>
          <div class="sn-plan" data-plan="agency">
            <div class="sn-plan-name">Agency</div>
            <div class="sn-plan-price">$69<span>/mo</span></div>
            <div class="sn-plan-limit">900 proposals</div>
          </div>
        </div>
        <button class="sn-cta-btn" id="sn-upgrade-btn">View plans & subscribe →</button>
        ${!isFree ? '<div class="sn-reset-note">Resets on the 1st of next month</div>' : ''}
      </div>
    `;

    document.getElementById('sn-upgrade-btn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_PRICING' });
    });
    document.querySelectorAll('.sn-plan').forEach(el => {
      el.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_PRICING' }));
    });
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
    const description = descEl?.innerText?.trim() || document.body.innerText.slice(0, 2000);
    const skills = Array.from(document.querySelectorAll('[data-test="Skill"] span, .air3-badge span'))
      .map(s => s.innerText.trim()).filter(Boolean).join(', ');
    const budget   = document.querySelector('[data-test="budget"] strong')?.innerText?.trim() || '';
    const location = document.querySelector('[data-test="client-location"] strong')?.innerText?.trim() || '';
    return { title, description, skills, budget, location };
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

      const job = getJob();
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_PROPOSAL',
        payload: { job }
      });

      if (!response) { showError('No response. Try refreshing the page.'); return; }
      if (response.showPaywall) { showPaywall(response.usage || response); return; }
      if (response.error) { showError(response.error); return; }
      renderProposal(response);
    } catch(err) {
      showError(err.message || 'Something went wrong.');
    }
  }

  // Render proposal
  function renderProposal(data) {
    const { letter, hookType, hookDesc, tips, usage } = data;
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

        ${tips?.length ? `
        <div class="sn-tips">
          <div class="sn-tips-head">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Tips for this job
          </div>
          ${tips.map(t => `<div class="sn-tip"><span class="sn-tip-line"></span><span>${esc(t)}</span></div>`).join('')}
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
