import { escapeHTML } from "./utils.js";

const NUMERALS: Record<number, string> = { 1: "I", 2: "II", 3: "III" };
const INTENTS: Record<string, string> = {
  "Where You Are": "Your current position — what the data actually shows.",
  "The Reality": "The market you're competing in and what your audience is doing.",
  "The Street Ahead": "What to do about it, in what order, starting now.",
};

export function renderActDivider(act: number, title: string): string {
  const numeral = NUMERALS[act] ?? String(act);
  const intent = INTENTS[title] ?? "";

  return `
<div class="act-divider">
  <span class="act-eyebrow">ACT ${numeral}</span>
  <div class="act-numeral">${numeral}</div>
  <div class="act-title">${escapeHTML(title)}</div>
  ${intent ? `<div class="act-intent">${escapeHTML(intent)}</div>` : ""}
</div>`;
}
