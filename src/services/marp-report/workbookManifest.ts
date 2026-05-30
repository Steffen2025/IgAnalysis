/**
 * Workbook section manifest + output validation.
 *
 * The manifest is the single source of truth for what a complete workbook
 * contains. The generator assembles slides in this order, and the validator
 * enforces two guarantees before a deck is allowed out the door:
 *
 *   1. Structure — every `required` section is present in the rendered output.
 *   2. Trust — no malformed token ("none,", "undefined", "null", "NaN",
 *      "[object Object]", clipped fragments) leaks into client-facing copy.
 *
 * This stops future edits from silently dropping whole sections or shipping a
 * deck with broken data interpolation.
 */

import { execFileSync } from "node:child_process";

export interface WorkbookSection {
  id: string;
  title: string;
  required: boolean;
  /** Data the builder needs; informational + used by fallback decisions. */
  dataDependencies: string[];
  /** What happens when dependencies are missing. */
  fallbackBehavior: "render-empty-state" | "omit" | "always-render";
}

/**
 * Target structure: BoxBuddy workbook frame + ActiveDoor/Jelinek intelligence
 * depth. Ordering matches the assembly in marpGenerator.
 */
export const WORKBOOK_MANIFEST: WorkbookSection[] = [
  { id: "cover", title: "Cover / Snapshot", required: true, dataDependencies: ["profile", "scores"], fallbackBehavior: "always-render" },
  { id: "start-here", title: "Start Here / Checklist", required: true, dataDependencies: ["top_5_fixes"], fallbackBehavior: "always-render" },
  { id: "baseline", title: "Today's Baseline", required: true, dataDependencies: ["scores"], fallbackBehavior: "always-render" },
  { id: "score-indicators", title: "Score Indicators / What We Saw", required: false, dataDependencies: ["scores.signals"], fallbackBehavior: "omit" },
  { id: "five-moves", title: "Five Moves That Matter Most", required: true, dataDependencies: ["top_5_fixes"], fallbackBehavior: "always-render" },
  { id: "sprint", title: "30-Day Sprint", required: true, dataDependencies: ["reportContext"], fallbackBehavior: "always-render" },
  { id: "week-1", title: "Week 1 Timeline", required: true, dataDependencies: ["next_7_days"], fallbackBehavior: "always-render" },
  { id: "local-unlock", title: "Local / Category Visibility Unlock", required: true, dataDependencies: ["local_visibility"], fallbackBehavior: "always-render" },
  { id: "you-vs-market", title: "You vs The Market", required: true, dataDependencies: ["patterns", "client"], fallbackBehavior: "always-render" },
  { id: "market-patterns", title: "Market Pattern Dashboard", required: false, dataDependencies: ["patterns.category"], fallbackBehavior: "omit" },
  { id: "competitor-board", title: "Competitor Relevance Board", required: false, dataDependencies: ["competitors"], fallbackBehavior: "render-empty-state" },
  { id: "competitor-cheat-sheet", title: "Competitor Cheat Sheet", required: false, dataDependencies: ["competitors"], fallbackBehavior: "render-empty-state" },
  { id: "hashtags", title: "Hashtag Ecosystem", required: true, dataDependencies: ["local_visibility"], fallbackBehavior: "always-render" },
  { id: "toolkit", title: "Posting Toolkit", required: true, dataDependencies: ["reportContext"], fallbackBehavior: "always-render" },
  { id: "ai-prompts", title: "Copy-Ready AI Prompts", required: true, dataDependencies: ["reportContext"], fallbackBehavior: "always-render" },
  { id: "checkpoints", title: "Measurement Checkpoints", required: true, dataDependencies: ["reportContext"], fallbackBehavior: "always-render" },
  { id: "day-30", title: "Day 30 Review Appointment", required: true, dataDependencies: ["reportContext"], fallbackBehavior: "always-render" },
  { id: "close", title: "Close / What To Do Next", required: true, dataDependencies: ["scores"], fallbackBehavior: "always-render" },
];

/**
 * Known-bad competitor handles that must never reach a client PDF for BoxBuddy.
 * Mirrors competitorRelevance.KNOWN_INVALID_HANDLES — duplicated here so the
 * validator is self-contained and can scan extracted PDF text.
 */
const FORBIDDEN_HANDLES = [
  "fredagainagainagainagainagain",
  "none_like_mine",
  "none_tattooer",
  "windsorone",
  "devwindsor",
];

