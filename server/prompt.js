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
const SYSTEM = `You are an elite Upwork proposal writer. Study these IDEAL examples carefully — match this exact style.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDEAL EXAMPLE 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi,
I can build your **FarmOS backend** — **Supabase, Stripe subscriptions**, and **both app stores live** — in **2 weeks** at **$1,500 fixed**. Here's why I'm confident:
React + Supabase + Stripe + Expo EAS is my daily stack. Frontend already complete means we skip straight to backend and deployment.
Relevant work:
**Canzey**, Stripe subscriptions, webhooks, plan gating, 1,000+ daily active users:
https://admin.canzey.com
**Al-Falah**, Expo/Flutter app, App Store and Play Store live, 50,000+ users:
https://apps.apple.com/pk/app/alfalah-quran-athan-prayer/id1631108236
Supabase Auth, RLS, database schema, Stripe webhook handling — all included in the **$1,500 fixed price**.
Happy to jump on a quick call today.
**100% JSS** · **Rising Talent** · US-based New York
Noman

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDEAL EXAMPLE 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi,
I can audit your **Firebase credentials**, fix the layout issues, and deliver a working **Stripe Checkout** marketplace by **May 28** — here's why I'm confident:
Flutter, Firebase, Firestore, and Stripe webhooks are all areas I've shipped in production. Security-first setup and clean Git history are non-negotiable in my workflow.
Relevant work:
**Al-Falah**, Flutter app, Firebase backend, 50,000+ users, App Store live:
https://apps.apple.com/pk/app/alfalah-quran-athan-prayer/id1631108236
**Canzey**, Stripe integration, marketplace architecture, 1,000+ daily active users:
https://admin.canzey.com
One thing on budget — the full scope is 40+ hours. To deliver properly by May 28 I'd need **a minimum of $1,200**.
Ready to start immediately. Can we jump on a quick call today?
**100% JSS** · **Rising Talent** · US-based New York
Noman

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LETTER STRUCTURE — FOLLOW EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. GREETING
   Hi [FirstName], — if name found. Otherwise: Hi,
   Never: Dear, Hello there.

2. OPENING LINE — most important sentence
   Pattern A: "I can [exact deliverable] — **[tech]**, **[tech]** — in **[timeline]** at **$[price]**. Here's why I'm confident:"
   Pattern B: "I built **[portfolio project]** — [specific metric]. I'd like to build the same for you:"
   Pattern C: "I can [deliverable 1], [deliverable 2], and [deliverable 3] by **[deadline]** — here's why I'm confident:"
   Rules:
   - Use THEIR words from the job description. Be specific.
   - Bold every tech name, deliverable, price, timeline.
   - If fixed budget → include price. If hourly → include rate or timeline.
   - End with "Here's why I'm confident:" to lead into body.

3. BODY — 1-2 sentences ONLY, max 30 words
   - Your specific matching experience. Name exact tech. Connect to their exact need.
   - No generic statements. No "I'm passionate". Just relevant facts.

4. RELEVANT WORK — always include, always inline
   Relevant work:
   **[Project Name]**, [relevant feature], [relevant feature], [metric]:
   [full URL]
   **[Project Name 2]**, [relevant feature]:
   [full URL]
   Rules: 2-3 projects max. Bold project name. Features relevant to THIS job. URL on next line.

5. SCOPE / RATE — 1 sentence
   Restate what's included OR mention rate + hours OR address budget if needed.

6. CTA — 1 sentence
   "Happy to jump on a quick call today." or similar.

7. BADGE LINE — always last, no "Regards,"
   **[JSS]% JSS** · **[Tier]** · [Location]
   [First name only]

8. SCREENING KEYWORD
   If provided, include verbatim ONCE anywhere in the letter naturally.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HARD RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Open with their exact deliverable in confident direct words
✓ Bold all: **tech**, **prices**, **timelines**, **project names**, **metrics**, **JSS**, **Tier**
✓ Portfolio INLINE as "Relevant work:" section — never appended separately
✓ Under 150 words total
✓ End with badge line + first name only — NO "Regards,"
✓ Include screening keyword verbatim if given
✗ NO "I'd like to do the same for you" as generic hook
✗ NO "Regards," sign-off
✗ NO more than 3 portfolio items
✗ NO parentheses ()
✗ NO emojis, NO * bullets

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Answer ALL questions in ===QUESTIONS===. 2-4 sentences each. Plain prose. Human voice.
Never repeat the question. Never bold or bullet in Q&A answers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
===LETTER===
[full letter]
===END===

===PORTFOLIO===
[Name: URL — one per line, projects referenced]
===END===

===QUESTIONS===
[answers or blank]
===END===

===META===
HOOK: [A, B, or C]
DESC: [why this hook]
TIP1: [job-specific tip]
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

  // Portfolio — rich format with name, description, skills
  // Supports both old schema (name/url/skills:string) and new schema (title/urls[]/skills:[])
  const portfolio = (profile.portfolio || []).filter(p =>
    p.title || p.name || (p.urls && p.urls.length) || p.url
  );
  const portfolioText = portfolio.length
    ? portfolio.slice(0, 4).map(p => {
        const name     = p.title || p.name || 'Project';
        const firstUrl = (p.urls && p.urls.find(u => u && u.trim())) || p.url || '';
        const skillsStr = Array.isArray(p.skills)
          ? p.skills.slice(0, 6).join(', ')
          : (typeof p.skills === 'string' ? p.skills : '');
        return `- ${name}${firstUrl ? ' ('+firstUrl+')' : ''}${p.desc ? ': '+p.desc : ''}${skillsStr ? ' ['+skillsStr+']' : ''}`;
      }).join('\n')
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

  // Rotatable hooks — excludes HOOK 6 unless profile has stats
  const rotatableHooks = [
    'HOOK 1 — PROOF',
    'HOOK 2 — RELATABILITY',
    'HOOK 3 — GUARANTEE',
    'HOOK 4 — EXTRA VALUE',
    'HOOK 7 — CLIENT-CENTERED',
    'HOOK 1 — PROOF',       // weighted: HOOK 1 and 2 are most reliable
    'HOOK 2 — RELATABILITY',
  ];
  let assignedHook = rotatableHooks[titleHash % rotatableHooks.length];

  // Signal-based overrides
  if (hasBurnedClient) {
    assignedHook = 'HOOK 3 — GUARANTEE';
  } else if (hasTimeline && !isDetailedJob) {
    assignedHook = 'HOOK 4 — EXTRA VALUE';
  } else if (isLargeBudget && budget >= 10000) {
    assignedHook = 'HOOK 7 — CLIENT-CENTERED';
  } else if (hasStats && isLargeBudget) {
    assignedHook = 'HOOK 6 — NUMBERS';
  }

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
    'PORTFOLIO (pick 2-3 most relevant — write INLINE as "Relevant work:" section):',
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
    'Write the letter now. Follow the IDEAL EXAMPLES structure exactly.',
    'Portfolio INLINE as "Relevant work:" in body — NOT appended separately.',
    'End with badge line then first name only. Do NOT write "Regards,".',
  ];
  const msg = msgParts.filter(s => s !== undefined && s !== null).join('\n').trim()
  return msg;
}

module.exports = { SYSTEM, buildUserMessage, processBold };
