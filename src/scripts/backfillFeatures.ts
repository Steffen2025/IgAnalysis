import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { audits, posts, competitor_posts, competitors } from "../db/schema.js";
import { extractFeatures } from "../services/patterns/featureExtractor.js";

function tally(counts: Record<string, number>, key: string) {
  counts[key] = (counts[key] ?? 0) + 1;
}

async function main() {
  // Build audit city lookup for content element detection
  const auditRows = db.select({ id: audits.id, city: audits.city }).from(audits).all();
  const cityByAudit = new Map(auditRows.map((a) => [a.id, a.city]));

  // Build competitor→audit_id lookup
  const compRows = db.select({ id: competitors.id, audit_id: competitors.audit_id }).from(competitors).all();
  const auditByComp = new Map(compRows.map((c) => [c.id, c.audit_id]));

  // ── Client posts ────────────────────────────────────────────────────────────
  const allPosts = db.select().from(posts).all();
  const hookTallyClient: Record<string, number> = {};
  const toneTallyClient: Record<string, number> = {};
  let clientUpdated = 0;

  for (let i = 0; i < allPosts.length; i++) {
    const p = allPosts[i];
    const city = cityByAudit.get(p.audit_id);
    const f = extractFeatures(p, city);
    db.update(posts)
      .set({
        caption_length: f.caption_length,
        emoji_count: f.emoji_count,
        emoji_density: f.emoji_density,
        hook_type: f.hook_type,
        tone: f.tone,
        content_elements: JSON.stringify(f.content_elements),
        hashtag_count: f.hashtag_count,
      })
      .where(eq(posts.id, p.id))
      .run();
    tally(hookTallyClient, f.hook_type);
    tally(toneTallyClient, f.tone);
    clientUpdated++;
    if (clientUpdated % 100 === 0) process.stdout.write(`  client posts: ${clientUpdated}/${allPosts.length}\n`);
  }

  // ── Competitor posts ────────────────────────────────────────────────────────
  const allCompPosts = db.select().from(competitor_posts).all();
  const hookTallyComp: Record<string, number> = {};
  const toneTallyComp: Record<string, number> = {};
  let compUpdated = 0;

  for (let i = 0; i < allCompPosts.length; i++) {
    const p = allCompPosts[i];
    const auditId = auditByComp.get(p.competitor_id) ?? p.audit_id;
    const city = cityByAudit.get(auditId);
    const f = extractFeatures(p, city);
    db.update(competitor_posts)
      .set({
        caption_length: f.caption_length,
        emoji_count: f.emoji_count,
        emoji_density: f.emoji_density,
        hook_type: f.hook_type,
        tone: f.tone,
        content_elements: JSON.stringify(f.content_elements),
        hashtag_count: f.hashtag_count,
      })
      .where(eq(competitor_posts.id, p.id))
      .run();
    tally(hookTallyComp, f.hook_type);
    tally(toneTallyComp, f.tone);
    compUpdated++;
    if (compUpdated % 100 === 0) process.stdout.write(`  competitor posts: ${compUpdated}/${allCompPosts.length}\n`);
  }

  // ── Report ──────────────────────────────────────────────────────────────────
  const combined: Record<string, number> = {};
  for (const [k, v] of Object.entries(hookTallyClient)) combined[k] = (combined[k] ?? 0) + v;
  for (const [k, v] of Object.entries(hookTallyComp)) combined[k] = (combined[k] ?? 0) + v;

  const combinedTone: Record<string, number> = {};
  for (const [k, v] of Object.entries(toneTallyClient)) combinedTone[k] = (combinedTone[k] ?? 0) + v;
  for (const [k, v] of Object.entries(toneTallyComp)) combinedTone[k] = (combinedTone[k] ?? 0) + v;

  console.log(`\n✅ Backfill complete`);
  console.log(`   Client posts updated : ${clientUpdated}`);
  console.log(`   Competitor posts updated: ${compUpdated}`);

  console.log(`\n📊 Hook type distribution (all posts):`);
  for (const [k, v] of Object.entries(combined).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${k.padEnd(18)} ${v}`);
  }

  console.log(`\n🎭 Tone distribution (all posts):`);
  for (const [k, v] of Object.entries(combinedTone).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${k.padEnd(18)} ${v}`);
  }
}

main().catch((err) => {
  console.error("backfillFeatures failed:", err);
  process.exit(1);
});
