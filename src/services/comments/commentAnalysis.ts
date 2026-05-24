import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { comments, competitor_posts, competitors } from "../../db/schema.js";

export interface CommentAnalysisResult {
  totalComments: number;
  byCompetitorType: Record<string, number>;
  questionRate: number;
  tagRate: number;
  avgLength: number;
  topQuestions: string[];
  topTaggingComments: string[];
  topPraiseTokens: Array<{ token: string; count: number }>;
  topConcerns: string[];
  audienceLanguage: string[];
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "is", "it", "this", "that", "was", "are", "be", "been", "have", "has", "had",
  "i", "you", "we", "they", "he", "she", "my", "your", "our", "their", "me", "us",
  "so", "do", "did", "not", "no", "can", "will", "just", "from", "as", "if", "by",
  "its", "what", "how", "when", "where", "who", "which", "all", "more", "out",
  "up", "get", "go", "there", "here", "than", "then", "also", "very", "too",
  "would", "could", "should", "about", "s", "t", "re", "m", "ll", "d", "ve",
]);

const PRAISE_TOKENS = [
  "love", "amazing", "delicious", "great", "awesome", "best", "yummy", "wonderful",
  "incredible", "perfect", "favourite", "favorite", "obsessed", "wow", "👏", "❤️",
  "🔥", "😍", "👌", "🙌", "💯", "🤤",
];

const CONCERN_WORDS = [
  "expensive", "pricey", "wait", "slow", "long", "busy", "crowded", "parking",
  "but", "however", "wish", "disappointed", "small", "tiny",
];

export async function analyzeComments(auditId: number): Promise<CommentAnalysisResult> {
  const allComments = db
    .select()
    .from(comments)
    .where(eq(comments.audit_id, auditId))
    .all();

  if (allComments.length === 0) {
    return {
      totalComments: 0,
      byCompetitorType: {},
      questionRate: 0,
      tagRate: 0,
      avgLength: 0,
      topQuestions: [],
      topTaggingComments: [],
      topPraiseTokens: [],
      topConcerns: [],
      audienceLanguage: [],
    };
  }

  // Build competitor_post_id → competitor_type map
  const compPostIds = [...new Set(
    allComments
      .filter((c) => c.competitor_post_id != null)
      .map((c) => c.competitor_post_id as number),
  )];

  const compTypeMap: Record<number, string> = {};
  if (compPostIds.length > 0) {
    for (const cpId of compPostIds) {
      const row = db
        .select({ competitor_type: competitors.competitor_type })
        .from(competitor_posts)
        .innerJoin(competitors, eq(competitor_posts.competitor_id, competitors.id))
        .where(eq(competitor_posts.id, cpId))
        .limit(1)
        .all();
      if (row[0]?.competitor_type) {
        compTypeMap[cpId] = row[0].competitor_type;
      }
    }
  }

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const byCompetitorType: Record<string, number> = {};
  let questionCount = 0;
  let tagCount = 0;
  let totalLength = 0;
  const questionComments: string[] = [];
  const taggingComments: string[] = [];
  const wordFreq: Record<string, number> = {};
  const praiseFreq: Record<string, number> = {};
  const concernSet = new Set<string>();

  for (const c of allComments) {
    // by competitor type
    const cType = c.competitor_post_id != null
      ? (compTypeMap[c.competitor_post_id] ?? "unknown")
      : "client";
    byCompetitorType[cType] = (byCompetitorType[cType] ?? 0) + 1;

    const text = c.comment_text ?? "";
    const lower = text.toLowerCase();

    if (c.has_question) {
      questionCount++;
      if (questionComments.length < 10) questionComments.push(text.slice(0, 200));
    }

    if (c.has_tag) {
      tagCount++;
      if (taggingComments.length < 10) taggingComments.push(text.slice(0, 200));
    }

    totalLength += c.comment_length ?? text.length;

    // Word frequency (content words only)
    const words = lower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    for (const w of words) {
      wordFreq[w] = (wordFreq[w] ?? 0) + 1;
    }

    // Praise tokens
    for (const token of PRAISE_TOKENS) {
      if (lower.includes(token.toLowerCase())) {
        praiseFreq[token] = (praiseFreq[token] ?? 0) + 1;
      }
    }

    // Concerns
    for (const word of CONCERN_WORDS) {
      if (lower.includes(word)) concernSet.add(word);
    }
  }

  const topPraiseTokens = Object.entries(praiseFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([token, count]) => ({ token, count }));

  const audienceLanguage = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w]) => w);

  return {
    totalComments: allComments.length,
    byCompetitorType,
    questionRate: allComments.length > 0 ? questionCount / allComments.length : 0,
    tagRate: allComments.length > 0 ? tagCount / allComments.length : 0,
    avgLength: allComments.length > 0 ? totalLength / allComments.length : 0,
    topQuestions: questionComments,
    topTaggingComments: taggingComments,
    topPraiseTokens,
    topConcerns: [...concernSet].slice(0, 8),
    audienceLanguage,
  };
}
