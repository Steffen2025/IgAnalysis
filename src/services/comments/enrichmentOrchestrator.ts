import { AuditPhase, getPhase, setPhase } from "../audit/auditState.js";
import { findTargetPostsForComments } from "./commentTargeting.js";
import { scrapeCommentsForTargets } from "./commentScrape.js";
import { analyzeComments, type CommentAnalysisResult } from "./commentAnalysis.js";
import { enhanceGeoHashtags, type GeoEnhancerResult } from "../llm/geoEnhancer.js";

export interface EnrichmentResult {
  auditId: number;
  comments: {
    scraped: number;
    cacheHits: number;
    postsProcessed: number;
  };
  geo: GeoEnhancerResult;
  commentAnalysis: CommentAnalysisResult;
  errors: string[];
}

/**
 * Step 5.5 enrichment orchestrator.
 *
 * Prerequisites: audit must be at CONTENT_PATTERNS_COMPLETE phase or beyond.
 * Phases advanced: → ENRICHMENT_COMPLETE
 */
export async function runEnrichment(auditId: number): Promise<EnrichmentResult> {
  const errors: string[] = [];

  // Verify phase
  const phase = getPhase(auditId);
  const completedPhases: AuditPhase[] = [
    AuditPhase.CONTENT_PATTERNS_COMPLETE,
    AuditPhase.ENRICHMENT_COMPLETE,
    AuditPhase.ANALYZING,
    AuditPhase.COMPLETE,
  ];
  if (!completedPhases.includes(phase)) {
    throw new Error(
      `runEnrichment: audit ${auditId} is at phase ${phase}. ` +
      `Must be at CONTENT_PATTERNS_COMPLETE or beyond. Run pattern analysis first.`,
    );
  }

  // Step 1: Find target posts
  let targets: Awaited<ReturnType<typeof findTargetPostsForComments>> = [];
  try {
    targets = await findTargetPostsForComments(auditId);
    console.log(`  Found ${targets.length} target posts for comment scraping`);
    for (const t of targets) {
      console.log(`    ${t.reason} @${t.username} — ${t.shortcode} (ER: ${(t.engagementRate * 100).toFixed(2)}%)`);
    }
  } catch (err) {
    errors.push(`findTargetPosts: ${(err as Error).message}`);
  }

  // Step 2: Scrape comments
  let scrapeResult = { scraped: 0, cacheHits: 0, postsProcessed: 0, errors: [] as string[] };
  if (targets.length > 0) {
    try {
      scrapeResult = await scrapeCommentsForTargets(auditId, targets);
      errors.push(...scrapeResult.errors);
    } catch (err) {
      errors.push(`scrapeComments: ${(err as Error).message}`);
    }
  }

  // Step 3: Analyze comments deterministically
  let commentAnalysis: CommentAnalysisResult = {
    totalComments: 0,
    byCompetitorType: {},
    questionRate: 0,
    tagRate: 0,
    avgLength: 0,
    topQuestions: [],
    topTaggingComments: [],
    topPraiseTokens: [],
    topConcerns: [],
    audienceLanguage: [],
  };
  try {
    commentAnalysis = await analyzeComments(auditId);
  } catch (err) {
    errors.push(`analyzeComments: ${(err as Error).message}`);
  }

  // Step 4: Geo hashtag enhancement (LLM)
  let geo: GeoEnhancerResult = { enhanced: 0, addedGeoTerms: [] };
  try {
    geo = await enhanceGeoHashtags(auditId);
  } catch (err) {
    errors.push(`geoEnhancer: ${(err as Error).message}`);
  }

  // Step 5: Advance phase
  try {
    setPhase(auditId, AuditPhase.ENRICHMENT_COMPLETE);
  } catch (err) {
    errors.push(`setPhase: ${(err as Error).message}`);
  }

  return {
    auditId,
    comments: {
      scraped: scrapeResult.scraped,
      cacheHits: scrapeResult.cacheHits,
      postsProcessed: scrapeResult.postsProcessed,
    },
    geo,
    commentAnalysis,
    errors,
  };
}
