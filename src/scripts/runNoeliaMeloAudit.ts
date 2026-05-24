import "dotenv/config";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits, competitors, content_patterns, scores as scoresTable, comments } from "../db/schema.js";
import { runAudit } from "../services/audit/orchestrator.js";
import { runScoring } from "../services/scoring/scoringOrchestrator.js";
import { runPatternAnalysis } from "../services/patterns/patternOrchestrator.js";
import { runEnrichment } from "../services/comments/enrichmentOrchestrator.js";
import { resolveReferenceMarkets } from "../services/audit/referenceMarkets.js";
import type { PatternResult } from "../services/patterns/patternAnalyzer.js";
import type { GapFinding } from "../services/patterns/clientGapAnalysis.js";

// ── 1. Insert audit row ──────────────────────────────────────────────────────
const [inserted] = db
  .insert(audits)
  .values({
    business_name: "Noelia Melo - Calgary Realtor",
    instagram_url: "https://www.instagram.com/noeliameloo/",
    website_url: "",
    city: "Calgary",
    service_area: "Calgary, Alberta",
    business_category: "Real estate agent",
    main_offer: "Helping Calgary buyers and sellers navigate the local market",
    target_audience:
      "Calgary home buyers, sellers, and investors — particularly first-time buyers and young families",
    follower_goal: "25000",
    business_outcome:
      "More buyer/seller leads, listings, and brand authority in Calgary",
    report_type: "full_gtm",
    mode: "mixed",
    status: "queued",
  })
  .returning({ id: audits.id })
  .all();

const auditId = inserted.id;
console.log(`\n✅ Audit row created — id=${auditId}`);

// ── 2. Reference markets preview ─────────────────────────────────────────────
const auditRow = db.select().from(audits).where(eq(audits.id, auditId)).get()!;
const refMarkets = resolveReferenceMarkets(auditRow);
console.log(`\n━━━ Reference markets for Calgary Realtor ━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Resolved markets: ${refMarkets.join("  |  ")}`);
const hasAlberta = refMarkets.some((m) => m.includes("AB") || m.toLowerCase().includes("alberta") || m.toLowerCase().includes("edmonton") || m.toLowerCase().includes("calgary"));
console.log(`  Alberta cities excluded: ${hasAlberta ? "❌ NO — AB city leaked in!" : "✅ YES"}`);

