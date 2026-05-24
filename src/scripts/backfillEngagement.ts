import { desc, eq, isNotNull } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  competitor_posts,
  competitor_profiles,
  posts,
  profiles,
} from "../db/schema.js";

function computeRate(likes: number, comments: number, followers: number): number | null {
  if (!followers || followers <= 0) return null;
  return (likes + comments) / followers;
}

function backfillClientPosts(): { updated: number; skipped: number } {
  const allPosts = db.select().from(posts).all();
  let updated = 0;
  let skipped = 0;

  // Cache one profile lookup per audit_id.
  const profileFollowerByAudit = new Map<number, number | null>();

  for (const p of allPosts) {
    let followers = profileFollowerByAudit.get(p.audit_id);
    if (followers === undefined) {
      const prof = db
        .select({ fc: profiles.follower_count })
        .from(profiles)
        .where(eq(profiles.audit_id, p.audit_id))
        .orderBy(desc(profiles.scraped_at))
        .limit(1)
        .all()[0];
      followers = prof?.fc ?? null;
      profileFollowerByAudit.set(p.audit_id, followers);
    }
    if (!followers) {
      skipped++;
      continue;
    }
    const rate = computeRate(p.like_count ?? 0, p.comment_count ?? 0, followers);
    db.update(posts)
      .set({ engagement_rate: rate, follower_count_snapshot: followers })
      .where(eq(posts.id, p.id))
      .run();
    updated++;
  }

  return { updated, skipped };
}

function backfillCompetitorPosts(): { updated: number; skipped: number } {
  const allCompPosts = db.select().from(competitor_posts).all();
  let updated = 0;
  let skipped = 0;

  const followerByCompetitor = new Map<number, number | null>();

  for (const p of allCompPosts) {
    let followers = followerByCompetitor.get(p.competitor_id);
    if (followers === undefined) {
      const cp = db
        .select({ fc: competitor_profiles.follower_count })
        .from(competitor_profiles)
        .where(eq(competitor_profiles.competitor_id, p.competitor_id))
        .orderBy(desc(competitor_profiles.scraped_at))
        .limit(1)
        .all()[0];
      followers = cp?.fc ?? null;
      followerByCompetitor.set(p.competitor_id, followers);
    }
    if (!followers) {
      skipped++;
      continue;
    }
    const rate = computeRate(p.like_count ?? 0, p.comment_count ?? 0, followers);
    db.update(competitor_posts)
      .set({ engagement_rate: rate, follower_count_snapshot: followers })
      .where(eq(competitor_posts.id, p.id))
      .run();
    updated++;
  }

  return { updated, skipped };
}

function main() {
  console.log("Backfilling engagement_rate + follower_count_snapshot...");
  const c = backfillClientPosts();
  console.log(`  Client posts:     updated=${c.updated}  skipped=${c.skipped}`);
  const comp = backfillCompetitorPosts();
  console.log(`  Competitor posts: updated=${comp.updated}  skipped=${comp.skipped}`);

  // Quick sanity sample
  const samplePosts = db
    .select({
      id: posts.id,
      audit_id: posts.audit_id,
      likes: posts.like_count,
      comments: posts.comment_count,
      followers: posts.follower_count_snapshot,
      rate: posts.engagement_rate,
    })
    .from(posts)
    .where(isNotNull(posts.engagement_rate))
    .limit(3)
    .all();
  console.log("\nSample client posts with engagement:");
  for (const s of samplePosts) {
    console.log(
      `  post#${s.id} audit=${s.audit_id} ${s.likes}♥+${s.comments}💬 / ${s.followers} = ${((s.rate ?? 0) * 100).toFixed(3)}%`,
    );
  }
}

main();
