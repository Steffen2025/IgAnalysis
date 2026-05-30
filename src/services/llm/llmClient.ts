/**
 * Provider-agnostic LLM client for the Instagram-intelligence pipeline.
 *
 * Routes tasks to a fast (nano) or smart (mini) model by default, with an
 * automatic nano→mini escalation when a fast response fails validation. All
 * model names come from config (env) — never hardcoded in business logic.
 *
 * Caching: keyed by audit + task + provider + model + prompt version + input
 * hash, so a prompt-version bump or model swap never serves stale copy.
 */

import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { llm_cache } from "../../db/schema.js";
import {
  callOpenRouter,
  getOpenRouterConfig,
  isOpenRouterConfigured,
  type OpenRouterCallResult,
} from "./openRouterClient.js";
import { PROMPT_VERSION } from "../instagram-intelligence/instagramAnalysisPrompts.js";

export type LlmTask =
  | "category_normalization"
  | "competitor_relevance"
  | "market_pattern_summary"
  | "top_five_moves"
  | "next_seven_days"
  | "thirty_day_sprint"
  | "hashtag_strategy"
  | "content_toolkit"
  | "gold_master_json"
  | "gold_master_markdown"
  | "quality_review"
  | "teardown_caption_system"
  | "teardown_comment_drivers"
  | "teardown_success_thesis";

/** Tasks that default to the smart model. Everything else uses fast. */
const SMART_TASKS = new Set<LlmTask>([
  "gold_master_markdown",
  "gold_master_json",
  "quality_review",
  "teardown_success_thesis",
]);

export interface LlmRequest {
  task: LlmTask;
  system: string;
  user: string;
  /** Override the routed model. */
  model?: string;
  responseFormat?: "text" | "json" | "json_schema";
  schema?: unknown;
  temperature?: number;
  maxTokens?: number;
  /** For cache keying — usually the auditId. */
  auditId?: number;
  /** Validator; returning false triggers nano→mini escalation. */
  validate?: (r: LlmResponse) => boolean;
  /** Skip cache read/write. */
  noCache?: boolean;
}

export interface LlmResponse {
  text: string;
  json?: unknown;
  model: string;
  task: LlmTask;
  usage?: unknown;
  raw?: unknown;
  elapsedMs?: number;
  cached?: boolean;
  /** True when this came from a fallback model after fast failed validation. */
  escalated?: boolean;
}

const TTL_DAYS = 30;

function defaultModelFor(task: LlmTask): string {
  const cfg = getOpenRouterConfig();
  return SMART_TASKS.has(task) ? cfg.modelSmart : cfg.modelFast;
}

function cacheKey(req: LlmRequest, model: string): string {
  const raw = JSON.stringify({
    audit: req.auditId ?? 0,
    task: req.task,
    provider: "openrouter",
    model,
    promptVersion: PROMPT_VERSION,
    system: req.system,
    user: req.user,
    format: req.responseFormat ?? "text",
  });
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function readCache(hash: string): Promise<string | null> {
  const now = new Date().toISOString();
  const rows = await db
    .select()
    .from(llm_cache)
    .where(and(eq(llm_cache.prompt_hash, hash), gt(llm_cache.expires_at, now)))
    .limit(1);
  return rows[0]?.response ?? null;
}

async function writeCache(hash: string, model: string, system: string, user: string, response: string): Promise<void> {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86400000).toISOString();
  await db
    .insert(llm_cache)
    .values({
      prompt_hash: hash,
      model,
      prompt: `[v${PROMPT_VERSION}][SYSTEM] ${system}\n\n${user}`,
      response,
      expires_at: expiresAt,
    })
    .onConflictDoUpdate({
      target: llm_cache.prompt_hash,
      set: { response, expires_at: expiresAt, updated_at: now },
    });
}

function toResponse(task: LlmTask, r: OpenRouterCallResult, escalated: boolean): LlmResponse {
  return {
    text: r.text,
    json: r.json,
    model: r.model,
    task,
    usage: r.usage,
    raw: r.raw,
    elapsedMs: r.elapsedMs,
    cached: false,
    escalated,
  };
}

export interface LlmRunLogEntry {
  task: LlmTask;
  model: string;
  cached: boolean;
  escalated: boolean;
  ok: boolean;
  elapsedMs?: number;
  usage?: unknown;
  error?: string;
}

/** Accumulates per-run telemetry for the llm-run-log.json artifact. */
export class LlmRunLog {
  entries: LlmRunLogEntry[] = [];
  add(entry: LlmRunLogEntry): void {
    this.entries.push(entry);
  }
  toJSON(): { promptVersion: string; provider: string; configured: boolean; calls: LlmRunLogEntry[] } {
    return {
      promptVersion: PROMPT_VERSION,
      provider: "openrouter",
      configured: isOpenRouterConfigured(),
      calls: this.entries,
    };
  }
}

