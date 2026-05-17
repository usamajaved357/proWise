// ── Snag AI Profile Reader v5 ─────────────────────────────────────────────────
// Passive profile read on every visit + explicit portfolio sync via flag
(function () {
  if (!location.href.includes('/freelancers/')) return;

  // ── Name ─────────────────────────────────────────────────────────────────────
  function readName() {
    const m = document.title.match(/^(.+?)\s*\|\s*Upwork/i);
    if (m && m[1].trim().length > 1 && m[1].trim().length < 80) return m[1].trim();
    for (const sel of ['[data-test="pib-name"]','[data-test="freelancer-name"]','h2[class*="name"]']) {
      try { const el = document.querySelector(sel); if (el) { const t = el.innerText.trim().split('\n')[0]; if (t.length > 1 && t.length < 80) return t; } } catch(e) {}
    }
    const h2 = document.querySelector('h2');
    if (h2) { const t = h2.innerText.trim().split('\n')[0]; if (t.length > 1 && t.length < 80 && /[A-Za-z]/.test(t)) return t; }
    return '';
  }

  // ── Title ────────────────────────────────────────────────────────────────────
  function readTitle(pt, rateM) {
    for (const sel of ['[data-test="pib-title"]','[data-test="freelancer-title"]','[class*="developer-tagline"]']) {
      try { const el = document.querySelector(sel); if (el) { const t = el.innerText.trim().split('\n')[0]; if (t.length > 10) return t; } } catch(e) {}
    }
    if (rateM) {
      const idx = pt.indexOf('$' + rateM[1]);
      if (idx > -1) {
        const lines = pt.slice(Math.max(0, idx - 600), idx).split('\n').map(l => l.trim()).filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          const l = lines[i];
          if (l.length > 15 && l.length < 150 && !/^\$|%|Job Success|Total|Rising|Top Rated|Expert/i.test(l)) return l;
        }
      }
    }
    return '';
  }

  // ── Skill validators ─────────────────────────────────────────────────────────
  const UPWORK_TRAITS   = /^(Committed to|Clear Communicator|Accountable for|Detail Oriented|Solution Oriented|Collaborative$|Reliable$|Deadline|Self-Motivated|Highly Organized|Effective Communicator|Client Focused|Results Driven|Independent|Interpersonal)/i;
  const PORTFOLIO_NOISE = /^(From \$|\$\d|Your project|Manage project|View project|Add project|Pagination|Current page|go to page|\d+ days delivery|\d+ hrs|of \d+$)/i;
  function isValidSkill(s) {
    if (!s || s.length < 2 || s.length > 60) return false;
    if (UPWORK_TRAITS.test(s) || PORTFOLIO_NOISE.test(s)) return false;
    if (/^\d+$/.test(s) || /\$\d/.test(s)) return false;
    if (/\bdelivery\b|\bpaginat|\bcurrent page|\bgo to page/i.test(s)) return false;
    if (s.split(' ').length > 6) return false;
    return true;
  }

  // ── Skills ───────────────────────────────────────────────────────────────────
  function readSkills() {
    const roots = [document.querySelector('[data-test="skills-section"]'), document.querySelector('[class*="skills-section"]'), document].filter(Boolean);
    const sels  = ['.up-skill-badge','[data-test="FreelancerCard-skill"]','[data-test="skill-badge"]','.skill-name','[class*="skill-badge"]','[class*="skillBadge"]'];
    for (const root of roots) {
      for (const sel of sels) {
        try {
          const els = root.querySelectorAll(sel);
          if (els.length > 0) {
            const ex = [...new Set([...els].map(e => e.innerText.trim().split('\n')[0].trim()).filter(isValidSkill))];
            if (ex.length >= 2 || root !== document) return ex;
          }
        } catch(e) {}
      }
      if (root === roots[0] && roots.length > 1) continue; break;
    }
    const pt = document.body.innerText;
    const ss = pt.search(/\n(?:Skills|Top Skills)\s*\n/i);
    if (ss > -1) {
      const after = pt.slice(ss + 8, ss + 1200);
      const end   = after.search(/\n(?:Portfolio|Work history|Employment|Education|Testimonials|Certifications|Languages)\s*\n/i);
      const chunk = end > -1 ? after.slice(0, end) : after.slice(0, 500);
      const lines = [];
      for (const l of chunk.split('\n').map(l => l.trim()).filter(l => l.length >= 2 && l.length <= 60 && !/^\d+$/.test(l) && !/^(Skills|See more|Less|Show more)$/i.test(l))) {
        if (UPWORK_TRAITS.test(l) || PORTFOLIO_NOISE.test(l)) break;
        if (isValidSkill(l)) lines.push(l);
      }
      if (lines.length) return [...new Set(lines)];
    }
    return [];
  }

  // ── Employment / Education / Languages ───────────────────────────────────────
  function readEmployment(pt) {
    const emp = []; const sec = document.querySelector('.work-history-section,[class*="work-history"],[data-test*="employment"]');
    if (sec) { sec.querySelectorAll('[class*="air3-card-section"],li').forEach(e => { const t = e.innerText.trim(); if (t.length > 15 && !t.startsWith('Work history')) emp.push(t.slice(0, 250)); }); if (emp.length) return emp; }
    const i = pt.search(/\nEmployment history\s*\n/i), en = pt.search(/\n(?:Education|Languages|Certifications|Portfolio)\s*\n/i);
    if (i > -1) pt.slice(i+20, en>i?en:i+1200).split('\n\n').filter(b=>b.trim().length>20).slice(0,6).forEach(b=>emp.push(b.trim().slice(0,250)));
    return emp;
  }
  function readEducation(pt) {
    const ed = [], i = pt.search(/\nEducation\s*\n/i), en = pt.search(/\n(?:Languages|Certifications|Portfolio|Other Experience)\s*\n/i);
    if (i > -1) pt.slice(i+11, en>i?en:i+600).split('\n').map(l=>l.trim()).filter(l=>l.length>3).slice(0,8).forEach(l=>ed.push(l));
    return ed;
  }
  function readLanguages(pt) {
    const lg = [], i = pt.search(/\nLanguages\s*\n/i);
    if (i > -1) pt.slice(i+11, i+400).split('\n').filter(l=>l.includes(':')||/\b(Native|Fluent|Conversational|Basic)\b/i.test(l)).forEach(l=>lg.push(l.trim()));
    return lg;
  }

  // ── Portfolio helpers ────────────────────────────────────────────────────────
  // ── Shelf thumbnails — exclude carousel items inside modal ──────────────────
  function getShelfThumbs() {
    return Array.from(document.querySelectorAll('.portfolio-v2-shelf-thumbnail'))
      .filter(el => !el.classList.contains('carousel-item'));
  }

  // Dismiss open menus/dropdowns with Escape key
  function dismissMenus() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    document.dispatchEvent(new KeyboardEvent('keyup',   { key: 'Escape', bubbles: true, cancelable: true }));
  }

  // Wait until portfolio modal viewer appears in DOM
  async function waitForModalOpen(timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 4000);
    while (Date.now() < deadline) {
      if (document.querySelector('.portfolio-v2-viewer')) return true;
      await new Promise(r => setTimeout(r, 150));
    }
    return false;
  }

  // Wait until portfolio modal is fully closed (checks visibility, not just DOM presence)
  async function waitForModalClose(timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 4000);
    while (Date.now() < deadline) {
      const modal  = document.querySelector('.air3-modal-portfolio-v2-viewer-modal');
      const viewer = document.querySelector('.portfolio-v2-viewer');
      if (!modal || !viewer) return true;
      if (modal.getAttribute('aria-hidden') === 'true') return true;
      try {
        if (getComputedStyle(modal).display === 'none') return true;
        if (getComputedStyle(modal).visibility === 'hidden') return true;
      } catch(e) { return true; }
      await new Promise(r => setTimeout(r, 150));
    }
    return false; // timed out — proceed anyway
  }

  // Navigate to next page — the pagination is a DIV.pagination container
  // Query confirmed: only DIV.pagination exists, no .pagination-nr or .next-page children
  // Strategy: get ALL children of the FIRST .pagination div, find the one with nextNum text
  async function navigateToNextPage(currentPage) {
    const prevThumbs = getShelfThumbs().map(t => t.innerText.trim().slice(0, 50)).join('|');
    const nextNum    = String(currentPage + 1);

    // Scroll portfolio section bottom into view so pagination renders
    const portfolioEl = document.querySelector('.portfolio-v2-editor-shelf, [class*="portfolio-v2-shelf"]');
    if (portfolioEl) portfolioEl.scrollIntoView({ behavior: 'instant', block: 'end' });
    await new Promise(r => setTimeout(r, 400));

    const candidates = [];

    // The FIRST .pagination div is the portfolio one (confirmed: has 3 pages)
    // The second is work history
    const firstPagination = document.querySelector('.pagination');
    if (firstPagination) {
      // Query EVERY descendant element — page buttons are children of .pagination
      firstPagination.querySelectorAll('*').forEach(el => {
        const text = el.innerText?.trim().replace(/\s+/g, ' ') || '';
        // Match if text is exactly the page number, or ends with it
        if (text === nextNum ||
            text === 'go to page ' + nextNum ||
            text.match(new RegExp('\\b' + nextNum + '$'))) {
          if (!candidates.find(c => c.el === el))
            candidates.push({ el, name: 'pagination-child-"' + text.slice(0,20) + '"' });
        }
      });

      // Also add any element with class containing "next" inside pagination
      firstPagination.querySelectorAll('[class*="next"]').forEach(el => {
        if (!el.disabled && !candidates.find(c => c.el === el))
          candidates.push({ el, name: 'next-class-btn' });
      });
    }

    // Fallback: any button/link on page whose ONLY text is the next page number
    if (!candidates.length) {
      document.querySelectorAll('button, a, li').forEach(el => {
        const text = el.innerText?.trim();
        if (text === nextNum && !candidates.find(c => c.el === el))
          candidates.push({ el, name: 'fallback-text-' + nextNum });
      });
    }

    updateOverlayDebug('Navigating to page ' + nextNum + '…');

    for (const { el, name } of candidates) {
      updateOverlayDebug('Navigating to page ' + nextNum + '…');
      fireClick(el);

      for (let w = 0; w < 20; w++) {
        await new Promise(r => setTimeout(r, 200));
        const fresh   = getShelfThumbs();
        const newText = fresh.map(t => t.innerText.trim().slice(0, 50)).join('|');
        if (fresh.length > 0 && newText !== prevThumbs) {
          updateOverlayDebug('Page ' + nextNum + ' loaded');
          return true;
        }
      }
    }

    updateOverlayDebug('All pages read — saving data…');
    return false;
  }

  // Click an element with scroll-into-view + full mouse event sequence
  function fireClick(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
    const rect = el.getBoundingClientRect();
    const cx   = rect.left + rect.width / 2;
    const cy   = rect.top  + rect.height / 2;
    ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(type => {
      el.dispatchEvent(new MouseEvent(type, {
        bubbles: true, cancelable: true, view: window,
        clientX: cx, clientY: cy,
      }));
    });
    // Also try native .click() as fallback
    el.click();
  }

  // Read full data from an open portfolio modal
  function readPortfolioModal() {
    const viewer = document.querySelector('.portfolio-v2-viewer');
    if (!viewer) return null;
    const hdr   = document.querySelector('.air3-modal-header');
    const title = hdr?.innerText?.split('\n').find(l => l.trim().length > 5 && !/^copy link$/i.test(l.trim()))?.trim() || '';
    if (!title) return null;
    const text   = viewer.innerText;
    const roleM  = text.match(/My role\.\s*(.+?)(?:\n|$)/);
    const role   = roleM?.[1]?.trim() || '';
    const dStart = text.indexOf('Project description.');
    const dEnd   = text.search(/Skills and deliverables|Report an issue/);
    const desc   = dStart > -1 ? text.slice(dStart + 20, dEnd > dStart ? dEnd : dStart + 800).replace(/\n+/g,' ').replace(/\s+/g,' ').trim().slice(0, 500) : '';
    // Scroll viewer to ensure "Skills and deliverables" section is loaded
    try { viewer.scrollTop = viewer.scrollHeight; } catch(e) {}
    // Try multiple selectors — Upwork uses different class names across versions
    const skillEls = [
      ...viewer.querySelectorAll('.skill-name'),
      ...viewer.querySelectorAll('.up-skill-badge'),
      ...viewer.querySelectorAll('[data-test="FreelancerCard-skill"]'),
      ...viewer.querySelectorAll('[class*="skillBadge"]'),
      ...viewer.querySelectorAll('[class*="skill-badge"]'),
    ].filter((el, i, arr) => arr.indexOf(el) === i); // deduplicate
    const skills = skillEls.map(el => el.innerText.trim().split('\n')[0]).filter(s => isValidSkill(s));
    const urls   = [];
    viewer.querySelectorAll('.portfolio-v2-viewer-media-block-link').forEach(el => {
      const href = el.getAttribute('href') || el.querySelector('a')?.getAttribute('href');
      if (href && href !== '#' && !/^javascript/i.test(href)) { urls.push(href); return; }
      const txt = el.innerText.trim().split('\n')[0];
      if (txt && /\.[a-z]{2,}/i.test(txt) && txt.length < 80) urls.push(txt);
    });
    return { title, role, desc, skills, urls };
  }

  // Merge portfolio details into existing array (never overwrites user URLs)
  function mergePortfolioDetails(merged, details) {
    details.forEach(d => {
      const ex = merged.find(p => p.title === d.title);
      if (ex) {
        if (!ex.desc   && d.desc)               ex.desc   = d.desc;
        if (!ex.role   && d.role)               ex.role   = d.role;
        if (!ex.skills?.length && d.skills?.length) ex.skills = d.skills;
        if (!ex.urls?.length   && d.urls?.length)   ex.urls   = d.urls;
      } else {
        merged.push({ title: d.title, desc: d.desc||'', role: d.role||'', skills: d.skills||[], urls: d.urls||[], _autoRead: true });
      }
    });
  }

  // ── Bio ───────────────────────────────────────────────────────────────────────
  const UI_REJECT = /\b(Edit|Buy Connects|View details|Hours per week|contract to hire|Open to|Verifications|Military|Boost your profile|Video introduction|Profile strength|Documents|Licenses|My Stats|Proposals sent|Job invites|Profile views)\b/i;
  function truncateBio(t) { const m=300; if(t.length<=m) return t; const c=t.slice(0,m); const l=c.lastIndexOf(' '); return c.slice(0,l>200?l:m)+'\u2026'; }
  function readBio(pt) {
    for (const sel of ['[data-test="AboutMe-section"] [data-test="pre-line-text"]','[data-test="AboutMe-section"] p','[data-test="overview-content"]','[class*="AboutSection"]','[class*="overview-text"]']) {
      try { const el = document.querySelector(sel); if (el) { const t = el.innerText.trim().replace(/\n+/g,' ').replace(/\s+/g,' '); if (t.length>80&&!UI_REJECT.test(t)) return truncateBio(t); } } catch(e) {}
    }
    const os = pt.search(/\nOverview\s*\n/i);
    if (os > -1) {
      const after = pt.slice(os+10, os+2000), se = after.search(/\n(?:Work history|Skills|Portfolio|Employment|Education|Certifications|Languages)\s*\n/i);
      const lines = (se>-1?after.slice(0,se):after).split('\n').map(l=>l.trim()).filter(l=>l.length>25&&!UI_REJECT.test(l)&&/[a-z]{4,}/i.test(l));
      if (lines.length) { const t=lines.join(' ').replace(/\s+/g,' ').trim(); if(t.length>80) return truncateBio(t); }
    }
    for (const b of pt.split('\n\n')) {
      const c = b.trim().replace(/\n+/g,' ').replace(/\s+/g,' ');
      if (c.length>=120&&c.length<=2000&&!UI_REJECT.test(c)&&/[a-z]{5,}.*[a-z]{5,}/i.test(c)&&/[.!?]/.test(c)&&!/^(Languages|Education|Employment|Certifications|Skills)\b/i.test(c)) return truncateBio(c);
    }
    return '';
  }
  function readAvailability(pt) {
    const m = pt.match(/More than 30 hrs\/week|Less than 30 hrs\/week|As needed[\s—-]+open to offers|As needed/i);
    if (!m) return '';
    const v = m[0].toLowerCase();
    if (v.includes('more than 30')) return 'Available 30+ hrs/week';
    if (v.includes('less than 30'))  return 'Available <30 hrs/week';
    if (v.includes('as needed'))     return 'Available as needed';
    return '';
  }

  // ── Main profile data reader (no portfolios — those are synced separately) ───
  function readProfileData() {
    const pt = document.body.innerText;
    const jssM = pt.match(/(\d+)%\s*Job Success/i);
    const rateM = pt.match(/\$(\d+(?:\.\d+)?)\s*\/\s*hr/i);
    const tierM = pt.match(/Expert[\s-]Vetted|Top Rated Plus|Top Rated|Rising Talent/i);
    const earningsM = pt.match(/\$([\d,]+[KkMm+]*)\s*[\r\n]+Total earnings/i)||pt.match(/Total earnings[\r\n]+\$([\d,]+[KkMm+]*)/i);
    const jobsM = pt.match(/(\d+)\s*[\r\n]+Total jobs/i)||pt.match(/Total jobs[\r\n]+(\d+)/i);
    const hoursM = pt.match(/([\d,]+)\s*[\r\n]+Total hours/i)||pt.match(/Total hours[\r\n]+(\d+)/i);
    const tierMap = {'Expert-Vetted':'expert','Expert Vetted':'expert','Top Rated Plus':'top_rated_plus','Top Rated':'top_rated','Rising Talent':'rising'};
    const locM = pt.match(/([\w][\w\s,]+?)\s*[–—-]\s*\d+:\d+\s*(?:am|pm)\s*local time/i);
    const skills = readSkills();
    return {
      name: readName(), title: readTitle(pt,rateM), bio: readBio(pt),
      country: locM ? locM[1].trim().split('\n').pop().trim() : '',
      jss: jssM?jssM[1]+'%':'', hourlyRate: rateM?rateM[1]:'', rate: rateM?'$'+rateM[1]+'/hr':'',
      tier: tierM?tierM[0]:'', tierKey: tierMap[tierM?.[0]]||'new',
      earnings: earningsM?'$'+earningsM[1]:'', jobs: jobsM?jobsM[1]:'', hours: hoursM?hoursM[1]:'',
      skills: skills.join(', '), skillsArr: skills,
      employment: readEmployment(pt), education: readEducation(pt), languages: readLanguages(pt),
      _readAt: Date.now(), _autoRead: true,
    };
  }

  // ── Compact toast ─────────────────────────────────────────────────────────────
  const TID = 'snagai-toast';
  const TCSS = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;width:220px;background:#0d1525;border:1px solid rgba(201,168,76,.2);border-radius:10px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.55);font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:12px;color:#f0eeea;transition:opacity .3s';
  const TANIM = '<style>@keyframes snag-spin{to{transform:rotate(360deg)}}@keyframes snag-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}#snagai-toast{animation:snag-in .2s ease}</style>';
  function getT() { let el=document.getElementById(TID); if(!el){el=document.createElement('div');el.id=TID;el.setAttribute('style',TCSS);document.body.appendChild(el);} return el; }
  function hideT(ms) { setTimeout(()=>{const el=document.getElementById(TID);if(!el)return;el.style.opacity='0';setTimeout(()=>el?.remove(),320);},ms||0); }
  function showSyncingToast() { getT().innerHTML=TANIM+'<div style="height:2px;background:linear-gradient(90deg,#c9a84c,transparent)"></div><div style="padding:11px 13px;display:flex;align-items:center;gap:9px"><div style="width:18px;height:18px;flex-shrink:0;border-radius:50%;border:2px solid rgba(201,168,76,.15);border-top-color:#c9a84c;animation:snag-spin .8s linear infinite"></div><span style="font-weight:600;font-size:12px;color:#f0eeea">Syncing profile…</span></div>'; }
  function showDoneToast() { getT().innerHTML=TANIM+'<div style="height:2px;background:linear-gradient(90deg,#34d399,transparent)"></div><div style="padding:11px 13px;display:flex;align-items:center;gap:8px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span style="font-weight:600;font-size:12px;color:#f0eeea">Profile synced ✓</span></div>'; hideT(2500); }

  // ── CAPTCHA detection ─────────────────────────────────────────────────────────
  function hasCaptcha() {
    return !!(document.querySelector('.g-recaptcha,#captcha,[data-test*="captcha"],iframe[src*="captcha"],iframe[src*="recaptcha"]')||/prove you.re human|complete the captcha|unusual traffic/i.test(document.body.innerText.slice(0,2000)));
  }

  // ── Dark blur overlay (pointer-events:none — clicks pass through to Upwork) ──
  const OID = 'snagai-portfolio-overlay';

  function showSyncOverlay(msg) {
    let wrap = document.getElementById(OID);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = OID;
      wrap.style.cssText = [
        'position:fixed','top:0','left:0','right:0','bottom:0',
        'z-index:2147483646',
        'pointer-events:none',
        'background:rgba(0,0,0,.82)',
        'backdrop-filter:blur(8px)',
        '-webkit-backdrop-filter:blur(8px)',
        'display:flex','align-items:center','justify-content:center',
        'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
      ].join(';');
      wrap.innerHTML =
        '<style>@keyframes snagSpin{to{transform:rotate(360deg)}}</style>' +
        '<div id="snagai-ov-card" style="background:#0d1525;border:1px solid rgba(201,168,76,.3);border-radius:18px;padding:30px 38px;text-align:center;min-width:320px;max-width:400px;box-shadow:0 24px 64px rgba(0,0,0,.8)">' +
          '<div style="width:48px;height:48px;border-radius:50%;border:3px solid rgba(201,168,76,.1);border-top-color:#c9a84c;animation:snagSpin .85s linear infinite;margin:0 auto 20px"></div>' +
          '<div style="font-weight:700;font-size:16px;color:#f0eeea;margin-bottom:10px;letter-spacing:-.01em">Syncing Portfolios</div>' +
          '<div id="snagai-ov-status" style="font-size:12px;color:rgba(240,238,234,.55);margin-bottom:12px;min-height:20px;letter-spacing:.01em"></div>' +
          '<div id="snagai-ov-detail" style="font-size:11px;color:rgba(240,238,234,.3);font-family:monospace;min-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px"></div>' +
        '</div>';
      document.body.appendChild(wrap);
    }
    const s = document.getElementById('snagai-ov-status');
    if (s && msg) s.textContent = msg;
  }

  function updateOverlayDebug(line) {
    const d = document.getElementById('snagai-ov-detail');
    if (d) d.textContent = line;
    console.log('[SnagAI]', line);
  }

  function removeSyncOverlay() {
    document.getElementById(OID)?.remove();
  }
  // ── Portfolio sync: click each shelf thumbnail, all pages ────────────────────
  async function runPortfolioSync(profileId, localKey) {
    showSyncOverlay('Preparing…');
    updateOverlayDebug('Loading portfolio section…');

    // Scroll to portfolio section first — Upwork lazy-renders thumbnails
    // When opened in a new tab, page starts at top and portfolio is off-screen
    updateOverlayDebug('Locating portfolio section…');
    const scrollToPortfolio = () => {
      const sel = [
        '.portfolio-v2-editor-shelf',
        '[class*="portfolio-v2-shelf"]',
        '[class*="Portfolio"]',
      ];
      for (const s of sel) {
        const el = document.querySelector(s);
        if (el) { el.scrollIntoView({ behavior: 'instant', block: 'center' }); return true; }
      }
      // Fallback: scroll halfway down the page to trigger lazy load
      window.scrollTo(0, document.body.scrollHeight / 2);
      return false;
    };

    // Try scrolling a few times until thumbnails appear in DOM
    let waitCount = 0;
    while (waitCount++ < 25) {
      scrollToPortfolio();
      await new Promise(r => setTimeout(r, 400));
      if (getShelfThumbs().length > 0) break;
    }

    if (!getShelfThumbs().length) {
      updateOverlayDebug('Portfolio section not found — make sure your profile URL is correct');
      removeSyncOverlay();
      return;
    }
    showSyncOverlay('Page 1'); updateOverlayDebug('Portfolio section found — starting sync…');

    // Load existing portfolios with timeout fallback
    let current = {};
    try {
      const result = await Promise.race([
        local.get([localKey]),
        new Promise(r => setTimeout(() => r({}), 3000))
      ]);
      current = result[localKey] || {};
    } catch(e) { console.error('[SnagAI] Storage load error:', e); }

    const merged = [...(current.portfolios || [])];
    let page = 1, totalItems = 0;

    try {
    while (true) {
      if (hasCaptcha()) {
        // Don't stop — show overlay, wait for user to solve, then resume
        showSyncOverlay('Captcha detected');
        updateOverlayDebug('Solve the captcha to continue sync…');
        await new Promise(resolve => {
          const poll = setInterval(() => {
            if (!hasCaptcha()) { clearInterval(poll); resolve(); }
          }, 2000);
        });
        updateOverlayDebug('Captcha solved — resuming in 2s…');
        await new Promise(r => setTimeout(r, 2000));
        continue; // resume from current page
      }

      // Portfolio shelf thumbnails — only filter carousel-item class
      let clickTargets = getShelfThumbs();

      if (!clickTargets.length) {
        updateOverlayDebug('No portfolio buttons found on page ' + page);
        break;
      }

      showSyncOverlay('Page ' + page + ' of ?'); updateOverlayDebug('Found ' + clickTargets.length + ' portfolios on page ' + page);

      // Track which items we have read on this page by button index
      // Re-query each iteration so we always click a fresh reference
      const totalOnPage = clickTargets.length;
      const readIndices = new Set();
      let pageAttempts = 0;

      while (pageAttempts < totalOnPage + 3) {
        pageAttempts++;

        // Re-query buttons and find first unread by index
        const fresh = getShelfThumbs();
        let targetIdx = -1;
        for (let i = 0; i < fresh.length; i++) {
          if (!readIndices.has(i)) { targetIdx = i; break; }
        }

        if (targetIdx === -1) {
          showSyncOverlay('Page ' + page + ' complete'); updateOverlayDebug('Page ' + page + ' done · ' + totalItems + ' portfolios read so far');
          break;
        }

        readIndices.add(targetIdx);
        const btn = fresh[targetIdx];
        showSyncOverlay('Page ' + page + ' · ' + (targetIdx + 1) + ' of ' + fresh.length); updateOverlayDebug('Reading portfolio ' + (targetIdx + 1) + ' of ' + fresh.length + '…');

        // Click
        // Scroll into view so the element is visible
        btn.scrollIntoView({ behavior: 'instant', block: 'center' });
        await new Promise(r => setTimeout(r, 200));

        // Temporarily restore pointer events so React handles the click normally
        btn.click();

        const opened = await waitForModalOpen(4000);
        if (!opened) {
          updateOverlayDebug('Portfolio ' + (targetIdx + 1) + ' didn\'t open — retrying…');
          dismissMenus();
          await new Promise(r => setTimeout(r, 600));
          continue;
        }

        // Wait for modal content to fully render — skills load async
        await new Promise(r => setTimeout(r, 800));

        // Scroll inside viewer to trigger lazy-load of skills section
        const viewerEl = document.querySelector('.portfolio-v2-viewer');
        if (viewerEl) {
          viewerEl.scrollTop = viewerEl.scrollHeight;
          await new Promise(r => setTimeout(r, 400));
        }

        const d = readPortfolioModal();
        if (d?.title) {
          mergePortfolioDetails(merged, [d]);
          totalItems++;
          showSyncOverlay('Page ' + page + ' · ' + (targetIdx + 1) + ' of ' + fresh.length); updateOverlayDebug('✓  ' + d.title.slice(0, 45) + (d.skills.length ? '  ·  ' + d.skills.length + ' skills' : ''));
        } else {
          updateOverlayDebug('⚠ Could not read portfolio ' + (targetIdx + 1));
        }

        const closeBtn = document.querySelector('.air3-modal-close.floating-modal-close')
                      || document.querySelector('.floating-modal-close')
                      || document.querySelector('.air3-modal-close');
        closeBtn?.click();

        await waitForModalClose(4000);
        await new Promise(r => setTimeout(r, 800)); // fixed buffer — ensures modal fully gone
      }

      // Dismiss any open menus before navigating
      dismissMenus();
      await new Promise(r => setTimeout(r, 500));

      if (page >= 15) break;

      showSyncOverlay('Moving to page ' + (page + 1) + '…'); updateOverlayDebug('Moving to page ' + (page + 1) + '…');

      // Try every navigation candidate and verify by thumbnail content change
      const navigated = await navigateToNextPage(page);
      if (!navigated) break;

      page++;
    }

    } catch(syncErr) {
      updateOverlayDebug('Error: ' + syncErr.message);
      console.error('[SnagAI] Sync error:', syncErr);
    }

    // Save whatever we collected
    showSyncOverlay('Saving…'); updateOverlayDebug('Saving ' + totalItems + ' portfolio' + (totalItems!==1?'s':'') + ' to your profile…');
    await local.set({
      [localKey]: { ...current, portfolios: merged, _portfolioSyncedAt: totalItems > 0 ? Date.now() : current._portfolioSyncedAt }
    }).catch(e => console.error('[SnagAI] Portfolio save error:', e));

    chrome.storage.local.remove('portfolioSync_' + profileId);
    removeSyncOverlay();
    if (totalItems > 0) showDoneToast();
    else getT().innerHTML = TANIM + '<div style="padding:11px 13px;font-size:12px;color:rgba(240,238,234,.6)">⚠ No portfolios found — visit your profile page and try again</div>';
  }

  // ── Storage helpers ───────────────────────────────────────────────────────────
  const local = {
    get: keys => new Promise(r => chrome.storage.local.get(keys, r)),
    set: data => new Promise((res, rej) => chrome.storage.local.set(data, () =>
      chrome.runtime.lastError ? rej(new Error(chrome.runtime.lastError.message)) : res()
    )),
  };

  // ── Init ──────────────────────────────────────────────────────────────────────
  async function init(attempt) {
    attempt = attempt || 1;
    const { registeredProfiles: registered = [] } = await local.get(['registeredProfiles']);
    if (!registered.length) return;

    const currentUrl = location.href.split('?')[0];
    const curSlug    = currentUrl.split('/freelancers/')[1]?.split('/')[0]?.split('?')[0] || '';
    if (!curSlug) return;

    // Find matching registered profile
    let target = registered.find(p => {
      if (!p?.url) return false;
      const s = p.url.split('/freelancers/')[1]?.split('/')[0]?.split('?')[0] || '';
      return s && s === curSlug;
    });
    // Fallback: custom username → ~xxx redirect on own profile
    if (!target && curSlug.startsWith('~')) {
      const isOwn = !!(document.querySelector('[data-test="pib-edit-button"],[class*="edit-profile"],[aria-label*="Edit profile"],a[href*="/profile/edit"]'));
      if (isOwn) target = registered.find(p => { if (!p?.url) return false; const s = p.url.split('/freelancers/')[1]?.split('/')[0]?.split('?')[0]||''; return s && !s.startsWith('~'); });
    }
    if (!target) return;

    const profileId   = target.id || ('profile_' + Date.now());
    const localKey    = 'profileFull_' + profileId;
    const originUrl   = target.url;

    // ── Check if portfolio sync was explicitly requested ───────────────────────
    const syncFlagKey = 'portfolioSync_' + profileId;
    const flags       = await local.get([syncFlagKey]);
    if (flags[syncFlagKey]) {
      // This tab was opened specifically for portfolio sync — run it and return
      await runPortfolioSync(profileId, localKey);
      return;
    }

    // ── Passive profile data read (no portfolio reading) ─────────────────────
    const existing     = await local.get([localKey]);
    const existingFull = existing[localKey] || {};

    const data       = readProfileData();
    const hasAnyData = !!(data.name || data.jss || data.rate || data.tier || data.skillsArr.length);

    if (!hasAnyData) {
      if (hasCaptcha()) { getT().innerHTML=TANIM+'<div style="padding:11px 13px">🔒 Captcha — solve it first</div>'; hideT(5000); return; }
      if (attempt <= 3) { hideT(0); await new Promise(r => setTimeout(r, 2000 * attempt)); return init(attempt + 1); }
      // After retries: save minimal marker
      await local.set({ registeredProfiles: registered.map(p => p.url===originUrl ? {...p,_readAt:Date.now(),_syncAttempted:true,url:currentUrl} : p) }).catch(()=>{});
      return;
    }

    const availability = readAvailability(document.body.innerText);
    const autoExtra    = target.extra || existingFull.extra || [availability, data.country].filter(Boolean).join(' · ');

    const profileMeta = {
      id: profileId, url: currentUrl, syncEnabled: true,
      _readAt: data._readAt, _lastVisited: Date.now(),
      name: data.name, jss: data.jss, tier: data.tier, tierKey: data.tierKey||'new',
      rate: data.rate, earnings: data.earnings, jobs: data.jobs, country: data.country,
    };
    const profileFull = {
      ...profileMeta,
      hourlyRate: data.hourlyRate, hours: data.hours,
      title: data.title, bio: data.bio, extra: autoExtra,
      skills: data.skills, skillsArr: data.skillsArr,
      employment: data.employment, education: data.education, languages: data.languages,
      // Preserve existing portfolios — they are synced separately
      portfolios: existingFull.portfolios || [],
      _portfolioSyncedAt: existingFull._portfolioSyncedAt,
      _autoRead: true,
    };

    try {
      await local.set({
        registeredProfiles: registered.map(p => (p.url===originUrl||p.url===currentUrl) ? profileMeta : p),
        activeProfileId: profileId,
        [localKey]: profileFull,
      });
    } catch(err) { console.error('[SnagAI] Save error:', err.message); }
    // Silent — no toast for passive profile read
  }

  if (document.readyState === 'complete') setTimeout(() => init(1), 1500);
  else window.addEventListener('load', () => setTimeout(() => init(1), 1500));
})();
