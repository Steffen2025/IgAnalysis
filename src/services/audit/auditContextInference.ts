import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import { audits, posts, profiles, type Audit } from "../../db/schema.js";
import type { NormalizedProfile } from "../apify/index.js";
import { normalizeCategory } from "./categoryNormalizer.js";

const CITY_REGION_HINTS: Array<{
  city: string;
  region: string;
  country: string;
  terms: string[];
}> = [
  { city: "Burlington", region: "ON", country: "Canada", terms: ["burlington, on", "burlington ontario", "burlingtonon", "halton"] },
  { city: "Hamilton", region: "ON", country: "Canada", terms: ["hamilton, on", "hamilton ontario", "hamont", "the hammer"] },
  { city: "Toronto", region: "ON", country: "Canada", terms: ["toronto", "gta", "the 6ix", "yyz"] },
  { city: "Waterdown", region: "ON", country: "Canada", terms: ["waterdown", "flamborough"] },
  { city: "Oakville", region: "ON", country: "Canada", terms: ["oakville"] },
  { city: "Milton", region: "ON", country: "Canada", terms: ["milton"] },
  { city: "Mississauga", region: "ON", country: "Canada", terms: ["mississauga"] },
  { city: "Vaughan", region: "ON", country: "Canada", terms: ["vaughan"] },
  { city: "Calgary", region: "AB", country: "Canada", terms: ["calgary", "yyc"] },
  { city: "Austin", region: "TX", country: "US", terms: ["austin, tx", "austin texas"] },
  { city: "Nashville", region: "TN", country: "US", terms: ["nashville, tn", "nashville tennessee"] },
  { city: "Denver", region: "CO", country: "US", terms: ["denver, co", "denver colorado"] },
];

const BUSINESS_CATEGORY_MAP: Array<{ category: string; terms: string[] }> = [
  { category: "Mortgage Broker", terms: ["mortgage", "mortgages", "home loan", "refinance", "pre-approval", "pre approval"] },
  { category: "Real Estate", terms: ["real estate", "realtor", "homes for sale", "listing"] },
  { category: "Restaurant", terms: ["restaurant", "eatery", "pizza", "cafe", "coffee", "bakery", "food truck"] },
  { category: "Fitness Studio", terms: ["fitness", "gym", "pilates", "yoga", "personal trainer"] },
  { category: "Med Spa", terms: ["med spa", "medical spa", "botox", "facial", "skincare", "laser"] },
  { category: "Dental Clinic", terms: ["dentist", "dental", "orthodontic", "smile"] },
  { category: "Marketing Agency", terms: ["marketing", "seo", "social media", "branding", "agency"] },
  { category: "AI Automation", terms: ["automation", "ai", "chatbot", "workflow", "crm"] },
  { category: "Local Service Business", terms: ["contractor", "plumbing", "roofing", "hvac", "landscaping", "cleaning"] },
];

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function coalesce(current: string | null | undefined, inferred: string | null | undefined): string | null {
  const existing = clean(current);
  if (existing) return existing;
  const next = clean(inferred);
  return next || null;
}

