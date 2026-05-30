function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface DayBlock {
  label: string;
  items: string[];
}

function parseDays(md: string): DayBlock[] {
  const days: DayBlock[] = [];
  let current: DayBlock | null = null;
  for (const line of md.split("\n")) {
    // Match a "Day N — …" header at line start. Capture everything after the
    // dash; a single line may carry the title plus body text inline, e.g.
    // "**Day 1 — Fix the bio.** Add city to the name field." — avoid bullets
    // like "from Day 2." by requiring the header at the very start.
    const dayMatch = line.match(/^\*{0,2}Day\s+(\d+)\s*[—–-]\s*(.+)$/i);
    if (dayMatch) {
      if (current) days.push(current);
      const rest = dayMatch[2];
      // Split the bold title from any trailing body. Prefer a closing "**";
      // otherwise fall back to the first sentence as the title.
      let title = rest;
      let body = "";
      const boldClose = rest.indexOf("**");
      if (boldClose >= 0) {
        title = rest.slice(0, boldClose);
        body = rest.slice(boldClose + 2);
      } else {
        const period = rest.search(/[.:]\s/);
        if (period >= 0) {
          title = rest.slice(0, period + 1);
          body = rest.slice(period + 1);
        }
      }
      title = title.replace(/\*\*/g, "").trim();
      current = { label: `Day ${dayMatch[1]}${title ? " — " + title : ""}`, items: [] };
      const bodyText = body.replace(/\*\*/g, "").trim();
      if (bodyText) current.items.push(bodyText);
    } else if (current && line.match(/^[-*]\s+(.+)/)) {
      current.items.push(line.replace(/^[-*]\s+/, "").trim());
    } else if (current && line.trim() && !line.startsWith("#") && !line.startsWith("|")) {
      const stripped = line.replace(/\*\*/g, "").trim();
      if (stripped && current.items.length === 0) {
        current.items.push(stripped);
      }
    }
  }
  if (current) days.push(current);
  return days.slice(0, 7);
}

function renderDayBlocks(days: DayBlock[]): string {
  return days.map((d) => `<div class="day-block">
  <div class="day">${e(d.label)}</div>
  ${d.items.length > 0 ? `<ul>${d.items.map(i => `<li>${e(i)}</li>`).join("")}</ul>` : ""}
</div>`).join("\n");
}

function renderRichDay(d: DayBlock, fallbackIndex: number): string {
  const label = d.label.toLowerCase().startsWith("day ") ? d.label : `Day ${fallbackIndex}`;
  const action = d.items[0] ?? "Complete the action from your audit plan.";
  const example = d.items[1] ?? "";
  const why = d.items[2] ?? d.items[d.items.length - 1] ?? "Small daily moves build local visibility faster than one big post.";
  return `<div class="day-rich">
  <div class="day">${e(label)}</div>
  <div class="day-field"><span class="day-tag">Action</span> ${e(action.replace(/\*\*/g, ""))}</div>
  ${example ? `<div class="day-field"><span class="day-tag">Example</span> ${e(example.replace(/\*\*/g, ""))}</div>` : ""}
  <div class="day-field"><span class="day-tag">Why</span> ${e(why.replace(/\*\*/g, ""))}</div>
</div>`;
}

function renderNumberedDayBlocks(days: DayBlock[], startIndex: number): string {
  return days.map((d, index) => renderRichDay(d, startIndex + index + 1)).join("\n");
}

export function sevenDayPlanSlides(md: string): string[] {
  const days = parseDays(md).filter((day) => day.items.length > 0);

  if (days.length === 0) {
    return [`<span class="eyebrow">Week 1 timeline</span>

# Your first week

<div style="font-size:17px;color:var(--text-secondary);line-height:1.6">${e(md.slice(0, 800))}</div>`];
  }

  const first = days.slice(0, 4);
  const second = days.slice(4, 7);

  return [
    `<span class="eyebrow">Week 1 timeline · Days 1–4</span>

# Your first week

<p>One action per day · <strong>15–30 minutes</strong> each · vertical timeline below.</p>

<div class="week-timeline">${renderNumberedDayBlocks(first, 0)}</div>`,
    second.length > 0 ? `<span class="eyebrow">Week 1 timeline · Days 5–7</span>

# Your first week _(continued)_

<div class="week-timeline">

${renderNumberedDayBlocks(second, 4)}
</div>` : null,
  ].filter(Boolean) as string[];
}
