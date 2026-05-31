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
import { scoreCandidate, evaluateCompetitors, type RelevanceContext } from "../services/instagram-intelligence/competitorRelevance.js";
import { generateHashtags } from "../services/instagram-intelligence/competitorDiscovery.js";
import { computeSectionConfidence } from "../services/instagram-intelligence/confidence.js";
import { renderDeliverable } from "../services/instagram-intelligence/deliverableMarkdown.js";
import { renderDeliverableHtml } from "../services/instagram-intelligence/deliverableHtml.js";
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
    meta: { auditId: 1, account: "Acme", handle: "acme", website: "https://x.co", rawCategory: "x", normalizedCategory: "moving app", categoryKind: "app", marketLabel: "Toronto, ON", city: "Toronto", region: "ON", generatedAt: "2026-05-31T00:00:00.000Z", reviewDate: "June 27, 2026", modelUsed: "openai/gpt-5.4-nano", promptVersion: "instagram-intelligence-v1.1.0", dataConfidence: 80 },
    category: { normalizedCategory: "moving app", categoryKind: "app", confidence: 80, source: "raw", whatItSells: "", likelyAudience: "", contentThatWorks: "", ctaType: "download", ctaOptions: ["Download the app"] },
    competitors: [],
    competitorDebug: { searchTermsUsed: [], candidatesFound: 0, selected: [], rejected: [], emptyReason: "search_problem", recommendedSearchTerms: [] },
    observedPosts: [],
    account: { displayName: "Acme", handle: "acme", bio: "We do x", rawCategory: "x", normalizedBusinessType: "moving app", website: "https://x.co", followerCount: 720, postCount: 94, postsPerWeek: 0.2333333333341111, profileGaps: ["Bio lacks CTA"], ctaStatus: "Present", localSignalStatus: "ok" },
    localSignal: { successStories: [], localHashtags: [], spotlightedAccounts: [], localWording: [], complementaryTerms: [], note: "" },
    contentMechanics: [],
    visibilityStrategy: [],
    toolkit: { hookFormulas: ["Hook A"], captionFormulas: ["Caption A"], ctaOptions: ["Book"], reelIdeas: [], carouselIdeas: [], proofIdeas: [] },
    immediateContent: { hooks: ["Hook 1"], captionTopics: [], carouselIdeas: [], reelIdeas: [], storyIdeas: [] },
    day30: { bringBack: ["insights"], whatWeCompare: ["scores"], whyMonthlyMatters: "Instagram shifts weekly.", nextRunCta: "Re-run." },
    dataGaps: [],
    validation: { passed: true, blockingCount: 0, warningCount: 0, issues: [] },
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

// ── Phase 1: hashtag generation (engagement-discovery lane) ──
test("hashtags: multi-word category → no bare single words, city tag, intent suffixes", () => {
  const tags = generateHashtags({ auditId: 1, handle: "x", businessType: "garage door company", normalizedCategory: "garage door company", categoryKind: "service", city: "Burlington" } as never);
  assert.ok(tags.includes("garagedoor"), `expected #garagedoor; got ${tags.join(",")}`);
  assert.ok(tags.some((t) => t.startsWith("garagedoor") && t !== "garagedoor"), "expected an intent-suffixed tag");
  assert.ok(tags.includes("burlingtongaragedoor"), "expected city-scoped tag");
  assert.ok(!tags.includes("garage") && !tags.includes("door"), "bare single core words must be dropped for multi-word categories");
});
test("hashtags: single-word category keeps the bare word", () => {
  const tags = generateHashtags({ auditId: 1, handle: "x", businessType: "bakery", normalizedCategory: "bakery", categoryKind: "retail", city: "" } as never);
  assert.ok(tags.includes("bakery"), `expected #bakery; got ${tags.join(",")}`);
});

