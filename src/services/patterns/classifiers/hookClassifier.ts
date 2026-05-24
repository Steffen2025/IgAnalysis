export type HookType =
  | "question"
  | "claim"
  | "number_list"
  | "story"
  | "direct_address"
  | "announcement"
  | "description";

/**
 * Classify the opening hook of a caption using the first 80 chars only.
 * Evaluated in priority order — first match wins.
 */
export function classifyHook(caption: string): HookType {
  const head = caption.slice(0, 80).toLowerCase().trim();

  // question — ends with "?" in head OR starts with question words
  if (
    head.includes("?") ||
    /^(what|why|want|did you|how|which|who|ever)\b/.test(head)
  ) {
    return "question";
  }

  // number_list — starts with digit or spelled number + list signal
  if (
    /^\d/.test(head) ||
    /^(three|five|six|seven|eight|nine|ten)\s+(ways|reasons|tips|things|secrets|steps)\b/.test(head) ||
    /^\d+\s+(ways|reasons|tips|things|secrets|steps)\b/.test(head)
  ) {
    return "number_list";
  }

  // story — starts with a temporal anchor
  if (
    /^(when |yesterday|last (week|month|year|night)|once |back in |years ago|a few years|a long time|i remember)/.test(head)
  ) {
    return "story";
  }

  // direct_address — opens by speaking directly to the reader
  if (/^(you |your |if you )/.test(head)) {
    return "direct_address";
  }

  // announcement — something new or upcoming
  if (
    /^(new |now |just (opened|launched|in|dropped|added)|introducing |coming |this week |excited to )/.test(head)
  ) {
    return "announcement";
  }

  // claim — superlative boast or all-caps emphasis word in first 80 chars
  if (
    /^(the |we |it |this |our )\S+.*(best|only|finest|freshest|greatest|most|number one|#1)/.test(head) ||
    /\b[A-Z]{4,}\b/.test(caption.slice(0, 80))
  ) {
    return "claim";
  }

  return "description";
}
