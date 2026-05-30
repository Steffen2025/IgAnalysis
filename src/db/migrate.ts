import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { db, sqlClient } from "./index.js";

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle-pg");

async function run() {
  console.log(`[migrate] applying migrations from ${MIGRATIONS_FOLDER}`);
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

  // updated_at auto-touch triggers — Drizzle doesn't generate these.
  const tables = [
    "audits",
    "profiles",
    "posts",
    "competitors",
    "competitor_profiles",
    "competitor_posts",
    "hashtags",
    "comments",
    "scrape_jobs",
    "scores",
    "recommendations",
    "content_ideas",
    "calendar_items",
    "report_sections",
    "report_artifacts",
    "report_deliveries",
    "scrape_cache",
    "content_patterns",
    "llm_cache",
    "teardowns",
    "teardown_content",
    "reel_transcripts",
    "cover_analyses",
    "teardown_comments",
    "teardown_artifacts",
  ];

  for (const t of tables) {
    await sqlClient`
      CREATE OR REPLACE FUNCTION touch_updated_at()
      RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = (CURRENT_TIMESTAMP)::text;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    await sqlClient.unsafe(`DROP TRIGGER IF EXISTS trg_${t}_updated_at ON ${t};`);
    await sqlClient.unsafe(`
      CREATE TRIGGER trg_${t}_updated_at
      BEFORE UPDATE ON ${t}
      FOR EACH ROW
      EXECUTE FUNCTION touch_updated_at();
    `);
  }

  console.log("[migrate] done");
  await sqlClient.end();
}

run().catch(async (error) => {
  console.error("[migrate] failed", error);
  await sqlClient.end();
  process.exit(1);
});
