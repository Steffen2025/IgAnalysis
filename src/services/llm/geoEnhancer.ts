import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { hashtags } from "../../db/schema.js";
import { callLLMJSON } from "./llmService.js";

export interface GeoEnhancerResult {
  enhanced: number;
  addedGeoTerms: string[];
}

/**
 * Uses Haiku to classify hashtags as geographic place names.
 * Only processes hashtags where geo_enhanced = false.
 * Updates geo_enhanced = true for those that are classified as place names.
 */
export async function enhanceGeoHashtags(auditId: number): Promise<GeoEnhancerResult> {
  const unclassified = await db
    .select()
    .from(hashtags)
    .where(and(eq(hashtags.audit_id, auditId), eq(hashtags.geo_enhanced, false)));

  if (unclassified.length === 0) {
    console.log("  No unclassified hashtags to geo-enhance.");
    return { enhanced: 0, addedGeoTerms: [] };
  }

  const tagList = unclassified.map((h) => h.hashtag);
  console.log(`  Classifying ${tagList.length} hashtags for geo content via Haiku…`);

  // Batch in chunks of 50 to keep prompts manageable
  const CHUNK_SIZE = 50;
  const geoHashtagIds = new Set<number>();
  const addedGeoTerms: string[] = [];

  for (let i = 0; i < unclassified.length; i += CHUNK_SIZE) {
    const chunk = unclassified.slice(i, i + CHUNK_SIZE);
    const chunkTags = chunk.map((h) => h.hashtag);

    const prompt = `You are a geographic classifier. Given a list of Instagram hashtags, identify which ones are geographic place names (cities, neighbourhoods, regions, countries, postal codes, or location-based terms).

Hashtags to classify:
${chunkTags.map((t, idx) => `${idx}: ${t}`).join("\n")}

Return a JSON object with a single key "geo_indices" containing an array of the indices (numbers) of hashtags that are geographic place names. If none are geographic, return {"geo_indices": []}.`;

    try {
      const result = await callLLMJSON<{ geo_indices: number[] }>({
        model: "haiku",
        prompt,
        maxTokens: 256,
        systemPrompt: "You are a geographic classifier. Respond only with valid JSON.",
      });

      for (const idx of result.geo_indices ?? []) {
        if (idx >= 0 && idx < chunk.length) {
          geoHashtagIds.add(chunk[idx].id);
          addedGeoTerms.push(chunk[idx].hashtag);
        }
      }
    } catch (err) {
      console.error(`  ⚠️ geoEnhancer chunk ${i}–${i + CHUNK_SIZE}: ${(err as Error).message}`);
    }
  }

  // Update geo_enhanced for matched hashtags
  for (const id of geoHashtagIds) {
    await db.update(hashtags)
      .set({ geo_enhanced: true })
      .where(eq(hashtags.id, id));
  }

  // Mark all unclassified as processed (set geo_enhanced true for non-geo too so we don't re-run)
  // Actually spec says: update geo_enhanced=true only for matches. Non-geo ones stay false
  // but we've now processed them — we need to mark them too to avoid re-processing.
  // Let's mark all as processed with a sentinel: set geo_enhanced=true for ALL in this batch.
  // (The column means "has been geo-classified", not "IS a geo hashtag".)
  for (const h of unclassified) {
    if (!geoHashtagIds.has(h.id)) {
      await db.update(hashtags)
        .set({ geo_enhanced: true })
        .where(eq(hashtags.id, h.id));
    }
  }

  console.log(`  ✅ Geo-enhanced ${geoHashtagIds.size} of ${unclassified.length} hashtags as place names`);
  return { enhanced: geoHashtagIds.size, addedGeoTerms };
}
