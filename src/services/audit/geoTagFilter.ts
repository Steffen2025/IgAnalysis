import type { Audit } from "../../db/schema.js";
import { MAJOR_NA_CITIES } from "./referenceMarkets.js";

/**
 * Geo-locked hashtag detector.
 *
 * Premise: a hashtag that names a place (#nycdining, #hobokeneats, #torontofood)
 * is useless as a content suggestion because the client can't credibly use it
 * outside that geography. Only generic topic/category tags belong in the
 * strategic bucket. Geo tags are still kept in the local-awareness bucket —
 * there for "here's what locals are doing" context, not for mirroring.
 */

// Long, distinctive geo tokens — safe to substring-match anywhere in a tag.
const LONG_GEO_TOKENS = new Set<string>([
  // MAJOR_NA_CITIES city names (without spaces)
  ...MAJOR_NA_CITIES.map((c) => c.city.toLowerCase().replace(/\s+/g, "")),
  // Common metros, boroughs, neighborhoods that show up in foodie/lifestyle tags
  "hoboken",
  "brooklyn",
  "manhattan",
  "queens",
  "bronx",
  "soho",
  "tribeca",
  "harlem",
  "chelsea",
  "midtown",
  "westside",
  "eastside",
  "downtown",
  "uptown",
  "bayarea",
  "siliconvalley",
  "etobicoke",
  "scarborough",
  "northyork",
  "mississauga",
  "burlington",
  "hamilton",
  "oakville",
  // Country / nationality
  "usa",
  "canada",
  "canadian",
  "american",
  "america",
]);

// Short, distinctive abbreviations — must appear at start or end of a tag,
// not in the middle (avoids false positives like "la" inside "lamb").
const SHORT_GEO_ABBREVS = new Set<string>([
  "nyc",
  "atx", // Austin
  "yyz", // Toronto airport
  "yvr", // Vancouver
  "yyc", // Calgary
  "pdx", // Portland
  "dmv", // DC metro
  "sfo",
]);

export interface GeoTokenSets {
  /** All geo tokens — both the static dictionary AND the client's own + reference markets. */
  long: Set<string>;
  short: Set<string>;
  /** Just the client's own geo (city + service-area region). These tags are CLAIMABLE. */
  clientLong: Set<string>;
  clientShort: Set<string>;
}

/**
 * Build the geo token set used at runtime. Splits client's own geo (claimable)
 * from everyone else's (quarantine).
 */
export function buildGeoTokens(
  audit: Pick<Audit, "city" | "reference_markets" | "service_area">,
): GeoTokenSets {
  const long = new Set(LONG_GEO_TOKENS);
  const short = new Set(SHORT_GEO_ABBREVS);
  const clientLong = new Set<string>();
  const clientShort = new Set<string>();

  const addClientToken = (raw: string | null | undefined) => {
    if (!raw) return;
    const t = raw.toLowerCase().replace(/\s+/g, "");
    if (!t) return;
    if (t.length >= 4) {
      long.add(t);
      clientLong.add(t);
    } else {
      short.add(t);
      clientShort.add(t);
    }
  };

  addClientToken(audit.city);

  // Pull region tokens out of service_area too (e.g. "Burlington downtown, ON" → ON; "Greater Toronto Area" → toronto).
  if (audit.service_area) {
    const parts = audit.service_area.split(/[\s,]+/).filter(Boolean);
    for (const p of parts) addClientToken(p);
  }

  if (audit.reference_markets) {
    try {
      const arr = JSON.parse(audit.reference_markets) as unknown;
      if (Array.isArray(arr)) {
        for (const m of arr) {
          if (typeof m !== "string") continue;
          const t = m.split(",")[0].trim().toLowerCase().replace(/\s+/g, "");
          if (t.length >= 4) long.add(t);
          else if (t.length > 0) short.add(t);
          // Deliberately NOT added to clientLong/clientShort — these are *other* markets.
        }
      }
    } catch {
      /* ignore malformed reference_markets */
    }
  }

  return { long, short, clientLong, clientShort };
}

function matches(
  tag: string,
  long: Set<string>,
  short: Set<string>,
): boolean {
  const t = tag.toLowerCase().replace(/^#/, "");
  if (!t) return false;
  for (const token of long) {
    if (token.length >= 4 && t.includes(token)) return true;
  }
  for (const token of short) {
    if (token.length >= 2 && (t.startsWith(token) || t.endsWith(token))) {
      return true;
    }
  }
  return false;
}

/** Any geo tag — client's own OR someone else's. */
export function isGeoTag(tag: string, tokens: GeoTokenSets): boolean {
  return matches(tag, tokens.long, tokens.short);
}

/** Tag is rooted in the CLIENT'S own geography — claimable. */
export function isClientGeoTag(tag: string, tokens: GeoTokenSets): boolean {
  return matches(tag, tokens.clientLong, tokens.clientShort);
}
