
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

═══════════════════════════════════════════════
STRUCTURE (follow this exact order)
═══════════════════════════════════════════════

1. GREETING LINE
   - Start with "Hi [ClientName]," if client name is provided
   - If no name: just "Hi,"
   - Never "Dear", never "Hello there"

2. OPENING HOOK (first 1-2 sentences — most important part)
   Pick the hook that fits THIS job best:

   PROOF      → Lead with a specific past result matching their need
                 "I built [X] for [type of client] — [specific outcome]."
   RELATABILITY → Show you've lived their exact problem
                 "Three months ago I took over a half-built [X] and shipped it."
   NUMBERS    → Hard credibility stats specific to what they need
                 "[X] apps shipped. [Y]★ average. [Z] years in [their stack]."
   CLIENT-CENTERED → Prove you read their job better than they wrote it
                 "You need [precise restatement of their core problem]."
   GUARANTEE  → Remove their risk with a specific bold commitment
                 "If I miss the deadline, you don't pay for that sprint."
   EXTRA VALUE → Offer something concrete they didn't ask for but need
                 "I'll do X — and also fix the [related issue] I can already see."
   CALL       → Create urgency around a quick conversation
                 "I can walk you through my approach in 15 minutes today."

   The hook MUST be specific to this job. Never generic. The client must feel you read every word.

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

4. PORTFOLIO LINKS (always include if you referenced portfolios in the body)
   Place this block right before the CTA. Only list portfolios actually mentioned:

   **Portfolio:**
   - **PortfolioName**: URL
   - **PortfolioName**: URL

   Skip this section only if no URL is available for any mentioned portfolio.

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
Return ONLY valid JSON — no markdown fences, no extra text:
{
  "letter": "the complete cover letter including portfolio links section and sign-off, with **bold** markers",
  "questions": "answers to additional questions if any, else empty string",
  "hookType": "which hook was used",
  "hookDesc": "one line why this hook fits this specific job",
  "tips": ["tip 1 specific to this job", "tip 2", "tip 3"]
}`;

// ── User message builder ──────────────────────────────────────────────────────
function buildUserMessage({ job, profile, settings }) {

  // Smart skill matching
  const jobText = ((job.title||'')+' '+(job.description||'')+' '+(job.skills||'')).toLowerCase();
  const allSkills = (profile.skills||'').split(',').map(s => s.trim()).filter(Boolean);
  const matched   = allSkills.filter(s => jobText.includes(s.toLowerCase()));
  const relevantSkills = matched.length ? matched.slice(0,5) : allSkills.slice(0,3);

  // Pricing type detection
  const descLower = (job.description||'').toLowerCase();
  const isHourly  = /hourly|\/hr|per hour|\/hour/.test(descLower);
  const isFixed   = /fixed.price|fixed budget|lump.sum|one.time payment/.test(descLower);
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

  const msg = `
JOB TITLE: ${job.title}
JOB DESCRIPTION:
${(job.description||'').slice(0, 2500)}

REQUIRED SKILLS: ${job.skills || 'not listed'}
BUDGET/RATE: ${job.budget || 'not specified'}
PRICING TYPE: ${pricingType}
CLIENT LOCATION: ${job.location || 'unknown'}
CLIENT NAME: ${job.clientName || 'unknown — use "Hi," only'}

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

Write the cover letter now. Bold key terms using **word** syntax. End with Regards + ${profile.name}.
If there are additional client questions, answer them after the letter in the questions field.`.trim();

  return msg;
}

module.exports = { SYSTEM, buildUserMessage, processBold };