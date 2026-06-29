// ── Snag AI Job Analyser ────────────────────────────────────────────────────
// Orchestrates Claude-powered job analysis with permanent per-job caching
// Loaded before content.js via manifest

window.SnagAI = window.SnagAI || {};

const CACHE_PREFIX      = 'sn_analysis_';
const REANALYSE_PREFIX  = 'sn_recount_';
const MAX_REANALYSES    = 3; // max extra analyses after initial (3 re-analyses total)

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Run (or return cached) Claude analysis for the current job.
 * Cache is permanent — no TTL. Re-analysis is manual only.
 */
window.SnagAI.analyseJob = async function(jobData, filters = {}, forceRefresh = false) {
  const jobId    = SnagAI.state.cachedJobId;
  const cacheKey = jobId && jobId !== 'current' ? CACHE_PREFIX + jobId : null;

  if (!forceRefresh && cacheKey) {
    const stored = await new Promise(r => chrome.storage.local.get([cacheKey], r));
    const cached = stored[cacheKey];
    if (cached?.analysis) {
      console.log('[SnagAI] Analysis cache hit:', jobId);
      return { ...cached.analysis, fromCache: true };
    }
  }

  console.log('[SnagAI] Running Claude analysis for job:', jobId, forceRefresh ? '(forced refresh)' : '');
  const analysis = await chrome.runtime.sendMessage({
    type:    'ANALYSE_JOB',
    jobData: jobData || {},
    filters: filters || {},
  });

  if (analysis?.error) throw new Error(analysis.error);

  if (cacheKey && analysis) {
    const reCountStored = await new Promise(r => chrome.storage.local.get([REANALYSE_PREFIX + jobId], r));
    const currentCount  = reCountStored[REANALYSE_PREFIX + jobId] || 0;
    chrome.storage.local.set({
      [cacheKey]: { analysis, cachedAt: Date.now() },
      [REANALYSE_PREFIX + jobId]: forceRefresh ? currentCount + 1 : 0,
    });
    console.log('[SnagAI] Analysis cached for:', jobId, '| re-analyse count:', forceRefresh ? currentCount + 1 : 0);
  }

  return analysis;
};

/**
 * Check if this job has a cached analysis result.
 */
window.SnagAI.isJobAnalysed = async function() {
  const jobId    = SnagAI.state.cachedJobId;
  const cacheKey = jobId && jobId !== 'current' ? CACHE_PREFIX + jobId : null;
  if (!cacheKey) return false;
  const stored = await new Promise(r => chrome.storage.local.get([cacheKey], r));
  return !!(stored[cacheKey]?.analysis);
};

/**
 * How many re-analyses have been used for this job (0 = never re-analysed).
 * Returns { used, remaining, locked }
 */
window.SnagAI.getReAnalyseStatus = async function() {
  const jobId = SnagAI.state.cachedJobId;
  if (!jobId || jobId === 'current') return { used: 0, remaining: MAX_REANALYSES, locked: false };
  const stored = await new Promise(r => chrome.storage.local.get([REANALYSE_PREFIX + jobId], r));
  const used   = stored[REANALYSE_PREFIX + jobId] || 0;
  return { used, remaining: MAX_REANALYSES - used, locked: used >= MAX_REANALYSES };
};
