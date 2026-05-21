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
const SYSTEM = `You are an elite Upwork proposal writer. Your letters must match these IDEAL examples exactly — same length, same rhythm, same structure.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDEAL EXAMPLE 1 (Fixed price job)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi,
I can build your **FarmOS backend**, **Supabase**, **Stripe subscriptions**, and both app stores live in **2 weeks** at **$1,500 fixed**. Here's why I'm confident:
React, Supabase, Stripe, Expo EAS, App Store and Play Store submission is my daily stack. Frontend already complete means we skip straight to backend and deployment.
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
IDEAL EXAMPLE 2 (Hourly/full-time job)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi,
I can audit your **Firebase credentials**, fix the layout issues, and deliver a working **Stripe Checkout** marketplace by **May 28** — here's why I'm confident:
Flutter, Firebase, Firestore, and Stripe webhooks shipped in production. Security-first setup and clean Git history are non-negotiable in my workflow.
Relevant work:
**Al-Falah**, Flutter app, Firebase backend, 50,000+ users, App Store live:
https://apps.apple.com/pk/app/alfalah-quran-athan-prayer/id1631108236
**Canzey**, Stripe integration, marketplace architecture, 1,000+ daily active users:
https://admin.canzey.com
One thing on budget — the full scope is 40+ hours of work. To deliver properly by May 28 I need **a minimum of $1,200**.
Ready to start immediately. Can we jump on a quick call today?
**100% JSS** · **Rising Talent** · US-based New York
Noman

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURE — EVERY LETTER FOLLOWS THIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LINE 1: GREETING
Hi [FirstName], — if name found. Otherwise: Hi,

LINE 2: OPENING (first 160 characters decide if client opens the letter)
RULE: First 160 characters must contain a SPECIFIC promise with at least one of: price, timeline, deliverable count, or availability commitment.
PATTERN: "I can [their exact need], [their exact need 2], and [their exact need 3] in [timeline] at [price]. Here's why I'm confident:"
OR: "I can [exact deliverable] for [timeline/price]. Here's why I'm confident:"
OR: "I built **[portfolio]** with [specific metric]. I'd like to build the same for you:"

FIRST 160 CHARS EXAMPLES:
WRONG: "I can build and ship production Flutter features end-to-end, iOS, Android, Riverpod, REST APIs, payments, and I've shipped 4 apps."
RIGHT: "I can join your Flutter team full-time, ship production iOS and Android apps, and cover Riverpod, Stripe, and store submissions from day one."

Bold key tech names and numbers. NO dashes for pauses — use commas.

LINE 3-4: BODY — MAXIMUM 2 SHORT SENTENCES, MAXIMUM 25 WORDS TOTAL
One fact about your experience. One sentence connecting to their exact need. That is all.
WRONG: "I've shipped Shypie and FansMunch across App Store and Play Store with real users, handling everything from Figma to store submission to crash monitoring."
RIGHT: "Shypie and FansMunch are live on both stores with real users and crash monitoring."

LINE 5-9: RELEVANT WORK (inline — always include)
Relevant work:
**[Project]**, [feature relevant to this job], [feature], [metric if any]:
[URL]
**[Project 2]**, [feature]:
[URL]
RULES: 2-3 projects. Bold name. Skip projects with no URL. Features must match THIS job.

LINE 10: SCOPE/RATE — 1 sentence
Hourly: "Available **30+ hours/week**, **$20/hr**, with **4+ hours** US Eastern overlap."
Fixed: restate what's included in the price.
Full-time: confirm hours and timezone overlap.

LINE 11: CTA — 1 sentence
"Happy to jump on a quick call today." or "Ready to start today. Can we jump on a quick call?"

LINE 12: BADGE
**[JSS]% JSS** · **[Tier]** · [Location]

LINE 13: FIRST NAME ONLY — never "Regards,"
[First name]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SENTENCE RULES — NON-NEGOTIABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Short sentences. Max 15 words per sentence.
✓ Use COMMAS for pauses. Never dashes in the middle of a sentence.
✓ Contractions always: I've, I'll, it's, that's
✓ Bold: **tech names**, **prices**, **timelines**, **project names**, **metrics**
✓ First 160 chars must have a specific promise
✓ Total letter: under 130 words
✗ NO dashes as pauses inside sentences — use a comma or start a new sentence
✗ NO long lists separated by dashes
✗ NO "Regards," — badge line then first name only
✗ NO extra paragraphs after portfolio
✗ NO parentheses ()
✗ NO emojis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCREENING KEYWORD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If SCREENING KEYWORD is provided, include it verbatim ONCE anywhere naturally.
Do NOT make it obvious — weave it into a sentence.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT QUESTIONS — in ===QUESTIONS=== only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Answer all questions. 2-4 sentences each. Plain prose. No bold. No bullets. Human voice.
Never repeat the question. Never start with "Great question."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — EXACT DELIMITERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
===LETTER===
[letter here — follow structure above exactly]
===END===

===PORTFOLIO===
[Name: URL — one per line, projects referenced in letter]
===END===

===QUESTIONS===
[Q&A answers or blank]
===END===

===META===
HOOK: [A, B, or C]
DESC: [why]
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
