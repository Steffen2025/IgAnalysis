// Deterministic comment-driver analysis over captured teardown_comments.
// Surfaces the mechanics behind comment volume: question/tag rates, emoji
// usage, the keyword-echo effect (people typing the caption's CTA keyword),
// and the most common comment tokens. The LLM driver writeup builds on this.

import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { teardown_comments, teardown_content } from "../../db/schema.js";

export interface CommentDrivers {
  postsWithComments: number;
  totalComments: number;
  questionRate: number;
  tagRate: number;
  emojiRate: number; // share of comments containing >=1 emoji
  avgLength: number;
  shortReplyRate: number; // <= 3 words — the keyword/echo signal
  keywordEchoRate: number; // comments matching a caption CTA keyword
  topTokens: Array<{ token: string; count: number }>;
  topQuestions: string[];
  sample: string[];
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "is", "it", "this", "that", "was", "are", "be", "been", "have", "has", "had",
  "i", "you", "we", "they", "my", "your", "our", "me", "us", "so", "do", "not",
  "no", "can", "will", "just", "from", "as", "if", "by", "im", "u", "ur",
]);

export async function analyzeCommentDrivers(
  teardownId: number,
  ctaKeywords: string[] = [],
): Promise<CommentDrivers> {
  const contentIds = (
    await db
      .select({ id: teardown_content.id })
      .from(teardown_content)
      .where(eq(teardown_content.teardown_id, teardownId))
  ).map((r) => r.id);

  if (contentIds.length === 0) {
    return emptyDrivers();
  }

  const rows = await db
    .select()
    .from(teardown_comments)
    .where(inArray(teardown_comments.content_id, contentIds));

  if (rows.length === 0) return emptyDrivers();

  const kwSet = new Set(ctaKeywords.map((k) => k.toUpperCase()));
  const postsWith = new Set(rows.map((r) => r.content_id)).size;

  let questions = 0;
  let tags = 0;
  let emoji = 0;
  let shortReplies = 0;
  let keywordEcho = 0;
  let totalLen = 0;
  const tokenFreq = new Map<string, number>();
  const questionSamples: string[] = [];
  const sample: string[] = [];

  for (const r of rows) {
    const text = r.comment_text ?? "";
    const lower = text.toLowerCase();
    const upper = text.trim().toUpperCase();
    const words = lower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

    if (r.has_question) {
      questions += 1;
      if (questionSamples.length < 8 && text.trim().length > 2) {
        questionSamples.push(text.slice(0, 160));
      }
    }
    if (r.has_tag) tags += 1;
    if ((r.emoji_count ?? 0) > 0) emoji += 1;
    totalLen += r.comment_length ?? text.length;
    if (words.length > 0 && words.length <= 3) shortReplies += 1;
    if (kwSet.size && (kwSet.has(upper) || [...kwSet].some((k) => upper === k))) keywordEcho += 1;

    for (const w of words) {
      if (w.length >= 3 && !STOPWORDS.has(w)) tokenFreq.set(w, (tokenFreq.get(w) ?? 0) + 1);
    }
    if (sample.length < 20 && text.trim().length > 1) sample.push(text.slice(0, 120));
  }

  const n = rows.length;
  const topTokens = [...tokenFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([token, count]) => ({ token, count }));

  return {
    postsWithComments: postsWith,
    totalComments: n,
    questionRate: questions / n,
    tagRate: tags / n,
    emojiRate: emoji / n,
    avgLength: Math.round(totalLen / n),
    shortReplyRate: shortReplies / n,
    keywordEchoRate: keywordEcho / n,
    topTokens,
    topQuestions: questionSamples,
    sample,
  };
}

function emptyDrivers(): CommentDrivers {
  return {
    postsWithComments: 0,
    totalComments: 0,
    questionRate: 0,
    tagRate: 0,
    emojiRate: 0,
    avgLength: 0,
    shortReplyRate: 0,
    keywordEchoRate: 0,
    topTokens: [],
    topQuestions: [],
    sample: [],
  };
}
