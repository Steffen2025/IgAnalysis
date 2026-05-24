import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits, competitors } from "../db/schema.js";
import { discoverCompetitors } from "../services/audit/competitorDiscovery.js";
import { TTL_GOOGLE, makeCacheKey, setCached } from "../services/cache/cacheService.js";

// We bypass real scrapes by pre-seeding the cache with mock Google results that
// contain the same Instagram handle in both the local and reference passes.
// discoverCompetitors should then classify it as local_intel and exclude it
// from reference_model, logging "Skipped … (already in local intel)".

const CATEGORY = "Test Pizza";
const CITY = "Hamilton";
const REF_MARKETS = ["Austin, TX"];
const SHARED_HANDLE = "duplicateaccount";
const LOCAL_ONLY = "uniquelocalshop";
const REF_ONLY = "uniqueaustinshop";

function mockResult(handle: string) {
  return {
    title: `@${handle}`,
    url: `https://www.instagram.com/${handle}/`,
    description: "mock",
    position: 1,
    raw_json: "{}",
  };
}

async function main() {
  const [audit] = await db
    .insert(audits)
    .values({
      business_name: "Test Pizza Co",
      instagram_url: "https://www.instagram.com/testpizzaco/",
      website_url: "https://example.com",
      city: CITY,
      service_area: "Hamilton, ON",
      business_category: CATEGORY,
      main_offer: "Pizza",
      target_audience: "test",
      follower_goal: "1000",
      business_outcome: "test",
      report_type: "growth",
      status: "queued",
      mode: "mixed",
      reference_markets: JSON.stringify(REF_MARKETS),
    })
    .returning();
  console.log(`Inserted audit id=${audit.id}`);

  // Local queries used by discoverLocalCompetitors:
  const localQ1 = `${CATEGORY} ${CITY} instagram`;
  const localQ2 = `best ${CATEGORY} ${CITY}`;
  // Reference query for Austin:
  const refQ1 = `${CATEGORY} Austin instagram`;

  setCached(
    makeCacheKey("google_search", localQ1),
    [mockResult(SHARED_HANDLE), mockResult(LOCAL_ONLY)],
    TTL_GOOGLE,
  );
  setCached(makeCacheKey("google_search", localQ2), [], TTL_GOOGLE);
  setCached(
    makeCacheKey("google_search", refQ1),
    [mockResult(SHARED_HANDLE), mockResult(REF_ONLY)],
    TTL_GOOGLE,
  );
  console.log("Seeded cache with shared + unique handles across local and reference queries");

  console.log("\n--- Running discoverCompetitors ---");
  const auditRow = db.select().from(audits).where(eq(audits.id, audit.id)).all()[0];
  const result = await discoverCompetitors(auditRow);
  console.log("---");

  console.log("\nSkipped duplicates:", result.skippedDuplicates);

  const comps = db
    .select()
    .from(competitors)
    .where(eq(competitors.audit_id, audit.id))
    .all();

  console.log(`\nInserted competitors (${comps.length}):`);
  for (const c of comps) {
    console.log(`  @${c.username}  type=${c.competitor_type}  market=${c.geographic_market}`);
  }

  const sharedRows = comps.filter((c) => c.username === SHARED_HANDLE);
  const dupTypes = new Set(sharedRows.map((c) => c.competitor_type));

  let pass = true;
  if (sharedRows.length !== 1) {
    console.error(`❌ Expected 1 row for @${SHARED_HANDLE}, got ${sharedRows.length}`);
    pass = false;
  } else if (sharedRows[0].competitor_type !== "local_intel") {
    console.error(`❌ Shared @${SHARED_HANDLE} classified ${sharedRows[0].competitor_type}, expected local_intel`);
    pass = false;
  }
  if (!result.skippedDuplicates.includes(SHARED_HANDLE)) {
    console.error(`❌ skippedDuplicates did not include ${SHARED_HANDLE}`);
    pass = false;
  }
  if (dupTypes.has("reference_model")) {
    console.error(`❌ ${SHARED_HANDLE} also appears as reference_model`);
    pass = false;
  }

  if (pass) {
    console.log(`\n✅ No-mirror rule fired: @${SHARED_HANDLE} kept as local_intel only`);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("testNoMirrorRule failed:", err);
  process.exit(1);
});
