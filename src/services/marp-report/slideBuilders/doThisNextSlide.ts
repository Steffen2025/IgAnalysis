function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface Action {
  number: string;
  text: string;
}

const TIME_TAGS = ["TODAY", "THIS WEEK", "THIS MONTH", "IN 30 DAYS"];

function detectTagFromText(text: string): string {
  let timeTag = "THIS WEEK";
  for (const tag of TIME_TAGS) {
    if (text.toUpperCase().includes(tag)) { timeTag = tag; break; }
  }
  const bracketMatch = text.match(/\[(TODAY|THIS WEEK|THIS MONTH|IN 30 DAYS)\]/i);
  if (bracketMatch) timeTag = bracketMatch[1].toUpperCase();
  return timeTag;
}

function parseActions(md: string): Action[] {
  const actions: Action[] = [];
  for (const line of md.split("\n")) {
    const m = line.match(/^(\d+)[.)]\s*(.+)/);
    if (m) {
      const rawText = m[2].replace(/\*\*/g, "").trim();
      const text = rawText.replace(/\[TODAY\]|\[THIS WEEK\]|\[THIS MONTH\]|\[IN 30 DAYS\]/gi, "").trim();
      actions.push({ number: m[1], text });
    }
  }
  return actions.slice(0, 10);
}

export function doThisNextSlide(md: string): string {
  const actions = parseActions(md);

  if (actions.length === 0) {
    return `<span class="eyebrow">Action List</span>

# 10 quick actions you can finish this week

<div style="font-size:17px;color:var(--text-secondary);line-height:1.6">${e(md.slice(0, 700))}</div>`;
  }

  const items = actions.map((a, i) => {
    const tag = i === 9 ? "IN 30 DAYS" : detectTagFromText(a.text);
    return `<li class="checklist-row${i === 9 ? " final" : ""}">
    <div class="checklist-check"></div>
    <span class="checklist-text">${e(a.number)}. ${e(a.text)}</span>
    <span class="checklist-tag">${e(tag)}</span>
  </li>`;
  }).join("\n  ");

  return `<span class="eyebrow">Action List</span>

# 10 quick actions you can finish this week

<ul class="checklist">
  ${items}
</ul>`;
}
