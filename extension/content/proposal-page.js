// ── Snag AI — Proposal Submission Page ─────────────────────────────────────
// Injects a Zendesk-style chat bot on /nx/proposals/*/apply/
// Reads cached job data, generates CL, injects via Vue input events
(function () {
  'use strict';

  if (!location.href.includes('/nx/proposals/')) return;
  if (document.getElementById('sn-pp-btn')) return;

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Extract job ID from URL: /nx/proposals/job/~XXXX/apply/
  function getJobId() {
    const m = location.href.match(/\/job\/(~[^/?#]+)/);
    return m ? m[1] : null;
  }

  // Inject text into a Vue-controlled textarea
  function vueInject(el, text) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Get cached job data stored by the job page
  async function getCachedJob() {
    const jobId = getJobId();
    console.log('[SnagAI] Proposal page jobId:', jobId);
    if (!jobId) return null;
    return new Promise(resolve => {
      chrome.storage.local.get([`sn_job_${jobId}`], r => {
        const data = r[`sn_job_${jobId}`] || null;
        console.log('[SnagAI] Cached job data:', data ? 'found' : 'not found');
        resolve(data);
      });
    });
  }

  // Find the CL textarea
  function getCLField() {
    return document.querySelector('.cover-letter-area textarea');
  }

  // Find all client question textareas
  function getQuestionFields() {
    return [...document.querySelectorAll('.questions-area textarea')];
  }

  // Wait for the cover letter field to appear (SPA lazy render)
  function waitForCLField(cb, timeout = 15000) {
    const start = Date.now();
    const check = () => {
      const el = getCLField();
      if (el) { cb(el); return; }
      if (Date.now() - start > timeout) return;
      setTimeout(check, 400);
    };
    check();
  }

  // ── Logo SVG ───────────────────────────────────────────────────────────────
  const LOGO_SVG = `<svg class="sn-pp-icon" width="22" height="22" viewBox="0 0 100 100" fill="none">
    <rect x="5" y="5" width="64" height="78" rx="10" stroke="white" stroke-width="5.5" fill="none"/>
    <line x1="14" y1="23" x2="57" y2="23" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <line x1="14" y1="35" x2="57" y2="35" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <line x1="14" y1="47" x2="57" y2="47" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <line x1="14" y1="59" x2="40" y2="59" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <circle cx="76" cy="77" r="23" fill="#4338ca"/>
    <polygon points="80,59 70,78 77,78 73,95 88,74 81,74" fill="white"/>
  </svg>
  <div class="sn-pp-spinner"></div>`;

  const LOGO_SM = `<svg width="16" height="16" viewBox="0 0 100 100" fill="none">
    <rect x="5" y="5" width="64" height="78" rx="10" stroke="white" stroke-width="5.5" fill="none"/>
    <line x1="14" y1="23" x2="57" y2="23" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <line x1="14" y1="35" x2="57" y2="35" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <line x1="14" y1="47" x2="57" y2="47" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <line x1="14" y1="59" x2="40" y2="59" stroke="white" stroke-width="5" stroke-linecap="round"/>
    <circle cx="76" cy="77" r="23" fill="#4338ca"/>
    <polygon points="80,59 70,78 77,78 73,95 88,74 81,74" fill="white"/>
  </svg>`;

  // ── Inject icon inside the cover letter textarea wrapper ──────────────────
  function injectTextareaIcon(clField, jobData) {
    if (document.getElementById('sn-cl-icon')) return;

    // Use the immediate wrapper (.air3-textarea) — same level as Grammarly icon
    const container = clField.parentElement;
    if (!container) return;

    // Must be positioned so our absolute child renders inside the field boundary
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    // Allow our icon to show above the textarea content
    container.style.overflow = 'visible';

    const icon = document.createElement('button');
    icon.id = 'sn-cl-icon';
    icon.setAttribute('data-tip', 'Write cover letter with Snag AI');
    // Sparkle/write icon — visually distinct from our logo
    icon.innerHTML = `
      <svg class="sn-cl-svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:white">
        <path d="M12 2s.7 5.8 2.1 7.2C15.5 10.6 21 12 21 12s-5.5 1.4-6.9 2.8C12.7 16.2 12 22 12 22s-.7-5.8-2.1-7.2C8.5 13.4 3 12 3 12s5.5-1.4 6.9-2.8C11.3 7.8 12 2 12 2z"/>
      </svg>
      <div class="sn-cl-spin"></div>
    `;

    container.appendChild(icon);

    // Watch textarea value — green when filled, indigo when empty
    function syncIconState() {
      if (clField.value.trim().length > 0) {
        icon.classList.add('sn-cl-filled');
      } else {
        icon.classList.remove('sn-cl-filled');
      }
    }
    clField.addEventListener('input', syncIconState);
    // Check initial state
    syncIconState();

    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      generate(jobData, 'inline');
    });
    return; // skip duplicate appendChild below
  }

  // ── UI Build ───────────────────────────────────────────────────────────────
  function buildUI(jobData) {
    const hasJob   = !!(jobData?.title || jobData?.description);
    const qFields  = getQuestionFields();
    const hasQs    = qFields.length > 0;
    const statusTxt = hasJob
      ? `Job loaded · ${qFields.length} question${qFields.length !== 1 ? 's' : ''} detected`
      : 'Open the job page first for best results';

    // Floating button
    const btn = document.createElement('button');
    btn.id = 'sn-pp-btn';
    btn.title = 'Snag AI — Write cover letter';
    btn.innerHTML = LOGO_SVG;

    // Chat box
    const box = document.createElement('div');
    box.id = 'sn-pp-box';
    box.innerHTML = `
      <div class="sn-pp-head">
        <div class="sn-pp-head-logo">${LOGO_SM}</div>
        <div class="sn-pp-head-text">
          <div class="sn-pp-head-name">Snag AI</div>
          <div class="sn-pp-head-sub">Cover letter writer</div>
        </div>
        <button class="sn-pp-head-close" id="sn-pp-close">✕</button>
      </div>
      <div class="sn-pp-status-bar">
        <div class="sn-pp-status-dot ${hasJob ? '' : 'warn'}" id="sn-pp-dot"></div>
        <span id="sn-pp-status">${statusTxt}</span>
      </div>
      <div class="sn-pp-chips">
        <button class="sn-pp-chip" data-ins="Make it shorter and punchier">Shorter</button>
        <button class="sn-pp-chip" data-ins="Make it more confident and direct">More confident</button>
        <button class="sn-pp-chip" data-ins="Add my hourly rate naturally">Add my rate</button>
        <button class="sn-pp-chip" data-ins="Rewrite the opening line with a stronger hook">Better hook</button>
        ${hasQs ? `<button class="sn-pp-chip" data-ins="Also answer all client questions">Fill questions</button>` : ''}
      </div>
      <div class="sn-pp-input-wrap">
        <textarea class="sn-pp-input" id="sn-pp-input" placeholder="Describe changes — shorter, add GitHub, more confident…"></textarea>
      </div>
      <div class="sn-pp-footer">
        <span class="sn-pp-hint">✦ writes directly into the field</span>
        <button class="sn-pp-write" id="sn-pp-write">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s.7 5.8 2.1 7.2C15.5 10.6 21 12 21 12s-5.5 1.4-6.9 2.8C12.7 16.2 12 22 12 22s-.7-5.8-2.1-7.2C8.5 13.4 3 12 3 12s5.5-1.4 6.9-2.8C11.3 7.8 12 2 12 2z"/></svg>
          Write cover letter
        </button>
      </div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(box);

    // ── Event listeners ──────────────────────────────────────────────────────

    // Toggle chat box
    btn.addEventListener('click', () => {
      if (btn.classList.contains('sn-pp-loading')) return;
      const isOpen = box.classList.contains('sn-pp-open');
      if (isOpen) {
        box.classList.remove('sn-pp-open');
        setTimeout(() => { box.style.display = ''; }, 200);
      } else {
        box.style.display = 'flex';
        requestAnimationFrame(() => box.classList.add('sn-pp-open'));
        document.getElementById('sn-pp-input')?.focus();
      }
    });

    document.getElementById('sn-pp-close').addEventListener('click', () => {
      box.classList.remove('sn-pp-open');
      setTimeout(() => { box.style.display = ''; }, 200);
    });

    // Chips fill the input
    box.querySelectorAll('.sn-pp-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const inp = document.getElementById('sn-pp-input');
        inp.value = chip.dataset.ins;
        inp.focus();
      });
    });

    // Write button — chatbot flow (only floating btn shows progress)
    document.getElementById('sn-pp-write').addEventListener('click', () => generate(jobData, 'chatbot'));
  }

  // ── Generation ─────────────────────────────────────────────────────────────
  // source: 'inline' = textarea icon flow, 'chatbot' = floating button flow
  async function generate(jobData, source = 'chatbot') {
    const btn      = document.getElementById('sn-pp-btn');
    const box      = document.getElementById('sn-pp-box');
    const writeBtn = document.getElementById('sn-pp-write');
    const statusEl = document.getElementById('sn-pp-status');
    const dotEl    = document.getElementById('sn-pp-dot');
    const inp      = document.getElementById('sn-pp-input');
    const clIcon   = document.getElementById('sn-cl-icon');
    const isInline = source === 'inline';

    const instruction  = inp?.value?.trim() || '';
    const clField      = getCLField();
    const existingCL   = clField?.value || '';
    const qFields      = getQuestionFields();
    const hasQuestions = qFields.length > 0 && (
      !instruction || instruction.toLowerCase().includes('question') || instruction.toLowerCase().includes('fill') || !existingCL
    );

    // Show progress only on the relevant element for each flow
    if (isInline) {
      // Inline: spin the pill button, update label
      if (clIcon) clIcon.classList.add('sn-cl-spinning');
    } else {
      // Chatbot: collapse box, spin floating button
      box.classList.remove('sn-pp-open');
      setTimeout(() => { box.style.display = ''; }, 200);
      btn.classList.add('sn-pp-loading');
    }
    if (writeBtn) writeBtn.disabled = true;

    // Update status
    if (statusEl) statusEl.textContent = 'Generating…';
    if (dotEl) { dotEl.className = 'sn-pp-status-dot'; }

    try {
      // Re-fetch job data fresh in case it was updated
      const freshJob = await getCachedJob();

      const result = await chrome.runtime.sendMessage({
        type: 'GENERATE_COVER_LETTER',
        jobData:       freshJob || jobData,
        instruction,
        existingCL,
        fillQuestions: hasQuestions,
        questionCount: qFields.length,
      });

      if (result?.error) throw new Error(result.error);

      // Inject cover letter
      if (result?.coverLetter && clField) {
        vueInject(clField, result.coverLetter);
      }

      // Inject question answers
      if (result?.answers && Array.isArray(result.answers)) {
        const fields = getQuestionFields();
        result.answers.forEach((ans, i) => {
          if (fields[i] && ans) vueInject(fields[i], ans);
        });
      }

      // Done — update only the relevant indicator
      if (isInline) {
        if (clIcon) {
          clIcon.classList.remove('sn-cl-spinning');
          clIcon.classList.add('sn-cl-done');
          setTimeout(() => clIcon.classList.remove('sn-cl-done'), 2500);
        }
      } else {
        btn.classList.remove('sn-pp-loading');
        btn.classList.add('sn-pp-done');
        setTimeout(() => btn.classList.remove('sn-pp-done'), 2000);
      }

      if (statusEl) statusEl.textContent = 'Done — cover letter inserted';
      if (dotEl) dotEl.className = 'sn-pp-status-dot';

    } catch (err) {
      if (isInline) {
        if (clIcon) clIcon.classList.remove('sn-cl-spinning');
      } else {
        btn.classList.remove('sn-pp-loading');
      }
      if (statusEl) statusEl.textContent = 'Error: ' + (err.message || 'Try again');
      if (dotEl) dotEl.className = 'sn-pp-status-dot err';

      // Reopen chat box on error only for chatbot flow
      if (!isInline) {
        box.style.display = 'flex';
        requestAnimationFrame(() => box.classList.add('sn-pp-open'));
      }
    }

    if (writeBtn) writeBtn.disabled = false;
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  waitForCLField(async (clField) => {
    const jobData = await getCachedJob();
    buildUI(jobData);
    injectTextareaIcon(clField, jobData);
  });

  // Handle SPA navigation within proposals
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (location.href.includes('/nx/proposals/') && !document.getElementById('sn-pp-btn')) {
        waitForCLField(async () => {
          const jobData = await getCachedJob();
          buildUI(jobData);
        });
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

})();
