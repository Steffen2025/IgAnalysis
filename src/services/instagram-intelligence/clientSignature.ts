/**
 * Client content signature.
 *
 * Two "moving apps" can be totally different businesses. Rather than judging
 * competitors only by a category label, we extract what the client *actually
 * posts about* — their real caption keywords, hashtags, and hook types — and
 * score competitors on overlap with that signature. This is what makes the
 * comparison specific to each unique account.
 */

import type { ReportData } from "../report/reportDataAssembler.js";

export interface ClientSignature {
  /** Most frequent meaningful caption keywords. */
  keywords: string[];
  /** Client's own hashtags (lowercased, no #). */
  hashtags: string[];
  /** Dominant hook types the client uses. */
  hookTypes: string[];
  /** A single seed string for embedding the client's content theme. */
  seedText: string;
}

const STOP = new Set([
  "the", "and", "for", "with", "you", "your", "our", "are", "this", "that", "have", "from", "all", "out",
  "get", "got", "can", "will", "just", "now", "new", "more", "one", "out", "use", "how", "what", "when",
  "who", "why", "they", "their", "them", "has", "was", "but", "not", "any", "see", "let", "via", "amp",
  "instagram", "reel", "reels", "post", "link", "bio", "follow", "like", "comment", "share", "today",
]);

function topTokens(captions: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const cap of captions) {
    const words = (cap ?? "")
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/[#@]\w+/g, " ")
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w));
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w]) => w);
}

export function buildClientSignature(data: ReportData): ClientSignature {
  const captions = data.client.posts.map((p) => p.caption ?? "").filter(Boolean);
  const keywords = topTokens(captions, 15);

  const hashtags = (data.hashtagHygiene?.topClientHashtags ?? [])
    .map((h) => String(h).replace(/^#/, "").toLowerCase())
    .filter(Boolean)
    .slice(0, 15);

  const hookTypes = Object.entries(data.client.feature_summary?.hook_distribution ?? {})
    .filter(([k]) => k && k.toLowerCase() !== "unknown")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const seedText = [
    data.reportContext.businessClassification,
    data.client.profile?.bio ?? "",
    keywords.join(" "),
    hashtags.join(" "),
  ]
    .filter(Boolean)
    .join(". ")
    .slice(0, 600);

  return { keywords, hashtags, hookTypes, seedText };
}

/** 0..100 overlap of a candidate's text with the client signature. */
export function contentOverlapScore(candidateText: string, sig: ClientSignature): { score: number; matched: string[] } {
  const hay = (candidateText ?? "").toLowerCase();
  const terms = Array.from(new Set([...sig.keywords, ...sig.hashtags]));
  if (terms.length === 0) return { score: 0, matched: [] };
  const matched = terms.filter((t) => t && hay.includes(t));
  // Scale: each match worth ~15, capped at 100.
  return { score: Math.min(100, matched.length * 15), matched: matched.slice(0, 5) };
}
