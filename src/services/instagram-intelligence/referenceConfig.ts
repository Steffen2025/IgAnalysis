/**
 * Reference-model discovery config.
 *
 * Reference models are the *aspirational* competitors a client should study —
 * successful but reachable accounts, intentionally pulled from major metros
 * (not the client's local market) and constrained to a follower band so the
 * tactics actually transfer.
 *
 * All values are env-configurable; the defaults encode the product decision:
 * study accounts in the 20k–100k "successful but reachable" band.
 */

export interface FollowerBand {
  min: number;
  max: number;
}

function envInt(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function envList(name: string, fallback: string[]): string[] {
  const v = process.env[name];
  if (!v) return fallback;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Major metros used to source top-performing reference models. */
export function referenceMarkets(): string[] {
  return envList("REFERENCE_MARKETS", ["New York, NY", "Boston, MA", "Chicago, IL"]);
}

/**
 * "Successful but reachable" band — category-kind aware.
 *
 * Consumer/creator/app/retail brands have large national accounts, so the
 * aspirational band is 20k–100k. Local trades and professional services
 * (garage doors, mortgage, landscaping) simply don't have 20k+ IG accounts —
 * a *successful* local operator may sit at 3k–30k with strong engagement — so
 * their band floors much lower. Env vars override the defaults entirely.
 */
export function referenceFollowerBand(kind?: string): FollowerBand {
  const localish = kind === "service" || kind === "professional" || kind === "generic";
  const defMin = localish ? 2000 : 20000;
  const defMax = localish ? 75000 : 100000;
  return {
    min: envInt("REFERENCE_FOLLOWERS_MIN", defMin),
    max: envInt("REFERENCE_FOLLOWERS_MAX", defMax),
  };
}

/**
 * Local "success story" band — the size of a genuinely-winning *local* account
 * (smaller than national reference models). Two of these feed the local layer.
 */
export function localSuccessBand(): FollowerBand {
  return {
    min: envInt("LOCAL_SUCCESS_FOLLOWERS_MIN", 5000),
    max: envInt("LOCAL_SUCCESS_FOLLOWERS_MAX", 50000),
  };
}

/** Where a candidate sits relative to the band → 0..100 fit score. */
export function followerBandFit(followers: number | null | undefined, band: FollowerBand): number {
  if (followers == null) return 0;
  if (followers >= band.min && followers <= band.max) return 100;
  // Within 25% outside the band → partial credit; further out → 0.
  const lowEdge = band.min * 0.75;
  const highEdge = band.max * 1.25;
  if (followers >= lowEdge && followers < band.min) return 50;
  if (followers > band.max && followers <= highEdge) return 50;
  return 0;
}

/** Hard gate: is this follower count acceptable for a reference model? */
export function inReferenceBand(followers: number | null | undefined, band: FollowerBand): "in" | "out" | "unknown" {
  if (followers == null) return "unknown";
  const lowEdge = band.min * 0.75;
  const highEdge = band.max * 1.25;
  return followers >= lowEdge && followers <= highEdge ? "in" : "out";
}
