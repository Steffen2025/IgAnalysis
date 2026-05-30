import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import { content_patterns, posts, competitor_posts } from "../../db/schema.js";
import { AuditPhase, setPhase } from "../audit/auditState.js";
import { extractFeatures } from "./featureExtractor.js";
import { analyzePatterns, type PatternResult } from "./patternAnalyzer.js";
import { checkHashtagHygiene, type HashtagHygieneResult } from "./hashtagHygiene.js";
import { analyzeClientGap, type GapFinding } from "./clientGapAnalysis.js";
import { audits, competitors } from "../../db/schema.js";

export interface PatternRunResult {
  auditId: number;
  patterns: {
    category: PatternResult;
    client: PatternResult;
  };
  hashtagHygiene: HashtagHygieneResult;
  gaps: GapFinding[];
  errors: string[];
}

/** Inline backfill for any posts still missing hook_type (idempotent). */
async function ensureFeatures(auditId: number): Promise<number> {
  const audit = await first(db.select({ city: audits.city }).from(audits).where(eq(audits.id, auditId)).limit(1));
  const city = audit?.city ?? null;

  // Client posts missing features
  const missingClient = await db
    .select()
    .from(posts)
    .where(and(eq(posts.audit_id, auditId), isNull(posts.hook_type)));

  for (const p of missingClient) {
    const f = extractFeatures(p, city);
    await db.update(posts)
      .set({
        caption_length: f.caption_length,
        emoji_count: f.emoji_count,
        emoji_density: f.emoji_density,
        hook_type: f.hook_type,
        tone: f.tone,
        content_elements: JSON.stringify(f.content_elements),
        hashtag_count: f.hashtag_count,
      })
      .where(eq(posts.id, p.id));
  }

  // Competitor posts missing features
  const compIds = (await db
    .select({ id: competitors.id })
    .from(competitors)
    .where(eq(competitors.audit_id, auditId)))
    .map((c) => c.id);

  let missingCompCount = 0;
  for (const compId of compIds) {
    const missingComp = await db
      .select()
      .from(competitor_posts)
      .where(and(eq(competitor_posts.competitor_id, compId), isNull(competitor_posts.hook_type)));
    for (const p of missingComp) {
      const f = extractFeatures(p, city);
      await db.update(competitor_posts)
        .set({
          caption_length: f.caption_length,
          emoji_count: f.emoji_count,
          emoji_density: f.emoji_density,
          hook_type: f.hook_type,
          tone: f.tone,
          content_elements: JSON.stringify(f.content_elements),
          hashtag_count: f.hashtag_count,
        })
        .where(eq(competitor_posts.id, p.id));
      missingCompCount++;
    }
  }

  const total = missingClient.length + missingCompCount;
  if (total > 0) {
    console.log(`  ⚡ Inline feature backfill: ${missingClient.length} client + ${missingCompCount} competitor posts updated`);
  }
  return total;
}

export async function runPatternAnalysis(auditId: number): Promise<PatternRunResult> {
  const errors: string[] = [];

  // 1. Ensure features exist
  try {
    await ensureFeatures(auditId);
  } catch (err) {
    errors.push(`ensureFeatures: ${(err as Error).message}`);
  }

  // 2. Pattern analysis
  let categoryPatterns!: PatternResult;
  let clientPatterns!: PatternResult;
  try {
    categoryPatterns = await analyzePatterns(auditId, "category_corpus");
    clientPatterns = await analyzePatterns(auditId, "client_only");
  } catch (err) {
    errors.push(`patternAnalysis: ${(err as Error).message}`);
    categoryPatterns = categoryPatterns ?? { scope: "category_corpus", postCount: 0, caption: { avgLength: 0, distribution: { short: 0, medium: 0, long: 0, very_long: 0 }, avgEmojiCount: 0, avgEmojiDensity: 0 }, hooks: { topHook: "unknown", distribution: {}, bestPerformingHookByEngagement: null }, tones: { topTone: "unknown", distribution: {}, bestPerformingToneByEngagement: null }, contentElements: { distribution: {}, bestPerformingElementByEngagement: null }, postTypes: { distribution: {}, bestPerformingByEngagement: null }, hashtags: { avgCountPerPost: 0, recommendedRange: [8, 15] }, topPostExamples: [] };
    clientPatterns = clientPatterns ?? { ...categoryPatterns, scope: "client_only" };
  }

  // 3. Hashtag hygiene
  let hashtagHygiene!: HashtagHygieneResult;
  try {
    hashtagHygiene = await checkHashtagHygiene(auditId);
  } catch (err) {
    errors.push(`hashtagHygiene: ${(err as Error).message}`);
    hashtagHygiene = { avgCountPerPost: 0, countAssessment: "too_few", brandPollutionDetected: [], clientUsesOwnGeo: false, topClientHashtags: [], notes: [] };
  }

  // 4. Gap analysis
  let gaps: GapFinding[] = [];
  try {
    const gapResult = await analyzeClientGap(auditId);
    gaps = gapResult.gaps;
  } catch (err) {
    errors.push(`clientGapAnalysis: ${(err as Error).message}`);
  }

  // 5. Persist to DB
  try {
    for (const scope of ["category_corpus", "client_only"] as const) {
      const pat = scope === "category_corpus" ? categoryPatterns : clientPatterns;
      // Upsert: delete existing then insert
      await db.delete(content_patterns)
        .where(and(eq(content_patterns.audit_id, auditId), eq(content_patterns.scope, scope)))
      await db.insert(content_patterns)
        .values({
          audit_id: auditId,
          scope,
          patterns_json: JSON.stringify(pat),
          post_count: pat.postCount,
          calculated_at: new Date().toISOString(),
        });
    }
  } catch (err) {
    errors.push(`persist: ${(err as Error).message}`);
  }

  // 6. Advance phase
  try {
    await setPhase(auditId, AuditPhase.CONTENT_PATTERNS_COMPLETE);
  } catch (err) {
    errors.push(`setPhase: ${(err as Error).message}`);
  }

  return {
    auditId,
    patterns: { category: categoryPatterns, client: clientPatterns },
    hashtagHygiene,
    gaps,
    errors,
  };
}
