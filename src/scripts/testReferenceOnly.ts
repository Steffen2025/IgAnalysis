import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits, competitors } from "../db/schema.js";
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
  mode: "reference_only" as const,
  reference_markets: JSON.stringify(["Austin, TX", "Portland, OR", "Seattle, WA"]),
};

async function main() {
  const [audit] = await db.insert(audits).values(PURE_PITA).returning();
  console.log(`Inserted audit id=${audit.id} (mode=reference_only, markets=Austin/Portland/Seattle)`);

  const result = await runAudit({ auditId: audit.id, tier: "full" });
  console.log("\nResult:", JSON.stringify(result, null, 2));

  const comps = db
    .select()
    .from(competitors)
    .where(eq(competitors.audit_id, audit.id))
    .all();

  const bad = comps.filter((c) => c.competitor_type !== "reference_model");
  console.log(`\nCompetitors (${comps.length}, expecting all reference_model):`);
  for (const c of comps) {
    console.log(
      `  @${c.username}  type=${c.competitor_type}  market=${c.geographic_market}  conf=${c.confidence_score}  deep=${c.deep_scraped}`,
    );
  }
  if (bad.length > 0) {
    console.error(`❌ ${bad.length} competitors are not reference_model`);
    process.exit(1);
  }
  console.log(`✅ All competitors classified reference_model`);
  console.log(`Estimated cost: $${(result.itemsScraped * 0.0015).toFixed(4)}`);
}

main().catch((err) => {
  console.error("testReferenceOnly failed:", err);
  process.exit(1);
});
