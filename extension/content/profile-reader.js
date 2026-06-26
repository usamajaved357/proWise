// ── Snag AI Profile Reader v6 ─────────────────────────────────────────────────
// User-triggered only — reads profile data only when user clicks "Sync to Snag AI"
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
    if (/^\d+(\.\d+)?$/.test(s)) return false;
    if (/\$\d/.test(s)) return false;
    if (/\brating\b|\bout of \d|\bstars?\b|\breview/i.test(s)) return false;
    if (/^\d+\.\d+\s*out|^Rating is/i.test(s)) return false;
    if (/\b(is|was|are|were|have|has|had|will|would|could|should|need|want|looking|help|finishing|fixing|building)\b/i.test(s)) return false;
    if (/^(Help|Need|Want|Looking|Build|Fix|Create|Make|Develop|Design|Get|Find|Add|Update|Improve|Write|Test|Review|Deploy|Manage|Handle|Working|See|Show|View|Click|Go|Back|Next|Prev|Load|Save|Submit|Cancel|Close|Open)\b/i.test(s)) return false;
    if (/^Published (on|in)\b|^\d{1,2},?\s+\d{4}$|^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(s)) return false;
    if (/\bdelivery\b|\bpaginat|\bcurrent page|\bgo to page/i.test(s)) return false;
    if (s.split(' ').length > 5) return false;
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

  // ── Bio ───────────────────────────────────────────────────────────────────────
  const UI_REJECT = /\b(Edit|Buy Connects|View details|Hours per week|contract to hire|Open to|Verifications|Military|Boost your profile|Video introduction|Profile strength|Documents|Licenses|My Stats|Proposals sent|Job invites|Profile views)\b/i;
  function truncateBio(t) { const m=300; if(t.length<=m) return t; const c=t.slice(0,m); const l=c.lastIndexOf(' '); return c.slice(0,l>200?l:m)+'…'; }
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

  // ── Portfolio items — asks background to read Vuex store via MAIN world ───────
  // Content scripts run in isolated world and can't access __vue__.
  // Background uses chrome.scripting.executeScript(world:'MAIN') which bypasses CSP.
  async function readPortfolioTitles() {
    try {
      const items = await chrome.runtime.sendMessage({ type: 'GET_PORTFOLIO_DATA' });
      console.log('[SnagAI] Portfolio items from store:', (items || []).length, (items || []).map(i => i.title));
      return items || [];
    } catch(e) {
      console.log('[SnagAI] Portfolio read error:', e.message);
      return [];
    }
  }

  // Merge newly read portfolio titles — preserves user-added URLs/desc
  function mergePortfolioTitles(existing, fresh) {
    const merged = [...existing];
    fresh.forEach(item => {
      const already = merged.find(p => p.title && p.title.toLowerCase() === item.title.toLowerCase());
      if (!already) merged.push(item);
    });
    return merged;
  }

  // ── Main profile data reader ──────────────────────────────────────────────────
  async function readProfilePic() {
    try {
      const url = await Promise.race([
        chrome.runtime.sendMessage({ type: 'GET_PROFILE_PIC' }),
        new Promise(resolve => setTimeout(() => resolve(''), 4000))
      ]);
      if (typeof url === 'string' && url.startsWith('https://')) return url;
    } catch(e) { /* non-blocking */ }
    return '';
  }

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
      _readAt: Date.now(),
    };
  }


  // ── Storage helpers ───────────────────────────────────────────────────────────
  const local = {
    get: keys => new Promise(r => chrome.storage.local.get(keys, r)),
    set: data => new Promise((res, rej) => chrome.storage.local.set(data, () =>
      chrome.runtime.lastError ? rej(new Error(chrome.runtime.lastError.message)) : res()
    )),
  };

  // ── Inject sync button — matches Write Proposal pill style ───────────────────
  function injectSyncButton(onSync) {
    if (document.getElementById('snagai-sync-trigger')) return;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes snagai-pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes snagai-spin{to{transform:rotate(360deg)}}
      #snagai-sync-trigger{position:fixed;bottom:28px;right:28px;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
      #snagai-sync-btn{display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0d1120,#1a2035);color:#f0eeea;border:1px solid rgba(201,168,76,.35);border-radius:50px;padding:11px 20px 11px 14px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 24px rgba(0,0,0,.5),0 0 0 1px rgba(201,168,76,.15);transition:transform .2s,box-shadow .2s;font-family:inherit}
      #snagai-sync-btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.6),0 0 0 1px rgba(201,168,76,.3)}
      #snagai-sync-btn:disabled{opacity:.7;cursor:default;transform:none}
      .snagai-btn-icon{width:24px;height:24px;background:#6366f1;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .snagai-live-dot{width:6px;height:6px;background:#34d399;border-radius:50%;animation:snagai-pulse 2s ease-in-out infinite;flex-shrink:0}
      .snagai-spin-icon{display:inline-block;animation:snagai-spin .7s linear infinite}
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = 'snagai-sync-trigger';

    const btn = document.createElement('button');
    btn.id = 'snagai-sync-btn';
    btn.innerHTML = `
      <div class="snagai-btn-icon">
        <svg width="16" height="16" viewBox="0 0 100 100" fill="none">
          <rect x="5" y="5" width="64" height="78" rx="10" stroke="white" stroke-width="5.5" fill="none"/>
          <line x1="14" y1="23" x2="57" y2="23" stroke="white" stroke-width="5" stroke-linecap="round"/>
          <line x1="14" y1="35" x2="57" y2="35" stroke="white" stroke-width="5" stroke-linecap="round"/>
          <line x1="14" y1="47" x2="57" y2="47" stroke="white" stroke-width="5" stroke-linecap="round"/>
          <circle cx="76" cy="77" r="23" fill="#4338ca"/>
          <polygon points="80,59 70,78 77,78 73,95 88,74 81,74" fill="white"/>
        </svg>
      </div>
      <span>Sync Profile</span>
      <span class="snagai-live-dot"></span>
    `;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = `
        <div class="snagai-btn-icon">
          <span class="snagai-spin-icon" style="font-size:13px;color:#0a0e1a">↻</span>
        </div>
        <span>Syncing…</span>
      `;
      try {
        await onSync();
        btn.innerHTML = `
          <div class="snagai-btn-icon" style="background:linear-gradient(135deg,#065f46,#34d399)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span>Synced</span>
        `;
        btn.style.borderColor = 'rgba(52,211,153,.4)';
      } catch(e) {
        btn.innerHTML = `
          <div class="snagai-btn-icon" style="background:linear-gradient(135deg,#7f1d1d,#f87171)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <span>Retry</span>
        `;
        btn.disabled = false;
      }
    });

    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }

  // ── Init ──────────────────────────────────────────────────────────────────────
  async function init() {
    const { registeredProfiles: registered = [] } = await local.get(['registeredProfiles']);
    if (!registered.length) return;

    const currentUrl = location.href.split('?')[0];
    const curSlug    = currentUrl.split('/freelancers/')[1]?.split('/')[0]?.split('?')[0] || '';
    if (!curSlug) return;

    let target = registered.find(p => {
      if (!p?.url) return false;
      const s = p.url.split('/freelancers/')[1]?.split('/')[0]?.split('?')[0] || '';
      return s && s === curSlug;
    });
    if (!target && curSlug.startsWith('~')) {
      const isOwn = !!(document.querySelector('[data-test="pib-edit-button"],[class*="edit-profile"],[aria-label*="Edit profile"],a[href*="/profile/edit"]'));
      if (isOwn) target = registered.find(p => { if (!p?.url) return false; const s = p.url.split('/freelancers/')[1]?.split('/')[0]?.split('?')[0]||''; return s && !s.startsWith('~'); });
    }
    if (!target) return;

    const profileId = target.id || ('profile_' + Date.now());
    const localKey  = 'profileFull_' + profileId;
    const originUrl = target.url;

    injectSyncButton(async () => {
      const existing     = await local.get([localKey]);
      const existingFull = existing[localKey] || {};
      const data         = readProfileData();
      const availability = readAvailability(document.body.innerText);
      const autoExtra    = target.extra || existingFull.extra || [availability, data.country].filter(Boolean).join(' · ');

      const profilePicUrl   = await readProfilePic();
      const freshPortfolios = await readPortfolioTitles();
      const mergedPortfolios = mergePortfolioTitles(existingFull.portfolios || [], freshPortfolios);

      const profileMeta = {
        id: profileId, url: currentUrl, syncEnabled: true,
        _readAt: data._readAt, _lastVisited: Date.now(),
        name: data.name, jss: data.jss, tier: data.tier, tierKey: data.tierKey || 'new',
        rate: data.rate, earnings: data.earnings, jobs: data.jobs, country: data.country,
      };
      const profileFull = {
        ...profileMeta,
        hourlyRate: data.hourlyRate, hours: data.hours,
        profilePicUrl: profilePicUrl || existingFull.profilePicUrl || '',
        title: data.title, bio: data.bio, extra: autoExtra,
        skills: data.skills, skillsArr: data.skillsArr,
        employment: data.employment, education: data.education, languages: data.languages,
        portfolios: mergedPortfolios,
        _portfolioSyncedAt: Date.now(),
      };

      console.log('[SnagAI] Saving portfolios:', mergedPortfolios.length, mergedPortfolios.map(p => p.title));
      await local.set({
        registeredProfiles: registered.map(p => (p.url === originUrl || p.url === currentUrl) ? profileMeta : p),
        activeProfileId: profileId,
        [localKey]: profileFull,
      });
      console.log('[SnagAI] Save complete ✓');

    });
  }

  if (document.readyState === 'complete') setTimeout(() => init(), 1500);
  else window.addEventListener('load', () => setTimeout(() => init(), 1500));
})();
