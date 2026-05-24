export interface NormalizedProfile {
  username: string | null;
  full_name: string | null;
  bio: string | null;
  follower_count: number | null;
  following_count: number | null;
  post_count: number | null;
  is_business: boolean;
  is_verified: boolean;
  category: string | null;
  external_url_in_bio: string | null;
  highlight_titles: string | null;
  raw_json: string;
}

export interface NormalizedPost {
  shortcode: string | null;
  post_type: "reel" | "carousel" | "image" | "video";
  caption: string;
  hashtags: string;
  mentions: string;
  location_name: string | null;
  location_id: string | null;
  like_count: number;
  comment_count: number;
  play_count: number | null;
  posted_at: string | null;
  hook_text: string | null;
  has_cta: boolean;
  has_local_reference: boolean;
  raw_json: string;
}

export interface NormalizedComment {
  commenter_username: string | null;
  comment_text: string;
  comment_length: number;
  has_question: boolean;
  has_tag: boolean;
  emoji_count: number;
}

export interface NormalizedHashtag {
  hashtag: string;
  post_count: number | null;
  source:
    | "client_post"
    | "competitor_post"
    | "local_search"
    | "user_provided";
}

type AnyObj = Record<string, unknown>;
const obj = (v: unknown): AnyObj => (v && typeof v === "object" ? (v as AnyObj) : {});
const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const bool = (v: unknown): boolean => v === true;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function normalizeProfile(raw: unknown): NormalizedProfile {
  const r = obj(raw);
  const highlights = arr(r.highlightReels)
    .map((h) => obj(h).title)
    .filter((t): t is string => typeof t === "string");

  return {
    username: str(r.username),
    full_name: str(r.fullName),
    bio: str(r.biography),
    follower_count: num(r.followersCount),
    following_count: num(r.followsCount),
    post_count: num(r.postsCount),
    is_business: bool(r.isBusinessAccount),
    is_verified: bool(r.verified),
    category: str(r.businessCategoryName),
    external_url_in_bio: str(r.externalUrl),
    highlight_titles: highlights.length ? JSON.stringify(highlights) : null,
    raw_json: JSON.stringify(raw),
  };
}

const CTA_PHRASES = [
  "dm",
  "link in bio",
  "book",
  "call us",
  "click",
  "swipe",
  "comment below",
  "tag a friend",
  "save this",
  "share this",
  "visit us",
  "contact us",
];

function mapPostType(t: unknown): NormalizedPost["post_type"] {
  if (t === "Video") return "reel";
  if (t === "Sidecar") return "carousel";
  if (t === "Image") return "image";
  return "image";
}

function extractHook(caption: string): string | null {
  if (!caption) return null;
  const noHashtags = caption.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
  if (!noHashtags) return null;
  return noHashtags.slice(0, 125).trim();
}

function detectCta(caption: string): boolean {
  const lower = caption.toLowerCase();
  return CTA_PHRASES.some((p) => lower.includes(p));
}

export function normalizePost(raw: unknown): NormalizedPost {
  const r = obj(raw);
  const caption = (str(r.caption) ?? "") as string;
  const hashtags = arr(r.hashtags).filter(
    (h): h is string =>
      typeof h === "string" && h.replace(/^#/, "").length >= 3 && !/^\d+$/.test(h.replace(/^#/, "")),
  );
  const mentions = arr(r.mentions).filter(
    (m): m is string => typeof m === "string",
  );

  return {
    shortcode: str(r.shortCode),
    post_type: mapPostType(r.type),
    caption,
    hashtags: JSON.stringify(hashtags),
    mentions: JSON.stringify(mentions),
    location_name: str(r.locationName),
    location_id: str(r.locationId),
    like_count: num(r.likesCount) ?? 0,
    comment_count: num(r.commentsCount) ?? 0,
    play_count: num(r.videoViewCount),
    posted_at: str(r.timestamp),
    hook_text: extractHook(caption),
    has_cta: detectCta(caption),
    has_local_reference: false,
    raw_json: JSON.stringify(raw),
  };
}

const EMOJI_RE = /\p{Extended_Pictographic}/gu;

export function normalizeComment(raw: unknown): NormalizedComment {
  const r = obj(raw);
  const text = (str(r.text) ?? str(r.comment) ?? "") as string;
  const emojiMatches = text.match(EMOJI_RE) ?? [];
  return {
    commenter_username: str(r.ownerUsername) ?? str(r.username),
    comment_text: text,
    comment_length: text.length,
    has_question: /\?/.test(text),
    has_tag: /@\w+/.test(text),
    emoji_count: emojiMatches.length,
  };
}

export function normalizeHashtag(
  raw: unknown,
  source: NormalizedHashtag["source"],
): NormalizedHashtag {
  const r = obj(raw);
  const tag =
    str(r.name) ?? str(r.hashtag) ?? str((r as AnyObj)["tag"]) ?? "";
  const count = num(r.postsCount) ?? num((r as AnyObj)["count"]);
  return {
    hashtag: tag,
    post_count: count,
    source,
  };
}
