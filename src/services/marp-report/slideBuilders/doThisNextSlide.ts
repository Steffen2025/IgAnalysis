function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface Action {
  number: string;
  text: string;
  timeTag: string;
}

const TIME_TAGS = ["TODAY", "THIS WEEK", "THIS MONTH", "IN 30 DAYS"];

function parseActions(md: string): Action[] {
  const actions: Action[] = [];
  for (const line of md.split("\n")) {
    const m = line.match(/^(\d+)[.)]\s*(.+)/);
    if (m) {
      const rawText = m[2].replace(/\*\*/g, "").trim();
      let timeTag = "THIS WEEK";
      for (const tag of TIME_TAGS) {
        if (rawText.toUpperCase().includes(tag)) { timeTag = tag; break; }
      }
      // Also check bracket format [TODAY], etc.
      const bracketMatch = rawText.match(/\[(TODAY|THIS WEEK|THIS MONTH|IN 30 DAYS)\]/i);
      if (bracketMatch) timeTag = bracketMatch[1].toUpperCase();
      const text = rawText.replace(/\[TODAY\]|\[THIS WEEK\]|\[THIS MONTH\]|\[IN 30 DAYS\]/gi, "").trim();
      actions.push({ number: m[1], text, timeTag });
    }
  }
  return actions.slice(0, 10);
}

function tagColor(tag: string): string {
  if (tag === "TODAY") return "#0F6E56";
  if (tag === "THIS MONTH") return "#B07D1E";
  if (tag === "IN 30 DAYS") return "#5C5A52";
  return "#B07D1E";
}

export function doThisNextSlide(md: string): string {
  const actions = parseActions(md);

  if (actions.length === 0) {
    return `<span class="eyebrow">Do This Next</span>

# 10 actions, time-boxed

<div style="font-size:17px;color:#5C5A52;line-height:1.6">${e(md.slice(0, 700))}</div>`;
  }

  const items = actions.map((a, i) => {
    const isLast = i === actions.length - 1;
    const color = tagColor(a.timeTag);
    return `<li${isLast ? ' class="final"' : ""}>
    <div class="check"></div>
    <span class="text">${e(a.number)}. ${e(a.text)}</span>
    <span class="tag" style="color:${color}">${e(a.timeTag)}</span>
  </li>`;
  }).join("\n  ");

  return `<span class="eyebrow">Do This Next</span>

# 10 actions, time-boxed

<ul class="checklist">
  ${items}
</ul>`;
}
