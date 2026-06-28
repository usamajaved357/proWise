// ── Snag AI Job Analyser ────────────────────────────────────────────────────
// Orchestrates Claude-powered job analysis with per-job caching
// Loaded before content.js via manifest

window.SnagAI = window.SnagAI || {};

// Cache key prefix for analysis results
const CACHE_PREFIX = 'sn_analysis_';
// How long a cached analysis is considered fresh (6 hours)
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Run (or return cached) Claude analysis for the current job.
 * @param {object} jobData  — from SnagAI.getJob() + enriched job stats
 * @param {object} filters  — user's job filters from their profile
 * @returns {Promise<object>} analysis — { verdict, probScore, matchScore, probFactors, matchFactors, hookSuggestion, summary }
 */
window.SnagAI.analyseJob = async function(jobData, filters = {}) {
  const jobId    = SnagAI.state.cachedJobId;
  const cacheKey = jobId && jobId !== 'current' ? CACHE_PREFIX + jobId : null;

  // TESTING: cache disabled — remove this comment to re-enable
  // if (cacheKey) {
  //   const stored = await new Promise(r => chrome.storage.local.get([cacheKey], r));
  //   const cached = stored[cacheKey];
  //   if (cached && cached.analysis && (Date.now() - (cached.cachedAt || 0)) < CACHE_TTL_MS) {
  //     console.log('[SnagAI] Analysis cache hit:', jobId);
  //     return { ...cached.analysis, fromCache: true };
  //   }
  // }

  // Call background → server → Claude
  console.log('[SnagAI] Running Claude analysis for job:', jobId);
  const analysis = await chrome.runtime.sendMessage({
    type:    'ANALYSE_JOB',
    jobData: jobData || {},
    filters: filters || {},
  });

  if (analysis?.error) {
    throw new Error(analysis.error);
  }

  // Cache the result keyed by job ID
  if (cacheKey && analysis) {
    chrome.storage.local.set({ [cacheKey]: { analysis, cachedAt: Date.now() } });
    console.log('[SnagAI] Analysis cached for:', jobId);
  }

  return analysis;
};

/**
 * Check if this job has already been analysed (cache hit).
 */
window.SnagAI.isJobAnalysed = async function() {
  const jobId    = SnagAI.state.cachedJobId;
  const cacheKey = jobId && jobId !== 'current' ? CACHE_PREFIX + jobId : null;
  if (!cacheKey) return false;
  const stored = await new Promise(r => chrome.storage.local.get([cacheKey], r));
  const cached = stored[cacheKey];
  return !!(cached && cached.analysis && (Date.now() - (cached.cachedAt || 0)) < CACHE_TTL_MS);
};
