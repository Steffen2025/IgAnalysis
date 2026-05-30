// Teardown-specific normalizer. Richer than the audit-engine normalizePost:
// it preserves the cover frame, video URL, and per-slide carousel media that
// the teardown's vision + transcription steps (M4/M5) depend on. Kept separate
// so the audit pipeline's normalizer is untouched.

export interface NormalizedTeardownContent {
  shortcode: string | null;
  content_type: "reel" | "carousel" | "image" | "video" | "story";
  caption: string;
  hashtags: string[];
  mentions: string[];
  like_count: number | null;
  comment_count: number | null;
  play_count: number | null;
  posted_at: string | null;
  cover_url: string | null;
  video_url: string | null;
  child_count: number | null;
  child_media: string[];
  is_story: boolean;
  engagement_rate: number | null;
  caption_length: number;
  hashtag_count: number;
  raw_json: string;
}

type AnyObj = Record<string, unknown>;
const obj = (v: unknown): AnyObj => (v && typeof v === "object" ? (v as AnyObj) : {});
const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function mapContentType(
  raw: AnyObj,
): NormalizedTeardownContent["content_type"] {
  const t = raw.type;
  const productType = str(raw.productType);
  if (t === "Sidecar") return "carousel";
  if (t === "Video") {
    // clips == reels; igtv/feed videos stay "video"
    if (productType === "clips") return "reel";
    if (productType === "igtv") return "video";
    return "reel";
  }
  if (t === "Image") return "image";
  return "image";
}

function childMediaUrl(child: unknown): string | null {
  const c = obj(child);
  return str(c.videoUrl) ?? str(c.displayUrl) ?? str(c.url);
}

function cleanHashtags(v: unknown): string[] {
  return arr(v).filter(
    (h): h is string =>
      typeof h === "string" &&
      h.replace(/^#/, "").length >= 2 &&
      !/^\d+$/.test(h.replace(/^#/, "")),
  );
}

export function normalizeTeardownContent(
  raw: unknown,
  followerCount: number | null,
): NormalizedTeardownContent {
  const r = obj(raw);
  const caption = str(r.caption) ?? "";
  const hashtags = cleanHashtags(r.hashtags);
  const mentions = arr(r.mentions).filter((m): m is string => typeof m === "string");
  const children = arr(r.childPosts);
  const childMedia = children
    .map(childMediaUrl)
    .filter((u): u is string => typeof u === "string");

  const likeCount = num(r.likesCount);
  const commentCount = num(r.commentsCount);
  const playCount = num(r.videoPlayCount) ?? num(r.videoViewCount);

  const engagementRate =
    followerCount && followerCount > 0
      ? ((likeCount ?? 0) + (commentCount ?? 0)) / followerCount
      : null;

  return {
    shortcode: str(r.shortCode),
    content_type: mapContentType(r),
    caption,
    hashtags,
    mentions,
    like_count: likeCount,
    comment_count: commentCount,
    play_count: playCount,
    posted_at: str(r.timestamp),
    cover_url: str(r.displayUrl),
    video_url: str(r.videoUrl),
    child_count: children.length > 0 ? children.length : null,
    child_media: childMedia,
    is_story: false,
    engagement_rate: engagementRate,
    caption_length: caption.length,
    hashtag_count: hashtags.length,
    raw_json: JSON.stringify(raw),
  };
}
