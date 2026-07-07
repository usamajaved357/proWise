// ── Agency cover letter generation ──────────────────────────────────────────
// Mirrors extension/background/modules/generate.js's handleCoverLetter, but
// loads agency data (registeredAgencies + agencyFull_<slug>, written by
// extension/content/agency-reader.js) instead of a freelancer profile, and
// posts to /agency-proposal instead of /proposal. No "primary agency"
// concept exists yet — PLAN_AGENCY_PROFILE_LIMITS caps every plan at 0 or 1
// registered agency today, so picking the first one with real cached data
// is equivalent to a primary-profile pick without needing that extra UI.
const SERVER = 'http://localhost:3000'; // Local Host

export async function handleAgencyCoverLetter(msg) {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(['userEmail', 'anonId', 'settings']),
    chrome.storage.local.get(['registeredAgencies', 'deviceId'])
  ]);

  const regAgencies = localData.registeredAgencies || [];
  const agencyMeta = regAgencies.find(a => a && a.slug) || regAgencies[0];

  let agencyFull = null;
  if (agencyMeta?.slug) {
    const localKey = 'agencyFull_' + agencyMeta.slug;
    const stored = await new Promise(r => chrome.storage.local.get([localKey], r));
    agencyFull = stored[localKey] || null;
  }

  if (!agencyFull) {
    return { error: 'No agency profile data found. Open your registered agency profile page once to sync it, then try again.' };
  }

  let anonId = syncData.anonId;
  if (!anonId) {
    anonId = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await chrome.storage.sync.set({ anonId });
  }

  const questions = msg.questions || [];
  const hasQs = questions.length > 0;
  console.log('[SnagAI] handleAgencyCoverLetter — questions received:', questions.length, questions.map(q => q.label?.slice(0, 50)));

  const jobData = { ...(msg.jobData || {}) };
  const refineInstruction = (msg.instruction || '').trim();

  const cleanedQs = questions.map((q, i) => {
    const label = q.label.replace(/^\d+[\.\)]\s*/, '').trim();
    return { label, index: i };
  });

  const res = await fetch(SERVER + '/agency-proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job: jobData,
      agency: agencyFull,
      settings: syncData.settings || {},
      email: syncData.userEmail || null,
      anonId,
      refineInstruction,
      currentLetter: msg.existingCL || '',
      categories: agencyFull?.skills || [],
      deviceId: localData.deviceId || '',
      fillQuestions: !!(msg.fillQuestions && msg.questionCount > 0),
    })
  });

  const data = await res.json();
  if (res.status === 402 || data.showPaywall) return { showPaywall: true, error: data.error };
  if (!res.ok) throw new Error(data.error || 'Server error');

  const coverLetter = (data.letter || data.coverLetter || (typeof data === 'string' ? data : '')).trim();

  if (hasQs && msg.existingCL) {
    const qInstruction = `Do not change the cover letter. The proposal form has ${cleanedQs.length} separate Q&A screening question(s). Answer each one concisely (2-3 sentences), staying in "we"/"our team" voice, in the ===QUESTIONS=== block, numbered to match:\n`
      + cleanedQs.map((q, i) => `${i + 1}. ${q.label}`).join('\n');

    const res2 = await fetch(SERVER + '/agency-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job: jobData,
        agency: agencyFull,
        settings: syncData.settings || {},
        email: syncData.userEmail || null,
        anonId,
        refineInstruction: qInstruction,
        currentLetter: msg.existingCL,
        categories: agencyFull?.skills || [],
        deviceId: localData.deviceId || '',
      })
    });

    const data2 = await res2.json();
    console.log('[SnagAI] Agency Phase 2 questions field:', JSON.stringify(data2?.questions)?.slice(0, 150));

    const answers = (data2?.questions || '')
      .split('\n')
      .map(line => line.replace(/^\s*\d+[\.\)]\s*/, '').trim())
      .filter(Boolean);

    return { coverLetter: msg.existingCL, answers };
  }

  return { coverLetter, answers: [] };
}
