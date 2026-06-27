// ── Job data extractor — reads Upwork job page ────────────────────────────────
window.SnagAI.getJob = function() {
  const title = (
    document.querySelector('h1[data-test="job-title"]') ||
    document.querySelector('h1.m-0') ||
    document.querySelector('h1')
  )?.innerText?.trim() || '';

  const descEl = (
    document.querySelector('[data-test="Description"] .air3-truncation') ||
    document.querySelector('[data-test="Description"]') ||
    document.querySelector('.job-description') ||
    document.querySelector('[class*="description"]')
  );
  const fullDesc = descEl?.innerText?.trim() || document.body.innerText.slice(0, 3000);
  const description = fullDesc;

  // Screening questions
  let questions = '';
  try {
    const fullPageText = document.body.innerText;
    const asked = fullPageText.indexOf('You will be asked to answer the following questions');
    if (asked > -1) {
      const after = fullPageText.slice(asked);
      const colonIdx = after.indexOf(':');
      if (colonIdx > -1) {
        let chunk = after.slice(colonIdx + 1).trim();
        const stopAt = chunk.search(/\nAbout the client|\nRequired Connects|\nActivity on this job/);
        if (stopAt > -1) chunk = chunk.slice(0, stopAt);
        questions = chunk.trim().slice(0, 1500);
      }
    }
    if (!questions) {
      const lines = fullDesc.split('\n');
      const qLines = [];
      let inQ = false;
      for (const line of lines) {
        if (/^\d+[\.\)]/.test(line.trim())) { inQ = true; }
        if (inQ && line.trim()) qLines.push(line.trim());
      }
      if (qLines.length >= 2) questions = qLines.join('\n').slice(0, 1500);
    }
  } catch(e) { questions = ''; }

  // Client name
  let clientName = '';
  let clientNameFromReview = '';
  const descNameMatch = fullDesc.match(/(?:I'm|I am|My name is|This is)\s+([A-Z][a-z]{2,})(?:\s|,|\.)/);
  if (descNameMatch) clientName = descNameMatch[1];

  let reviewText = '';
  try {
    const pt = document.body.innerText;
    const histIdx = pt.indexOf("Client's recent history");
    // cap review text to 600 chars — review scraping is the most flaggable data point
    if (histIdx > -1) {
      reviewText = pt.slice(histIdx, histIdx + 600);
      const namePatterns = [
        /([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?)\s+is\s+(?:an?\s+)?(?:exceptional|great|wonderful|amazing|fantastic|excellent|outstanding|awesome)\s+client/,
        /([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?)\s+(?:was|is)\s+(?:a\s+)?great\s+(?:client|person|partner)/,
        /working\s+with\s+([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?)\s+(?:was|is|has)/i,
        /[Tt]hanks?\s+(?:to\s+)?([A-Z][a-z]{2,})\s+for/,
      ];
      for (const pat of namePatterns) {
        const m = reviewText.match(pat);
        if (m && m[1]) { clientNameFromReview = m[1].split(' ')[0]; break; }
      }
    }
  } catch(e) { reviewText = ''; }

  // Skills
  const skillsArr = Array.from(document.querySelectorAll(
    '[data-test="Skill"] span, .air3-badge span, [data-test="attr-item"] span, ' +
    '.skills-list span, [class*="skill"] span, .up-skill-badge'
  )).map(s => s.innerText.trim()).filter(Boolean);
  const skillsSet = [...new Set(skillsArr)];
  const skills = skillsSet.join(', ');

  const budget   = document.querySelector('[data-test="budget"] strong, [data-test="Budget"] strong')?.innerText?.trim() || '';
  const location = document.querySelector('[data-test="client-location"] strong')?.innerText?.trim() || '';
  const jobType  = document.querySelector('[data-test="job-type"], [class*="jobType"]')?.innerText?.trim() || '';

  // Read stats from targeted sections — avoids full-page text dump
  // Wait for Upwork's dynamic sections to render — also prevents bot-like instant reads
  const pageText2 = (() => {
    const sectionSelectors = [
      '[data-test="sidebar"]',
      '[data-test="client-info"]',
      '[data-test="about-client-wrapper"]',
      '[data-test="job-activity"]',
      '[data-test="ClientStats"]',
      '.client-stats',
      '[class*="sidebar"]',
      '[class*="AboutClient"]',
      '[class*="JobActivity"]',
    ];
    const parts = sectionSelectors
      .map(s => document.querySelector(s)?.innerText || '')
      .filter(Boolean);
    if (parts.length) return parts.join('\n');

    // Smarter fallback: anchor on where the stats actually live in page text
    const full = document.body.innerText;
    const statsIdx = full.search(/\n(?:Proposals|Interviewing|Activity on this job|About the client)[:\s]/i);
    if (statsIdx > -1) return full.slice(Math.max(0, statsIdx - 200), statsIdx + 4000);
    return full.slice(-5000);
  })();

  function extractNum(label) {
    const re = new RegExp(label + '[:\\s]+(\\d+(?:\\s+to\\s+\\d+)?)', 'i');
    const m  = pageText2.match(re);
    return m ? m[1] : null;
  }

  const proposalsRaw = extractNum('Proposals');
  let proposalCount = null;
  if (proposalsRaw) {
    const nums = proposalsRaw.match(/\d+/g);
    if (nums && nums.length >= 2) proposalCount = parseInt(nums[nums.length - 1]);
    else if (nums) proposalCount = parseInt(nums[0]);
  }

  let lastViewed = null;
  const lvMatch = pageText2.match(/Last viewed by client[:\s]+([^\n]+)/i);
  if (lvMatch) lastViewed = lvMatch[1].trim();

  let interviewingCount = null, invitesSent = null, unansweredInvites = null, hiredCount = null;
  const intM = pageText2.match(/Interviewing[:\s]+(\d+)/i);
  if (intM) interviewingCount = parseInt(intM[1]);
  const invM = pageText2.match(/Invites sent[:\s]+(\d+)/i);
  if (invM) invitesSent = parseInt(invM[1]);
  const unM = pageText2.match(/Unanswered invites[:\s]+(\d+)/i);
  if (unM) unansweredInvites = parseInt(unM[1]);
  const hirM = pageText2.match(/Hired[:\s]+(\d+)/i);
  if (hirM) hiredCount = parseInt(hirM[1]);

  let timePosted = null, timePostedMinutes = null;
  const tm = pageText2.match(/Posted\s+(\d+)\s+(minutes?|hours?|days?|weeks?)\s+ago/i)
          || pageText2.match(/(\d+)\s+(minutes?|hours?|days?|weeks?)\s+ago/i);
  if (tm) {
    const num = parseInt(tm[1]), unit = tm[2].toLowerCase();
    timePosted = num + ' ' + unit + ' ago';
    if (unit.startsWith('minute'))     timePostedMinutes = num;
    else if (unit.startsWith('hour'))  timePostedMinutes = num * 60;
    else if (unit.startsWith('day'))   timePostedMinutes = num * 1440;
    else if (unit.startsWith('week'))  timePostedMinutes = num * 10080;
  }

  let clientHireRate = null;
  const hrm = pageText2.match(/(\d+)%\s+hire\s+rate/i);
  if (hrm) clientHireRate = parseInt(hrm[1]);

  let clientTotalSpent = null;
  const sm = pageText2.match(/\$([0-9,.]+[KkMmBb]?)\s+total\s+spent/i);
  if (sm) clientTotalSpent = sm[1];

  let clientAvgRate = null, clientRating = null;
  const arm = pageText2.match(/\$([0-9,]+(?:\.\d+)?)\s*\/hr\s+avg/i);
  if (arm) clientAvgRate = parseFloat(arm[1].replace(',', ''));

  const paymentIdx = pageText2.indexOf('Payment method verified');
  const ratingSearchArea = paymentIdx > -1
    ? pageText2.slice(paymentIdx, paymentIdx + 200)
    : pageText2.slice(0, 1000);
  const crm = ratingSearchArea.match(/Rating is (\d+(?:\.\d+)?) out of 5/i);
  if (crm) clientRating = parseFloat(crm[1]);
  console.log('Client rating found:', clientRating, 'from area:', ratingSearchArea.slice(0, 80));

  let reqJSS = null, reqTalentType = null, reqEnglish = null;
  const jssReqM = pageText2.match(/Job Success Score[:\s]+At least\s*(\d+)%/i);
  if (jssReqM) reqJSS = parseInt(jssReqM[1]);
  const talentM = pageText2.match(/Talent Type[:\s]+(Independent|Agency|Any)/i);
  if (talentM) reqTalentType = talentM[1];
  const engM = pageText2.match(/English level[:\s]+([^\n]+)/i);
  if (engM) reqEnglish = engM[1].trim();

  const paymentVerified = pageText2.includes('Payment method verified');
  let clientSpentNum = 0;
  if (clientTotalSpent) {
    const spRaw = clientTotalSpent.replace(/[,$]/g, '');
    clientSpentNum = /[Kk]$/.test(spRaw) ? parseFloat(spRaw) * 1000 : parseFloat(spRaw) || 0;
  }

  const jobStats = {
    proposalCount, lastViewed, interviewingCount, invitesSent, unansweredInvites, hiredCount,
    timePosted, timePostedMinutes, clientAvgRate, clientHireRate, clientTotalSpent, clientRating,
    reqJSS, reqTalentType, reqEnglish, paymentVerified, clientSpentNum,
    jobSkills: skillsSet || []
  };
  console.log('Job stats:', JSON.stringify(jobStats));

  return {
    title, description, skills, budget, location,
    clientName: clientNameFromReview || clientName,
    questions, reviewText, type: jobType, jobStats
  };
};
