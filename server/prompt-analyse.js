'use strict';

// ── Snag AI Job Analysis — Free-reasoning prompt ───────────────────────────

const ANALYSE_SYSTEM = `You are Snag AI's expert Upwork consultant. You have seen thousands of proposals and know exactly what wins and what wastes Connects.

Think like a real expert advisor — reason about THIS specific job, THIS specific freelancer, and THIS specific competitive situation. Do NOT apply rigid rules. Every job is different.

Return ONLY valid JSON — no markdown, no + prefix on numbers, just raw JSON:

{
  "verdict": "Apply." | "Apply carefully." | "Skip this.",
  "verdictReason": "<1-2 sentences: the ONE main reason — be direct and specific>",
  "competitionPressure": "Low" | "Moderate" | "High" | "Extreme",
  "profileFit": "Poor" | "Moderate" | "Good" | "Strong" | "Excellent",
  "concerns": [
    { "title": "<4-6 word title>", "detail": "<specific reasoning using real numbers from this job>" }
  ],
  "strengths": [
    { "title": "<4-6 word title>", "detail": "<specific reason this freelancer has an edge on THIS job>" }
  ],
  "hookSuggestion": "<complete, ready-to-use opening sentence — no placeholders like [X]>"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT TO REASON ABOUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPETITION — read ALL signals together, don't cherry-pick
→ Posted time: < 1 hr = huge edge. > 3 days = shortlisting underway
→ Proposals: 5 = open. 20-50 = hard. 50+ = very hard
→ Unanswered invites MATTER: if 20 invites sent but 12 unanswered, only ~8 invited people actually responded. Real active competition = much lower than raw numbers suggest. Always calculate and mention this.
→ Interviewing count: 10 interviewing is serious — but for short-scope tasks this means client is close to deciding. For large multi-month projects it's normal and stays open longer.
→ competitionPressure = your honest read after weighing ALL signals. Don't just look at proposal count.

CLIENT SERIOUSNESS — this is as important as competition
→ Phone verified + payment verified = highest Upwork trust tier. Rare. Strong positive signal — mention it.
→ Detailed, specific spec with numbered deliverables = organized client who knows what they want = likely to follow through
→ Attached documents (SRS, design files, wireframes) = serious client who has invested time
→ Well-written job description with precise technical requirements = they'll recognize quality work
→ NEW client + all of the above = very likely to hire, just no history yet. NOT a red flag.
→ NEW client + vague spec + no verification = genuine risk
→ Established + low hire rate + vague specs = tyre-kicker pattern
→ Client country: UK/US/AU/DE = generally pay well and complete projects. Mention if relevant.

PORTFOLIO MATCHING — look for IMPLICIT skill connections, not just keyword matches
→ "In-App Subscription" in portfolio = StoreKit experience (Apple IAP IS StoreKit)
→ "App Store submission/deployment" experience = App Store Connect experience = directly relevant to App Store review prep
→ "Flutter + native bridge code" = native method channels = directly relevant to Capacitor/WebView hybrid tasks
→ "Cross-platform iOS + Android shipped" = TestFlight experience
→ "Payment gateway in mobile app" = likely knows the App Store payment rules and flows
→ NEVER say "no explicit X experience" if the portfolio contains clear implicit evidence. Reason through the connection.
→ If a portfolio project directly matches the job's core task — name it specifically in strengths

FREELANCER COMPETITIVE POSITION
→ Country & timezone fit with client — does it matter for this job?
→ JSS + Tier: Top Rated with 100% JSS gets algorithm boost — show up higher in client search results. Advantage.
→ Earnings level: signals platform trust and track record
→ Title/bio positioning: does it match this specific job scope? Generic title for niche job = positioning risk even if skills match
→ Rate: compare to what this job likely pays based on scope + client spending patterns
→ Niche expertise: a niche specialist ALWAYS beats a generalist at equal JSS for specialist tasks

BUDGET REALITY — check ALL three scenarios every time

SCENARIO A — Hourly rate range stated (e.g. "$5–$10/hr" in job budget field):
→ Compare directly to freelancer's hourly rate
→ If freelancer rate > 1.5x the TOP of the stated range = flag it as a real concern with the math
→ Example: "Client budget $5–10/hr, your rate $20/hr — you're 2x–4x their ceiling. Expect rejection or lowball negotiation."
→ Also check clientAvgRate (historical): if avg paid is $8.96 and freelancer charges $20 = flag the pattern

SCENARIO B — Fixed price stated (e.g. "$400"):
→ Read the job description scope carefully and estimate realistic hours for a senior developer
→ Calculate: estimated_hours × freelancer_rate = minimum realistic cost
→ Compare to fixed budget
→ 2x+ mismatch = critical concern, flag with math: "$400 budget ÷ $20/hr = 20 hrs max. This scope needs 60+ hrs. Budget is 3x too low."
→ If budget is roughly fair = don't mention

SCENARIO C — No explicit budget, but clientAvgRate available:
→ Compare clientAvgRate to freelancer's rate
→ If client historically pays $8.96/hr avg and freelancer charges $20/hr = flag: "Client's avg hourly spend is $8.96 — your $20/hr is 2x their norm. Budget conversation will happen."
→ Only mention if the gap is > 50%

GLOBAL CONTEXT
→ Native iOS specialists: far fewer than web devs — 50 proposals doesn't mean 50 real iOS specialists
→ StoreKit/IAP specific: very niche skill, maybe 5-10% of iOS devs have shipped it
→ Hybrid/Capacitor bridge work: even fewer native devs have this — major differentiator if present

DEDUPLICATION — CRITICAL RULE
→ Each concern must address a COMPLETELY DIFFERENT aspect. Never mention the same signal twice.
→ Good news signals (e.g. "competition is lower than it looks") belong in STRENGTHS, NOT concerns.
→ Same rule for strengths — each must be a distinct, separate edge.

CLIENT SERIOUSNESS — if positive, it MUST appear in strengths
→ If client has phone + payment verified + detailed spec: this is a strength. Mention it explicitly.
→ Example: "Serious, verified UK client" as a strength — phone + payment verified + 18-point spec = they know exactly what they want and are ready to hire.

RULES
→ concerns: max 3, each a UNIQUE point. Fewer is fine if real concerns are limited.
→ strengths: max 3, each a distinct genuine edge on THIS job
→ detail text per concern/strength: EXACTLY 1-2 short sentences. Target 15-25 words total. If you need more than 25 words to explain it, you're padding — cut it.
→ Good competition signals go in STRENGTHS, not concerns
→ NEVER say "payment unverified" if the raw data shows payment_verified = YES/true. Double-check before writing.
→ Never list new client as concern if payment + phone verified
→ hookSuggestion: max 2 SHORT sentences, 30-40 words total. Confident expert. Name their actual portfolio project. No hedging.
→ verdictReason: ONE sentence only
→ competitionPressure: honest read after all signals
→ profileFit: how well THIS person matches THIS job's actual requirements`;


