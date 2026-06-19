// ── Win Probability Calculator ────────────────────────────────────────────────
window.SnagAI.calcWinProbability = function(jobStats, profile, filters) {
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
    else if (cr >= 3.0) { probScore -= 8;  probFactors.push({ label: 'Client rating', value: cr + '★', delta: -8,  note: 'Below average — risk of disputes' }); }
    else                { probScore -= 18; probFactors.push({ label: 'Client rating', value: cr + '★', delta: -18, note: 'Poor client — high dispute risk' }); }
  }

  // Client spend — scored factor (always shown, not just on filter violation)
  const spentNum = jobStats.clientSpentNum || 0;
  if (jobStats.clientTotalSpent !== undefined && jobStats.clientTotalSpent !== null) {
    if      (spentNum >= 100000) { probScore += 8;  probFactors.push({ label: 'Client spend', value: '$100K+',             delta: +8,  note: 'Serious, high-spending client' }); }
    else if (spentNum >= 10000)  { probScore += 4;  probFactors.push({ label: 'Client spend', value: '$10K+',              delta: +4,  note: 'Active, experienced client' }); }
    else if (spentNum >= 1000)   { probScore += 0;  probFactors.push({ label: 'Client spend', value: '$1K+',               delta:  0,  note: 'Some hiring history' }); }
    else if (spentNum > 0)       { probScore -= 4;  probFactors.push({ label: 'Client spend', value: '<$1K',               delta: -4,  note: 'Very little history' }); }
    else                         { probScore -= 10; probFactors.push({ label: 'Client spend', value: '$0 spent',            delta: -10, note: 'Never paid a freelancer' }); }
  }

  // Payment verified
  if (jobStats.paymentVerified === true)  { probScore += 3;  probFactors.push({ label: 'Payment', value: 'Verified',     delta: +3,  note: 'Safe to work with' }); }
  if (jobStats.paymentVerified === false) { probScore -= 10; probFactors.push({ label: 'Payment', value: 'Unverified',   delta: -10, note: 'Risk of non-payment' }); }

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

  const profileSkillsLower = profileSkillsStr.toLowerCase();
  if (jobSkillsNorm.length > 0 && profileSkillsStr.trim().length > 0) {
    const matched  = jobSkillsNorm.filter(s => profileSkillsLower.includes(s));
    const missing  = rawJobSkills.filter((s, i) => !profileSkillsLower.includes(jobSkillsNorm[i]));
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

  const topProb  = [...probFactors].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const topMatch = [...matchFactors].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const combined = Math.round((probScore * 0.6) + (matchScore * 0.4));
  let verdict, verdictColor;
  if      (combined >= 70) { verdict = 'Strong';    verdictColor = '#34d399'; }
  else if (combined >= 50) { verdict = 'Good';      verdictColor = '#c9a84c'; }
  else if (combined >= 30) { verdict = 'Possible';  verdictColor = '#f59e0b'; }
  else                     { verdict = 'Long shot'; verdictColor = '#f87171'; }

  const probColor  = probScore  >= 60 ? '#34d399' : probScore  >= 40 ? '#c9a84c' : '#f87171';
  const matchColor = matchScore >= 60 ? '#34d399' : matchScore >= 40 ? '#c9a84c' : '#f87171';

  // ── Risk items — uses user-defined filter thresholds with safe defaults ───────
  const flt          = (filters && typeof filters === 'object') ? filters : {};
  const _maxProp     = flt.maxProposals           ?? 50;
  const _maxInt      = flt.maxInterviewing        ?? 3;
  const _maxInv      = flt.maxInvitesSent         ?? 5;
  const _minRat      = flt.minClientRating        ?? 4.0;
  const _minHR       = flt.minHireRate            ?? 30;
  const _minSpent    = flt.minClientSpent         ?? 0;
  const _warnZero    = flt.warnZeroSpent          ?? true;
  const _reqPay      = flt.requirePaymentVerified ?? false;
  const _maxAgeDays  = flt.maxJobAgeDays          ?? 7;
  const _maxRatePct    = flt.maxRateMismatch      ?? 50;
  const _warnLocFilt   = flt.warnLocationFilter  ?? true;
  const _warnTierMis   = flt.warnTierMismatch    ?? true;

  // filterNotes maps factor label → note shown on that factor's pill when filter is violated
  const filterNotes = {};
  const riskItems = [];

  // Proposals
  const _p = jobStats.proposalCount || 0;
  if (_maxProp > 0 && _p >= _maxProp) {
    riskItems.push(_p >= 50 ? '50+ proposals — very high competition' : _p + ' proposals — above your ' + _maxProp + ' limit');
    filterNotes['Proposals'] = 'above your ' + _maxProp + ' limit';
  }

  // Interviewing — 0 = Off
  const _ic = jobStats.interviewingCount || 0;
  if (_maxInt > 0 && _ic >= _maxInt) {
    riskItems.push(_ic >= 3 ? _ic + ' freelancers interviewing — heavily shortlisting' : _ic + ' freelancer(s) already interviewing');
    filterNotes['Interviewing'] = 'above your ' + _maxInt + ' limit';
  }

  // Job age — 0 = Any
  const _ageMins = jobStats.timePostedMinutes || 0;
  if (_maxAgeDays > 0 && _ageMins > _maxAgeDays * 1440) {
    const _ageLabel = _maxAgeDays === 1 ? '24h' : _maxAgeDays + 'd';
    riskItems.push('Posted ' + jobStats.timePosted + ' — older than your ' + _ageLabel + ' limit');
    filterNotes['Posted'] = 'older than your ' + _ageLabel + ' limit';
  }

  // Already hired
  if ((jobStats.hiredCount || 0) > 0) riskItems.push('Already hired — job is closed');

  // Client rating
  const _cr = jobStats.clientRating;
  if (_cr !== null && _cr !== undefined && _minRat > 0 && _cr < _minRat) {
    riskItems.push(_cr + '★ client rating — below your ' + _minRat.toFixed(1) + '★ minimum');
    filterNotes['Client rating'] = 'below your ' + _minRat.toFixed(1) + '★ minimum';
  }

  // Hire rate
  const _hrV = jobStats.clientHireRate;
  if (_hrV !== null && _hrV !== undefined && _minHR > 0 && _hrV < _minHR) {
    riskItems.push(_hrV + '% hire rate — below your ' + _minHR + '% minimum');
    filterNotes['Hire rate'] = 'below your ' + _minHR + '% minimum';
  }

  // Invites sent — 0 = Off
  const _inv = jobStats.invitesSent || 0;
  if (_maxInv > 0 && _inv >= _maxInv) {
    riskItems.push('Client sent ' + _inv + ' invites — above your ' + _maxInv + ' invite limit');
    filterNotes['Invites'] = 'above your ' + _maxInv + ' invite limit';
  }

  // Client spent
  const _spentNum = jobStats.clientSpentNum || 0;
  if (_minSpent > 0 && _spentNum < _minSpent) {
    const _fmtMin = _minSpent >= 1000 ? '$' + (_minSpent / 1000) + 'K' : '$' + _minSpent;
    riskItems.push('Client spent under ' + _fmtMin + ' — below your minimum');
    filterNotes['Client spend'] = 'below your ' + _fmtMin + '+ minimum';
  } else if (_warnZero && _spentNum === 0 && jobStats.clientTotalSpent !== null && jobStats.clientTotalSpent !== undefined) {
    riskItems.push('$0 total spent — never paid a freelancer');
    filterNotes['Client spend'] = 'flagged: $0 spent';
  }

  // Payment verified
  if (jobStats.paymentVerified === false && _reqPay) {
    riskItems.push('Payment not verified — you require verified payment');
    filterNotes['Payment'] = 'you require verified payment';
  }

  // Rate mismatch — add to risk if above user threshold
  if (userRate && clientRate) {
    const _ratePct = Math.round(((userRate - clientRate) / clientRate) * 100);
    if (_ratePct > _maxRatePct) {
      riskItems.push('Your $' + userRate + '/hr is ' + _ratePct + '% above client avg $' + clientRate + '/hr');
    }
  }

  // Location filter — warn if job has explicit location restrictions
  if (_warnLocFilt && jobStats.hasLocationFilter) {
    const loc = jobStats.reqCountries?.[0] || jobStats.reqRegions?.[0] || jobStats.clientLocation || '';
    riskItems.push('Job has location restrictions' + (loc ? ' (' + loc + ')' : '') + ' — verify you qualify');
  }

  // Tier / expertise mismatch
  if (_warnTierMis) {
    // Agency vs Independent mismatch
    if ((jobStats.reqTalentType || '').toLowerCase() === 'agency') {
      riskItems.push('Job requires an Agency account — you\'re listed as Independent');
    }
    // Expertise level — contractorTier 3 = Expert sought
    const TIER_RANK = { new: 0, rising: 1, top_rated: 2, top_rated_plus: 3, expert: 4 };
    const userRank  = TIER_RANK[profile.tierKey || 'new'] || 0;
    if (jobStats.contractorTier === 3 && userRank < TIER_RANK.top_rated) {
      riskItems.push('Client seeks Expert-level freelancers — your current tier may not qualify');
    }
    // Rising talent requirement
    if (jobStats.reqRisingTalent && userRank < TIER_RANK.rising) {
      riskItems.push('Job requires Rising Talent badge — you don\'t have it yet');
    }
    // Minimum earnings requirement
    if (jobStats.reqMinEarnings && jobStats.reqMinEarnings > 0) {
      const earned = parseFloat((profile.earnings || '0').replace(/[^0-9.KkMm]/g, '')) || 0;
      if (earned < jobStats.reqMinEarnings) {
        riskItems.push('Job requires $' + jobStats.reqMinEarnings + '+ in earnings — check your eligibility');
      }
    }
  }

  console.log('[SnagAI] riskItems:', riskItems.length, riskItems);

  return { probScore, matchScore, combined, verdict, verdictColor, probColor, matchColor, topProb, topMatch, warnings, riskItems, filterNotes };
};
