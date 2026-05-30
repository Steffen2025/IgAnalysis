/**
 * Persistent competitor library.
 *
 * Discovery quality should compound across audits, not reset each time. Every
 * vetted (selected) competitor is stored keyed by (normalized_category, region,
 * follower_band). The next audit in the same category/region inherits these as
 * seed handles — so the 5th mortgage broker benefits from the first four.
 *
 * The table self-bootstraps (CREATE IF NOT EXISTS) to match this repo's
 * migration convention. We never store fabricated data — only handles we
 * actually selected, with their score + reason.
 */

import { sqlClient } from "../../db/index.js";
import type { CompetitorDecision, CompetitorTrack } from "./goldMasterSchema.js";

let bootstrapped = false;

async function ensureTable(): Promise<void> {
  if (bootstrapped) return;
  await sqlClient`
    CREATE TABLE IF NOT EXISTS competitor_library (
      id serial PRIMARY KEY,
      handle text NOT NULL,
      normalized_category text NOT NULL,
      region text NOT NULL DEFAULT '',
      track text NOT NULL,
      follower_count integer,
      follower_band text,
      relevance_score integer NOT NULL DEFAULT 0,
      reason_code text,
      source_audit_id integer,
      last_seen timestamptz NOT NULL DEFAULT now(),
      UNIQUE (handle, normalized_category, region)
    )`;
  bootstrapped = true;
}

function bandLabel(followers: number | null | undefined): string {
  if (followers == null) return "unknown";
  if (followers < 20000) return "<20k";
  if (followers <= 100000) return "20k-100k";
  return ">100k";
}

export interface LibraryEntry {
  handle: string;
  track: CompetitorTrack;
  followerCount: number | null;
  relevanceScore: number;
  reasonCode: string;
}

/** Persist selected competitors for reuse by future audits. Never throws. */
export async function saveSelectedToLibrary(
  category: string,
  region: string,
  auditId: number,
  decisions: Array<CompetitorDecision & { followerCount?: number | null }>,
): Promise<number> {
  try {
    await ensureTable();
    let n = 0;
    for (const d of decisions) {
      if (!d.code.startsWith("selected")) continue;
      const fc = d.followerCount ?? null;
      await sqlClient`
        INSERT INTO competitor_library (handle, normalized_category, region, track, follower_count, follower_band, relevance_score, reason_code, source_audit_id, last_seen)
        VALUES (${d.handle.toLowerCase()}, ${category}, ${region}, ${d.track}, ${fc}, ${bandLabel(fc)}, ${d.confidenceScore}, ${d.code}, ${auditId}, now())
        ON CONFLICT (handle, normalized_category, region)
        DO UPDATE SET relevance_score = GREATEST(competitor_library.relevance_score, EXCLUDED.relevance_score),
                      reason_code = EXCLUDED.reason_code, follower_count = EXCLUDED.follower_count,
                      follower_band = EXCLUDED.follower_band, source_audit_id = EXCLUDED.source_audit_id, last_seen = now()`;
      n++;
    }
    return n;
  } catch (err) {
    console.warn(`[competitor-library] save skipped: ${(err as Error).message}`);
    return 0;
  }
}

/**
 * Fetch previously-vetted competitor handles for a category/region. Used to seed
 * future (live) discovery — surfaces accounts proven relevant in prior audits.
 */
export async function fetchLibrarySeeds(category: string, region: string, limit = 12): Promise<LibraryEntry[]> {
  try {
    await ensureTable();
    const rows = await sqlClient`
      SELECT handle, track, follower_count, relevance_score, reason_code
      FROM competitor_library
      WHERE normalized_category = ${category} AND (region = ${region} OR track = 'reference')
      ORDER BY relevance_score DESC
      LIMIT ${limit}`;
    return rows.map((r: Record<string, unknown>) => ({
      handle: r.handle as string,
      track: r.track as CompetitorTrack,
      followerCount: (r.follower_count as number | null) ?? null,
      relevanceScore: (r.relevance_score as number) ?? 0,
      reasonCode: (r.reason_code as string) ?? "",
    }));
  } catch (err) {
    console.warn(`[competitor-library] fetch skipped: ${(err as Error).message}`);
    return [];
  }
}
