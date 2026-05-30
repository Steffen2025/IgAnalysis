import type { Audit } from "../../db/schema.js";
import { guessRegionFromServiceArea } from "../audit/referenceMarkets.js";
import { normalizeCategory } from "../audit/categoryNormalizer.js";

export interface ReportContext {
  instagramUrl: string;
  handle: string;
  displayName: string;
  businessName: string;
  businessDescriptionFromInstagramBio: string;
  businessLocation: {
    city: string;
    region: string;
    country: string | null;
  };
  businessClassification: string;
  /** Coarse bucket from the normalizer — drives CTA + copy tone. */
  categoryKind: "app" | "service" | "professional" | "retail" | "creator" | "generic";
  /** True when discovery/CTA should treat this as an app, not a local service. */
  isApp: boolean;
  localMarketLabel: string;
  websiteUrl: string | null;
  followerCount: number | null;
  postCount: number | null;
  postsPerWeek: number | null;
  scoreToday: number | null;
  nextCheckpointDate: string;
  preparedForName: string;
  generatedAt: string;
}

const REGION_NAMES: Record<string, string> = {
  ON: "Ontario",
  QC: "Quebec",
  BC: "British Columbia",
  AB: "Alberta",
  MB: "Manitoba",
  SK: "Saskatchewan",
  NS: "Nova Scotia",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  PE: "Prince Edward Island",
  TX: "Texas",
  TN: "Tennessee",
  CO: "Colorado",
  NY: "New York",
  CA: "California",
  VT: "Vermont",
  FL: "Florida",
  MA: "Massachusetts",
  GA: "Georgia",
  AZ: "Arizona",
  OR: "Oregon",
  WA: "Washington",
  IL: "Illinois",
};

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function meaningful(value: string | null | undefined): string {
  const cleaned = clean(value);
  return cleaned.toLowerCase() === "none" ? "" : cleaned;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/([-\s.]+)/)
    .map((part) => {
      if (/^[-\s.]+$/.test(part)) return part;
      if (!part) return part;
      if (/^(st|st\.|mc)$/i.test(part)) return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("")
    .replace(/\bSte\s+Marie\b/i, "Ste. Marie");
}

export function formatCityName(input: string | null | undefined): string {
  const value = meaningful(input);
  if (!value) return "";
  const lower = value.toLowerCase();
  const known: Record<string, string> = {
    waterdown: "Waterdown",
    burlington: "Burlington",
    hamilton: "Hamilton",
    oakville: "Oakville",
    milton: "Milton",
    mississauga: "Mississauga",
    vaughan: "Vaughan",
    toronto: "Toronto",
    ottawa: "Ottawa",
    windsor: "Windsor",
    london: "London",
    calgary: "Calgary",
    edmonton: "Edmonton",
    winnipeg: "Winnipeg",
    halifax: "Halifax",
    "north york": "North York",
    "niagara falls": "Niagara Falls",
    "st catharines": "St. Catharines",
    "sault ste marie": "Sault Ste. Marie",
  };
  return known[lower] ?? titleCase(value);
}

export function formatRegionName(input: string | null | undefined): string {
  const value = meaningful(input);
  if (!value) return "";
  const upper = value.toUpperCase();
  const abbreviations: Record<string, string> = {
    ON: "Ontario",
    QC: "Quebec",
    BC: "British Columbia",
    AB: "Alberta",
    MB: "Manitoba",
    SK: "Saskatchewan",
    NS: "Nova Scotia",
    NB: "New Brunswick",
    NL: "Newfoundland and Labrador",
    PE: "Prince Edward Island",
    NT: "Northwest Territories",
    NU: "Nunavut",
    YT: "Yukon",
    TX: "Texas",
    TN: "Tennessee",
    CO: "Colorado",
    NY: "New York",
    CA: "California",
    VT: "Vermont",
    FL: "Florida",
    MA: "Massachusetts",
    GA: "Georgia",
    AZ: "Arizona",
    OR: "Oregon",
    WA: "Washington",
    IL: "Illinois",
  };
  if (abbreviations[upper]) return abbreviations[upper];
  return titleCase(value);
}

export function formatLocationLabel(city: string | null | undefined, region: string | null | undefined): string {
  const cleanCity = formatCityName(city);
  const cleanRegion = formatRegionName(region);
  if (cleanCity && cleanRegion) return `${cleanCity}, ${cleanRegion}`;
  if (cleanCity) return cleanCity;
  return cleanRegion;
}

export function handleFromInstagramUrl(url: string | null | undefined): string {
  const raw = clean(url);
  const match = raw.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (match) return match[1].toLowerCase();
  return raw.replace(/^@/, "").split(/[/?#]/)[0].toLowerCase();
}

function regionFromAudit(audit: Pick<Audit, "service_area">): string {
  const serviceArea = clean(audit.service_area);
  const guessed = guessRegionFromServiceArea(serviceArea);
  if (guessed) return REGION_NAMES[guessed] ?? guessed;

  const parts = serviceArea.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return formatRegionName(parts[1]);
  return "";
}

function countryFromServiceArea(serviceArea: string | null | undefined): string | null {
  const text = clean(serviceArea).toLowerCase();
  if (/\b(canada|ca)\b/.test(text)) return "Canada";
  if (/\b(usa|us|united states)\b/.test(text)) return "US";
  return null;
}

export function buildReportContext(
  audit: Pick<
    Audit,
    "instagram_url" | "business_name" | "city" | "service_area" | "business_category" | "created_at"
  >,
): ReportContext {
  const instagramUrl = meaningful(audit.instagram_url);
  const city = formatCityName(audit.city);
  const region = regionFromAudit(audit);

  const missing: string[] = [];
  if (!instagramUrl) missing.push("Instagram account URL");
  if (!city) missing.push("City");
  if (!region) missing.push("Province / State");

  if (missing.length > 0) {
    throw new Error(`Cannot generate a personalized report. Missing required setup fields: ${missing.join(", ")}.`);
  }

  const handle = handleFromInstagramUrl(instagramUrl);
  // Category is never a hard blocker: the normalizer rejects junk
  // ("None,Software") and infers a clean label from name/handle. Bio is layered
  // in later by the assembler once the profile is loaded.
  const category = normalizeCategory({
    rawCategory: audit.business_category,
    fullName: audit.business_name,
    handle,
  });
  const businessClassification = category.label;
  const displayName = meaningful(audit.business_name) || (handle ? `@${handle}` : "Instagram Account");
  const localMarketLabel = formatLocationLabel(city, region);

  return {
    instagramUrl,
    handle,
    displayName,
    businessName: displayName,
    businessDescriptionFromInstagramBio: "",
    businessLocation: {
      city,
      region,
      country: countryFromServiceArea(audit.service_area),
    },
    businessClassification,
    categoryKind: category.kind,
    isApp: category.isApp,
    localMarketLabel,
    websiteUrl: null,
    followerCount: null,
    postCount: null,
    postsPerWeek: null,
    scoreToday: null,
    nextCheckpointDate: "",
    preparedForName: displayName,
    generatedAt: new Date().toISOString(),
  };
}
