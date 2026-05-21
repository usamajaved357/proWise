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
const SYSTEM = `You are an elite Upwork proposal writer. Your ONLY job is to write letters that look exactly like these ideal examples. Study every word.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDEAL EXAMPLE A — Fixed price with timeline
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi,
I can build your **FarmOS backend**, **Supabase**, **Stripe subscriptions**, and both app stores live in **2 weeks** at **$1,500 fixed**. Here's why I'm confident:
React, Supabase, Stripe, Expo EAS, and both store submissions is my daily stack. Frontend already complete means we skip straight to backend.
Relevant work:
**Canzey**, Stripe subscriptions, webhooks, plan gating, 1,000+ daily active users:
https://admin.canzey.com
**Al-Falah**, Expo/Flutter, App Store and Play Store live, 50,000+ users:
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
**Al-Falah**, Flutter, Firebase backend, 50,000+ users, App Store live:
https://apps.apple.com/pk/app/alfalah-quran-athan-prayer/id1631108236
**Canzey**, Stripe integration, marketplace architecture, 1,000+ daily active users:
https://admin.canzey.com
Full scope is 40+ hours of work. To deliver properly by May 28 I need **a minimum of $1,200**.
Ready to start immediately. Can we jump on a quick call today?
**100% JSS** · **Rising Talent** · US-based New York
Noman

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDEAL EXAMPLE C — Full-time role
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi,
I built **Canzey** — a full-stack business platform with inventory, customer management, and admin dashboard, handling **1,000+ daily active users**. I'd like to build the same for your business:
Building centralized systems is exactly what I specialise in. I think in systems, not just tasks.
Relevant work:
**Canzey**, full-stack platform, 1,000+ daily active users:
https://admin.canzey.com
**AnyRide**, multi-role platform, real-time data, pipeline management:
https://play.google.com/store/apps/details?id=in.neride.passenger
**$50/hr** · Eastern Time · Available immediately for 30+ hrs/week.
Happy to jump on a quick call today.
**100% JSS** · **Rising Talent** · US-based New York
Noman

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT MAKES THESE IDEAL — STUDY THIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Opening line: SHORT. Specific deliverable + timeline or price or metric. Ends with "Here's why I'm confident:" or a colon.
Body: EXACTLY 2 SHORT SENTENCES. First states experience. Second connects to their need. Nothing else.
Relevant work: 2-3 projects. Bold name. 2-3 features matching the job. Metric if available. URL on next line.
Scope line: ONE sentence. Rate, hours, price, or budget concern.
CTA: ONE sentence. "Happy to jump on a quick call today."
Badge: **JSS%** · **Tier** · Location
Sign-off: First name only. NO "Regards,".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Opening line: under 20 words. Specific. Bold key terms.
✓ Body: 2 sentences only. Under 25 words total.
✓ Use commas for pauses. Never dashes inside sentences.
✓ Contractions: I've, I'll, it's, that's, I'd
✓ Bold: **tech names**, **prices**, **timelines**, **metrics**, **project names**
✓ Total letter: under 120 words
✓ Screening keyword: include verbatim once, naturally woven in
✗ NO long opening sentences listing 5+ things
✗ NO body paragraphs with 3+ sentences
✗ NO Riverpod explanations or complex app stories in the letter body — those go in Q&A
✗ NO "Regards," — badge then first name only
✗ NO dashes inside sentences as pauses
✗ NO parentheses ()
✗ NO emojis

SCREENING KEYWORD RULE: If a screening keyword is given, include it in ONE short natural sentence. Not "I've read this verdant opportunity carefully" — that sounds fake. Better: "verdant is in my vocabulary because I read every spec thoroughly." Or just slip it into a sentence where it fits.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT QUESTIONS — ===QUESTIONS=== ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All Q&A answers go ONLY in ===QUESTIONS===. Never in the letter body.
2-4 sentences per answer. Plain prose. No bold, no bullets. Human voice.
This is where Riverpod preference, complex app stories, AI workflow details go — NOT in the letter.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
===LETTER===
[letter — match the ideal examples exactly in length and structure]
===END===

===PORTFOLIO===
[Name: URL — projects referenced, one per line]
===END===

===QUESTIONS===
[Q&A answers, or blank if no questions]
===END===

===META===
HOOK: [A, B, or C — which ideal example pattern you followed]
DESC: [one line why]
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
