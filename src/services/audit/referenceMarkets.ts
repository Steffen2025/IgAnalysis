import type { Audit } from "../../db/schema.js";

export interface ReferenceMarket {
  city: string;
  region: string;
  country: "CA" | "US";
}

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

const CA_REGIONS = new Set(MAJOR_NA_CITIES.filter((c) => c.country === "CA").map((c) => c.region));
const US_REGIONS = new Set(MAJOR_NA_CITIES.filter((c) => c.country === "US").map((c) => c.region));

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
  const cityLower = (clientCity ?? "").trim().toLowerCase();
  const region = (clientRegion ?? "").trim().toUpperCase();
  const clientCountry = inferCountry(region);

  const eligible = MAJOR_NA_CITIES.filter((c) => {
    if (c.city.toLowerCase() === cityLower) return false;
    if (region && c.region === region) return false;
    return true;
  });

  if (clientCountry === null) return eligible.slice(0, count);

  const otherCountry = eligible.filter((c) => c.country !== clientCountry);
  const sameCountry = eligible.filter((c) => c.country === clientCountry);

  // Canadian client → one US market first, then fill from same country.
  // US client → one Canadian market first, then fill from same country.
  const ordered: ReferenceMarket[] = [];
  if (otherCountry.length > 0) ordered.push(otherCountry[0]);
  ordered.push(...sameCountry);
  ordered.push(...otherCountry.slice(1));

  return ordered.slice(0, count);
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
  const suggestions = suggestReferenceMarkets(city, region, 3);
  return suggestions.map((m) => `${m.city}, ${m.region}`);
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

function guessRegionFromServiceArea(serviceArea: string | null | undefined): string | null {
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
