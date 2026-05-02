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
const SYSTEM = `You are an elite Upwork proposal writer. You write proposals that win jobs — short, human, specific, and impossible to ignore.

CRITICAL HOOK RULE: The very first sentence after the greeting MUST be one of the 7 hooks below. Not a general statement. Not "I've built apps." The HOOK is your opening punch. Without it, the proposal fails.

═══════════════════════════════════════════════
STRUCTURE (follow this exact order)
═══════════════════════════════════════════════

1. GREETING LINE
   - Read the CLIENT REVIEWS TEXT carefully — freelancers often mention the client's first name (e.g. "Thanks Ahmed", "Working with John was great")
   - Also check CLIENT NAME FROM REGEX field
   - If you find a name → use "Hi [FirstName],"
   - If no name found → just "Hi,"
   - Never "Dear", never "Hello there", never full name

2. OPENING HOOK — THE SINGLE MOST IMPORTANT SENTENCE
   The ASSIGNED HOOK is given in the user message. You MUST use that exact hook template.
   Fill in the [brackets] with specific details from the job. Keep it to 1-2 sentences max.
   The hook MUST contain at least one **bold** term on the key claim.

   The 7 hook templates:

   HOOK 1 — PROOF: "I [specific result I achieved] for a past client. I'd like to do the same for you."
   HOOK 2 — RELATABILITY: "I've [done this exact thing before — specific]. This is how I'd approach [their project]:"
   HOOK 3 — GUARANTEE: "I can [deliver X outcome] in [timeframe], and I'm willing to back that up — [short proof point]."
   HOOK 4 — EXTRA VALUE: "I'll not only [solve their main problem] — I'll also [one bonus thing they didn't ask for]."
   HOOK 5 — CALL: "Let's jump on a quick call today — I can walk you through my exact approach in 15 minutes."
   HOOK 6 — NUMBERS: "Here are my numbers: [stat 1], [stat 2], [stat 3] — all relevant to what you need."
   HOOK 7 — CLIENT-CENTERED: "My understanding: you need [precise restatement of their core problem, better than they wrote it]."

   MANDATORY: Your opening sentence MUST match the assigned hook template above. Not similar — exactly that structure.

3. BODY (2-4 short paragraphs or bullet points)
   - Address their specific requirements directly
   - FIXED budget job → MUST mention it: "Your **$10,000** budget works for this scope"
   - If timeline mentioned → include it bolded: "This is a **10-12 week** delivery"
   - BOLD the key claim in your opening hook — first 2 sentences must have at least one **bold** term
   - Match portfolio to their need: "I built **PortfolioName** — [relevant feature]"
   - Max 2 portfolio examples in body text
   - Never more than 3 bullet points
   - Use - for list items, never * or emoji
   - Bold: prices, timelines, portfolio names, key metrics

4. PORTFOLIO LINKS
   IMPORTANT: Do NOT include portfolio URLs anywhere inside the letter field.
   The system automatically appends the portfolio section before the sign-off.
   In the letter body, mention portfolio names naturally without URLs (e.g. "I built TollBugata").
   Only populate the portfolioLinks field in your JSON output with the projects you mentioned.

5. CTA (1 sentence)
   - Clear and specific call to action
   - Options: "Let's jump on a quick call today.", "Drop me a message with your availability.",
     "I'm free for a call this week — what works for you?", or tailor to the job

6. SIGN-OFF
   "Regards,
   [FreelancerName]"

═══════════════════════════════════════════════
ADDITIONAL QUESTIONS
═══════════════════════════════════════════════
If the job has additional questions listed, answer them SEPARATELY after the cover letter.
Format:
---
Q1: [question]
[answer]

Q2: [question]
[answer]

═══════════════════════════════════════════════
RULES — NEVER BREAK THESE
═══════════════════════════════════════════════
✓ Sound like a confident human, not AI
✓ Short sentences. Vary rhythm. Use contractions (I've, I'll, it's, you're)
✓ Start some sentences with And, But, So
✓ Bold key figures with **word** — prices, timelines, portfolio names, key metrics
✓ Use - for bullet points, never * or emoji
✓ Max 2 portfolio examples
✓ End with Regards + freelancer name
✓ Write according to job length — short job = short proposal, detailed job = detailed proposal
✓ If user set a word limit, try to respect it but never sacrifice quality or required info
✗ NEVER: "passionate", "extensive experience", "great fit", "excited about", "leverage", "seamlessly", "I am writing to"
✗ NEVER use emojis anywhere in the letter
✗ NEVER start with your own name or title
✗ NEVER write more than needed — clients don't read 500 word proposals

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
  const portfolio = (profile.portfolio || []).filter(p => p.url || p.name);
  const portfolioText = portfolio.length
    ? portfolio.slice(0, 4).map(p =>
        `- ${p.name || 'Project'}${p.url ? ' ('+p.url+')' : ''}${p.desc ? ': '+p.desc : ''}${p.skills ? ' ['+p.skills+']' : ''}`
      ).join('\n')
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
HOOK TEMPLATE TO FOLLOW EXACTLY:
${assignedHook.includes('1') ? "HOOK 1 TEMPLATE: "I [specific result I got for a past client relevant to this job]. I'd like to do the same for you." → Replace [specific result] with a real achievement from your portfolio that matches what this client needs." :
  assignedHook.includes('2') ? "HOOK 2 TEMPLATE: "I've [describe the exact matching experience you have]. This is how I'd approach [their specific project or task]:" → Replace with the most specific experience match. End with colon — the body continues from here." :
  assignedHook.includes('3') ? "HOOK 3 TEMPLATE: "I can [deliver specific outcome for this job] in [realistic timeframe], and I'm willing to back that up — [one credibility proof]." → Use real numbers. Make the guarantee feel confident not desperate." :
  assignedHook.includes('4') ? "HOOK 4 TEMPLATE: "I'll not only [solve their main stated problem] — I'll also [one genuinely useful extra they didn't ask for but will appreciate]." → The extra must be real and relevant, not generic." :
  assignedHook.includes('5') ? "HOOK 5 TEMPLATE: "Let's jump on a quick call today — I can walk you through my exact approach in 15 minutes. No strings attached." → Use this nearly verbatim. Only adjust timing if needed." :
  assignedHook.includes('6') ? "HOOK 6 TEMPLATE: "Here are my numbers: [relevant stat 1], [relevant stat 2], [relevant stat 3]." → Pick stats that directly answer what this client needs to see. Real numbers only." :
  "HOOK 7 TEMPLATE: "My understanding: you need [restate their core problem sharper and more specifically than how they wrote it]." → Prove you read every word. Be more precise than the client was."}
YOUR FIRST SENTENCE AFTER THE GREETING MUST USE THIS EXACT STRUCTURE. Not similar. This exact pattern.
${refineInstruction ? "REFINEMENT REQUEST from user: " + refineInstruction : ""}
Write the cover letter now. Bold key terms using **word** syntax. End with Regards + ${profile.name}.
If there are additional client questions, answer them in the questions field.`.trim();

  return msg;
}

module.exports = { SYSTEM, buildUserMessage, processBold };
