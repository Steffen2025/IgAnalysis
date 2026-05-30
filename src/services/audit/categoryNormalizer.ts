/**
 * Category normalization — the trust spine of the whole report.
 *
 * Instagram's `category` field is unreliable: it often arrives as `"None"`,
 * `"None,Software"`, comma-joined fragments, or empty. If that raw value is
 * trusted, it poisons everything downstream — competitor discovery queries
 * (`"None,Software Toronto instagram"`), hashtags (`#TorontoNoneSoftware`),
 * and client-facing copy (`"Before you hire a none,software"`).
 *
 * This module is the single place that decides what a business *is*. It:
 *   1. Rejects garbage raw categories.
 *   2. Infers a clean category from bio / name / handle / website text.
 *   3. Returns a readable, human label plus a coarse `kind` used for
 *      CTA selection and copy tone.
 *
 * Every consumer (inference, report context, discovery) should route the raw
 * value + available profile text through {@link normalizeCategory} rather than
 * reading `audit.business_category` directly.
 */

export type CategoryKind = "app" | "service" | "professional" | "retail" | "creator" | "generic";

export interface CategorySignals {
  rawCategory?: string | null;
  bio?: string | null;
  fullName?: string | null;
  handle?: string | null;
  website?: string | null;
}

export interface NormalizedCategory {
  /** Human, client-facing label, e.g. "Moving & home inventory app". */
  label: string;
  /** Coarse bucket that drives CTA + copy decisions. */
  kind: CategoryKind;
  /** Where the label came from — useful for debug/telemetry. */
  source: "raw" | "inferred" | "fallback";
  /** True when discovery should look for apps/reference models, not local services. */
  isApp: boolean;
}

interface CategoryRule {
  label: string;
  kind: CategoryKind;
  isApp: boolean;
  /** Lowercased substrings; any match selects this rule. Order = priority. */
  terms: string[];
}

/**
 * Ordered most-specific → most-generic. The first rule whose term appears in
 * the combined profile text wins.
 */
const CATEGORY_RULES: CategoryRule[] = [
  // --- Consumer apps (BoxBuddy lives here) ---
  {
    label: "Moving & home inventory app",
    kind: "app",
    isApp: true,
    terms: [
      "moving app",
      "moving checklist",
      "moving box",
      "box inventory",
      "home inventory",
      "track every box",
      "smart moving",
      "packing app",
      "move planner",
      "moving planner",
    ],
  },
  {
    label: "Home organization app",
    kind: "app",
    isApp: true,
    terms: ["home organization", "decluttering app", "organizing app", "storage solutions"],
  },
  {
    label: "Consumer mobile app",
    kind: "app",
    isApp: true,
    terms: ["download on the app store", "google play", "get the app", "available on ios", "in-app", "app download", "our app"],
  },
  {
    label: "Software / SaaS product",
    kind: "app",
    isApp: true,
    terms: ["saas", "platform for", "software for", "cloud software", "web app", "dashboard for"],
  },
  // --- Local service businesses ---
  { label: "Moving company", kind: "service", isApp: false, terms: ["moving company", "movers", "removalist", "we move", "local movers"] },
  { label: "Storage facility", kind: "service", isApp: false, terms: ["self storage", "storage units", "storage facility"] },
  { label: "Mortgage broker", kind: "professional", isApp: false, terms: ["mortgage", "home loan", "refinance", "pre-approval", "pre approval"] },
  { label: "Real estate agent", kind: "professional", isApp: false, terms: ["real estate", "realtor", "homes for sale", "listing agent"] },
  { label: "Restaurant", kind: "retail", isApp: false, terms: ["restaurant", "eatery", "pizzeria", "cafe", "coffee shop", "bakery", "food truck"] },
  { label: "Fitness studio", kind: "service", isApp: false, terms: ["fitness", "gym", "pilates", "yoga studio", "personal trainer"] },
  { label: "Med spa", kind: "service", isApp: false, terms: ["med spa", "medical spa", "botox", "skincare clinic", "laser clinic"] },
  { label: "Dental clinic", kind: "professional", isApp: false, terms: ["dentist", "dental", "orthodontic", "smile clinic"] },
  { label: "Marketing agency", kind: "service", isApp: false, terms: ["marketing agency", "social media agency", "branding agency", "seo agency"] },
  { label: "Garage door company", kind: "service", isApp: false, terms: ["garage door", "overhead door", "garage doors"] },
  { label: "Home services", kind: "service", isApp: false, terms: ["contractor", "plumbing", "roofing", "hvac", "landscaping", "cleaning service", "handyman", "renovation"] },
];

