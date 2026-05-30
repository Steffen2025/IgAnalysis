import { formatMarketLabel, guessRegionFromServiceArea } from "./referenceMarkets.js";

export type MarketTier = "primary" | "nearby" | "regional";

export interface GeoMarket {
  city: string;
  region: string;
  tier: MarketTier;
  /** Stored on competitor rows — honest label for decks and reports. */
  label: string;
  /** Used in Google / IG place search strings. */
  searchTerm: string;
}

/**
 * Neighbor + regional rings for Ontario local-business audits.
 * When primary-city Google stalls, discovery walks outward in this order.
 */
const ON_GEO_GRAPH: Record<string, { neighbors: string[]; regional: string[] }> = {
  waterdown: {
    neighbors: ["Hamilton", "Burlington", "Ancaster", "Dundas", "Stoney Creek"],
    regional: ["Oakville", "Milton", "Mississauga"],
  },
  burlington: {
    neighbors: ["Hamilton", "Oakville", "Waterdown", "Milton", "Ancaster"],
    regional: ["Mississauga", "Toronto", "Stoney Creek"],
  },
  hamilton: {
    neighbors: ["Burlington", "Stoney Creek", "Ancaster", "Waterdown", "Brantford"],
    regional: ["Oakville", "Mississauga", "Toronto"],
  },
  oakville: {
    neighbors: ["Burlington", "Mississauga", "Milton", "Hamilton"],
    regional: ["Toronto", "Brampton"],
  },
  mississauga: {
    neighbors: ["Brampton", "Oakville", "Toronto", "Etobicoke", "Burlington"],
    regional: ["Hamilton", "Vaughan"],
  },
  toronto: {
    neighbors: ["Mississauga", "North York", "Scarborough", "Etobicoke", "Vaughan"],
    regional: ["Hamilton", "Oakville", "Brampton"],
  },
  kitchener: {
    neighbors: ["Waterloo", "Cambridge", "Guelph"],
    regional: ["Hamilton", "Mississauga"],
  },
  waterloo: {
    neighbors: ["Kitchener", "Cambridge", "Guelph"],
    regional: ["Hamilton", "Mississauga"],
  },
  guelph: {
    neighbors: ["Kitchener", "Cambridge", "Milton"],
    regional: ["Hamilton", "Mississauga"],
  },
  london: {
    neighbors: ["St Thomas", "Woodstock", "Strathroy"],
    regional: ["Kitchener", "Hamilton"],
  },
  windsor: {
    neighbors: ["Tecumseh", "LaSalle", "Amherstburg"],
    regional: ["London", "Hamilton"],
  },
  ottawa: {
    neighbors: ["Kanata", "Nepean", "Orleans", "Gatineau"],
    regional: ["Kingston", "Montreal"],
  },
  calgary: {
    neighbors: ["Airdrie", "Cochrane", "Okotoks"],
    regional: ["Edmonton", "Red Deer"],
  },
  edmonton: {
    neighbors: ["St Albert", "Sherwood Park", "Leduc"],
    regional: ["Calgary", "Red Deer"],
  },
};

const TIER_SUFFIX: Record<MarketTier, string> = {
  primary: "",
  nearby: " · nearby market",
  regional: " · expanded search",
};

export function formatDiscoveryMarketLabel(
  city: string,
  region: string,
  tier: MarketTier,
): string {
  const base = region ? `${city}, ${region}` : city;
  return `${base}${TIER_SUFFIX[tier]}`;
}