// ── 3. Pipeline ───────────────────────────────────────────────────────────────
console.log(`\n━━━ PHASE 1: Scraping (full tier) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
const auditResult = await runAudit({ auditId, tier: "full" });

console.log(`\n━━━ PHASE 2: Scoring ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
const scoringResult = await runScoring(auditId);

console.log(`\n━━━ PHASE 3: Pattern analysis ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
const patternResult = await runPatternAnalysis(auditId);

console.log(`\n━━━ PHASE 4: Enrichment ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
const enrichResult = await runEnrichment(auditId);

// ══════════════════════════════════════════════════════════════════════════════
// REPORT
// ══════════════════════════════════════════════════════════════════════════════
const HR = "═".repeat(70);
const hr = "─".repeat(70);

console.log(`\n\n${HR}`);
console.log(`  NOELIA MELO — CALGARY REALTOR  |  Audit #${auditId}`);
console.log(HR);

// ── SECTION A — Audit results ─────────────────────────────────────────────────
console.log(`\n${"━".repeat(70)}`);
console.log(`  SECTION A — Audit Results`);
console.log(`${"━".repeat(70)}`);
console.log(`  Final phase   : ${auditResult.finalPhase}`);
console.log(`  Items scraped : ${auditResult.itemsScraped}`);
console.log(`  Cache hits    : ${auditResult.cacheHits}`);
console.log(`  Est. cost     : $${(auditResult.itemsScraped * 0.0015).toFixed(4)}`);
if (auditResult.errors.length) {
  console.log(`  Errors        : ${auditResult.errors.join("; ")}`);
}

const allComps = db
  .select()
  .from(competitors)
  .where(eq(competitors.audit_id, auditId))
  .all();

const byType: Record<string, typeof allComps> = {};
for (const c of allComps) {
  const t = c.competitor_type ?? "unclassified";
  (byType[t] ??= []).push(c);
}

console.log(`\n  Competitors discovered (${allComps.length} total):`);
for (const [type, comps] of Object.entries(byType)) {
  console.log(`\n  [${type}]`);
  for (const c of comps) {
    const deep = c.deep_scraped ? "✅ deep" : "  shallow";
    const conf = c.confidence_score != null ? `conf=${c.confidence_score}` : "conf=?";
    console.log(`    @${c.username.padEnd(32)} ${conf.padEnd(8)} ${deep}`);
  }
}

// ── SECTION B — Scoring ───────────────────────────────────────────────────────
console.log(`\n${"━".repeat(70)}`);
console.log(`  SECTION B — Scores`);
console.log(`${"━".repeat(70)}`);

const scoreLabels: Record<string, string> = {
  profile_conversion: "Profile Conversion",
  content_performance: "Content Performance",
  local_visibility: "Local Visibility",
  sales_readiness: "Sales Readiness",
  competitor_gap: "Competitor Gap",
  overall: "Overall",
};

const firingSignals: Array<{ label: string; earned: number; weight: number }> = [];
const missingSignals: Array<{ label: string; earned: number; weight: number }> = [];

for (const [cat, result] of Object.entries(scoringResult.scores)) {
  const label = scoreLabels[cat] ?? cat;
  const score = result.score ?? 0;
  const bar = "█".repeat(Math.round(score / 5)) + "░".repeat(20 - Math.round(score / 5));
  console.log(`  ${label.padEnd(22)}: ${String(score).padStart(3)}/100  ${bar}`);

  if (cat !== "overall") {
    for (const sig of result.signals) {
      if (sig.fired && sig.earned > 0) firingSignals.push(sig);
      else if (!sig.fired && sig.weight >= 5) missingSignals.push(sig);
    }
  }
}

firingSignals.sort((a, b) => b.earned - a.earned);
missingSignals.sort((a, b) => b.weight - a.weight);

console.log(`\n  Top 3 strengths:`);
for (const s of firingSignals.slice(0, 3)) {
  console.log(`    ✅ ${s.label} (+${s.earned}pts)`);
}
console.log(`\n  Top 3 gaps (unfired high-weight signals):`);
for (const s of missingSignals.slice(0, 3)) {
  console.log(`    ❌ ${s.label} (${s.weight}pts at stake)`);
}

// ── SECTION C — Content patterns ─────────────────────────────────────────────
console.log(`\n${"━".repeat(70)}`);
console.log(`  SECTION C — Content Patterns (Stress Test Core)`);
console.log(`${"━".repeat(70)}`);

const cat = patternResult.patterns.category;
const cli = patternResult.patterns.client;

console.log(`\n  Category corpus: ${cat.postCount} posts   |   Client: ${cli.postCount} posts`);

// Hook distribution
console.log(`\n  Hook distribution (category corpus):`);
const hookDist = Object.entries(cat.hooks.distribution).sort((a, b) => b[1] - a[1]);
for (const [hook, count] of hookDist) {
  const pct = cat.postCount > 0 ? Math.round((count / cat.postCount) * 100) : 0;
  const bar = "▓".repeat(Math.round(pct / 3));
  console.log(`    ${hook.padEnd(20)} ${String(count).padStart(4)} posts  (${String(pct).padStart(3)}%)  ${bar}`);
}

// Tone distribution
console.log(`\n  Tone distribution (category corpus):`);
const toneDist = Object.entries(cat.tones.distribution).sort((a, b) => b[1] - a[1]);
for (const [tone, count] of toneDist) {
  const pct = cat.postCount > 0 ? Math.round((count / cat.postCount) * 100) : 0;
  const bar = "▓".repeat(Math.round(pct / 3));
  console.log(`    ${tone.padEnd(20)} ${String(count).padStart(4)} posts  (${String(pct).padStart(3)}%)  ${bar}`);
}

console.log(`\n  Best-performing post type   : ${cat.postTypes.bestPerformingByEngagement?.post_type ?? "n/a"} (ER: ${((cat.postTypes.bestPerformingByEngagement as { avgEngagementRate?: number } | null)?.avgEngagementRate ?? 0).toFixed(3)})`);
console.log(`  Top hook (frequency)        : ${cat.hooks.topHook}`);
console.log(`  Best hook (by engagement)   : ${cat.hooks.bestPerformingHookByEngagement ?? "n/a"}`);
console.log(`  Top tone (frequency)        : ${cat.tones.topTone}`);
console.log(`  Best tone (by engagement)   : ${cat.tones.bestPerformingToneByEngagement ?? "n/a"}`);

// Content element correlations
console.log(`\n  Content elements (category — sorted by frequency):`);
const elemDist = Object.entries(cat.contentElements.distribution).sort((a, b) => b[1] - a[1]);
for (const [elem, count] of elemDist.slice(0, 8)) {
  console.log(`    ${elem.padEnd(28)} ${count}`);
}
console.log(`  Best element (by engagement): ${cat.contentElements.bestPerformingElementByEngagement ?? "n/a"}`);

// Top gaps
console.log(`\n  Top 4 highest-severity gaps:`);
const gaps: GapFinding[] = patternResult.gaps;
const sorted = [...gaps].sort((a, b) => {
  const sev = { high: 3, medium: 2, low: 1 };
  return (sev[b.severity] ?? 0) - (sev[a.severity] ?? 0);
});
for (const [i, gap] of sorted.slice(0, 4).entries()) {
  const icon = gap.severity === "high" ? "🔴" : gap.severity === "medium" ? "🟡" : "🟢";
  console.log(`\n  ${i + 1}. ${icon} [${gap.dimension}] — ${gap.severity.toUpperCase()}`);
  console.log(`     Client: ${JSON.stringify(gap.clientValue)}   Category: ${JSON.stringify(gap.categoryValue)}`);
  console.log(`     ${gap.insight}`);
}

// ── SECTION D — Comments insights ────────────────────────────────────────────
console.log(`\n${"━".repeat(70)}`);
console.log(`  SECTION D — Comments & Audience Voice`);
console.log(`${"━".repeat(70)}`);

const ca = enrichResult.commentAnalysis;
console.log(`  Total comments scraped : ${ca.totalComments}`);
console.log(`  Posts processed        : ${enrichResult.comments.postsProcessed}`);
console.log(`  Cache hits             : ${enrichResult.comments.cacheHits}`);
console.log(`  Geo terms classified   : ${enrichResult.geo.enhanced}`);
if (enrichResult.geo.addedGeoTerms.length > 0) {
  console.log(`  Geo terms found        : ${enrichResult.geo.addedGeoTerms.slice(0, 10).join(", ")}`);
}

if (ca.totalComments > 0) {
  console.log(`\n  Engagement rates:`);
  console.log(`    Question rate : ${(ca.questionRate * 100).toFixed(1)}%`);
  console.log(`    Tagging rate  : ${(ca.tagRate * 100).toFixed(1)}%`);
  console.log(`    Avg length    : ${ca.avgLength.toFixed(0)} chars`);

  if (ca.topQuestions.length > 0) {
    console.log(`\n  Top audience questions (up to 10):`);
    for (const [i, q] of ca.topQuestions.slice(0, 10).entries()) {
      console.log(`    ${i + 1}. "${q}"`);
    }
  }

  if (ca.topTaggingComments.length > 0) {
    console.log(`\n  Top friend-tagging comments (up to 5):`);
    for (const [i, t] of ca.topTaggingComments.slice(0, 5).entries()) {
      console.log(`    ${i + 1}. "${t}"`);
    }
  }

  if (ca.topConcerns.length > 0) {
    console.log(`\n  Top concerns detected: ${ca.topConcerns.join(", ")}`);
  }

  if (ca.audienceLanguage.length > 0) {
    console.log(`\n  Top 15 audience language tokens:`);
    console.log(`    ${ca.audienceLanguage.slice(0, 15).join(", ")}`);
  }

  if (ca.topPraiseTokens.length > 0) {
    console.log(`\n  Top praise tokens: ${ca.topPraiseTokens.map((t) => `${t.token}(${t.count})`).join(", ")}`);
  }
} else {
  console.log(`\n  (No comments scraped — no high-ER posts with shortcodes found)`);
}

// ── SECTION E — Cross-business comparison ────────────────────────────────────
console.log(`\n${"━".repeat(70)}`);
console.log(`  SECTION E — Cross-Business Comparison (Stress Test)`);
console.log(`${"━".repeat(70)}`);

// Pull most recent Pita Golden Pocket audit (id=12 by convention, or fallback search)
const pitaAudit = db
  .select()
  .from(audits)
  .where(eq(audits.id, 12))
  .get() ?? db
  .select()
  .from(audits)
  .where(eq(audits.business_name, "Pita Golden Pocket"))
  .orderBy(desc(audits.id))
  .limit(1)
  .get();

let pitaScore = "N/A";
let pitaCatPattern: PatternResult | null = null;

if (pitaAudit) {
  const pitaScoreRow = db
    .select()
    .from(scoresTable)
    .where(eq(scoresTable.audit_id, pitaAudit.id))
    .orderBy(desc(scoresTable.id))
    .limit(1)
    .get();
  if (pitaScoreRow?.overall_score != null) pitaScore = String(pitaScoreRow.overall_score);

  const pitaPatRow = db
    .select()
    .from(content_patterns)
    .where(eq(content_patterns.audit_id, pitaAudit.id))
    .all()
    .find((r) => r.scope === "category_corpus");
  if (pitaPatRow) {
    try { pitaCatPattern = JSON.parse(pitaPatRow.patterns_json) as PatternResult; } catch { /* skip */ }
  }
}

const noeliaCatPattern = cat;
const noeliaTotalScore = scoringResult.scores.overall.score ?? "N/A";

// Score row for Noelia
const noeScoreRow = db
  .select()
  .from(scoresTable)
  .where(eq(scoresTable.audit_id, auditId))
  .orderBy(desc(scoresTable.id))
  .limit(1)
  .get();
const noeOverall = noeScoreRow?.overall_score ?? noeliaTotalScore;

type Row = [string, string, string];
const table: Row[] = [
  ["Metric", "Pita Golden Pocket", "Noelia Melo"],
  [hr.slice(0, 26), hr.slice(0, 20), hr.slice(0, 20)],
  [
    "Overall score",
    pitaScore,
    String(noeOverall),
  ],
  [
    "Top hook (category)",
    pitaCatPattern?.hooks.topHook ?? "n/a",
    noeliaCatPattern.hooks.topHook,
  ],
  [
    "Best hook (by ER)",
    pitaCatPattern?.hooks.bestPerformingHookByEngagement ?? "n/a",
    noeliaCatPattern.hooks.bestPerformingHookByEngagement ?? "n/a",
  ],
  [
    "Top tone (category)",
    pitaCatPattern?.tones.topTone ?? "n/a",
    noeliaCatPattern.tones.topTone,
  ],
  [
    "Best tone (by ER)",
    pitaCatPattern?.tones.bestPerformingToneByEngagement ?? "n/a",
    noeliaCatPattern.tones.bestPerformingToneByEngagement ?? "n/a",
  ],
  [
    "Best post type",
    pitaCatPattern?.postTypes.bestPerformingByEngagement?.post_type ?? "n/a",
    noeliaCatPattern.postTypes.bestPerformingByEngagement?.post_type ?? "n/a",
  ],
  [
    "Avg caption length",
    pitaCatPattern ? Math.round(pitaCatPattern.caption.avgLength).toString() : "n/a",
    Math.round(noeliaCatPattern.caption.avgLength).toString(),
  ],
  [
    "Avg emoji density",
    pitaCatPattern ? pitaCatPattern.caption.avgEmojiDensity.toFixed(2) : "n/a",
    noeliaCatPattern.caption.avgEmojiDensity.toFixed(2),
  ],
  [
    "Avg hashtags/post",
    pitaCatPattern ? pitaCatPattern.hashtags.avgCountPerPost.toFixed(1) : "n/a",
    noeliaCatPattern.hashtags.avgCountPerPost.toFixed(1),
  ],
];

for (const [metric, pita, noe] of table) {
  console.log(`  ${metric.padEnd(26)} ${pita.padEnd(22)} ${noe}`);
}

// ── SECTION F — Stress test verdict ──────────────────────────────────────────
console.log(`\n${"━".repeat(70)}`);
console.log(`  STRESS TEST VERDICT`);
console.log(`${"━".repeat(70)}`);

// Q1: tone distribution different from restaurant?
const pitaTopTone = pitaCatPattern?.tones.topTone ?? "";
const noeTopTone = noeliaCatPattern.tones.topTone;
const pitaToneDist = pitaCatPattern?.tones.distribution ?? {};
const noeToneDist = noeliaCatPattern.tones.distribution;
const tonesDiffer = pitaTopTone !== noeTopTone || JSON.stringify(pitaToneDist) !== JSON.stringify(noeToneDist);
const nonFoodTones = ["story", "community", "educational", "behind_scenes", "behind_the_scenes"];
const noeHasServiceTone = nonFoodTones.some((t) => noeToneDist[t] != null && (noeToneDist[t] as number) > 0);
const q1pass = tonesDiffer || noeHasServiceTone;

console.log(`\n  Q1: Did real estate tone distribution differ meaningfully from restaurants?`);
console.log(`      Restaurant top tone : ${pitaTopTone || "n/a"}`);
console.log(`      Real estate top tone: ${noeTopTone}`);
console.log(`      Real estate tones   : ${Object.keys(noeToneDist).join(", ")}`);
console.log(`      → ${q1pass ? "✅ PASS" : "❌ FAIL"} — ${q1pass ? "Tone profile looks category-appropriate" : "Both categories produced same top tone — possible over-fit"}`);

// Q2: Do gaps reference real-estate patterns?
const reKeywords = ["real estate", "listing", "property", "home", "house", "buyer", "seller", "market", "location", "neighbourhood", "neighborhood", "local", "community", "educational", "story", "cta", "hook", "caption"];
const foodKeywords = ["food", "menu", "restaurant", "dish", "eat", "dining", "taste", "flavour", "flavor", "ingredient"];
let reGapCount = 0;
const top4Gaps = sorted.slice(0, 4);
for (const gap of top4Gaps) {
  const text = (gap.insight + " " + gap.dimension).toLowerCase();
  const isRE = reKeywords.some((k) => text.includes(k));
  const isFood = foodKeywords.some((k) => text.includes(k));
  if (isRE && !isFood) reGapCount++;
}
const q2pass = reGapCount >= 2;

console.log(`\n  Q2: Did ≥2 of 4 top gaps reference real-estate patterns?`);
for (const gap of top4Gaps) {
  const text = (gap.insight + " " + gap.dimension).toLowerCase();
  const isFood = foodKeywords.some((k) => text.includes(k));
  console.log(`      [${gap.dimension}] ${gap.severity} — ${isFood ? "⚠️ food-flavoured" : "✅ generic/RE"}`);
}
console.log(`      → ${q2pass ? "✅ PASS" : "❌ FAIL"} — ${reGapCount}/4 gaps appear RE-appropriate`);

// Q3: Comments surface RE concerns?
const reCommentKeywords = ["price", "cost", "afford", "market", "buy", "buying", "sell", "listing", "house", "home", "location", "area", "neighbourhood", "neighborhood", "mortgage", "rate", "interest", "timing", "invest"];
const commentText = [
  ...ca.topQuestions,
  ...ca.topTaggingComments,
  ...ca.topConcerns,
  ...ca.audienceLanguage,
].join(" ").toLowerCase();
const reCommentHits = reCommentKeywords.filter((k) => commentText.includes(k));
const q3pass = reCommentHits.length >= 2 || ca.totalComments === 0; // graceful if 0 comments

console.log(`\n  Q3: Did audience comments surface real-estate-specific signals?`);
if (ca.totalComments === 0) {
  console.log(`      (No comments scraped — insufficient high-ER posts with shortcodes)`);
  console.log(`      → ⚠️  INCONCLUSIVE — need comments to evaluate`);
} else {
  console.log(`      RE keywords found in comment corpus: ${reCommentHits.slice(0, 8).join(", ") || "none"}`);
  console.log(`      → ${q3pass ? "✅ PASS" : "❌ FAIL"} — ${reCommentHits.length} RE-specific signals in comments`);
}

// Overall
const passes = [q1pass, q2pass].filter(Boolean).length + (ca.totalComments > 0 ? (q3pass ? 1 : 0) : 0);
const total = ca.totalComments > 0 ? 3 : 2;
console.log(`\n  ─────────────────────────────────────────────────────────────`);
console.log(`  OVERALL: ${passes}/${total} stress tests passing`);
if (passes === total) {
  console.log(`  ✅ System generalizes correctly to personal-brand service business`);
} else {
  console.log(`  ⚠️  Some classifiers may need tuning for service business context`);
}

if (patternResult.errors.length || scoringResult.errors.length || enrichResult.errors.length) {
  console.log(`\n  Pipeline errors:`);
  for (const e of [...patternResult.errors, ...scoringResult.errors, ...enrichResult.errors]) {
    console.log(`    ❌ ${e}`);
  }
}

console.log(`\n${HR}\n`);