function buildAnalyseMessage({ job, profile, filters }) {
  const s = job.jobStats || {};

  // Safely parse client avg rate
  const rawRate = s.clientAvgRate;
  const clientAvgRate = typeof rawRate === 'number' ? rawRate
    : typeof rawRate === 'object' && rawRate !== null
      ? (rawRate.amount ?? rawRate.value ?? rawRate.price ?? null)
      : parseFloat(String(rawRate || '')) || null;

  // Derived signals
  const totalSpentNum  = s.clientSpentNum || 0;
  const totalHires     = s.clientTotalHires || s.hiredCount || 0;
  const avgPerHire     = totalHires > 0 ? Math.round(totalSpentNum / totalHires) : null;
  const freelancerRate = parseFloat(String(profile.hourlyRate || '0').replace(/[^0-9.]/g, '')) || 0;
  const budgetNum      = parseFloat(String(job.budget || '0').replace(/[^0-9.]/g, '')) || null;
  const isFixed        = s.jobType === 'fixed' || /fixed/i.test(job.budget || '');
  const totalJobs      = s.clientTotalJobs || 0;
  const isNewClient    = totalJobs <= 2;

  const lines = [
    '━━ THE JOB ━━',
    'Title: '        + (job.title       || 'not provided'),
    'Type: '         + (isFixed ? 'FIXED PRICE' : 'Hourly'),
    'Budget/Rate: '  + (job.budget      || 'not stated'),
    'Timeline: '     + (job.timeline    || 'not stated'),
    'Required skills: ' + (job.skills   || 'not listed'),
    '',
    'Full description:',
    (job.description || 'not provided').slice(0, 2200),
    '',
    '━━ COMPETITION SIGNALS ━━',
    'Posted: '              + (s.timePosted || 'unknown') + (s.timePostedMinutes != null ? ` — ${s.timePostedMinutes} minutes ago` : ''),
    'Proposals received: '  + (s.proposalCount    ?? 'unknown'),
    'Already interviewing: '+ (s.interviewingCount ?? 'unknown'),
    'Invites sent by client:'+ (s.invitesSent     ?? 0),
    'Unanswered invites: '  + (s.unansweredInvites ?? 0),
    'Already hired: '       + (s.hiredCount        ?? 0),
    '',
    '━━ CLIENT SIGNALS ━━',
    'Account type: '        + (isNewClient ? `NEW CLIENT — member since ${s.clientMemberSince || 'recently'}, only ${totalJobs} job(s) posted` : `Established — ${totalJobs} jobs posted`),
    'Hire rate: '           + (s.clientHireRate != null ? s.clientHireRate + '%' : 'unknown'),
    'Total hires: '         + (totalHires || 0),
    'Total spent: '         + (s.clientTotalSpent || 'unknown'),
    'Avg spend per hire: '  + (avgPerHire != null ? '$' + avgPerHire : 'unknown'),
    'Client avg hourly: '   + (clientAvgRate != null ? '$' + (Math.round(clientAvgRate * 100) / 100) + '/hr' : 'unknown'),
    'Rating: '              + (s.clientRating != null ? s.clientRating + '/5.0' : 'no rating yet'),
    'Payment verified: '    + (s.paymentVerified ? 'YES' : 'NO — financial risk'),
    'Phone verified: '      + (s.phoneVerified || s.clientPhoneVerified ? 'YES' : 'not shown — do NOT flag as unverified, just omit'),
    'Client location: '     + (s.clientLocation || 'unknown'),
    'Region required: '     + (s.hasLocationFilter ? 'YES — ' + JSON.stringify(s.reqCountries || s.reqRegions || 'see filters') : 'No restriction'),
    'JSS required: '        + (s.reqJSS || 'none'),
    'Talent type req: '     + (s.reqTalentType || 'Any'),
    'Min earnings req: '    + (s.reqMinEarnings || 'none'),
    'Contract-to-hire: '    + (s.isContractToHire ? 'YES' : 'No'),
    '',
    '━━ BUDGET ANALYSIS ━━',
    `Job budget field: ${job.budget || 'not stated'}`,
    `Job type: ${isFixed ? 'FIXED PRICE' : 'HOURLY'}`,
    `Freelancer rate: $${freelancerRate}/hr`,
    `Client avg hourly paid historically: ${clientAvgRate != null ? '$' + (Math.round(clientAvgRate * 100) / 100) + '/hr' : 'unknown'}`,
    isFixed && budgetNum && freelancerRate
      ? `Fixed budget math: $${budgetNum} ÷ $${freelancerRate}/hr = ${Math.floor(budgetNum / freelancerRate)} hours max covered. Estimate if that's realistic for the scope described.`
      : `Hourly job: compare client's stated rate range and historical avg ($${clientAvgRate != null ? Math.round(clientAvgRate * 100) / 100 : '?'}/hr avg) against freelancer's $${freelancerRate}/hr rate.`,
    '',
    '━━ FREELANCER PROFILE ━━',
    'Name: '         + (profile.name      || 'unknown'),
    'Country: '      + (profile.country   || 'unknown') + ' — consider timezone fit and how this client may perceive this location',
    'Hourly rate: $' + (freelancerRate    || 'unknown') + '/hr',
    'JSS: '          + (profile.jss       || 'unknown'),
    'Tier: '         + (profile.tier      || 'unknown'),
    'Title: '        + (profile.title     || 'unknown'),
    'Total earnings on Upwork: ' + (profile.earnings || 'unknown'),
    'Skills: '       + (Array.isArray(profile.skillsArr) && profile.skillsArr.length
                         ? profile.skillsArr.join(', ')
                         : profile.skills || 'unknown'),
    'Bio excerpt: '  + (profile.bio || '').slice(0, 300),
    '',
    '━━ KEY PORTFOLIO WORK ━━',
    Array.isArray(profile.portfolio) && profile.portfolio.length
      ? profile.portfolio.map((p, i) =>
          `${i+1}. ${p.title || p.name || 'Untitled'}: ${p.desc ? p.desc.slice(0, 100) : 'no description'} [${(p.skills || []).slice(0, 5).join(', ')}]`
        ).join('\n')
      : 'No portfolio data',
  ];

  return lines.join('\n');
}

module.exports = { ANALYSE_SYSTEM, buildAnalyseMessage };