/** Generic single-word tokens that never constitute a real category. */
const GARBAGE_TOKENS = new Set([
  "none",
  "null",
  "undefined",
  "nan",
  "n/a",
  "na",
  "other",
  "software", // alone, IG's catch-all — meaningless without context
  "app",
  "business",
  "company",
  "personal",
  "brand",
  "product/service",
  "entrepreneur",
]);

/**
 * True when a raw category string carries no usable meaning — empty, a known
 * junk token, or a comma/slash-joined blob of junk tokens (e.g. "None,Software").
 */
export function isGarbageCategory(raw: string | null | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return true;
  if (GARBAGE_TOKENS.has(v)) return true;
  // Split comma/slash/pipe-joined values; junk if every part is a junk token.
  const parts = v.split(/[,/|]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1 && parts.every((p) => GARBAGE_TOKENS.has(p))) return true;
  return false;
}

/** Infer a category label purely from free text (bio/name/handle/website). */
export function inferCategoryFromText(text: string | null | undefined): CategoryRule | null {
  const haystack = (text ?? "").toLowerCase();
  if (!haystack.trim()) return null;
  return CATEGORY_RULES.find((rule) => rule.terms.some((term) => haystack.includes(term))) ?? null;
}

function titleCaseLabel(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function ruleForLabel(label: string): CategoryRule | undefined {
  const lower = label.toLowerCase();
  return CATEGORY_RULES.find((r) => r.label.toLowerCase() === lower);
}

/**
 * Resolve the best clean category from all available signals.
 *
 * Priority:
 *   1. A non-garbage raw category (light cleanup, kept as-is).
 *   2. Keyword inference from bio / name / handle / website.
 *   3. A safe, readable fallback ("Local business" or "Consumer app").
 */
export function normalizeCategory(signals: CategorySignals): NormalizedCategory {
  const raw = (signals.rawCategory ?? "").trim();

  // 1) Trust a clean raw value.
  if (raw && !isGarbageCategory(raw)) {
    const label = titleCaseLabel(raw.replace(/[,/|]+/g, " / "));
    const matched = inferCategoryFromText(label);
    return {
      label,
      kind: matched?.kind ?? "generic",
      isApp: matched?.isApp ?? false,
      source: "raw",
    };
  }

  // 2) Infer from profile text.
  const text = [signals.bio, signals.fullName, signals.handle, signals.website]
    .filter(Boolean)
    .join(" ");
  const inferred = inferCategoryFromText(text);
  if (inferred) {
    return { label: inferred.label, kind: inferred.kind, isApp: inferred.isApp, source: "inferred" };
  }

  // 3) Fallback — never emit "none". If the raw hinted at software/app, prefer app.
  const rawLower = raw.toLowerCase();
  if (/soft|app|tech|digital/.test(rawLower) || /soft|app|tech|digital/.test(text.toLowerCase())) {
    return { label: "Consumer app", kind: "app", isApp: true, source: "fallback" };
  }
  return { label: "Local business", kind: "generic", isApp: false, source: "fallback" };
}

/** Convenience: just the clean label string. */
export function cleanCategoryLabel(signals: CategorySignals): string {
  return normalizeCategory(signals).label;
}

export { CATEGORY_RULES, ruleForLabel };
