// ── Snag AI Profile Reader v3 ─────────────────────────────────────────────────
// Runs ONLY on upwork.com/freelancers/* pages
// Only reads data when the page URL matches a REGISTERED profile URL
// Never auto-adds profiles — user must explicitly register URLs first

(function () {
  if (!location.href.includes('/freelancers/')) return;

  // ── Name extraction ───────────────────────────────────────────────────────────
  function readName() {
    // Method 1: page <title> is "Name | Upwork" — most reliable across DOM changes
    const titleMatch = document.title.match(/^(.+?)\s*\|\s*Upwork/i);
    if (titleMatch && titleMatch[1].trim().length > 1 && titleMatch[1].trim().length < 80) {
      return titleMatch[1].trim();
    }
    // Method 2: known data-test selectors
    for (const sel of ['[data-test="pib-name"]', '[data-test="freelancer-name"]', 'h2[class*="name"]', 'h1[class*="name"]']) {
      try {
        const el = document.querySelector(sel);
        if (el) { const t = el.innerText.trim().split('\n')[0]; if (t.length > 1 && t.length < 80) return t; }
      } catch(e) {}
    }
    // Method 3: first H2 on page
    const h2 = document.querySelector('h2');
    if (h2) { const t = h2.innerText.trim().split('\n')[0]; if (t.length > 1 && t.length < 80 && /[A-Za-z]/.test(t)) return t; }
    return '';
  }

  // ── Title (professional title) extraction ─────────────────────────────────────
  function readTitle(pt, rateM) {
    for (const sel of ['[data-test="pib-title"]', '[data-test="freelancer-title"]', '[class*="developer-tagline"]', '[class*="profile-title"]']) {
      try {
        const el = document.querySelector(sel);
        if (el) { const t = el.innerText.trim().split('\n')[0]; if (t.length > 10) return t; }
      } catch(e) {}
    }
    if (rateM) {
      const rateIdx = pt.indexOf('$' + rateM[1]);
      if (rateIdx > -1) {
        const lines = pt.slice(Math.max(0, rateIdx - 600), rateIdx).split('\n').map(l => l.trim()).filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          const l = lines[i];
          if (l.length > 15 && l.length < 150 && !/^\$|%|Job Success|Total|Rising|Top Rated|Expert/i.test(l)) return l;
        }
      }
    }
    return '';
  }


  // Upwork "Top Traits" / Attributes — never technical skills
  const UPWORK_TRAITS = /^(Committed to|Clear Communicator|Accountable for|Detail Oriented|Solution Oriented|Collaborative$|Reliable$|Deadline|Self-Motivated|Highly Organized|Effective Communicator|Client Focused|Results Driven|Independent|Interpersonal)/i;

  // Portfolio catalog noise — prices, pagination, nav buttons, delivery times
  const PORTFOLIO_NOISE = /^(From \$|\$\d|Your project|Manage project|View project|Add project|Pagination|Current page|go to page|\d+ days delivery|\d+ hrs|of \d+$)/i;

  // General invalid-skill guard — applies to ALL extraction methods
  function isValidSkill(s) {
    if (!s || s.length < 2 || s.length > 60) return false;
    if (UPWORK_TRAITS.test(s))   return false;
    if (PORTFOLIO_NOISE.test(s)) return false;
    if (/^\d+$/.test(s))        return false; // pure numbers
    if (/\$\d/.test(s))         return false; // prices anywhere in string
    if (/\bdelivery\b|\bdays\b.*\bdelivery\b/i.test(s)) return false;
    if (/\bpaginat|\bcurrent page|\bgo to page/i.test(s)) return false;
    if (s.split(' ').length > 6) return false; // more than 6 words = not a skill
    return true;
  }

  // ── Skills extraction — comprehensive with multiple fallbacks ─────────────────
  function readSkills() {
    // Try to scope to the skills section container to avoid picking up portfolio noise
    const sectionRoots = [
      document.querySelector('[data-test="skills-section"]'),
      document.querySelector('[class*="skills-section"]'),
      document.querySelector('[aria-label*="kills"]'),
      document.querySelector('section[class*="kill"]'),
      document,  // fallback: whole page
    ].filter(Boolean);

    const selectors = [
      '.up-skill-badge',
      '[data-test="FreelancerCard-skill"]',
      '[data-test="skill-badge"]',
      '[data-test="skill-display-name"]',
      '.skill-name',
      '[class*="skill-badge"]',
      '[class*="skillBadge"]',
      '[class*="skill_badge"]',
    ];

    for (const root of sectionRoots) {
      for (const sel of selectors) {
        try {
          const els = root.querySelectorAll(sel);
          if (els.length > 0) {
            const extracted = [...new Set([...els]
              .map(e => e.innerText.trim().split('\n')[0].trim())
              .filter(s => isValidSkill(s))
            )];
            // Only trust DOM result if it has 2+ items OR we scoped to skills section
            if (extracted.length >= 2 || root !== document) return extracted;
          }
        } catch(e) {}
      }
      if (root === sectionRoots[0] && sectionRoots.length > 1) continue; // try next root
      break; // if we reached document fallback, stop root loop
    }

    // Text-based fallback: extract between "Skills" and next section heading
    const pt = document.body.innerText;
    const skillsStart = pt.search(/\n(?:Skills|Top Skills)\s*\n/i);
    if (skillsStart > -1) {
      const afterSkills = pt.slice(skillsStart + 8, skillsStart + 1200);
      const sectionEnd = afterSkills.search(/\n(?:Portfolio|Work history|Employment history|Education|Testimonials|Certifications|Languages|Other Experience)\s*\n/i);
      const chunk = sectionEnd > -1 ? afterSkills.slice(0, sectionEnd) : afterSkills.slice(0, 500);
      const lines = chunk.split('\n')
        .map(l => l.trim())
        .filter(l => l.length >= 2 && l.length <= 60 && !/^\d+$/.test(l) && !/^(Skills|See more|Less|Show more)$/i.test(l));
      if (lines.length > 0) return [...new Set(lines)];
    }
    return [];
  }

  // ── Employment extraction ─────────────────────────────────────────────────────
  function readEmployment(pt) {
    const employment = [];
    const empSection = document.querySelector('.work-history-section, [class*="work-history"], [data-test*="employment"]');
    if (empSection) {
      empSection.querySelectorAll('[class*="air3-card-section"], li, [class*="cfe-work-history"]').forEach(entry => {
        const t = entry.innerText.trim();
        if (t.length > 15 && !t.startsWith('Work history')) employment.push(t.slice(0, 250));
      });
      if (employment.length) return employment;
    }
    const empIdx = pt.search(/\nEmployment history\s*\n/i);
    const empEnd = pt.search(/\n(?:Education|Languages|Certifications|Portfolio)\s*\n/i);
    if (empIdx > -1) {
      pt.slice(empIdx + 20, empEnd > empIdx ? empEnd : empIdx + 1200)
        .split('\n\n').filter(b => b.trim().length > 20).slice(0, 6)
        .forEach(b => employment.push(b.trim().slice(0, 250)));
    }
    return employment;
  }

  // ── Education extraction ──────────────────────────────────────────────────────
  function readEducation(pt) {
    const education = [];
    const eduIdx = pt.search(/\nEducation\s*\n/i);
    const eduEnd  = pt.search(/\n(?:Languages|Certifications|Portfolio|Other Experience)\s*\n/i);
    if (eduIdx > -1) {
      pt.slice(eduIdx + 11, eduEnd > eduIdx ? eduEnd : eduIdx + 600)
        .split('\n').map(l => l.trim()).filter(l => l.length > 3).slice(0, 8)
        .forEach(l => education.push(l));
    }
    return education;
  }

  // ── Languages extraction ──────────────────────────────────────────────────────
  function readLanguages(pt) {
    const languages = [];
    const langIdx = pt.search(/\nLanguages\s*\n/i);
    if (langIdx > -1) {
      pt.slice(langIdx + 11, langIdx + 400)
        .split('\n').filter(l => l.includes(':') || /\b(Native|Fluent|Conversational|Basic)\b/i.test(l))
        .forEach(l => languages.push(l.trim()));
    }
    return languages;
  }

  // ── Certifications extraction ─────────────────────────────────────────────────
  function readCertifications(pt) {
    const certifications = [];
    const certIdx = pt.search(/\nCertifications\s*\n/i);
    if (certIdx > -1) {
      const matches = pt.slice(certIdx, certIdx + 1000)
        .matchAll(/([\w][^\n]{5,})\nProvider:\s*([^\n]+)\nIssued:\s*([^\n]+)/g);
      for (const m of matches) {
        certifications.push({ name: m[1].trim(), provider: m[2].trim(), issued: m[3].trim() });
      }
    }
    return certifications;
  }

  // ── Portfolio items from DOM (title + description) ───────────────────────────
  function extractPortfolioItems() {
    const items = [];
    const selectors = [
      '.portfolio-v2-shelf-thumbnail',
      '[class*="portfolio-item"]',
      '[class*="portfolioItem"]',
      '[data-test*="portfolio-item"]',
      '[class*="air3-card"][class*="ortfolio"]',
    ];
    for (const sel of selectors) {
      try {
        document.querySelectorAll(sel).forEach(el => {
          const lines = el.innerText.split('\n')
            .map(l => l.trim())
            .filter(l => l && l !== 'More options' && l.length > 2 && !PORTFOLIO_NOISE.test(l));
          if (!lines[0]) return;
          const title = lines[0].slice(0, 120);
          // Second non-empty line is often category or short desc
          const descLine = lines[1] && lines[1].length < 150 && !lines[1].match(/^\$|\d+ hrs|delivery/i) ? lines[1] : '';
          items.push({ title, desc: descLine });
        });
        if (items.length > 0) break;
      } catch(e) {}
    }
    // Deduplicate by title
    const seen = new Set();
    return items.filter(item => { if (seen.has(item.title)) return false; seen.add(item.title); return true; });
  }

  function findPortfolioNextButton() {
    const selectors = [
      '[aria-label="Next page"]', '[aria-label="Next"]',
      'button[data-test*="next"]', '[class*="pagination"] button:last-child',
      '[class*="next-page"]', '[class*="pagination-next"]',
      'button[class*="next"][class*="arrow"]',
    ];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && !el.disabled && el.offsetParent !== null) return el;
      } catch(e) {}
    }
    return null;
  }


  // ── Bio (overview) extraction ─────────────────────────────────────────────────
  function truncateBio(text) {
    const max = 300;
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const last = cut.lastIndexOf(' ');
    return cut.slice(0, last > 200 ? last : max) + '\u2026';
  }

  // UI/nav/sidebar text — never appears in a real bio
  const UI_REJECT = /\b(Edit|Buy Connects|View details|Hours per week|contract to hire|Open to|Verifications|Military|Boost your profile|Video introduction|Profile strength|Documents|Licenses|Certifications\s*\n|My Stats|Proposals sent|Job invites|Profile views)\b/i;

  function readBio(pt) {
    // Method 1: Upwork overview section DOM — most accurate
    const bioSelectors = [
      '[data-test="AboutMe-section"] [data-test="pre-line-text"]',
      '[data-test="AboutMe-section"] p',
      '[data-test="overview-content"]',
      '[data-test="freelancerOverview"]',
      '[class*="AboutSection"]',
      '[class*="overview-text"]',
      '[class*="freelancer-overview"] p',
    ];
    for (const sel of bioSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const text = el.innerText.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
          if (text.length > 80 && !UI_REJECT.test(text)) return truncateBio(text);
        }
      } catch(e) {}
    }

    // Method 2: find "Overview" section in page text and extract clean lines only
    const overviewStart = pt.search(/\nOverview\s*\n/i);
    if (overviewStart > -1) {
      const after = pt.slice(overviewStart + 10, overviewStart + 2000);
      const sectionEnd = after.search(/\n(?:Work history|Skills|Portfolio|Employment|Education|Certifications|Languages|Other Experience)\s*\n/i);
      const raw = (sectionEnd > -1 ? after.slice(0, sectionEnd) : after);
      const bioLines = raw.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 25 && !UI_REJECT.test(l) && /[a-z]{4,}/i.test(l));
      if (bioLines.length > 0) {
        const text = bioLines.join(' ').replace(/\s+/g, ' ').trim();
        if (text.length > 80) return truncateBio(text);
      }
    }

    // Method 3: largest clean paragraph that looks like a professional summary
    // Must pass ALL checks: no UI patterns, has sentence endings, multiple words
    for (const block of pt.split('\n\n')) {
      const clean = block.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
      if (
        clean.length >= 120 && clean.length <= 2000 &&
        !UI_REJECT.test(clean) &&
        /[a-z]{5,}.*[a-z]{5,}/i.test(clean) &&
        /[.!?]/.test(clean) &&
        !/^(Languages|Education|Employment|Certifications|Skills)\b/i.test(clean)
      ) {
        return truncateBio(clean);
      }
    }
    return '';
  }

  // Extract hours/week availability from profile text
  function readAvailability(pt) {
    const m = pt.match(/More than 30 hrs\/week|Less than 30 hrs\/week|As needed[\s—-]+open to offers|As needed/i);
    if (!m) return '';
    const v = m[0].toLowerCase();
    if (v.includes('more than 30') || v.includes('30+')) return 'Available 30+ hrs/week';
    if (v.includes('less than 30'))  return 'Available <30 hrs/week';
    if (v.includes('as needed'))     return 'Available as needed';
    return '';
  }

  // ── Main profile data reader ──────────────────────────────────────────────────
  function readProfileData() {
    const pt = document.body.innerText;

    const jssM      = pt.match(/(\d+)%\s*Job Success/i);
    const rateM     = pt.match(/\$(\d+(?:\.\d+)?)\s*\/\s*hr/i);
    const tierM     = pt.match(/Expert[\s-]Vetted|Top Rated Plus|Top Rated|Rising Talent/i);
    const earningsM = pt.match(/\$([\d,]+[KkMm+]*)\s*[\r\n]+Total earnings/i) || pt.match(/Total earnings[\r\n]+\$([\d,]+[KkMm+]*)/i);
    const jobsM     = pt.match(/(\d+)\s*[\r\n]+Total jobs/i) || pt.match(/Total jobs[\r\n]+(\d+)/i);
    const hoursM    = pt.match(/([\d,]+)\s*[\r\n]+Total hours/i) || pt.match(/Total hours[\r\n]+(\d+)/i);

    const tierMap = {
      'Expert-Vetted': 'expert', 'Expert Vetted': 'expert',
      'Top Rated Plus': 'top_rated_plus',
      'Top Rated': 'top_rated',
      'Rising Talent': 'rising',
    };

    const name      = readName();
    const skills    = readSkills(); // always returns an array
    const title     = readTitle(pt, rateM);
    const employment     = readEmployment(pt);
    const education      = readEducation(pt);
    const languages      = readLanguages(pt);
    const certifications = readCertifications(pt);

    // Bio — read from actual Upwork "Overview" / "About Me" section
    const bio = readBio(pt);

    // Country from timezone line
    const locM = pt.match(/([\w][\w\s,]+?)\s*[–—-]\s*\d+:\d+\s*(?:am|pm)\s*local time/i);
    const country = locM ? locM[1].trim().split('\n').pop().trim() : '';

    return {
      name, title, country, bio,
      jss:        jssM      ? jssM[1] + '%'         : '',
      hourlyRate: rateM     ? rateM[1]               : '',
      rate:       rateM     ? '$' + rateM[1] + '/hr' : '',
      tier:       tierM     ? tierM[0]               : '',
      tierKey:    tierMap[tierM?.[0]] || 'new',
      earnings:   earningsM ? '$' + earningsM[1]     : '',
      jobs:       jobsM     ? jobsM[1]               : '',
      hours:      hoursM    ? hoursM[1]              : '',
      // CRITICAL FIX: save BOTH formats
      skills:    skills.join(', '),  // string — for backwards compat
      skillsArr: skills,             // array  — for options UI + skill matching
      employment, education, languages, certifications,
      _readAt:    Date.now(),
      _autoRead:  true,
      _profileUrl: location.href.split('?')[0],
    };
  }

  // ── Toast system ─────────────────────────────────────────────────────────────
  const T_ID  = 'snagai-toast';
  const T_CSS = [
    'position:fixed','bottom:28px','right:28px','z-index:2147483647',
    'width:288px','background:#0d1525',
    'border:1px solid rgba(201,168,76,.22)',
    'border-radius:16px','overflow:hidden',
    'box-shadow:0 24px 64px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.04)',
    'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif',
    'font-size:13px','color:#f0eeea','transition:opacity .35s',
  ].join(';');

  const T_ANIMS = `<style>
    @keyframes snag-spin{to{transform:rotate(360deg)}}
    @keyframes snag-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    #${T_ID}{animation:snag-up .3s cubic-bezier(.34,1.56,.64,1)}
    #snagai-next-btn:hover{filter:brightness(1.1)}
  </style>`;

  function getToast() {
    let el = document.getElementById(T_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = T_ID;
      el.setAttribute('style', T_CSS);
      document.body.appendChild(el);
    }
    return el;
  }

  function dismissToast(delay) {
    setTimeout(() => {
      const el = document.getElementById(T_ID);
      if (!el) return;
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 380);
    }, delay || 0);
  }

  // Phase 1 — Syncing in progress (spinning ring)
  function showSyncingToast() {
    getToast().innerHTML = T_ANIMS + `
      <div style="height:2px;background:linear-gradient(90deg,#c9a84c,#e8c878,transparent)"></div>
      <div style="padding:18px 20px;display:flex;align-items:center;gap:14px">
        <div style="width:36px;height:36px;flex-shrink:0;border-radius:50%;
          border:2.5px solid rgba(201,168,76,.12);border-top-color:#c9a84c;
          animation:snag-spin .85s linear infinite"></div>
        <div>
          <div style="font-weight:700;letter-spacing:-.01em;color:#f0eeea">Syncing profile</div>
          <div style="font-size:11px;color:rgba(240,238,234,.42);margin-top:3px;letter-spacing:.01em">
            Reading your Upwork data…
          </div>
        </div>
      </div>`;
  }

  // Phase 2 — Portfolio page N done, more pages exist
  function showPageDoneToast(page, itemCount, hasNext, onNextClick) {
    const label = itemCount === 1 ? '1 project' : itemCount + ' projects';
    getToast().innerHTML = T_ANIMS + `
      <div style="height:2px;background:linear-gradient(90deg,#34d399,transparent)"></div>
      <div style="padding:16px 20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:${hasNext ? 14 : 0}px">
          <div style="width:32px;height:32px;flex-shrink:0;border-radius:50%;
            background:rgba(52,211,153,.12);display:flex;align-items:center;justify-content:center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div style="font-weight:700;letter-spacing:-.01em">Page ${page} synced — ${label}</div>
            <div style="font-size:11px;color:rgba(240,238,234,.42);margin-top:2px">
              ${hasNext ? 'Navigate to portfolio page ' + (page+1) + ' to sync more' : 'All portfolio pages covered'}
            </div>
          </div>
        </div>
        ${hasNext ? `
        <button id="snagai-next-btn" style="
          display:block;width:100%;padding:10px 16px;
          background:linear-gradient(135deg,#c9a84c 0%,#e8c878 100%);
          color:#0a0e1a;border:none;border-radius:10px;
          font-size:12px;font-weight:700;cursor:pointer;
          font-family:inherit;letter-spacing:.01em;
          box-shadow:0 4px 14px rgba(201,168,76,.25);
          transition:filter .15s">
          Go to page ${page+1} →
        </button>` : ''}
      </div>`;
    if (hasNext) {
      document.getElementById('snagai-next-btn')?.addEventListener('click', () => {
        showSyncingToast(); // show syncing while next page loads
        onNextClick?.();
      });
    }
  }

  // Phase 3 — All done
  function showDoneToast() {
    getToast().innerHTML = T_ANIMS + `
      <div style="height:2px;background:linear-gradient(90deg,#34d399,transparent)"></div>
      <div style="padding:18px 20px;display:flex;align-items:center;gap:14px">
        <div style="width:36px;height:36px;flex-shrink:0;border-radius:50%;
          background:rgba(52,211,153,.12);display:flex;align-items:center;justify-content:center">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <div style="font-weight:700;letter-spacing:-.01em;color:#f0eeea">Profile synced</div>
          <div style="font-size:11px;color:rgba(240,238,234,.42);margin-top:3px">
            All data saved successfully
          </div>
        </div>
      </div>`;
    dismissToast(2800);
  }


  // ── Storage helpers ────────────────────────────────────────────────────────
  const local = {
    get: keys => new Promise(r => chrome.storage.local.get(keys, r)),
    set: data => new Promise((res, rej) => chrome.storage.local.set(data, () =>
      chrome.runtime.lastError ? rej(new Error(chrome.runtime.lastError.message)) : res()
    )),
    remove: keys => new Promise(r => chrome.storage.local.remove(keys, r)),
  };

  // ── CAPTCHA detection ────────────────────────────────────────────────────────
  function hasCaptcha() {
    return !!(
      document.querySelector('.g-recaptcha, #captcha, [data-test*="captcha"], iframe[src*="captcha"], iframe[src*="recaptcha"]') ||
      /prove you.re human|complete the captcha|unusual traffic/i.test(document.body.innerText.slice(0, 2000))
    );
  }

  function showCaptchaToast() {
    getToast().innerHTML = T_ANIMS + `
      <div style="height:2px;background:linear-gradient(90deg,#fbbf24,transparent)"></div>
      <div style="padding:18px 20px;display:flex;align-items:center;gap:14px">
        <div style="width:36px;height:36px;flex-shrink:0;border-radius:50%;
          background:rgba(251,191,36,.12);display:flex;align-items:center;justify-content:center;font-size:18px">🔒</div>
        <div>
          <div style="font-weight:700;color:#f0eeea">Captcha detected</div>
          <div style="font-size:11px;color:rgba(240,238,234,.42);margin-top:3px">Complete it, then visit your profile again</div>
        </div>
      </div>`;
    dismissToast(6000);
  }

  // ── Read next portfolio page (delay-then-read — no fragile DOM observer) ────
  async function readNextPortfolioPage(profileId, localKey, page) {
    showSyncingToast();

    // Wait for Upwork React to render the new page content
    await new Promise(r => setTimeout(r, 2500));

    if (hasCaptcha()) { showCaptchaToast(); return; }

    const items = extractPortfolioItems();
    if (!items.length) { showDoneToast(); return; }

    const stored  = await local.get([localKey]);
    const current = stored[localKey] || {};
    const merged  = [...(current.portfolios || [])];
    items.forEach(item => {
      const match = merged.find(p => p.title === item.title);
      if (!match) merged.push({ title: item.title, desc: item.desc || '', urls: [], _autoRead: true });
      else if (!match.desc && item.desc) match.desc = item.desc;
    });

    try { await local.set({ [localKey]: { ...current, portfolios: merged } }); }
    catch(e) { console.error('[SnagAI] Portfolio page save failed:', e.message); }

    const nextBtn = findPortfolioNextButton();
    if (nextBtn) {
      showPageDoneToast(page, items.length, true, () => {
        nextBtn.click();
        readNextPortfolioPage(profileId, localKey, page + 1);
      });
    } else {
      showDoneToast();
    }
  }

  // ── Init (async — toast always resolves) ────────────────────────────────────
  async function init(attempt) {
    attempt = attempt || 1;

    const { registeredProfiles: registered = [] } = await local.get(['registeredProfiles']);
    if (!registered.length) return;

    const currentUrl = location.href.split('?')[0];
    const curSlug    = currentUrl.split('/freelancers/')[1]?.split('/')[0]?.split('?')[0] || '';
    if (!curSlug) return;

    // Primary match
    let target = registered.find(p => {
      if (!p?.url) return false;
      const s = p.url.split('/freelancers/')[1]?.split('/')[0]?.split('?')[0] || '';
      return s && s === curSlug;
    });

    // Fallback: custom username → ~xxx redirect (own profile only)
    if (!target && curSlug.startsWith('~')) {
      const isOwn = !!(
        document.querySelector('[data-test="pib-edit-button"]') ||
        document.querySelector('[class*="edit-profile"]') ||
        document.querySelector('[aria-label*="Edit profile"]') ||
        document.querySelector('a[href*="/profile/edit"]')
      );
      if (isOwn) target = registered.find(p => {
        if (!p?.url) return false;
        const s = p.url.split('/freelancers/')[1]?.split('/')[0]?.split('?')[0] || '';
        return s && !s.startsWith('~');
      });
    }

    if (!target) return;

    // Sync disabled → just update lastVisited
    if (target.syncEnabled === false) {
      await local.set({ registeredProfiles: registered.map(p =>
        p.url === target.url ? { ...p, _lastVisited: Date.now() } : p
      )}).catch(() => {});
      return;
    }

    const profileId  = target.id || ('profile_' + Date.now());
    const localKey   = 'profileFull_' + profileId;
    const originUrl  = target.url;

    // Show syncing toast immediately
    showSyncingToast();

    // Load existing full data (preserve user portfolios)
    const existing     = await local.get([localKey]);
    const existingFull = existing[localKey] || {};

    const data       = readProfileData();
    const hasAnyData = !!(data.name || data.jss || data.rate || data.tier || data.skillsArr.length);

    if (!hasAnyData) {
      if (hasCaptcha()) { showCaptchaToast(); return; }
      if (attempt <= 3) {
        dismissToast(0);
        await new Promise(r => setTimeout(r, 2000 * attempt));
        return init(attempt + 1);
      }
      // After 3 retries: mark as attempted so slot shows synced
      await local.set({ registeredProfiles: registered.map(p =>
        p.url === originUrl ? { ...p, _readAt: Date.now(), _syncAttempted: true, url: currentUrl } : p
      )}).catch(() => {});
      showDoneToast();
      return;
    }

    // Merge portfolios — never lose user-added entries
    const pageItems = extractPortfolioItems();
    const merged    = [...(existingFull.portfolios || [])];
    pageItems.forEach(item => {
      const match = merged.find(p => p.title === item.title);
      if (!match) merged.push({ title: item.title, desc: item.desc || '', urls: [], _autoRead: true });
      else if (!match.desc && item.desc) match.desc = item.desc;
    });

    const availability = readAvailability(document.body.innerText);
    const autoExtra    = target.extra || existingFull.extra ||
      [availability, data.country].filter(Boolean).join(' · ');

    const profileMeta = {
      id: profileId, url: currentUrl, syncEnabled: true,
      _readAt: data._readAt, _lastVisited: Date.now(),
      name: data.name, jss: data.jss, tier: data.tier,
      tierKey: data.tierKey || 'new', rate: data.rate,
      earnings: data.earnings, jobs: data.jobs, country: data.country,
    };

    const profileFull = {
      ...profileMeta,
      hourlyRate: data.hourlyRate, hours: data.hours,
      title: data.title, bio: data.bio, extra: autoExtra,
      skills: data.skills, skillsArr: data.skillsArr,
      employment: data.employment, education: data.education,
      languages: data.languages, portfolios: merged, _autoRead: true,
    };

    // Save — try/catch so toast ALWAYS advances regardless
    try {
      await local.set({
        registeredProfiles: registered.map(p =>
          (p.url === originUrl || p.url === currentUrl) ? profileMeta : p
        ),
        activeProfileId: profileId,
        [localKey]:      profileFull,
      });
    } catch (err) {
      console.error('[SnagAI] Save error:', err.message);
    }

    // Profile is saved — show done toast
    showDoneToast();

    // If portfolio has more pages, show hint after done toast auto-dismisses
    const nextBtn = findPortfolioNextButton();
    if (nextBtn && pageItems.length > 0) {
      setTimeout(() => {
        showPageDoneToast(1, pageItems.length, true, () => {
          nextBtn.click();
          readNextPortfolioPage(profileId, localKey, 2);
        });
      }, 3200);
    }
  }

  if (document.readyState === 'complete') setTimeout(() => init(1), 1500);
  else window.addEventListener('load', () => setTimeout(() => init(1), 1500));

})();