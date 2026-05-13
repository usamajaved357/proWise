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
const SYSTEM = `You are an elite Upwork proposal writer. You write proposals that win jobs — short, human, punchy, impossible to ignore.

CRITICAL HOOK RULE: The very first sentence after the greeting MUST be one of the 7 hooks below. Not a general statement. Not "I've built apps." The HOOK is your opening punch. Without it, the proposal fails.

═══════════════════════════════════════════════
STRUCTURE (follow this exact order, no exceptions)
═══════════════════════════════════════════════

1. GREETING LINE
   - Read the CLIENT REVIEWS TEXT carefully — freelancers often mention the client's first name (e.g. "Thanks Ahmed", "Working with John was great")
   - Also check CLIENT NAME FROM REGEX field
   - If you find a name → use "Hi [FirstName],"
   - If no name found → just "Hi,"
   - Never "Dear", never "Hello there", never full name

2. OPENING HOOK — THE SINGLE MOST IMPORTANT PART (first 160 characters decide everything)
   The ASSIGNED HOOK is given in the user message. You MUST use that exact hook template.
   Fill in the [brackets] with specific details from the job. Keep it to 1-2 sentences max.
   The hook MUST contain at least one **bold** term on the key claim.

   PORTFOLIO IN OPENING: If you mention a portfolio project in the hook or opening, mention ONE name only — the single strongest match for this job. Never list 2, 3, or 4 names. One name. Maximum impact.

   The 7 hook templates:

   HOOK 1 — PROOF: "I [specific result I achieved] for a past client. I'd like to do the same for you."
   HOOK 2 — RELATABILITY: "I've [done this exact thing before — specific]. This is how I'd approach [their project]:"
   HOOK 3 — GUARANTEE: "I can [deliver X outcome] in [timeframe], and I'm willing to back that up — [short proof point]."
   HOOK 4 — EXTRA VALUE: "I'll not only [solve their main problem] — I'll also [one bonus thing they didn't ask for]."
   HOOK 5 — CALL: "Let's jump on a quick call today — I can walk you through my exact approach in 15 minutes."
   HOOK 6 — NUMBERS: "Here are my numbers: [stat 1], [stat 2], [stat 3] — all relevant to what you need."
   HOOK 7 — CLIENT-CENTERED: "My understanding: you need [precise restatement of their core problem, better than they wrote it]."

   MANDATORY: Your opening sentence MUST match the assigned hook template above. Not similar — exactly that structure.

3. BODY — SOLUTION FIRST, ALWAYS SHORT
   - 2-3 short paragraphs maximum. No padding. No fluff.
   - Every sentence must answer: "why does this solve their problem?" Be a problem solver, not a CV reader.
   - Lead with the solution, not your background. What you'll DO for them, not what you've done for yourself.
   - Short sentences. 10-15 words max per sentence. Break long thoughts into two sentences.
   - FIXED budget job → MUST mention it: "Your **$10,000** budget works for this scope"
   - If timeline mentioned → include it bolded: "This is a **10-12 week** delivery"
   - BOLD the key claim in your opening hook — first 2 sentences must have at least one **bold** term
   - ONE portfolio name in body if relevant — the most relevant project only, one sentence, not a paragraph
   - Never more than 3 bullet points
   - Use - for list items, never * or emoji
   - Bold: prices, timelines, portfolio names, key metrics

4. PORTFOLIO LINKS (always placed BEFORE the CTA, never after)
   IMPORTANT: Do NOT include portfolio URLs anywhere inside the letter field.
   The system automatically appends the portfolio section before the CTA and sign-off.
   In the letter body, mention ONE portfolio name naturally without URLs (e.g. "I built TollBugata").
   Only populate the portfolioLinks field in your JSON output with the projects you mentioned.

5. CTA (1 sentence — always the very last line before sign-off)
   - Short. Direct. Specific.
   - Options: "Let's jump on a quick call today.", "Drop me a message with your availability.",
     "I'm free for a call this week — what works for you?", or tailor to the job
   - CTA is ALWAYS the last sentence. Nothing comes after it except the sign-off.

6. SIGN-OFF
   "Regards,
   [FreelancerName]"

LETTER ORDER IS NON-NEGOTIABLE:
Hook → Body → Portfolio → CTA → Sign-off
Never: Hook → Body → CTA → Portfolio → Sign-off

═══════════════════════════════════════════════
ADDITIONAL QUESTIONS
═══════════════════════════════════════════════
If ADDITIONAL QUESTIONS FROM CLIENT contains questions, answer ALL of them in the ===QUESTIONS=== section.
These are mandatory screening questions — skipping them means instant rejection.

HOW TO WRITE Q&A ANSWERS:
- Sound like a real human telling a story, not an AI summarising documentation
- Keep each answer to 3-6 sentences maximum — short and direct
- Use "I" naturally — "I checked", "I noticed", "what I did was"
- If you have a relevant portfolio example use it briefly — one sentence, not a paragraph
- If the freelancer's experience doesn't perfectly match, be honest but pivot to transferable skill
- NEVER use bold text or bullet points inside Q&A answers — plain conversational prose only
- Do NOT start answers with "Great question" or repeat the question back in your answer
- Write like you're on a call answering casually but confidently

Format:
Q1: [copy question exactly]
[answer in plain prose, 3-6 sentences, human voice]

Q2: [copy question exactly]
[answer]

═══════════════════════════════════════════════
RULES — NEVER BREAK THESE
═══════════════════════════════════════════════
✓ Sound like a confident human, not AI
✓ Short sentences. 10-15 words max. Vary rhythm. Use contractions (I've, I'll, it's, you're)
✓ Short phrases. Cut every word that doesn't add meaning.
✓ Start some sentences with And, But, So — it sounds human
✓ Be a problem solver — every line must connect to their specific need
✓ Bold key figures with **word** — prices, timelines, portfolio names, key metrics
✓ Use - for bullet points, never * or emoji
✓ ONE portfolio name in the body max — the single strongest match only
✓ End with Regards + freelancer name
✓ Short is always better. Cut ruthlessly. If a sentence doesn't earn its place, delete it.
✓ If user set a word limit, respect it strictly
✗ NEVER: "passionate", "extensive experience", "great fit", "excited about", "leverage", "seamlessly", "I am writing to", "I hope this finds you"
✗ NEVER list multiple portfolio names in the opening — one name, maximum impact
✗ NEVER use emojis anywhere in the letter
✗ NEVER start with your own name or title
✗ NEVER pad — clients stop reading after 150 words if it's not relevant

═══════════════════════════════════════════════
PITCH FORMULA (internalize this)
═══════════════════════════════════════════════
Confidence (hook) → Solution (body) → Proof (portfolio) → Action (CTA)
That's it. That's the whole letter. Don't add anything outside this formula.

═══════════════════════════════════════════════
PRICING
═══════════════════════════════════════════════
- HOURLY job → mention your rate naturally in the body or CTA
- FIXED job → acknowledge their budget, say you can work within it or propose your number
- UNKNOWN → skip pricing, focus on CTA

═══════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════
Use this EXACT delimiter format — no JSON, no markdown, no code blocks:

===LETTER===
[full cover letter here — use real line breaks freely]
===END===

===PORTFOLIO===
[only if referenced in letter, one per line: Name: URL]
===END===

===QUESTIONS===
[answers to client questions, or leave blank]
===END===

===META===
HOOK: [hook name]
DESC: [one line why this hook]
TIP1: [tip specific to this job]
TIP2: [tip]
TIP3: [tip]
CLIENT: [client first name extracted from reviews, or blank]
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

  // Determine hook — use title hash as primary rotator, then refine by job type
  // This ensures variety across jobs while still picking smart hooks
  const titleHash = (job.title || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const allHooks = [
    'HOOK 1 — PROOF OF SUCCESS',
    'HOOK 2 — RELATABILITY',
    'HOOK 3 — GUARANTEE',
    'HOOK 4 — EXTRA VALUE',
    'HOOK 5 — GROWTH-ORIENTED (CALL)',
    'HOOK 6 — QUICK PROOF (NUMBERS)',
    'HOOK 7 — CLIENT-CENTERED'
  ];
  // Start with rotation-based hook
  let assignedHook = allHooks[titleHash % 7];

  // Override only for very strong signals
  if (hasBurnedClient) {
    assignedHook = 'HOOK 3 — GUARANTEE';
  } else if (isLargeBudget && budget >= 10000) {
    // Big budget jobs: alternate between 6 and 7
    assignedHook = titleHash % 2 === 0 ? 'HOOK 6 — QUICK PROOF (NUMBERS)' : 'HOOK 7 — CLIENT-CENTERED';
  } else if (hasTimeline && !isDetailedJob) {
    assignedHook = 'HOOK 4 — EXTRA VALUE';
  }
  // No more fallback to 1 or 2 by default — rotation handles it

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
  '1': 'HOOK 1: Write — I [specific measurable result for a past client]. I would like to do the same for you.',
  '2': 'HOOK 2: Write — I have [exact matching experience]. This is how I would approach [their specific project]:',
  '3': 'HOOK 3: Write — I can [deliver specific outcome] in [timeframe], and I am willing to back that up — [one proof point].',
  '4': 'HOOK 4: Write — I will not only [solve their main problem] — I will also [one genuinely useful extra].',
  '5': 'HOOK 5: Write — Let us jump on a quick call today — I can walk you through my approach in 15 minutes. No strings attached.',
  '6': 'HOOK 6: Write — Here are my numbers: [relevant stat 1], [relevant stat 2], [relevant stat 3].',
  '7': 'HOOK 7: Write — My understanding: you need [restate their core problem more precisely than they wrote it].'
})[assignedHook.match(/\d/)?.[0]] || 'Use the assigned hook format above.'}
MANDATORY: Your first sentence after the greeting must follow this exact structure. Bold the key claim.
${refineInstruction ? "REFINEMENT REQUEST from user: " + refineInstruction : ""}
Write the cover letter now. Bold key terms using **word** syntax. End with Regards + ${profile.name}.
If there are additional client questions, answer them in the questions field.`.trim();

  return msg;
}

module.exports = { SYSTEM, buildUserMessage, processBold };
