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

  // ── Main profile data reader ──────────────────────────────────────────────────
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

  // ── Toast ─────────────────────────────────────────────────────────────────────
  const TID = 'snagai-toast';
  const TCSS = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;width:220px;background:#0d1525;border:1px solid rgba(201,168,76,.2);border-radius:10px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.55);font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:12px;color:#f0eeea;transition:opacity .3s';
  const TANIM = '<style>@keyframes snag-spin{to{transform:rotate(360deg)}}@keyframes snag-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}#snagai-toast{animation:snag-in .2s ease}</style>';
  function getT() { let el=document.getElementById(TID); if(!el){el=document.createElement('div');el.id=TID;el.setAttribute('style',TCSS);document.body.appendChild(el);} return el; }
  function hideT(ms) { setTimeout(()=>{const el=document.getElementById(TID);if(!el)return;el.style.opacity='0';setTimeout(()=>el?.remove(),320);},ms||0); }
  function showSyncingToast() { getT().innerHTML=TANIM+'<div style="height:2px;background:linear-gradient(90deg,#c9a84c,transparent)"></div><div style="padding:11px 13px;display:flex;align-items:center;gap:9px"><div style="width:18px;height:18px;flex-shrink:0;border-radius:50%;border:2px solid rgba(201,168,76,.15);border-top-color:#c9a84c;animation:snag-spin .8s linear infinite"></div><span style="font-weight:600;font-size:12px;color:#f0eeea">Syncing profile…</span></div>'; }
  function showDoneToast() { getT().innerHTML=TANIM+'<div style="height:2px;background:linear-gradient(90deg,#34d399,transparent)"></div><div style="padding:11px 13px;display:flex;align-items:center;gap:8px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span style="font-weight:600;font-size:12px;color:#f0eeea">Profile synced ✓</span></div>'; hideT(2500); }

  // ── Storage helpers ───────────────────────────────────────────────────────────
  const local = {
    get: keys => new Promise(r => chrome.storage.local.get(keys, r)),
    set: data => new Promise((res, rej) => chrome.storage.local.set(data, () =>
      chrome.runtime.lastError ? rej(new Error(chrome.runtime.lastError.message)) : res()
    )),
  };

  // ── Inject "Sync to Snag AI" button ──────────────────────────────────────────
  function injectSyncButton(onSync) {
    if (document.getElementById('snagai-sync-btn')) return;
    const style = document.createElement('style');
    style.textContent = '@keyframes snagai-spin{to{transform:rotate(360deg)}} #snagai-sync-btn .snagai-spin{animation:snagai-spin .7s linear infinite;display:inline-block}';
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = 'snagai-sync-btn';
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle;margin-right:5px"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>Sync to Snag AI';
    btn.style.cssText = 'position:fixed;top:16px;right:20px;z-index:2147483646;padding:9px 18px;background:#c9a84c;color:#0a0e1a;border:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(201,168,76,.45);transition:background .15s,transform .15s;letter-spacing:-.01em;line-height:1.4';
    btn.addEventListener('mouseenter', () => { if (!btn.disabled) { btn.style.background = '#e8c878'; btn.style.transform = 'translateY(-1px)'; } });
    btn.addEventListener('mouseleave', () => { if (!btn.disabled) { btn.style.background = '#c9a84c'; btn.style.transform = ''; } });
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.style.opacity = '.75';
      btn.style.cursor = 'default';
      btn.innerHTML = '<span class="snagai-spin" style="display:inline-block;vertical-align:middle;margin-right:5px">↻</span>Syncing…';
      try {
        await onSync();
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle;margin-right:5px"><polyline points="20 6 9 17 4 12"/></svg>Synced';
        btn.style.background = '#34d399';
        btn.style.opacity = '1';
      } catch(e) {
        btn.innerHTML = '⚠ Sync failed — retry';
        btn.style.background = '#f87171';
        btn.style.opacity = '1';
        btn.disabled = false;
        btn.style.cursor = 'pointer';
      }
    });
    document.body.appendChild(btn);
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
      showSyncingToast();

      const existing     = await local.get([localKey]);
      const existingFull = existing[localKey] || {};
      const data         = readProfileData();
      const availability = readAvailability(document.body.innerText);
      const autoExtra    = target.extra || existingFull.extra || [availability, data.country].filter(Boolean).join(' · ');

      const profileMeta = {
        id: profileId, url: currentUrl, syncEnabled: true,
        _readAt: data._readAt, _lastVisited: Date.now(),
        name: data.name, jss: data.jss, tier: data.tier, tierKey: data.tierKey || 'new',
        rate: data.rate, earnings: data.earnings, jobs: data.jobs, country: data.country,
      };
      const profileFull = {
        ...profileMeta,
        hourlyRate: data.hourlyRate, hours: data.hours,
        title: data.title, bio: data.bio, extra: autoExtra,
        skills: data.skills, skillsArr: data.skillsArr,
        employment: data.employment, education: data.education, languages: data.languages,
        portfolios: existingFull.portfolios || [],
        _portfolioSyncedAt: existingFull._portfolioSyncedAt,
      };

      await local.set({
        registeredProfiles: registered.map(p => (p.url === originUrl || p.url === currentUrl) ? profileMeta : p),
        activeProfileId: profileId,
        [localKey]: profileFull,
      });
      showDoneToast();
    });
  }

  if (document.readyState === 'complete') setTimeout(() => init(), 1500);
  else window.addEventListener('load', () => setTimeout(() => init(), 1500));
})();
