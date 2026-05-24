export interface ScoreSignal {
  key: string;
  label: string;
  fired: boolean;
  value: string | number;
  weight: number;
  earned: number;
  note?: string;
}

export interface ScoreResult {
  score: number | null;
  maxPossible: number;
  signals: ScoreSignal[];
  explanation: string;
  computedAt: Date;
}

export type ScoreCategory =
  | "profile_conversion"
  | "content_performance"
  | "local_visibility"
  | "sales_readiness"
  | "competitor_gap"
  | "overall";

export const SCORE_CATEGORIES: ScoreCategory[] = [
  "profile_conversion",
  "content_performance",
  "local_visibility",
  "sales_readiness",
  "competitor_gap",
  "overall",
];

/** Build a signal entry with `earned` clamped to [0, weight]. */
export function signal(
  key: string,
  label: string,
  fired: boolean,
  value: string | number,
  weight: number,
  earned: number,
  note?: string,
): ScoreSignal {
  const clamped = Math.max(0, Math.min(weight, earned));
  return { key, label, fired, value, weight, earned: Math.round(clamped * 100) / 100, note };
}

/** Sum a list of signals into a 0–100 integer score. */
export function tallyScore(signals: ScoreSignal[]): number {
  const raw = signals.reduce((s, x) => s + x.earned, 0);
  return Math.max(0, Math.min(100, Math.round(raw)));
}
