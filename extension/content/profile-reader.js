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

  // ── Portfolio titles from DOM ─────────────────────────────────────────────────
  function extractPortfolioTitles() {
    const titles = [];
    for (const sel of ['.portfolio-v2-shelf-thumbnail', '[class*="portfolio-item"]', '[class*="portfolioItem"]', '[data-test*="portfolio-item"]']) {
      try {
        document.querySelectorAll(sel).forEach(el => {
          const lines = el.innerText.split('\n').map(l => l.trim()).filter(l => l && l !== 'More options' && l.length > 2);
          if (lines[0]) titles.push(lines[0]);
        });
        if (titles.length) break;
      } catch(e) {}
    }
    return [...new Set(titles)];
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
    const portfolioTitles = extractPortfolioTitles();

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
      portfolioTitles,
      employment, education, languages, certifications,
      _readAt:    Date.now(),
      _autoRead:  true,
      _profileUrl: location.href.split('?')[0],
    };
  }

  // ── Toast notification ────────────────────────────────────────────────────────
  function showToast(data) {
    const id = 'snagai-toast';
    const old = document.getElementById(id);
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:#131829;border:1px solid rgba(201,168,76,.4);border-radius:12px;padding:14px 18px;max-width:300px;font-family:-apple-system,sans-serif;font-size:13px;color:#f0eeea;box-shadow:0 8px 32px rgba(0,0,0,.6)';

    const skillPreview = data.skillsArr && data.skillsArr.length
      ? data.skillsArr.slice(0, 4).join(', ') + (data.skillsArr.length > 4 ? ` +${data.skillsArr.length - 4} more` : '')
      : 'No skills found — check your profile page is fully loaded';

    el.innerHTML = `
      <div style="font-weight:700;color:#c9a84c;margin-bottom:6px;display:flex;align-items:center;gap:6px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Snag AI — Profile Synced
      </div>
      <div style="font-size:11px;color:rgba(240,238,234,.65);line-height:1.7">
        <strong style="color:#f0eeea">${data.name || 'Profile'}</strong>
        ${data.tier ? ' · ' + data.tier : ''}
        ${data.jss  ? ' · ' + data.jss + ' JSS' : ''}<br>
        ${skillPreview}
      </div>
    `;
    document.body.appendChild(el);

    setTimeout(() => {
      el.style.transition = 'opacity .5s';
      el.style.opacity    = '0';
      setTimeout(() => el.remove(), 500);
    }, 4500);
  }


  // Trim profile to stay under chrome.storage.sync 8 KB per-item limit
  // Two full profiles with bio/employment can exceed it and fail silently
  function trimForStorage(profile) {
    const skills = Array.isArray(profile.skillsArr) ? profile.skillsArr : [];
    return {
      // identity + sync meta
      id:          profile.id,
      url:         profile.url,
      syncEnabled: profile.syncEnabled,
      _readAt:     profile._readAt,
      _lastVisited: profile._lastVisited,
      _syncAttempted: profile._syncAttempted,
      // core stats (small)
      name:        profile.name        || '',
      title:       (profile.title      || '').slice(0, 120),
      country:     profile.country     || '',
      jss:         profile.jss         || '',
      rate:        profile.rate        || '',
      hourlyRate:  profile.hourlyRate  || '',
      tier:        profile.tier        || '',
      tierKey:     profile.tierKey     || '',
      earnings:    profile.earnings    || '',
      jobs:        profile.jobs        || '',
      hours:       profile.hours       || '',
      extra:       (profile.extra      || '').slice(0, 200),
      bio:         (profile.bio        || '').slice(0, 200), // cap bio
      // skills — cap at 25 to save space
      skillsArr:   skills.slice(0, 25),
      skills:      skills.slice(0, 25).join(', '),
      // employment — 3 entries, each capped
      employment:  (profile.employment || []).slice(0, 3).map(e =>
        (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 120)
      ),
      education:   (profile.education  || []).slice(0, 3).map(e =>
        (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 80)
      ),
      languages:   (profile.languages  || []).slice(0, 5),
      certifications: [], // skip — not used in proposals, too large
      // portfolios — keep all (user-entered, important)
      portfolios:  (profile.portfolios || []).map(p => ({
        title: (p.title || '').slice(0, 80),
        urls:  (p.urls  || []).slice(0, 5),
        desc:  (p.desc  || '').slice(0, 100),
      })),
    };
  }

  // ── Init ──────────────────────────────────────────────────────────────────────
  function init(attempt) {
    attempt = attempt || 1;

    chrome.storage.sync.get(['registeredProfiles'], (stored) => {
      const registered = stored.registeredProfiles || [];

      // GUARD 1: no registered profiles at all — do nothing
      if (!registered.length) return;

      const currentUrl = location.href.split('?')[0];
      const curSlug = currentUrl.split('/freelancers/')[1]?.split('/')[0]?.split('?')[0] || '';

      // GUARD 2: not on a profile slug URL
      if (!curSlug) return;

      // ── Primary match: slug-for-slug ────────────────────────────────────────
      let targetProfile = registered.find(p => {
        if (!p || !p.url) return false;
        const regSlug = p.url.split('/freelancers/')[1]?.split('/')[0]?.split('?')[0] || '';
        return regSlug && regSlug === curSlug;
      });

      // ── Fallback: custom username registered (no ~), Upwork redirected to ~xxx
      // Only fires when we detect this is the user's OWN profile page (edit controls visible)
      if (!targetProfile && curSlug.startsWith('~')) {
        const ownProfile = !!(
          document.querySelector('[data-test="pib-edit-button"]') ||
          document.querySelector('[class*="edit-profile"]') ||
          document.querySelector('[aria-label*="Edit profile"]') ||
          document.querySelector('a[href*="/profile/edit"]')
        );
        if (ownProfile) {
          // Find a registered profile whose URL uses a custom username (no ~)
          targetProfile = registered.find(p => {
            if (!p || !p.url) return false;
            const regSlug = p.url.split('/freelancers/')[1]?.split('/')[0]?.split('?')[0] || '';
            return regSlug && !regSlug.startsWith('~');
          });
        }
      }

      // GUARD 3: user hasn't registered this page — do nothing
      if (!targetProfile) return;

      // Keep original URL for array lookup; we'll update it to the resolved ~xxx URL
      const originalStoredUrl = targetProfile.url;
      const matchedProfile    = targetProfile;

      // Sync disabled — only update last visited timestamp
      if (matchedProfile.syncEnabled === false) {
        const updReg = registered.map(p => (p.url === matchedProfile.url) ? { ...p, _lastVisited: Date.now() } : p);
        chrome.storage.sync.set({ registeredProfiles: updReg });
        return;
      }

      const data = readProfileData();

      // Auto-populate 'extra' with availability on first sync (only if user hasn't set it)
      const availability = readAvailability(document.body.innerText);
      const autoExtra = matchedProfile.extra
        ? matchedProfile.extra  // preserve user-edited value
        : [availability, data.country].filter(Boolean).join(' · ');

      // If page not yet loaded (truly nothing detected), retry up to 3 times
      const hasAnyData = !!(data.name || data.jss || data.rate || data.tier || data.skillsArr.length);
      if (!hasAnyData) {
        if (attempt <= 3) {
          setTimeout(() => init(attempt + 1), 2000 * attempt);
          return;
        }
        // After 3 retries still nothing — save _readAt anyway so UI stops showing "Pending"
        // Profile card will show empty fields; user can fill manually
        const minimalMeta = {
          id:             matchedProfile.id || ('profile_' + Date.now()),
          url:            currentUrl,
          syncEnabled:    matchedProfile.syncEnabled,
          _readAt:        Date.now(),
          _syncAttempted: true,
          name:           matchedProfile.name || '',
          jss:            matchedProfile.jss  || '',
        };
        const minReg = registered.map(p => p.url === originalStoredUrl ? minimalMeta : p);
        chrome.storage.sync.set({ registeredProfiles: minReg }, () => {
          if (chrome.runtime.lastError) console.error('[SnagAI] Minimal save failed:', chrome.runtime.lastError.message);
        });
        return;
      }

      // ── Merge portfolio list ────────────────────────────────────────────────
      const existingPortfolios = matchedProfile.portfolios || [];
      const mergedPortfolios   = [...existingPortfolios];
      (data.portfolioTitles || []).forEach(title => {
        if (!mergedPortfolios.find(p => p.title === title)) {
          mergedPortfolios.push({ title, urls: [], desc: '', _autoRead: true });
        }
      });

      const profileId = matchedProfile.id || ('profile_' + Date.now());

      // ── SYNC: metadata only (~200 bytes per profile, well under 8 KB limit) ─
      const profileMeta = {
        id:          profileId,
        url:         currentUrl,          // update to resolved URL
        syncEnabled: true,
        _readAt:     data._readAt,
        _lastVisited: Date.now(),
        // Just enough for slot status display + card header
        name:        data.name,
        jss:         data.jss,
        tier:        data.tier,
        tierKey:     data.tierKey || matchedProfile.tierKey || 'new',
        rate:        data.rate,
        earnings:    data.earnings,
        jobs:        data.jobs,
        country:     data.country,
      };

      const updatedRegistered = registered.map(p =>
        (p.url === originalStoredUrl || p.url === currentUrl) ? profileMeta : p
      );

      // ── LOCAL: full profile data (no per-item limit in local storage) ───────
      const profileFull = {
        ...profileMeta,
        hourlyRate:  data.hourlyRate,
        hours:       data.hours,
        title:       data.title,
        bio:         data.bio,
        extra:       matchedProfile.extra || autoExtra,
        skills:      data.skills,
        skillsArr:   data.skillsArr,
        employment:  data.employment,
        education:   data.education,
        languages:   data.languages,
        portfolios:  mergedPortfolios,
        _autoRead:   true,
      };
      const localKey = 'profileFull_' + profileId;

      // Save sync metadata first (tiny), then save full data to local
      chrome.storage.sync.set({
        registeredProfiles: updatedRegistered,
        activeProfileId:    profileId,
        profile:            profileFull, // legacy compat — also keep in sync for background.js
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[SnagAI] Sync metadata save failed:', chrome.runtime.lastError.message);
          // Even if sync fails, still save to local
        }
        chrome.storage.local.set({ [localKey]: profileFull }, () => {
          console.log('[SnagAI] ✓ Synced:', data.name, '| JSS:', data.jss, '| Skills:', data.skillsArr.length, '| localKey:', localKey);
          showToast(data);
        });
      });
    });
  }

  if (document.readyState === 'complete') setTimeout(() => init(1), 1500);
  else window.addEventListener('load', () => setTimeout(() => init(1), 1500));
})();
