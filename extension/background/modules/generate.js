// ── Proposal generation ───────────────────────────────────────────────────────
// const SERVER = 'https://prowise-4e5t.onrender.com'; // Production
const SERVER = 'http://localhost:3000'; // Local Host

export async function handleGenerate(payload) {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(['userEmail', 'anonId', 'settings']),
    chrome.storage.local.get(['registeredProfiles', 'activeProfileId', 'primaryProfileId', 'deviceId'])
  ]);

  const regProfiles = localData.registeredProfiles || [];
  const primaryId   = localData.primaryProfileId;

  const primaryMeta =
    (primaryId && regProfiles.find(p => p && p.id === primaryId && (p.name || p.jss || p._readAt))) ||
    regProfiles.find(p => p && (p.name || p.jss || p._readAt)) ||
    regProfiles[0];

  let profileFull = null;
  if (primaryMeta?.id) {
    const localKey  = 'profileFull_' + primaryMeta.id;
    const stored    = await new Promise(resolve => chrome.storage.local.get([localKey], resolve));
    profileFull = stored[localKey] || null;
  }

  const baseProfile = profileFull || syncData.profile || {};
  const profile = {
    ...baseProfile,
    skills:    Array.isArray(baseProfile.skillsArr) && baseProfile.skillsArr.length
                 ? baseProfile.skillsArr.join(', ')
                 : (typeof baseProfile.skills === 'string' ? baseProfile.skills : ''),
    skillsArr: Array.isArray(baseProfile.skillsArr) ? baseProfile.skillsArr
                 : (typeof baseProfile.skills === 'string' ? baseProfile.skills.split(',').map(s => s.trim()).filter(Boolean) : []),
    portfolio: baseProfile.portfolios || baseProfile.portfolio || [],
    extra:     baseProfile.extra || '',
  };

  let anonId = syncData.anonId;
  if (!anonId) {
    anonId = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await chrome.storage.sync.set({ anonId });
  }

  const res = await fetch(SERVER + '/proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job:               payload.job,
      profile,
      settings:          syncData.settings || {},
      email:             syncData.userEmail || null,
      anonId,
      refineInstruction: payload.refineInstruction || '',
      currentLetter:     payload.currentLetter     || '',
      categories:        profileFull?.jobFilters?.categories   || [],
      freelancerType:    syncData.settings?.freelancerType || 'developer',
      deviceId:          localData.deviceId        || ''
    })
  });

  const data = await res.json();
  if (res.status === 402 || data.showPaywall) return { showPaywall: true, plan: data.plan, error: data.error, usage: data };
  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
}

// ── Cover letter generation from proposal submission page ──────────────────
export async function handleCoverLetter(msg) {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(['userEmail', 'anonId', 'settings']),
    chrome.storage.local.get(['registeredProfiles', 'activeProfileId', 'primaryProfileId', 'deviceId'])
  ]);

  const regProfiles = localData.registeredProfiles || [];
  const primaryId   = localData.primaryProfileId;
  const primaryMeta =
    (primaryId && regProfiles.find(p => p && p.id === primaryId && (p.name || p.jss || p._readAt))) ||
    regProfiles.find(p => p && (p.name || p.jss || p._readAt)) ||
    regProfiles[0];

  let profileFull = null;
  if (primaryMeta?.id) {
    const localKey = 'profileFull_' + primaryMeta.id;
    const stored   = await new Promise(r => chrome.storage.local.get([localKey], r));
    profileFull = stored[localKey] || null;
  }

  const baseProfile = profileFull || {};
  const profile = {
    ...baseProfile,
    skills:    Array.isArray(baseProfile.skillsArr) && baseProfile.skillsArr.length
                 ? baseProfile.skillsArr.join(', ')
                 : (typeof baseProfile.skills === 'string' ? baseProfile.skills : ''),
    skillsArr: Array.isArray(baseProfile.skillsArr) ? baseProfile.skillsArr : [],
    portfolio: baseProfile.portfolios || baseProfile.portfolio || [],
    extra:     baseProfile.extra || '',
  };

  let anonId = syncData.anonId;
  if (!anonId) {
    anonId = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await chrome.storage.sync.set({ anonId });
  }

  const questions = msg.questions || [];
  const hasQs     = questions.length > 0;
  console.log('[SnagAI] handleCoverLetter — questions received:', questions.length, questions.map(q => q.label?.slice(0, 50)));

  const jobData          = { ...(msg.jobData || {}) };
  const refineInstruction = (msg.instruction || '').trim();

  // Clean question labels (strip "1. " prefix Upwork puts in the label text)
  const cleanedQs = questions.map((q, i) => {
    const label = q.label.replace(/^\d+[\.\)]\s*/, '').trim();
    return { label, index: i };
  });

  const res = await fetch(SERVER + '/proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job:               jobData,
      profile,
      settings:          syncData.settings || {},
      email:             syncData.userEmail || null,
      anonId,
      refineInstruction,
      currentLetter:     msg.existingCL || '',
      categories:        profileFull?.jobFilters?.categories || [],
      freelancerType:    syncData.settings?.freelancerType || 'developer',
      deviceId:          localData.deviceId || '',
      fillQuestions:     !!(msg.fillQuestions && msg.questionCount > 0),
    })
  });

  const data = await res.json();
  if (res.status === 402 || data.showPaywall) return { showPaywall: true, error: data.error };
  if (!res.ok) throw new Error(data.error || 'Server error');

  const coverLetter = (data.letter || data.coverLetter || (typeof data === 'string' ? data : '')).trim();

  // If questions + existingCL present → this is a Phase 2 (answers only) call
  if (hasQs && msg.existingCL) {
    const qInstruction = `Do not change the cover letter. The proposal form has ${cleanedQs.length} separate Q&A screening question(s). Answer each one concisely (2-3 sentences) in the ===QUESTIONS=== block, numbered to match:\n`
      + cleanedQs.map((q, i) => `${i + 1}. ${q.label}`).join('\n');

    const res2 = await fetch(SERVER + '/proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job:               jobData,
        profile,
        settings:          syncData.settings || {},
        email:             syncData.userEmail || null,
        anonId,
        refineInstruction: qInstruction,
        currentLetter:     msg.existingCL,
        categories:        profileFull?.jobFilters?.categories || [],
        freelancerType:    syncData.settings?.freelancerType || 'developer',
        deviceId:          localData.deviceId || '',
      })
    });

    const data2 = await res2.json();
    console.log('[SnagAI] Phase 2 questions field:', JSON.stringify(data2?.questions)?.slice(0, 150));

    const answers = (data2?.questions || '')
      .split('\n')
      .map(line => line.replace(/^\s*\d+[\.\)]\s*/, '').trim())
      .filter(Boolean);

    return { coverLetter: msg.existingCL, answers };
  }

  return { coverLetter, answers: [] };
}
