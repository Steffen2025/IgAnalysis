import Database from "better-sqlite3";
import path from "node:path";
import { sqlClient } from "../db/index.js";

const TABLES = [
  "audits",
  "scrape_cache",
  "profiles",
  "posts",
  "competitors",
  "competitor_profiles",
  "competitor_posts",
  "content_patterns",
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
  "llm_cache",
] as const;

const BOOLEAN_COLUMNS: Record<string, string[]> = {
  profiles: ["is_business", "is_verified"],
  posts: ["has_cta", "has_local_reference"],
  competitors: ["deep_scraped"],
  competitor_profiles: ["is_business"],
  competitor_posts: ["has_cta"],
  hashtags: ["geo_enhanced"],
  comments: ["has_question", "has_tag"],
};

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function normalizeRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...row };
  for (const column of BOOLEAN_COLUMNS[table] ?? []) {
    if (copy[column] === 0) copy[column] = false;
    if (copy[column] === 1) copy[column] = true;
  }
  return copy;
}

async function targetHasData(): Promise<boolean> {
  const rows = await sqlClient<{ count: string }[]>`select count(*)::text as count from audits`;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function resetTarget(): Promise<void> {
  const tableList = TABLES.map(quoteIdentifier).join(", ");
  await sqlClient.unsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

async function resetSequences(): Promise<void> {
  for (const table of TABLES) {
    await sqlClient.unsafe(`
      SELECT setval(
        pg_get_serial_sequence('${table}', 'id'),
        COALESCE((SELECT MAX(id) FROM ${quoteIdentifier(table)}), 0) + 1,
        false
      )
    `);
  }
}

async function copyTable(sqlite: Database.Database, table: string): Promise<number> {
  const columns = sqlite
    .prepare(`PRAGMA table_info(${quoteIdentifier(table)})`)
    .all()
    .map((column) => (column as { name: string }).name);
  if (columns.length === 0) return 0;

  const rows = sqlite.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all() as Record<string, unknown>[];
  if (rows.length === 0) return 0;

  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((row) => normalizeRow(table, row));
    await sqlClient`INSERT INTO ${sqlClient(table)} ${sqlClient(chunk, columns)}`;
  }
  return rows.length;
}

async function main(): Promise<void> {
  const sqlitePath = path.resolve(
    process.cwd(),
    process.env.SQLITE_DATABASE_PATH ?? "data/botlogix.db",
  );
  const overwrite = process.env.MIGRATE_SQLITE_OVERWRITE === "true";
  const sqlite = new Database(sqlitePath, { readonly: true });

  try {
    if ((await targetHasData()) && !overwrite) {
      throw new Error(
        "Postgres already has audit rows. Set MIGRATE_SQLITE_OVERWRITE=true to clear and import.",
      );
    }

    if (overwrite) await resetTarget();

    for (const table of TABLES) {
      const count = await copyTable(sqlite, table);
      console.log(`[sqlite->pg] ${table}: ${count}`);
    }
    await resetSequences();
    console.log("[sqlite->pg] done");
  } finally {
    sqlite.close();
    await sqlClient.end();
  }
}

main().catch(async (error) => {
  console.error("[sqlite->pg] failed", error);
  await sqlClient.end();
  process.exit(1);
});
