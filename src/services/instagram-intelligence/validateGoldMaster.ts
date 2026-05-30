/**
 * Gold Master validation.
 *
 * Blocking rules (fail the run) and warnings, evaluated against the structured
 * object AND the rendered markdown. Produces a ValidationSummary plus a
 * human-readable validation-report.md body.
 */

import type { GoldMasterIntelligence, ValidationIssue, ValidationSummary } from "./goldMasterSchema.js";
import type { ClientConfig } from "./clientConfig.js";

const MALFORMED_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /none\s*,\s*software/i, label: "none,software" },
  { re: /\bnone\s*,/i, label: 'comma-joined "none,"' },
  { re: /\bundefined\b/, label: "undefined" },
  { re: /\bnull\b(?!\w)/, label: "null" },
  { re: /\bNaN\b/, label: "NaN" },
  { re: /\[object Object\]/, label: "[object Object]" },
  { re: /\bYourfirst\b/i, label: "Yourfirst" },
  { re: /\bSlot\s*[123]\b/, label: "Slot N placeholder" },
];

const REQUIRED_HEADERS = [
  "0. Report Metadata",
  "1. Executive Snapshot",
  "2. Account Profile Snapshot",
  "3. Category Diagnosis",
  "4. Score Breakdown",
  "5. Required Fixes",
  "6. Next Seven Days",
  "7. 30-Day Sprint",
  "8. Market Comparison",
  "9. Market Pattern Dashboard",
  "10. Competitor Discovery Debug",
  "11. Competitor Relevance Board",
  "12. Observed Competitor Posts",
  "13. Content Mechanics",
  "14. Local / Category Visibility Strategy",
  "15. Hashtag Strategy",
  "16. Posting Toolkit",
  "17. Copy-Ready AI Prompts",
  "18. Content You Can Create Immediately",
  "19. 10 Quick Actions",
  "20. Measurement Plan",
  "21. Day 30 Review",
  "22. Data Gaps and Confidence",
  "23. Source Evidence Index",
  "24. Validation Summary",
];

const SERVICE_CTA_PATTERNS = [/book a call/i, /dm us for a quote/i, /request a quote/i, /book an estimate/i];

