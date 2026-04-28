// PropWise Content v5
(function () {
  'use strict';

  function log(...a) { console.log('[PropWise]', ...a); }
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ── Inject UI ──────────────────────────────────────────────────────────────
  function injectUI() {
    if (document.getElementById('pw-trigger')) return;

    // Overlay
    const ov = document.createElement('div');
    ov.id = 'pw-overlay';
    document.body.appendChild(ov);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'pw-panel';
    panel.innerHTML = `
      <div class="pw-head">
        <div class="pw-brand">
          <div class="pw-logo">P</div>
          <div><div class="pw-title">PropWise</div><div class="pw-sub">AI proposal writer</div></div>
        </div>
        <button class="pw-close" id="pw-close">✕</button>
      </div>
      <div class="pw-body" id="pw-body">
        <div class="pw-loading"><div class="pw-ring"></div><p>Reading job · crafting proposal…</p></div>
      </div>
      <div class="pw-footer" id="pw-footer" style="display:none">
        <button class="pw-btn-copy" id="pw-copy">Copy proposal</button>
        <button class="pw-btn-regen" id="pw-regen">↺ Rewrite</button>
      </div>
    `;
    document.body.appendChild(panel);

    // Floating button
    const trig = document.createElement('div');
    trig.id = 'pw-trigger';
    trig.innerHTML = `<button id="pw-btn"><span class="pw-btn-icon">✦</span><span>Write Proposal</span><span class="pw-dot"></span></button>`;
    document.body.appendChild(trig);

    document.getElementById('pw-btn').addEventListener('click', toggle);
    document.getElementById('pw-close').addEventListener('click', close);
    ov.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    log('UI injected');
  }

  let open = false;

  function toggle() { open ? close() : openAndGenerate(); }

  function openAndGenerate() {
    document.getElementById('pw-overlay').classList.add('vis');
    document.getElementById('pw-panel').classList.add('vis');
    open = true;
    showLoading();
    generate();
  }

  function close() {
    document.getElementById('pw-overlay').classList.remove('vis');
    document.getElementById('pw-panel').classList.remove('vis');
    open = false;
  }

  function showLoading() {
    document.getElementById('pw-body').innerHTML = `<div class="pw-loading"><div class="pw-ring"></div><p>Reading job · crafting proposal…</p></div>`;
    document.getElementById('pw-footer').style.display = 'none';
  }

  function showError(msg) {
    document.getElementById('pw-body').innerHTML = `<div class="pw-error"><strong>Error:</strong> ${esc(msg)}</div>`;
    document.getElementById('pw-footer').style.display = 'none';
  }

  // ── Paywall UI ─────────────────────────────────────────────────────────────
  function showPaywall(data) {
    const isFree = !data.plan || data.plan === 'free';
    const msg = isFree
      ? "You've used your <strong>2 free proposals</strong>."
      : `You've used all <strong>${data.limit} proposals</strong> this month.`;

    document.getElementById('pw-body').innerHTML = `
      <div class="pw-paywall">
        <div class="pw-paywall-icon">✦</div>
        <h2 class="pw-paywall-title">${isFree ? 'Upgrade to keep winning jobs' : 'Monthly limit reached'}</h2>
        <p class="pw-paywall-sub">${msg} ${isFree ? 'Subscribe to unlock your full proposal limit.' : 'Your proposals reset on the 1st of next month.'}</p>

        <div class="pw-plans">
          <div class="pw-plan" data-url="STARTER_PADDLE_URL">
            <div class="pw-plan-head">
              <span class="pw-plan-name">Starter</span>
              <span class="pw-plan-badge">150/mo</span>
            </div>
            <div class="pw-plan-price">$19<span>/mo</span></div>
            <div class="pw-plan-note">$0.127 per proposal</div>
          </div>
          <div class="pw-plan featured" data-url="PRO_PADDLE_URL">
            <div class="pw-plan-popular">BEST VALUE</div>
            <div class="pw-plan-head">
              <span class="pw-plan-name">Pro</span>
              <span class="pw-plan-badge">400/mo</span>
            </div>
            <div class="pw-plan-price">$39<span>/mo</span></div>
            <div class="pw-plan-save">Save 45% per proposal</div>
          </div>
          <div class="pw-plan" data-url="AGENCY_PADDLE_URL">
            <div class="pw-plan-head">
              <span class="pw-plan-name">Agency</span>
              <span class="pw-plan-badge">900/mo</span>
            </div>
            <div class="pw-plan-price">$69<span>/mo</span></div>
            <div class="pw-plan-save">Save 57% per proposal</div>
          </div>
        </div>

        <button class="pw-paywall-cta" id="pw-upgrade-btn">View plans & subscribe →</button>
        ${!isFree ? '<p class="pw-paywall-reset">Resets on the 1st of next month</p>' : ''}
      </div>
    `;
    document.getElementById('pw-footer').style.display = 'none';

    document.getElementById('pw-upgrade-btn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_PRICING' });
    });

    document.querySelectorAll('.pw-plan').forEach(el => {
      el.addEventListener('click', () => {
        const url = el.dataset.url;
        if (url && !url.includes('PADDLE')) chrome.tabs.create({ url });
        else chrome.runtime.sendMessage({ type: 'OPEN_PRICING' });
      });
    });
  }

  // ── Read job from page ─────────────────────────────────────────────────────
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
    const spent    = document.querySelector('[data-test="client-spendings"]')?.innerText?.trim() || '';

    log('Job read:', { title, skills, budget });
    return { title, description, skills, budget, location, spent };
  }

  // ── Generate ───────────────────────────────────────────────────────────────
  async function generate() {
    try {
      const stored = await chrome.storage.sync.get(['profile']);
      if (!stored.profile?.name) {
        showError('Set up your profile first — click the PropWise icon in your Chrome toolbar.');
        return;
      }

      const job = getJob();
      log('Sending to background...');

      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_PROPOSAL',
        payload: { job }
      });

      log('Response:', response);

      if (!response) { showError('No response. Try reloading the extension.'); return; }

      if (response.showPaywall) { showPaywall(response.usage || response); return; }

      if (response.error) { showError(response.error); return; }

      renderProposal(response);

    } catch (err) {
      log('Error:', err);
      showError(err.message || 'Something went wrong.');
    }
  }

  // ── Render proposal ────────────────────────────────────────────────────────
  function renderProposal(data) {
    const { letter, hookType, hookDesc, tips, usage } = data;
    if (!letter) { showError('Empty proposal. Please try again.'); return; }

    const remaining = usage?.remaining;
    const showUsage = remaining !== undefined;
    const usageColor = remaining <= 10 ? '#ef4444' : remaining <= 30 ? '#f59e0b' : '#6b7280';

    document.getElementById('pw-body').innerHTML = `
      <div class="pw-proposal">
        <div class="pw-hook-bar">
          <div>
            <div class="pw-hook-type">${esc(hookType||'PropWise')}</div>
            <div class="pw-hook-desc">${esc(hookDesc||'')}</div>
          </div>
          ${showUsage ? `<span class="pw-usage" style="color:${usageColor}">${remaining} left</span>` : ''}
        </div>
        <div class="pw-letter-wrap">
          <div class="pw-letter" id="pw-letter" contenteditable="true">${esc(letter)}</div>
          <div class="pw-letter-hint">Click to edit before copying</div>
        </div>
        ${tips?.length ? `<div class="pw-tips-wrap"><div class="pw-tips-label">Tips for this job</div>${tips.map(t=>`<div class="pw-tip"><span class="pw-tip-dot"></span><span>${esc(t)}</span></div>`).join('')}</div>` : ''}
        ${remaining !== undefined && remaining <= 10 ? `<div class="pw-low-credits"><span>⚠️ Only ${remaining} proposals left this month.</span><button onclick="chrome.runtime.sendMessage({type:'OPEN_PRICING'})">Upgrade →</button></div>` : ''}
      </div>
    `;

    document.getElementById('pw-footer').style.display = 'flex';

    document.getElementById('pw-copy').onclick = () => {
      navigator.clipboard.writeText(document.getElementById('pw-letter').innerText);
      const btn = document.getElementById('pw-copy');
      btn.textContent = '✓ Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy proposal'; btn.classList.remove('copied'); }, 2500);
    };

    document.getElementById('pw-regen').onclick = () => { showLoading(); generate(); };
  }

  // ── SPA observer ──────────────────────────────────────────────────────────
  new MutationObserver(() => {
    if (location.href.includes('/jobs/') || location.href.includes('/proposals/')) injectUI();
  }).observe(document.body, { childList: true, subtree: true });

  setTimeout(injectUI, 1500);
})();
