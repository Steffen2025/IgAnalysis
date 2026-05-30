/**
 * Local intelligence layer.
 *
 * When direct competitors are thin (common in niche local trades), the next-best
 * signal is what the *surrounding local businesses* are doing: the hashtags they
 * use, the accounts they spotlight/tag, and the local wording that reaches the
 * same interest group. This module mines that from the full local candidate
 * pool — including sub-threshold accounts — so a thin niche still yields a strong
 * local hashtag + wording set, plus up to two genuine local success stories.
 *
 * Generic across categories; nothing client-specific lives here.
 */

import type { ReportCompetitor } from "../report/reportDataAssembler.js";
import type { LocalSignal, LocalSuccessStory } from "./goldMasterSchema.js";
import type { ClientSignature } from "./clientSignature.js";
import { localSuccessBand } from "./referenceConfig.js";

const STOP = new Set([
  "the", "and", "for", "with", "you", "your", "our", "are", "this", "that", "have", "from", "all",
  "get", "got", "can", "will", "just", "now", "new", "more", "one", "out", "use", "how", "what",
  "they", "their", "them", "has", "was", "but", "any", "see", "let", "via", "amp", "instagram",
  "reel", "reels", "post", "link", "bio", "follow", "like", "comment", "share", "today", "day",
  "facebook", "tiktok", "youtube", "twitter", "others", "same", "video", "photo", "click", "here",
  "call", "contact", "message", "info", "details", "check", "want", "need", "make",
]);

function texts(c: ReportCompetitor): string {
  return [c.bio, ...(c.top_posts ?? []).map((p) => p.caption ?? ""), c.latest_post?.caption ?? ""].filter(Boolean).join(" \n ");
}

function topCounted(items: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k]) => k);
}

function extractTags(text: string): string[] {
  return (text.match(/#([A-Za-z0-9_]+)/g) ?? []).map((t) => t.slice(1).toLowerCase()).filter((t) => t.length >= 2 && t.length <= 30);
}

function extractMentions(text: string): string[] {
  return (text.match(/@([A-Za-z0-9_.]+)/g) ?? []).map((t) => t.slice(1).toLowerCase()).filter((t) => t.length >= 2);
}

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#@]\w+/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
}

function successScore(c: ReportCompetitor): number {
  const rates = (c.top_posts ?? []).map((p) => p.engagement_rate ?? 0).filter((r) => r > 0);
  const engagement = rates.length ? Math.min(100, Math.round((rates.reduce((s, r) => s + r, 0) / rates.length) * 1000)) : 0;
  const consistency = Math.min(100, ((c.post_count ?? 0) / 300) * 100);
  return Math.round(0.7 * engagement + 0.3 * consistency);
}

/**
 * Build the local signal from the local candidate pool + the client's own
 * content signature. `clientHandle` is excluded from spotlights.
 */
export function buildLocalSignal(
  localPool: ReportCompetitor[],
  signature: ClientSignature,
  complementaryTerms: string[],
  clientHandle: string,
  directCompetitorsSelected: number,
): LocalSignal {
  const band = localSuccessBand();
  const allTags: string[] = [];
  const allMentions: string[] = [];
  const allWords: string[] = [];

  for (const c of localPool) {
    const t = texts(c);
    allTags.push(...extractTags(t));
    allMentions.push(...extractMentions(t));
    allWords.push(...extractWords(t));
  }

  // Success stories: local accounts in the 5k–50k band, ranked by success.
  const stories: LocalSuccessStory[] = localPool
    .filter((c) => c.follower_count != null && c.follower_count >= band.min && c.follower_count <= band.max)
    .map((c) => ({ c, s: successScore(c) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 2)
    .map(({ c, s }) => ({
      handle: c.username ?? "(unknown)",
      followers: c.follower_count,
      successScore: s,
      whatTheyDoWell: c.top_posts?.[0]?.hook_type === "question"
        ? "Question-led posts that pull local engagement."
        : `Consistent ${c.top_posts?.[0]?.post_type ?? "content"} with steady local following.`,
    }));

  // Local hashtags: merge mined tags with the client's own (de-duped), drop the
  // generic ones already everywhere.
  const minedTags = topCounted(allTags, 20).filter((t) => !/^(reels?|instagram|instagood|viral|fyp|explore)$/.test(t));
  const localHashtags = Array.from(new Set([...minedTags, ...signature.hashtags])).slice(0, 15);

  const spotlightedAccounts = topCounted(allMentions, 12).filter((h) => h !== clientHandle.toLowerCase()).slice(0, 8);
  // Exclude leaked handle tokens (a word that is a chunk of a competitor username).
  const handleBlob = localPool.map((c) => (c.username ?? "").toLowerCase()).join(" ");
  const localWording = topCounted(allWords, 25).filter((w) => w.length <= 14 && !handleBlob.includes(w)).slice(0, 15);

  const note = directCompetitorsSelected > 0
    ? "Local signal mined from the surrounding local business pool to complement the direct competitors."
    : "Direct competitor data is thin in this niche. This local signal — hashtags, spotlighted accounts, and local wording mined from nearby businesses — is the next-best intelligence: it targets the same local interest group through complementary accounts and topics.";

  return { successStories: stories, localHashtags, spotlightedAccounts, localWording, complementaryTerms, note };
}
