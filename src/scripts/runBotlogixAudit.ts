import "dotenv/config";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits, competitors, content_patterns, scores as scoresTable, comments } from "../db/schema.js";
import { runAudit } from "../services/audit/orchestrator.js";
import { runScoring } from "../services/scoring/scoringOrchestrator.js";
import { runPatternAnalysis } from "../services/patterns/patternOrchestrator.js";
import { runEnrichment } from "../services/comments/enrichmentOrchestrator.js";
import { resolveReferenceMarkets } from "../services/audit/referenceMarkets.js";
import type { GapFinding } from "../services/patterns/clientGapAnalysis.js";

// ── Insert audit row ─────────────────────────────────────────────────────────
const [inserted] = db
  .insert(audits)
  .values({
    business_name: "BotLogix - AI Solutions",
    instagram_url: "https://www.instagram.com/botlogix/",
    website_url: "https://botlogix.ca",
    city: "Burlington",
    service_area: "Burlington, Ontario",
    business_category: "Marketing agency",
    main_offer: "Instagram automation, AI agents, and DM marketing workflows for small businesses",
    target_audience: "Small business owners using Instagram for sales — e-commerce, service businesses, coaches",
    follower_goal: "10000",
    business_outcome: "More inbound leads via Instagram DM automations, grow agency credibility through follower count",
    report_type: "full_gtm",
    mode: "mixed",
    status: "queued",
  })
  .returning({ id: audits.id })
  .all();

const auditId = inserted.id;
console.log(`\n✅ Audit row created — id=${auditId} (@botlogix)`);

// Reference markets
const auditRow = db.select().from(audits).where(eq(audits.id, auditId)).get()!;
const refMarkets = resolveReferenceMarkets(auditRow);
console.log(`   Reference markets: ${refMarkets.join("  |  ")}`);

