import "dotenv/config";
import { execSync } from "node:child_process";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits, content_patterns } from "../db/schema.js";
import { runPatternAnalysis } from "../services/patterns/patternOrchestrator.js";
import { getPhase } from "../services/audit/auditState.js";

async function main() {
  // Step 1: Idempotent backfill
  console.log("━━━ Step 1: Feature backfill ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  // Run as subprocess so it doesn't conflict with current process's DB handles
  try {
    const out = execSync("npx tsx src/scripts/backfillFeatures.ts", {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 60000,
    });
    console.log(out.trim());
  } catch (e) {
    console.warn("Backfill warning:", (e as Error).message.slice(0, 200));
  }

  // Step 2: Most recent Pita Golden Pocket audit
  const auditId = 12;
  const audit = db.select().from(audits).where(eq(audits.id, auditId)).get();
  if (!audit) throw new Error("Audit 12 not found — run runPitaGoldenPocket.ts first");
  console.log(`\n━━━ Step 2: Pattern analysis for audit ${auditId} (${audit.business_name}) ━━━`);

  // Step 3: Run
  const result = await runPatternAnalysis(auditId);

  // Step 4: Print category vs client side-by-side
  const cat = result.patterns.category;
  const cli = result.patterns.client;

  console.log(`\n📊 Category corpus (${cat.postCount} posts) vs Client (${cli.postCount} posts)`);
  console.log(`${"Dimension".padEnd(26)} ${"Category".padEnd(28)} Client`);
  console.log("─".repeat(80));
  console.log(`${"Top hook".padEnd(26)} ${cat.hooks.topHook.padEnd(28)} ${cli.hooks.topHook}`);
  console.log(`${"Best hook (by ER)".padEnd(26)} ${(cat.hooks.bestPerformingHookByEngagement ?? "n/a").padEnd(28)} ${cli.hooks.bestPerformingHookByEngagement ?? "n/a"}`);
  console.log(`${"Top tone".padEnd(26)} ${cat.tones.topTone.padEnd(28)} ${cli.tones.topTone}`);
  console.log(`${"Best tone (by ER)".padEnd(26)} ${(cat.tones.bestPerformingToneByEngagement ?? "n/a").padEnd(28)} ${cli.tones.bestPerformingToneByEngagement ?? "n/a"}`);
  console.log(`${"Best post type (by ER)".padEnd(26)} ${(cat.postTypes.bestPerformingByEngagement?.post_type ?? "n/a").padEnd(28)} ${cli.postTypes.bestPerformingByEngagement?.post_type ?? "n/a"}`);
  console.log(`${"Avg caption length".padEnd(26)} ${Math.round(cat.caption.avgLength).toString().padEnd(28)} ${Math.round(cli.caption.avgLength)}`);
  console.log(`${"Avg emoji density".padEnd(26)} ${cat.caption.avgEmojiDensity.toFixed(2).padEnd(28)} ${cli.caption.avgEmojiDensity.toFixed(2)}`);
  console.log(`${"Avg hashtags/post".padEnd(26)} ${cat.hashtags.avgCountPerPost.toFixed(1).padEnd(28)} ${cli.hashtags.avgCountPerPost.toFixed(1)}`);

  console.log(`\n📊 Caption length distribution:`);
  console.log(`${"Bucket".padEnd(12)} ${"Category".padEnd(14)} Client`);
  for (const bucket of ["short", "medium", "long", "very_long"] as const) {
    console.log(`  ${bucket.padEnd(10)} ${cat.caption.distribution[bucket].toString().padEnd(14)} ${cli.caption.distribution[bucket]}`);
  }

  console.log(`\n📊 Content elements (best engagement in category):`);
  console.log(`  Best element: ${cat.contentElements.bestPerformingElementByEngagement ?? "n/a"}`);
  const elemDist = Object.entries(cat.contentElements.distribution).sort((a, b) => b[1] - a[1]);
  for (const [elem, count] of elemDist) {
    const clientCount = cli.contentElements.distribution[elem] ?? 0;
    console.log(`  ${elem.padEnd(22)} cat=${count} client=${clientCount}`);
  }

  // Step 5: Gaps
  console.log(`\n━━━ Top gaps (${result.gaps.length} found) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  for (const [i, gap] of result.gaps.entries()) {
    const sev = gap.severity === "high" ? "🔴" : gap.severity === "medium" ? "🟡" : "🟢";
    console.log(`\n${i + 1}. ${sev} [${gap.dimension}] — ${gap.severity.toUpperCase()}`);
    console.log(`   Client value   : ${JSON.stringify(gap.clientValue)}`);
    console.log(`   Category value : ${JSON.stringify(gap.categoryValue)}`);
    console.log(`   Insight: ${gap.insight}`);
    if (gap.exampleToEmulate) {
      const ex = gap.exampleToEmulate;
      const safe = ex.safeToReference ? "✅ safe to reference" : "⚠️  local competitor — awareness only";
      console.log(`   Example: @${ex.username} (${ex.competitorType ?? "client"}) — ${safe}`);
    }
  }

  // Step 6: Hashtag hygiene
  const ht = result.hashtagHygiene;
  console.log(`\n━━━ Hashtag hygiene ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Avg hashtags/post : ${ht.avgCountPerPost.toFixed(1)}  [${ht.countAssessment}]`);
  console.log(`  Client uses own geo: ${ht.clientUsesOwnGeo ? "✅ yes" : "❌ no"}`);
  console.log(`  Brand pollution   : ${ht.brandPollutionDetected.length > 0 ? ht.brandPollutionDetected.join(", ") : "none detected"}`);
  console.log(`  Top client hashtags: ${ht.topClientHashtags.join(", ")}`);
  for (const note of ht.notes) console.log(`  📝 ${note}`);

  // Step 7: DB persistence check
  const persisted = db.select().from(content_patterns).where(eq(content_patterns.audit_id, auditId)).all();
  console.log(`\n━━━ DB persistence ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  content_patterns rows: ${persisted.length}`);
  for (const row of persisted) {
    console.log(`  scope=${row.scope}  post_count=${row.post_count}  at=${row.calculated_at}`);
  }

  // Step 8: Final phase
  const phase = getPhase(auditId);
  console.log(`\n  Audit phase: ${phase} ${phase === "CONTENT_PATTERNS_COMPLETE" ? "✅" : "⚠️ unexpected"}`);

  if (result.errors.length) {
    console.log(`\n  ❌ Errors:`);
    for (const e of result.errors) console.log(`    ${e}`);
  }

  // Step 9: Three most actionable gaps for Step 6
  console.log(`\n━━━ 3 Most Actionable Gaps for Step 6 ━━━━━━━━━━━━━━━━━━━━━━━━━`);
  const top3 = result.gaps.slice(0, 3);
  for (const [i, g] of top3.entries()) {
    console.log(`  ${i + 1}. [${g.dimension}] ${g.insight}`);
  }
}

main().catch((err) => {
  console.error("testPatternAnalysis failed:", err);
  process.exit(1);
});
