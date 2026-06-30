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

  // Read question labels + fields together
  // All Q&A textareas live inside ONE .questions-area container — iterate textareas directly
  function getQuestions() {
    return getQuestionFields().map((field, i) => {
      // Walk up to find the question block that wraps this specific textarea
      const block = field.closest('[class*="question-block"], [class*="QuestionBlock"]')
                 || field.parentElement?.parentElement
                 || field.parentElement;

      const rawLabel = (
        block?.querySelector('label')?.innerText ||
        block?.querySelector('h4, h3, h2')?.innerText ||
        block?.querySelector('p')?.innerText ||
        `Question ${i + 1}`
      ).trim().replace(/\s+/g, ' ');

      const label = rawLabel.replace(/^\d+[\.\)]\s*/, '').trim();
      return { label, field, existing: field.value || '' };
    });
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

  // Exposed so generate() can call them regardless of which flow triggers it
  let _openBox  = () => {};
  let _closeBox = () => {};

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
      <div class="sn-pp-compose">
        <div class="sn-pp-compose-wrap">
          <textarea class="sn-pp-input" id="sn-pp-input" placeholder="Shorter, add GitHub, more confident…" rows="1"></textarea>
          <button class="sn-pp-send" id="sn-pp-write" title="Generate cover letter">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(box);

    // ── Event listeners ──────────────────────────────────────────────────────

    _openBox = function() {
      btn.classList.add('sn-pp-hidden');
      box.style.display = 'flex';
      requestAnimationFrame(() => box.classList.add('sn-pp-open'));
      document.getElementById('sn-pp-input')?.focus();
    };

    _closeBox = function() {
      box.classList.remove('sn-pp-open');
      setTimeout(() => {
        box.style.display = '';
        btn.classList.remove('sn-pp-hidden');
      }, 220);
    };

    const openBox  = _openBox;
    const closeBox = _closeBox;

    // Toggle chat box
    btn.addEventListener('click', () => {
      if (btn.classList.contains('sn-pp-loading')) return;
      box.classList.contains('sn-pp-open') ? closeBox() : openBox();
    });

    document.getElementById('sn-pp-close').addEventListener('click', closeBox);

    // Chips fill the input
    box.querySelectorAll('.sn-pp-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const inp = document.getElementById('sn-pp-input');
        inp.value = chip.dataset.ins;
        inp.focus();
        syncSendBtn(inp);
        autoResize(inp);
      });
    });

    // Auto-resize textarea and sync send button disabled state
    const sendBtn = document.getElementById('sn-pp-write');

    function autoResize(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    }

    function syncSendBtn(el) {
      sendBtn.disabled = !el.value.trim();
    }

    const inp = document.getElementById('sn-pp-input');
    sendBtn.disabled = true; // disabled by default — empty field

    inp.addEventListener('input', () => {
      autoResize(inp);
      syncSendBtn(inp);
    });

    // Send on Enter (Shift+Enter = newline)
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) generate(jobData, 'chatbot');
      }
    });

    // Write button — chatbot flow
    sendBtn.addEventListener('click', () => generate(jobData, 'chatbot'));
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
    const questions    = getQuestions();
    const qFields      = questions.map(q => q.field);

    // Show progress only on the relevant element for each flow
    if (isInline) {
      if (clIcon) clIcon.classList.add('sn-cl-spinning');
    } else {
      _closeBox();
      setTimeout(() => btn.classList.add('sn-pp-loading'), 220);
    }
    if (writeBtn) writeBtn.disabled = true;

    // Update status
    if (statusEl) statusEl.textContent = 'Generating…';
    if (dotEl) { dotEl.className = 'sn-pp-status-dot'; }

    try {
      // Re-fetch job data fresh in case it was updated
      const freshJob = await getCachedJob();

      // Phase 1 — generate cover letter (no questions, fast)
      const result = await chrome.runtime.sendMessage({
        type:      'GENERATE_COVER_LETTER',
        jobData:   freshJob || jobData,
        instruction,
        existingCL,
        questions: [], // questions handled separately after CL injection
      });

      if (result?.error) throw new Error(result.error);

      // Inject cover letter immediately
      const generatedCL = result?.coverLetter || '';
      if (generatedCL && clField) vueInject(clField, generatedCL);

      // Helper to mark generation as done (called after all phases complete)
      function markDone() {
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
        if (statusEl) statusEl.textContent = 'Cover letter ready ✓';
        if (dotEl) dotEl.className = 'sn-pp-status-dot';
      }

      // Phase 2 — answer questions after DOM settles; keep spinner until complete
      setTimeout(async () => {
        const freshQs = getQuestions();

        if (!freshQs.length) {
          // No questions — done immediately
          markDone();
          return;
        }

        console.log('[SnagAI] Phase 2 — answering', freshQs.length, 'questions');

        try {
          const ansResult = await chrome.runtime.sendMessage({
            type:        'GENERATE_COVER_LETTER',
            jobData:     freshJob || jobData,
            instruction: '',
            existingCL:  generatedCL,
            questions:   freshQs.map(q => ({ label: q.label, existing: '' })),
          });

          if (ansResult?.answers?.length) {
            const freshFields = getQuestions().map(q => q.field);
            ansResult.answers.forEach((ans, i) => {
              if (freshFields[i] && ans) vueInject(freshFields[i], ans);
            });
            console.log('[SnagAI] Injected', ansResult.answers.length, 'answers');
          }
        } catch(e) {
          console.error('[SnagAI] Phase 2 error:', e.message);
        }

        // Done after Phase 2 regardless of outcome
        markDone();
      }, 800);

    } catch (err) {
      if (isInline) {
        if (clIcon) clIcon.classList.remove('sn-cl-spinning');
      } else {
        btn.classList.remove('sn-pp-loading');
      }
      if (statusEl) statusEl.textContent = 'Error: ' + (err.message || 'Try again');
      if (dotEl) dotEl.className = 'sn-pp-status-dot err';

      if (!isInline) _openBox();
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