export function validateGoldMaster(
  gm: GoldMasterIntelligence,
  markdown: string,
  config: ClientConfig,
): ValidationSummary {
  const issues: ValidationIssue[] = [];
  const block = (rule: string, detail: string) => issues.push({ rule, severity: "blocking", detail });
  const warn = (rule: string, detail: string) => issues.push({ rule, severity: "warning", detail });

  // Required content counts.
  if (gm.fixes.length !== 5) block("five_moves_count", `Five Moves has ${gm.fixes.length}/5 entries.`);
  if (gm.nextSevenDays.length !== 7) block("seven_days_count", `Next Seven Days has ${gm.nextSevenDays.length}/7 entries.`);
  if (gm.sprint.length !== 4) block("sprint_count", `Sprint has ${gm.sprint.length}/4 weeks.`);
  if (gm.measurement.length !== 3) block("measurement_count", `Measurement has ${gm.measurement.length}/3 checkpoints.`);
  if (gm.quickActions.length !== 10) block("quick_actions_count", `Quick Actions has ${gm.quickActions.length}/10.`);
  if (gm.aiPrompts.length < 5) block("ai_prompts_count", `AI prompts: ${gm.aiPrompts.length} (need ≥5).`);
  if (gm.hashtags.length < 5) block("hashtag_groups_count", `Hashtag groups: ${gm.hashtags.length} (need ≥5).`);
  if (gm.scores.length < 5) block("score_dimensions_count", `Score dimensions: ${gm.scores.length} (need ≥5).`);
  if (gm.evidence.length === 0) block("evidence_present", "Source evidence index is empty.");
  if (gm.sectionConfidence.length === 0) block("confidence_present", "No section confidence scores.");
  if (gm.marketPatterns.postsStudied <= 0) warn("market_patterns_present", "Market patterns has 0 posts studied.");

  // Category sanity.
  const cat = gm.meta.normalizedCategory.toLowerCase();
  if (!cat || cat === "none" || /^(software|app|business|generic)$/.test(cat) || /none\s*,/.test(cat)) {
    block("category_clean", `Normalized category is weak/malformed: "${gm.meta.normalizedCategory}".`);
  }
  // Generic CTA-by-kind logic.
  const primaryCta = (gm.category.ctaOptions[0] ?? "").toLowerCase();
  if (gm.category.categoryKind === "app") {
    if (SERVICE_CTA_PATTERNS.some((re) => re.test(primaryCta))) {
      block("cta_matches_kind", `App account uses a service CTA as primary: "${gm.category.ctaOptions[0]}".`);
    }
  }
  if (gm.category.categoryKind === "service" || gm.category.categoryKind === "professional") {
    if (/download (the )?app|try the app/.test(primaryCta)) {
      block("cta_matches_kind", `Service/professional account uses an app CTA as primary: "${gm.category.ctaOptions[0]}".`);
    }
  }

  // Metric-aware cadence: above-market accounts must not be told to post more.
  if (gm.marketComparison.cadenceVerdict === "refine") {
    const movesText = gm.fixes.map((f) => `${f.title} ${f.exactAction}`).join(" ").toLowerCase();
    if (/post more often|increase (your )?(posting )?volume|post more frequently/.test(movesText)) {
      block("metric_aware_cadence", "Account posts above market yet a top move recommends increasing volume.");
    }
  }

  // Malformed tokens — scan EVERYTHING including fenced code, because the
  // copy-ready AI prompt blocks are client-facing text. A poisoned token there
  // (e.g. an audience string containing "none,software") is a real failure.
  for (const { re, label } of MALFORMED_PATTERNS) {
    if (re.test(markdown)) block("no_malformed_tokens", `Markdown contains "${label}".`);
  }

  // Required headers.
  for (const hdr of REQUIRED_HEADERS) {
    if (!markdown.includes(hdr)) block("required_headers", `Missing required section header: "${hdr}".`);
  }
  const majorSections = (markdown.match(/^##\s+\d+\./gm) ?? []).length;
  if (majorSections < 20) warn("min_sections", `Only ${majorSections} numbered sections (expected ≥ 20).`);

  // Known-invalid handles must not appear in client-facing sections (board/cards).
  const invalid = (config.knownInvalidHandles ?? []).map((h) => h.toLowerCase());
  for (const card of gm.competitors) {
    if (invalid.includes(card.handle.toLowerCase())) {
      block("no_invalid_competitors", `Known-invalid handle @${card.handle} appears in the client-facing board.`);
    }
  }

  // "hire a <category>" phrasing (treating an app/product like a person).
  if (new RegExp(`hire a ${gm.meta.normalizedCategory}`, "i").test(markdown)) {
    block("no_hire_a_category", `Markdown says "hire a ${gm.meta.normalizedCategory}".`);
  }

  // Selected competitors must carry a reason code (auditability).
  const selectedCodes = new Set(gm.competitorDebug.selected.map((s) => s.handle.toLowerCase()));
  for (const card of gm.competitors) {
    if (!selectedCodes.has(card.handle.toLowerCase())) {
      warn("selected_has_reason_code", `Selected @${card.handle} has no matching decision/reason code in debug.`);
    }
  }
  // Weak-relevance selected competitors → warning (confidence stays honest).
  for (const s of gm.competitorDebug.selected) {
    if (s.confidenceScore < 25) warn("selected_relevance_threshold", `Selected @${s.handle} has low relevance confidence (${s.confidenceScore}).`);
  }

  // Hashtag sanity.
  for (const g of gm.hashtags) {
    for (const tag of g.tags) {
      if (/nonesoftware/i.test(tag) || tag.length > 30) {
        warn("hashtag_realistic", `Unrealistic/malformed hashtag: #${tag}`);
      }
    }
  }

  const blockingCount = issues.filter((i) => i.severity === "blocking").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  return { passed: blockingCount === 0, blockingCount, warningCount, issues };
}

/** Required artifact files in the intelligence output directory. */
export const REQUIRED_ARTIFACTS = [
  "gold-master.json",
  "gold-master.md",
  "validation-report.md",
  "competitor-debug.md",
  "llm-run-log.json",
];

export function renderValidationReport(summary: ValidationSummary, auditId: number): string {
  const lines: string[] = [];
  lines.push(`# Validation Report — audit ${auditId}`);
  lines.push("");
  lines.push(`**Result:** ${summary.passed ? "PASSED ✅" : "FAILED ❌"}`);
  lines.push(`**Blocking:** ${summary.blockingCount} · **Warnings:** ${summary.warningCount}`);
  lines.push("");
  if (summary.issues.length === 0) {
    lines.push("_No issues found._");
  } else {
    for (const i of summary.issues) {
      lines.push(`- ${i.severity === "blocking" ? "🛑" : "⚠️"} **[${i.rule}]** ${i.detail}`);
    }
  }
  return lines.join("\n");
}
