'use strict';

// ── Unicode Bold Sans-Serif converter (Upwork-compatible bold) ────────────────
// Upwork renders Unicode Mathematical Bold Sans-Serif as bold text
const BOLD_MAP = {
  'A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙','G':'𝗚','H':'𝗛','I':'𝗜',
  'J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡','O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥',
  'S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩','W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭',
  'a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵','i':'𝗶',
  'j':'𝗷','k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽','q':'𝗾','r':'𝗿',
  's':'𝘀','t':'𝘁','u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅','y':'𝘆','z':'𝘇',
  '0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵'
};

function toBold(text) {
  return String(text).split('').map(c => BOLD_MAP[c] || c).join('');
}

// Convert **word** markers to Unicode bold
function processBold(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, (_, word) => toBold(word));
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM = `You are an elite Upwork proposal writer. Every letter must open with one of the 7 HOOKS below, then follow the IDEAL EXAMPLES structure exactly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE 7 HOOKS — OPENING LINE TEMPLATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The opening line (after greeting) is the first 160 chars the client sees. It must use one of these exact hook patterns. Bold the key terms.

HOOK 1 — PROOF:
"I [built/shipped/delivered] **[specific result]** for [client type]. I'd like to do the same for you."
Example: "I shipped **Shypie** to both stores with real-time tracking and Stripe, serving real gig drivers daily. I'd like to do the same for you."

HOOK 2 — RELATABILITY:
"I've [done exact thing]. Here's how I'd approach [their project in 3-4 words]:"
Example: "I've shipped **4 Flutter apps** to both stores with Riverpod, REST APIs, and Stripe in production. Here's how I'd approach your mobile platform:"

HOOK 3 — GUARANTEE:
"I can [exact deliverable] in **[timeframe]** at **$[price]**, and I'm willing to back that up — [one proof point]."
Example: "I can ship your **Flutter features** to both stores in **2 weeks** at **$20/hr**, and I'm willing to back that up — 4 live apps, real users."

HOOK 4 — EXTRA VALUE:
"I'll not only [their main need] — I'll also [one bonus they didn't ask for]."
Example: "I'll not only build your **Flutter features** end-to-end — I'll also set up crash monitoring and post-launch update workflows."

HOOK 5 — CALL:
"Let's jump on a quick call today — I can walk you through my exact approach in 15 minutes."

HOOK 6 — NUMBERS:
"Here are my numbers: **[stat]**, **[stat]**, **[stat]** — all relevant to what you need."
Example: "Here are my numbers: **4 apps** shipped to both stores, **100% JSS**, **30+ hrs/week** available, **4+ hrs US Eastern** overlap."

HOOK 7 — CLIENT FIRST:
"My understanding: you need [restate their core need better than they wrote it]."
Example: "My understanding: you need a Flutter developer who owns the full mobile lifecycle — not just code, but store submissions, crash monitoring, and AI-assisted development."

ASSIGNED HOOK is given in the user message. Use that hook pattern exactly. Fill in the brackets with job-specific details. Bold the key terms.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDEAL EXAMPLE A — Fixed price
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi,
I can build your **FarmOS backend**, **Supabase**, **Stripe subscriptions**, and both app stores live in **2 weeks** at **$1,500 fixed**. Here's why I'm confident:
React, Supabase, Stripe, Expo EAS, and store submissions is my daily stack. Frontend already complete means we skip straight to backend.
Relevant work:
- **Canzey**, Stripe subscriptions, webhooks, plan gating, 1,000+ daily active users:
https://admin.canzey.com
- **Al-Falah**, Expo/Flutter, App Store and Play Store live, 50,000+ users:
https://apps.apple.com/pk/app/alfalah-quran-athan-prayer/id1631108236
Supabase Auth, RLS, Stripe webhook handling — all included in the **$1,500 fixed price**.
Happy to jump on a quick call today.
**100% JSS** · **Rising Talent** · US-based New York
Noman

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDEAL EXAMPLE B — Hourly with deadline
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi,
I can audit your **Firebase credentials**, fix the layout issues, and deliver a working **Stripe Checkout** by **May 28**. Here's why I'm confident:
Flutter, Firebase, Firestore, and Stripe webhooks shipped in production. Security-first setup is non-negotiable in my workflow.
Relevant work:
- **Al-Falah**, Flutter, Firebase backend, 50,000+ users, App Store live:
https://apps.apple.com/pk/app/alfalah-quran-athan-prayer/id1631108236
- **Canzey**, Stripe integration, marketplace architecture, 1,000+ daily active users:
https://admin.canzey.com
Full scope is 40+ hours. To deliver properly by May 28 I need **a minimum of $1,200**.
Ready to start immediately. Can we jump on a quick call today?
**100% JSS** · **Rising Talent** · US-based New York
Noman

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDEAL EXAMPLE C — Full-time or hourly role
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi,
I built **Canzey** — a full-stack business platform handling **1,000+ daily active users**. I'd like to build the same for your business:
Building centralized systems is exactly what I specialise in. I think in systems, not just tasks.
Relevant work:
- **Canzey**, full-stack platform, inventory, customer management, 1,000+ daily users:
https://admin.canzey.com
- **AnyRide**, multi-role platform, real-time data, pipeline management:
https://play.google.com/store/apps/details?id=in.neride.passenger
**$50/hr** · Eastern Time · Available immediately for **30+ hrs/week**.
Happy to jump on a quick call today.
**100% JSS** · **Rising Talent** · US-based New York
Noman

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LETTER STRUCTURE — EXACT ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Hi [FirstName], — or "Hi," if no name found
2. HOOK (from assigned hook above) — one punchy sentence, bold key terms
3. BODY — exactly 2 short sentences, max 25 words total. State your matching experience. Connect to their exact need. Nothing else.
4. Relevant work: — 2-3 projects with URLs only. Skip any project without a URL.
   - **Project**, feature, feature, metric:
   https://url
   - **Project 2**, feature:
   https://url
5. SCOPE — 1 sentence. Rate and hours, or price breakdown, or timeline commitment.
6. CTA — MANDATORY. Always include. "Happy to jump on a quick call today." or "Ready to start. Can we jump on a quick call today?"
7. **JSS% JSS** · **Tier** · Location
8. First name only — NO "Regards,"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Use the ASSIGNED HOOK — fill brackets with job-specific details, bold key terms
✓ Body: 2 sentences only, under 25 words total
✓ Use commas for pauses. Never dashes inside sentences.
✓ Contractions: I've, I'll, it's, that's, I'd
✓ Bold: **tech**, **prices**, **timelines**, **metrics**, **project names**
✓ Screening keyword: include verbatim once, naturally — not forced
✓ CTA is MANDATORY — always the line before the badge
✓ Total letter: under 120 words
✓ Skip portfolio items with no URL
✗ NO long opening sentences listing 5+ things generically
✗ NO body with 3+ sentences or complex app stories — that goes in Q&A
✗ NO dashes inside sentences as pauses
✗ NO scope line with 2+ sentences
✗ NO "Regards," — badge then first name only
✗ NO parentheses ()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT QUESTIONS — ===QUESTIONS=== ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All Q&A answers go ONLY in ===QUESTIONS===. Never in the letter body.
2-4 sentences each. Plain prose. No bold. No bullets. Human voice.
Riverpod preference, complex app stories, AI workflow — answer these here, not in letter.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
===LETTER===
[letter matching ideal examples exactly]
===END===
===PORTFOLIO===
[Name: URL — one per line]
===END===
===QUESTIONS===
[Q&A or blank]
===END===
===META===
HOOK: [which hook number and name]
DESC: [why this hook]
TIP1: [tip]
TIP2: [tip]
TIP3: [tip]
CLIENT: [first name or blank]
===END===`;