/** Cities implied by regional service-area text (Halton, GTA, Golden Horseshoe, etc.). */
export function citiesFromServiceArea(
  serviceArea: string | null | undefined,
  region: string,
): string[] {
  const text = (serviceArea ?? "").toLowerCase();
  const out: string[] = [];
  const add = (city: string) => {
    if (!out.some((x) => x.toLowerCase() === city.toLowerCase())) out.push(city);
  };

  if (/halton|burlington|oakville|milton|waterdown|ancaster/.test(text)) {
    add("Burlington");
    add("Oakville");
    add("Milton");
    add("Hamilton");
  }
  if (/hamilton|steel town|golden horseshoe|niagara/.test(text)) {
    add("Hamilton");
    add("Stoney Creek");
    add("Burlington");
  }
  if (/gta|greater toronto|peel|mississauga|brampton|vaughan|etobicoke|scarborough|north york/.test(text)) {
    add("Toronto");
    add("Mississauga");
    add("Brampton");
    add("Oakville");
  }
  if (/kitchener|waterloo|guelph|kw/.test(text)) {
    add("Kitchener");
    add("Waterloo");
    add("Guelph");
  }
  if (/london ontario|southwestern ontario/.test(text)) {
    add("London");
    add("Kitchener");
  }
  if (/ottawa|national capital/.test(text)) {
    add("Ottawa");
    add("Kanata");
  }
  if (/calgary|southern alberta/.test(text)) {
    add("Calgary");
    add("Airdrie");
  }
  if (/edmonton|northern alberta/.test(text)) {
    add("Edmonton");
    add("St Albert");
  }

  if (out.length === 0 && region === "ON") {
    add("Hamilton");
    add("Burlington");
  }

  return out;
}

function dedupeGeoMarkets(markets: GeoMarket[], clientCity: string): GeoMarket[] {
  const clientKey = clientCity.trim().toLowerCase();
  const seen = new Set<string>();
  const out: GeoMarket[] = [];
  for (const m of markets) {
    const key = m.city.trim().toLowerCase();
    if (!key || key === clientKey || seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

export function buildGeoMarkets(
  city: string,
  serviceArea: string | null | undefined,
): GeoMarket[] {
  const cleanCity = city.trim();
  if (!cleanCity) return [];

  const region = guessRegionFromServiceArea(serviceArea) ?? "ON";
  const primaryLabel = formatMarketLabel(cleanCity, serviceArea);
  const markets: GeoMarket[] = [
    {
      city: cleanCity,
      region,
      tier: "primary",
      label: formatDiscoveryMarketLabel(cleanCity, region, "primary"),
      searchTerm: primaryLabel,
    },
  ];

  const serviceAreaCities = citiesFromServiceArea(serviceArea, region);
  for (const cityName of serviceAreaCities) {
    if (cityName.toLowerCase() === cleanCity.toLowerCase()) continue;
    markets.push({
      city: cityName,
      region,
      tier: "nearby",
      label: formatDiscoveryMarketLabel(cityName, region, "nearby"),
      searchTerm: `${cityName}, ${region}`,
    });
  }

  const graph = ON_GEO_GRAPH[cleanCity.toLowerCase()];
  if (graph) {
    for (const neighbor of graph.neighbors) {
      markets.push({
        city: neighbor,
        region,
        tier: "nearby",
        label: formatDiscoveryMarketLabel(neighbor, region, "nearby"),
        searchTerm: region ? `${neighbor}, ${region}` : neighbor,
      });
    }
    for (const regional of graph.regional) {
      markets.push({
        city: regional,
        region,
        tier: "regional",
        label: formatDiscoveryMarketLabel(regional, region, "regional"),
        searchTerm: region ? `${regional}, ${region}` : regional,
      });
    }
  } else if (region === "ON") {
    for (const neighbor of ["Hamilton", "Oakville", "Milton"]) {
      if (neighbor.toLowerCase() === cleanCity.toLowerCase()) continue;
      markets.push({
        city: neighbor,
        region,
        tier: "nearby",
        label: formatDiscoveryMarketLabel(neighbor, region, "nearby"),
        searchTerm: `${neighbor}, ${region}`,
      });
    }
    for (const regional of ["Toronto", "Mississauga"]) {
      if (regional.toLowerCase() === cleanCity.toLowerCase()) continue;
      markets.push({
        city: regional,
        region,
        tier: "regional",
        label: formatDiscoveryMarketLabel(regional, region, "regional"),
        searchTerm: `${regional}, ${region}`,
      });
    }
  } else if (region) {
    markets.push({
      city: cleanCity,
      region,
      tier: "nearby",
      label: formatDiscoveryMarketLabel(`${cleanCity} area`, region, "nearby"),
      searchTerm: serviceArea?.trim() || primaryLabel,
    });
  }

  return dedupeGeoMarkets(markets, cleanCity);
}

export function tierRank(tier: MarketTier): number {
  return tier === "primary" ? 0 : tier === "nearby" ? 1 : 2;
}

export function isExpandedLocalMarket(label: string | null | undefined): boolean {
  const text = (label ?? "").toLowerCase();
  return text.includes("nearby market") || text.includes("expanded search");
}
