import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import {
  audits,
  profiles,
  posts,
  competitors,
  competitor_profiles,
  competitor_posts,
  scores,
  comments,
  hashtags,
  content_patterns,
} from "../../db/schema.js";
import { analyzeComments, type CommentAnalysisResult } from "../comments/commentAnalysis.js";
import { checkHashtagHygiene, type HashtagHygieneResult } from "../patterns/hashtagHygiene.js";
import { analyzeClientGap, type GapFinding } from "../patterns/clientGapAnalysis.js";
import { analyzePatterns, type PatternResult } from "../patterns/patternAnalyzer.js";
import { isAllowedReferenceMarketLabel } from "../audit/referenceMarkets.js";
import { normalizeCategory } from "../audit/categoryNormalizer.js";
import type { ScoreResult } from "../scoring/types.js";
import { buildReportContext, type ReportContext } from "./reportContext.js";

export interface ReportCompetitorLatestPost {
  posted_at: string | null;
  post_type: string | null;
  caption: string | null;
  hook: string | null;
  /** Remote thumbnail URL pulled from Apify raw_json (displayUrl). */
  display_url: string | null;
  /** Canonical post URL (raw_json url) or derived from shortcode. */
  post_url: string | null;
}

export interface ReportCompetitor {
  id: number;
  username: string;
  full_name: string | null;
  competitor_type: string | null;
  geographic_market: string | null;
  confidence_score: number | null;
  deep_scraped: boolean;
  follower_count: number | null;
  post_count: number | null;
  bio: string | null;
  category: string | null;
  /** Remote profile picture URL pulled from Apify raw_json (profilePicUrl). */
  profile_pic_url: string | null;
  /** Most recent captured post (by posted_at), with thumbnail where available. */
  latest_post: ReportCompetitorLatestPost | null;
  top_posts: Array<{
    post_type: string | null;
    caption: string | null;
    engagement_rate: number | null;
    hook_type: string | null;
    tone: string | null;
    safeToReference: boolean;
  }>;
}

