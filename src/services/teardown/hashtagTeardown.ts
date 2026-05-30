// Deterministic hashtag system analysis. Hashtags are inherently factual
// (frequency, count-per-post, co-occurrence), so M3 keeps this fully
// deterministic — no LLM needed to state which tags an account leans on.

import type { TeardownContent } from "../../db/schema.js";

export interface HashtagStat {
  tag: string;
  count: number;
  pct: number; // share of captioned posts that use it
}

export interface HashtagPair {
  pair: [string, string];
  count: number;
}

export interface HashtagTeardown {
  postsWithHashtags: number;
  totalUniqueTags: number;
  avgPerPost: number;
  medianPerPost: number;
  countAssessment: "too_few" | "in_range" | "too_many";
  topTags: HashtagStat[];
  coreSet: string[]; // tags used on >= 40% of hashtagged posts
  topPairs: HashtagPair[];
  notes: string[];
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.replace(/^#/, "").toLowerCase())
      .filter((t) => t.length >= 2 && !/^\d+$/.test(t));
  } catch {
    return [];
  }
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function analyzeHashtags(content: TeardownContent[]): HashtagTeardown {
  const perPost: string[][] = content
    .map((c) => parseTags(c.hashtags))
    .filter((tags) => tags.length > 0);

  const postsWithHashtags = perPost.length;
  const counts = perPost.map((t) => t.length);
  const avgPerPost = counts.length ? counts.reduce((s, v) => s + v, 0) / counts.length : 0;

  const freq = new Map<string, number>();
  const pairFreq = new Map<string, number>();
  for (const tags of perPost) {
    const unique = [...new Set(tags)];
    for (const t of unique) freq.set(t, (freq.get(t) ?? 0) + 1);
    // co-occurrence pairs (sorted to dedupe direction)
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const key = [unique[i], unique[j]].sort().join("\u0000");
        pairFreq.set(key, (pairFreq.get(key) ?? 0) + 1);
      }
    }
  }

  const denom = postsWithHashtags || 1;
  const topTags: HashtagStat[] = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([tag, count]) => ({ tag: `#${tag}`, count, pct: count / denom }));

  const coreSet = [...freq.entries()]
    .filter(([, count]) => count / denom >= 0.4)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => `#${tag}`);

  const topPairs: HashtagPair[] = [...pairFreq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => {
      const [a, b] = key.split("\u0000");
      return { pair: [`#${a}`, `#${b}`] as [string, string], count };
    });

  const countAssessment: HashtagTeardown["countAssessment"] =
    avgPerPost < 5 ? "too_few" : avgPerPost > 18 ? "too_many" : "in_range";

  const notes: string[] = [];
  if (postsWithHashtags === 0) {
    notes.push("No hashtags found on any captured post — this account does not rely on hashtag discovery.");
  } else {
    notes.push(
      countAssessment === "too_few"
        ? `Avg ${avgPerPost.toFixed(1)} hashtags/post is below the typical 5–18 window — the account leans on other discovery (reels/SEO/shares) over tags.`
        : countAssessment === "too_many"
          ? `Avg ${avgPerPost.toFixed(1)} hashtags/post exceeds 18 — heavy tag stacking.`
          : `Avg ${avgPerPost.toFixed(1)} hashtags/post sits in the healthy 5–18 window.`,
    );
    if (coreSet.length) {
      notes.push(`A stable core set is reused across ≥40% of tagged posts: ${coreSet.join(" ")}.`);
    } else {
      notes.push("No single hashtag appears on ≥40% of posts — tag usage is varied rather than a fixed block.");
    }
  }

  return {
    postsWithHashtags,
    totalUniqueTags: freq.size,
    avgPerPost: Math.round(avgPerPost * 10) / 10,
    medianPerPost: median(counts),
    countAssessment,
    topTags,
    coreSet,
    topPairs,
    notes,
  };
}
