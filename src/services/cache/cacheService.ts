import crypto from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import { scrape_cache } from "../../db/schema.js";

export const TTL_PROFILE = 7 * 24 * 3600;
export const TTL_POSTS = 24 * 3600;
export const TTL_HASHTAG = 7 * 24 * 3600;
export const TTL_GOOGLE = 30 * 24 * 3600;
export const TTL_COMMENTS = 7 * 24 * 3600;

export function makeCacheKey(actorKey: string, identifier: string): string {
  let id = identifier.trim().toLowerCase();
  if (id.length > 100) {
    id = crypto.createHash("sha1").update(id).digest("hex");
  }
  return `${actorKey}:${id}`;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const now = new Date().toISOString();
  const row = await first(db
    .select()
    .from(scrape_cache)
    .where(and(eq(scrape_cache.cache_key, key), gt(scrape_cache.expires_at, now)))
    .limit(1));
  if (!row) return null;
  try {
    return JSON.parse(row.data_json) as T;
  } catch {
    return null;
  }
}

export async function setCached(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  const now = new Date();
  const expires_at = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  const scraped_at = now.toISOString();
  const data_json = JSON.stringify(data);

  await db.insert(scrape_cache)
    .values({ cache_key: key, data_json, scraped_at, expires_at })
    .onConflictDoUpdate({
      target: scrape_cache.cache_key,
      set: {
        data_json,
        scraped_at,
        expires_at,
        updated_at: scraped_at,
      },
    });
}

export async function clearExpired(): Promise<number> {
  const now = new Date().toISOString();
  const deleted = await db
    .delete(scrape_cache)
    .where(lt(scrape_cache.expires_at, now))
    .returning({ id: scrape_cache.id });
  return deleted.length;
}
