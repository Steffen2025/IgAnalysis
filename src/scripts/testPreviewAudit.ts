import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits, posts, profiles, scrape_jobs } from "../db/schema.js";
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

async function main() {
  const [audit] = await db.insert(audits).values(PURE_PITA).returning();
  console.log(`Inserted audit id=${audit.id}`);

  const result = await runAudit({ auditId: audit.id, tier: "preview" });

  console.log("\nResult:");
  console.log(JSON.stringify(result, null, 2));

  const profileCount = db
    .select({ c: sql<number>`count(*)` })
    .from(profiles)
    .where(eq(profiles.audit_id, audit.id))
    .all()[0].c;

  const postCount = db
    .select({ c: sql<number>`count(*)` })
    .from(posts)
    .where(eq(posts.audit_id, audit.id))
    .all()[0].c;

  const jobCount = db
    .select({ c: sql<number>`count(*)` })
    .from(scrape_jobs)
    .where(eq(scrape_jobs.audit_id, audit.id))
    .all()[0].c;

  console.log(`\nRows for audit_id=${audit.id}:`);
  console.log(`  profiles:    ${profileCount}`);
  console.log(`  posts:       ${postCount}`);
  console.log(`  scrape_jobs: ${jobCount}`);
  console.log(`  cacheHits:   ${result.cacheHits}`);
  console.log(`  itemsScraped: ${result.itemsScraped}`);
  console.log(`  Estimated cost: $${(result.itemsScraped * 0.0015).toFixed(4)}`);
}

main().catch((err) => {
  console.error("testPreviewAudit failed:", err);
  process.exit(1);
});
