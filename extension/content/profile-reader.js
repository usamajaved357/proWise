// ── Snag AI Profile Reader v2 ─────────────────────────────────────────────────
// Runs on upwork.com/freelancers/* pages
// Only reads data when the page URL matches a registered profile URL

(function () {
  if (!location.href.includes('/freelancers/')) return;

  const PLAN_LIMITS = { free: 1, starter: 1, pro: 3, agency: 5 };

  function isOwnProfile() {
    return !!document.querySelector('[data-test="pib-edit-button"], .edit-profile-btn, [class*="edit-profile"], button[aria-label*="Edit"]');
  }

  function extractPortfolioTitles() {
    const titles = [];
    document.querySelectorAll('.portfolio-v2-shelf-thumbnail').forEach(el => {
      const lines = el.innerText.split('\n').map(l => l.trim()).filter(l => l && l !== 'More options');
      if (lines[0]) titles.push(lines[0]);
    });
    return [...new Set(titles)];
  }

  function readProfileData() {
    const pt = document.body.innerText;

    // Basic stats
    const jssM     = pt.match(/(\d+)%\s*Job Success/i);
    const rateM    = pt.match(/\$([\d.]+)\/hr/);
    const tierM    = pt.match(/Top Rated Plus|Top Rated|Rising Talent|Expert.Vetted/i);
    const earningsM = pt.match(/\$([\d,]+[KkMm+]*)\s*\nTotal earnings/);
    const jobsM    = pt.match(/(\d+)\s*\nTotal jobs/);
    const hoursM   = pt.match(/(\d+)\s*\nTotal hours/);

    // Name from top of page
    const topLines = pt.slice(0, 400).split('\n').map(l => l.trim()).filter(Boolean);
    const nameIdx  = topLines.findIndex(l => l === 'Status: Online' || l === 'Verified');
    const name     = nameIdx > 0 ? topLines[nameIdx - 1].replace(/\.$/, '').trim() : '';

    // Title: substantial line after rate
    const rateIdx  = pt.indexOf('$' + (rateM?.[1] || '') + '/hr');
    let title = '';
    if (rateIdx > -1) {
      const afterRate = pt.slice(rateIdx + 10, rateIdx + 400).split('\n').map(l => l.trim());
      title = afterRate.find(l => l.length > 20 && !l.startsWith('Top') && !l.startsWith('Rising') && !l.startsWith('I ') && !l.includes('Job Success')) || '';
    }

    // Skills
    const skillEls = document.querySelectorAll('.skill-name, [class*="skill-name"]');
    const skills   = [...new Set([...skillEls].map(s => s.innerText.trim()).filter(Boolean))];

    // Bio paragraph
    let bio = '';
    const bioSection = pt.slice(pt.search(/\$[\d.]+\/hr/), pt.search(/\$[\d.]+\/hr/) + 800);
    const bioLines   = bioSection.split('\n').filter(l => l.trim().length > 80);
    if (bioLines[0]) bio = bioLines[0].trim();

    // Country / timezone
    const locM  = pt.match(/(\w[\w\s]+)\s*–\s*\d+:\d+\s*(?:am|pm)\s*local time/i);
    const country = locM ? locM[1].trim().split('\n').pop().trim() : '';

    // Employment
    const employment = [];
    const empSection = document.querySelector('.work-history-section, [class*="work-history"]');
    if (empSection) {
      empSection.querySelectorAll('[class*="air3-card-section"], li').forEach(entry => {
        const t = entry.innerText.trim();
        if (t.length > 15 && !t.startsWith('Work history')) employment.push(t.slice(0, 250));
      });
    } else {
      const empIdx = pt.indexOf('Employment history\n');
      const empEnd = pt.indexOf('\nEducation\n', empIdx);
      if (empIdx > -1) {
        pt.slice(empIdx + 20, empEnd > -1 ? empEnd : empIdx + 1200)
          .split('\n\n').filter(b => b.trim().length > 20)
          .slice(0, 6).forEach(b => employment.push(b.trim().slice(0, 250)));
      }
    }

    // Education
    const education = [];
    const eduIdx = pt.indexOf('\nEducation\n');
    const eduEnd = pt.indexOf('\nLanguage', eduIdx);
    if (eduIdx > -1) {
      pt.slice(eduIdx + 11, eduEnd > -1 ? eduEnd : eduIdx + 400)
        .split('\n').filter(l => l.trim().length > 3)
        .slice(0, 6).forEach(l => education.push(l.trim()));
    }

    // Languages
    const languages = [];
    const langIdx = pt.indexOf('\nLanguages\n');
    if (langIdx > -1) {
      pt.slice(langIdx + 11, langIdx + 250)
        .split('\n').filter(l => l.includes(':'))
        .forEach(l => languages.push(l.trim()));
    }

    // Certifications
    const certifications = [];
    const certIdx = pt.indexOf('\nCertifications\n');
    if (certIdx > -1) {
      const matches = pt.slice(certIdx, certIdx + 800)
        .matchAll(/([\w][^\n]{5,})\nProvider:\s*([^\n]+)\nIssued:\s*([^\n]+)/g);
      for (const m of matches) {
        certifications.push({ name: m[1].trim(), provider: m[2].trim(), issued: m[3].trim() });
      }
    }

    // Portfolio titles from current page
    const portfolioTitles = extractPortfolioTitles();

    const tierMap = {
      'Expert-Vetted': 'expert', 'Expert Vetted': 'expert',
      'Top Rated Plus': 'top_rated_plus',
      'Top Rated': 'top_rated',
      'Rising Talent': 'rising',
    };

    return {
      name, title, country,
      jss:     jssM   ? jssM[1] + '%'          : '',
      hourlyRate: rateM ? rateM[1]              : '',
      rate:    rateM  ? '$' + rateM[1] + '/hr'  : '',
      tier:    tierM  ? tierM[0]                : '',
      tierKey: tierMap[tierM?.[0]] || 'new',
      earnings: earningsM ? '$' + earningsM[1] : '',
      jobs:    jobsM  ? jobsM[1]               : '',
      hours:   hoursM ? hoursM[1]              : '',
      bio, skills, portfolioTitles,
      employment, education, languages, certifications,
      _readAt: Date.now(),
      _autoRead: true,
      _profileUrl: location.href.split('?')[0],
    };
  }

  function showToast(profile) {
    const id = 'snagai-toast';
    const old = document.getElementById(id);
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:#131829;border:1px solid rgba(201,168,76,.35);border-radius:12px;padding:12px 16px;max-width:280px;font-family:-apple-system,sans-serif;font-size:13px;color:#f0eeea;box-shadow:0 8px 32px rgba(0,0,0,.5)';
    el.innerHTML = '<div style="font-weight:700;color:#c9a84c;margin-bottom:5px">✓ Snag AI — Profile Updated</div>'
      + '<div style="font-size:11px;color:rgba(240,238,234,.6);line-height:1.6">'
      + (profile.name || '') + ' · ' + (profile.tier || '') + ' · ' + (profile.jss || '') + ' JSS<br>'
      + 'Skills: ' + (profile.skills || []).slice(0, 4).join(', ')
      + '</div>';
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; setTimeout(() => el.remove(), 400); }, 3500);
  }

  function init() {
    chrome.storage.sync.get(['registeredProfiles', 'userPlan'], (stored) => {
      const registered = stored.registeredProfiles || [];
      const currentUrl = location.href.split('?')[0];

      // Check if this URL matches a registered profile
      const matchedProfile = registered.find(p =>
        p.url && (currentUrl.includes(p.url) || p.url.includes(currentUrl.split('/freelancers/')[1]?.split('/')[0] || 'NOMATCH'))
      );

      // Also check if this is the user's own profile (has edit button) and they have < plan limit
      const plan = stored.userPlan || 'free';
      const limit = PLAN_LIMITS[plan] || 1;
      const canAutoDetect = registered.length < limit && isOwnProfile();

      if (!matchedProfile && !canAutoDetect) {
        // Not a registered profile — don't read
        return;
      }

      const data = readProfileData();
      if (!data.name && !data.jss) {
        setTimeout(init, 2000); return;
      }

      // Merge with existing portfolio data (preserve manual URLs)
      const existingProfile = matchedProfile || {};
      const existingPortfolios = existingProfile.portfolios || [];

      // Merge portfolio titles with existing portfolio data
      const mergedPortfolios = [...existingPortfolios];
      (data.portfolioTitles || []).forEach(title => {
        if (!mergedPortfolios.find(p => p.title === title)) {
          mergedPortfolios.push({ title, urls: [], desc: '', skills: '', _autoRead: true });
        }
      });

      const updatedProfile = {
        ...existingProfile,
        ...data,
        portfolios: mergedPortfolios,
        syncEnabled: existingProfile.syncEnabled !== false,
      };

      // Save back to registered profiles
      let updatedRegistered;
      if (matchedProfile) {
        if (!matchedProfile.syncEnabled) {
          // Sync OFF — don't overwrite data, just update _lastVisited
          updatedRegistered = registered.map(p => p.url === matchedProfile.url
            ? { ...p, _lastVisited: Date.now() } : p);
        } else {
          updatedRegistered = registered.map(p => p.url === matchedProfile.url ? updatedProfile : p);
        }
      } else {
        // New auto-detected profile
        updatedProfile.id = 'profile_' + Date.now();
        updatedProfile.url = currentUrl;
        updatedRegistered = [...registered, updatedProfile];
      }

      chrome.storage.sync.set({
        registeredProfiles: updatedRegistered,
        activeProfileId: updatedProfile.id || matchedProfile?.id,
        // Also save as legacy 'profile' for backward compatibility
        profile: {
          name: data.name, title: data.title, jss: data.jss,
          hourlyRate: data.hourlyRate, rate: data.rate,
          tier: updatedProfile.tierKey, skills: data.skills.join(', '),
          skillsArr: data.skills, bio: data.bio,
          portfolio: mergedPortfolios,
          extra: existingProfile.extra || '',
          _readAt: data._readAt, _autoRead: true,
        }
      }, () => {
        console.log('[SnagAI] Profile saved:', data.name, '| Skills:', data.skills.length, '| Portfolios:', mergedPortfolios.length);
        showToast(data);
      });
    });
  }

  if (document.readyState === 'complete') setTimeout(init, 1200);
  else window.addEventListener('load', () => setTimeout(init, 1200));
})();