// ── Report alignment: trusted live-discovery passthrough ──
const fresh = () => ({ posted_at: new Date().toISOString(), post_type: "reel" as const, caption: "x", hook: null, display_url: null, post_url: null });
test("trusted reference believed despite no keyword or band fit", () => {
  const r = comp({ username: "refacct", source: "reference_search", competitor_type: "reference_model", confidence_score: 74, bio: "zzz unrelated text", follower_count: 15000, latest_post: fresh() });
  const { cards } = evaluateCompetitors([r], relCtx, [], 6);
  assert.equal(cards.length, 1, "trusted reference must be selected");
  assert.equal(cards[0].type, "reference");
});
test("legacy/unvetted rows excluded when trusted rows present", () => {
  const trusted = comp({ username: "good", source: "hashtag_discovery", competitor_type: "local_intel", confidence_score: 60, bio: "moving and packing", latest_post: fresh() });
  const legacy = comp({ id: 99, username: "oldrow", source: "google_maps", competitor_type: "local_intel", confidence_score: 100, bio: "moving" });
  const { cards } = evaluateCompetitors([trusted, legacy], relCtx, [], 6);
  assert.ok(cards.some((c) => c.handle === "good"), "trusted row kept");
  assert.ok(!cards.some((c) => c.handle === "oldrow"), "legacy row excluded");
});
test("trusted rows ranked by persisted success score", () => {
  const lo = comp({ id: 1, username: "low", source: "hashtag_discovery", competitor_type: "local_intel", confidence_score: 30, bio: "moving", latest_post: fresh() });
  const hi = comp({ id: 2, username: "high", source: "hashtag_discovery", competitor_type: "local_intel", confidence_score: 95, bio: "moving", latest_post: fresh() });
  const { cards } = evaluateCompetitors([lo, hi], relCtx, [], 6);
  assert.equal(cards[0].handle, "high", "highest success score ranks first");
});
test("reference models are not buried under locals", () => {
  const refs = [comp({ id: 1, username: "r1", source: "reference_search", competitor_type: "reference_model", confidence_score: 50, bio: "home", latest_post: fresh() })];
  const locals = Array.from({ length: 6 }).map((_, i) => comp({ id: i + 10, username: `l${i}`, source: "hashtag_discovery", competitor_type: "local_intel", confidence_score: 90 - i, bio: "moving", latest_post: fresh() }));
  const { cards } = evaluateCompetitors([...locals, ...refs], relCtx, [], 4);
  assert.ok(cards.some((c) => c.type === "reference"), "a reference must survive the card cap");
});

test("adjacent-industry reference is labeled in the card", () => {
  const r = comp({ username: "adjacentbrand", source: "reference_search", competitor_type: "reference_model", confidence_score: 60, discovery_keyword: "adjacent:home services", bio: "home services brand", follower_count: 30000, latest_post: fresh() });
  const { cards } = evaluateCompetitors([r], relCtx, [], 6);
  assert.equal(cards.length, 1);
  assert.match(cards[0].whySelected.toLowerCase(), /adjacent industry \(home services\)/);
});

// ── Data-quality competitor confidence ──
function card(type: "reference" | "local") {
  return { handle: "h", displayName: "h", type, followers: 1000, posts: 50, profileImageAvailable: true, latestPostAvailable: true, latestPostDate: null, activityStatus: "active", latestPostType: "reel", latestPostHook: null, whySelected: "x", borrow: "b", avoid: "a" } as never;
}
const compConf = (gm: GoldMasterIntelligence) => computeSectionConfidence(gm, gm.evidence).find((s) => s.sectionId === "competitors")!;
test("competitor confidence is higher when reference models are present", () => {
  const withRefs = compConf(minimalGm({ competitors: [card("reference"), card("reference"), card("local")] }));
  const noRefs = compConf(minimalGm({ competitors: [card("local"), card("local"), card("local")] }));
  assert.ok(withRefs.score > noRefs.score, `expected refs(${withRefs.score}) > none(${noRefs.score})`);
});
test("thin niche (no reference models) names the gap honestly", () => {
  const s = compConf(minimalGm({ competitors: [card("local")] }));
  assert.ok(s.dataGaps.some((g) => /reference models/i.test(g)), `expected a reference-models gap; got ${JSON.stringify(s.dataGaps)}`);
});
test("zero competitors → low confidence", () => {
  const s = compConf(minimalGm({ competitors: [] }));
  assert.ok(s.score < 50, `expected low score; got ${s.score}`);
});

// ── Client-facing deliverable renderer ──
test("deliverable renders the field-guide sections in order", () => {
  const md = renderDeliverable(minimalGm({}));
  for (const h of ["# Instagram Growth Intelligence Report", "## How to Use This Guide", "## The Short Version", "## Where You Stand Today", "## What the Numbers Mean", "## The Growth Diagnosis", "## The Five Moves That Matter Most", "## Your First 7 Days", "## Days 8–14", "## Your 30-Day Content Calendar", "## Your Next Checkpoint", "## Appendix"]) {
    assert.ok(md.includes(h), `missing section: ${h}`);
  }
});
test("deliverable rounds posts/week and hides raw internals", () => {
  const md = renderDeliverable(minimalGm({}));
  assert.doesNotMatch(md, /0\.2333333/, "posts/week must be rounded");
  assert.ok(!md.includes("selected_reference_model"), "raw reason codes must not leak into the client report");
});

test("html deliverable is a self-contained styled document", () => {
  const html = renderDeliverableHtml(minimalGm({}));
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.includes('<header class="cover">'), "branded cover present");
  assert.ok(html.includes("<style>"), "embedded CSS present");
  assert.doesNotMatch(html, /[█░]/, "raw monospace bars must be converted to HTML meters");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed > 0 ? 1 : 0;
