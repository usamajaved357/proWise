// ── Job Analysis — background module ───────────────────────────────────────
// Fetches the primary profile (freelancer or agency, resolved via
// resolvePrimaryEntity) and calls the matching /analyse or /agency-analyse
// endpoint.

// const SERVER = 'https://prowise-4e5t.onrender.com'; // Production
const SERVER = 'http://localhost:3000'; // Local Host

import { resolvePrimaryEntity } from './primary-profile.js';
import { handleAgencyAnalyse } from './agency-analyse.js';

export async function handleAnalyse(payload) {
  const primary = await resolvePrimaryEntity();

  if (primary?.type === 'agency') {
    return handleAgencyAnalyse(payload, primary.data);
  }

  const { userEmail, anonId } = await chrome.storage.sync.get(['userEmail', 'anonId']);

  const profileFull = primary?.data || null;
  const baseProfile  = profileFull || primary?.meta || {};
  const profile = {
    ...baseProfile,
    skills:    Array.isArray(baseProfile.skillsArr) && baseProfile.skillsArr.length
                 ? baseProfile.skillsArr.join(', ')
                 : (typeof baseProfile.skills === 'string' ? baseProfile.skills : ''),
    skillsArr: Array.isArray(baseProfile.skillsArr) ? baseProfile.skillsArr : [],
    portfolio: baseProfile.portfolios || baseProfile.portfolio || [],
  };

  const res = await fetch(SERVER + '/analyse', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      job:     payload.jobData || {},
      profile,
      filters: payload.filters || {},
      email:   userEmail || null,
      anonId:  anonId   || null,
    })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Analysis failed');
  }

  return data.analysis;
}