// ── User message builder ──────────────────────────────────────────────────────
function buildUserMessage({ job, profile, settings, refineInstruction = '' }) {

  // Smart skill matching
  const jobText = ((job.title||'')+' '+(job.description||'')+' '+(job.skills||'')).toLowerCase();
  const allSkills = (profile.skills||'').split(',').map(s => s.trim()).filter(Boolean);
  const matched   = allSkills.filter(s => jobText.includes(s.toLowerCase()));
  const relevantSkills = matched.length ? matched.slice(0,5) : allSkills.slice(0,3);

  // Pricing type detection — check both description AND budget/type fields
  const descLower   = (job.description||'').toLowerCase();
  const budgetLower = (job.budget||'').toLowerCase();
  const typeField   = (job.type||'').toLowerCase();
  const isHourly  = /hourly|\/hr|per hour|\/hour/.test(descLower) || /hr|hour/.test(budgetLower) || typeField.includes('hourly');
  const isFixed   = /fixed/.test(descLower) || /fixed/.test(budgetLower) || /fixed/.test(typeField) || !!job.budget;
  const pricingType = isHourly ? 'HOURLY' : isFixed ? 'FIXED' : 'UNKNOWN';

  // Portfolio — score each project against the job, pass top 3 most relevant
  const allPortfolios = (profile.portfolio || []).filter(p =>
    p.title || p.name || (p.urls && p.urls.length) || p.url
  );

  function scoreProject(p) {
    let score = 0;
    const pText = [p.title, p.desc, p.role, (p.skills||[]).join(' ')].join(' ').toLowerCase();
    const pSkillsArr = Array.isArray(p.skills) ? p.skills : (typeof p.skills === 'string' ? p.skills.split(',') : []);

    // Skill overlap — strongest signal
    pSkillsArr.forEach(skill => {
      const s = (skill || '').trim().toLowerCase();
      if (s && jobText.includes(s)) score += 4;
    });

    // Description/title keyword overlap with job
    const jobWords = jobText.split(/\W+/).filter(w => w.length > 4);
    jobWords.forEach(w => { if (pText.includes(w)) score += 1; });

    // Has a real URL — strongly prefer projects with links
    const firstUrl = (p.urls && p.urls.find(u => u && u.trim())) || p.url || '';
    if (firstUrl) score += 3;

    // App store URL for mobile jobs
    if (/apps\.apple\.com|play\.google\.com/.test(firstUrl)) score += 2;

    // Figma/design links are weak for non-design jobs
    if (/figma\.com/.test(firstUrl) && !/design|ui|ux|figma/.test(jobText)) score -= 2;

    return score;
  }

  const rankedPortfolios = allPortfolios
    .map(p => ({ p, score: scoreProject(p) }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.p);

  const portfolioText = rankedPortfolios.length
    ? rankedPortfolios.slice(0, 3).map(p => {
        const name      = p.title || p.name || 'Project';
        const firstUrl  = (p.urls && p.urls.find(u => u && u.trim())) || p.url || '';
        const skillsStr = Array.isArray(p.skills)
          ? p.skills.slice(0, 8).join(', ')
          : (typeof p.skills === 'string' ? p.skills : '');
        const relevanceScore = scoreProject(p);
        return [
          `Project: ${name}`,
          firstUrl ? `URL: ${firstUrl}` : 'URL: none',
          p.desc ? `Description: ${p.desc}` : '',
          skillsStr ? `Skills: ${skillsStr}` : '',
          p.role ? `Role: ${p.role}` : '',
          `Relevance score: ${relevanceScore} (higher = better match for this job)`,
        ].filter(Boolean).join('\n');
      }).join('\n\n')
    : (profile.portfolioLinks||[]).filter(Boolean).slice(0,3).map(l => `- ${l}`).join('\n') || 'none provided';

  // Word limit from settings
  const wordLimit = settings?.length === 'short' ? '100-130'
    : settings?.length === 'long' ? '160-220'
    : '130-160';

  // Hook selection — pick best hook based on job characteristics
  // Rotate through hooks so not always the same one
  const jobTextLower = jobText.toLowerCase();
  const budget = parseInt((job.budget || '0').replace(/[^0-9]/g, '')) || 0;
  const hasTimeline = /week|day|month|deadline|urgent|asap|quickly|fast/i.test(jobTextLower);
  const hasBurnedClient = /left mid|abandoned|previous developer|fired|failed|took over|inherit/i.test(jobTextLower);
  const isLargeBudget = budget >= 5000;
  const isDetailedJob = (job.description || '').length > 1000;
  const hasSpecificMetric = /\d+%|\d+ (users|customers|clients|downloads|apps|projects)/i.test(jobTextLower);

  // Hook selection — smart rotation based on job signals
  // HOOK 6 (Numbers) only used when profile has real stats to fill in
  const titleHash = (job.title || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hasStats = !!(profile.jss || profile.hourlyRate || profile.jobs);

  // Hook selection with exact templates
  const HOOKS = {
    1: { name:'HOOK 1 — PROOF',        tpl:'I [built/shipped/delivered] **[specific result]** for [client type]. I\'d like to do the same for you.' },
    2: { name:'HOOK 2 — RELATABILITY', tpl:'I\'ve [done exact thing — be specific]. Here\'s how I\'d approach [their project in 3-4 words]:' },
    3: { name:'HOOK 3 — GUARANTEE',    tpl:'I can [exact deliverable] in **[timeframe]** at **$[price/rate]**, and I\'m willing to back that up — [one proof point].' },
    4: { name:'HOOK 4 — EXTRA VALUE',  tpl:'I\'ll not only [their main need] — I\'ll also [one genuinely useful bonus they didn\'t ask for].' },
    5: { name:'HOOK 5 — CALL',         tpl:'Let\'s jump on a quick call today — I can walk you through my exact approach in 15 minutes.' },
    6: { name:'HOOK 6 — NUMBERS',      tpl:'Here are my numbers: **[stat 1]**, **[stat 2]**, **[stat 3]** — all relevant to what you need.' },
    7: { name:'HOOK 7 — CLIENT FIRST', tpl:'My understanding: you need [restate their core problem more precisely than they wrote it].' },
  };
  const rotation = [1, 2, 3, 4, 7, 1, 2]; // weighted toward reliable hooks
  let hookNum = rotation[titleHash % rotation.length];

  // Signal overrides — order matters: most specific first
  if (hasBurnedClient)                        hookNum = 3; // burned client → guarantee
  else if (isFixed && hasTimeline)            hookNum = 3; // fixed price + timeline → guarantee with price+days
  else if (isFixed && budget > 0)             hookNum = 3; // any fixed price → guarantee
  else if (hasTimeline && !isDetailedJob)     hookNum = 4; // tight timeline → extra value
  else if (isLargeBudget && budget >= 5000)   hookNum = 7; // big budget → client-first
  else if (hasStats && isLargeBudget)         hookNum = 6; // stats available → numbers

  const assignedHook = HOOKS[hookNum];

  // Detect hidden screening keywords ("include the word X somewhere in your reply")
  const screeningMatch = (job.description||'').match(
    /(?:include|use|say|type|write|add|put|mention)\s+(?:the\s+)?(?:word|phrase|code)?\s*["']?([a-zA-Z]{3,15})["']?\s+(?:somewhere|in your|in the|anywhere|in this)/i
  );
  const screeningWord = screeningMatch ? screeningMatch[1] : null;

  // Build JSS badge from profile data
  const jssVal    = profile.jss ? String(profile.jss).replace('%','') : null;
  const tierLabel = profile.tier || null;
  const location  = profile.country || '';
  const badgeParts = [
    jssVal    ? ('**' + jssVal + '% JSS**') : null,
    tierLabel ? ('**' + tierLabel + '**')   : null,
    location  || null
  ].filter(Boolean);
  const badgeLine = badgeParts.join(' · ');
  const firstName = (profile.name || '').split(' ')[0] || '';

  const msgParts = [
    'JOB TITLE: ' + job.title,
    'JOB DESCRIPTION:\n' + (job.description||'').slice(0, 2500),
    '',
    'REQUIRED SKILLS: ' + (job.skills || 'not listed'),
    'BUDGET/RATE: ' + (job.budget || 'not specified') + (isFixed ? ' (FIXED PRICE — mention this amount in your opening line)' : ''),
    'PRICING TYPE: ' + pricingType,
    'CLIENT LOCATION: ' + (job.location || 'unknown'),
    'CLIENT NAME FROM REGEX: ' + (job.clientName || 'not found'),
    'CLIENT REVIEWS TEXT:\n' + ((job.reviewText || '').slice(0, 600) || 'no reviews available'),
    '',
    'ADDITIONAL QUESTIONS FROM CLIENT:\n' + (job.questions || 'none'),
    '',
    'SCREENING KEYWORD: ' + (screeningWord || 'none') + (screeningWord ? ' — include this exact word ONCE naturally in the letter' : ''),
    '',
    '──────────────────────────────',
    'FREELANCER PROFILE',
    '──────────────────────────────',
    'Full name: ' + profile.name,
    'First name for sign-off: ' + firstName,
    'Role/Title: ' + profile.title,
    'JSS: ' + (profile.jss || 'not set'),
    'Tier: ' + (profile.tier || 'not set'),
    'Country/Location: ' + (profile.country || 'not set'),
    'Hourly rate: ' + (profile.hourlyRate || 'not set'),
    'Relevant skills for THIS job: ' + relevantSkills.join(', '),
    'Extra context: ' + (profile.extra || 'none'),
    '',
    'PORTFOLIO (already ranked by relevance to this job — use top 2-3, skip any with URL: none):',
    portfolioText,
    '',
    'BADGE LINE FOR END OF LETTER:',
    badgeLine || '(no badge data — just end with first name)',
    '',
    '──────────────────────────────',
    'INSTRUCTIONS',
    '──────────────────────────────',
    'Pricing: ' + (pricingType === 'HOURLY' ? 'Mention rate "' + (profile.hourlyRate || 'not set') + '" naturally' : pricingType === 'FIXED' ? 'Fixed budget ' + job.budget + ' — address in opening' : 'No pricing info — focus on CTA'),
    refineInstruction ? ('REFINEMENT REQUEST: ' + refineInstruction) : '',
    '',
    '──────────────────────────────',
    'HOOK ASSIGNMENT',
    '──────────────────────────────',
    'ASSIGNED HOOK: ' + assignedHook.name,
    'OPENING TEMPLATE: ' + assignedHook.tpl,
    'INSTRUCTIONS: Fill the [brackets] with job-specific details. Bold every key term. Keep it under 20 words.',
    '',
    'Write the letter now. Follow the IDEAL EXAMPLES structure exactly.',
    'Use the ASSIGNED HOOK as your opening sentence — fill brackets, bold key terms.',
    'Portfolio: use projects with highest relevance score. Skip any with URL: none. Write as "Relevant work:" inline.',
    'End with badge line then first name only. Do NOT write "Regards,".',
  ];
  const msg = msgParts.filter(s => s !== undefined && s !== null).join('\n').trim()
  return msg;
}

module.exports = { SYSTEM, buildUserMessage, processBold };
