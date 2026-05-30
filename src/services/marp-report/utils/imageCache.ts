import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Downloads remote Instagram images (profile pictures, post thumbnails) to a
 * local cache directory so the Marp/Chromium PDF renderer can embed them via
 * file:// URLs with --allow-local-files. Instagram CDN URLs are signed and
 * expire/403 frequently, so remote embedding is unreliable; caching once and
 * referencing locally is the safe path.
 *
 * Design rules (per product spec):
 *  - stable filenames (hash of url) so re-runs reuse the cache
 *  - hard timeout + graceful failure (never throw to the caller)
 *  - one failed image must never block report generation
 *  - callers fall back to initials when this returns null
 */

const CACHE_ROOT = resolve(process.cwd(), "reports", "media");
const TIMEOUT_MS = 6_000;
const MAX_BYTES = 6 * 1024 * 1024; // 6MB safety cap

function extFromContentType(ct: string | null): string {
  if (!ct) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  return "jpg";
}

function cacheDirFor(auditId: number): string {
  const dir = join(CACHE_ROOT, String(auditId));
  mkdirSync(dir, { recursive: true });
  return dir;
}

function stableName(url: string, ext: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 16) + "." + ext;
}

/** Absolute file:// URL for an existing local path. */
export function toFileUrl(absPath: string): string {
  return "file:///" + absPath.replace(/\\/g, "/").replace(/^\/+/, "");
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Base64 data: URI for a cached image. Headless Chromium (Marp PDF/PNG render)
 * silently refuses to load file:// sub-resources even with --allow-local-files,
 * so we embed images inline instead — this renders reliably in PDF, HTML, and
 * PPTX exports.
 */
function toDataUri(absPath: string): string {
  const ext = absPath.split(".").pop()?.toLowerCase() ?? "jpg";
  const mime = MIME_BY_EXT[ext] ?? "image/jpeg";
  const b64 = readFileSync(absPath).toString("base64");
  return `data:${mime};base64,${b64}`;
}

export interface CachedImage {
  /** Absolute filesystem path to the cached file. */
  path: string;
  /** file:// URL for the cached file (kept for non-render consumers). */
  fileUrl: string;
  /** Base64 data: URI for reliable embedding in an <img src> in the deck. */
  dataUri: string;
}

/**
 * Download (or reuse) a remote image. Returns null on any failure so the caller
 * can render an initials placeholder instead. Never throws.
 */
export async function cacheRemoteImage(
  url: string | null | undefined,
  auditId: number,
): Promise<CachedImage | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;

  try {
    const dir = cacheDirFor(auditId);

    // Reuse an existing cached file regardless of extension.
    for (const ext of ["jpg", "png", "webp", "gif"]) {
      const candidate = join(dir, stableName(url, ext));
      if (existsSync(candidate) && statSync(candidate).size > 0) {
        return { path: candidate, fileUrl: toFileUrl(candidate), dataUri: toDataUri(candidate) };
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: { "user-agent": "Mozilla/5.0 (BotLogix Workbook Renderer)" },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      console.warn(`[imageCache] ${res.status} for ${url.slice(0, 80)} — using fallback`);
      return null;
    }

    const ext = extFromContentType(res.headers.get("content-type"));
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) {
      console.warn(`[imageCache] size ${buf.byteLength} out of range for ${url.slice(0, 80)}`);
      return null;
    }

    const out = join(dir, stableName(url, ext));
    writeFileSync(out, buf);
    return { path: out, fileUrl: toFileUrl(out), dataUri: toDataUri(out) };
  } catch (err) {
    console.warn(
      `[imageCache] failed for ${String(url).slice(0, 80)}: ${(err as Error).message}`,
    );
    return null;
  }
}
