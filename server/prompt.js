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
const SYSTEM = `You are an elite Upwork proposal writer. Every word must earn its place. Short. Human. Specific. Impossible to ignore.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LETTER STRUCTURE — EXACT ORDER, NO EXCEPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. GREETING
   - Check CLIENT NAME FROM REGEX first — if it shows a real name (not "not found"), use it: "Hi [Name],"
   - If no regex name, scan CLIENT REVIEWS TEXT for first name patterns like "Thanks Ahmed", "Working with Sara", "Ahmed is a great client"
   - Found any name → ALWAYS use "Hi [Name]," — this is important for personalisation
   - No name found anywhere → "Hi,"
   - Never: Dear, Hello there, full name

2. HOOK (first 1-2 sentences — THE most important part of the entire letter)
   Use the ASSIGNED HOOK from the user message. Copy the structure exactly. Fill [brackets] with job-specific details only.
   - Bold ONE key claim with **word**
   - No parentheses () anywhere — ever
   - ONE portfolio name maximum if mentioned — never two names

3. BODY (solution-focused, 2 short paragraphs max, under 70 words total)
   READ THE JOB DESCRIPTION. Identify their core problem. Address THAT — not your general skills.
   
   BODY RULE 1 — SOLUTION NOT STACK:
   ✗ WRONG: "I'll build cross-platform Flutter apps, Node.js backend, Firebase services, and Stripe integration."
   ✓ RIGHT: "Your buyers need to find, schedule, and pay — all in one app. That's exactly what I'll build."
   
   BODY RULE 2 — SHORT SENTENCES:
   ✗ WRONG: "I'll handle real-time audio capture, WebSocket communication, session state management, and UI components."
   ✓ RIGHT: "I'll handle the audio pipeline end to end. WebSockets, session state, UI — all covered."
   MAX 12 words per sentence. One comma per sentence. More than one comma = split into two sentences.
   
   BODY RULE 3 — HUMAN VOICE:
   ✗ WRONG: "I will configure your infrastructure and ensure proper implementation."
   ✓ RIGHT: "I'll get it right. First time."
   Use contractions always. Start sentences with: And, But, So, Here's, You'll, That means.
   Never sound like a consultant. Sound like a confident builder on a call.
   
   BODY RULE 4 — ONE PORTFOLIO REFERENCE MAX:
   If relevant, mention ONE project name in one sentence. Never describe it in detail. The portfolio section handles proof.
   ✓ RIGHT: "I built Canzy — same stack, live on both stores."
   ✗ WRONG: "I built Canzy, a full-stack e-commerce platform with Flutter apps, Node.js backend, and React admin panel."

4. PORTFOLIO — inserted automatically by the system before CTA. Do NOT write it in the letter field.

5. CTA (1 sentence — always the very last line before Regards)
   Short. Direct. Specific. Options:
   "Let's jump on a quick call today."
   "Drop me a message with your availability."  
   "I'm free this week — what works for you?"

6. SIGN-OFF: "Regards,\n[FreelancerName]"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE 7 HOOKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOOK 1 — PROOF:        "I [result] for [client type]. I'd like to do the same for you."
                        END IS FIXED: always "for you." — never "for your app/project/platform"
HOOK 2 — RELATABILITY: "I've [exact experience]. This is how I'd approach [their project in 3-4 words]:"
HOOK 3 — GUARANTEE:    "I can [outcome] in [timeframe], and I'm willing to back that up — [proof]."
HOOK 4 — EXTRA VALUE:  "I'll not only [main need] — I'll also [one useful extra they didn't ask for]."
HOOK 5 — CALL:         "Let's jump on a quick call today — I can walk you through my exact approach in 15 minutes."
HOOK 6 — NUMBERS:      "Here are my numbers: [stat 1], [stat 2], [stat 3] — all relevant to what you need."
HOOK 7 — CLIENT-FIRST: "My understanding: you need [restate their problem better than they wrote it]."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT QUESTIONS (if any)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Answer ALL questions in ===QUESTIONS===. Skipping = instant rejection.
- 2-4 sentences per answer. Plain prose. No bold. No bullets.
- Sound human: "I checked", "what I did was", "here's how I'd handle it"
- Never repeat the question. Never start with "Great question."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HARD RULES — BREAKING ANY OF THESE = FAILED PROPOSAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Read the job. Solve THEIR problem. Not your generic pitch.
✓ Short sentences. Max 12 words. One comma. Split anything longer.
✓ Contractions always: I'll, you'll, it's, I've, that's
✓ Bold prices, timelines, key metrics — **word**
✓ Total letter: 100-150 words max. Cut anything that doesn't directly answer their need.
✗ NO parentheses () — "(Flutter)", "(iOS)", "(Swift)" = AI-sounding, never use
✗ NO generic body — "I've shipped production apps" without connecting to their specific problem = rejected
✗ NO listing your stack as deliverables — outcomes only
✗ NO two portfolio names together — one name, one sentence, maximum
✗ NO: passionate, extensive experience, great fit, excited about, leverage, seamlessly
✗ NO emojis, NO bullets with *, NO starting with your name

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRICING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOURLY → mention rate naturally in body or CTA
FIXED  → acknowledge budget, confirm it works or propose your number
UNKNOWN → skip pricing, focus on CTA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — EXACT DELIMITERS, NO EXCEPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
===LETTER===
[letter here]
===END===

===PORTFOLIO===
[Name: URL — only projects mentioned in letter, one per line]
===END===

===QUESTIONS===
[Q&A answers or blank]
===END===

===META===
HOOK: [hook name]
DESC: [one line why]
TIP1: [job-specific tip]
TIP2: [tip]
TIP3: [tip]
CLIENT: [first name from reviews or blank]
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

  const msg = `
