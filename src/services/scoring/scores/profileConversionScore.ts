import { desc, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { first } from "../../../db/query.js";
import { audits, profiles } from "../../../db/schema.js";
import { signal, tallyScore, type ScoreResult } from "../types.js";

export const W = {
  BIO_LENGTH_OK: 15,
  BIO_HAS_LOCATION: 15,
  BIO_HAS_OFFER: 15,
  HAS_EXTERNAL_URL: 15,
  HAS_BUSINESS_CATEGORY: 10,
  HIGHLIGHTS_COUNT_OK: 15,
  IS_BUSINESS_OR_VERIFIED: 5,
  HAS_PROFILE_NAME: 10,
} as const;

const SERVICE_KEYWORDS = [
  "book",
  "order",
  "shop",
  "dine",
  "eat",
  "visit",
  "stay",
  "menu",
  "hire",
  "buy",
  "call",
  "delivery",
  "takeout",
  "reservations",
  "appointments",
  "consultation",
];

function parseHighlights(blob: string | null | undefined): string[] {
  if (!blob) return [];
  try {
    const arr = JSON.parse(blob);
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export async function scoreProfileConversion(auditId: number): Promise<ScoreResult> {
  const audit = await first(db.select().from(audits).where(eq(audits.id, auditId)).limit(1));
  const profile = await first(db
    .select()
    .from(profiles)
    .where(eq(profiles.audit_id, auditId))
    .orderBy(desc(profiles.scraped_at))
    .limit(1));

  const signals = [];

  if (!profile) {
    return {
      score: 0,
      maxPossible: 100,
      signals: [],
      explanation: "No profile data found — cannot score.",
      computedAt: new Date(),
    };
  }

  // Bio length
  const bio = (profile.bio ?? "").trim();
  const bioLen = bio.length;
  const bioLengthOk = bioLen >= 50 && bioLen <= 150;
  signals.push(
    signal(
      "bio_length_ok",
      "Bio length within 50–150 chars",
      bioLengthOk,
      bioLen,
      W.BIO_LENGTH_OK,
      bioLengthOk ? W.BIO_LENGTH_OK : bioLen > 0 && bioLen < 50 ? W.BIO_LENGTH_OK * 0.4 : 0,
      bio.slice(0, 80),
    ),
  );

  // Bio has location
  const city = (audit?.city ?? "").toLowerCase();
  const bioLower = bio.toLowerCase();
  const bioHasLocation = !!city && bioLower.includes(city);
  signals.push(
    signal(
      "bio_has_location",
      "Bio mentions city",
      bioHasLocation,
      city,
      W.BIO_HAS_LOCATION,
      bioHasLocation ? W.BIO_HAS_LOCATION : 0,
    ),
  );

  // Bio has offer / service keyword
  const categoryTokens = ((audit?.business_category ?? "").toLowerCase().match(/\b[a-z]{3,}\b/g) ?? []);
  const offerHit =
    categoryTokens.some((t) => bioLower.includes(t)) ||
    SERVICE_KEYWORDS.some((k) => bioLower.includes(k));
  signals.push(
    signal(
      "bio_has_offer",
      "Bio mentions category or a service verb",
      offerHit,
      bio.slice(0, 80),
      W.BIO_HAS_OFFER,
      offerHit ? W.BIO_HAS_OFFER : 0,
    ),
  );

  // External URL
  const hasUrl = !!(profile.external_url_in_bio ?? profile.website_url);
  signals.push(
    signal(
      "has_external_url",
      "Has clickable bio URL",
      hasUrl,
      profile.external_url_in_bio ?? profile.website_url ?? "",
      W.HAS_EXTERNAL_URL,
      hasUrl ? W.HAS_EXTERNAL_URL : 0,
    ),
  );

  // Business category
  const hasCategory = !!profile.category;
  signals.push(
    signal(
      "has_business_category",
      "Account has business category set",
      hasCategory,
      profile.category ?? "",
      W.HAS_BUSINESS_CATEGORY,
      hasCategory ? W.HAS_BUSINESS_CATEGORY : 0,
    ),
  );

  // Highlights count (3–7)
  const highlights = parseHighlights(profile.highlight_titles);
  const hCount = highlights.length;
  const highlightsOk = hCount >= 3 && hCount <= 7;
  signals.push(
    signal(
      "highlights_count_ok",
      "3–7 story highlights present",
      highlightsOk,
      hCount,
      W.HIGHLIGHTS_COUNT_OK,
      highlightsOk
        ? W.HIGHLIGHTS_COUNT_OK
        : hCount > 7
          ? W.HIGHLIGHTS_COUNT_OK * 0.6
          : hCount > 0
            ? W.HIGHLIGHTS_COUNT_OK * 0.4
            : 0,
      highlights.slice(0, 6).join(" | "),
    ),
  );

  // Business or verified
  const trusted = !!profile.is_business || !!profile.is_verified;
  signals.push(
    signal(
      "is_business_or_verified",
      "Business account or verified",
      trusted,
      `${profile.is_business ? "business" : ""}${profile.is_verified ? "+verified" : ""}` || "no",
      W.IS_BUSINESS_OR_VERIFIED,
      trusted ? W.IS_BUSINESS_OR_VERIFIED : 0,
    ),
  );

  // Profile full name set and distinct from username
  const fullName = (profile.full_name ?? "").trim();
  const username = (profile.username ?? "").trim().toLowerCase();
  const hasName = fullName.length > 0 && fullName.toLowerCase() !== username;
  signals.push(
    signal(
      "has_profile_name",
      "Display name set and not just username",
      hasName,
      fullName,
      W.HAS_PROFILE_NAME,
      hasName ? W.HAS_PROFILE_NAME : 0,
    ),
  );

  const score = tallyScore(signals);
  const weak = signals
    .filter((s) => !s.fired)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((s) => s.key);
  const explanation = weak.length
    ? `Profile scored ${score}/100. Biggest gaps: ${weak.join(", ")}.`
    : `Profile scored ${score}/100 — all key signals firing.`;

  return { score, maxPossible: 100, signals, explanation, computedAt: new Date() };
}
