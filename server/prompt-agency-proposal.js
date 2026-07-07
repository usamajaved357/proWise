'use strict';

// ── Snag AI Agency Cover Letter — Claude proposal-writing prompt ───────────
// Mirrors server/prompt.js's engineering discipline (hook psychology, scope
// math handed to the model pre-computed, delimiter output format so
// server/modules/claude.js's parseDelimiterFormat/callClaude are reused
// unchanged) but rewritten for an AGENCY responding to a job, not a solo
// freelancer: collective "we" voice, a rate RANGE instead of one hourly
// number, team/staff signals instead of individual badges, and portfolio
// data shaped like extension/background/modules/agency-data.js's output.

const AGENCY_SYSTEM = `You are an elite Upwork proposal writer — but you write on behalf of an AGENCY, not a solo freelancer. Your goal is not to write a letter — it is to trigger a psychological response in the client that makes them stop scrolling, read every word, and click through.

VOICE RULE — HARD REQUIREMENT: this proposal is written in the agency's collective voice throughout — "we", "our team", "we've shipped" — never "I" or "my". A client hiring an agency expects to be talking to an organization, not one person pretending to be a team. The only exception is the sign-off, which may use the agency name or a team lead's first name if given.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE 7 HOOKS — READ THE JOB, THEN CHOOSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Do NOT use a fixed rule to pick the hook. Read the job description, understand the client's real pain, and pick the hook that addresses THAT specific psychology.

HOOK 1 — PROOF (use when: client needs trust fast, competitive niche, they want results not promises)
"We [built/shipped/delivered] **[specific result matching their need]** for [client type]. We'd like to do the same for you."

HOOK 2 — RELATABILITY (use when: long-term role, niche tech stack, they want a team that deeply gets it)
"We've [done exactly what they need, be very specific]. Here's how we'd approach [their project in 4 words]:"

HOOK 3 — GUARANTEE (use when: client has a fixed budget or deadline, cost/timeline is their main concern, or they mention a burned experience)
"We can [their exact deliverable] in **[timeframe]** at **$[rate/price]**, and we're willing to back that up: [one proof point]."

HOOK 4 — EXTRA VALUE (use when: they have a clear main need but you spotted something adjacent they'll definitely need and haven't mentioned)
"We'll not only [their main need], we'll also [one genuinely useful thing they didn't ask for but clearly need]."

HOOK 5 — CALL (use when: job is vague, high complexity, or has 50+ competing proposals, getting a call is the only edge)
"Let's jump on a quick call today. We can walk you through our exact approach and team setup in 15 minutes."

HOOK 6 — NUMBERS (use when: client is analytical, listed specific metrics or requirements, or you have strong stats that dominate)
"Here are our numbers: **[stat 1]**, **[stat 2]**, **[stat 3]**, all relevant to what you need."

HOOK 7 — CLIENT FIRST (use when: client wrote a long detailed post, has a complex vision, or clearly wants to feel truly understood)
"Our understanding: you need [restate their core problem MORE precisely and insightfully than they wrote it]."

HOOK SELECTION RULE: Read the job. Ask yourself: "What is this client's primary fear or desire right now?" Then pick the hook that speaks directly to that. Bold every key term.

HOOK LENGTH RULE — CRITICAL:
The hook is the ONLY thing clients see before deciding to open the proposal (~160 characters visible in the feed).
- Keep the hook to ONE sentence, under 160 characters
- Name ONE specific project and ONE compelling result — that's it
- Do NOT list features, tech stack, or multiple things in the hook
- The detail and approach come AFTER they open — the hook just makes them want to

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDEAL STRUCTURE — FOLLOW THIS EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi [FirstName],
[HOOK — first thing they read, makes them stop scrolling, bold key terms]
[PROBLEM-SOLUTION — one sentence: name their exact problem, state how the team solves it]
[BODY — MAX 2 short sentences. Mention approach: how the team would tackle this, and who's involved if it strengthens trust (e.g. "a senior engineer and a designer"). Connect to their exact stack. Never a generic capability list — always about the match.]
[PROJECT 1 — no heading, no dash. Bold project name, explain HOW it's the same situation, then URL on next line]
https://live-url

[PROJECT 2 — same format, different connection angle]
https://live-url-2
[SCOPE — price + timeline mathematically consistent. If they asked, state both.]
[QUESTION — 1 short specific question about their job that shows the team actually read it. Opens dialogue. Never generic.]
[CTA — mandatory, always last line before badge]
**[JSS]** · **[Badge tier]** · [Location]
[Agency name or team lead first name]

PORTFOLIO RULE: No "Relevant work:" heading. No bullet dash. Just bold project name → explanation of how it matches → URL on the very next line. The client must be able to click through.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PORTFOLIO FORMAT — NO DASHES, CLEAN URLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Never use bullet dashes. Never just list a project name. Show HOW it matches their need. Then URL on the very next line.

BAD:  - **FamilyTime**, iOS parental control app:
GOOD: **FamilyTime**, same iOS/UIKit/Swift stack with 1M+ downloads live on App Store:

Pick 2 maximum. Skip any without a real project URL.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CTA — ALWAYS MANDATORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The CTA must ALWAYS explicitly ask for a call. "Ready to start immediately." is a statement, NOT a CTA.

GOOD CTAs:
"Let's jump on a quick call today."
"Can we hop on a call today? We'll walk you through our exact approach and who'd be on the team."
"Ready to start. Let's talk today."

NEVER skip this. It is the #1 thing clients say is missing from proposals.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INLINE QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If the client asked questions INSIDE the job description, answer them naturally. Never ignore them.
- "Can you start today?" → answer in scope line
- "What's your estimate?" / "How long?" → state it in scope
- "What would this cost?" → calculate rate × hours, state it
- "Have you done X before?" → reference the team's most relevant portfolio item
- "Are you available for calls?" → mention in CTA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Choose the hook that best matches the client's psychology — never generic
✓ Always include PROBLEM-SOLUTION line after the hook
✓ Always include APPROACH — one sentence on HOW the team would tackle it specifically
✓ Always include 1 short specific QUESTION before CTA — shows the team read the job
✓ Portfolio: bold name → how it matches → URL on next line. No heading. No dash.
✓ Answer inline questions from the job description in the scope line
✓ Bold: **tech**, **prices**, **timelines**, **metrics**, **project names**
✓ Contractions: we've, we'll, it's, that's, we'd — keep voice natural but always plural
✓ CTA is MANDATORY — always the last line before the badge
✓ Total letter: WORD_LIMIT_PLACEHOLDER words — keep it tight
✓ Skip portfolio items with no real URL
✗ NO emojis of any kind — they instantly flag AI (📌✅🔹☑▶ etc.)
✗ NO em dash (—) as a separator or line break. Use a period or comma instead.
✗ NO "Relevant work:" heading — go straight to the project name
✗ NO bullet dashes before portfolio items
✗ NO generic opening sentences that could apply to any job
✗ NO listing 4+ features/tech in the hook — pick one project and one result
✗ NO hook longer than 160 characters — clients decide to open based on those chars alone
✗ NO more than 2 short body sentences — never 3+ body paragraphs
✗ NO listing the agency's general capabilities — always connect to their specific need
✗ NO "Regards," — badge then agency/team-lead name only
✗ NO parentheses ()
✗ NEVER state price and timeline that are mathematically inconsistent
✗ NEVER say "35 weeks" or "22 weeks" for long projects. Convert to months.
✗ NEVER mention price in the hook — state it ONCE only in the scope line using {{PRICE}}
✗ NEVER skip the call CTA — "Ready to start immediately" alone is NOT a CTA
✗ NEVER skip the question before CTA
✗ NEVER use "I"/"my" anywhere — this is an agency, not a solo freelancer
✗ NEVER write a portfolio entry if you have no real URL for it. If ALL portfolio items say "URL: none", skip the entire portfolio section — write nothing. An empty section is better than a fabricated one.
✗ NEVER invent a false history for a specific named portfolio project. Describe portfolio projects ONLY using what is in the project data provided.
✗ NEVER invent team size, member names, or credentials beyond what's given in the agency data.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BANNED PHRASES — THESE KILL REPLY RATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
These phrases are detected as AI by clients in 2026 and drop reply rates. Never use them:
✗ "proven track record" / "track record of success"
✗ "seamless" / "seamlessly" — NEVER use this word, not even once
✗ "robust" / "robust solution"
✗ "leverage" (as a verb — "leverage our expertise")
✗ "scalable solution" / "highly scalable"
✗ "production-ready" (use "live" or "shipping to real users" instead)
✗ "world-class" / "state-of-the-art" / "cutting-edge"
✗ "dedicated and passionate" / "passionate team"
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
The letter must read like a confident team wrote it quickly — not like a structured AI template.
- Vary sentence length. Mix short punchy sentences with one longer one.
- Not every sentence starts with "We". Break the pattern occasionally.
- Use natural contractions: we've, we'll, it's, that's. Not "we have" or "we will" repeatedly.
- One direct statement is often stronger than one structured sentence.
- BAD:  "We have extensive experience with Flutter, Node.js, Firebase, and Stripe payments."
- GOOD: "Flutter, Node.js, Firebase, Stripe. That's our daily stack, not our pitch deck."
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT SCREENING QUESTIONS — ===QUESTIONS=== ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Separate Q&A questions (the numbered list Upwork shows) go ONLY in ===QUESTIONS===. Never in the letter.
Write like the team is sending a quick message to a colleague — direct, human, no AI paragraphs.
Max 3 sentences per question. No bold. No bullets. No emojis. Conversational. Specific to their question. Stay in "we" voice.

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
TIP3: Record a short walkthrough of a relevant project and attach it to this proposal — clients respond noticeably more to agencies that show real work, not just describe it.
CLIENT: [first name or blank]
===END===`;

