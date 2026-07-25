// ── Usage sync ───────────────────────────────────────────────────────────
// Every /proposal and /agency-proposal response carries a fresh `usage`
// status object (server/modules/usage.js's getUserStatus()) once a real
// email is attached. Nothing previously wrote that into chrome.storage.sync
// except the Subscription page's own one-time loadStatus() call — so an
// already-open Options page (or the popup) never saw the count move after a
// generation or revision until the page was reloaded. Call this right after
// every successful generate/revise so storage — and any UI listening to
// chrome.storage.onChanged — reflects reality immediately.
export async function syncUsageToStorage(usage) {
  if (!usage || typeof usage.used !== 'number') return;
  await chrome.storage.sync.set({
    userPlan:            usage.plan || 'free',
    usageCount:          usage.used,
    usageLimit:          usage.limit,
    userActive:          usage.active !== false,
    subscriptionStatus:  usage.subscriptionStatus || 'active',
    nextBilledAt:        usage.nextBilledAt        || null,
    currentPeriodStart:  usage.currentPeriodStart  || null,
    cancelsAt:           usage.cancelsAt            || null,
    auditLimit:          usage.auditLimit           ?? 0,
    usedAudits:          usage.usedAudits           ?? 0,
    jobAuditLimit:       usage.jobAuditLimit         ?? 0,
    usedJobAudits:       usage.usedJobAudits         ?? 0,
  });
}
