import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits } from "../db/schema.js";
import { buildGeoTokens, isClientGeoTag, isGeoTag } from "../services/audit/geoTagFilter.js";
import { collectTopHashtags } from "../services/audit/hashtagAnalysis.js";

interface Case {
  tag: string;
  expectGeo: boolean;
  note?: string;
}

const CASES: Case[] = [
  // Should be FLAGGED as geo
  { tag: "nycdining", expectGeo: true },
  { tag: "nyceats", expectGeo: true },
  { tag: "hobokeneats", expectGeo: true },
  { tag: "hobokenpizza", expectGeo: true },
  { tag: "hobokenlife", expectGeo: true },
  { tag: "torontofood", expectGeo: true },
  { tag: "torontolife", expectGeo: true },
  { tag: "brooklyneats", expectGeo: true },
  { tag: "manhattanlife", expectGeo: true },
  { tag: "austineats", expectGeo: true, note: "audit-supplied ref market" },
  { tag: "portlandcoffee", expectGeo: true, note: "audit-supplied ref market" },
  { tag: "seattlefoodie", expectGeo: true, note: "audit-supplied ref market" },
  { tag: "torontoeats", expectGeo: true, note: "client city" },
  { tag: "yyzeats", expectGeo: true, note: "short abbrev at start" },
  { tag: "foodieatx", expectGeo: true, note: "short abbrev at end" },

  // Should NOT be flagged
  { tag: "foodie", expectGeo: false },
  { tag: "mediterraneanfood", expectGeo: false },
  { tag: "foodphotography", expectGeo: false },
  { tag: "healthyeats", expectGeo: false },
  { tag: "lamb", expectGeo: false, note: "must not match 'la' inside" },
  { tag: "softserve", expectGeo: false, note: "must not match 'sf' inside" },
  { tag: "smallplates", expectGeo: false },
  { tag: "weekendvibes", expectGeo: false },
];

async function main() {
  // 1. Toronto-Mediterranean client with Austin/Portland/Seattle reference markets.
  const torontoAudit = {
    city: "Toronto",
    service_area: "Greater Toronto Area, ON",
    reference_markets: JSON.stringify(["Austin, TX", "Portland, OR", "Seattle, WA"]),
  };
  const tokens = buildGeoTokens(torontoAudit);

  console.log("=== Toronto client — any-geo classifier ===");
  let pass = true;
  for (const c of CASES) {
    const got = isGeoTag(c.tag, tokens);
    const ok = got === c.expectGeo;
    if (!ok) pass = false;
    const status = ok ? "✅" : "❌";
    const expected = c.expectGeo ? "GEO" : "OK ";
    const actual = got ? "GEO" : "OK ";
    console.log(`  ${status} #${c.tag.padEnd(22)} expected=${expected} got=${actual}${c.note ? "  // " + c.note : ""}`);
  }
  if (!pass) {
    console.error("\n❌ any-geo classifier failed");
    process.exit(1);
  }

  // 2. Burlington realtor — client-geo classifier must distinguish "own turf" from "other markets".
  console.log("\n=== Burlington realtor — client-geo (claimable) classifier ===");
  const burlingtonAudit = {
    city: "Burlington",
    service_area: "Burlington, ON",
    reference_markets: JSON.stringify(["Austin, TX", "Nashville, TN"]),
  };
  const bt = buildGeoTokens(burlingtonAudit);

  const claimables: { tag: string; expectClient: boolean; note?: string }[] = [
    { tag: "burlington", expectClient: true, note: "client's own city" },
    { tag: "burlingtonlife", expectClient: true },
    { tag: "burlingtonrealtor", expectClient: true },
    { tag: "burlingtonhomes", expectClient: true },
    { tag: "austineats", expectClient: false, note: "reference market — NOT claimable" },
    { tag: "nashvillerealtor", expectClient: false, note: "reference market — NOT claimable" },
    { tag: "nycdining", expectClient: false, note: "off-market — NOT claimable" },
    { tag: "realtor", expectClient: false, note: "geo-neutral (strategic, not branded)" },
    { tag: "firsttimehomebuyer", expectClient: false, note: "strategic, not branded" },
  ];
  for (const c of claimables) {
    const got = isClientGeoTag(c.tag, bt);
    const ok = got === c.expectClient;
    if (!ok) pass = false;
    const status = ok ? "✅" : "❌";
    const expected = c.expectClient ? "CLAIM" : "----";
    const actual = got ? "CLAIM" : "----";
    console.log(`  ${status} #${c.tag.padEnd(22)} expected=${expected} got=${actual}${c.note ? "  // " + c.note : ""}`);
  }
  if (!pass) {
    console.error("\n❌ client-geo classifier failed");
    process.exit(1);
  }

  console.log("\n✅ All unit cases passed.");

  // 2. Re-run collectTopHashtags against the already-scraped audits to see the
  //    filter in action on real data (no new scrapes — purely reads DB).
  console.log("\n=== Re-evaluating prior audits with filter applied ===");
  const allAudits = db
    .select({
      id: audits.id,
      business_name: audits.business_name,
      mode: audits.mode,
      city: audits.city,
    })
    .from(audits)
    .all();

  for (const a of allAudits) {
    if (!a.business_name) continue;
    const top = await collectTopHashtags(a.id);
    if (
      top.branded_local.length === 0 &&
      top.strategic.length === 0 &&
      top.local.length === 0
    )
      continue;
    console.log(`\nAudit ${a.id} (${a.business_name}, mode=${a.mode}, city=${a.city})`);
    console.log(`  branded_local: ${top.branded_local.map((t) => "#" + t).join(", ") || "(none)"}`);
    console.log(`  strategic:     ${top.strategic.map((t) => "#" + t).join(", ") || "(none)"}`);
    console.log(`  local awareness: ${top.local.map((t) => "#" + t).join(", ") || "(none)"}`);
  }
}

main().catch((err) => {
  console.error("testGeoTagFilter failed:", err);
  process.exit(1);
});
