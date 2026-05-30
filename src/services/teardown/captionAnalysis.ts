// Deterministic caption + hook mining. Extracts the structural signals an
// LLM can't reliably count: CTA patterns, the "comment KEYWORD" engine that
// manufactures comment volume, hook openers, caption length distribution.
// The LLM caption-system writeup is built on top of these grounded facts.

import type { TeardownContent } from "../../db/schema.js";

export interface CaptionExemplar {
  shortcode: string | null;
  content_type: string;
  like_count: number | null;
  comment_count: number | null;
  firstLine: string;
  caption: string;
}

export interface CaptionStats {
  analyzed: number;
  withCaption: number;
  length: { avg: number; median: number; min: number; max: number };
  hooks: {
    avgFirstLineLength: number;
    questionHookPct: number;
    numberHookPct: number;
    commonOpeners: Array<{ opener: string; count: number }>;
  };
  cta: {
    commentKeywordPct: number; // % of captions using a "comment WORD" CTA
    linkInBioPct: number;
    dmPct: number;
    savePct: number;
    followPct: number;
    tagFriendPct: number;
    keywords: Array<{ keyword: string; count: number }>; // the manufactured-comment triggers
  };
  emojiUsagePct: number;
  // Correlation: does a "comment KEYWORD" CTA track with more comments?
  ctaCommentLift: {
    withCtaAvgComments: number;
    withoutCtaAvgComments: number;
    liftRatio: number | null;
  };
  exemplars: CaptionExemplar[]; // top captions by comments, for the LLM
}

const COMMENT_KEYWORD_RE =
  /\bcomment(?:ing)?\s+(?:the word\s+)?["'“”‘’]?([A-Za-z][A-Za-z0-9]{1,24})["'“”‘’]?/i;
const LINK_IN_BIO_RE = /link\s+in\s+(?:my\s+)?bio|bio\s+link/i;
const DM_RE = /\bdm\b|\bd\.m\.?\b|send me a (?:message|dm)|message me/i;
const SAVE_RE = /\bsave (?:this|it|for later)\b|bookmark this/i;
const FOLLOW_RE = /\bfollow\s+(?:me|us|@|for)\b/i;
const TAG_FRIEND_RE = /\btag (?:a|your|someone|3|three|two|2)\b|tag (?:a )?friend/i;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

function avg(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}
function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function firstLineOf(caption: string): string {
  return (caption.split(/\r?\n/)[0] ?? "").trim();
}

// First 1-3 words of the hook, lowercased, as an "opener" signature.
function openerOf(firstLine: string): string {
  const words = firstLine
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  return words.join(" ").toLowerCase();
}

export function analyzeCaptions(content: TeardownContent[]): CaptionStats {
  const withCaption = content.filter((c) => (c.caption ?? "").trim().length > 0);
  const lengths = withCaption.map((c) => (c.caption ?? "").length);

  const firstLineLengths: number[] = [];
  let questionHooks = 0;
  let numberHooks = 0;
  const openerFreq = new Map<string, number>();

  let commentKeyword = 0;
  let linkInBio = 0;
  let dm = 0;
  let save = 0;
  let follow = 0;
  let tagFriend = 0;
  let emoji = 0;
  const keywordFreq = new Map<string, number>();

  const withCtaComments: number[] = [];
  const withoutCtaComments: number[] = [];

  for (const c of withCaption) {
    const caption = c.caption ?? "";
    const fl = firstLineOf(caption);
    firstLineLengths.push(fl.length);
    if (/\?/.test(fl)) questionHooks += 1;
    if (/\b\d+\b/.test(fl)) numberHooks += 1;
    const opener = openerOf(fl);
    if (opener) openerFreq.set(opener, (openerFreq.get(opener) ?? 0) + 1);

    const kwMatch = caption.match(COMMENT_KEYWORD_RE);
    const hasCommentCta = Boolean(kwMatch);
    if (hasCommentCta) {
      commentKeyword += 1;
      const kw = kwMatch?.[1]?.toUpperCase();
      if (kw) keywordFreq.set(kw, (keywordFreq.get(kw) ?? 0) + 1);
    }
    if (LINK_IN_BIO_RE.test(caption)) linkInBio += 1;
    if (DM_RE.test(caption)) dm += 1;
    if (SAVE_RE.test(caption)) save += 1;
    if (FOLLOW_RE.test(caption)) follow += 1;
    if (TAG_FRIEND_RE.test(caption)) tagFriend += 1;
    if (EMOJI_RE.test(caption)) emoji += 1;

    if (typeof c.comment_count === "number") {
      (hasCommentCta ? withCtaComments : withoutCtaComments).push(c.comment_count);
    }
  }

  const n = withCaption.length || 1;
  const withCtaAvg = avg(withCtaComments);
  const withoutCtaAvg = avg(withoutCtaComments);

  const commonOpeners = [...openerFreq.entries()]
    .filter(([opener]) => opener.length > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([opener, count]) => ({ opener, count }));

  const keywords = [...keywordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([keyword, count]) => ({ keyword, count }));

  const exemplars: CaptionExemplar[] = [...withCaption]
    .filter((c) => typeof c.comment_count === "number")
    .sort((a, b) => (b.comment_count ?? 0) - (a.comment_count ?? 0))
    .slice(0, 12)
    .map((c) => ({
      shortcode: c.shortcode,
      content_type: c.content_type,
      like_count: c.like_count,
      comment_count: c.comment_count,
      firstLine: firstLineOf(c.caption ?? ""),
      caption: (c.caption ?? "").slice(0, 1200),
    }));

  return {
    analyzed: content.length,
    withCaption: withCaption.length,
    length: {
      avg: Math.round(avg(lengths)),
      median: Math.round(median(lengths)),
      min: lengths.length ? Math.min(...lengths) : 0,
      max: lengths.length ? Math.max(...lengths) : 0,
    },
    hooks: {
      avgFirstLineLength: Math.round(avg(firstLineLengths)),
      questionHookPct: questionHooks / n,
      numberHookPct: numberHooks / n,
      commonOpeners,
    },
    cta: {
      commentKeywordPct: commentKeyword / n,
      linkInBioPct: linkInBio / n,
      dmPct: dm / n,
      savePct: save / n,
      followPct: follow / n,
      tagFriendPct: tagFriend / n,
      keywords,
    },
    emojiUsagePct: emoji / n,
    ctaCommentLift: {
      withCtaAvgComments: Math.round(withCtaAvg),
      withoutCtaAvgComments: Math.round(withoutCtaAvg),
      liftRatio: withoutCtaAvg > 0 ? withCtaAvg / withoutCtaAvg : null,
    },
    exemplars,
  };
}
