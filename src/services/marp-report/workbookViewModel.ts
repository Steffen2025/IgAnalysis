import type { ReportCompetitor, ReportData } from "../report/reportDataAssembler.js";
import { isAllowedReferenceMarketLabel } from "../audit/referenceMarkets.js";
import { isExpandedLocalMarket } from "../audit/geoMarketExpansion.js";
import { filterByRelevance } from "./competitorRelevance.js";
import {
  type ActivityStatus,
  activityRank,
  getActivityStatus,
} from "./utils/activity.js";
import { cacheRemoteImage } from "./utils/imageCache.js";
import {
  daysSince,
  firstSentence,
  formatNumber,
  initials,
  safeHandle,
  truncateChars,
} from "./utils/text.js";

/**
 * Normalized competitor card consumed by the slide builders. All raw DB / Apify
 * shapes are resolved here so the Marp builders never touch raw_json or DB rows.
 */
export interface CompetitorVisualCard {
  handle: string;
  displayName: string;
  type: "local" | "reference";
  marketLabel: string;
  followers: number | null;
  followersLabel: string;
  postsCount: number | null;
  postsLabel: string;
  profileImageUrl: string | null;
  /** Local file:// URL after caching, or null → render initials. */
  cachedProfileImagePath: string | null;
  latestPostImageUrl: string | null;
  cachedLatestPostImagePath: string | null;
  latestPostDate: string | null;
  latestPostAgeDays: number | null;
  latestPostType: string | null;
  latestPostUrl: string | null;
  latestPostHook: string | null;
  activityStatus: ActivityStatus;
  initials: string;
  doesWell: string;
  borrow: string;
  avoid: string;
  /** Why this account passed the relevance gate (audit/debug + cheat sheet). */
  selectionReason: string;
}

export interface ClientProfileSnapshot {
  handle: string;
  displayName: string;
  followers: number | null;
  followersLabel: string;
  posts: number | null;
  postsLabel: string;
  profileImageUrl: string | null;
  cachedProfileImagePath: string | null;
  initials: string;
  bio: string | null;
}

export interface WorkbookViewModel {
  meta: {
    auditId: number;
    displayName: string;
    handle: string;
    marketLabel: string;
    city: string;
    reviewDate: string;
    overallScore: number;
  };
  clientProfile: ClientProfileSnapshot;
  competitorRelevance: CompetitorVisualCard[];
  competitorCheatSheet: {
    local: CompetitorVisualCard[];
    reference: CompetitorVisualCard[];
  };
}

function n(v: number | null | undefined): number {
  return v ?? 0;
}

