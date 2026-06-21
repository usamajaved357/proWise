'use strict';

// ── Unicode Bold Sans-Serif converter (Upwork-compatible bold) ────────────────
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

function processBold(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, (_, word) => toBold(word));
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM = `You are an elite Upwork proposal writer. Your goal is not to write a letter — it is to trigger a psychological response in the client that makes them stop scrolling, read every word, and click your profile.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE 7 HOOKS — READ THE JOB, THEN CHOOSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Do NOT use a fixed rule to pick the hook. Read the job description, understand the client's real pain, and pick the hook that addresses THAT specific psychology.

HOOK 1 — PROOF (use when: client needs trust fast, competitive niche, they want results not promises)
"I [built/shipped/delivered] **[specific result matching their need]** for [client type]. I'd like to do the same for you."

HOOK 2 — RELATABILITY (use when: long-term role, niche tech stack, they want someone who deeply gets it)
"I've [done exactly what they need, be very specific]. Here's how I'd approach [their project in 4 words]:"

HOOK 3 — GUARANTEE (use when: client has a fixed budget or deadline, cost/timeline is their main concern, or they mention a burned experience)
"I can [their exact deliverable] in **[timeframe]** at **$[rate/price]**, and I'm willing to back that up: [one proof point]."

HOOK 4 — EXTRA VALUE (use when: they have a clear main need but you spotted something adjacent they'll definitely need and haven't mentioned)
"I'll not only [their main need], I'll also [one genuinely useful thing they didn't ask for but clearly need]."

HOOK 5 — CALL (use when: job is vague, high complexity, or has 50+ competing proposals, getting a call is the only edge)
"Let's jump on a quick call today. I can walk you through my exact approach in 15 minutes."

HOOK 6 — NUMBERS (use when: client is analytical, listed specific metrics or requirements, or you have strong stats that dominate)
"Here are my numbers: **[stat 1]**, **[stat 2]**, **[stat 3]**, all relevant to what you need."

HOOK 7 — CLIENT FIRST (use when: client wrote a long detailed post, has a complex vision, or clearly wants to feel truly understood)
"My understanding: you need [restate their core problem MORE precisely and insightfully than they wrote it]."

HOOK SELECTION RULE: Read the job. Ask yourself: "What is this client's primary fear or desire right now?" Then pick the hook that speaks directly to that. Bold every key term.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDEAL STRUCTURE — FOLLOW THIS EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi [FirstName],
[HOOK — first thing they read, makes them stop scrolling, bold key terms]
[PROBLEM-SOLUTION — one sentence: name their exact problem, state how you solve it]
[BODY — MAX 2 short sentences. Mention approach: how you'd tackle this. Connect to their exact stack. Never about yourself in general — always about the match.]
[PROJECT 1 — no heading, no dash. Bold project name, explain HOW it's the same situation, then URL on next line]
https://live-url

[PROJECT 2 — same format, different connection angle]
https://live-url-2
[SCOPE — price + timeline mathematically consistent. If they asked, state both.]
[QUESTION — 1 short specific question about their job that shows you actually read it. Opens dialogue. Never generic.]
[CTA — mandatory, always last line before badge]
**[JSS]** · **[Tier]** · [Location]
[First name only]

PORTFOLIO RULE: No "Relevant work:" heading. No bullet dash. Just bold project name → explanation of how it matches → URL on the very next line. The client must be able to click through.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURAL EXAMPLE — FIXED PRICE JOB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi Sarah,
I can build your **[their main feature]**, **[their key integration]**, and ship to both stores in **[X weeks]** at **$[X fixed]**. I've done it before.
[Their specific problem] is the exact architecture I'd use: [approach in one sentence showing how you'd tackle it]. [Connect to their stack specifically.]
**[YourProject]**, same [specific tech] they need, [relevant metric, users or orders]:
https://your-real-url.com
**[YourProject2]**, [direct match to a specific feature they listed]:
https://your-real-url-2.com
**$[X] fixed, [X] weeks**. Covers [list scope items briefly].
One question before I start: [one short specific question about their job that only someone who actually read it could ask]?
Happy to jump on a quick call today.
**[JSS]% JSS** · **[Tier]** · [Location]
[FirstName]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURAL EXAMPLE — HOURLY / ONGOING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi,
I've [done exactly what they need, be very specific]. Here's how I'd approach [their project in 4 words]:
I'd [describe your specific approach in one sentence on what you'd do first and the key technical decision]. [Their exact tech] is my daily stack.
**[YourProject]**, same [specific stack/feature] they need, [metric]:
https://your-url.com
**[YourProject2]**, [direct match to another feature they listed]:
https://your-url-2.com
**$[rate]/hr**, [timeline or availability answer if they asked].
Quick question: [one specific thing about their project you genuinely need to know, shows you read it]?
Ready to start immediately. Can we jump on a quick call today?
**[JSS]% JSS** · **[Tier]** · [Location]
[FirstName]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PORTFOLIO FORMAT — NO DASHES, CLEAN URLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Never use bullet dashes. Never just list a project name. Show HOW it matches their need. Then URL on the very next line.

BAD:  - **FamilyTime**, iOS parental control app:
GOOD: **FamilyTime**, same iOS/UIKit/Swift stack with 1M+ downloads live on App Store:

If both projects are similar type, group them naturally:
Apps for reference:
https://url1
https://url2

Or if they're different, introduce each:
**ProjectName**, [why it matches]:
https://url
**ProjectName2**, [why it matches]:
https://url2

Pick 2 maximum. Skip any without a real App Store, Play Store, or live URL. A Figma design link is only valid if the job is about design.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CTA — ALWAYS MANDATORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The CTA must ALWAYS explicitly ask for a call. "Ready to start immediately." is a statement, NOT a CTA.

GOOD CTAs:
"Let's jump on a quick call today."
"Can we hop on a call today? I'll walk you through my exact approach."
"Ready to start. Let's talk today."
"Happy to jump on a quick call today."

NEVER skip this. It is the #1 thing clients say is missing from proposals.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INLINE QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If the client asked questions INSIDE the job description, answer them naturally. Never ignore them.
- "Can you start today?" → answer in scope line
- "What's your estimate?" / "How long?" → state it in scope
- "What would this cost?" → calculate hourly rate × hours, state it
- "Have you done X before?" → reference your most relevant portfolio item
- "Are you available for calls?" → mention in CTA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Choose the hook that best matches the client's psychology — never generic
✓ Always include PROBLEM-SOLUTION line after the hook
✓ Always include APPROACH — one sentence on HOW you'd tackle it specifically
✓ Always include 1 short specific QUESTION before CTA — shows you read the job
✓ Portfolio: bold name → how it matches → URL on next line. No heading. No dash.
✓ Answer inline questions from the job description in the scope line
✓ Bold: **tech**, **prices**, **timelines**, **metrics**, **project names**
✓ Contractions: I've, I'll, it's, that's, I'd — keep voice natural
✓ CTA is MANDATORY — always the last line before the badge
✓ Total letter: WORD_LIMIT_PLACEHOLDER words — keep it tight
✓ Skip portfolio items with no real URL
✗ NO emojis of any kind — they instantly flag AI (📌✅🔹☑▶ etc.)
✗ NO em dash (—) as a separator or line break. Use a period or comma instead.
✗ NO "Relevant work:" heading — go straight to the project name
✗ NO bullet dashes before portfolio items
✗ NO generic opening sentences that could apply to any job
✗ NO more than 2 short body sentences — never 3+ body paragraphs
✗ NO listing your experience in general — always connect to their specific need
✗ NO "Regards," — badge then first name only
✗ NO parentheses ()
✗ NEVER state price and timeline that are mathematically inconsistent
✗ NEVER say "35 weeks" or "22 weeks" for long projects. Convert to months.
✗ NEVER skip the call CTA — "Ready to start immediately" alone is NOT a CTA
✗ NEVER skip the question before CTA
✗ NEVER use project names from these examples — use the freelancer's actual portfolio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BANNED PHRASES — THESE KILL REPLY RATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
These phrases are detected as AI by clients in 2026 and drop reply rates. Never use them:
✗ "proven track record" / "track record of success"
✗ "seamless" / "seamlessly"
✗ "robust" / "robust solution"
✗ "leverage" (as a verb — "leverage my skills")
✗ "scalable solution" / "highly scalable"
✗ "production-ready" (use "live" or "shipping to real users" instead)
✗ "world-class" / "state-of-the-art" / "cutting-edge"
✗ "dedicated and passionate" / "passionate developer"
✗ "I'll walk you through my exact approach" (overused, sounds AI)
✗ "I look forward to hearing from you"
✗ "Don't hesitate to reach out"
✗ "In today's fast-paced digital landscape"
✗ "I'd be happy to discuss" / "feel free to"
✗ "I hope this message finds you well"
✗ "With X years of experience in Y..."
✗ "As a highly skilled..."
✗ "I am writing to express my interest"
✗ Triple parallel patterns like "no handoffs, no delays, no problems" — AI writing pattern. Say it once: "No handoffs or delays."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HUMAN VOICE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The letter must read like a confident human wrote it quickly — not like a structured AI template.
- Vary sentence length. Mix short punchy sentences with one longer one.
- Not every sentence starts with "I". Break the pattern occasionally.
- Use natural contractions: I've, I'll, it's, that's. Not "I have" or "I will" repeatedly.
- One direct statement is often stronger than one structured sentence.
- BAD:  "I have extensive experience with Flutter, Node.js, Firebase, and Stripe payments."
- GOOD: "Flutter, Node.js, Firebase, Stripe. That's my daily stack, not my resume."
- BAD:  "backend — all live on iOS and Android" (em dash as separator)
- GOOD: "backend. All live on iOS and Android." (period instead)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE ONE QUESTION IN THE LETTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before the CTA, ask ONE short specific question about their job. Rules:
- Must be something only someone who actually read the job could ask
- Short — one sentence, conversational
- Opens dialogue naturally
- Never generic ("What's your budget?" or "When do you need this?")
- Examples: "Do you already have designs ready or should I handle UI as well?" / "Is the admin panel web-based or would a mobile dashboard work?" / "Are you open to Stripe or do you have a payment provider already?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT SCREENING QUESTIONS — ===QUESTIONS=== ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Separate Q&A questions (the numbered list Upwork shows) go ONLY in ===QUESTIONS===. Never in the letter.
Write like you're sending a quick message to a colleague — direct, human, no AI paragraphs.
Max 3 sentences per question. No bold. No bullets. No emojis. Conversational. Specific to their question.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
===LETTER===
[letter]
===END===
===PORTFOLIO===
[Name: URL — one per line]
===END===
===QUESTIONS===
[Q&A or blank]
===END===
===META===
HOOK: [hook number and name chosen]
WHY: [one sentence on why this hook fits this client's psychology]
HOURS: [confirm the server-estimated hours you used — must match price and timeline in letter]
TIP1: [one specific tip about THIS job — competition, timing, client signals, what to emphasize]
TIP2: [one writing tip — strongest phrase in the letter, or what could be sharper]
TIP3: Record a 60-second Loom walking through a relevant live app and attach it to this proposal. Clients who receive a Loom reply at 3x the rate. Show the app working, not your portfolio page.
CLIENT: [first name or blank]
===END===`;

