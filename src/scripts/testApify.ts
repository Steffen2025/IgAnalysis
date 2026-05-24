import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits, scrape_jobs } from "../db/schema.js";
import {
  ACTORS,
  INPUT_TEMPLATES,
  runActorAndGetData,
  validateToken,
  normalizeProfile,
} from "../services/apify/index.js";

async function main() {
  validateToken();
  console.log("Token found");

  const [audit] = await db
    .insert(audits)
    .values({
      business_name: "Test Business",
      instagram_url: "https://www.instagram.com/instagram/",
      website_url: "https://instagram.com",
      city: "New York",
      service_area: "Manhattan",
      business_category: "Social Media",
      main_offer: "Photo sharing",
      target_audience: "Everyone",
      follower_goal: "0",
      business_outcome: "Test run",
      report_type: "growth",
      status: "queued",
    })
    .returning();

  const testAuditId = audit.id;
  console.log(`Inserted test audit id=${testAuditId}`);

  const { runRecord, items } = await runActorAndGetData({
    actorId: ACTORS.INSTAGRAM.id,
    actorLabel: "Test — profile lookup",
    auditId: testAuditId,
    input: {
      ...INPUT_TEMPLATES.INSTAGRAM_PROFILE_LOOKUP,
      directUrls: ["https://www.instagram.com/instagram/"],
    },
  });

  console.log(`\nItems returned: ${items.length}`);

  if (items.length === 0) {
    console.error(
      "No items returned. Run record:",
      JSON.stringify(runRecord, null, 2),
    );
    process.exit(1);
  }

  const normalized = normalizeProfile(items[0]);
  console.log("\nNormalized profile:");
  console.log(
    JSON.stringify(
      { ...normalized, raw_json: `[${normalized.raw_json.length} chars]` },
      null,
      2,
    ),
  );

  const jobs = await db
    .select()
    .from(scrape_jobs)
    .where(eq(scrape_jobs.audit_id, testAuditId));

  console.log("\nscrape_jobs rows for this audit:");
  console.log(JSON.stringify(jobs, null, 2));
}

main().catch((err) => {
  console.error("testApify failed:", err);
  process.exit(1);
});