function reviewDateOf(data: ReportData): string {
  const base = data.audit.created_at ? new Date(data.audit.created_at) : new Date();
  const review = new Date(base);
  review.setDate(review.getDate() + 30);
  return review.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function marketLabelFor(comp: ReportCompetitor, kind: "local" | "reference"): string {
  if (kind === "local" && isExpandedLocalMarket(comp.geographic_market)) return "Nearby peer";
  return kind === "local" ? "Local" : "Reference";
}

function deriveDoesWell(comp: ReportCompetitor, status: ActivityStatus): string {
  const top = comp.top_posts[0];
  if (status === "fresh" || status === "active") {
    return `Posting consistently — ${formatNumber(comp.follower_count)} followers and a steady ${top?.post_type ?? "content"} rhythm.`;
  }
  if (n(comp.follower_count) > 8000) {
    return `Built a sizable audience (${formatNumber(comp.follower_count)}) worth studying for format ideas.`;
  }
  if (top?.hook_type === "question") {
    return "Uses question hooks that pull comments and replies.";
  }
  return `Has a clear ${top?.post_type ?? "content"} format that's easy to scan.`;
}

function deriveBorrow(comp: ReportCompetitor, kind: "local" | "reference"): string {
  const top = comp.top_posts[0];
  if (kind === "local") {
    return `Their ${top?.post_type ?? "post"} + ${top?.hook_type ?? "hook"} structure — rewrite it in your own voice.`;
  }
  return `Study their ${top?.post_type ?? "format"} pacing and layout — borrow the structure, not the brand.`;
}

function deriveAvoid(comp: ReportCompetitor, status: ActivityStatus): string {
  if (status === "stale" || status === "cooling") {
    return "Going quiet — long gaps between posts make a business look closed.";
  }
  return "Copying their exact creative or captions word-for-word.";
}

async function toCard(
  comp: ReportCompetitor,
  kind: "local" | "reference",
  auditId: number,
  selectionReason = "",
): Promise<CompetitorVisualCard> {
  const status = getActivityStatus(comp.latest_post?.posted_at);
  const handle = safeHandle(comp.username);

  const profileCache = await cacheRemoteImage(comp.profile_pic_url, auditId);
  const postCache = await cacheRemoteImage(comp.latest_post?.display_url, auditId);

  return {
    handle,
    displayName: comp.full_name?.trim() || `@${handle}`,
    type: kind,
    marketLabel: marketLabelFor(comp, kind),
    followers: comp.follower_count,
    followersLabel: formatNumber(comp.follower_count),
    postsCount: comp.post_count,
    postsLabel: formatNumber(comp.post_count),
    profileImageUrl: comp.profile_pic_url,
    cachedProfileImagePath: profileCache?.dataUri ?? null,
    latestPostImageUrl: comp.latest_post?.display_url ?? null,
    cachedLatestPostImagePath: postCache?.dataUri ?? null,
    latestPostDate: comp.latest_post?.posted_at ?? null,
    latestPostAgeDays: daysSince(comp.latest_post?.posted_at),
    latestPostType: comp.latest_post?.post_type ?? null,
    latestPostUrl: comp.latest_post?.post_url ?? null,
    latestPostHook: comp.latest_post?.hook
      ? truncateChars(comp.latest_post.hook, 90)
      : comp.latest_post?.caption
        ? truncateChars(comp.latest_post.caption, 90)
        : null,
    activityStatus: status,
    initials: initials(comp.full_name || handle),
    doesWell: firstSentence(deriveDoesWell(comp, status)),
    borrow: truncateChars(deriveBorrow(comp, kind), 110),
    avoid: truncateChars(deriveAvoid(comp, status), 110),
    selectionReason,
  };
}

function sortLocal(a: CompetitorVisualCard, b: CompetitorVisualCard): number {
  // 1) activity freshness, 2) followers, 3) post count
  const act = activityRank(b.activityStatus) - activityRank(a.activityStatus);
  if (act !== 0) return act;
  const fol = n(b.followers) - n(a.followers);
  if (fol !== 0) return fol;
  return n(b.postsCount) - n(a.postsCount);
}

function sortReference(a: CompetitorVisualCard, b: CompetitorVisualCard): number {
  // 1) followers, 2) activity freshness, 3) post count
  const fol = n(b.followers) - n(a.followers);
  if (fol !== 0) return fol;
  const act = activityRank(b.activityStatus) - activityRank(a.activityStatus);
  if (act !== 0) return act;
  return n(b.postsCount) - n(a.postsCount);
}

export async function buildWorkbookViewModel(
  data: ReportData,
  auditId: number,
): Promise<WorkbookViewModel> {
  const ctx = data.reportContext;
  const categoryLabel = ctx.businessClassification;
  const categoryKind = ctx.categoryKind ?? "generic";

  const localRaw = data.competitors.filter((c) => c.competitor_type === "local_intel");
  const referenceRaw = data.competitors.filter(
    (c) => c.competitor_type === "reference_model" && isAllowedReferenceMarketLabel(c.geographic_market),
  );

  // Relevance gate — drop accounts that don't credibly match the category
  // (e.g. music/tattoo handles dragged in by a poisoned discovery query).
  const localFiltered = filterByRelevance(localRaw, categoryLabel, categoryKind);
  const referenceFiltered = filterByRelevance(referenceRaw, categoryLabel, categoryKind);

  const localCards = (
    await Promise.all(localFiltered.kept.map((c) => toCard(c, "local", auditId, c.relevance.reason)))
  ).sort(sortLocal);
  const referenceCards = (
    await Promise.all(referenceFiltered.kept.map((c) => toCard(c, "reference", auditId, c.relevance.reason)))
  ).sort(sortReference);

  const clientPicCache = await cacheRemoteImage(data.client.profile?.profile_pic_url, auditId);
  const clientProfile: ClientProfileSnapshot = {
    handle: safeHandle(ctx.handle),
    displayName: ctx.displayName,
    followers: data.client.profile?.follower_count ?? null,
    followersLabel: formatNumber(data.client.profile?.follower_count),
    posts: data.client.profile?.post_count ?? null,
    postsLabel: formatNumber(data.client.profile?.post_count),
    profileImageUrl: data.client.profile?.profile_pic_url ?? null,
    cachedProfileImagePath: clientPicCache?.dataUri ?? null,
    initials: initials(ctx.displayName || ctx.handle),
    bio: data.client.profile?.bio ? truncateChars(data.client.profile.bio, 160) : null,
  };

  return {
    meta: {
      auditId,
      displayName: ctx.displayName,
      handle: safeHandle(ctx.handle),
      marketLabel: ctx.localMarketLabel,
      city: ctx.businessLocation?.city ?? ctx.localMarketLabel,
      reviewDate: reviewDateOf(data),
      overallScore: n(data.scores.overall),
    },
    clientProfile,
    competitorRelevance: localCards.concat(referenceCards),
    competitorCheatSheet: {
      local: localCards.slice(0, 3),
      reference: referenceCards.slice(0, 3),
    },
  };
}