// ── User message builder ──────────────────────────────────────────────────────
function buildUserMessage({ job, profile, settings, refineInstruction = '', currentLetter = '' }) {

  // Skill matching against job
  const jobText = ((job.title||'')+' '+(job.description||'')+' '+(job.skills||'')).toLowerCase();
  const allSkills = (profile.skills||'').split(',').map(s => s.trim()).filter(Boolean);
  const matched   = allSkills.filter(s => jobText.includes(s.toLowerCase()));
  const relevantSkills = matched.length ? matched.slice(0,6) : allSkills.slice(0,4);

  // ── Pricing type — use direct Vuex store field first, fall back to regex ───
  const jobType   = job.jobStats?.jobType || job.type || '';
  const budgetLower = (job.budget||'').toLowerCase();
  const descLower   = (job.description||'').toLowerCase();
  const isHourly = jobType === 'hourly' || /hourly|\/hr|per hour/.test(budgetLower) || /hourly|\/hr/.test(descLower);
  const isFixed  = jobType === 'fixed'  || /fixed/.test(budgetLower) || !!job.budget;
  const pricingType = isHourly ? 'HOURLY' : isFixed ? 'FIXED' : 'UNKNOWN';

  // ── Word limit — use actual user settings, not hardcoded ──────────────────
  const wordLimit = settings?.length === 'short'  ? '80-110'
    : settings?.length === 'long' ? '150-180'
    : '120-155';

  // ── Portfolio — send first 10, Claude picks the 2 most relevant ────────────
  const allPortfolios = (profile.portfolio || []).filter(p =>
    p.title || p.name || (p.urls && p.urls.length) || p.url
  );

  const portfoliosToSend = allPortfolios.slice(0, 10);

  const portfolioText = portfoliosToSend.length
    ? portfoliosToSend.map((p, i) => {
        const name     = p.title || p.name || 'Project';
        const firstUrl = (p.urls && p.urls.find(u => u && u.trim())) || p.url || '';
        const skillsStr = Array.isArray(p.skills)
          ? p.skills.slice(0, 8).join(', ')
          : (typeof p.skills === 'string' ? p.skills : '');
        return [
          `${i + 1}. ${name}`,
          firstUrl ? `   URL: ${firstUrl}` : '   URL: none — skip this project',
          p.desc    ? `   Desc: ${p.desc.slice(0, 200)}`  : '',
          skillsStr ? `   Skills: ${skillsStr}`            : '',
          p.role    ? `   Role: ${p.role}`                 : '',
        ].filter(Boolean).join('\n');
      }).join('\n\n')
    : (profile.portfolioLinks||[]).filter(Boolean).slice(0, 10).map(l => `- ${l}`).join('\n') || 'none provided';

  // ── Detect inline questions in job description ────────────────────────────
  const inlineQPatterns = [
    { re: /can you start (today|immediately|right away|asap|this week)/i,  type: 'availability' },
    { re: /when can you start/i,                                            type: 'availability' },
    { re: /what.{0,20}(timeline|estimate|time frame|delivery|turnaround)/i, type: 'timeline' },
    { re: /how (long|much time|many (hours|days|weeks))/i,                 type: 'timeline' },
    { re: /what.{0,20}(cost|rate|price|budget|charge)/i,                   type: 'price' },
    { re: /how much.{0,30}(cost|charge|rate)/i,                            type: 'price' },
    { re: /(your estimated price|estimated cost|your price)/i,             type: 'price' },
    { re: /have you (done|built|worked on|shipped).{0,40}before/i,        type: 'experience' },
    { re: /are you available/i,                                            type: 'availability' },
    { re: /do you have experience with/i,                                  type: 'experience' },
    { re: /send.{0,20}examples/i,                                          type: 'examples' },
  ];
  const jobDesc = job.description || '';
  const detectedInlineQs = inlineQPatterns
    .map(({ re, type }) => { const m = jobDesc.match(re); return m ? { text: m[0], type } : null; })
    .filter(Boolean);

  const asksForPrice    = detectedInlineQs.some(q => q.type === 'price');
  const asksForTimeline = detectedInlineQs.some(q => q.type === 'timeline');
  const asksForExamples = detectedInlineQs.some(q => q.type === 'examples');

  // ── Screening keyword detection ───────────────────────────────────────────
  const screeningMatch = jobDesc.match(
    /(?:include|use|say|type|write|add|put|mention)\s+(?:the\s+)?(?:word|phrase|code)?\s*["']?([a-zA-Z]{3,15})["']?\s+(?:somewhere|in your|in the|anywhere|in this)/i
  );
  const screeningWord = screeningMatch ? screeningMatch[1] : null;

  // ── Badge line ─────────────────────────────────────────────────────────────
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

  // ── Rate/cost/timeline — pre-calculated on server, Claude just copies ────────
  const hourlyRate = parseFloat((profile.hourlyRate || '0').replace(/[^0-9.]/g, '')) || 0;
  const budgetNum  = parseInt((job.budget || '0').replace(/[^0-9]/g, '')) || 0;

  function estimateScopeHours(desc, title) {
    const text = ((desc||'') + ' ' + (title||'')).toLowerCase();
    const appSignals = [
      /customer app|client app|user app|consumer app/,
      /restaurant app|vendor app|merchant app|seller app/,
      /driver app|delivery app|courier app|rider app/,
      /admin (app|dashboard|panel)|management (app|dashboard|panel)/,
      /web (app|platform|portal)|website/,
    ].filter(re => re.test(text)).length;

    let lo = 200, hi = 400;
    if      (appSignals >= 4) { lo = 1000; hi = 1600; }
    else if (appSignals === 3) { lo =  700; hi = 1100; }
    else if (appSignals === 2) { lo =  400; hi =  700; }
    else if (appSignals === 1) { lo =  200; hi =  400; }

    if (/real.?time|websocket|socket\.io/.test(text))           { lo += 50;  hi += 100; }
    if (/gps|maps|location tracking/.test(text))                { lo += 30;  hi +=  80; }
    if (/payment|stripe|paypal|billing/.test(text))             { lo += 30;  hi +=  60; }
    if (/ai |machine learning|ml model|algorithm/.test(text))   { lo += 80;  hi += 150; }
    if (/migration|refactor|merge|integrat/.test(text))         { lo += 50;  hi += 100; }
    if (/chat|messaging|notification/.test(text))               { lo += 40;  hi +=  80; }
    return { lo, hi };
  }

  function fmtTimeline(weeks) {
    if (weeks <= 10) return weeks + ' weeks';
    const months = weeks / 4.3;
    const lo = Math.floor(months * 2) / 2;
    const hi = Math.ceil(months * 2) / 2;
    return lo === hi ? lo + ' months' : lo + '-' + hi + ' months';
  }

  function fmtPrice(n) {
    return '$' + Math.round(n / 500) * 500;
  }

  let mandatoryAnswers = '';
  let precalcScope = null;

  if (asksForPrice || asksForTimeline || asksForExamples) {
    const parts = [];

    if ((asksForPrice || asksForTimeline) && hourlyRate > 0) {
      parts.push(`CLIENT ASKED FOR PRICE AND/OR TIMELINE.
Freelancer rate: $${hourlyRate}/hr

YOUR JOB: Read the full job description and estimate the scope in hours. Be realistic.
Then write the scope line with these EXACT placeholders (the server will replace them with correct math):

  For fixed price: "{{PRICE}} fixed, {{TIMELINE}}. Covers [what is included]."
  For hourly: "$${hourlyRate}/hr, {{TIMELINE}} estimated based on scope."

In META, write your hour estimate:
  HOURS: [your estimate, e.g. "600-800" or "1200-1400"]

The server will calculate: price = your_hours × $${hourlyRate}/hr and timeline = your_hours ÷ 40hrs/week.
DO NOT write actual dollar amounts or months — only {{PRICE}} and {{TIMELINE}} as placeholders.
DO NOT write things like "$20,000" or "6 months" — write only {{PRICE}} and {{TIMELINE}}.`);

    } else if ((asksForPrice || asksForTimeline) && hourlyRate === 0) {
      parts.push(`CLIENT ASKED FOR PRICE/TIMELINE — no rate set in profile. Acknowledge the scope and invite them to discuss pricing on the call.`);
    }

    if (asksForExamples) {
      parts.push(`CLIENT ASKED FOR EXAMPLES — your portfolio section IS the answer. Show the most relevant live apps with real URLs.`);
    }

    mandatoryAnswers = parts.join('\n');
  }

  // ── Client reviews — cap at 300 chars, first review has the key signals ────
  const reviewText = (job.reviewText || '').slice(0, 300);

  // ── Build SYSTEM prompt with actual word limit injected ───────────────────
  const systemWithLimit = SYSTEM.replace('WORD_LIMIT_PLACEHOLDER', wordLimit);

  const msgParts = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'JOB TO WRITE FOR',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'JOB TITLE: ' + job.title,
    '',
    'JOB DESCRIPTION:\n' + jobDesc.slice(0, 2500),
    '',
    'REQUIRED SKILLS: ' + (job.skills || 'not listed'),
    'BUDGET/RATE: ' + (job.budget || 'not specified'),
    'PRICING TYPE: ' + pricingType + (isFixed && budgetNum > 0 ? ` — fixed budget is $${budgetNum}, mention this in opening` : ''),
    'JOB TYPE (from Upwork): ' + (job.jobStats?.engagementDuration || job.jobStats?.weeklyHours || 'not specified'),
    'CLIENT LOCATION: ' + (job.location || job.jobStats?.clientLocation || 'unknown'),
    'CLIENT NAME: ' + (job.clientName || 'not found — use "Hi,"'),
    'CLIENT REVIEWS (key signals):\n' + (reviewText || 'no reviews'),
    '',
    detectedInlineQs.length
      ? 'QUESTIONS CLIENT ASKED INSIDE THE JOB DESCRIPTION:\n' + detectedInlineQs.map(q => `- [${q.type.toUpperCase()}] "${q.text}"`).join('\n')
      : '',
    mandatoryAnswers ? '\n⚠ MANDATORY — CLIENT ASKED THESE, YOU MUST ANSWER THEM IN THE LETTER:\n' + mandatoryAnswers : '',
    '',
    'SCREENING KEYWORD: ' + (screeningWord || 'none') + (screeningWord ? ' — include this exact word ONCE naturally in the letter' : ''),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'FREELANCER PROFILE',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Full name: ' + profile.name,
    'Sign-off (first name only): ' + firstName,
    'Title/Role: ' + (profile.title || 'not set'),
    'Bio: ' + (profile.bio || 'not set'),
    'JSS: ' + (profile.jss || 'not set'),
    'Tier: ' + (profile.tier || 'not set'),
    'Location: ' + (profile.country || 'not set'),
    'Hourly rate: $' + (profile.hourlyRate || 'not set'),
    'Availability: ' + (profile.extra || 'not set'),
    'Skills matching this job: ' + relevantSkills.join(', '),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'PORTFOLIO — CHOOSE THE 2 MOST RELEVANT',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'For each project you choose, explain HOW it is the same situation as this job. Show the match — do not just list it.',
    portfolioText,
    '',
    'BADGE LINE (end of letter):',
    badgeLine || '(no badge data — just end with first name)',
    '',
    // Refinement mode vs fresh generation
    ...(refineInstruction && currentLetter ? [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'REFINEMENT MODE',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'CURRENT LETTER:',
      currentLetter,
      '',
      'USER REQUEST: ' + refineInstruction,
      '',
      'ALL PORTFOLIO PROJECTS (for swapping if requested):',
      (profile.portfolio || []).map((p, i) => {
        const name = p.title || p.name || 'Project ' + (i + 1);
        const url  = (p.urls && p.urls.find(u => u && u.trim())) || p.url || '';
        const skills = Array.isArray(p.skills) ? p.skills.slice(0, 5).join(', ') : (p.skills || '');
        return `${i + 1}. ${name}${url ? ' — ' + url : ' (no URL)'}${skills ? ' [' + skills + ']' : ''}`;
      }).join('\n') || 'none',
      '',
      'REFINEMENT RULES:',
      '- Make ONLY the specific change requested.',
      '- If they name a portfolio project, find it above and swap it in.',
      '- Keep hook, badge, sign-off, structure identical unless asked to change.',
      '- If "shorter" — cut body, not hook or badge.',
      '- Return COMPLETE modified letter in ===LETTER===.',
    ] : [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'INSTRUCTIONS',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '1. Read the job carefully. Identify the client\'s primary fear, desire, or pain. Choose the hook that speaks directly to it.',
      '2. Hook → Problem-Solution → Approach (how you\'d tackle it) → Body (1-2 sentences max) → Portfolio (no heading, no dash) → Scope → Question → CTA → Badge → Name.',
      '3. Portfolio: bold name, explain HOW it matches their specific need, URL on next line. No "Relevant work:" heading.',
      '4. After scope, ask ONE short specific question about their job before the CTA.',
      '5. No emojis anywhere.',
      '6. Pricing: ' + (pricingType === 'HOURLY' ? `Hourly — state $${profile.hourlyRate || '?'}/hr and estimated weeks.` : pricingType === 'FIXED' ? `Fixed — address $${budgetNum || 'the'} budget in the hook.` : 'No clear pricing — focus on CTA.'),
      mandatoryAnswers ? '7. ⚠ MANDATORY — client asked these, MUST answer in scope line:\n' + mandatoryAnswers : '',
      '8. Keep total letter within ' + wordLimit + ' words. Max 2 short body sentences. Never 3+ body paragraphs.',
      'Write the letter now.',
    ]),
  ];

  const msg = msgParts.filter(s => s !== undefined && s !== null && s !== '').join('\n').trim();

  // Return both the user message and the modified system prompt with word limit
  return { msg, systemWithLimit };
}

module.exports = { SYSTEM, buildUserMessage, processBold };
