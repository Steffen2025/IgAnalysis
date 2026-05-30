import type { Audit } from "../../db/schema.js";

export interface ReferenceMarket {
  city: string;
  region: string;
  country: "CA" | "US";
}

export const CANADIAN_REFERENCE_MARKETS: ReferenceMarket[] = [
  { city: "Windsor", region: "ON", country: "CA" },
  { city: "London", region: "ON", country: "CA" },
  { city: "Ottawa", region: "ON", country: "CA" },
];

export const AMERICAN_REFERENCE_MARKETS: ReferenceMarket[] = [
  { city: "New York City", region: "NY", country: "US" },
  { city: "Chicago", region: "IL", country: "US" },
  { city: "Denver", region: "CO", country: "US" },
];

export const MAJOR_NA_CITIES: ReferenceMarket[] = [
  { city: "Toronto", region: "ON", country: "CA" },
  { city: "Vancouver", region: "BC", country: "CA" },
  { city: "Calgary", region: "AB", country: "CA" },
  { city: "Montreal", region: "QC", country: "CA" },
  { city: "Ottawa", region: "ON", country: "CA" },
  { city: "Halifax", region: "NS", country: "CA" },
  { city: "Edmonton", region: "AB", country: "CA" },
  { city: "Winnipeg", region: "MB", country: "CA" },
  { city: "New York", region: "NY", country: "US" },
  { city: "Los Angeles", region: "CA", country: "US" },
  { city: "Chicago", region: "IL", country: "US" },
  { city: "Austin", region: "TX", country: "US" },
  { city: "Portland", region: "OR", country: "US" },
  { city: "Seattle", region: "WA", country: "US" },
  { city: "Denver", region: "CO", country: "US" },
  { city: "Miami", region: "FL", country: "US" },
  { city: "Boston", region: "MA", country: "US" },
  { city: "Nashville", region: "TN", country: "US" },
  { city: "Atlanta", region: "GA", country: "US" },
  { city: "Phoenix", region: "AZ", country: "US" },
];

export const includeAmericanReferenceModels = (process.env.INCLUDE_AMERICAN_REFERENCE_MODELS ?? "").toLowerCase() === "true";

