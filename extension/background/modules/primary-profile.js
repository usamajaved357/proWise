// ── Primary profile resolution — freelancer OR agency, one concept ─────────
// Replaces the earlier "Generate as: Freelancer/Agency" popup toggle. The
// user now picks a primary profile from the same unified Profiles page
// (extension/options/modules/profiles.js) that lists both types together —
// whichever one is marked primary is what job audits/cover letters use,
// exactly like the freelancer-only primaryProfileId did before, just now
// covering both types. Agency ids are namespaced 'agency_N' (see
// agency-urls.js) vs freelancer ids like 'profile_N' (see profile-urls.js)
// — that prefix alone is enough to disambiguate type from primaryProfileId,
// no separate type field needed in storage.
export async function resolvePrimaryEntity() {
  const local = await chrome.storage.local.get([
    'registeredProfiles', 'registeredAgencies', 'primaryProfileId', 'activeProfileId'
  ]);
  const regProfiles = (local.registeredProfiles || []).filter(Boolean);
  const regAgencies = (local.registeredAgencies || []).filter(Boolean);
  const primaryId = local.primaryProfileId || local.activeProfileId;

  const candidates = [
    ...regProfiles.map(p => ({ ...p, _type: 'freelancer' })),
    ...regAgencies.map(a => ({ ...a, _type: 'agency' })),
  ];
  if (!candidates.length) return null;

  // Same "prefer synced data" fallback chain the freelancer-only version
  // used: an explicitly-set primary wins only if it actually has synced
  // data; otherwise fall back to any synced entry, then any registered
  // entry at all, freelancer-first (existing default-selection order).
  const hasData = c => c._type === 'agency' ? !!c.slug : !!(c.name || c.jss || c._readAt);
  const primaryMeta =
    (primaryId && candidates.find(c => c.id === primaryId && hasData(c))) ||
    candidates.find(hasData) ||
    candidates[0];

  if (!primaryMeta) return null;

  if (primaryMeta._type === 'agency') {
    const key = 'agencyFull_' + primaryMeta.slug;
    const stored = await new Promise(r => chrome.storage.local.get([key], r));
    return { type: 'agency', meta: primaryMeta, data: stored[key] || null };
  }

  const key = 'profileFull_' + primaryMeta.id;
  const stored = await new Promise(r => chrome.storage.local.get([key], r));
  return { type: 'freelancer', meta: primaryMeta, data: stored[key] || null };
}
