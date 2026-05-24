import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits, competitors, hashtags } from "../db/schema.js";
import { runAudit } from "../services/audit/orchestrator.js";

const PURE_PITA = {
  business_name: "Pure Pita Toronto",
  instagram_url: "https://www.instagram.com/purepita/",
  website_url: "https://purepita.com",
  city: "Toronto",
  service_area: "Toronto downtown, ON",
  business_category: "Mediterranean restaurant",
  main_offer: "Fresh Mediterranean food",
  target_audience: "Downtown lunch crowd",
  follower_goal: "5000",
  business_outcome: "More foot traffic",
  report_type: "growth" as const,
  status: "queued" as const,
  mode: "mixed" as const,
};

async function main() {
  const [audit] = await db.insert(audits).values(PURE_PITA).returning();
  console.log(`Inserted audit id=${audit.id} (mode=mixed)`);

  const result = await runAudit({ auditId: audit.id, tier: "full" });
  console.log("\nResult:", JSON.stringify(result, null, 2));

  const comps = db
    .select()
    .from(competitors)
    .where(eq(competitors.audit_id, audit.id))
    .all();

  const local = comps.filter((c) => c.competitor_type === "local_intel");
  const reference = comps.filter((c) => c.competitor_type === "reference_model");

  console.log(`\n=== LOCAL INTEL (${local.length}) ===`);
  for (const c of local) {
    console.log(
      `  @${c.username}  market=${c.geographic_market}  conf=${c.confidence_score}  deep=${c.deep_scraped}  skip=${c.skip_reason ?? "-"}`,
    );
  }

  console.log(`\n=== REFERENCE MODELS (${reference.length}) ===`);
  for (const c of reference) {
    console.log(
      `  @${c.username}  market=${c.geographic_market}  conf=${c.confidence_score}  deep=${c.deep_scraped}  skip=${c.skip_reason ?? "-"}`,
    );
  }

  const tags = db.select().from(hashtags).where(eq(hashtags.audit_id, audit.id)).all();
  const strategic = tags.filter((t) => t.source === "strategic_research").map((t) => `#${t.hashtag}`);
  const localTags = tags.filter((t) => t.source === "local_awareness").map((t) => `#${t.hashtag}`);
  console.log(`\nStrategic hashtags: ${strategic.join(", ") || "(none)"}`);
  console.log(`Local awareness hashtags: ${localTags.join(", ") || "(none)"}`);

  console.log(`\nFinal phase: ${result.finalPhase}`);
  console.log(`Items scraped: ${result.itemsScraped}, cache hits: ${result.cacheHits}`);
  console.log(`Estimated cost: $${(result.itemsScraped * 0.0015).toFixed(4)}`);
}

main().catch((err) => {
  console.error("testFullAudit failed:", err);
  process.exit(1);
});
