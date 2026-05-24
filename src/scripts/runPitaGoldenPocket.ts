import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits, competitors, hashtags, posts, profiles } from "../db/schema.js";
import { resolveReferenceMarkets } from "../services/audit/referenceMarkets.js";
import { runAudit } from "../services/audit/orchestrator.js";
import { runScoring } from "../services/scoring/scoringOrchestrator.js";

async function main() {
  // ── 1. Insert audit row (or reuse existing id=12 from previous run) ─────────
  const REUSE_AUDIT_ID = 12; // set to 0 to insert fresh
  let auditId: number;

  if (REUSE_AUDIT_ID) {
    auditId = REUSE_AUDIT_ID;
    // Reset phase so orchestrator can re-run from READY_FOR_ANALYSIS if needed
    console.log(`\n♻️  Reusing existing audit id=${auditId} for reference-market fix verification\n`);
  } else {
    const inserted = db
      .insert(audits)
      .values({
        business_name: "Pita Golden Pocket",
        instagram_url: "https://www.instagram.com/pita_golden_pocket/",
        website_url: "https://pita-golden-pocket.store",
        city: "Vaughan",
        service_area: "Vaughan, Ontario / GTA",
        business_category: "Middle Eastern restaurant",
        main_offer: "Authentic shawarma and falafel pitas",
        target_audience: "GTA shawarma lovers, lunch crowd, families looking for fresh Middle Eastern food",
        follower_goal: "5000",
        business_outcome: "Increase GTA brand awareness, walk-ins, and weekday lunch traffic",
        report_type: "full_gtm",
        mode: "mixed",
        status: "queued",
        reference_markets: null,
      })
      .returning({ id: audits.id })
      .get();
    auditId = inserted.id;
    console.log(`\n✅ Inserted audit id=${auditId} for Pita Golden Pocket\n`);
  }

  // ── 2. Verify reference market suggestions (must not include Ontario cities) ─
  const auditRow = db.select().from(audits).where(eq(audits.id, auditId)).get()!;
  const suggestedMarkets = resolveReferenceMarkets(auditRow);

  console.log("📍 Auto-suggested reference markets:");
  for (const m of suggestedMarkets) {
    const isOntario = /\bON\b/.test(m);
    console.log(`   ${isOntario ? "⚠️  ONTARIO — BAD" : "✅"} ${m}`);
  }
  const ontarioProblem = suggestedMarkets.some((m) => /\bON\b/.test(m));
  if (ontarioProblem) {
    console.warn("\n⛔ WARNING: Ontario market included in suggestions — check suggestReferenceMarkets logic!\n");
  } else {
    console.log("   → All non-Ontario. Good.\n");
  }

  // ── 3. Run full audit ────────────────────────────────────────────────────────
  console.log("🚀 Starting full audit...\n");
  const result = await runAudit({ auditId, tier: "full" });

  // ── 4. Print audit results ───────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════");
  console.log("AUDIT COMPLETE");
  console.log("════════════════════════════════════════");
  console.log(`  Final phase : ${result.finalPhase}`);
  console.log(`  Items scraped: ${result.itemsScraped}`);
  console.log(`  Cache hits  : ${result.cacheHits}`);
  console.log(`  Est. cost   : $${(result.itemsScraped * 0.0015).toFixed(4)}`);
  console.log(`  Errors      : ${result.errors.length}`);
  if (result.errors.length) {
    for (const e of result.errors) console.log(`    ❌ ${e}`);
  }

  // Competitors
  const allComps = db.select().from(competitors).where(eq(competitors.audit_id, auditId)).all();
  const localComps = allComps.filter((c) => c.competitor_type === "local_intel");
  const refComps = allComps.filter((c) => c.competitor_type === "reference_model");
  const gated = allComps.filter((c) => c.skip_reason);

  console.log(`\n🏪 Competitors discovered (${allComps.length} total):`);
  console.log(`  LOCAL INTEL (${localComps.length}):`);
  for (const c of localComps) {
    const ds = c.deep_scraped ? "deep-scraped ✅" : "shallow only";
    const conf = c.confidence_score !== null ? `conf=${c.confidence_score}` : "conf=n/a";
    console.log(`    @${c.username ?? "?"}  ${conf}  ${ds}${c.skip_reason ? `  skip: ${c.skip_reason}` : ""}`);
  }
  console.log(`  REFERENCE MODEL (${refComps.length}):`);
  for (const c of refComps) {
    const ds = c.deep_scraped ? "deep-scraped ✅" : "shallow only";
    const conf = c.confidence_score !== null ? `conf=${c.confidence_score}` : "conf=n/a";
    console.log(`    @${c.username ?? "?"}  ${conf}  ${ds}  market=${c.geographic_market ?? "?"}${c.skip_reason ? `  skip: ${c.skip_reason}` : ""}`);
  }
  if (gated.length) {
    console.log(`  GATED OUT (${gated.length}):`);
    for (const c of gated) console.log(`    @${c.username ?? "?"}  skip_reason: ${c.skip_reason}`);
  }

  // Hashtags
  const allHashtags = db.select().from(hashtags).where(eq(hashtags.audit_id, auditId)).all();
  const bLocal = allHashtags.filter((h) => h.source === "branded_local");
  const strategic = allHashtags.filter((h) => h.source === "strategic_research");
  const localAware = allHashtags.filter((h) => h.source === "local_awareness");

  console.log(`\n#️⃣  Hashtags collected:`);
  console.log(`  branded_local (${bLocal.length}): ${bLocal.map((h) => "#" + h.hashtag).join(", ") || "—"}`);
  console.log(`  strategic     (${strategic.length}): ${strategic.map((h) => "#" + h.hashtag).join(", ") || "—"}`);
  console.log(`  local_aware   (${localAware.length}): ${localAware.map((h) => "#" + h.hashtag).join(", ") || "—"}`);

  // ── 5. Score ─────────────────────────────────────────────────────────────────
  console.log("\n📊 Running scoring...\n");
  const scoring = await runScoring(auditId);

  const order = ["profile_conversion", "content_performance", "local_visibility", "sales_readiness", "competitor_gap"] as const;

  console.log(`\n════════════════════════════════════════`);
  console.log(`SCORING RESULTS`);
  console.log(`════════════════════════════════════════`);
  console.log(`  OVERALL: ${scoring.scores.overall.score ?? "n/a"} / 100`);
  console.log(`  ${scoring.scores.overall.explanation}\n`);
  for (const key of order) {
    const r = scoring.scores[key];
    const sc = r.score === null ? "n/a" : `${r.score}/100`;
    console.log(`  ${key.toUpperCase().padEnd(24)} ${sc.padEnd(10)} ${r.explanation}`);
  }

  // Best signal and worst signal
  const allSignals = Object.entries(scoring.scores)
    .filter(([k]) => k !== "overall")
    .flatMap(([k, r]) => r.signals.map((s) => ({ ...s, category: k })));

  const fired = allSignals.filter((s) => s.fired).sort((a, b) => b.earned - a.earned);
  const missed = allSignals.filter((s) => !s.fired && s.weight > 0).sort((a, b) => b.weight - a.weight);

  console.log(`\n  💪 Top 3 strengths:`);
  for (const s of fired.slice(0, 3)) {
    console.log(`    ✅ [${s.category}] ${s.key}  earned=${s.earned}/${s.weight}  value=${JSON.stringify(s.value)}`);
  }
  console.log(`\n  🔴 Biggest gap (top 3 missed):`);
  for (const s of missed.slice(0, 3)) {
    console.log(`    ❌ [${s.category}] ${s.key}  weight=${s.weight}  value=${JSON.stringify(s.value)}${s.note ? "  // " + s.note : ""}`);
  }

  // ── PART B — Sanity checks ────────────────────────────────────────────────────
  console.log(`\n════════════════════════════════════════`);
  console.log(`SANITY CHECKS`);
  console.log(`════════════════════════════════════════`);

  // 1. Client profile
  const profile = db.select().from(profiles).where(eq(profiles.audit_id, auditId)).get();
  if (profile) {
    console.log(`  ✅ Profile loaded: @${profile.username}  followers=${profile.follower_count}  posts=${profile.post_count}`);
    console.log(`     Bio: ${(profile.bio ?? "").slice(0, 120)}`);
  } else {
    console.warn("  ⚠️  WARNING: No profile row found for this audit!");
  }

  // 2. Recent posts (last 30 days)
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const allPosts = db.select().from(posts).where(eq(posts.audit_id, auditId)).all();
  const recentPosts = allPosts.filter((p) => {
    if (!p.posted_at) return false;
    return p.posted_at >= cutoff;
  });
  if (recentPosts.length > 0) {
    console.log(`  ✅ ${recentPosts.length} posts found in the last 30 days (cutoff ${cutoff})`);
  } else {
    console.warn(`  ⚠️  WARNING: 0 posts in last 30 days — posting_frequency signal will be 0!`);
    const newest = allPosts.sort((a, b) => (b.posted_at ?? "").localeCompare(a.posted_at ?? ""))[0];
    if (newest) console.warn(`     Most recent post: ${newest.posted_at ?? "unknown"}`);
  }

  // 3. Competitors + deep scrapes
  const deepScraped = allComps.filter((c) => c.deep_scraped);
  if (allComps.length >= 4 && deepScraped.length >= 2) {
    console.log(`  ✅ ${allComps.length} competitors discovered, ${deepScraped.length} deep-scraped`);
  } else {
    if (allComps.length < 4) console.warn(`  ⚠️  WARNING: Only ${allComps.length} competitors discovered (expected ≥4)`);
    if (deepScraped.length < 2) console.warn(`  ⚠️  WARNING: Only ${deepScraped.length} competitors deep-scraped (expected ≥2)`);
  }

  if (scoring.errors.length) {
    console.log(`\n  ❌ Scoring errors:`);
    for (const e of scoring.errors) console.log(`    ${e}`);
  }
}

main().catch((err) => {
  console.error("runPitaGoldenPocket failed:", err);
  process.exit(1);
});