/** Pull a string field out of a stored raw_json blob, trying several keys. */
function rawString(raw: string | null | undefined, keys: string[]): string | null {
  if (!raw) return null;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

export interface ReportClientPost {
  id: number;
  shortcode: string | null;
  post_type: string | null;
  caption: string | null;
  like_count: number | null;
  comment_count: number | null;
  engagement_rate: number | null;
  hook_type: string | null;
  tone: string | null;
  content_elements: string[];
  hashtag_count: number | null;
  posted_at: string | null;
}

export interface ReportData {
  reportContext: ReportContext;
  audit: {
    id: number;
    business_name: string | null;
    instagram_url: string | null;
    website_url: string | null;
    city: string | null;
    service_area: string | null;
    business_category: string | null;
    main_offer: string | null;
    target_audience: string | null;
    follower_goal: string | null;
    business_outcome: string | null;
    mode: string;
    status_detail: string | null;
    created_at: string;
  };
  client: {
    profile: {
      username: string | null;
      full_name: string | null;
      bio: string | null;
      follower_count: number | null;
      following_count: number | null;
      post_count: number | null;
      is_business: boolean | null;
      is_verified: boolean | null;
      category: string | null;
      website_url: string | null;
      external_url_in_bio: string | null;
      highlight_titles: string[];
      profile_pic_url: string | null;
    } | null;
    posts: ReportClientPost[];
    topPosts: ReportClientPost[];
    feature_summary: {
      avg_caption_length: number;
      avg_emoji_density: number;
      avg_hashtag_count: number;
      hook_distribution: Record<string, number>;
      tone_distribution: Record<string, number>;
      post_type_distribution: Record<string, number>;
    };
  };
  competitors: ReportCompetitor[];
  scores: {
    overall: number | null;
    profile_conversion: number | null;
    content_performance: number | null;
    local_visibility: number | null;
    sales_readiness: number | null;
    competitor_gap: number | null;
    signals: Record<string, Array<{ label: string; fired: boolean; weight: number; earned: number; note?: string }>>;
  };
  patterns: {
    category: PatternResult;
    client: PatternResult;
    gaps: GapFinding[];
  };
  hashtagHygiene: HashtagHygieneResult;
  comments: {
    summary: CommentAnalysisResult;
    topQuestions: string[];
    topTaggingComments: string[];
    topConcerns: string[];
    audienceLanguage: string[];
  };
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

function toClientPost(p: typeof posts.$inferSelect): ReportClientPost {
  return {
    id: p.id,
    shortcode: p.shortcode,
    post_type: p.post_type,
    caption: p.caption,
    like_count: p.like_count,
    comment_count: p.comment_count,
    engagement_rate: p.engagement_rate,
    hook_type: p.hook_type,
    tone: p.tone,
    content_elements: parseJsonArray(p.content_elements),
    hashtag_count: p.hashtag_count,
    posted_at: p.posted_at,
  };
}

export async function assembleReportData(auditId: number): Promise<ReportData> {
  // ── Audit row ────────────────────────────────────────────────────────────────
  const audit = await first(db.select().from(audits).where(eq(audits.id, auditId)).limit(1));
  if (!audit) throw new Error(`assembleReportData: audit ${auditId} not found`);
  const reportContextBase = buildReportContext(audit);

  // ── Client profile ───────────────────────────────────────────────────────────
  const profileRow = await first(db.select().from(profiles).where(eq(profiles.audit_id, auditId)).limit(1));
  const profile = profileRow
    ? {
        username: profileRow.username,
        full_name: profileRow.full_name,
        bio: profileRow.bio,
        follower_count: profileRow.follower_count,
        following_count: profileRow.following_count,
        post_count: profileRow.post_count,
        is_business: profileRow.is_business,
        is_verified: profileRow.is_verified,
        category: profileRow.category,
        website_url: profileRow.website_url,
        external_url_in_bio: profileRow.external_url_in_bio,
        highlight_titles: parseJsonArray(profileRow.highlight_titles),
        profile_pic_url: rawString(profileRow.raw_json, [
          "profilePicUrl",
          "profilePicUrlHD",
          "profile_pic_url",
        ]),
      }
    : null;

  // ── Client posts ─────────────────────────────────────────────────────────────
  const allPosts = (await db
    .select()
    .from(posts)
    .where(eq(posts.audit_id, auditId)))
    .map(toClientPost);

  const topPosts = [...allPosts]
    .sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0))
    .slice(0, 5);

  // Feature summary
  const hookDist: Record<string, number> = {};
  const toneDist: Record<string, number> = {};
  const ptDist: Record<string, number> = {};
  let totalCaptionLen = 0;
  let totalEmojiDensity = 0;
  let totalHashtags = 0;
  for (const p of allPosts) {
    if (p.hook_type) hookDist[p.hook_type] = (hookDist[p.hook_type] ?? 0) + 1;
    if (p.tone) toneDist[p.tone] = (toneDist[p.tone] ?? 0) + 1;
    if (p.post_type) ptDist[p.post_type] = (ptDist[p.post_type] ?? 0) + 1;
    totalCaptionLen += p.caption?.length ?? 0;
    totalHashtags += p.hashtag_count ?? 0;
  }
  const n = allPosts.length || 1;
  const feature_summary = {
    avg_caption_length: Math.round(totalCaptionLen / n),
    avg_emoji_density: parseFloat((totalEmojiDensity / n).toFixed(3)),
    avg_hashtag_count: parseFloat((totalHashtags / n).toFixed(1)),
    hook_distribution: hookDist,
    tone_distribution: toneDist,
    post_type_distribution: ptDist,
  };

  // ── Competitors ──────────────────────────────────────────────────────────────
  const compRows = await db.select().from(competitors).where(eq(competitors.audit_id, auditId));
  const reportCompetitors: ReportCompetitor[] = [];

  for (const comp of compRows) {
    const cpRows = await db
      .select()
      .from(competitor_posts)
      .where(eq(competitor_posts.competitor_id, comp.id))
      .orderBy(desc(competitor_posts.engagement_rate))
      .limit(3);

    // Most recent post by date — drives the "looks alive" activity signal.
    const latestRow = await first(db
      .select()
      .from(competitor_posts)
      .where(eq(competitor_posts.competitor_id, comp.id))
      .orderBy(desc(competitor_posts.posted_at))
      .limit(1));

    const cpProfile = await first(db
      .select()
      .from(competitor_profiles)
      .where(eq(competitor_profiles.competitor_id, comp.id))
      .limit(1));

    const safeToReference = comp.competitor_type !== "local_intel";

    if (comp.competitor_type === "reference_model" && !isAllowedReferenceMarketLabel(comp.geographic_market)) {
      continue;
    }

    // Image + display-name fields live only in raw_json (never columnized).
    const profilePicUrl = rawString(cpProfile?.raw_json, [
      "profilePicUrl",
      "profilePicUrlHD",
      "profile_pic_url",
    ]);
    const fullName = rawString(cpProfile?.raw_json, ["fullName", "full_name"]);

    let latestPost: ReportCompetitorLatestPost | null = null;
    if (latestRow) {
      const displayUrl = rawString(latestRow.raw_json, [
        "displayUrl",
        "display_url",
        "thumbnailUrl",
        "imageUrl",
      ]);
      const rawUrl = rawString(latestRow.raw_json, ["url", "postUrl"]);
      const postUrl =
        rawUrl ??
        (latestRow.shortcode ? `https://www.instagram.com/p/${latestRow.shortcode}/` : null);
      latestPost = {
        posted_at: latestRow.posted_at,
        post_type: latestRow.post_type,
        caption: latestRow.caption,
        hook: latestRow.hook_text,
        display_url: displayUrl,
        post_url: postUrl,
      };
    }

    reportCompetitors.push({
      id: comp.id,
      username: comp.username,
      full_name: fullName,
      competitor_type: comp.competitor_type,
      geographic_market: comp.geographic_market,
      confidence_score: comp.confidence_score,
      deep_scraped: comp.deep_scraped,
      follower_count: cpProfile?.follower_count ?? null,
      post_count: cpProfile?.post_count ?? null,
      bio: cpProfile?.bio ?? null,
      category: cpProfile?.category ?? null,
      profile_pic_url: profilePicUrl,
      latest_post: latestPost,
      top_posts: cpRows.map((cp) => ({
        post_type: cp.post_type,
        caption: cp.caption ? cp.caption.slice(0, 300) : null,
        engagement_rate: cp.engagement_rate,
        hook_type: cp.hook_type,
        tone: cp.tone,
        safeToReference,
      })),
    });
  }

  // ── Scores ───────────────────────────────────────────────────────────────────
  const scoreRow = await first(db.select().from(scores).where(eq(scores.audit_id, auditId)).limit(1));
  let parsedExplanations: Record<string, { signals?: Array<{ label: string; fired: boolean; weight: number; earned: number; note?: string }> }> = {};
  if (scoreRow?.score_explanations) {
    try { parsedExplanations = JSON.parse(scoreRow.score_explanations); } catch { /* noop */ }
  }
  const signalsMap: ReportData["scores"]["signals"] = {};
  for (const [cat, val] of Object.entries(parsedExplanations)) {
    if (Array.isArray(val?.signals)) {
      signalsMap[cat] = val.signals;
    }
  }

  const reportScores: ReportData["scores"] = {
    overall: scoreRow?.overall_score ?? null,
    profile_conversion: scoreRow?.profile_conversion_score ?? null,
    content_performance: scoreRow?.content_performance_score ?? null,
    local_visibility: scoreRow?.local_visibility_score ?? null,
    sales_readiness: scoreRow?.sales_readiness_score ?? null,
    competitor_gap: scoreRow?.competitor_gap_score ?? null,
    signals: signalsMap,
  };

  const now = new Date();
  const nextCheckpointDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const postsPerWeek = (() => {
    const postsInLast30Days = allPosts.filter((post) => {
      if (!post.posted_at) return false;
      const ageDays = (now.getTime() - new Date(post.posted_at).getTime()) / 86400000;
      return ageDays >= 0 && ageDays <= 30;
    }).length;
    return postsInLast30Days / 4.2857142857;
  })();
  // Refine the category now that the profile bio is available — bio is the
  // strongest signal (e.g. BoxBuddy's "Your Smart Moving App" → moving app).
  const refinedCategory = normalizeCategory({
    rawCategory: audit.business_category,
    bio: profile?.bio,
    fullName: profile?.full_name ?? audit.business_name,
    handle: profile?.username ?? reportContextBase.handle,
    website: profile?.external_url_in_bio ?? profile?.website_url ?? audit.website_url,
  });
  const reportContext: ReportContext = {
    ...reportContextBase,
    businessClassification: refinedCategory.label,
    categoryKind: refinedCategory.kind,
    isApp: refinedCategory.isApp,
    businessName: audit.business_name ?? reportContextBase.displayName,
    businessDescriptionFromInstagramBio: profile?.bio ?? "",
    websiteUrl: profile?.website_url ?? audit.website_url ?? null,
    followerCount: profile?.follower_count ?? null,
    postCount: profile?.post_count ?? null,
    postsPerWeek,
    scoreToday: reportScores.overall,
    nextCheckpointDate,
    preparedForName: reportContextBase.preparedForName,
    generatedAt: now.toISOString(),
  };

  // ── Patterns ─────────────────────────────────────────────────────────────────
  let categoryPatterns: PatternResult;
  let clientPatterns: PatternResult;
  try {
    categoryPatterns = await analyzePatterns(auditId, "category_corpus");
    clientPatterns = await analyzePatterns(auditId, "client_only");
  } catch {
    // Fallback empty shapes
    const empty: PatternResult = {
      scope: "category_corpus", postCount: 0,
      caption: { avgLength: 0, distribution: { short: 0, medium: 0, long: 0, very_long: 0 }, avgEmojiCount: 0, avgEmojiDensity: 0 },
      hooks: { topHook: "unknown", distribution: {}, bestPerformingHookByEngagement: null },
      tones: { topTone: "unknown", distribution: {}, bestPerformingToneByEngagement: null },
      contentElements: { distribution: {}, bestPerformingElementByEngagement: null },
      postTypes: { distribution: {}, bestPerformingByEngagement: null },
      hashtags: { avgCountPerPost: 0, recommendedRange: [8, 15] },
      topPostExamples: [],
    };
    categoryPatterns = empty;
    clientPatterns = { ...empty, scope: "client_only" };
  }

  let gaps: GapFinding[] = [];
  try {
    const gapResult = await analyzeClientGap(auditId);
    gaps = gapResult.gaps;
  } catch { /* noop */ }

  // ── Hashtag hygiene ──────────────────────────────────────────────────────────
  let hashtagHygiene: HashtagHygieneResult;
  try {
    hashtagHygiene = await checkHashtagHygiene(auditId);
  } catch {
    hashtagHygiene = {
      avgCountPerPost: 0,
      countAssessment: "too_few",
      brandPollutionDetected: [],
      clientUsesOwnGeo: false,
      topClientHashtags: [],
      notes: [],
    };
  }

  // ── Comments ─────────────────────────────────────────────────────────────────
  const commentAnalysis = await analyzeComments(auditId);

  return {
    reportContext,
    audit: {
      id: audit.id,
      business_name: audit.business_name,
      instagram_url: audit.instagram_url,
      website_url: audit.website_url,
      city: audit.city,
      service_area: audit.service_area,
      business_category: audit.business_category,
      main_offer: audit.main_offer,
      target_audience: audit.target_audience,
      follower_goal: audit.follower_goal,
      business_outcome: audit.business_outcome,
      mode: audit.mode,
      status_detail: audit.status_detail,
      created_at: audit.created_at,
    },
    client: { profile, posts: allPosts, topPosts, feature_summary },
    competitors: reportCompetitors,
    scores: reportScores,
    patterns: { category: categoryPatterns, client: clientPatterns, gaps },
    hashtagHygiene,
    comments: {
      summary: commentAnalysis,
      topQuestions: commentAnalysis.topQuestions.slice(0, 6),
      topTaggingComments: commentAnalysis.topTaggingComments.slice(0, 4),
      topConcerns: commentAnalysis.topConcerns.slice(0, 4),
      audienceLanguage: commentAnalysis.audienceLanguage.slice(0, 12),
    },
  };
}