export function displayNameFromInstagramUrl(url: string | null | undefined): string {
  const username = usernameFromInstagramInput(url ?? "");
  if (!username) return "Instagram Audit";
  return username
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function usernameFromInstagramInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/^@/, "");
  const match = normalized.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const username = match ? match[1] : normalized.split(/[/?#]/)[0];
  const cleanUsername = username.replace(/[^A-Za-z0-9._]/g, "").toLowerCase();
  return cleanUsername || null;
}

export function normalizeInstagramUrl(value: string): string | null {
  const username = usernameFromInstagramInput(value);
  return username ? `https://www.instagram.com/${username}/` : null;
}

function inferCategory(profile: NormalizedProfile): string | null {
  // Route through the normalizer so IG's junk categories ("None,Software")
  // are rejected and a clean label is inferred from bio/name/handle/website.
  const { label, source } = normalizeCategory({
    rawCategory: profile.category,
    bio: profile.bio,
    fullName: profile.full_name,
    handle: profile.username,
    website: profile.external_url_in_bio,
  });
  // A pure fallback ("Local business"/"Consumer app") is weaker than a legacy
  // keyword hit, so try the legacy map before settling for it.
  if (source === "fallback") {
    const haystack = `${profile.full_name ?? ""} ${profile.bio ?? ""}`.toLowerCase();
    const legacy = BUSINESS_CATEGORY_MAP.find((item) => item.terms.some((term) => haystack.includes(term)))?.category;
    return legacy ?? label;
  }
  return label;
}

function inferMarketFromText(text: string): { city: string; serviceArea: string } | null {
  const haystack = text.toLowerCase();
  const exact = CITY_REGION_HINTS.find((item) => item.terms.some((term) => haystack.includes(term)));
  if (!exact) return null;
  return {
    city: exact.city,
    serviceArea: `${exact.city}, ${exact.region}`,
  };
}

function inferOffer(category: string | null, city: string | null): string | null {
  if (!category) return null;
  const market = city ? ` in ${city}` : "";
  return `${category} services${market}`;
}

function inferAudience(category: string | null, city: string | null): string | null {
  if (!category) return null;
  const market = city ? ` in and around ${city}` : "in the local market";
  return `People looking for ${category.toLowerCase()} help ${market}`;
}

export async function enrichAuditContextFromProfile(
  audit: Audit,
  profile: NormalizedProfile,
): Promise<void> {
  const inferredMarket = inferMarketFromText(`${profile.full_name ?? ""} ${profile.bio ?? ""}`);
  const nextCity = coalesce(audit.city, inferredMarket?.city);
  const nextCategory = coalesce(audit.business_category, inferCategory(profile));

  const updates: Partial<typeof audits.$inferInsert> = {
    business_name: coalesce(audit.business_name, profile.full_name ?? profile.username ?? displayNameFromInstagramUrl(audit.instagram_url)),
    website_url: coalesce(audit.website_url, profile.external_url_in_bio),
    city: nextCity,
    service_area: coalesce(audit.service_area, inferredMarket?.serviceArea),
    business_category: nextCategory,
    main_offer: coalesce(audit.main_offer, inferOffer(nextCategory, nextCity)),
    target_audience: coalesce(audit.target_audience, inferAudience(nextCategory, nextCity)),
    follower_goal: coalesce(audit.follower_goal, profile.follower_count ? String(Math.ceil(profile.follower_count * 1.25)) : null),
    business_outcome: coalesce(audit.business_outcome, nextCategory ? "Turn Instagram attention into local leads, DMs, bookings, and sales." : null),
    updated_at: new Date().toISOString(),
  };

  await db.update(audits).set(updates).where(eq(audits.id, audit.id));
}

export async function enrichAuditMarketFromPosts(auditId: number): Promise<void> {
  const audit = await first(db.select().from(audits).where(eq(audits.id, auditId)).limit(1));
  if (!audit || clean(audit.city)) return;

  const postRows = await db
    .select({
      location_name: posts.location_name,
      caption: posts.caption,
    })
    .from(posts)
    .where(eq(posts.audit_id, auditId))
    .limit(50);

  const profile = await first(db
    .select({
      bio: profiles.bio,
      full_name: profiles.full_name,
    })
    .from(profiles)
    .where(eq(profiles.audit_id, auditId))
    .limit(1));

  const inferred = inferMarketFromText([
    profile?.full_name,
    profile?.bio,
    ...postRows.flatMap((post) => [post.location_name, post.caption]),
  ].filter(Boolean).join(" "));

  if (!inferred) return;

  await db.update(audits)
    .set({
      city: inferred.city,
      service_area: coalesce(audit.service_area, inferred.serviceArea),
      updated_at: new Date().toISOString(),
    })
    .where(eq(audits.id, auditId));
}
