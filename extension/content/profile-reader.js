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


  // ── Audit PDF export state — holds the most recently rendered audit ──────────
  let latestAuditResult  = null;
  let latestAuditProfile = null;

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

  // ── Audit: extract all profile data from page text ───────────────────────────
  async function readAuditData() {
    const pt = document.body.innerText;
    const base = readProfileData();

    // Work history stats
    const completedM = pt.match(/Completed jobs \((\d+)\)/i);
    const completedJobs = completedM ? parseInt(completedM[1]) : null;

    // Reviews — actual format: "Rating is 5.0 out of 5.\n5.0\nDate\n"review text"\nEndorsed"
    const reviewTexts = [];
    const reviewRe = /Rating is (\d+(?:\.\d+)?) out of 5\.[\s\S]{1,200}?[“”"]([^“”"\n]{10,400})[“”"]/gi;
    let rm;
    while ((rm = reviewRe.exec(pt)) !== null && reviewTexts.length < 8) {
      const rating = rm[1];
      const text = rm[2].trim();
      if (text.length > 10) reviewTexts.push(`${rating}★ — "${text.slice(0, 200)}"`);
    }

    // Portfolio — full data via Vuex store (all pages, titles + desc + urls + skills)
    const portfolioItems = await readPortfolioTitles();
    const portfolioTitles = portfolioItems.map(p => {
      const parts = [p.title];
      if (p.role) parts.push(p.role);
      if (p.skills?.length) parts.push('Skills: ' + p.skills.join(', '));
      if (p.desc) parts.push(p.desc.slice(0, 120));
      if (p.urls?.length) parts.push('URL: ' + p.urls[0]);
      return parts.join(' | ');
    });

    // Project catalog — "You will get " prefix is unique to catalog items
    const catalogTitles = [];
    const catRe = /You will get ([^\n]{10,120})/g;
    let catM;
    while ((catM = catRe.exec(pt)) !== null) catalogTitles.push(catM[1].trim());

    // AI summary
    const aiSumM = pt.match(/Summary\n([\s\S]{0,600}?)(?:\nGenerated by|Skills used)/i);
    const aiSummary = aiSumM ? aiSumM[1].trim() : '';

    // Testimonials — curly quotes: "..." and client name on next line
    const testimonials = [];
    const testSection = pt.match(/Testimonials[\s\S]{0,80}?Endorsements from past clients\n([\s\S]{0,3000}?)(?:\nVisibility|\nRequest a new|\nCertifications)/i);
    if (testSection) {
      const tRe = /["""]([^"""]{20,600})["""]\s*\n+([A-Z][a-zA-Z'. ]+)\s*\|/g;
      let tm;
      while ((tm = tRe.exec(testSection[1])) !== null) {
        testimonials.push(`"${tm[1].trim()}" — ${tm[2].trim()}`);
      }
    }

    // Certifications
    const certs = [];
    const certSection = pt.match(/Certifications\n([\s\S]{0,1500}?)(?:\nEmployment history|\nOther experiences|\nFooter)/i);
    if (certSection) {
      const certRe = /^(.{5,80})\nProvider: (.+)/gm;
      let cm;
      while ((cm = certRe.exec(certSection[1])) !== null) {
        certs.push(`${cm[1].trim()} (${cm[2].trim()})`);
      }
    }

    // Employment
    const empSection = pt.match(/Employment history\n([\s\S]{0,3000}?)(?:\nOther experiences|\nFooter navigation)/i);
    const empSummary = empSection ? empSection[1].trim().slice(0, 1200) : '';
    const empCount = (empSection?.[1].match(/\n[A-Z].{10,100}\n\s*\n[A-Z]/g) || []).length || (empSection ? 1 : 0);

    // Linked accounts — "GitHub Since YYYY" and "StackOverflow\n<name>" are unique strings
    // that only appear in the linked accounts section, so safe to search full page text
    const githubLinked = /github since \d{4}/i.test(pt);
    const soLinked = /stackoverflow\s*\n[A-Z]/i.test(pt);

    // Response time & availability
    const respM = pt.match(/Avg\. response\n(.+)/i);
    const respTime = respM ? respM[1].trim() : '';
    const availM = pt.match(/(More than 30 hrs\/week|Less than 30 hrs\/week|As needed)/i);
    const availability = availM ? availM[1] : '';

    // Languages
    const langSection = pt.match(/Languages\n([\s\S]{0,300}?)(?:\nVerifications|\nID:)/i);
    const languages = langSection ? langSection[1].trim().replace(/\n/g, ', ') : base.languages?.join(', ') || '';

    // Education
    const eduSection = pt.match(/Education\n([\s\S]{0,400}?)(?:\nLinked accounts|\nTestimonials|\nCertifications)/i);
    const education = eduSection ? eduSection[1].trim().split('\n').filter(l => l.trim()).slice(0, 4).join(' | ') : '';

    return {
      name: base.name,
      title: base.title,
      rate: base.rate,
      jss: base.jss,
      tier: base.tier,
      earnings: base.earnings,
      jobs: base.jobs,
      hours: base.hours,
      country: base.country,
      skillsArr: base.skillsArr,
      bio: (() => {
        // Full bio for audit — don't truncate, metrics are deep in the text
        const os = pt.search(/\n(?:Full Stack|Senior|Junior|Lead|Expert|Freelance|Developer|Designer|Engineer|I build|I am|I help|I create)/i);
        if (os > -1) {
          const after = pt.slice(os, os + 3000);
          const end = after.search(/\n(?:Consultations|Portfolio|Work history|more\n)/i);
          return end > -1 ? after.slice(0, end).trim() : after.trim();
        }
        return base.bio;
      })(),
      completedJobs,
      avgRating: reviewTexts.length ? '5.0' : null,
      reviewCount: reviewTexts.length,
      reviewsText: reviewTexts.join('\n'),
      portfolioCount: portfolioItems.length,
      portfolioTitles,
      projectCatalogCount: catalogTitles.length,
      catalogTitles,
      aiSummary,
      testimonials: testimonials.join('\n'),
      testimonialCount: testimonials.length,
      certifications: certs.join('\n'),
      certificationCount: certs.length,
      employmentSummary: empSummary,
      employmentCount: empCount,
      education,
      languages,
      responseTime: respTime,
      availability,
      hasVideoIntro: false,
      githubLinked,
      stackOverflowLinked: soLinked,
    };
  }

  // ── Audit panel styles ────────────────────────────────────────────────────────
  function injectAuditStyles() {
    if (document.getElementById('snagai-audit-styles')) return;
    const s = document.createElement('style');
    s.id = 'snagai-audit-styles';
    s.textContent = `
      @keyframes sn-slide-in{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
      @keyframes sn-bar{from{width:0}to{width:var(--w)}}
      @keyframes snagai-spin{to{transform:rotate(360deg)}}

      #snagai-audit-panel{all:initial;position:fixed!important;top:0!important;right:0!important;width:340px!important;height:100vh!important;background:#0d0d12!important;border-left:1px solid rgba(255,255,255,.08)!important;z-index:2147483647!important;display:flex!important;flex-direction:column!important;animation:sn-slide-in .22s ease!important;overflow:hidden!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;box-sizing:border-box!important}
      #snagai-audit-panel *{box-sizing:border-box;font-family:inherit}

      .sn-hd{display:flex;align-items:center;gap:8px;padding:16px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0}
      .sn-hd-ico{width:26px;height:26px;background:#6366f1;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .sn-hd-lbl{font-size:13px;font-weight:600;color:#f0eeea;flex:1}
      .sn-hd-export{display:flex;align-items:center;gap:5px;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.3);color:#a5a8f5;border-radius:999px;padding:5px 10px;font-size:10.5px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background .15s,border-color .15s}
      .sn-hd-export:hover:not(:disabled){background:rgba(99,102,241,.2);border-color:rgba(99,102,241,.45)}
      .sn-hd-export:disabled{opacity:.35;cursor:default}
      .sn-hd-export svg{flex-shrink:0}
      .sn-hd-close{background:none;border:none;color:rgba(255,255,255,.35);font-size:15px;cursor:pointer;line-height:1;padding:2px}
      .sn-hd-close:hover{color:rgba(255,255,255,.7)}

      .sn-bd{flex:1;overflow-y:auto;padding-bottom:40px}
      .sn-bd::-webkit-scrollbar{width:3px}
      .sn-bd::-webkit-scrollbar-thumb{background:rgba(99,102,241,.2);border-radius:2px}

      .sn-ehero{padding:26px 24px 20px;border-bottom:1px solid rgba(255,255,255,.06)}
      .sn-escore-row{display:flex;align-items:center;gap:8px;margin-bottom:12px}
      .sn-escore-circle{width:34px;height:34px;border-radius:50%;border-width:1.5px;border-style:solid;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .sn-escore-num{font-size:13px;font-weight:700}
      .sn-estatus{font-size:10px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:rgba(240,238,234,.35)}
      .sn-eheadline{font-family:Georgia,'Times New Roman',serif;font-size:20px;font-style:italic;line-height:1.4;color:#f0eeea}

      .sn-ebody{padding:20px 24px}
      .sn-esec-title{font-family:Georgia,'Times New Roman',serif;font-size:13px;font-weight:700;color:#f0eeea;margin-bottom:6px}
      .sn-esec-body{font-size:12px;color:rgba(240,238,234,.55);line-height:1.75;margin-bottom:18px}

      .sn-equote{padding:14px 16px;border-left:2px solid #4ade80;background:rgba(74,222,128,.04);margin-bottom:18px}
      .sn-equote-txt{font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:12.5px;color:rgba(240,238,234,.75);line-height:1.6}

      .sn-efix-title{font-family:Georgia,'Times New Roman',serif;font-size:13px;font-weight:700;color:#f0eeea;margin-bottom:8px}
      .sn-efix-primary{font-size:12px;color:rgba(240,238,234,.7);line-height:1.8;margin-bottom:8px}
      .sn-efix-secondary{font-size:11px;color:rgba(240,238,234,.4);line-height:1.7;margin-top:4px}

      .sn-erate{font-size:11px;color:rgba(240,238,234,.35);font-style:italic;line-height:1.6;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.05)}

      .sn-load{display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:11px}
      .sn-spin{width:28px;height:28px;border:2px solid rgba(99,102,241,.12);border-top-color:#6366f1;border-radius:50%;animation:snagai-spin .6s linear infinite}
      .sn-load-t{font-size:12.5px;font-weight:500;color:rgba(240,238,234,.5)}
      .sn-load-s{font-size:11px;color:rgba(240,238,234,.22);text-align:center;max-width:190px;line-height:1.6}
    `;
    document.head.appendChild(s);
  }

  // ── Inject/open audit panel ───────────────────────────────────────────────────
  function openAuditPanel() {
    let panel = document.getElementById('snagai-audit-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'snagai-audit-panel';
      panel.innerHTML = `
        <div class="sn-hd">
          <div class="sn-hd-ico">
            <svg width="13" height="13" viewBox="0 0 100 100" fill="none">
              <rect x="5" y="5" width="64" height="78" rx="10" stroke="white" stroke-width="7" fill="none"/>
              <line x1="16" y1="24" x2="55" y2="24" stroke="white" stroke-width="7" stroke-linecap="round"/>
              <line x1="16" y1="40" x2="55" y2="40" stroke="white" stroke-width="7" stroke-linecap="round"/>
              <line x1="16" y1="56" x2="38" y2="56" stroke="white" stroke-width="7" stroke-linecap="round"/>
              <circle cx="76" cy="77" r="23" fill="#4338ca"/>
              <polygon points="80,59 70,78 77,78 73,95 88,74 81,74" fill="white"/>
            </svg>
          </div>
          <span class="sn-hd-lbl">Profile Audit</span>
          <button class="sn-hd-export" id="snagai-audit-export" disabled title="Export as PDF">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
            <span>PDF</span>
          </button>
          <button class="sn-hd-close" id="snagai-audit-close">✕</button>
        </div>
        <div class="sn-bd" id="snagai-audit-body">
          <div class="sn-load">
            <div class="sn-spin"></div>
            <div class="sn-load-t">Auditing your profile…</div>
            <div class="sn-load-s">Scoring 9 sections against top earner benchmarks</div>
          </div>
        </div>
      `;
      document.body.appendChild(panel);
      document.getElementById('snagai-audit-close').addEventListener('click', () => panel.remove());
      document.getElementById('snagai-audit-export').addEventListener('click', exportAuditPDF);
    }
    return panel;
  }

  // ── Export the rendered audit panel as a downloadable PDF ────────────────────
  async function exportAuditPDF() {
    const btn    = document.getElementById('snagai-audit-export');
    const panel  = document.getElementById('snagai-audit-panel');
    const bodyEl = document.getElementById('snagai-audit-body');
    if (!btn || btn.disabled || !panel || !bodyEl || !latestAuditResult) return;
    if (typeof html2canvas !== 'function' || !window.jspdf) {
      console.log('[SnagAI] PDF export unavailable — html2canvas/jsPDF not loaded');
      return;
    }

    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span>Exporting…</span>`;

    let captureRoot;
    try {
      const profileName = (latestAuditProfile && latestAuditProfile.name) || 'Your profile';
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // Off-screen capture root — stays a descendant of #snagai-audit-panel so the
      // panel's own CSS (fonts, colors, box-sizing reset) applies identically.
      // Rendered at report width (not the 340px sidebar width) so the exported
      // page reads like a document instead of a stretched, narrow sidebar strip.
      const REPORT_WIDTH = 760;
      captureRoot = document.createElement('div');
      captureRoot.style.cssText = `position:absolute;top:0;left:-9999px;width:${REPORT_WIDTH}px;background:#0d0d12`;
      captureRoot.innerHTML = `
        <div style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:12px">
          <div style="width:34px;height:34px;background:#6366f1;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="17" height="17" viewBox="0 0 100 100" fill="none">
              <rect x="5" y="5" width="64" height="78" rx="10" stroke="white" stroke-width="7" fill="none"/>
              <line x1="16" y1="24" x2="55" y2="24" stroke="white" stroke-width="7" stroke-linecap="round"/>
              <line x1="16" y1="40" x2="55" y2="40" stroke="white" stroke-width="7" stroke-linecap="round"/>
              <line x1="16" y1="56" x2="38" y2="56" stroke="white" stroke-width="7" stroke-linecap="round"/>
              <circle cx="76" cy="77" r="23" fill="#4338ca"/>
              <polygon points="80,59 70,78 77,78 73,95 88,74 81,74" fill="white"/>
            </svg>
          </div>
          <div>
            <div style="font-size:15px;font-weight:700;color:#f0eeea">Snag AI &mdash; Profile Audit Report</div>
            <div style="font-size:11.5px;color:rgba(240,238,234,.45);margin-top:2px">${profileName} &middot; ${dateStr}</div>
          </div>
        </div>
      `;

      const bodyClone = bodyEl.cloneNode(true);
      bodyClone.removeAttribute('id');
      bodyClone.style.cssText = `width:${REPORT_WIDTH}px;overflow:visible;height:auto;padding-bottom:28px`;
      captureRoot.appendChild(bodyClone);
      panel.appendChild(captureRoot);

      const canvas = await html2canvas(captureRoot, { backgroundColor: '#0d0d12', scale: 2, width: REPORT_WIDTH });

      // Lay the capture across standard A4 pages with margins, slicing into
      // multiple pages if the report is taller than one page.
      const { jsPDF } = window.jspdf;
      const doc    = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      const pageW  = doc.internal.pageSize.getWidth();
      const pageH  = doc.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgW = usableW;
      const imgH = (canvas.height / canvas.width) * imgW;

      let heightLeft = imgH;
      let y = margin;
      doc.addImage(imgData, 'JPEG', margin, y, imgW, imgH);
      heightLeft -= usableH;

      while (heightLeft > 0) {
        y = heightLeft - imgH + margin;
        doc.addPage();
        doc.addImage(imgData, 'JPEG', margin, y, imgW, imgH);
        heightLeft -= usableH;
      }

      const safeName = String(profileName).trim().replace(/[^a-z0-9]+/gi, '-').replace(/(^-+|-+$)/g, '') || 'profile';
      doc.save(`SnagAI-Profile-Audit-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);

      btn.innerHTML = `<span>Saved ✓</span>`;
    } catch (e) {
      console.log('[SnagAI] PDF export failed:', e.message);
      btn.innerHTML = `<span>Export failed</span>`;
    } finally {
      if (captureRoot) captureRoot.remove();
      setTimeout(() => { btn.disabled = false; btn.innerHTML = originalBtnHtml; }, 1800);
    }
  }

  // ── Render audit results ──────────────────────────────────────────────────────
  function renderAudit(audit) {
    const body = document.getElementById('snagai-audit-body');
    if (!body) return;

    const score  = parseFloat(audit.overallScore) || 0;
    const status = audit.status || 'Good';

    const SC = {
      Elite:    { c:'#c4b5fd', bg:'rgba(196,181,253,.08)', bd:'rgba(196,181,253,.18)' },
      Strong:   { c:'#4ade80', bg:'rgba(74,222,128,.07)',  bd:'rgba(74,222,128,.18)'  },
      Good:     { c:'#60a5fa', bg:'rgba(96,165,250,.07)',  bd:'rgba(96,165,250,.18)'  },
      Average:  { c:'#fbbf24', bg:'rgba(251,191,36,.07)',  bd:'rgba(251,191,36,.18)'  },
      Weak:     { c:'#fb923c', bg:'rgba(251,146,60,.07)',  bd:'rgba(251,146,60,.18)'  },
      Critical: { c:'#f87171', bg:'rgba(248,113,113,.07)', bd:'rgba(248,113,113,.18)' },
    };
    const st = SC[status] || SC.Good;

    const bc = n => n >= 8 ? '#4ade80' : n >= 6 ? '#60a5fa' : n >= 4 ? '#fbbf24' : '#f87171';
    const IC = { High:'#f87171', Medium:'#fbbf24', Low:'#60a5fa' };

    const secsHtml = (audit.sections || []).map(sec => {
      const c = bc(sec.score);
      const txt = sec.fix
        ? `${sec.finding || ''} — <span style="color:${c}">${sec.fix}</span>`
        : (sec.finding || '');
      return `<div class="sn-esec-title">${sec.label}</div><div class="sn-esec-body">${txt}</div>`;
    }).join('');

    const wins = audit.topWins || [];
    const quoteHtml = wins.length
      ? `<div class="sn-equote"><div class="sn-equote-txt">"${wins.join('. ')}."</div></div>`
      : '';

    const fixes = audit.topFixes || [];
    const primary = fixes[0];
    const fixHtml = primary ? `
      <div class="sn-efix-title">What to fix first</div>
      <div class="sn-efix-primary">${primary.action} — <span style="color:${IC[primary.impact] || '#60a5fa'}">${primary.impact} impact, fix this first.</span></div>
      ${fixes.slice(1).map(f => `<div class="sn-efix-secondary">${f.action} — <span style="color:${IC[f.impact] || '#60a5fa'}">${(f.impact||'').toLowerCase()} impact</span></div>`).join('')}
    ` : '';

    body.innerHTML = `
      <div class="sn-ehero">
        <div class="sn-escore-row">
          <div class="sn-escore-circle" style="border-color:${st.c}"><span class="sn-escore-num" style="color:${st.c}">${score.toFixed(1)}</span></div>
          <span class="sn-estatus">${status} profile</span>
        </div>
        ${audit.headline ? `<div class="sn-eheadline">"${audit.headline}"</div>` : ''}
      </div>
      <div class="sn-ebody">
        ${secsHtml}
        ${quoteHtml}
        ${fixHtml}
        ${audit.rateInsight ? `<div class="sn-erate">${audit.rateInsight}</div>` : ''}
      </div>
    `;

    latestAuditResult = audit;
    const exportBtn = document.getElementById('snagai-audit-export');
    if (exportBtn) exportBtn.disabled = false;
  }

  // ── Audit button ──────────────────────────────────────────────────────────────
  function injectAuditButton(onAudit) {
    if (document.getElementById('snagai-audit-trigger')) return;

    const wrap = document.createElement('div');
    wrap.id = 'snagai-audit-trigger';
    wrap.style.cssText = 'position:fixed;bottom:28px;right:200px;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

    const btn = document.createElement('button');
    btn.id = 'snagai-audit-btn';
    btn.style.cssText = 'display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#312e81,#4338ca);color:#f0eeea;border:1px solid rgba(99,102,241,.5);border-radius:50px;padding:11px 20px 11px 14px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 24px rgba(99,102,241,.35);transition:transform .2s,box-shadow .2s;font-family:inherit';
    btn.innerHTML = `
      <div style="width:24px;height:24px;background:rgba(255,255,255,.15);border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      <span>Audit Profile</span>
    `;
    btn.addEventListener('mouseenter', () => { btn.style.transform = 'translateY(-2px)'; btn.style.boxShadow = '0 8px 32px rgba(99,102,241,.5)'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; btn.style.boxShadow = '0 4px 24px rgba(99,102,241,.35)'; });

    btn.addEventListener('click', () => onAudit(btn));
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

    injectAuditStyles();

    injectAuditButton(async (btn) => {
      btn.disabled = true;
      btn.innerHTML = `
        <div style="width:24px;height:24px;background:rgba(255,255,255,.15);border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="display:inline-block;animation:snagai-spin .7s linear infinite;font-size:13px">↻</span>
        </div>
        <span>Auditing…</span>
      `;
      openAuditPanel();
      try {
        const auditData = await readAuditData();
        latestAuditProfile = auditData;
        console.log('[SnagAI] Audit data:', auditData);
        const audit = await chrome.runtime.sendMessage({ type: 'AUDIT_PROFILE', profile: auditData });
        if (audit?.error) throw new Error(audit.error);
        renderAudit(audit);
        btn.innerHTML = `
          <div style="width:24px;height:24px;background:rgba(74,222,128,.2);border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span>View Audit</span>
        `;
        btn.disabled = false;
        btn.onclick = () => {
          const p = document.getElementById('snagai-audit-panel');
          if (!p) { openAuditPanel(); renderAudit(audit); }
        };
      } catch(e) {
        const body = document.getElementById('snagai-audit-body');
        if (body) body.innerHTML = `<div style="padding:40px 24px;text-align:center;color:#f87171;font-size:13px">Audit failed: ${e.message}</div>`;
        btn.innerHTML = `<span>Retry</span>`;
        btn.disabled = false;
      }
    });

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