// ── Pipeline ─────────────────────────────────────────────────────────────────
console.log(`\n━━━ PHASE 1: Scraping ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
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

console.log(`\n\n${HR}`);
console.log(`  BOTLOGIX — AI SOLUTIONS  |  @botlogix  |  Audit #${auditId}`);
console.log(HR);

// ── SECTION A — Audit ─────────────────────────────────────────────────────────
console.log(`\n━━━ SECTION A — Scrape Results ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Final phase   : ${auditResult.finalPhase}`);
console.log(`  Items scraped : ${auditResult.itemsScraped}`);
console.log(`  Cache hits    : ${auditResult.cacheHits}`);
console.log(`  Est. cost     : $${(auditResult.itemsScraped * 0.0015).toFixed(4)}`);
if (auditResult.errors.length) console.log(`  Errors: ${auditResult.errors.join("; ")}`);

const allComps = db.select().from(competitors).where(eq(competitors.audit_id, auditId)).all();
const byType: Record<string, typeof allComps> = {};
for (const c of allComps) (byType[c.competitor_type ?? "unclassified"] ??= []).push(c);

console.log(`\n  Competitors (${allComps.length} total):`);
for (const [type, comps] of Object.entries(byType)) {
  console.log(`  [${type}]`);
  for (const c of comps) {
    const deep = c.deep_scraped ? "✅ deep" : "  shallow";
    const conf = c.confidence_score != null ? `conf=${c.confidence_score}` : "conf=?";
    console.log(`    @${c.username.padEnd(34)} ${conf.padEnd(8)} ${deep}`);
  }
}

// ── SECTION B — Scores ────────────────────────────────────────────────────────
console.log(`\n━━━ SECTION B — Scores ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

const scoreLabels: Record<string, string> = {
  profile_conversion: "Profile Conversion",
  content_performance: "Content Performance",
  local_visibility: "Local Visibility",
  sales_readiness: "Sales Readiness",
  competitor_gap: "Competitor Gap",
  overall: "Overall",
};

const firing: Array<{ label: string; earned: number }> = [];
const missing: Array<{ label: string; weight: number; note?: string }> = [];

for (const [cat, result] of Object.entries(scoringResult.scores)) {
  const score = result.score ?? 0;
  const bar = "█".repeat(Math.round(score / 5)) + "░".repeat(20 - Math.round(score / 5));
  console.log(`  ${(scoreLabels[cat] ?? cat).padEnd(22)}: ${String(score).padStart(3)}/100  ${bar}`);
  if (cat !== "overall") {
    for (const sig of result.signals) {
      if (sig.fired && sig.earned > 0) firing.push({ label: sig.label, earned: sig.earned });
      else if (!sig.fired && sig.weight >= 5) missing.push({ label: sig.label, weight: sig.weight, note: sig.note });
    }
  }
}

firing.sort((a, b) => b.earned - a.earned);
missing.sort((a, b) => b.weight - a.weight);

console.log(`\n  Strengths firing:`);
for (const s of firing.slice(0, 5)) console.log(`    ✅ ${s.label} (+${s.earned}pts)`);

console.log(`\n  High-weight gaps (unfired signals):`);
for (const s of missing.slice(0, 8)) {
  const note = s.note ? `  → ${s.note}` : "";
  console.log(`    ❌ ${s.label} (${s.weight}pts at stake)${note}`);
}

// ── SECTION C — Content Patterns ──────────────────────────────────────────────
console.log(`\n━━━ SECTION C — Content Patterns ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

const cat = patternResult.patterns.category;
const cli = patternResult.patterns.client;

console.log(`  Category corpus: ${cat.postCount} posts   |   Client: ${cli.postCount} posts`);
console.log(`  Avg caption     : cat=${Math.round(cat.caption.avgLength)} chars  client=${Math.round(cli.caption.avgLength)} chars`);
console.log(`  Avg emoji density: cat=${cat.caption.avgEmojiDensity.toFixed(2)}  client=${cli.caption.avgEmojiDensity.toFixed(2)}`);
console.log(`  Avg hashtags/post: cat=${cat.hashtags.avgCountPerPost.toFixed(1)}  client=${cli.hashtags.avgCountPerPost.toFixed(1)}`);

console.log(`\n  Hook distribution (category):`);
for (const [h, n] of Object.entries(cat.hooks.distribution).sort((a, b) => b[1] - a[1])) {
  const pct = Math.round((n / cat.postCount) * 100);
  console.log(`    ${h.padEnd(18)} ${String(n).padStart(4)}  (${String(pct).padStart(3)}%)  ${"▓".repeat(Math.round(pct / 3))}`);
}
console.log(`    Top hook: ${cat.hooks.topHook}  |  Best by ER: ${cat.hooks.bestPerformingHookByEngagement ?? "n/a"}`);

console.log(`\n  Tone distribution (category):`);
for (const [t, n] of Object.entries(cat.tones.distribution).sort((a, b) => b[1] - a[1])) {
  const pct = Math.round((n / cat.postCount) * 100);
  console.log(`    ${t.padEnd(18)} ${String(n).padStart(4)}  (${String(pct).padStart(3)}%)  ${"▓".repeat(Math.round(pct / 3))}`);
}
console.log(`    Top tone: ${cat.tones.topTone}  |  Best by ER: ${cat.tones.bestPerformingToneByEngagement ?? "n/a"}`);

console.log(`\n  Content elements (category):`);
for (const [e, n] of Object.entries(cat.contentElements.distribution).sort((a, b) => b[1] - a[1])) {
  const clientN = (cli.contentElements.distribution[e] ?? 0) as number;
  console.log(`    ${e.padEnd(22)}  cat=${String(n).padStart(3)}  client=${clientN}`);
}
console.log(`    Best by ER: ${cat.contentElements.bestPerformingElementByEngagement ?? "n/a"}`);
console.log(`    Best post type: ${cat.postTypes.bestPerformingByEngagement?.post_type ?? "n/a"}`);

console.log(`\n  Top gaps:`);
const gaps: GapFinding[] = patternResult.gaps;
const sortedGaps = [...gaps].sort((a, b) => ({ high: 3, medium: 2, low: 1 }[b.severity] ?? 0) - ({ high: 3, medium: 2, low: 1 }[a.severity] ?? 0));
for (const [i, g] of sortedGaps.entries()) {
  const icon = g.severity === "high" ? "🔴" : g.severity === "medium" ? "🟡" : "🟢";
  console.log(`\n  ${i + 1}. ${icon} [${g.dimension}] ${g.severity.toUpperCase()}`);
  console.log(`     Client: ${JSON.stringify(g.clientValue)}  →  Category: ${JSON.stringify(g.categoryValue)}`);
  console.log(`     ${g.insight}`);
  if (g.exampleToEmulate) {
    const ex = g.exampleToEmulate;
    console.log(`     Example: @${ex.username} (${ex.competitorType ?? "competitor"}) — ${ex.safeToReference ? "✅ safe to reference" : "⚠️ local only"}`);
  }
}

// ── SECTION D — Hashtag hygiene ───────────────────────────────────────────────
console.log(`\n━━━ SECTION D — Hashtag Hygiene ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
const ht = patternResult.hashtagHygiene;
console.log(`  Avg hashtags/post : ${ht.avgCountPerPost.toFixed(1)}  [${ht.countAssessment}]`);
console.log(`  Uses own geo      : ${ht.clientUsesOwnGeo ? "✅ yes" : "❌ no"}`);
console.log(`  Brand pollution   : ${ht.brandPollutionDetected.length > 0 ? ht.brandPollutionDetected.join(", ") : "none"}`);
console.log(`  Top hashtags      : ${ht.topClientHashtags.join(", ")}`);
for (const note of ht.notes) console.log(`  📝 ${note}`);

// ── SECTION E — Comments ──────────────────────────────────────────────────────
console.log(`\n━━━ SECTION E — Audience Voice (Comments) ━━━━━━━━━━━━━━━━━━━`);
const ca = enrichResult.commentAnalysis;
console.log(`  Total comments : ${ca.totalComments}`);
console.log(`  Posts scraped  : ${enrichResult.comments.postsProcessed}`);
if (ca.totalComments > 0) {
  console.log(`  Question rate  : ${(ca.questionRate * 100).toFixed(1)}%`);
  console.log(`  Tagging rate   : ${(ca.tagRate * 100).toFixed(1)}%`);
  console.log(`  Avg length     : ${ca.avgLength.toFixed(0)} chars`);
  if (ca.topPraiseTokens.length > 0)
    console.log(`  Top praise     : ${ca.topPraiseTokens.map((t) => `${t.token}(${t.count})`).join(", ")}`);
  if (ca.topConcerns.length > 0)
    console.log(`  Concerns       : ${ca.topConcerns.join(", ")}`);
  if (ca.audienceLanguage.length > 0)
    console.log(`  Audience words : ${ca.audienceLanguage.slice(0, 15).join(", ")}`);
  if (ca.topQuestions.length > 0) {
    console.log(`\n  Top questions from audience:`);
    for (const [i, q] of ca.topQuestions.slice(0, 8).entries()) console.log(`    ${i + 1}. "${q}"`);
  }
} else {
  console.log(`  (No comments scraped)`);
}

console.log(`\n  Geo hashtag enhancement: ${enrichResult.geo.enhanced} classified`);
if (enrichResult.geo.addedGeoTerms.length > 0)
  console.log(`  Geo terms: ${enrichResult.geo.addedGeoTerms.join(", ")}`);

// ── SECTION F — Diagnosis ─────────────────────────────────────────────────────
console.log(`\n━━━ SECTION F — Diagnosis ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

const overall = scoringResult.scores.overall.score ?? 0;
const profileScore = scoringResult.scores.profile_conversion.score ?? 0;
const contentScore = scoringResult.scores.content_performance.score ?? 0;
const localScore = scoringResult.scores.local_visibility.score ?? 0;
const salesScore = scoringResult.scores.sales_readiness.score ?? 0;
const compScore = scoringResult.scores.competitor_gap.score ?? 0;

// Credibility gap — the core observation for an automation agency
const followerCount = db.select().from(audits).where(eq(audits.id, auditId)).get()?.follower_goal;
console.log(`\n  CREDIBILITY GAP`);
console.log(`  @botlogix sells Instagram growth but has 718 followers with a`);
console.log(`  follow-to-following ratio that signals follow-back tactics.`);
console.log(`  Every prospect checks this before hiring a social media agency.`);
console.log(`  The account needs to be proof of the product.`);

console.log(`\n  BIGGEST SCORING GAPS`);
if (profileScore < 30) console.log(`  Profile (${profileScore}/100) — bio, link, highlights, business signals`);
if (contentScore < 30) console.log(`  Content (${contentScore}/100) — posting frequency, engagement rate, format mix`);
if (localScore < 30) console.log(`  Local visibility (${localScore}/100) — geo hashtags, location tags, local reach`);
if (salesScore < 30) console.log(`  Sales readiness (${salesScore}/100) — CTA clarity, lead capture, DM triggers`);

console.log(`\n  WHAT'S WORKING`);
for (const s of firing.slice(0, 3)) console.log(`  ✅ ${s.label}`);

if (patternResult.errors.length || scoringResult.errors.length || enrichResult.errors.length) {
  console.log(`\n  Pipeline errors:`);
  for (const e of [...patternResult.errors, ...scoringResult.errors, ...enrichResult.errors])
    console.log(`    ❌ ${e}`);
}

console.log(`\n${HR}\n`);