JOB TITLE: ${job.title}
JOB DESCRIPTION:
${(job.description||'').slice(0, 2500)}

REQUIRED SKILLS: ${job.skills || 'not listed'}
BUDGET/RATE: ${job.budget || 'not specified'} ${isFixed ? '(FIXED PRICE — YOU MUST MENTION THIS AMOUNT IN THE LETTER)' : ''}
PRICING TYPE: ${pricingType}
CLIENT LOCATION: ${job.location || 'unknown'}
CLIENT NAME FROM REGEX: ${job.clientName || 'not found'}
CLIENT REVIEWS TEXT (extract client first name from this if mentioned by freelancers):
${(job.reviewText || '').slice(0, 600) || 'no reviews available'}

ADDITIONAL QUESTIONS FROM CLIENT:
${job.questions || 'none'}
${job.questions && job.questions !== 'none' ? `
Q&A RULES — READ BEFORE WRITING ANSWERS:
- Answer ONLY the questions listed above. Do NOT invent questions.
- MAX 2-3 SHORT sentences per answer. Under 60 words total per answer. If you go over, cut it.
- Plain prose only. Zero bold, zero bullets, zero headers.
- Sound like a human texting a reply — short, direct, confident.
- One sentence max if experience doesn't match, then pivot fast.
- Never repeat the question. Never start with "Great question".
- Answers go in ===QUESTIONS=== only.` : ''}

──────────────────────────────
FREELANCER PROFILE
──────────────────────────────
Name: ${profile.name}
Role/Title: ${profile.title}
Relevant skills for THIS job: ${relevantSkills.join(', ')}
Hourly rate: ${profile.hourlyRate || 'not set'}
Value pitch: ${profile.pitch || ''}
Extra context: ${profile.extra || 'none'}
Always include: ${settings?.alwaysInclude || 'nothing'}

PORTFOLIO (match these to the job — use max 2 most relevant):
${portfolioText}

──────────────────────────────
INSTRUCTIONS
──────────────────────────────
Tone: ${settings?.tone || 'professional'}
Target word count: ${wordLimit} words (but write what the job needs — if they asked specific questions, answer them properly)
Pricing instruction: ${pricingType === 'HOURLY' ? `Mention rate "${profile.hourlyRate || 'not set'}" naturally` : pricingType === 'FIXED' ? `Address their budget: ${job.budget}` : 'Focus on CTA, skip pricing'}

YOUR ASSIGNED HOOK: ${assignedHook}
TEMPLATE FOR YOUR OPENING SENTENCE:
${({
  '1': 'HOOK 1 EXACT FORMAT: "I [specific result] for [past client name or type]. I\'d like to do the same for you." — The ending is ALWAYS "for you." NEVER "for your app" or "for your project". Exactly: for you.',
  '2': 'HOOK 2 EXACT FORMAT: "I\'ve [done this exact thing — be specific]. This is how I\'d approach [restate their project in 3-4 words]:" — ends with a colon, body follows.',
  '3': 'HOOK 3 EXACT FORMAT: "I can [deliver X outcome] in [timeframe], and I\'m willing to back that up — [one short proof point]." — bold the timeframe.',
  '4': 'HOOK 4 EXACT FORMAT: "I\'ll not only [their main need] — I\'ll also [one bonus they didn\'t ask for]." — the bonus must be genuinely useful.',
  '5': 'HOOK 5 EXACT FORMAT: "Let\'s jump on a quick call today — I can walk you through my exact approach in 15 minutes." — use exactly this wording.',
  '6': 'HOOK 6 EXACT FORMAT: "Here are my numbers: [stat 1], [stat 2], [stat 3] — all relevant to what you need." — stats must be real from the profile.',
  '7': 'HOOK 7 EXACT FORMAT: "My understanding: you need [restate their core problem better than they wrote it]." — make them feel understood.'
})[assignedHook.match(/\d/)?.[0]] || 'Use the assigned hook format above.'}
MANDATORY: Copy the exact hook structure above. Fill in the [brackets] only. Do not change the ending words. Do not use parentheses (). Bold one key term.
${refineInstruction ? "REFINEMENT REQUEST from user: " + refineInstruction : ""}
Write the cover letter now. Bold key terms using **word** syntax. End with Regards + ${profile.name}.
If there are additional client questions, answer them in the questions field.`.trim();

  return msg;
}

module.exports = { SYSTEM, buildUserMessage, processBold };
