// ── Proposal generation ───────────────────────────────────────────────────────
import { SERVER_URL as SERVER } from '../../options/modules/config.js';

import { resolvePrimaryEntity } from './primary-profile.js';
import { handleAgencyCoverLetter } from './agency-generate.js';
import { syncUsageToStorage } from './sync-usage.js';

function buildFreelancerProfile(profileFull) {
  const baseProfile = profileFull || {};
  return {
    ...baseProfile,
    skills:    Array.isArray(baseProfile.skillsArr) && baseProfile.skillsArr.length
                 ? baseProfile.skillsArr.join(', ')
                 : (typeof baseProfile.skills === 'string' ? baseProfile.skills : ''),
    skillsArr: Array.isArray(baseProfile.skillsArr) ? baseProfile.skillsArr
                 : (typeof baseProfile.skills === 'string' ? baseProfile.skills.split(',').map(s => s.trim()).filter(Boolean) : []),
    portfolio: baseProfile.portfolios || baseProfile.portfolio || [],
    extra:     baseProfile.extra || '',
  };
}

export async function handleGenerate(payload) {
  const primary = await resolvePrimaryEntity();

  // Primary is an agency — delegate entirely to the agency-shaped request.
  // handleAgencyCoverLetter's response shape ({coverLetter, answers}) is a
  // subset of what freelancer callers of handleGenerate expect ({letter,...}),
  // so normalize it to look like a /proposal response.
  if (primary?.type === 'agency') {
    const result = await handleAgencyCoverLetter({
      jobData: payload.job,
      instruction: payload.refineInstruction || '',
      existingCL: payload.currentLetter || '',
      questions: [],
    }, primary.data);
    if (result?.showPaywall || result?.error) return result;
    return { success: true, letter: result.coverLetter, freeRevision: result.freeRevision, wasRevision: result.wasRevision };
  }

  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(['userEmail', 'anonId', 'settings']),
    chrome.storage.local.get(['deviceId'])
  ]);

  const profileFull = primary?.data || null;
  const baseProfile  = profileFull || syncData.profile || {};
  const profile = buildFreelancerProfile(baseProfile);

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
  await syncUsageToStorage(data.usage);
  data.wasRevision = !!payload.refineInstruction;
  return data;
}

// ── Cover letter generation from proposal submission page ──────────────────
export async function handleCoverLetter(msg) {
  const primary = await resolvePrimaryEntity();

  if (primary?.type === 'agency') {
    return handleAgencyCoverLetter(msg, primary.data);
  }

  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(['userEmail', 'anonId', 'settings']),
    chrome.storage.local.get(['deviceId'])
  ]);

  const profileFull = primary?.data || null;
  const profile = buildFreelancerProfile(profileFull);

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
  await syncUsageToStorage(data.usage);

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
    await syncUsageToStorage(data2.usage);

    const answers = (data2?.questions || '')
      .split('\n')
      .map(line => line.replace(/^\s*\d+[\.\)]\s*/, '').trim())
      .filter(Boolean);

    return { coverLetter: msg.existingCL, answers };
  }

  return { coverLetter, answers: [], freeRevision: data.freeRevision, wasRevision: !!refineInstruction };
}
