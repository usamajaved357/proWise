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

// On a JSON.parse failure, Node's error message includes a character offset
// ("...at position 845...") but not the actual malformed text — logging just
// the message leaves you unable to diagnose without another live API call.
// This pulls the offset out and prints the real text around it.
function logJsonParseFailure(label, rawJson, error) {
  const posMatch = /position (\d+)/.exec(error.message || '');
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    const start = Math.max(0, pos - 80);
    const snippet = rawJson.slice(start, pos + 80);
    console.error(`[${label}] JSON parse error: ${error.message}`);
    console.error(`[${label}] Text around the failure (char ${pos}):\n…${snippet}…`);
  } else {
    console.error(`[${label}] JSON parse error: ${error.message}`);
    console.error(`[${label}] Raw JSON (first 500 chars): ${rawJson.slice(0, 500)}`);
  }
}

// A second, independent failure mode from the same root cause (the model not
// reliably escaping things inside JSON string values): a raw newline/tab/other
// control character typed literally inside a string instead of as \n/\t,
// which JSON.parse rejects as "Bad control character in string literal".
// Fixed with a single linear scan tracking string/escape state — simpler and
// more robust than position-patching since one response can contain many
// literal line breaks (e.g. a multi-paragraph finding) in one string.
function sanitizeControlCharsInStrings(text) {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!inString) {
      out += ch;
      if (ch === '"') inString = true;
      continue;
    }
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code < 0x20) {
      if (ch === '\n') out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (ch === '\t') out += '\\t';
      else out += '\\u' + code.toString(16).padStart(4, '0');
    } else {
      out += ch;
    }
  }
  return out;
}

// Self-healing JSON repair — a real recovery mechanism, not just a prompt
// instruction we're hoping the model follows. We told Claude to use curly
// quotes specifically because they can't break JSON, and it *still* used
// straight quotes around a literal phrase on the very next real run —
// proving the instruction alone isn't reliable enough when a discarded
// response costs real money. This repairs the exact failure mode we've now
// seen twice: a straight, unescaped `"` inside a string value that fools
// JSON.parse into thinking the string ended early ("Expected ',' or '}'
// after property value"). It locates the actual false-terminator quote
// (scanning backward from the reported error position) and escapes it, then
// retries — looping since one finding/fix can contain multiple such quotes.
// Deliberately narrow: only handles this one, now-confirmed error shape;
// anything else re-throws rather than guessing at a fix we haven't verified.
function repairAndParseJSON(rawJson, maxAttempts = 30) {
  const sanitized = sanitizeControlCharsInStrings(rawJson);
  const sanitizedControlChars = sanitized !== rawJson;
  let text = sanitized;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = JSON.parse(text);
      if (i > 0 || sanitizedControlChars) {
        const reasons = [];
        if (i > 0) reasons.push(`${i} unescaped straight quote${i === 1 ? '' : 's'}`);
        if (sanitizedControlChars) reasons.push('raw control character(s) (e.g. a literal newline) inside a string value');
        console.warn(`[AUDIT] JSON self-repaired (${reasons.join('; ')})`);
      }
      return result;
    } catch (e) {
      const m = /after property value in JSON at position (\d+)/.exec(e.message);
      if (!m) throw e;
      const pos = parseInt(m[1], 10);
      let q = pos;
      while (q >= 0 && text[q] !== '"') q--;
      if (q < 0 || text[q - 1] === '\\') throw e;
      text = text.slice(0, q) + '\\' + text.slice(q);
    }
  }
  throw new Error('JSON repair exceeded max attempts');
}

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

// Shared response shape for both audit features (freelancer/agency differ
// only in which section ids are valid) — passed to callClaudeRaw's
// output_config.format so the API enforces valid JSON structurally instead
// of us regex-extracting and repairing a freehand response after the fact.
function buildAuditResponseSchema(sectionIds) {
  return {
    type: 'object',
    properties: {
      overallScore: { type: 'number' },
      status: { type: 'string', enum: ['Elite', 'Strong', 'Good', 'Average', 'Weak', 'Critical'] },
      headline: { type: 'string' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', enum: sectionIds },
            label: { type: 'string' },
            score: { type: 'number' },
            verdict: { type: 'string', enum: ['Strong', 'Good', 'Weak', 'Critical'] },
            finding: { type: 'string' },
            // minLength forces the model to actually write the literal
            // replacement text, not just an introductory clause ("Replace it
            // with something like:") that satisfies the schema's type check
            // but drops the substance — a real regression seen once schema
            // enforcement replaced freeform prose generation for this field.
            // Anthropic's json_schema format doesn't support oneOf, so this
            // uses the plain type-array form instead — minLength is a no-op
            // on a null instance per JSON Schema spec, so it still only
            // constrains the non-null (string) case.
            fix: {
              type: ['string', 'null'],
              minLength: 40,
              description: 'The literal, ready-to-copy replacement text itself — the full rewritten tagline/description/skill list/rate range/etc., not merely a sentence promising one. Never end on a colon or "like:" with the actual suggestion missing. null only if nothing needs to change.',
            },
          },
          required: ['id', 'label', 'score', 'verdict', 'finding', 'fix'],
          additionalProperties: false,
        },
      },
      topWins: { type: 'array', items: { type: 'string' } },
      topFixes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            priority: { type: 'number' },
            action: { type: 'string', minLength: 40, description: 'The concrete replacement itself, verb-first — exact text/number/name, never a truncated lead-in with the suggestion missing.' },
            impact: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          },
          required: ['priority', 'action', 'impact'],
          additionalProperties: false,
        },
      },
      rateInsight: { type: 'string' },
    },
    required: ['overallScore', 'status', 'headline', 'sections', 'topWins', 'topFixes', 'rateInsight'],
    additionalProperties: false,
  };
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
  logJsonParseFailure,
  repairAndParseJSON,
  buildAuditResponseSchema,
};
