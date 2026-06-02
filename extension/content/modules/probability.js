// ── Win Probability Calculator ────────────────────────────────────────────────
window.SnagAI.calcWinProbability = function(jobStats, profile) {
  let probScore = 30;
  let matchScore = 50;
  const probFactors  = [];
  const matchFactors = [];
  const warnings = [];

  // ── PROBABILITY FACTORS ──────────────────────────────────────────────────────

  const mins = jobStats.timePostedMinutes;
  if (mins !== null && mins !== undefined) {
    if      (mins <= 30)   { probScore += 30; probFactors.push({ label: 'Posted', value: jobStats.timePosted, delta: +30, note: 'Very early — huge advantage' }); }
    else if (mins <= 120)  { probScore += 22; probFactors.push({ label: 'Posted', value: jobStats.timePosted, delta: +22, note: 'Early — apply now' }); }
    else if (mins <= 360)  { probScore += 14; probFactors.push({ label: 'Posted', value: jobStats.timePosted, delta: +14, note: 'Good timing' }); }
    else if (mins <= 1440) { probScore += 5;  probFactors.push({ label: 'Posted', value: jobStats.timePosted, delta: +5,  note: 'Still within 24h' }); }
    else if (mins <= 4320) { probScore -= 5;  probFactors.push({ label: 'Posted', value: jobStats.timePosted, delta: -5,  note: 'Job is aging' }); }
    else                   { probScore -= 15; probFactors.push({ label: 'Posted', value: jobStats.timePosted, delta: -15, note: 'Old posting — may be filled' }); warnings.push('Posted ' + jobStats.timePosted + ' — client may already have shortlisted'); }
  }

  const p = jobStats.proposalCount;
  if (p !== null && p !== undefined) {
    if      (p <= 5)  { probScore += 20; probFactors.push({ label: 'Proposals', value: p + ' bids', delta: +20, note: 'Very low competition' }); }
    else if (p <= 10) { probScore += 12; probFactors.push({ label: 'Proposals', value: p + ' bids', delta: +12, note: 'Low competition' }); }
    else if (p <= 20) { probScore += 4;  probFactors.push({ label: 'Proposals', value: p + ' bids', delta: +4,  note: 'Moderate' }); }
    else if (p <= 35) { probScore -= 5;  probFactors.push({ label: 'Proposals', value: p + '-50 bids', delta: -5,  note: 'High competition' }); }
    else              { probScore -= 15; probFactors.push({ label: 'Proposals', value: '50+ bids', delta: -15, note: 'Very competitive' }); warnings.push('50+ proposals — very hard to stand out'); }
  }

  const hr = jobStats.clientHireRate;
  if (hr !== null && hr !== undefined) {
    if      (hr >= 90) { probScore += 15; probFactors.push({ label: 'Hire rate', value: hr + '%', delta: +15, note: 'Serious client — almost always hires' }); }
    else if (hr >= 70) { probScore += 8;  probFactors.push({ label: 'Hire rate', value: hr + '%', delta: +8,  note: 'Usually hires' }); }
    else if (hr >= 50) { probScore += 0;  probFactors.push({ label: 'Hire rate', value: hr + '%', delta: 0,   note: 'Average' }); }
    else if (hr >= 30) { probScore -= 8;  probFactors.push({ label: 'Hire rate', value: hr + '%', delta: -8,  note: 'Rarely hires' }); warnings.push('Only ' + hr + '% hire rate — client may not hire'); }
    else               { probScore -= 18; probFactors.push({ label: 'Hire rate', value: hr + '%', delta: -18, note: 'Almost never hires' }); warnings.push(hr + '% hire rate — high chance of no hire'); }
  }

  const ic = jobStats.interviewingCount;
  if (ic !== null && ic !== undefined) {
    if      (ic === 0) { probScore += 10; probFactors.push({ label: 'Interviewing', value: 'None yet', delta: +10, note: 'No one shortlisted yet' }); }
    else if (ic <= 2)  { probScore += 0;  probFactors.push({ label: 'Interviewing', value: ic + ' in progress', delta: 0, note: 'Still open' }); }
    else               { probScore -= 12; probFactors.push({ label: 'Interviewing', value: ic + ' in progress', delta: -12, note: 'Client already shortlisting heavily' }); }
  }

  const hired = jobStats.hiredCount;
  if (hired !== null && hired !== undefined && hired > 0) {
    probScore = 0;
    probFactors.push({ label: 'Hired', value: hired + ' already hired', delta: -999, note: 'Job likely closed — do not apply' });
    warnings.push('Client already hired ' + hired + ' freelancer(s) — this job is likely closed');
  }

  const invS = jobStats.invitesSent;
  if (invS !== null && invS !== undefined && !hired) {
    if (invS === 0) {
      probScore += 8; probFactors.push({ label: 'Invites', value: 'None sent', delta: +8, note: 'Client open to proposals' });
    } else if (invS <= 3) {
      probScore -= 5; probFactors.push({ label: 'Invites', value: invS + ' invited', delta: -5, note: 'Client prefers invited freelancers' });
      warnings.push('Client invited ' + invS + ' freelancers — proposal acceptance is lower');
    } else {
      probScore -= 12; probFactors.push({ label: 'Invites', value: invS + ' invited', delta: -12, note: 'Client mostly hiring via invites' });
      warnings.push('Client sent ' + invS + ' invites — they likely already have preferred candidates');
    }
  }

  const cr = jobStats.clientRating;
  if (cr !== null && cr !== undefined) {
    if      (cr >= 4.8) { probScore += 5;  probFactors.push({ label: 'Client rating', value: cr + '★', delta: +5,  note: 'Excellent client' }); }
    else if (cr >= 4.0) { /* neutral */ }
    else if (cr >= 3.0) { probScore -= 8;  probFactors.push({ label: 'Client rating', value: cr + '★', delta: -8,  note: 'Below average — risk of disputes' }); warnings.push('Client rating ' + cr + '★ — below 4.0, may be difficult to work with'); }
    else                { probScore -= 18; probFactors.push({ label: 'Client rating', value: cr + '★', delta: -18, note: 'Poor client — high dispute risk' }); warnings.push('Client only ' + cr + '★ — serious risk of disputes or non-payment'); }
  }

  if (jobStats.timePostedMinutes > 1440 && (jobStats.proposalCount || 99) <= 10 && jobStats.interviewingCount === 0) {
    probScore += 8;
  }

  probScore = Math.max(0, Math.min(95, Math.round(probScore)));

  // ── PROFILE MATCH FACTORS ────────────────────────────────────────────────────

  const reqJSS  = jobStats.reqJSS;
  const userJSS = parseFloat((profile.jss || '0').replace(/[^0-9.]/g, '')) || 0;
  if (reqJSS) {
    if (!userJSS) {
      matchScore -= 5;
      matchFactors.push({ label: 'JSS', value: 'Req: ' + reqJSS + '%', delta: -5, note: 'Add your JSS in profile', warn: true });
    } else if (userJSS >= reqJSS) {
      matchScore += 15;
      matchFactors.push({ label: 'JSS', value: userJSS + '% ✓', delta: +15, note: 'Meets ' + reqJSS + '% requirement' });
    } else {
      matchScore -= 20;
      matchFactors.push({ label: 'JSS', value: userJSS + '% (need ' + reqJSS + '%)', delta: -20, note: 'Below requirement', warn: true });
      warnings.push('Your JSS ' + userJSS + '% is below the required ' + reqJSS + '%');
    }
  }

  const reqEng = jobStats.reqEnglish;
  if (reqEng && /native/i.test(reqEng)) {
    matchScore -= 8;
    matchFactors.push({ label: 'English', value: reqEng + ' required', delta: -8, note: 'Must be explicit in proposal', warn: true });
    warnings.push('Client requires ' + reqEng + ' English — make your fluency obvious');
  }

  if (jobStats.reqTalentType) {
    matchScore += 5;
    matchFactors.push({ label: 'Type', value: jobStats.reqTalentType + ' ✓', delta: +5, note: 'You qualify' });
  }

  const userRate   = parseFloat((profile.hourlyRate || '0').replace(/[^0-9.]/g, '')) || 0;
  const clientRate = jobStats.clientAvgRate;
  if (userRate && clientRate) {
    const pct = Math.abs(userRate - clientRate) / clientRate;
    if (pct <= 0.15) {
      matchScore += 12; matchFactors.push({ label: 'Rate', value: '$' + userRate + ' ≈ $' + clientRate + ' avg', delta: +12, note: 'Perfect alignment' });
    } else if (userRate < clientRate) {
      matchScore += 6;  matchFactors.push({ label: 'Rate', value: '$' + userRate + ' < $' + clientRate + ' avg', delta: +6,  note: 'Competitive rate' });
    } else if (pct <= 0.5) {
      matchScore += 0;  matchFactors.push({ label: 'Rate', value: '$' + userRate + ' vs $' + clientRate + ' avg', delta: 0,   note: 'Slightly above avg' });
    } else {
      matchScore -= 8;  matchFactors.push({ label: 'Rate', value: '$' + userRate + ' vs $' + clientRate + ' avg', delta: -8,  note: 'Well above client avg', warn: true });
      warnings.push('Your rate $' + userRate + '/hr is much higher than client avg $' + clientRate + '/hr');
    }
  }

  const tierBonus = { new:0, rising:5, top_rated:12, top_rated_plus:18, expert:25 };
  const tl = { rising:'Rising Talent', top_rated:'Top Rated', top_rated_plus:'Top Rated Plus', expert:'Expert Vetted' };
  const tb = tierBonus[profile.tier] || 0;
  if (tb > 0) {
    matchScore += tb;
    matchFactors.push({ label: 'Badge', value: tl[profile.tier], delta: tb, note: 'Visible on proposal' });
  }

  const rawJobSkills = Array.isArray(jobStats.jobSkills) ? jobStats.jobSkills : [];
  const jobSkillsNorm = rawJobSkills.map(s => s.toLowerCase().replace(/[^a-z0-9+#.\s]/gi, '').trim()).filter(Boolean);
  const profileSkillsList = profile._skillsForMatching || profile.skillsArr || [];
  const profileSkillsStr = (profileSkillsList.length
    ? profileSkillsList.join(' ')
    : (profile.skills || '')) + ' ' + (profile.title || '');

  if (jobSkillsNorm.length > 0 && profileSkillsStr.trim().length > 0) {
    const matched  = jobSkillsNorm.filter(s => profileSkillsStr.includes(s));
    const missing  = rawJobSkills.filter((s, i) => !profileSkillsStr.includes(jobSkillsNorm[i]));
    const matchPct = Math.round((matched.length / jobSkillsNorm.length) * 100);

    if (matchPct >= 75) {
      matchScore += 10;
      matchFactors.push({ label: 'Skills', value: 'Strong match — ' + matchPct + '%', delta: +10, note: matched.slice(0, 3).join(', '), skillMatch: true });
    } else if (matchPct >= 45) {
      matchScore -= 5;
      matchFactors.push({ label: 'Skills', value: matchPct + '% skill overlap', delta: -5, note: 'Missing: ' + missing.slice(0, 3).join(', '), warn: true, skillMatch: true });
    } else if (matchPct >= 20) {
      matchScore -= 15;
      matchFactors.push({ label: 'Skills', value: 'Weak match — ' + matchPct + '%', delta: -15, note: 'Missing key skills: ' + missing.slice(0, 4).join(', '), warn: true, skillMatch: true });
    } else {
      matchScore -= 25;
      matchFactors.push({ label: 'Skills', value: 'Profile mismatch — ' + matchPct + '%', delta: -25, note: 'Job needs: ' + missing.slice(0, 5).join(', '), warn: true, skillMatch: true });
    }
  }
  matchScore = Math.max(5, Math.min(95, Math.round(matchScore)));

  const topProb  = [...probFactors].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3);
  const topMatch = [...matchFactors].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const combined = Math.round((probScore * 0.6) + (matchScore * 0.4));
  let verdict, verdictColor;
  if      (combined >= 70) { verdict = 'Strong';    verdictColor = '#34d399'; }
  else if (combined >= 50) { verdict = 'Good';      verdictColor = '#c9a84c'; }
  else if (combined >= 30) { verdict = 'Possible';  verdictColor = '#f59e0b'; }
  else                     { verdict = 'Long shot'; verdictColor = '#f87171'; }

  const probColor  = probScore  >= 60 ? '#34d399' : probScore  >= 40 ? '#c9a84c' : '#f87171';
  const matchColor = matchScore >= 60 ? '#34d399' : matchScore >= 40 ? '#c9a84c' : '#f87171';

  const riskItems = [];
  if ((jobStats.proposalCount || 0) >= 50) riskItems.push('50+ proposals — very high competition');
  const _ic = jobStats.interviewingCount || 0;
  if (_ic >= 1 && _ic <= 2) riskItems.push(_ic + ' freelancer(s) already interviewing');
  else if (_ic >= 3) riskItems.push(_ic + ' freelancers interviewing — heavily shortlisting');
  if ((jobStats.timePostedMinutes || 0) > 1440 && _ic > 0) riskItems.push('Posted ' + jobStats.timePosted + ' with active interviews — likely decided');
  if ((jobStats.hiredCount || 0) > 0) riskItems.push('Already hired — job is closed');
  if (jobStats.clientRating !== null && jobStats.clientRating !== undefined && jobStats.clientRating < 4.0) riskItems.push(jobStats.clientRating + '★ client rating — below 4.0');
  if (jobStats.clientHireRate !== null && jobStats.clientHireRate !== undefined && jobStats.clientHireRate < 30) riskItems.push(jobStats.clientHireRate + '% hire rate — rarely hires from proposals');
  const _inv = jobStats.invitesSent || 0;
  if (_inv >= 1 && _inv <= 4) riskItems.push('Client sent ' + _inv + ' invite(s) — prefers invited freelancers');
  else if (_inv > 4) riskItems.push('Client sent ' + _inv + ' invites — hiring by invite only');
  if ((jobStats.clientSpentNum || 0) === 0 && jobStats.clientTotalSpent !== null && jobStats.clientTotalSpent !== undefined) riskItems.push('$0 total spent — never paid a freelancer');
  if (jobStats.paymentVerified === false) riskItems.push('Payment method not verified — risk of non-payment');
  console.log('[SnagAI] clientRating:', jobStats.clientRating, '| riskItems:', riskItems.length, riskItems);

  return { probScore, matchScore, combined, verdict, verdictColor, probColor, matchColor, topProb, topMatch, warnings, riskItems };
};
