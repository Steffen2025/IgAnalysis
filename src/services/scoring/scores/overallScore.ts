import { signal, type ScoreResult, type ScoreSignal } from "../types.js";

export const W = {
  PROFILE_CONVERSION: 0.2,
  CONTENT_PERFORMANCE: 0.25,
  LOCAL_VISIBILITY: 0.2,
  SALES_READINESS: 0.15,
  COMPETITOR_GAP: 0.2,
} as const;

export interface OverallInputs {
  profile_conversion: ScoreResult;
  content_performance: ScoreResult;
  local_visibility: ScoreResult;
  sales_readiness: ScoreResult;
  competitor_gap: ScoreResult;
}

export function scoreOverall(parts: OverallInputs): ScoreResult {
  const competitorGapApplicable = parts.competitor_gap.score !== null;

  const baseWeights: Record<string, number> = {
    profile_conversion: W.PROFILE_CONVERSION,
    content_performance: W.CONTENT_PERFORMANCE,
    local_visibility: W.LOCAL_VISIBILITY,
    sales_readiness: W.SALES_READINESS,
    competitor_gap: W.COMPETITOR_GAP,
  };

  // If no reference comps, re-weight the other 4 to sum to 1.0.
  let weights = { ...baseWeights };
  if (!competitorGapApplicable) {
    const remainingSum =
      W.PROFILE_CONVERSION + W.CONTENT_PERFORMANCE + W.LOCAL_VISIBILITY + W.SALES_READINESS;
    weights = {
      profile_conversion: W.PROFILE_CONVERSION / remainingSum,
      content_performance: W.CONTENT_PERFORMANCE / remainingSum,
      local_visibility: W.LOCAL_VISIBILITY / remainingSum,
      sales_readiness: W.SALES_READINESS / remainingSum,
      competitor_gap: 0,
    };
  }

  const entries: { key: keyof OverallInputs; label: string; weight: number; sub: ScoreResult }[] = [
    {
      key: "profile_conversion",
      label: "Profile conversion sub-score",
      weight: weights.profile_conversion,
      sub: parts.profile_conversion,
    },
    {
      key: "content_performance",
      label: "Content performance sub-score",
      weight: weights.content_performance,
      sub: parts.content_performance,
    },
    {
      key: "local_visibility",
      label: "Local visibility sub-score",
      weight: weights.local_visibility,
      sub: parts.local_visibility,
    },
    {
      key: "sales_readiness",
      label: "Sales readiness sub-score",
      weight: weights.sales_readiness,
      sub: parts.sales_readiness,
    },
    {
      key: "competitor_gap",
      label: "Competitor gap sub-score",
      weight: weights.competitor_gap,
      sub: parts.competitor_gap,
    },
  ];

  const signals: ScoreSignal[] = [];
  let weighted = 0;

  for (const e of entries) {
    const subScore = e.sub.score ?? 0;
    const contribution = subScore * e.weight;
    weighted += contribution;
    signals.push(
      signal(
        e.key,
        e.label,
        e.sub.score !== null && subScore > 0,
        e.sub.score ?? "n/a",
        Math.round(e.weight * 100), // express weight as a 0–100 share
        Math.round(contribution * 100) / 100,
        e.sub.score === null
          ? "skipped (no reference comps)"
          : `${subScore} × ${(e.weight * 100).toFixed(0)}%`,
      ),
    );
  }

  const score = Math.max(0, Math.min(100, Math.round(weighted)));
  const explanation = competitorGapApplicable
    ? `Overall ${score}/100 — weighted blend of all five sub-scores.`
    : `Overall ${score}/100 — competitor_gap was n/a, so the other four sub-scores were re-weighted to sum to 100%.`;

  return { score, maxPossible: 100, signals, explanation, computedAt: new Date() };
}
