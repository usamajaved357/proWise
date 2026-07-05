'use strict';

// ── Shared audit utilities — used by both profile-audit and agency-audit ────
// Extracted unchanged from the verified freelancer-audit implementation
// (server/routes/profile-audit.js and server/prompt-audit.js) so the agency
// audit gets the same correctness fixes (deterministic scoring, quote-format
// validation, progress-tracking blocks) without duplicating them. None of
// this logic is freelancer-specific — it only touches sections[]/topFixes[]
// shape and label/score/finding/fix fields, which agency audits use too.

// Double quotes only — a straight/curly single quote must never be a
// delimiter, or an apostrophe inside a quoted script ("I've", "Here's")
// breaks the match entirely (see extension/content/profile-reader.js
// parseSuggestionSegments for the full explanation of this regex).
const QUOTE_RE = /(^|[\s(])["“]([^"”]{4,}?)["”](?=[\s.,!?;:)]|$)/;
// Same pattern with the global flag, for extracting every quoted span rather
// than just testing whether one exists.
const QUOTE_RE_GLOBAL = /(^|[\s(])["“]([^"”]{4,}?)["”](?=[\s.,!?;:)]|$)/g;

// A fix or topFixes.action written without a matched quote pair still renders
// fine — it just silently falls back to plain, unhighlighted text in the
// sidebar/PDF — so this only logs a warning rather than failing the request.
function checkQuoteFormatting(audit) {
  let missing = 0, total = 0;
  (audit.sections || []).forEach(sec => {
    if (sec.fix) {
      total++;
      if (!QUOTE_RE.test(sec.fix)) missing++;
    }
  });
  (audit.topFixes || []).forEach(tf => {
    if (tf.action) {
      total++;
      if (!QUOTE_RE.test(tf.action)) missing++;
    }
  });
  if (missing > 0) {
    console.warn(`[AUDIT] ${missing}/${total} fixes missing quoted literal text — these will render as plain, unhighlighted text in the sidebar/PDF`);
  }
}

// Claude computes overallScore itself inside a one-shot JSON response with no
// room to actually work through N weighted terms, so it drifts from the
// section scores it just wrote — recomputing it deterministically here
// guarantees the number always reflects the sections. `weights` is passed in
// per-feature (freelancer vs agency have different section IDs and weights)
// but the arithmetic and status thresholds are identical.
function computeWeightedScore(audit, weights) {
  const sections = Array.isArray(audit.sections) ? audit.sections : [];
  let weightedSum = 0, weightTotal = 0;
  sections.forEach(sec => {
    const w = weights[sec.id];
    if (typeof w === 'number' && typeof sec.score === 'number') {
      weightedSum += sec.score * w;
      weightTotal += w;
    }
  });
  if (weightTotal === 0) return; // malformed sections — leave Claude's own value as a fallback
  const score = Math.round((weightedSum / weightTotal) * 10) / 10;
  audit.overallScore = score;
  audit.status =
    score >= 9   ? 'Elite' :
    score >= 7.5 ? 'Strong' :
    score >= 6   ? 'Good' :
    score >= 4.5 ? 'Average' :
    score >= 3   ? 'Weak' : 'Critical';
}

function buildChangesBlock(changes) {
  if (!changes) return '';
  return `CHANGES SINCE LAST AUDIT (code-verified — this is ground truth for what actually changed; do not re-derive it yourself):
${changes}
`;
}

function buildPreviousAuditBlock(previousAudit) {
  if (!previousAudit || !Array.isArray(previousAudit.sections) || !previousAudit.sections.length) {
    return 'PREVIOUS AUDIT: None — this is the first audit of this profile.';
  }
  const sectionLines = previousAudit.sections.map(s =>
    `- ${s.label} (scored ${s.score}/10): finding was "${s.finding || ''}" — fix suggested was "${s.fix || ''}"`
  ).join('\n');
  return `PREVIOUS AUDIT (score was ${previousAudit.overallScore ?? '?'}/10) — this is a re-audit of a profile you scored before. Compare every item below against the CURRENT profile data above and check whether each suggestion was actually implemented:
${sectionLines}`;
}

module.exports = {
  QUOTE_RE, QUOTE_RE_GLOBAL,
  checkQuoteFormatting,
  computeWeightedScore,
  buildChangesBlock,
  buildPreviousAuditBlock,
};
