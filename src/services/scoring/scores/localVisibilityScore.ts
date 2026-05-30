import { desc, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { first } from "../../../db/query.js";
import { audits, posts, profiles } from "../../../db/schema.js";
import { buildGeoTokens, isClientGeoTag } from "../../audit/geoTagFilter.js";
import { buildLocalTerms } from "../enhancers/localReferenceEnhancer.js";
import { signal, tallyScore, type ScoreResult } from "../types.js";

export const W = {
  CITY_IN_BIO: 20,
  LOCAL_HASHTAG_USAGE: 25,
  LOCATION_TAG_RATE: 20,
  HAS_LOCAL_REFERENCE_RATE: 20,
  LOCAL_TAGS_IN_HIGHLIGHTS: 15,
} as const;

function parseJsonArray(blob: string | null | undefined): string[] {
  if (!blob) return [];
  try {
    const arr = JSON.parse(blob);
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export async function scoreLocalVisibility(auditId: number): Promise<ScoreResult> {
  const audit = await first(db.select().from(audits).where(eq(audits.id, auditId)).limit(1));
  const profile = await first(db
    .select()
    .from(profiles)
    .where(eq(profiles.audit_id, auditId))
    .orderBy(desc(profiles.scraped_at))
    .limit(1));
  const allPosts = await db.select().from(posts).where(eq(posts.audit_id, auditId));

  if (!audit || !profile || allPosts.length === 0) {
    return {
      score: 0,
      maxPossible: 100,
      signals: [],
      explanation: "Insufficient data for local visibility score.",
      computedAt: new Date(),
    };
  }

  const signals = [];
  const localTerms = buildLocalTerms(audit);
  const geoTokens = buildGeoTokens(audit);

  // City in bio
  const bio = (profile.bio ?? "").toLowerCase();
  const cityIn = localTerms.some((t) => bio.includes(t.toLowerCase()));
  signals.push(
    signal(
      "city_in_bio",
      "Bio mentions city or a local variant",
      cityIn,
      audit.city ?? "",
      W.CITY_IN_BIO,
      cityIn ? W.CITY_IN_BIO : 0,
      `terms checked: ${localTerms.slice(0, 5).join(", ")}`,
    ),
  );

  // Local hashtag usage (avg branded_local tags per post)
  const brandedCounts = allPosts.map((p) => {
    const tags = parseJsonArray(p.hashtags).map((t) => t.toLowerCase().replace(/^#/, ""));
    return tags.filter((t) => isClientGeoTag(t, geoTokens)).length;
  });
  const avgBranded = brandedCounts.reduce((a, b) => a + b, 0) / allPosts.length;
  let brandedEarned = 0;
  if (avgBranded >= 2) brandedEarned = W.LOCAL_HASHTAG_USAGE;
  else if (avgBranded >= 1) brandedEarned = W.LOCAL_HASHTAG_USAGE * 0.6;
  else if (avgBranded > 0) brandedEarned = W.LOCAL_HASHTAG_USAGE * 0.3;
  signals.push(
    signal(
      "local_hashtag_usage",
      "Average branded-local hashtags per post",
      avgBranded >= 1,
      Number(avgBranded.toFixed(2)),
      W.LOCAL_HASHTAG_USAGE,
      brandedEarned,
    ),
  );

  // Location-tag rate (% posts with location_name set)
  const tagged = allPosts.filter((p) => !!p.location_name).length;
  const tagPct = (tagged / allPosts.length) * 100;
  let tagEarned = 0;
  if (tagPct > 40) tagEarned = W.LOCATION_TAG_RATE;
  else if (tagPct >= 20) tagEarned = W.LOCATION_TAG_RATE * 0.5;
  signals.push(
    signal(
      "location_tag_rate",
      "% of posts with location tag",
      tagPct >= 20,
      Number(tagPct.toFixed(1)),
      W.LOCATION_TAG_RATE,
      tagEarned,
      `${tagged}/${allPosts.length} posts`,
    ),
  );

  // Has local reference rate (set by enhancer)
  const refCount = allPosts.filter((p) => !!p.has_local_reference).length;
  const refPct = (refCount / allPosts.length) * 100;
  let refEarned = 0;
  if (refPct > 40) refEarned = W.HAS_LOCAL_REFERENCE_RATE;
  else if (refPct >= 20) refEarned = W.HAS_LOCAL_REFERENCE_RATE * 0.6;
  else if (refPct > 0) refEarned = W.HAS_LOCAL_REFERENCE_RATE * 0.3;
  signals.push(
    signal(
      "has_local_reference_rate",
      "% of captions mentioning local terms",
      refPct >= 20,
      Number(refPct.toFixed(1)),
      W.HAS_LOCAL_REFERENCE_RATE,
      refEarned,
      `${refCount}/${allPosts.length} posts`,
    ),
  );

  // Local tags in highlights
  const highlights = parseJsonArray(profile.highlight_titles);
  const highlightHit = highlights.some((h) =>
    localTerms.some((t) => h.toLowerCase().includes(t.toLowerCase())),
  );
  signals.push(
    signal(
      "local_tags_in_highlights",
      "Highlight titles include local terms",
      highlightHit,
      highlights.slice(0, 4).join(" | "),
      W.LOCAL_TAGS_IN_HIGHLIGHTS,
      highlightHit ? W.LOCAL_TAGS_IN_HIGHLIGHTS : 0,
    ),
  );

  const score = tallyScore(signals);
  const weak = signals
    .filter((s) => s.earned < s.weight)
    .sort((a, b) => b.weight - a.weight - (a.earned - b.earned))
    .slice(0, 2)
    .map((s) => s.key);
  const explanation = `Local visibility scored ${score}/100. ${
    weak.length ? `Strongest gaps: ${weak.join(", ")}.` : "All signals firing fully."
  }`;

  return { score, maxPossible: 100, signals, explanation, computedAt: new Date() };
}