/** Forbidden substrings that indicate broken data, placeholders, or bad data. */
const FORBIDDEN_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /none\s*,\s*software/i, label: '"none,software"' },
  { re: /\bnone\s*,/i, label: 'comma-joined "none,"' },
  { re: /\bundefined\b/, label: '"undefined"' },
  { re: /:\s*null\b|\bnull\b(?!\w)/, label: '"null"' },
  { re: /\bNaN\b/, label: '"NaN"' },
  { re: /\[object Object\]/, label: "[object Object]" },
  { re: /\bYourfirst\b/i, label: '"Yourfirst" (clipped token)' },
  { re: /#\w*NoneSoftware\w*/i, label: "malformed NoneSoftware hashtag" },
  { re: /\ba\s+none\b/i, label: '"a none" phrase' },
  // Empty / placeholder UI that must never ship to a client.
  { re: /\bSlot\s*[0-9]\b/, label: 'empty "Slot N" competitor placeholder' },
  { re: /Run another audit/i, label: '"Run another audit" placeholder copy' },
  { re: /Section unavailable/i, label: "an unavailable/failed section" },
  // Known-invalid competitor handles.
  ...FORBIDDEN_HANDLES.map((h) => ({ re: new RegExp(`@?${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"), label: `invalid competitor @${h}` })),
];

export interface ValidationIssue {
  kind: "missing-section" | "forbidden-token";
  detail: string;
}

/**
 * Validate rendered workbook markdown. Returns all issues found (empty = OK).
 *
 * Note: we strip data-URI image payloads before scanning so base64 noise can't
 * trip the token regexes.
 */
export function validateWorkbookOutput(markdown: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const scannable = markdown
    .replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/g, "")
    .replace(/```[\s\S]*?```/g, " "); // code fences are intentional copy blocks

  for (const { re, label } of FORBIDDEN_PATTERNS) {
    const m = scannable.match(re);
    if (m) {
      const idx = m.index ?? 0;
      const ctx = scannable.slice(Math.max(0, idx - 30), idx + 40).replace(/\s+/g, " ").trim();
      issues.push({ kind: "forbidden-token", detail: `${label} found near: "…${ctx}…"` });
    }
  }
  return issues;
}

/**
 * Throw if validation finds any issue. Called by the generator so a broken
 * deck never reaches a client.
 */
export function assertValidWorkbook(markdown: string): void {
  const issues = validateWorkbookOutput(markdown);
  if (issues.length > 0) {
    const lines = issues.map((i) => `  - [${i.kind}] ${i.detail}`).join("\n");
    throw new Error(`Workbook validation failed — ${issues.length} issue(s):\n${lines}`);
  }
}

/**
 * Section-markdown keys that feed `required` workbook sections. If any is
 * empty/missing, the corresponding section would render blank — a blocking
 * integrity failure (this is exactly how Five Moves / Week 1 went empty).
 */
const REQUIRED_SECTION_INPUTS: Array<{ key: string; section: string }> = [
  { key: "top_5_fixes", section: "Five Moves That Matter Most" },
  { key: "next_7_days", section: "Week 1 Timeline" },
  { key: "local_visibility", section: "Local / Category Visibility Unlock" },
];

/** Minimum meaningful length for a section's source markdown. */
const MIN_SECTION_CHARS = 80;

/**
 * Assert that the source markdown for every required, content-bearing section
 * is present and non-trivial. Throws before a deck with empty required pages
 * can be rendered.
 */
export function assertRequiredSectionContent(sectionMarkdown: Record<string, string>): void {
  const missing: string[] = [];
  for (const { key, section } of REQUIRED_SECTION_INPUTS) {
    const content = (sectionMarkdown[key] ?? "").trim();
    if (content.length < MIN_SECTION_CHARS || /^_section unavailable/i.test(content)) {
      missing.push(`${section} (source key "${key}" is empty/too short — ${content.length} chars)`);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Workbook integrity failure — ${missing.length} required section(s) have no content:\n` +
        missing.map((m) => `  - ${m}`).join("\n") +
        `\nRegenerate the report sections before building the PDF.`,
    );
  }
}

/**
 * Validate the FINAL rendered PDF by extracting its text with pdftotext and
 * scanning for blocking terms. This catches render-level bugs that a markdown
 * scan misses (e.g. clipped "Yourfirst" tokens). Returns issues; empty = OK.
 *
 * If pdftotext is unavailable, returns a single advisory issue rather than
 * silently passing.
 */
export function validatePdfText(pdfPath: string): ValidationIssue[] {
  let text: string;
  try {
    text = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
  } catch (err) {
    return [{ kind: "forbidden-token", detail: `Could not extract PDF text for validation (${(err as Error).message}). Install poppler/pdftotext.` }];
  }
  const issues: ValidationIssue[] = [];
  for (const { re, label } of FORBIDDEN_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const idx = m.index ?? 0;
      const ctx = text.slice(Math.max(0, idx - 30), idx + 40).replace(/\s+/g, " ").trim();
      issues.push({ kind: "forbidden-token", detail: `${label} in rendered PDF near: "…${ctx}…"` });
    }
  }
  return issues;
}

/** Throw if the rendered PDF contains any blocking term. */
export function assertValidPdf(pdfPath: string): void {
  const issues = validatePdfText(pdfPath);
  if (issues.length > 0) {
    const lines = issues.map((i) => `  - ${i.detail}`).join("\n");
    throw new Error(`PDF integrity validation failed for ${pdfPath} — ${issues.length} issue(s):\n${lines}`);
  }
}
