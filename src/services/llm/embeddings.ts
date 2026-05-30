/**
 * Optional embedding-based semantic relevance.
 *
 * Keyword matching is brittle across the infinite variety of businesses.
 * Embeddings let us score competitor relevance by *meaning* — cosine similarity
 * between the client's content seed and each candidate's bio/category text.
 *
 * This is an ENHANCER, not a hard dependency: if no embedding endpoint/key is
 * available (or it errors), callers fall back to keyword + content-overlap
 * scoring. Uses the OpenAI-compatible /embeddings route on the OpenRouter base
 * URL; model is configurable via OPENROUTER_MODEL_EMBED.
 */

import { getOpenRouterConfig } from "./openRouterClient.js";

export function embeddingModel(): string {
  return process.env.OPENROUTER_MODEL_EMBED?.trim() || "openai/text-embedding-3-small";
}

export function embeddingsAvailable(): boolean {
  // Embeddings explicitly opt-in: only attempt when a model is configured,
  // since not every OpenRouter deployment routes the embeddings endpoint.
  return !!process.env.OPENROUTER_API_KEY?.trim() && !!process.env.OPENROUTER_MODEL_EMBED?.trim();
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Batch-embed texts. Returns vectors aligned to input, or null on failure. */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (!embeddingsAvailable() || texts.length === 0) return null;
  const cfg = getOpenRouterConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(`${cfg.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": cfg.siteUrl,
        "X-Title": cfg.appName,
      },
      body: JSON.stringify({ model: embeddingModel(), input: texts.map((t) => t.slice(0, 2000)) }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`[embeddings] HTTP ${res.status} — falling back to keyword relevance`);
      return null;
    }
    const data = (await res.json()) as { data?: Array<{ embedding: number[]; index: number }> };
    if (!data.data?.length) return null;
    const ordered = [...data.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
    return ordered.length === texts.length ? ordered : null;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[embeddings] error: ${(err as Error).message} — falling back`);
    return null;
  }
}

/**
 * Score each candidate text against a seed by cosine similarity (0..100).
 * Returns a Map keyed by the provided id, or null if embeddings unavailable.
 */
export async function semanticRelevance(
  seed: string,
  candidates: Array<{ id: string; text: string }>,
): Promise<Map<string, number> | null> {
  const valid = candidates.filter((c) => c.text.trim());
  if (!seed.trim() || valid.length === 0) return null;
  const vectors = await embedTexts([seed, ...valid.map((c) => c.text)]);
  if (!vectors) return null;
  const [seedVec, ...candVecs] = vectors;
  const out = new Map<string, number>();
  valid.forEach((c, i) => {
    // Map cosine (-1..1, typically 0..1 for text) to 0..100.
    out.set(c.id, Math.round(Math.max(0, Math.min(1, cosine(seedVec, candVecs[i]))) * 100));
  });
  return out;
}
