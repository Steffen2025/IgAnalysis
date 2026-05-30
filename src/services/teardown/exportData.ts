import { mkdirSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import {
  teardown_artifacts,
  teardown_content,
  teardowns,
  type TeardownContent,
} from "../../db/schema.js";
import {
  buildIntegrityReport,
  renderIntegrityMarkdown,
  type IntegrityReport,
} from "./integrityReport.js";

export interface ExportResult {
  dir: string;
  jsonPath: string;
  csvPath: string;
  integrityPath: string;
  integrity: IntegrityReport;
}

function jsonParseArray(raw: string | null): unknown {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

const CSV_COLUMNS: Array<keyof TeardownContent> = [
  "shortcode",
  "content_type",
  "posted_at",
  "like_count",
  "comment_count",
  "play_count",
  "engagement_rate",
  "caption_length",
  "hashtag_count",
  "child_count",
  "is_story",
  "cover_url",
  "video_url",
  "caption",
];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value).replace(/\r?\n/g, " ");
  if (/[",]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: TeardownContent[]): string {
  const header = CSV_COLUMNS.join(",");
  const body = rows
    .map((row) => CSV_COLUMNS.map((col) => csvCell(row[col])).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

async function recordArtifact(
  teardownId: number,
  kind: "json" | "csv" | "markdown",
  filePath: string,
): Promise<void> {
  let size = 0;
  try {
    size = statSync(filePath).size;
  } catch {
    size = 0;
  }
  await db.insert(teardown_artifacts).values({
    teardown_id: teardownId,
    kind,
    path: filePath,
    size_bytes: size,
  });
}

export async function exportTeardownData(
  teardownId: number,
  baseDir = path.resolve("reports", "teardown"),
): Promise<ExportResult> {
  const teardown = await first(
    db.select().from(teardowns).where(eq(teardowns.id, teardownId)).limit(1),
  );
  if (!teardown) throw new Error(`Teardown ${teardownId} not found`);

  const content = await db
    .select()
    .from(teardown_content)
    .where(eq(teardown_content.teardown_id, teardownId))
    .orderBy(asc(teardown_content.posted_at));

  const integrity = buildIntegrityReport(teardown, content);

  const handle = (teardown.target_handle ?? "account").replace(/[^a-z0-9_.-]/gi, "");
  const dir = path.join(baseDir, `${handle}-${teardownId}-${dateStamp()}`);
  mkdirSync(dir, { recursive: true });

  // dataset.json — full structured capture (profile snapshot + content + integrity).
  const dataset = {
    teardown: {
      id: teardown.id,
      target_url: teardown.target_url,
      target_handle: teardown.target_handle,
      business_unit: teardown.business_unit,
      captured_at: teardown.completed_at ?? new Date().toISOString(),
      profile: {
        full_name: teardown.full_name,
        bio: teardown.bio,
        follower_count: teardown.follower_count,
        following_count: teardown.following_count,
        post_count: teardown.post_count,
        is_business: teardown.is_business,
        is_verified: teardown.is_verified,
        category: teardown.category,
        external_url_in_bio: teardown.external_url_in_bio,
        highlight_titles: jsonParseArray(teardown.highlight_titles),
      },
    },
    content: content.map((c) => ({
      ...c,
      hashtags: jsonParseArray(c.hashtags),
      mentions: jsonParseArray(c.mentions),
      child_media: jsonParseArray(c.child_media),
      raw_json: undefined,
    })),
    integrity,
  };

  const jsonPath = path.join(dir, "dataset.json");
  const csvPath = path.join(dir, "content.csv");
  const integrityPath = path.join(dir, "integrity.md");

  writeFileSync(jsonPath, JSON.stringify(dataset, null, 2), "utf-8");
  writeFileSync(csvPath, toCsv(content), "utf-8");
  writeFileSync(integrityPath, renderIntegrityMarkdown(integrity), "utf-8");

  await recordArtifact(teardownId, "json", jsonPath);
  await recordArtifact(teardownId, "csv", csvPath);
  await recordArtifact(teardownId, "markdown", integrityPath);

  // Persist the integrity report onto the teardown row for quick inspection.
  await db
    .update(teardowns)
    .set({ integrity_json: JSON.stringify(integrity) })
    .where(eq(teardowns.id, teardownId));

  return { dir, jsonPath, csvPath, integrityPath, integrity };
}
