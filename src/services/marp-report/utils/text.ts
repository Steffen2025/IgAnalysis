/**
 * Shared text helpers for the workbook slide builders.
 * Every visual component should run untrusted strings (captions, LLM markdown,
 * competitor bios) through these before injecting them into a slide so we never
 * dump raw markdown, overflow a card, or break HTML.
 */

/** HTML-escape a string for safe injection into slide markup. */
export function escapeHtml(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Strip common markdown decoration so it reads as plain prose in a card. */
export function cleanMarkdown(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/```[\s\S]*?```/g, " ") // fenced code
    .replace(/`([^`]*)`/g, "$1") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → label
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1") // bold/italic
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/^\s*[-*+]\s+/gm, "") // list bullets
    .replace(/^\s*\d+[.)]\s+/gm, "") // ordered list markers
    .replace(/^\s*>\s?/gm, "") // blockquotes
    .replace(/\|/g, " ") // stray table pipes
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove backticks only (for copy blocks where other markdown is intentional). */
export function stripBackticks(s: string | null | undefined): string {
  return (s ?? "").replace(/`+/g, "").trim();
}

/** Drop any markdown table block from a string entirely. */
export function stripMarkdownTable(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .split("\n")
    .filter((line) => !/^\s*\|.*\|\s*$/.test(line) && !/^\s*\|?[-:\s|]+\|?\s*$/.test(line))
    .join("\n")
    .trim();
}

/** First sentence (or the whole string if no terminator), cleaned of markdown. */
export function firstSentence(s: string | null | undefined): string {
  const clean = cleanMarkdown(s);
  if (!clean) return "";
  const m = clean.match(/^(.*?[.!?])(\s|$)/);
  return (m ? m[1] : clean).trim();
}

/** Hard truncate to a character budget, on a word boundary, with an ellipsis. */
export function truncateChars(s: string | null | undefined, max: number): string {
  const clean = cleanMarkdown(s);
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return cut.replace(/[\s.,;:!?-]+$/, "") + "…";
}

/** Truncate to a maximum number of words. */
export function truncateWords(s: string | null | undefined, maxWords: number): string {
  const clean = cleanMarkdown(s);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return clean;
  return words.slice(0, maxWords).join(" ") + "…";
}

/** Capitalize the first letter; leave the rest as-is. */
export function sentenceCase(s: string | null | undefined): string {
  const clean = cleanMarkdown(s);
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** Normalize an Instagram handle (no @, no url, lowercase, trimmed). */
export function safeHandle(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[@/\s]/g, "")
    .toLowerCase()
    .trim();
}

/** Compact follower/post counts: 1.2K, 3.4M. */
export function formatNumber(value: number | null | undefined): string {
  const num = value ?? 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString("en-CA");
}

/** Whole days since a date (UTC-safe), or null if undateable. */
export function daysSince(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const then = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(then.getTime())) return null;
  const ms = Date.now() - then.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / 86_400_000);
}

/** Human relative age: "2 days ago", "3 weeks ago", "5 months ago". */
export function formatRelativeDate(date: string | Date | null | undefined): string {
  const days = daysSince(date);
  if (days === null) return "Date not captured";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const w = Math.round(days / 7);
    return `${w} ${w === 1 ? "week" : "weeks"} ago`;
  }
  if (days < 365) {
    const m = Math.round(days / 30);
    return `${m} ${m === 1 ? "month" : "months"} ago`;
  }
  const y = Math.round(days / 365);
  return `${y} ${y === 1 ? "year" : "years"} ago`;
}

/** Up-to-two-letter initials from a handle or name, for avatar fallbacks. */
export function initials(s: string | null | undefined): string {
  const clean = (s ?? "").replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}
