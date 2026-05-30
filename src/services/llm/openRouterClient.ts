/**
 * OpenRouter LLM provider (OpenAI-compatible chat completions).
 *
 * The Instagram-intelligence pipeline calls this directly — no Anthropic key,
 * no MCP at runtime. Models are configurable via environment variables so the
 * same code can target nano/mini/other models without edits.
 *
 * Env:
 *   OPENROUTER_API_KEY        (required for live calls)
 *   OPENROUTER_BASE_URL       default https://openrouter.ai/api/v1
 *   OPENROUTER_MODEL_FAST     default openai/gpt-5.4-nano
 *   OPENROUTER_MODEL_SMART    default openai/gpt-5.4-mini
 *   OPENROUTER_APP_NAME       sent as X-Title
 *   OPENROUTER_SITE_URL       sent as HTTP-Referer
 *   OPENROUTER_TIMEOUT_MS     default 60000
 *   OPENROUTER_MAX_RETRIES    default 2
 */

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  modelFast: string;
  modelSmart: string;
  appName: string;
  siteUrl: string;
  timeoutMs: number;
  maxRetries: number;
}

export function getOpenRouterConfig(): OpenRouterConfig {
  return {
    apiKey: process.env.OPENROUTER_API_KEY?.trim() ?? "",
    baseUrl: process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1",
    modelFast: process.env.OPENROUTER_MODEL_FAST?.trim() || "openai/gpt-5.4-nano",
    modelSmart: process.env.OPENROUTER_MODEL_SMART?.trim() || "openai/gpt-5.4-mini",
    appName: process.env.OPENROUTER_APP_NAME?.trim() || "BotLogix Instagram Intelligence",
    siteUrl: process.env.OPENROUTER_SITE_URL?.trim() || "https://botlogix.ca",
    timeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS) || 60000,
    maxRetries: Number(process.env.OPENROUTER_MAX_RETRIES) || 2,
  };
}

/** True when a live OpenRouter call is possible (key present). */
export function isOpenRouterConfigured(): boolean {
  return getOpenRouterConfig().apiKey.length > 0;
}

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterCallParams {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
  /** "json" sets response_format json_object; "json_schema" sends a schema. */
  responseFormat?: "text" | "json" | "json_schema";
  schema?: unknown;
  /** For logging/telemetry. */
  taskLabel?: string;
}

export interface OpenRouterCallResult {
  text: string;
  json?: unknown;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  raw?: unknown;
  elapsedMs: number;
}

class OpenRouterError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "OpenRouterError";
  }
}

function stripJsonFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Single OpenRouter chat completion with timeout + retry + structured result.
 * Throws OpenRouterError on unrecoverable failure (caller decides fallback).
 */
export async function callOpenRouter(params: OpenRouterCallParams): Promise<OpenRouterCallResult> {
  const cfg = getOpenRouterConfig();
  if (!cfg.apiKey) {
    throw new OpenRouterError("OPENROUTER_API_KEY is not set — cannot make a live model call.");
  }

  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature ?? 0.4,
    ...(params.maxTokens ? { max_tokens: params.maxTokens } : {}),
  };
  if (params.responseFormat === "json") {
    body.response_format = { type: "json_object" };
  } else if (params.responseFormat === "json_schema" && params.schema) {
    body.response_format = { type: "json_schema", json_schema: params.schema };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${cfg.apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": cfg.siteUrl,
    "X-Title": cfg.appName,
  };

  const started = Date.now();
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    try {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        // Retry on transient statuses; fail fast otherwise.
        if ([429, 500, 502, 503, 504].includes(res.status) && attempt < cfg.maxRetries) {
          lastErr = new OpenRouterError(`HTTP ${res.status}: ${errText.slice(0, 200)}`, res.status);
          await sleep(500 * (attempt + 1));
          continue;
        }
        throw new OpenRouterError(`HTTP ${res.status}: ${errText.slice(0, 300)}`, res.status);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: OpenRouterCallResult["usage"];
      };
      const text = data.choices?.[0]?.message?.content ?? "";
      const elapsedMs = Date.now() - started;

      let json: unknown;
      if (params.responseFormat === "json" || params.responseFormat === "json_schema") {
        try {
          json = JSON.parse(stripJsonFences(text));
        } catch (e) {
          throw new OpenRouterError(`Model returned non-JSON for task ${params.taskLabel ?? "?"}: ${(e as Error).message}`);
        }
      }

      console.log(
        `[openrouter] task=${params.taskLabel ?? "?"} model=${params.model} ` +
          `tokens=${data.usage?.total_tokens ?? "?"} elapsed=${elapsedMs}ms`,
      );

      return { text, json, model: params.model, usage: data.usage, raw: data, elapsedMs };
    } catch (err) {
      clearTimeout(timer);
      lastErr = err as Error;
      const isAbort = (err as Error).name === "AbortError";
      if (attempt < cfg.maxRetries && (isAbort || err instanceof OpenRouterError)) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      break;
    }
  }
  throw new OpenRouterError(`OpenRouter call failed after ${cfg.maxRetries + 1} attempts: ${lastErr?.message}`);
}

export { OpenRouterError };
