/**
 * Lightweight fixture tests for the intelligence engine (no DB, no network).
 * Run: npx tsx src/scripts/intelligenceTests.ts
 *
 * Covers the generic, deterministic guarantees: category normalization across
 * business types, CTA-by-kind, competitor relevance/rejection, forbidden-token
 * detection, and fail-closed validation.
 */
import assert from "node:assert";
import { normalizeCategory } from "../services/audit/categoryNormalizer.js";
import { ctaForKind } from "../services/audit/categoryCopy.js";
import { scoreCandidate, type RelevanceContext } from "../services/instagram-intelligence/competitorRelevance.js";
import { validateGoldMaster } from "../services/instagram-intelligence/validateGoldMaster.js";
import { getClientConfig } from "../services/instagram-intelligence/clientConfig.js";
import type { ReportCompetitor } from "../services/report/reportDataAssembler.js";
import type { GoldMasterIntelligence } from "../services/instagram-intelligence/goldMasterSchema.js";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n      ${(err as Error).message}`);
  }
}

// ── Category normalization across business types ──
test("BoxBuddy bio → app", () => {
  const r = normalizeCategory({ rawCategory: "None,Software", bio: "Your Smart Moving App — track every box", handle: "boxbuddyapp" });
  assert.equal(r.kind, "app");
  assert.ok(!/none/i.test(r.label), "label must not contain none");
});
test("garage door → service", () => {
  const r = normalizeCategory({ businessType: undefined, rawCategory: "garage door company", handle: "activedoor" } as never);
  assert.equal(r.kind, "service");
});
test("mortgage → professional", () => {
  const r = normalizeCategory({ rawCategory: "Mortgage broker", handle: "jelinekmortgages" });
  assert.equal(r.kind, "professional");
});
test("garbage raw never yields 'none'", () => {
  const r = normalizeCategory({ rawCategory: "None", bio: null, handle: "x" });
  assert.ok(!/^none$/i.test(r.label));
});

// ── CTA by kind ──
test("app CTA is download, not book-a-call", () => {
  const cta = ctaForKind("app");
  assert.match(cta.primary.toLowerCase(), /download/);
  assert.doesNotMatch(cta.primary.toLowerCase(), /book a call/);
});
test("service CTA is book/quote", () => {
  const cta = ctaForKind("service");
  assert.match(cta.primary.toLowerCase(), /book|quote/);
});
test("professional CTA is book a call", () => {
  const cta = ctaForKind("professional");
  assert.match(cta.primary.toLowerCase(), /call/);
});

// ── Competitor relevance ──
const relCtx: RelevanceContext = {
  categoryLabel: "moving and home inventory app", categoryKind: "app", city: "toronto",
  vocabulary: ["moving", "packing", "storage", "home", "box", "inventory"],
  config: getClientConfig("boxbuddyapp"),
};
function comp(partial: Partial<ReportCompetitor>): ReportCompetitor {
  return {
    id: 1, username: "x", full_name: null, competitor_type: "local_intel", geographic_market: "Toronto, ON",
    confidence_score: 0, deep_scraped: false, follower_count: 1000, post_count: 50, bio: null, category: null,
    profile_pic_url: null, latest_post: null, top_posts: [], ...partial,
  } as ReportCompetitor;
}
test("known-invalid handle rejected", () => {
  const d = scoreCandidate(comp({ username: "none_tattooer" }), relCtx, "local");
  assert.equal(d.code, "rejected_known_invalid");
});
test("musician rejected by industry", () => {
  const d = scoreCandidate(comp({ username: "somedj", bio: "musician and dj" }), relCtx, "local");
  assert.equal(d.code, "rejected_category_mismatch");
});
test("relevant moving account selected", () => {
  const d = scoreCandidate(comp({ username: "torontomovers", bio: "professional moving and packing in Toronto", latest_post: { posted_at: new Date().toISOString(), post_type: "reel", caption: "pack tips", hook: null, display_url: null, post_url: null } }), relCtx, "local");
  assert.ok(d.code.startsWith("selected"), `expected selected, got ${d.code}`);
});
test("high-follower wrong-industry rejected", () => {
  const d = scoreCandidate(comp({ username: "bigbrand", bio: "fashion label", follower_count: 500000 }), relCtx, "local");
  assert.equal(d.code, "rejected_random_high_follower_account");
});

// ── Validation fail-closed ──
function minimalGm(overrides: Partial<GoldMasterIntelligence>): GoldMasterIntelligence {
  const base = {
    fixes: Array(5).fill({ title: "x", impact: "high", effort: "low", scoreArea: "a", whyItMatters: "b", exactAction: "c", timeRequired: "1m", expectedLift: "+1", evidence: "e" }),
    nextSevenDays: Array(7).fill({ day: 1, objective: "o", action: "a", timeEstimate: "15m", exactInstruction: "i", outputByEndOfDay: "o", whyItMatters: "w" }),
    sprint: Array(4).fill({ week: 1, goal: "g", actions: ["a"], output: "o", measure: "m" }),
    measurement: Array(3).fill({ dayMark: 7, measure: "m", goodSign: "g", adjustIf: "a" }),
    quickActions: Array(10).fill({ when: "today", action: "a" }),
    aiPrompts: Array(6).fill({ label: "l", prompt: "p" }),
    hashtags: Array(6).fill({ group: "local", tags: ["x"] }),
    scores: Array(6).fill({ dimension: "d", score: 50, whatWeSaw: "w", whyItMatters: "y", nextMove: "n" }),
    evidence: [{ id: "e1", sourceType: "score", label: "l", value: 1, confidence: 90 }],
    sectionConfidence: [{ sectionId: "s", score: 80, level: "medium", reasons: [], sourceCoverage: [], dataGaps: [] }],
    marketPatterns: { postsStudied: 10, avgCaptionChars: 100, avgHashtags: 5, avgEmojis: 1, topFormats: [], hookDistribution: [], contentElementDistribution: [] },
    marketComparison: { rows: [], activityLevel: "ok", interpretation: "x", cadenceVerdict: "maintain" },
    meta: { normalizedCategory: "moving app", categoryKind: "app" },
    category: { normalizedCategory: "moving app", categoryKind: "app", confidence: 80, source: "raw", whatItSells: "", likelyAudience: "", contentThatWorks: "", ctaType: "download", ctaOptions: ["Download the app"] },
    competitors: [],
    competitorDebug: { searchTermsUsed: [], candidatesFound: 0, selected: [], rejected: [], emptyReason: "search_problem", recommendedSearchTerms: [] },
    overallConfidence: 70,
  } as unknown as GoldMasterIntelligence;
  return { ...base, ...overrides };
}
const fullMd = ["0. Report Metadata", "1. Executive Snapshot", "2. Account Profile Snapshot", "3. Category Diagnosis", "4. Score Breakdown", "5. Required Fixes", "6. Next Seven Days", "7. 30-Day Sprint", "8. Market Comparison", "9. Market Pattern Dashboard", "10. Competitor Discovery Debug", "11. Competitor Relevance Board", "12. Observed Competitor Posts", "13. Content Mechanics", "14. Local / Category Visibility Strategy", "15. Hashtag Strategy", "16. Posting Toolkit", "17. Copy-Ready AI Prompts", "18. Content You Can Create Immediately", "19. 10 Quick Actions", "20. Measurement Plan", "21. Day 30 Review", "22. Data Gaps and Confidence", "23. Source Evidence Index", "24. Validation Summary"].map((h) => `## ${h}`).join("\n\n");

test("forbidden token fails validation", () => {
  const v = validateGoldMaster(minimalGm({}), fullMd + "\n\nsomething none,software here", getClientConfig("boxbuddyapp"));
  assert.equal(v.passed, false);
  assert.ok(v.issues.some((i) => i.rule === "no_malformed_tokens"));
});
test("Slot placeholder fails validation", () => {
  const v = validateGoldMaster(minimalGm({}), fullMd + "\n\nSlot 1", getClientConfig("boxbuddyapp"));
  assert.equal(v.passed, false);
});
test("too few moves fails closed", () => {
  const v = validateGoldMaster(minimalGm({ fixes: [] as never }), fullMd, getClientConfig("boxbuddyapp"));
  assert.equal(v.passed, false);
  assert.ok(v.issues.some((i) => i.rule === "five_moves_count"));
});
test("clean minimal report passes", () => {
  const v = validateGoldMaster(minimalGm({}), fullMd, getClientConfig("boxbuddyapp"));
  assert.equal(v.passed, true, "issues: " + JSON.stringify(v.issues));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed > 0 ? 1 : 0;