/**
 * Run an LLM task. Returns null (never throws) when the provider is not
 * configured or all attempts fail — callers must supply a deterministic
 * fallback and record the gap. This is what lets the whole pipeline run with
 * no API key while refusing to fabricate.
 */
export async function runLlmTask(req: LlmRequest, log?: LlmRunLog): Promise<LlmResponse | null> {
  const primaryModel = req.model ?? defaultModelFor(req.task);

  // Cache read (primary model).
  if (!req.noCache) {
    const hash = cacheKey(req, primaryModel);
    const hit = await readCache(hash);
    if (hit) {
      const resp: LlmResponse = { text: hit, model: primaryModel, task: req.task, cached: true, escalated: false };
      if (req.responseFormat && req.responseFormat !== "text") {
        try { resp.json = JSON.parse(hit.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); } catch { /* leave text */ }
      }
      log?.add({ task: req.task, model: primaryModel, cached: true, escalated: false, ok: true });
      return resp;
    }
  }

  if (!isOpenRouterConfigured()) {
    log?.add({ task: req.task, model: primaryModel, cached: false, escalated: false, ok: false, error: "OPENROUTER_API_KEY not set" });
    return null;
  }

  const messages = [
    { role: "system" as const, content: req.system },
    { role: "user" as const, content: req.user },
  ];

  // Attempt 1: primary (usually fast) model.
  try {
    const r = await callOpenRouter({
      model: primaryModel,
      messages,
      temperature: req.temperature,
      maxTokens: req.maxTokens,
      responseFormat: req.responseFormat,
      schema: req.schema,
      taskLabel: req.task,
    });
    const resp = toResponse(req.task, r, false);
    const valid = req.validate ? req.validate(resp) : true;
    if (valid) {
      if (!req.noCache) await writeCache(cacheKey(req, primaryModel), primaryModel, req.system, req.user, r.text);
      log?.add({ task: req.task, model: primaryModel, cached: false, escalated: false, ok: true, elapsedMs: r.elapsedMs, usage: r.usage });
      return resp;
    }
    // Attempt 1b: same model, one retry feeding the failure back so it can self-correct.
    console.warn(`[llm] task=${req.task} failed validation on ${primaryModel} — retrying same model with correction`);
    const retryMessages = [
      ...messages,
      { role: "assistant" as const, content: r.text.slice(0, 2000) },
      { role: "user" as const, content: "Your previous response did NOT satisfy the required JSON schema (wrong array length, missing/empty fields, nested objects where strings are required, or extra commentary). Return ONLY the corrected strict JSON object exactly as specified — no markdown, no prose." },
    ];
    try {
      const r2 = await callOpenRouter({ model: primaryModel, messages: retryMessages, temperature: 0, maxTokens: req.maxTokens, responseFormat: req.responseFormat, schema: req.schema, taskLabel: `${req.task}#retry` });
      const resp2 = toResponse(req.task, r2, false);
      if (!req.validate || req.validate(resp2)) {
        if (!req.noCache) await writeCache(cacheKey(req, primaryModel), primaryModel, req.system, req.user, r2.text);
        log?.add({ task: req.task, model: primaryModel, cached: false, escalated: false, ok: true, elapsedMs: r2.elapsedMs, usage: r2.usage });
        return resp2;
      }
    } catch (e) {
      console.warn(`[llm] task=${req.task} retry error: ${(e as Error).message}`);
    }
    console.warn(`[llm] task=${req.task} still invalid — escalating to smart model`);
  } catch (err) {
    console.warn(`[llm] task=${req.task} error on ${primaryModel}: ${(err as Error).message} — escalating`);
  }

  // Attempt 2: smart model escalation.
  const smartModel = getOpenRouterConfig().modelSmart;
  if (smartModel !== primaryModel) {
    try {
      const r = await callOpenRouter({
        model: smartModel,
        messages,
        temperature: req.temperature,
        maxTokens: req.maxTokens,
        responseFormat: req.responseFormat,
        schema: req.schema,
        taskLabel: `${req.task}#escalated`,
      });
      const resp = toResponse(req.task, r, true);
      if (req.validate && !req.validate(resp)) {
        log?.add({ task: req.task, model: smartModel, cached: false, escalated: true, ok: false, elapsedMs: r.elapsedMs, usage: r.usage, error: "failed validation on smart model" });
        return null;
      }
      if (!req.noCache) await writeCache(cacheKey(req, smartModel), smartModel, req.system, req.user, r.text);
      log?.add({ task: req.task, model: smartModel, cached: false, escalated: true, ok: true, elapsedMs: r.elapsedMs, usage: r.usage });
      return resp;
    } catch (err) {
      log?.add({ task: req.task, model: smartModel, cached: false, escalated: true, ok: false, error: (err as Error).message });
    }
  }
  return null;
}
