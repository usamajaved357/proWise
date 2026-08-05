// ── Agency cover letter generation ──────────────────────────────────────────
// Mirrors extension/background/modules/generate.js's freelancer generation
// logic, but posts to /agency-proposal with the agency data shape instead.
// Resolution of "which profile is primary" happens once, upstream, in
// generate.js via resolvePrimaryEntity() — this function just takes the
// already-resolved agencyFull data and does the actual request.
import { syncUsageToStorage } from './sync-usage.js';
import { SERVER_URL as SERVER } from '../../options/modules/config.js';

export async function handleAgencyCoverLetter(msg, agencyFull) {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(['userEmail', 'anonId', 'settings']),
    chrome.storage.local.get(['deviceId'])
  ]);

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
  await syncUsageToStorage(data.usage);

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
    await syncUsageToStorage(data2.usage);

    const answers = (data2?.questions || '')
      .split('\n')
      .map(line => line.replace(/^\s*\d+[\.\)]\s*/, '').trim())
      .filter(Boolean);

    return { coverLetter: msg.existingCL, answers };
  }

  return { coverLetter, answers: [], freeRevision: data.freeRevision, wasRevision: !!refineInstruction };
}
