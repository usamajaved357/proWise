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
  const UPWORK_TRAITS   = /^(Committed to|Clear Communicator|Accountable for|Detail Oriented|Solution Oriented|Collaborative$|Reliable$|Professional$|Deadline|Self-Motivated|Highly Organized|Effective Communicator|Client Focused|Results Driven|Independent|Interpersonal)/i;
  const PORTFOLIO_NOISE = /^(From \$|\$\d|Your project|Manage project|View project|Add project|Pagination|Current page|go to page|\d+ days delivery|\d+ hrs|of \d+$)/i;
  function isValidSkill(s) {
    if (!s || s.length < 2 || s.length > 60) return false;
    if (UPWORK_TRAITS.test(s) || PORTFOLIO_NOISE.test(s)) return false;
    if (/^\d+(\.\d+)?$/.test(s)) return false;
    if (/\$\d/.test(s)) return false;
    if (/\brating\b|\bout of \d|\bstars?\b|\breview/i.test(s)) return false;
    if (/^\d+\.\d+\s*out|^Rating is/i.test(s)) return false;
    if (/\b(is|was|are|were|have|has|had|will|would|could|should|need|want|looking|help|finishing|fixing|building)\b/i.test(s)) return false;
    if (/^(Help|Need|Want|Looking|Build|Fix|Create|Make|Develop|Design|Get|Find|Add|Update|Improve|Write|Test|Review|Deploy|Manage|Handle|Working|See|Show|View|Click|Go|Back|Next|Prev|Load|Save|Submit|Cancel|Close|Open)$/i.test(s)) return false;
    if (/^Published (on|in)\b|^\d{1,2},?\s+\d{4}$|^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(s)) return false;
    if (/\bdelivery\b|\bpaginat|\bcurrent page|\bgo to page/i.test(s)) return false;
    if (s.split(' ').length > 5) return false;
    return true;
  }

  // ── Skills ───────────────────────────────────────────────────────────────────
  // Upwork's Work History summary shows two auto-generated blocks that must never
  // be treated as the freelancer's editable Skills: "Skills used" (tags Uma infers
  // from completed jobs) and "Insights from completed jobs" (client-endorsed trait
  // words like "Professional", "Reliable"). Upwork sometimes renders all of these
  // with the same badge markup as the real Skills section, so an unscoped DOM query
  // can merge them together. We exclude everything between "Skills used" and
  // "Completed jobs (" — which spans both auto-generated blocks — from the real
  // skills list, while keeping a narrower "Skills used"→"Insights..." slice
  // separately labeled as Uma's inferred tags for informational context only.
  const SKILL_SELECTORS = ['.up-skill-badge','[data-test="FreelancerCard-skill"]','[data-test="skill-badge"]','.skill-name','[class*="skill-badge"]','[class*="skillBadge"]'];

  function findSkillsUsedRange() {
    const all = [...document.querySelectorAll('body *')].filter(el => el.children.length === 0);
    const start = all.find(el => /^skills used$/i.test((el.innerText || '').trim()));
    if (!start) return null;
    const tagsEnd = all.find(el => /^insights from completed jobs$/i.test((el.innerText || '').trim()));
    const fullEnd = all.find(el => /^completed jobs\s*\(/i.test((el.innerText || '').trim()));
    return { start, tagsEnd, fullEnd: fullEnd || tagsEnd };
  }

  function isBetween(el, start, end) {
    if (!start) return false;
    const afterStart = !!(start.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (!afterStart) return false;
    if (!end) return true;
    return !!(el.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  function readSkills() {
    const roots = [document.querySelector('[data-test="skills-section"]'), document.querySelector('[class*="skills-section"]'), document].filter(Boolean);
    const range = findSkillsUsedRange();
    for (const root of roots) {
      for (const sel of SKILL_SELECTORS) {
        try {
          const els = [...root.querySelectorAll(sel)].filter(e => !range || !isBetween(e, range.start, range.fullEnd));
          if (els.length > 0) {
            const ex = [...new Set(els.map(e => e.innerText.trim().split('\n')[0].trim()).filter(isValidSkill))];
            if (ex.length >= 2 || root !== document) return ex;
          }
        } catch(e) {}
      }
      if (root === roots[0] && roots.length > 1) continue; break;
    }
    let pt = document.body.innerText;
    const umaStart = pt.search(/Skills used/i);
    if (umaStart > -1) {
      const umaEnd = pt.search(/Completed jobs\s*\(/i);
      pt = umaEnd > umaStart ? pt.slice(0, umaStart) + pt.slice(umaEnd) : pt.slice(0, umaStart);
    }
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

  // ── Uma's AI-inferred "Skills used" tags (informational only, not editable) ───
  function readUmaSkillTags() {
    const range = findSkillsUsedRange();
    if (!range) return [];
    for (const sel of SKILL_SELECTORS) {
      try {
        const els = [...document.querySelectorAll(sel)].filter(e => isBetween(e, range.start, range.tagsEnd));
        if (els.length > 0) {
          return [...new Set(els.map(e => e.innerText.trim().split('\n')[0].trim()).filter(isValidSkill))];
        }
      } catch(e) {}
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

  // ── Suggestion-quote detection — shared between the sidebar and PDF export ────
  // Splits audit text into plain/highlighted segments wherever a literal
  // suggested replacement appears in quotes (single, straight-double, or curly),
  // normalizing the quote marks to curly double quotes. Only a real quoted phrase
  // is matched (opening quote must follow whitespace/start, closing quote must be
  // followed by whitespace/punctuation/end) so contractions like "Uma's" or
  // "clients'" are never mistaken for a suggestion.
  function parseSuggestionSegments(text) {
    if (!text) return [{ text: '', hl: false }];
    // Double quotes only (straight or curly) — matches the SOLUTION-ORIENTED
    // RULE's "wrap it in double quotes, never single quotes" instruction.
    // A straight/curly SINGLE quote must never be a delimiter here: any
    // contraction inside the quoted script ("I've", "Here's") contains an
    // apostrophe, and since '/' were previously valid closing-quote chars,
    // the excluded-character class made the whole match fail the moment it
    // hit that apostrophe — silently falling back to unhighlighted plain text.
    const re = /(^|[\s(])["“]([^"”]{4,}?)["”](?=[\s.,!?;:)]|$)/g;
    const segments = [];
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      const lead = m[1] || '';
      const start = m.index + lead.length;
      if (start > last) segments.push({ text: text.slice(last, start), hl: false });
      segments.push({ text: `“${m[2]}”`, hl: true });
      last = m.index + m[0].length;
    }
    if (last < text.length) segments.push({ text: text.slice(last), hl: false });
    return segments.length ? segments : [{ text, hl: false }];
  }

  function renderSuggestionHTML(text) {
    return parseSuggestionSegments(text)
      .map(seg => seg.hl ? `<span class="sn-quote-hl">${seg.text}</span>` : seg.text)
      .join('');
  }

  // ── PDF-only: word-wrap text into lines while tracking which words fall inside
  // a highlighted suggestion quote, so the "Suggested fix" box can render mixed
  // colors — jsPDF's doc.text() only supports a single color per call, so the
  // line has to be laid out and drawn word-by-word instead of as one string.
  function layoutRichWords(doc, text, fontSize, font, maxWidth) {
    doc.setFont(font, 'normal'); doc.setFontSize(fontSize);
    const spaceW = doc.getTextWidth(' ');
    const lines = [[]];
    let lineW = 0;
    parseSuggestionSegments(text).forEach(seg => {
      seg.text.split(' ').forEach(word => {
        if (word === '') return;
        const ww = doc.getTextWidth(word);
        if (lineW > 0 && lineW + spaceW + ww > maxWidth) {
          lines.push([]);
          lineW = 0;
        } else if (lineW > 0) {
          lineW += spaceW;
        }
        lines[lines.length - 1].push({ text: word, hl: seg.hl });
        lineW += ww;
      });
    });
    return lines;
  }

  function drawRichLines(doc, lines, x, startY, lineHeightMm, normalColor, hlColor, fontSize, font) {
    doc.setFont(font, 'normal'); doc.setFontSize(fontSize);
    const spaceW = doc.getTextWidth(' ');
    let y = startY;
    lines.forEach(line => {
      let cx = x;
      line.forEach(w => {
        doc.setTextColor(...(w.hl ? hlColor : normalColor));
        doc.text(w.text, cx, y);
        cx += doc.getTextWidth(w.text) + spaceW;
      });
      y += lineHeightMm;
    });
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

  // ── Toolbar icons ──────────────────────────────────────────────────────────
  const AUDIT_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
  const SYNC_ICON_SVG  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
  const LOGO_URL_PR    = chrome.runtime.getURL('icons/icon128.png');

  // ── Storage helpers ───────────────────────────────────────────────────────────
  const local = {
    get: keys => new Promise(r => chrome.storage.local.get(keys, r)),
    set: data => new Promise((res, rej) => chrome.storage.local.set(data, () =>
      chrome.runtime.lastError ? rej(new Error(chrome.runtime.lastError.message)) : res()
    )),
  };

  // ── Inject toolbar — single floating logo button + popup menu ────────────────
  // Same button treatment as the job page's floating trigger (transparent
  // circular logo, rotates while loading). Click opens a menu with Audit /
  // Sync instead of two separate icons sitting in a row.
  function injectToolbar(onAudit, onSync, showAudit = true, checkAuditGate = async () => ({ action: 'run' })) {
    if (document.getElementById('snagai-toolbar')) return;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes snagai-pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes snagai-spin{to{transform:rotate(360deg)}}
      #snagai-toolbar{position:fixed;bottom:28px;right:28px;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
      /* Same size/position as the job page's floating trigger */
      #snagai-main-btn{width:52px;height:52px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;padding:0;cursor:pointer;border-radius:50%;filter:drop-shadow(0 4px 14px rgba(0,0,0,.4));transition:transform .2s,filter .2s}
      #snagai-main-btn:hover{transform:translateY(-2px);filter:drop-shadow(0 6px 18px rgba(0,0,0,.5))}
      #snagai-main-btn:disabled{cursor:default}
      #snagai-main-logo{width:42px!important;height:42px!important;border-radius:50%!important;overflow:hidden!important;object-fit:cover!important;display:block!important;box-sizing:border-box!important}
      #snagai-main-logo.snagai-main-logo-spin{animation:snagai-spin .9s linear infinite}
      #snagai-main-btn.snagai-main-done{filter:drop-shadow(0 4px 14px rgba(5,150,105,.6))}
      #snagai-main-btn.snagai-main-error{filter:drop-shadow(0 4px 14px rgba(220,38,38,.6))}

      /* Menu — no card/panel background. Two small floating circular icon
         buttons stacked above the main button, each with its own subtle
         tinted ring instead of a boxed dropdown. */
      #snagai-menu{position:absolute;bottom:calc(100% + 14px);right:5px;display:flex;flex-direction:column;align-items:center;gap:12px;opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .15s,transform .15s}
      #snagai-menu.snagai-menu-open{opacity:1;transform:translateY(0);pointer-events:auto}
      .snagai-menu-item{
        width:38px;height:38px;border-radius:50%;
        background: linear-gradient(rgba(17,24,39,.92), rgba(17,24,39,.92)) padding-box,
                    linear-gradient(120deg, rgba(45,212,191,.75), rgba(168,85,247,.65), rgba(236,72,153,.7)) border-box;
        border:1.5px solid transparent;
        color:#c7d2fe;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;flex-shrink:0;backdrop-filter:blur(6px);filter:drop-shadow(0 3px 10px rgba(0,0,0,.4));transition:transform .15s,filter .15s
      }
      .snagai-menu-item:hover{transform:scale(1.1);filter:drop-shadow(0 4px 14px rgba(0,0,0,.5))}
      .snagai-menu-live-dot{position:absolute;top:-1px;right:-1px;width:7px;height:7px;background:#34d399;border-radius:50%;border:1.5px solid #0d1120;animation:snagai-pulse 2s ease-in-out infinite}
      .snagai-menu-tip{position:absolute;right:calc(100% + 10px);top:50%;transform:translateY(-50%);background:#1a1f2e;color:#f0eeea;font-size:11px;font-weight:500;white-space:nowrap;padding:5px 10px;border-radius:7px;opacity:0;pointer-events:none;transition:opacity .15s;box-shadow:0 4px 14px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.08)}
      .snagai-menu-item:hover .snagai-menu-tip{opacity:1}
      .snagai-menu-item.snagai-menu-locked{opacity:.35;cursor:not-allowed}
      .snagai-menu-item.snagai-menu-locked:hover{transform:none}

      #snagai-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(8px);background:#1a1830;border:1px solid rgba(248,113,113,.3);color:rgba(240,238,255,.9);font-size:12px;font-weight:500;line-height:1.4;padding:10px 16px;border-radius:10px;max-width:280px;text-align:center;z-index:2147483647;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;box-shadow:0 8px 24px rgba(0,0,0,.45)}
      #snagai-toast.snagai-toast-show{opacity:1;transform:translateX(-50%) translateY(0)}
    `;
    document.head.appendChild(style);

    // #snagai-toolbar's own position:fixed (see stylesheet above) already
    // establishes the containing block #snagai-menu's position:absolute
    // anchors to — no need for a separate position:relative wrapper, and
    // setting one here as an inline style would win over the fixed rule by
    // specificity and silently break the floating position entirely.
    const wrap = document.createElement('div');
    wrap.id = 'snagai-toolbar';
    wrap.innerHTML = `
      <button id="snagai-main-btn" title="Snag AI">
        <img id="snagai-main-logo" src="${LOGO_URL_PR}" width="42" height="42" alt="">
      </button>
      <div id="snagai-menu">
        ${showAudit ? `
        <button class="snagai-menu-item" id="snagai-menu-audit">
          ${AUDIT_ICON_SVG}
          <span class="snagai-menu-tip">Audit this profile</span>
        </button>` : ''}
        <button class="snagai-menu-item" id="snagai-menu-sync">
          ${SYNC_ICON_SVG}
          <span class="snagai-menu-live-dot"></span>
          <span class="snagai-menu-tip">Sync this profile</span>
        </button>
      </div>
    `;
    document.body.appendChild(wrap);

    const mainBtn = document.getElementById('snagai-main-btn');
    const mainLogo = document.getElementById('snagai-main-logo');
    const menu = document.getElementById('snagai-menu');
    const auditMenuItem = document.getElementById('snagai-menu-audit');

    let toastTimer = null;
    function showGateToast(msg) {
      let toast = document.getElementById('snagai-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'snagai-toast';
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      requestAnimationFrame(() => toast.classList.add('snagai-toast-show'));
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('snagai-toast-show'), 3200);
    }

    function setState(state) {
      // state: 'idle' | 'loading' | 'done' | 'error'
      mainBtn.disabled = (state === 'loading');
      mainLogo.classList.toggle('snagai-main-logo-spin', state === 'loading');
      mainBtn.classList.toggle('snagai-main-done', state === 'done');
      mainBtn.classList.toggle('snagai-main-error', state === 'error');
      if (state === 'done' || state === 'error') {
        setTimeout(() => mainBtn.classList.remove('snagai-main-done', 'snagai-main-error'), 2000);
      }
    }

    function closeMenu() { menu.classList.remove('snagai-menu-open'); }
    async function toggleMenu() {
      const opening = !menu.classList.contains('snagai-menu-open');
      menu.classList.toggle('snagai-menu-open');
      // Reflect the gate visually as soon as the menu opens, not just after
      // a failed click — a locked-looking button is clearer than a live one
      // that silently refuses on click.
      if (opening && auditMenuItem) {
        const gate = await checkAuditGate();
        auditMenuItem.classList.toggle('snagai-menu-locked', gate.action === 'blocked');
      }
    }

    async function runAudit() {
      closeMenu();
      const gate = await checkAuditGate();

      if (gate.action === 'blocked') {
        showGateToast('No more profile audits available this month. Resets on your next billing cycle.');
        return;
      }

      if (gate.action === 'cached') {
        // Already audited this profile this cycle — show what's already
        // there instead of spending another credit re-running it.
        openAuditPanel();
        renderAudit(gate.audit);
        return;
      }

      setState('loading');
      const panel = openAuditPanel();
      // openAuditPanel() only builds the loading spinner when the panel
      // doesn't exist yet — if it's already open from a previous run, force
      // it back to loading now so a re-run doesn't leave the old result
      // frozen on screen while the new audit fetches silently behind it.
      const body = panel.querySelector('#snagai-audit-body');
      if (body) body.innerHTML = `
        <div class="sn-load">
          <div class="sn-spin"></div>
          <div class="sn-load-t">Auditing your profile…</div>
          <div class="sn-load-s">Scoring 9 sections against top earner benchmarks</div>
        </div>`;
      const exportBtn = panel.querySelector('#snagai-audit-export');
      if (exportBtn) exportBtn.disabled = true;
      try {
        await onAudit();
        setState('done');
      } catch(e) {
        setState('error');
        const body = document.getElementById('snagai-audit-body');
        if (body) body.innerHTML = `<div style="padding:40px 24px;text-align:center;color:#f87171;font-size:13px">Audit failed: ${e.message}</div>`;
      }
    }

    async function runSync() {
      closeMenu();
      setState('loading');
      try {
        await onSync();
        setState('done');
      } catch(e) {
        setState('error');
      }
    }

    // Audit is gated by "Profile audit" (not on Basic) — Sync never is. With
    // only one real action left, skip the popup and sync directly instead of
    // opening a one-item menu.
    mainBtn.addEventListener('click', () => {
      if (mainBtn.disabled) return;
      if (!showAudit) { runSync(); return; }
      toggleMenu();
    });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) closeMenu(); });

    document.getElementById('snagai-menu-audit')?.addEventListener('click', runAudit);
    document.getElementById('snagai-menu-sync')?.addEventListener('click', runSync);
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
    const reviewRe = /Rating is (\d+(?:\.\d+)?) out of 5\.[\s\S]{1,200}?[“”"]([^“”"\n]{10,800})[“”"]/gi;
    let rm;
    while ((rm = reviewRe.exec(pt)) !== null && reviewTexts.length < 8) {
      const rating = rm[1];
      const text = rm[2].trim();
      if (text.length > 10) reviewTexts.push(`${rating}★ — "${text}"`);
    }

    // Portfolio — full data via Vuex store (all pages, titles + desc + urls + skills)
    const portfolioItems = await readPortfolioTitles();
    const portfolioTitles = portfolioItems.map(p => {
      const parts = [p.title];
      if (p.role) parts.push(p.role);
      if (p.skills?.length) parts.push('Skills: ' + p.skills.join(', '));
      if (p.desc) parts.push(p.desc);
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
    const empSection = pt.match(/Employment history\n([\s\S]{0,8000}?)(?:\nOther experiences|\nFooter navigation)/i);
    const empSummary = empSection ? empSection[1].trim() : '';
    const empCount = (empSection?.[1].match(/\n[A-Z].{10,100}\n\s*\n[A-Z]/g) || []).length || (empSection ? 1 : 0);

    // Other experiences — additional roles Upwork lists separately from Employment history
    const otherExpSection = pt.match(/\nOther experiences\n([\s\S]{0,6000}?)(?:\nFooter navigation|\nTestimonials|\nCertifications|$)/i);
    const otherExperience = otherExpSection ? otherExpSection[1].trim() : '';

    // Video introduction — the "Video introduction" heading appears in the
    // freelancer's own self-view regardless of whether one is recorded (it's
    // a settings/CTA section), so the heading's presence alone is not a
    // signal. A real recorded video shows its duration ("0:45" etc.) directly
    // under the heading; an unrecorded one goes straight to the next section
    // with nothing in between — so the duration timestamp is what we check for.
    const hasVideoIntro = /Video introduction\s*\n\s*\d{1,2}:\d{2}/i.test(pt);

    // ID verification — under "Verifications", the "ID:" label is immediately
    // followed by "Verified" only when Upwork has actually verified it.
    const idVerified = /ID:\s*\n?\s*Verified/i.test(pt);

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
      umaSkillTags: readUmaSkillTags(),
      bio: (() => {
        // Full bio for audit — don't truncate, metrics are deep in the text.
        // Search from after the hourly-rate line (title/rate always precede the
        // bio) so a title starting with "Full Stack"/"Senior"/etc. doesn't get
        // mistaken for the bio's own opening line.
        const rateIdx = pt.search(/\$\d+(?:\.\d+)?\s*\/\s*hr/i);
        const searchFrom = rateIdx > -1 ? rateIdx : 0;
        const relOs = pt.slice(searchFrom).search(/\n(?:Full Stack|Senior|Junior|Lead|Expert|Freelance|Developer|Designer|Engineer|I build|I am|I help|I create)/i);
        if (relOs > -1) {
          const os = searchFrom + relOs;
          const after = pt.slice(os, os + 6000);
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
      otherExperience,
      education,
      languages,
      responseTime: respTime,
      availability,
      hasVideoIntro,
      idVerified,
      githubLinked,
      stackOverflowLinked: soLinked,
    };
  }

  // Code-verified diff between the profile snapshot used for the previous audit
  // and the current one — handed to the model as ground truth so it judges
  // whether a change addresses a prior gap instead of having to detect the
  // change itself from raw text (the same class of task that made the
  // self-computed overallScore unreliable).
  function diffSkillList(oldArr, newArr) {
    const norm = s => (s || '').toLowerCase().trim();
    const oldSet = new Set((oldArr || []).map(norm));
    const newSet = new Set((newArr || []).map(norm));
    return {
      added: (newArr || []).filter(s => !oldSet.has(norm(s))),
      removed: (oldArr || []).filter(s => !newSet.has(norm(s))),
    };
  }

  function computeProfileChanges(prev, cur) {
    if (!prev) return null;
    const lines = [];

    lines.push((prev.title || '') === (cur.title || '')
      ? 'TITLE: unchanged'
      : `TITLE: changed — "${prev.title || ''}" → "${cur.title || ''}"`);

    const { added, removed } = diffSkillList(prev.skillsArr, cur.skillsArr);
    lines.push(`SKILLS ADDED: ${added.length ? added.join(', ') : 'none'}`);
    lines.push(`SKILLS REMOVED: ${removed.length ? removed.join(', ') : 'none'}`);

    lines.push((prev.bio || '') === (cur.bio || '')
      ? 'BIO: unchanged'
      : `BIO: changed (${(prev.bio || '').length} → ${(cur.bio || '').length} chars)`);

    lines.push((prev.rate || '') === (cur.rate || '')
      ? `RATE: unchanged (${cur.rate || 'not set'})`
      : `RATE: changed — ${prev.rate || 'not set'} → ${cur.rate || 'not set'}`);

    const prevPort = prev.portfolioCount || 0, curPort = cur.portfolioCount || 0;
    if (prevPort === curPort) {
      lines.push(`PORTFOLIO ITEMS: unchanged (${curPort})`);
    } else {
      const delta = curPort - prevPort;
      lines.push(`PORTFOLIO ITEMS: ${prevPort} → ${curPort} (${delta > 0 ? '+' + delta + ' new' : delta})`);
    }

    const prevCerts = prev.certificationCount || 0, curCerts = cur.certificationCount || 0;
    lines.push(prevCerts === curCerts
      ? `CERTIFICATIONS: unchanged (${curCerts})`
      : `CERTIFICATIONS: ${prevCerts} → ${curCerts}`);

    const prevEmp = prev.employmentCount || 0, curEmp = cur.employmentCount || 0;
    lines.push(prevEmp === curEmp
      ? `EMPLOYMENT HISTORY: unchanged (${curEmp} positions)`
      : `EMPLOYMENT HISTORY: ${prevEmp} → ${curEmp} positions`);

    return lines.join('\n');
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
      .sn-hd-ico{width:26px;height:26px;background:transparent;display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .sn-hd-ico img{width:26px!important;height:26px!important;border-radius:50%!important;overflow:hidden!important;object-fit:cover!important;display:block!important;box-sizing:border-box!important}
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
      .sn-quote-hl{color:#a5b4fc}

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
            <img src="${LOGO_URL_PR}" width="26" height="26" alt="">
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

  // ── Export the audit as a downloadable PDF ────────────────────────────────────
  // Drawn natively with jsPDF (vector text, not a screenshot) on a clean light
  // page — the on-screen panel stays dark, but a dark page is a bad print/PDF
  // convention, so the exported report gets its own light, standard-size layout.
  async function exportAuditPDF() {
    const btn = document.getElementById('snagai-audit-export');
    if (!btn || btn.disabled || !latestAuditResult) return;
    if (!window.jspdf) {
      console.log('[SnagAI] PDF export unavailable — jsPDF not loaded');
      return;
    }

    const originalBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span>Exporting…</span>`;

    try {
      const audit = latestAuditResult;
      const profileName = (latestAuditProfile && latestAuditProfile.name) || 'Your profile';
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

      // ── palette (print-safe — darker than the on-screen neon so text stays legible on white) ──
      const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
      const INK = hx('#17171f'), MUTED = hx('#63636f'), FAINT = hx('#9b9ba6'), LINE = hx('#e4e4ea');
      const INDIGO = hx('#4f46e5'), INDIGO_BG = hx('#eef0fd'), INDIGO_DK = hx('#3730a3');
      const GREEN = hx('#15803d'), GREEN_BG = hx('#f0fdf4');
      const AMBER = hx('#b45309'), AMBER_BG = hx('#fffbeb');
      const RED = hx('#b91c1c'), RED_BG = hx('#fef2f2');
      const BLUE = hx('#1d4ed8'), BLUE_BG = hx('#eff6ff');
      const PURPLE = hx('#6d28d9'), ORANGE = hx('#c2410c');
      const STATUS_COLOR = { Elite: PURPLE, Strong: GREEN, Good: BLUE, Average: AMBER, Weak: ORANGE, Critical: RED };
      const BUCKET = n => n >= 8 ? { fg: GREEN, bg: GREEN_BG } : n >= 6 ? { fg: BLUE, bg: BLUE_BG } : n >= 4 ? { fg: AMBER, bg: AMBER_BG } : { fg: RED, bg: RED_BG };
      const IMPACT = { High: { fg: RED, bg: RED_BG }, Medium: { fg: AMBER, bg: AMBER_BG }, Low: { fg: BLUE, bg: BLUE_BG } };

      // ── layout ──
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginX = 18, marginTop = 18, marginBottom = 16;
      const contentW = pageW - marginX * 2;
      let page = 1, y = marginTop;

      const lineH = (size, factor = 1.32) => size * factor * 0.3528;
      const wrapped = (text, size, font = 'helvetica', style = 'normal', width = contentW) => {
        doc.setFont(font, style); doc.setFontSize(size);
        return doc.splitTextToSize(String(text || ''), width);
      };

      function drawHeader(full) {
        if (full) {
          doc.setFillColor(...INDIGO);
          doc.roundedRect(marginX, y, 9, 9, 2, 2, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
          doc.text('S', marginX + 4.5, y + 6.3, { align: 'center' });

          doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...INK);
          doc.text('Snag AI — Profile Audit Report', marginX + 13, y + 5.6);

          doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
          doc.text(`${profileName}  ·  ${dateStr}`, marginX + 13, y + 10.6);

          y += 16;
        } else {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...INDIGO);
          doc.text('SNAG AI — PROFILE AUDIT REPORT', marginX, y);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...FAINT);
          doc.text(`${profileName}`, pageW - marginX, y, { align: 'right' });
          y += 5;
        }
        doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
        doc.line(marginX, y, pageW - marginX, y);
        y += full ? 9 : 8;
      }

      function ensureSpace(needed) {
        if (y + needed > pageH - marginBottom) {
          doc.addPage();
          page++;
          y = marginTop;
          drawHeader(false);
        }
      }

      // ── hero: score, status, headline ──
      drawHeader(true);

      const score = parseFloat(audit.overallScore) || 0;
      const status = audit.status || 'Good';
      const stColor = STATUS_COLOR[status] || BLUE;
      const r = 11, cx = marginX + r, cy = y + r;

      doc.setDrawColor(...stColor); doc.setLineWidth(1.1);
      doc.circle(cx, cy, r, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...stColor);
      doc.text(score.toFixed(1), cx, cy + 1.6, { align: 'center' });

      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...FAINT);
      doc.text(`${status.toUpperCase()} PROFILE`, cx + r + 7, cy - 0.5);

      y += r * 2 + 7;

      if (audit.headline) {
        const lines = wrapped(`“${audit.headline}”`, 15, 'times', 'italic');
        doc.setTextColor(...INK);
        doc.text(lines, marginX, y);
        y += lines.length * lineH(15) + 8;
      }

      doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
      doc.line(marginX, y, pageW - marginX, y);
      y += 10;

      // ── sections: diagnosis + concrete suggested fix ──
      (audit.sections || []).forEach(sec => {
        ensureSpace(16);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...INK);
        doc.text(sec.label || '', marginX, y);

        const b = BUCKET(sec.score);
        const badgeLabel = `${sec.score}/10`;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        const bw = doc.getTextWidth(badgeLabel) + 6;
        doc.setFillColor(...b.bg);
        doc.roundedRect(pageW - marginX - bw, y - 4.2, bw, 5.6, 1.4, 1.4, 'F');
        doc.setTextColor(...b.fg);
        doc.text(badgeLabel, pageW - marginX - bw / 2, y - 0.5, { align: 'center' });
        y += 7;

        if (sec.finding) {
          const lines = wrapped(sec.finding, 9.5);
          const h = lines.length * lineH(9.5);
          ensureSpace(h + 4);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...MUTED);
          doc.text(lines, marginX, y);
          y += h + 4;
        }

        if (sec.fix) {
          const innerW = contentW - 14;
          const richLines = layoutRichWords(doc, sec.fix, 9.5, 'helvetica', innerW);
          const boxH = richLines.length * lineH(9.5) + 11;
          ensureSpace(boxH + 6);
          doc.setFillColor(...INDIGO_BG);
          doc.roundedRect(marginX, y, contentW, boxH, 2, 2, 'F');
          doc.setFillColor(...INDIGO);
          doc.rect(marginX, y, 1.3, boxH, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.3); doc.setTextColor(...INDIGO_DK);
          doc.text('SUGGESTED FIX', marginX + 6, y + 5.5);
          drawRichLines(doc, richLines, marginX + 6, y + 10.3, lineH(9.5), INK, INDIGO, 9.5, 'helvetica');
          y += boxH + 9;
        } else {
          y += 5;
        }
      });

      // ── what's working ──
      const wins = audit.topWins || [];
      if (wins.length) {
        const quoteText = `“${wins.join('. ')}.”`;
        const qLines = wrapped(quoteText, 10, 'times', 'italic', contentW - 14);
        const boxH = qLines.length * lineH(10) + 10;
        ensureSpace(boxH + 8);
        doc.setFillColor(...GREEN_BG);
        doc.roundedRect(marginX, y, contentW, boxH, 2, 2, 'F');
        doc.setFillColor(...GREEN);
        doc.rect(marginX, y, 1.3, boxH, 'F');
        doc.setFont('times', 'italic'); doc.setFontSize(10); doc.setTextColor(...INK);
        doc.text(qLines, marginX + 7, y + 7);
        y += boxH + 10;
      }

      // ── what to fix first ──
      const fixes = audit.topFixes || [];
      if (fixes.length) {
        ensureSpace(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...INK);
        doc.text('What to fix first', marginX, y);
        y += 9;

        fixes.forEach(f => {
          const imp = IMPACT[f.impact] || IMPACT.Medium;
          const lines = wrapped(f.action, 9.8, 'helvetica', 'normal', contentW - 14);
          const textH = lines.length * lineH(9.8);
          ensureSpace(textH + 13);

          doc.setFillColor(...imp.fg);
          doc.circle(marginX + 3, y + 2.4, 3, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
          doc.text(String(f.priority), marginX + 3, y + 3.5, { align: 'center' });

          doc.setFont('helvetica', 'normal'); doc.setFontSize(9.8); doc.setTextColor(...INK);
          doc.text(lines, marginX + 9, y + 1.6);

          const impLabel = `${(f.impact || '').toUpperCase()} IMPACT`;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
          const iw = doc.getTextWidth(impLabel) + 5;
          const impY = y + 1.6 + textH + 2;
          doc.setFillColor(...imp.bg);
          doc.roundedRect(marginX + 9, impY - 3.6, iw, 4.8, 1.2, 1.2, 'F');
          doc.setTextColor(...imp.fg);
          doc.text(impLabel, marginX + 9 + iw / 2, impY - 0.3, { align: 'center' });

          y += textH + 13;
        });
      }

      // ── rate insight ──
      if (audit.rateInsight) {
        const lines = wrapped(audit.rateInsight, 9, 'times', 'italic');
        const h = lines.length * lineH(9);
        ensureSpace(h + 10);
        doc.setDrawColor(...LINE); doc.setLineWidth(0.3);
        doc.line(marginX, y, pageW - marginX, y);
        y += 7;
        doc.setFont('times', 'italic'); doc.setFontSize(9); doc.setTextColor(...MUTED);
        doc.text(lines, marginX, y);
        y += h;
      }

      // ── footer + page numbers on every page ──
      const total = doc.internal.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...FAINT);
        doc.text('Generated by Snag AI', marginX, pageH - 9);
        doc.text(`Page ${p} of ${total}`, pageW - marginX, pageH - 9, { align: 'right' });
      }

      const safeName = String(profileName).trim().replace(/[^a-z0-9]+/gi, '-').replace(/(^-+|-+$)/g, '') || 'profile';
      doc.save(`SnagAI-Profile-Audit-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);

      btn.innerHTML = `<span>Saved ✓</span>`;
    } catch (e) {
      console.log('[SnagAI] PDF export failed:', e.message);
      btn.innerHTML = `<span>Export failed</span>`;
    } finally {
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

    const IC = { High:'#f87171', Medium:'#fbbf24', Low:'#60a5fa' };

    const secsHtml = (audit.sections || []).map(sec => {
      const txt = sec.fix
        ? `${renderSuggestionHTML(sec.finding || '')} — ${renderSuggestionHTML(sec.fix)}`
        : renderSuggestionHTML(sec.finding || '');
      return `<div class="sn-esec-title">${sec.label}</div><div class="sn-esec-body">${txt}</div>`;
    }).join('');

    const wins = audit.topWins || [];
    const quoteHtml = wins.length
      ? `<div class="sn-equote"><div class="sn-equote-txt">"${renderSuggestionHTML(wins.join('. '))}."</div></div>`
      : '';

    const fixes = audit.topFixes || [];
    const primary = fixes[0];
    const fixHtml = primary ? `
      <div class="sn-efix-title">What to fix first</div>
      <div class="sn-efix-primary">${renderSuggestionHTML(primary.action)} — <span style="color:${IC[primary.impact] || '#60a5fa'}">${primary.impact} impact, fix this first.</span></div>
      ${fixes.slice(1).map(f => `<div class="sn-efix-secondary">${renderSuggestionHTML(f.action)} — <span style="color:${IC[f.impact] || '#60a5fa'}">${(f.impact||'').toLowerCase()} impact</span></div>`).join('')}
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
        ${audit.rateInsight ? `<div class="sn-erate">${renderSuggestionHTML(audit.rateInsight)}</div>` : ''}
      </div>
    `;

    latestAuditResult = audit;
    const exportBtn = document.getElementById('snagai-audit-export');
    if (exportBtn) exportBtn.disabled = false;
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
    const lastAuditKey = 'lastAudit_' + profileId;
    const originUrl = target.url;

    injectAuditStyles();

    // Fail-open on a network error — don't hide the button for an entitled
    // user just because GET_STATUS timed out; the server still enforces the
    // real gate when the button is clicked.
    let showAuditBtn = true;
    try {
      const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      if (status && status.auditLimit === 0) showAuditBtn = false;
    } catch(e) {}

    // Each plan allows a fixed number of profile audits per billing month
    // (server enforces this — see canAudit/recordAuditUsage in usage.js).
    // Client-side, this decides between three outcomes on click: show the
    // cached report for THIS profile if it was already audited this same
    // cycle (no server call, no credit spent); block with a toast if the
    // cycle's credit(s) were spent on a different profile; otherwise let a
    // fresh audit run. "This cycle" is tracked by tagging the cached audit
    // with the month it was run in and comparing to the current month —
    // simpler and self-contained vs. round-tripping billing-cycle dates.
    const lastAuditMonthKey = lastAuditKey + '_month';
    async function checkAuditGate() {
      const nowMonth = new Date().toISOString().slice(0, 7);
      const stored = await local.get([lastAuditKey, lastAuditMonthKey]);
      const cachedAudit = stored[lastAuditKey];
      const cachedMonth = stored[lastAuditMonthKey];
      // No month tag means this was cached before that tracking existed —
      // treat it as current rather than silently re-running (or worse,
      // blocking) on a perfectly good existing report. Only a month tag
      // that's explicitly a DIFFERENT month means "this is stale, allow a
      // fresh run."
      if (cachedAudit && (!cachedMonth || cachedMonth === nowMonth)) {
        return { action: 'cached', audit: cachedAudit };
      }
      try {
        const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
        if (status && status.remainingAudits === 0) return { action: 'blocked' };
      } catch(e) { /* fail open — server still enforces the real gate */ }
      return { action: 'run' };
    }

    injectToolbar(async () => {
      // Panel is already open (injectToolbar's runAudit does that) with its
      // own "Auditing your profile…" loading state; button loading/error
      // state is also owned by the wrapper — this just does the actual work
      // and throws on failure so the wrapper's catch handles it.
      const auditData = await readAuditData();
      // Clean snapshot of this run's profile fields, saved below for the
      // *next* audit's code-verified diff — captured before we attach
      // previousAudit/profileChanges context onto auditData.
      const profileSnapshotForDiff = { ...auditData };
      // Attach the last audit run for this profile so the model can check
      // whether its own previous suggestions were actually implemented,
      // instead of re-evaluating from a blank slate every time.
      const lastAuditProfileKey = lastAuditKey + '_profile';
      const { [lastAuditKey]: previousAudit, [lastAuditProfileKey]: previousProfileSnapshot } =
        await local.get([lastAuditKey, lastAuditProfileKey]);
      if (previousAudit) auditData.previousAudit = previousAudit;
      if (previousProfileSnapshot) auditData.profileChanges = computeProfileChanges(previousProfileSnapshot, auditData);
      latestAuditProfile = auditData;
      console.log('[SnagAI] Audit data:', auditData);
      const audit = await chrome.runtime.sendMessage({ type: 'AUDIT_PROFILE', profile: auditData });
      if (audit?.error) throw new Error(audit.error);
      renderAudit(audit);
      await local.set({
        [lastAuditKey]: audit,
        [lastAuditProfileKey]: profileSnapshotForDiff,
        [lastAuditMonthKey]: new Date().toISOString().slice(0, 7),
      });
    }, async () => {
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

    }, showAuditBtn, checkAuditGate);
  }

  if (document.readyState === 'complete') setTimeout(() => init(), 1500);
  else window.addEventListener('load', () => setTimeout(() => init(), 1500));
})();
