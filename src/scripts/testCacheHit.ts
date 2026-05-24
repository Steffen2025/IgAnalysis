import "dotenv/config";
import { db } from "../db/index.js";
import { audits } from "../db/schema.js";
import { runAudit } from "../services/audit/orchestrator.js";

const PURE_PITA = {
  business_name: "Pure Pita Toronto",
  instagram_url: "https://www.instagram.com/purepita/",
  website_url: "https://purepita.com",
  city: "Toronto",
  service_area: "Toronto downtown",
  business_category: "Mediterranean restaurant",
  main_offer: "Fresh Mediterranean food",
  target_audience: "Downtown lunch crowd",
  follower_goal: "5000",
  business_outcome: "More foot traffic",
  report_type: "growth" as const,
  status: "queued" as const,
};

async function runOnce(label: string) {
  console.log(`\n=========== ${label} ===========`);
  const [audit] = await db.insert(audits).values(PURE_PITA).returning();
  console.log(`Inserted audit id=${audit.id}`);
  const result = await runAudit({ auditId: audit.id, tier: "preview" });
  console.log(`Result: ${JSON.stringify(result)}`);
  return result;
}

async function main() {
  const first = await runOnce("RUN 1 (expect cache miss / scrape)");
  const second = await runOnce("RUN 2 (expect cache hits)");

  console.log("\n=========== Summary ===========");
  console.log(`Run 1 — scraped=${first.itemsScraped} cached=${first.cacheHits}`);
  console.log(`Run 2 — scraped=${second.itemsScraped} cached=${second.cacheHits}`);

  const ok = second.itemsScraped === 0 && second.cacheHits >= 2;
  console.log(ok ? "\n✅ Cache working: run 2 scraped 0 items and hit cache ≥2 times" : "\n❌ Cache did NOT behave as expected");
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error("testCacheHit failed:", err);
  process.exit(1);
});
