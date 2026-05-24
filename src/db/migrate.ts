import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { db, sqlite } from "./index";

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");

function run() {
  console.log(`[migrate] applying migrations from ${MIGRATIONS_FOLDER}`);
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

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
    "scrape_cache",
    "content_patterns",
    "llm_cache",
  ];

  for (const t of tables) {
    sqlite.exec(`
      CREATE TRIGGER IF NOT EXISTS trg_${t}_updated_at
      AFTER UPDATE ON ${t}
      FOR EACH ROW
      BEGIN
        UPDATE ${t} SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END;
    `);
  }

  console.log("[migrate] done");
}

run();
