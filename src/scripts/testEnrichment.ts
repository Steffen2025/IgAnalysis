import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits, comments } from "../db/schema.js";
import { runEnrichment } from "../services/comments/enrichmentOrchestrator.js";
import { getPhase } from "../services/audit/auditState.js";

const AUDIT_ID = 12;

async function runOnce(label: string) {
  console.log(`\n${"━".repeat(60)}`);
  console.log(`RUN: ${label}`);
  console.log(`${"━".repeat(60)}`);

  const audit = db.select().from(audits).where(eq(audits.id, AUDIT_ID)).get();
  if (!audit) throw new Error(`Audit ${AUDIT_ID} not found`);
  console.log(`Audit: ${audit.business_name} (id=${AUDIT_ID})`);

  const result = await runEnrichment(AUDIT_ID);

  console.log(`\n📊 Comment scraping:`);
  console.log(`  Posts processed : ${result.comments.postsProcessed}`);
  console.log(`  Comments scraped: ${result.comments.scraped}`);
  console.log(`  Cache hits      : ${result.comments.cacheHits}`);

  const { commentAnalysis: ca } = result;
  console.log(`\n📊 Comment analysis (${ca.totalComments} total):`);
  console.log(`  Question rate   : ${(ca.questionRate * 100).toFixed(1)}%`);
  console.log(`  Tagging rate    : ${(ca.tagRate * 100).toFixed(1)}%`);
  console.log(`  Avg length      : ${ca.avgLength.toFixed(0)} chars`);
  console.log(`  By type         :`, JSON.stringify(ca.byCompetitorType));

  if (ca.topPraiseTokens.length > 0) {
    console.log(`  Top praise      : ${ca.topPraiseTokens.map((t) => `${t.token}(${t.count})`).join(", ")}`);
  }
  if (ca.topConcerns.length > 0) {
    console.log(`  Concerns found  : ${ca.topConcerns.join(", ")}`);
  }
  if (ca.audienceLanguage.length > 0) {
    console.log(`  Audience words  : ${ca.audienceLanguage.slice(0, 10).join(", ")}`);
  }
  if (ca.topQuestions.length > 0) {
    console.log(`\n  Sample questions:`);
    for (const q of ca.topQuestions.slice(0, 3)) {
      console.log(`    "${q}"`);
    }
  }

  console.log(`\n🌍 Geo hashtag enhancement:`);
  console.log(`  Enhanced  : ${result.geo.enhanced}`);
  if (result.geo.addedGeoTerms.length > 0) {
    console.log(`  Geo terms : ${result.geo.addedGeoTerms.slice(0, 10).join(", ")}`);
  }

  const commentCount = db.select().from(comments).where(eq(comments.audit_id, AUDIT_ID)).all().length;
  console.log(`\n📦 DB: ${commentCount} comments stored for audit ${AUDIT_ID}`);

  const phase = getPhase(AUDIT_ID);
  console.log(`   Audit phase: ${phase} ${phase === "ENRICHMENT_COMPLETE" ? "✅" : "⚠️ unexpected"}`);

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors (${result.errors.length}):`);
    for (const e of result.errors) console.log(`  ${e}`);
  }

  return result;
}

async function main() {
  console.log("━━━ Step 5.5: Enrichment Test ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Run 1 — scrape + LLM calls
  const r1 = await runOnce("First run (cache misses expected)");

  // Run 2 — everything should hit cache
  console.log(`\n\n${"═".repeat(60)}`);
  console.log(`Starting second run to verify caching ($0 incremental cost)…`);
  const r2 = await runOnce("Second run (all cache hits expected)");

  // Verify cache behaviour
  console.log(`\n\n━━━ Cache verification ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  const totalTargets = r1.comments.postsProcessed;
  const secondRunHits = r2.comments.cacheHits;
  const secondRunApifyCalls = r2.comments.postsProcessed - r2.comments.cacheHits;

  if (secondRunApifyCalls === 0 && secondRunHits >= totalTargets) {
    console.log(`✅ Cache working correctly: ${secondRunHits}/${totalTargets} hits, 0 Apify calls`);
  } else {
    console.log(`⚠️  Cache check: hits=${secondRunHits}, apify_calls=${secondRunApifyCalls}, expected 0 Apify calls`);
  }
}

main().catch((err) => {
  console.error("testEnrichment failed:", err);
  process.exit(1);
});