const CA_REGIONS = new Set(["ON", "QC", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE", "NT", "NU", "YT"]);
const US_REGIONS = new Set(["TX", "TN", "CO", "NY", "CA", "OR", "WA", "FL", "MA", "GA", "AZ", "IL"]);

function inferCountry(region: string): "CA" | "US" | null {
  if (CA_REGIONS.has(region)) return "CA";
  if (US_REGIONS.has(region)) return "US";
  return null;
}

export function suggestReferenceMarkets(
  clientCity: string,
  clientRegion: string,
  count = 3,
): ReferenceMarket[] {
  const region = (clientRegion ?? "").trim().toUpperCase();
  const clientCountry = inferCountry(region);

  const base = [...CANADIAN_REFERENCE_MARKETS];
  if (includeAmericanReferenceModels) {
    base.push(...AMERICAN_REFERENCE_MARKETS);
  }

  if (clientCountry === "US" && includeAmericanReferenceModels) {
    const ordered = [...AMERICAN_REFERENCE_MARKETS, ...CANADIAN_REFERENCE_MARKETS];
    return ordered.slice(0, count);
  }

  return base.slice(0, count);
}

export function resolveReferenceMarkets(audit: Audit): string[] {
  if (audit.reference_markets) {
    try {
      const parsed = JSON.parse(audit.reference_markets) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((m): m is string => typeof m === "string");
      }
    } catch {
      /* fall through to suggestion */
    }
  }

  const city = audit.city ?? "";
  const region = guessRegionFromServiceArea(audit.service_area) ?? "";
  const suggestions = referenceMarketsForAudit(city, region, audit.business_category, 5);
  return suggestions.map((m) => `${m.city}, ${m.region}`);
}

/** Canadian province/territory suffix in "City, ON" style labels. */
const CA_REGION_SUFFIX =
  /,\s*(on|qc|bc|ab|mb|sk|ns|nb|nl|pe|nt|nu|yt)\b/i;

function dedupeMarketsByCity(
  markets: ReferenceMarket[],
  excludeCity: string,
): ReferenceMarket[] {
  const exclude = excludeCity.trim().toLowerCase();
  const seen = new Set<string>();
  const out: ReferenceMarket[] = [];
  for (const market of markets) {
    const key = market.city.trim().toLowerCase();
    if (!key || key === exclude || seen.has(key)) continue;
    seen.add(key);
    out.push(market);
  }
  return out;
}

/** Reference cities used for discovery — wider for marketing categories in ON. */
export function referenceMarketsForAudit(
  clientCity: string,
  clientRegion: string,
  businessCategory: string | null | undefined,
  count = 3,
): ReferenceMarket[] {
  const base = suggestReferenceMarkets(clientCity, clientRegion, count);
  const cat = (businessCategory ?? "").toLowerCase();
  const region = clientRegion.trim().toUpperCase();
  if (region === "ON" && /marketing|social media|digital|agency|advertis/.test(cat)) {
    return dedupeMarketsByCity(
      [
        { city: "Toronto", region: "ON", country: "CA" },
        { city: "Hamilton", region: "ON", country: "CA" },
        ...CANADIAN_REFERENCE_MARKETS,
      ],
      clientCity,
    ).slice(0, Math.max(count, 5));
  }
  return base;
}

export function isAllowedReferenceMarketLabel(label: string | null | undefined): boolean {
  const text = (label ?? "").toLowerCase();
  if (!text) return false;
  if (CA_REGION_SUFFIX.test(label ?? "")) return true;
  if (
    text.includes("windsor")
    || text.includes("ottawa")
    || text.includes("toronto")
    || text.includes("hamilton")
    || text.includes("kitchener")
    || text.includes("waterloo")
    || text.includes("mississauga")
  ) {
    return true;
  }
  // "London, ON" — avoid matching London UK without province suffix
  if (text.includes("london") && text.includes(", on")) return true;
  if (!includeAmericanReferenceModels) return false;
  return text.includes("new york city") || text.includes("chicago") || text.includes("denver");
}

export function formatMarketLabel(
  city: string | null | undefined,
  serviceArea: string | null | undefined,
): string {
  const cleanCity = (city ?? "").trim();
  const region = guessRegionFromServiceArea(serviceArea);

  if (cleanCity && region) return `${cleanCity}, ${region}`;
  if (cleanCity) return cleanCity;
  return (serviceArea ?? "local market").trim();
}

export function formatMarketSearchTerm(
  city: string | null | undefined,
  serviceArea: string | null | undefined,
): string {
  const cleanServiceArea = (serviceArea ?? "").trim();
  if (cleanServiceArea) return cleanServiceArea;
  return formatMarketLabel(city, serviceArea);
}

/** Full province/state name → abbreviation. Covers common forms that appear in service_area text. */
const PROVINCE_STATE_NAMES: Record<string, string> = {
  ONTARIO: "ON",
  QUEBEC: "QC",
  "BRITISH COLUMBIA": "BC",
  ALBERTA: "AB",
  MANITOBA: "MB",
  SASKATCHEWAN: "SK",
  "NOVA SCOTIA": "NS",
  "NEW BRUNSWICK": "NB",
  "NEWFOUNDLAND": "NL",
  "PRINCE EDWARD ISLAND": "PE",
  "NORTHWEST TERRITORIES": "NT",
  NUNAVUT: "NU",
  YUKON: "YT",
  CALIFORNIA: "CA",
  "NEW YORK": "NY",
  ILLINOIS: "IL",
  TEXAS: "TX",
  OREGON: "OR",
  WASHINGTON: "WA",
  COLORADO: "CO",
  FLORIDA: "FL",
  MASSACHUSETTS: "MA",
  TENNESSEE: "TN",
  GEORGIA: "GA",
  ARIZONA: "AZ",
};

export function guessRegionFromServiceArea(serviceArea: string | null | undefined): string | null {
  if (!serviceArea) return null;
  const upper = serviceArea.toUpperCase();

  // Check full names first (multi-word, so check before tokenizing)
  for (const [name, code] of Object.entries(PROVINCE_STATE_NAMES)) {
    if (upper.includes(name)) return code;
  }

  // Then check abbreviation tokens
  const tokens = upper.split(/[\s,/]+/).map((t) => t.trim());
  for (const t of tokens) {
    if (CA_REGIONS.has(t) || US_REGIONS.has(t)) return t;
  }
  return null;
}
