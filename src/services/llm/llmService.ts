import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { llm_cache } from "../../db/schema.js";

export type LLMModel = "haiku" | "sonnet" | "opus";

export const MODEL_IDS: Record<LLMModel, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-7",
};

const TTL_LLM_DAYS = 30;

export function validateLLMKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error("ANTHROPIC_API_KEY is not set in environment. Add it to your .env file.");
  }
  return key.trim();
}

function makePromptHash(modelId: string, systemPrompt: string, prompt: string): string {
  const raw = `${modelId}:${systemPrompt}:${prompt}`;
  return crypto.createHash("sha1").update(raw).digest("hex");
}

export interface LLMCallResult {
  text: string;
  cached: boolean;
  model: LLMModel;
}

export async function callLLM(params: {
  model: LLMModel;
  prompt: string;
  maxTokens: number;
  systemPrompt?: string;
  cacheTTLDays?: number;
}): Promise<LLMCallResult> {
  const { model, prompt, maxTokens, systemPrompt = "", cacheTTLDays = TTL_LLM_DAYS } = params;
  const modelId = MODEL_IDS[model];
  const hash = makePromptHash(modelId, systemPrompt, prompt);

  // Check cache
  const now = new Date().toISOString();
  const cached = await db
    .select()
    .from(llm_cache)
    .where(and(eq(llm_cache.prompt_hash, hash), gt(llm_cache.expires_at, now)))
    .limit(1);

  if (cached.length > 0) {
    return { text: cached[0].response, cached: true, model };
  }

  // Call API
  const apiKey = validateLLMKey();
  const client = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  const response = await client.messages.create({
    model: modelId,
    max_tokens: maxTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages,
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Store in cache
  const expiresAt = new Date(Date.now() + cacheTTLDays * 24 * 3600 * 1000).toISOString();
  await db.insert(llm_cache)
    .values({
      prompt_hash: hash,
      model: modelId,
      prompt: `${systemPrompt ? `[SYSTEM] ${systemPrompt}\n\n` : ""}${prompt}`,
      response: text,
      expires_at: expiresAt,
    })
    .onConflictDoUpdate({
      target: llm_cache.prompt_hash,
      set: { response: text, expires_at: expiresAt, updated_at: now },
    });

  return { text, cached: false, model };
}

export async function callLLMJSON<T>(params: {
  model: LLMModel;
  prompt: string;
  maxTokens: number;
  systemPrompt?: string;
  cacheTTLDays?: number;
}): Promise<T> {
  const jsonPrompt = params.prompt + "\n\nRespond with ONLY valid JSON. No markdown fences, no explanation.";
  const result = await callLLM({ ...params, prompt: jsonPrompt });

  // Strip markdown fences if present
  let text = result.text.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(`callLLMJSON: failed to parse JSON response — ${(err as Error).message}\nRaw: ${text.slice(0, 300)}`);
  }
}
