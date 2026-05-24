export interface NormalizedGoogleResult {
  title: string | null;
  url: string | null;
  description: string | null;
  position: number | null;
  raw_json: string;
}

type AnyObj = Record<string, unknown>;
const obj = (v: unknown): AnyObj =>
  v && typeof v === "object" ? (v as AnyObj) : {};
const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;

export function normalizeGoogleResult(raw: unknown): NormalizedGoogleResult {
  const r = obj(raw);
  return {
    title: str(r.title),
    url: str(r.url),
    description: str(r.description),
    position: num(r.position),
    raw_json: JSON.stringify(raw),
  };
}
