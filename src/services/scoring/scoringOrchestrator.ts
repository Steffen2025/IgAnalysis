import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { scores } from "../../db/schema.js";
import { AuditPhase, setPhase } from "../audit/auditState.js";
import { enhanceLocalReferences } from "./enhancers/localReferenceEnhancer.js";
import { scoreCompetitorGap } from "./scores/competitorGapScore.js";
import { scoreContentPerformance } from "./scores/contentPerformanceScore.js";
import { scoreLocalVisibility } from "./scores/localVisibilityScore.js";
import { scoreOverall } from "./scores/overallScore.js";
import { scoreProfileConversion } from "./scores/profileConversionScore.js";
import { scoreSalesReadiness } from "./scores/salesReadinessScore.js";
import type { ScoreCategory, ScoreResult } from "./types.js";

export interface ScoringRun {
  auditId: number;
  scores: Record<ScoreCategory, ScoreResult>;
  totalSignalsFired: number;
  errors: string[];
}

function emptyResult(category: ScoreCategory, errMsg: string): ScoreResult {
  return {
    score: 0,
    maxPossible: 100,
    signals: [],
    explanation: `Score "${category}" failed: ${errMsg}`,
    computedAt: new Date(),
  };
}

export async function runScoring(auditId: number): Promise<ScoringRun> {
  const errors: string[] = [];

  // 1. Enhancer pass — flags has_local_reference on posts before scoring.
  try {
    const r = enhanceLocalReferences(auditId);
    console.log(
      `Local-reference enhancer: scanned ${r.postsScanned}, flagged ${r.postsFlagged} (terms: ${r.terms.join(", ") || "—"})`,
    );
  } catch (err) {
    const msg = (err as Error).message;
    errors.push(`enhancer: ${msg}`);
  }

  // 2. Five sub-scores in parallel (they are synchronous internally — Promise.all
  //    keeps the orchestration shape async + future-proof for an LLM-backed signal).
  const subEntries = [
    ["profile_conversion", () => scoreProfileConversion(auditId)] as const,
    ["content_performance", () => scoreContentPerformance(auditId)] as const,
    ["local_visibility", () => scoreLocalVisibility(auditId)] as const,
    ["sales_readiness", () => scoreSalesReadiness(auditId)] as const,
    ["competitor_gap", () => scoreCompetitorGap(auditId)] as const,
  ];

  const subResults = await Promise.all(
    subEntries.map(async ([key, fn]) => {
      try {
        return { key, result: fn() };
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        errors.push(`${key}: ${msg}`);
        return { key, result: emptyResult(key, msg) };
      }
    }),
  );

  const map = Object.fromEntries(subResults.map((r) => [r.key, r.result])) as Record<
    ScoreCategory,
    ScoreResult
  >;

  // 3. Overall composite.
  let overall: ScoreResult;
  try {
    overall = scoreOverall({
      profile_conversion: map.profile_conversion,
      content_performance: map.content_performance,
      local_visibility: map.local_visibility,
      sales_readiness: map.sales_readiness,
      competitor_gap: map.competitor_gap,
    });
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    errors.push(`overall: ${msg}`);
    overall = emptyResult("overall", msg);
  }
  map.overall = overall;

  // 4. Persist — delete prior row for this audit, insert fresh.
  db.delete(scores).where(eq(scores.audit_id, auditId)).run();
  db.insert(scores)
    .values({
      audit_id: auditId,
      profile_conversion_score: map.profile_conversion.score ?? null,
      content_performance_score: map.content_performance.score ?? null,
      local_visibility_score: map.local_visibility.score ?? null,
      sales_readiness_score: map.sales_readiness.score ?? null,
      competitor_gap_score: map.competitor_gap.score, // explicitly nullable
      overall_score: map.overall.score ?? null,
      score_explanations: JSON.stringify(map),
      calculated_at: new Date().toISOString(),
    })
    .run();

  // 5. Phase advance.
  try {
    setPhase(auditId, AuditPhase.SCORING_COMPLETE);
  } catch (err) {
    errors.push(`setPhase: ${(err as Error).message}`);
  }

  const totalSignalsFired = Object.values(map).reduce(
    (sum, r) => sum + r.signals.filter((s) => s.fired).length,
    0,
  );

  return { auditId, scores: map, totalSignalsFired, errors };
}