// ── User message builder ──────────────────────────────────────────────────
function buildAgencyUserMessage({ job, agency, settings, refineInstruction = '', currentLetter = '', categories = [] }) {
  const hasCategories = Array.isArray(categories) && categories.length > 0;
  const categoryLabel = hasCategories ? categories.join(', ') : 'General Agency';

  // ── Skill matching against job ──────────────────────────────────────────
  const jobText = ((job.title || '') + ' ' + (job.description || '') + ' ' + (job.skills || '')).toLowerCase();
  const allSkills = Array.isArray(agency.skills) ? agency.skills : [];
  const matched = allSkills.filter(s => jobText.includes(String(s).toLowerCase()));
  const relevantSkills = matched.length ? matched.slice(0, 6) : allSkills.slice(0, 4);

  // ── Pricing type — same Vuex-first, regex-fallback logic as freelancer ──
  const jobType = job.jobStats?.jobType || '';
  const budgetStr = (job.budget || '');
  const budgetLower = budgetStr.toLowerCase();
  const descLower = (job.description || '').toLowerCase();

  let isHourly, isFixed;
  if (jobType === 'hourly') {
    isHourly = true; isFixed = false;
  } else if (jobType === 'fixed') {
    isFixed = true; isHourly = false;
  } else {
    isHourly = /hourly|\/hr|per hour/.test(budgetLower) || /hourly|per hour/i.test(descLower);
    isFixed = /fixed.?price|fixed.?rate|fixed.?budget/i.test(budgetLower + ' ' + descLower);
  }
  const pricingType = isHourly ? 'HOURLY' : isFixed ? 'FIXED' : 'UNKNOWN';

  const wordLimit = settings?.length === 'short' ? '80-110'
    : settings?.length === 'long' ? '150-180'
    : '120-155';

  // ── Portfolio — send first 10, Claude picks the 2 most relevant ────────
  const allPortfolios = (agency.portfolio || []).filter(p => p.title || p.url);
  const portfoliosToSend = allPortfolios.slice(0, 10);

  const portfolioText = portfoliosToSend.length
    ? portfoliosToSend.map((p, i) => [
        `${i + 1}. ${p.title || 'Project'}`,
        p.url ? `   URL: ${p.url}` : '   URL: none — skip this project in letter',
        p.description ? `   Desc: ${p.description.slice(0, 200)}` : '',
      ].filter(Boolean).join('\n')).join('\n\n')
    : 'none provided';

  // ── Detect inline questions in job description ──────────────────────────
  const inlineQPatterns = [
    { re: /can you start (today|immediately|right away|asap|this week)/i, type: 'availability' },
    { re: /when can you start/i, type: 'availability' },
    { re: /what.{0,20}(timeline|estimate|time frame|delivery|turnaround)/i, type: 'timeline' },
    { re: /how (long|much time|many (hours|days|weeks))/i, type: 'timeline' },
    { re: /what.{0,20}(cost|rate|price|budget|charge)/i, type: 'price' },
    { re: /how much.{0,30}(cost|charge|rate)/i, type: 'price' },
    { re: /(your estimated price|estimated cost|your price)/i, type: 'price' },
    { re: /have you (done|built|worked on|shipped).{0,40}before/i, type: 'experience' },
    { re: /are you available/i, type: 'availability' },
    { re: /do you have experience with/i, type: 'experience' },
    { re: /send.{0,20}examples/i, type: 'examples' },
  ];
  const jobDesc = job.description || '';
  const detectedInlineQs = inlineQPatterns
    .map(({ re, type }) => { const m = jobDesc.match(re); return m ? { text: m[0], type } : null; })
    .filter(Boolean);
  const asksForExamples = detectedInlineQs.some(q => q.type === 'examples');

  // ── Screening keyword detection ─────────────────────────────────────────
  const screeningMatch = jobDesc.match(
    /(?:include|use|say|type|write|add|put|mention)\s+(?:the\s+)?(?:word|phrase|code)?\s*["']?([a-zA-Z]{3,15})["']?\s+(?:somewhere|in your|in the|anywhere|in this)/i
  );
  const screeningWord = screeningMatch ? screeningMatch[1] : null;

  // ── Badge line — agency signals, not individual ones ────────────────────
  const jssVal = agency.jobSuccessScore != null ? String(agency.jobSuccessScore) : null;
  const badgeTier = agency.topRatedPlusStatus === 'ELIGIBLE' ? 'Top Rated Plus'
    : agency.topRatedStatus === 'ELIGIBLE' ? 'Top Rated'
    : agency.vetted ? 'Vetted'
    : null;
  const location = (agency.locations || [])[0]
    ? [agency.locations[0].city, agency.locations[0].country].filter(Boolean).join(', ')
    : '';
  const badgeParts = [
    jssVal ? ('**' + jssVal + '% JSS**') : null,
    badgeTier ? ('**' + badgeTier + '**') : null,
    location || null,
  ].filter(Boolean);
  const badgeLine = badgeParts.join(' · ');
  const signOffName = agency.name || 'The Team';

  // ── Detect ongoing/long-term role ────────────────────────────────────────
  const fullJobContext = [job.description, job.title, job.budget, job.type].filter(Boolean).join(' ').toLowerCase();
  const isOngoingRole = /more than 6 months|ongoing|long.?term|full.?time|part.?time|permanent|recurring|retainer/i.test(fullJobContext);

  const hasAnyPortfolioUrl = portfoliosToSend.some(p => !!p.url);

  // ── Rate/cost/timeline — pre-calculated on server, Claude just copies ───
  // Agencies quote a RANGE, not a single number — use the midpoint for the
  // math (same $/hour × hours-estimate model as the freelancer flow) but
  // always PRESENT the range in the scope line so the client sees what the
  // freelancer flow shows as a single figure.
  const minRate = parseFloat(agency.minRate) || 0;
  const maxRate = parseFloat(agency.maxRate) || 0;
  const midRate = minRate && maxRate ? (minRate + maxRate) / 2 : (minRate || maxRate || 0);
  const rateRangeStr = minRate && maxRate && minRate !== maxRate
    ? `$${minRate}-$${maxRate}/hr`
    : (midRate ? `$${midRate}/hr` : '');

  const budgetNum = isFixed
    ? Math.round(parseFloat(budgetStr.replace(/[^0-9.]/g, '')) || 0)
    : (job.jobStats?.budgetNum || 0);

  function estimateScopeHours(desc, title) {
    const text = ((desc || '') + ' ' + (title || '')).toLowerCase();
    const appSignals = [
      /customer app|client app|user app|consumer app/,
      /restaurant app|vendor app|merchant app|seller app/,
      /driver app|delivery app|courier app|rider app/,
      /admin (app|dashboard|panel)|management (app|dashboard|panel)/,
      /web (app|platform|portal)|website/,
    ].filter(re => re.test(text)).length;
    let lo = 200, hi = 400;
    if (appSignals >= 4) { lo = 1000; hi = 1600; }
    else if (appSignals === 3) { lo = 700; hi = 1100; }
    else if (appSignals === 2) { lo = 400; hi = 700; }
    else if (appSignals === 1) { lo = 200; hi = 400; }
    if (/real.?time|websocket|socket\.io/.test(text)) { lo += 50; hi += 100; }
    if (/gps|maps|location tracking/.test(text)) { lo += 30; hi += 80; }
    if (/payment|stripe|paypal|billing/.test(text)) { lo += 30; hi += 60; }
    if (/ai |machine learning|ml model|algorithm/.test(text)) { lo += 80; hi += 150; }
    if (/migration|refactor|merge|integrat/.test(text)) { lo += 50; hi += 100; }
    if (/chat|messaging|notification/.test(text)) { lo += 40; hi += 80; }
    return { lo, hi };
  }

  let mandatoryAnswers = '';

  if (isFixed) {
    const budgetLine = budgetNum > 0
      ? `Client's stated fixed budget: $${budgetNum}. Write scope as: "$${budgetNum} fixed. Covers [what is included]."`
      : `Budget not specified. Write scope as: "Fixed price — happy to quote after a quick call to confirm scope."`;
    mandatoryAnswers = `SCOPE LINE — FIXED PRICE JOB:
${budgetLine}
DO NOT calculate hourly rate × hours. DO NOT use {{PRICE}} or {{TIMELINE}} placeholders.
DO NOT quote an ongoing hourly rate for a fixed price job.`;

  } else if (isOngoingRole && rateRangeStr) {
    mandatoryAnswers = `SCOPE LINE — ONGOING ROLE:
This is a long-term ongoing position, not a fixed project.
Write scope as: "${rateRangeStr} — available with dedicated team capacity as needed."
DO NOT write "estimated X weeks" or "X-Y months" — there is no fixed endpoint.
DO NOT use {{PRICE}} or {{TIMELINE}} placeholders.`;

  } else if (midRate > 0) {
    mandatoryAnswers = `SCOPE LINE — MANDATORY PLACEHOLDER RULE:
Agency rate range: ${rateRangeStr || ('$' + midRate + '/hr')}

ALWAYS write the scope line using BOTH placeholders (applies to EVERY letter):
  "{{PRICE}} fixed, {{TIMELINE}}. Covers [what is included]."
  or for hourly: "${rateRangeStr || ('$' + midRate + '/hr')}, estimated {{TIMELINE}} based on scope."

In META, write your scope hour estimate:
  HOURS: [range like "400-600" or "1200-1500"]

The server calculates from HOURS using the midpoint rate $${midRate}/hr:
  price    = hours × $${midRate}/hr
  timeline = hours ÷ 40hrs/week (≤10 weeks = say weeks, >10 = say months)

ABSOLUTE RULES — NEVER BREAK THESE:
- NEVER write a dollar amount in the letter — only {{PRICE}}
- NEVER write a timeline in the letter — only {{TIMELINE}}
- NEVER state price in the hook AND scope line — scope line only
- Write BOTH {{PRICE}} and {{TIMELINE}} together, never one without the other`;

  } else {
    mandatoryAnswers = `No rate range set on the agency profile. Invite them to discuss pricing on the call. Do not invent a number.`;
  }

  if (asksForExamples) {
    mandatoryAnswers += `\nCLIENT ASKED FOR EXAMPLES — your portfolio section IS the answer. Show the most relevant live projects.`;
  }

  const reviewText = (job.reviewText || '').slice(0, 300);
  const systemWithLimit = AGENCY_SYSTEM.replace('WORD_LIMIT_PLACEHOLDER', wordLimit);

  const teamSize = (agency.managers || []).length + (agency.members || []).length;
  const teamLine = teamSize > 0
    ? `Visible team roster: ${teamSize} member(s) (${(agency.managers || []).length} manager(s), ${(agency.members || []).length} contributor(s))`
    : 'Team roster not detailed on profile';

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
    'AGENCY PROFILE',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Agency name: ' + (agency.name || ''),
    'Sign-off: ' + signOffName,
    'Agency specialties: ' + categoryLabel,
    'Summary/tagline: ' + (agency.summary || 'not set'),
    'Description: ' + (agency.description || 'not set'),
    'JSS: ' + (agency.jobSuccessScore != null ? agency.jobSuccessScore : 'not set'),
    'Badge tier: ' + (badgeTier || 'not set'),
    'Location: ' + (location || 'not set'),
    'Rate range: ' + (rateRangeStr || 'not set'),
    teamLine,
    'Skills matching this job: ' + relevantSkills.join(', '),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'PORTFOLIO — CHOOSE THE 2 MOST RELEVANT',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'For each project you choose, explain HOW it is the same situation as this job. Show the match — do not just list it.',
    portfolioText,
    '',
    'BADGE LINE (end of letter):',
    badgeLine || '(no badge data — just end with agency/team-lead name)',
    '',
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
      (agency.portfolio || []).map((p, i) => `${i + 1}. ${p.title || 'Project ' + (i + 1)}${p.url ? ' — ' + p.url : ' (no URL)'}`).join('\n') || 'none',
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
      !hasAnyPortfolioUrl ? '0. PORTFOLIO WARNING: No portfolio URLs available. Skip the portfolio section entirely — write nothing. Use Hook 7, 4, or 5 instead of Hook 1 or 6 which require live proof.' : '',
      '1. Read the job carefully. Identify the client\'s primary fear, desire, or pain. Choose the hook that speaks directly to it.',
      '2. Hook → Problem-Solution → Approach (how the team would tackle it) → Body (1-2 sentences max) → Portfolio (no heading, no dash) → Scope → Question → CTA → Badge → Name.',
      '3. Portfolio: bold name, explain HOW it matches their specific need, URL on next line. No "Relevant work:" heading.',
      '4. After scope, ask ONE short specific question about their job before the CTA.',
      '5. No emojis anywhere.',
      '6. In the body, reference the specific deliverables and requirements from THIS job, not the agency\'s general capabilities.',
      '7. Pricing: ' + (pricingType === 'HOURLY' ? `Hourly — state ${rateRangeStr || 'the agency rate'} and estimated weeks.` : pricingType === 'FIXED' ? `Fixed — address $${budgetNum || 'the'} budget in the hook.` : 'No clear pricing — focus on CTA.'),
      mandatoryAnswers ? '7. ⚠ MANDATORY — client asked these, MUST answer in scope line:\n' + mandatoryAnswers : '',
      '8. Keep total letter within ' + wordLimit + ' words. Max 2 short body sentences. Never 3+ body paragraphs.',
      '9. Stay in "we"/"our team" voice throughout — never "I"/"my".',
      'Write the letter now.',
    ]),
  ];

  const msg = msgParts.filter(s => s !== undefined && s !== null && s !== '').join('\n').trim();
  return { msg, systemWithLimit };
}

module.exports = { AGENCY_SYSTEM, buildAgencyUserMessage };
