// ── Snag AI Profile Reader ────────────────────────────────────────────────────
// Runs on upwork.com/freelancers/* pages
// Reads all profile data and saves to chrome.storage.sync

(function() {
  if (!location.href.includes('/freelancers/')) return;

  function readProfile() {
    const pt = document.body.innerText;

    // ── Basic stats (from top of page) ─────────────────────────────────────
    const nameM   = pt.match(/^[\s\S]*?Skip to content[\s\S]*?\n([A-Z][a-z]+(?: [A-Z]\.?)?)\n/);
    const name    = document.querySelector('h1, [class*="freelancer-name"]')?.innerText?.trim()
                 || pt.match(/Status: Online\s*\n([^\n]+)/)?.[1]?.trim() || '';

    const titleM  = pt.match(/\$[\d.]+\/hr\s*\n([\s\S]*?)(?=\$[\d.]+\/hr|Top Rated|Rising|\n\n)/);
    const title   = document.querySelector('[class*="title"], [class*="freelancer-title"]')?.innerText?.trim()
                 || pt.match(/Top Rated\n([\s\S]{0,200}?)(?:\$[\d.]+\/hr)/s)?.[1]?.trim()?.split('\n').pop()?.trim() || '';

    const jssM    = pt.match(/(\d+)%\s*Job Success/i);
    const jss     = jssM ? jssM[1] + '%' : '';

    const rateM   = pt.match(/\$([\d.]+)\/hr/);
    const rate    = rateM ? '$' + rateM[1] + '/hr' : '';

    const tierM   = pt.match(/Top Rated Plus|Top Rated|Rising Talent|Expert.Vetted/i);
    const tier    = tierM ? tierM[0] : '';

    // Earnings: "$9K+" or "$9,123"
    const earningsM = pt.match(/\$([\d,]+[KkMm+]*)\s*\nTotal earnings/);
    const earnings  = earningsM ? '$' + earningsM[1] : '';

    const jobsM   = pt.match(/(\d+)\s*\nTotal jobs/);
    const jobs    = jobsM ? jobsM[1] : '';

    const hoursM  = pt.match(/(\d+)\s*\nTotal hours/);
    const hours   = hoursM ? hoursM[1] : '';

    const locationM = pt.match(/(?:Verified\s*\n)?([^–\n]+)–[^–\n]+local time/);
    const location  = locationM ? locationM[1].trim() : '';

    // ── Skills ──────────────────────────────────────────────────────────────
    const skillEls = document.querySelectorAll('.skill-name, [class*="skill-name"]');
    const skills   = [...skillEls].map(s => s.innerText.trim()).filter(Boolean);

    // ── Bio / Overview ──────────────────────────────────────────────────────
    // Bio is usually the paragraph after the rate/title block
    const bioIdx  = pt.indexOf(rate);
    let bio = '';
    if (bioIdx > -1) {
      const afterRate = pt.slice(bioIdx + rate.length, bioIdx + rate.length + 1500);
      // Skip tier badges, take the first substantial paragraph
      const bioLines = afterRate.split('\n').filter(l => l.trim().length > 60);
      bio = bioLines[0]?.trim() || '';
    }

    // ── Portfolio ───────────────────────────────────────────────────────────
    const portfolioSection = pt.slice(pt.indexOf('Portfolio'), pt.indexOf('Employment history'));
    const portfolioTitles  = portfolioSection
      .split('\n')
      .filter(l => l.trim().length > 5 && !['Portfolio','Published','Drafts','More options','Published work'].includes(l.trim()))
      .slice(0, 10);

    // DOM-based portfolio (more reliable)
    const portItems = document.querySelectorAll('[class*="portfolio"] [class*="title"], [class*="portfolio-item"]');
    const portfolio = portItems.length
      ? [...portItems].map(el => el.innerText.trim()).filter(Boolean)
      : portfolioTitles;

    // ── Employment history ───────────────────────────────────────────────────
    const empSection = document.querySelector('.work-history-section, [class*="work-history"]');
    const employment = [];
    if (empSection) {
      const entries = empSection.querySelectorAll('[class*="air3-card"], [class*="work-entry"], li');
      entries.forEach(entry => {
        const text = entry.innerText.trim();
        if (text.length > 10) employment.push(text.slice(0, 200));
      });
    }
    if (!employment.length) {
      // Fallback: parse from page text
      const empIdx  = pt.indexOf('Employment history');
      const empEnd  = pt.indexOf('Education', empIdx);
      const empText = pt.slice(empIdx + 18, empEnd > -1 ? empEnd : empIdx + 1000);
      empText.split('\n\n').filter(b => b.trim().length > 20).slice(0, 5)
        .forEach(b => employment.push(b.trim().slice(0, 200)));
    }

    // ── Education ───────────────────────────────────────────────────────────
    const education = [];
    const eduIdx  = pt.indexOf('Education\n');
    const eduEnd  = pt.indexOf('Language', eduIdx);
    if (eduIdx > -1) {
      const eduText = pt.slice(eduIdx + 10, eduEnd > -1 ? eduEnd : eduIdx + 500);
      eduText.split('\n').filter(l => l.trim().length > 3 && l.trim() !== 'Education')
        .slice(0, 8).forEach(l => education.push(l.trim()));
    }

    // ── Languages ───────────────────────────────────────────────────────────
    const languages = [];
    const langIdx = pt.indexOf('Languages\n');
    if (langIdx > -1) {
      const langText = pt.slice(langIdx + 10, langIdx + 300);
      langText.split('\n').filter(l => l.includes(':') && l.length > 3)
        .forEach(l => languages.push(l.trim()));
    }

    // ── Certifications ───────────────────────────────────────────────────────
    const certifications = [];
    const certIdx = pt.indexOf('Certifications\n');
    if (certIdx > -1) {
      const certText = pt.slice(certIdx + 15, certIdx + 800);
      // Pattern: "CertName\nProvider: X\nIssued: Y"
      const certMatches = certText.matchAll(/([\w][^\n]{5,})\nProvider:\s*([^\n]+)\nIssued:\s*([^\n]+)/g);
      for (const m of certMatches) {
        certifications.push({ name: m[1].trim(), provider: m[2].trim(), issued: m[3].trim() });
      }
    }

    // ── Testimonials ─────────────────────────────────────────────────────────
    const testimonials = [];
    const testIdx = pt.indexOf('Testimonials\n');
    if (testIdx > -1) {
      const testText = pt.slice(testIdx, testIdx + 1500);
      const quotes = testText.match(/"[^"]{20,}"/g) || [];
      quotes.slice(0, 5).forEach(q => testimonials.push(q.replace(/"/g, '').trim()));
    }

    // ── Hourly rate number only ───────────────────────────────────────────────
    const hourlyRate = rateM ? rateM[1] : '';

    // ── Compile profile object ────────────────────────────────────────────────
    const profile = {
      name, title, jss, hourlyRate, rate, tier, earnings, jobs, hours, location, bio,
      skills, portfolio, employment, education, languages, certifications, testimonials,
      _readAt: Date.now()
    };

    // Map tier to internal key
    const tierMap = {
      'Expert-Vetted': 'expert', 'Expert Vetted': 'expert',
      'Top Rated Plus': 'top_rated_plus',
      'Top Rated': 'top_rated',
      'Rising Talent': 'rising',
    };
    profile.tierKey = tierMap[tier] || 'new';

    console.log('[SnagAI] Profile read:', JSON.stringify({
      name, title, jss, rate, tier, earnings, jobs, hours,
      skillsCount: skills.length, portfolioCount: portfolio.length,
      employmentCount: employment.length, certCount: certifications.length
    }, null, 2));

    return profile;
  }

  function saveProfile(profile) {
    // Preserve existing portfolio links (manually entered in settings)
    chrome.storage.sync.get(['profile'], (stored) => {
      const existingPortfolio = stored.profile?.portfolio || [];
      chrome.storage.sync.set({ profile: {
        // Auto-read from Upwork
        name:           profile.name,
        title:          profile.title,
        jss:            profile.jss,
        hourlyRate:     profile.hourlyRate,
        rate:           profile.rate,
        tier:           profile.tierKey,
        skills:         profile.skills.join(', '),
        skillsArr:      profile.skills,
        bio:            profile.bio,
        earnings:       profile.earnings,
        jobs:           profile.jobs,
        hours:          profile.hours,
        location:       profile.location,
        employment:     profile.employment,
        education:      profile.education,
        languages:      profile.languages,
        certifications: profile.certifications,
        testimonials:   profile.testimonials,
        _readAt:        profile._readAt,
        _autoRead:      true,
        // Keep manually entered portfolio (URLs not available on profile page)
        portfolio:      existingPortfolio,
      }}, () => {
        console.log('[SnagAI] ✓ Profile saved. Skills:', profile.skills.length, '| Portfolio kept:', existingPortfolio.length);
        showProfileToast(profile);
      });
    });
  }

  function showProfileToast(profile) {
    // Show a small non-intrusive toast at bottom of page
    const existing = document.getElementById('snagai-profile-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'snagai-profile-toast';
    toast.style.cssText = `
      position:fixed; bottom:24px; right:24px; z-index:99999;
      background:#131829; border:1px solid rgba(201,168,76,.35);
      border-radius:12px; padding:12px 16px; max-width:280px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      font-size:13px; color:#f0eeea;
      box-shadow:0 8px 32px rgba(0,0,0,.5);
      animation: snagai-slide-in .3s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes snagai-slide-in {
        from { opacity:0; transform:translateY(12px); }
        to   { opacity:1; transform:translateY(0); }
      }
      @keyframes snagai-fade-out {
        to { opacity:0; transform:translateY(8px); }
      }
    `;
    document.head.appendChild(style);

    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:16px">✓</span>
        <span style="font-weight:700;color:#c9a84c">Snag AI — Profile Updated</span>
      </div>
      <div style="font-size:12px;color:rgba(240,238,234,.65);line-height:1.5">
        ${profile.name} · ${profile.tier} · ${profile.jss} JSS<br>
        ${profile.skills.slice(0,4).join(', ')}${profile.skills.length > 4 ? '…' : ''}
      </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'snagai-fade-out .4s ease forwards';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // Run after page fully loads
  function init() {
    const profile = readProfile();
    if (profile.name || profile.jss) {
      saveProfile(profile);
    } else {
      console.log('[SnagAI] Profile page detected but could not read data yet — retrying in 2s');
      setTimeout(() => {
        const p2 = readProfile();
        if (p2.name || p2.jss) saveProfile(p2);
      }, 2000);
    }
  }

  if (document.readyState === 'complete') {
    setTimeout(init, 1000);
  } else {
    window.addEventListener('load', () => setTimeout(init, 1000));
  }

})();
