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

  // ── Skills extraction — comprehensive with multiple fallbacks ─────────────────
  function readSkills() {
    // DOM selectors: try each until we get results
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
    for (const sel of selectors) {
      try {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          const extracted = [...new Set([...els]
            .map(e => e.innerText.trim().split('\n')[0].trim())
            .filter(s => s && s.length >= 2 && s.length <= 60)
          )];
          if (extracted.length >= 1) return extracted;
        }
      } catch(e) {}
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

    // Bio: first long paragraph in the body text
    let bio = '';
    pt.split('\n\n').some(block => {
      const clean = block.trim();
      if (clean.length > 100 && clean.length < 1000 && !/^\$|Job Success|Total|Rising|Top Rated/i.test(clean)) {
        bio = clean.slice(0, 600);
        return true;
      }
    });

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

      // Match registered URL by slug only (handles URL variations and trailing paths)
      const matchedProfile = registered.find(p => {
        if (!p || !p.url) return false;
        const regSlug = p.url.split('/freelancers/')[1]?.split('/')[0]?.split('?')[0] || '';
        return regSlug && regSlug === curSlug;
      });

      // GUARD 3: user hasn't registered this specific URL — do nothing
      if (!matchedProfile) return;

      // Sync disabled — only update last visited timestamp
      if (matchedProfile.syncEnabled === false) {
        const updReg = registered.map(p => (p.url === matchedProfile.url) ? { ...p, _lastVisited: Date.now() } : p);
        chrome.storage.sync.set({ registeredProfiles: updReg });
        return;
      }

      const data = readProfileData();

      // If page not yet loaded, retry up to 3 times
      if (!data.name && !data.jss && data.skillsArr.length === 0) {
        if (attempt <= 3) setTimeout(() => init(attempt + 1), 2000 * attempt);
        return;
      }

      // Merge: preserve existing portfolio URLs and user-edited fields
      const existingPortfolios = matchedProfile.portfolios || [];
      const mergedPortfolios   = [...existingPortfolios];
      (data.portfolioTitles || []).forEach(title => {
        if (!mergedPortfolios.find(p => p.title === title)) {
          mergedPortfolios.push({ title, urls: [], desc: '', skills: '', _autoRead: true });
        }
      });

      const updatedProfile = {
        ...matchedProfile,
        ...data,
        portfolios:   mergedPortfolios,
        extra:        matchedProfile.extra || '',
        syncEnabled:  true,
        _lastVisited: Date.now(),
      };

      const updatedRegistered = registered.map(p =>
        (p.url === matchedProfile.url) ? updatedProfile : p
      );

      // Legacy `profile` key — keep for background.js compatibility
      const legacyProfile = {
        name: data.name, title: data.title, jss: data.jss,
        hourlyRate: data.hourlyRate, rate: data.rate,
        tier: updatedProfile.tierKey,
        skills: data.skills,      // string
        skillsArr: data.skillsArr, // array
        bio: data.bio, country: data.country,
        earnings: data.earnings, jobs: data.jobs, hours: data.hours,
        employment: data.employment, education: data.education,
        languages: data.languages, certifications: data.certifications,
        portfolio: mergedPortfolios,
        extra: matchedProfile.extra || '',
        _readAt: data._readAt, _autoRead: true,
      };

      chrome.storage.sync.set({
        registeredProfiles: updatedRegistered,
        activeProfileId:    updatedProfile.id || matchedProfile.id,
        profile:            legacyProfile,
      }, () => {
        console.log('[SnagAI] ✓ Synced:', data.name, '| JSS:', data.jss, '| Skills:', data.skillsArr.length, '| Portfolios:', mergedPortfolios.length);
        showToast(data);
      });
    });
  }

  if (document.readyState === 'complete') setTimeout(() => init(1), 1500);
  else window.addEventListener('load', () => setTimeout(() => init(1), 1500));
})();
