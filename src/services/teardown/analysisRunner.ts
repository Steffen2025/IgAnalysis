// M3 analysis runner. Operates on an already-captured teardown: scrapes top-N
// post comments (budget-gated, cached, idempotent), runs the deterministic
// analyzers, layers the three LLM synthesis tasks (with deterministic
// fallbacks), then writes the structured report.md alongside the M1 exports.
//
// Callable standalone (teardown:analyze) and from the orchestrator phase
// machine, so a fresh `teardown:run` produces the full report end-to-end.

import { writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import {
  teardown_artifacts,
  teardown_content,
  teardowns,
  type Teardown,
  type TeardownContent,
} from "../../db/schema.js";
import { LlmRunLog, runLlmTask, type LlmResponse, type LlmTask } from "../llm/llmClient.js";
import { exportTeardownData } from "./exportData.js";
import { computeMetrics } from "./metrics.js";
import { analyzeCaptions } from "./captionAnalysis.js";
import { analyzeHashtags } from "./hashtagTeardown.js";
import { analyzeCommentDrivers } from "./commentDrivers.js";
import { captureTopPostComments } from "./teardownComments.js";
import {
  renderReportMarkdown,
  type CaptionSystemLlm,
  type CommentDriversLlm,
  type ThesisLlm,
} from "./markdownReport.js";
import {
  buildCaptionSystemPrompt,
  buildCommentDriversPrompt,
  buildSuccessThesisPrompt,
  type TeardownPromptContext,
} from "./teardownPrompts.js";
import { setTeardownPhase, TeardownPhase } from "./teardownState.js";

const TOP_POSTS_FOR_COMMENTS = Number(process.env.TEARDOWN_TOP_POSTS_FOR_COMMENTS ?? "12");

export interface AnalysisOptions {
  scrapeComments?: boolean; // default true
  topPostsForComments?: number;
}

export interface AnalysisResult {
  teardownId: number;
  reportPath: string;
  commentsStored: number;
  llmCalls: number;
  llmOk: number;
  errors: string[];
}

function parseJson<T>(resp: LlmResponse | null): T | null {
  if (!resp) return null;
  if (resp.json && typeof resp.json === "object") return resp.json as T;
  if (!resp.text) return null;
  try {
    const cleaned = resp.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function isNonEmptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

async function recordMarkdownArtifact(teardownId: number, filePath: string): Promise<void> {
  let size = 0;
  try {
    size = statSync(filePath).size;
  } catch {
    size = 0;
  }
  await db.insert(teardown_artifacts).values({
    teardown_id: teardownId,
    kind: "markdown",
    path: filePath,
    size_bytes: size,
  });
}

export async function runTeardownAnalysis(
  teardownId: number,
  opts: AnalysisOptions = {},
): Promise<AnalysisResult> {
  const errors: string[] = [];
  const log = new LlmRunLog();

  const teardown = (await first(
    db.select().from(teardowns).where(eq(teardowns.id, teardownId)).limit(1),
  )) as Teardown | null;
  if (!teardown) throw new Error(`Teardown ${teardownId} not found`);

  const content: TeardownContent[] = await db
    .select()
    .from(teardown_content)
    .where(eq(teardown_content.teardown_id, teardownId))
    .orderBy(asc(teardown_content.posted_at));

  if (content.length === 0) {
    throw new Error(`Teardown ${teardownId} has no captured content — run capture first`);
  }

  // ── Comment capture (budget-gated, idempotent, cached) ──────────────────
  const scrapeComments = opts.scrapeComments !== false;
  const topN = opts.topPostsForComments ?? TOP_POSTS_FOR_COMMENTS;
  let commentCapture = {
    postsTargeted: 0,
    postsScraped: 0,
    cacheHits: 0,
    commentsStored: 0,
    skippedAlreadyHave: 0,
    errors: [] as string[],
    budgetStopped: false,
  };
  if (scrapeComments && topN > 0) {
    console.log(`[teardown] capturing comments for top ${topN} posts by comment volume`);
    commentCapture = await captureTopPostComments(teardownId, topN);
    errors.push(...commentCapture.errors);
  }
  await setTeardownPhase(teardownId, TeardownPhase.COMMENTS_DONE);

  // ── Deterministic analysis ──────────────────────────────────────────────
  const metrics = computeMetrics(content);
  const caption = analyzeCaptions(content);
  const hashtags = analyzeHashtags(content);
  await setTeardownPhase(teardownId, TeardownPhase.HASHTAGS_DONE);
  await setTeardownPhase(teardownId, TeardownPhase.METRICS_DONE);

  const ctaKeywords = caption.cta.keywords.map((k) => k.keyword);
  const drivers = await analyzeCommentDrivers(teardownId, ctaKeywords);

  // ── LLM synthesis (deterministic-grounded, never fabricated) ────────────
  const ctx: TeardownPromptContext = {
    handle: teardown.target_handle ?? "account",
    fullName: teardown.full_name,
    category: teardown.category,
    bio: teardown.bio,
    followerCount: teardown.follower_count,
    postCount: teardown.post_count,
    capturedCount: content.length,
  };

  // Compact JSON payloads for the prompts (keep token cost down).
  const metricsForLlm = JSON.stringify({
    cadence: metrics.cadence,
    overall: metrics.overall,
    formatMix: metrics.formatMix,
    momentum: {
      recent: metrics.momentum.recent,
      prior: metrics.momentum.prior,
      likeDirection: metrics.momentum.likeDirection,
      pctChangeLikes: metrics.momentum.pctChangeLikes,
    },
    outliers: metrics.outliers.slice(0, 5),
  });
  const captionForLlm = JSON.stringify({
    length: caption.length,
    hooks: caption.hooks,
    cta: caption.cta,
    emojiUsagePct: caption.emojiUsagePct,
    ctaCommentLift: caption.ctaCommentLift,
    exemplars: caption.exemplars.slice(0, 8),
  });
  const hashtagForLlm = JSON.stringify({
    avgPerPost: hashtags.avgPerPost,
    countAssessment: hashtags.countAssessment,
    coreSet: hashtags.coreSet,
    topTags: hashtags.topTags.slice(0, 15),
  });
  const driversForLlm = JSON.stringify(drivers);

  const runTask = async (
    task: LlmTask,
    prompt: { system: string; user: string },
    validate: (r: LlmResponse) => boolean,
  ): Promise<LlmResponse | null> =>
    runLlmTask(
      {
        task,
        system: prompt.system,
        user: prompt.user,
        responseFormat: "json",
        temperature: 0.4,
        maxTokens: 1600,
        auditId: teardownId,
        validate,
      },
      log,
    );

  const captionResp = await runTask(
    "teardown_caption_system",
    buildCaptionSystemPrompt(ctx, captionForLlm),
    (r) => {
      const j = parseJson<CaptionSystemLlm>(r);
      return Boolean(j && isNonEmptyArray(j.hook_formulas) && isNonEmptyArray(j.replication_tips));
    },
  );

  let commentDriversResp: LlmResponse | null = null;
  if (drivers.totalComments > 0) {
    commentDriversResp = await runTask(
      "teardown_comment_drivers",
      buildCommentDriversPrompt(ctx, driversForLlm, JSON.stringify(caption.ctaCommentLift)),
      (r) => {
        const j = parseJson<CommentDriversLlm>(r);
        return Boolean(j && isNonEmptyArray(j.primary_drivers));
      },
    );
  }

  const thesisResp = await runTask(
    "teardown_success_thesis",
    buildSuccessThesisPrompt(ctx, metricsForLlm, captionForLlm, hashtagForLlm, driversForLlm),
    (r) => {
      const j = parseJson<ThesisLlm>(r);
      return Boolean(
        j &&
          typeof j.thesis === "string" &&
          j.thesis.length > 20 &&
          Array.isArray(j.pillars) &&
          j.pillars.length >= 3 &&
          j.pillars.length <= 5 &&
          isNonEmptyArray(j.preliminary_playbook),
      );
    },
  );
  await setTeardownPhase(teardownId, TeardownPhase.THESIS_DONE);

  // ── Export + report assembly ────────────────────────────────────────────
  const exportResult = await exportTeardownData(teardownId);

  const markdown = renderReportMarkdown({
    teardown,
    content,
    integrity: exportResult.integrity,
    metrics,
    caption,
    hashtags,
    drivers,
    commentCapture,
    llm: {
      captionSystem: parseJson<CaptionSystemLlm>(captionResp),
      commentDrivers: parseJson<CommentDriversLlm>(commentDriversResp),
      thesis: parseJson<ThesisLlm>(thesisResp),
    },
    exportPaths: {
      jsonPath: exportResult.jsonPath,
      csvPath: exportResult.csvPath,
      integrityPath: exportResult.integrityPath,
    },
    llmLog: log,
  });

  const reportPath = path.join(exportResult.dir, "report.md");
  writeFileSync(reportPath, markdown, "utf-8");
  await recordMarkdownArtifact(teardownId, reportPath);

  const logPath = path.join(exportResult.dir, "llm-run-log.json");
  writeFileSync(logPath, JSON.stringify(log.toJSON(), null, 2), "utf-8");

  await setTeardownPhase(teardownId, TeardownPhase.MD_GENERATED);

  const logJson = log.toJSON();
  return {
    teardownId,
    reportPath,
    commentsStored: commentCapture.commentsStored,
    llmCalls: logJson.calls.length,
    llmOk: logJson.calls.filter((c) => c.ok).length,
    errors,
  };
}
