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
    const dayMatch = line.match(/\*?\*?Day\s+(\d+)[^a-z]*(.*)/i);
    if (dayMatch) {
      if (current) days.push(current);
      current = { label: `Day ${dayMatch[1]}${dayMatch[2] ? " — " + dayMatch[2].replace(/\*\*/g, "").trim() : ""}`, items: [] };
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
  return days.map(d => `<div class="day-block">
  <div class="day-label">${e(d.label)}</div>
  ${d.items.length > 0 ? `<ul>${d.items.map(i => `<li>${e(i)}</li>`).join("")}</ul>` : ""}
</div>`).join("\n");
}

export function sevenDayPlanSlides(md: string): string[] {
  const days = parseDays(md);

  if (days.length === 0) {
    return [`<span class="eyebrow">Next 7 Days</span>

# Your first week

<div style="font-size:17px;color:#5C5A52;line-height:1.6">${e(md.slice(0, 800))}</div>`];
  }

  const first = days.slice(0, Math.ceil(days.length / 2));
  const second = days.slice(Math.ceil(days.length / 2));

  return [
    `<span class="eyebrow">Next 7 Days · Days 1–${first.length}</span>

# Your first week

${renderDayBlocks(first)}`,
    second.length > 0 ? `<span class="eyebrow">Next 7 Days · Days ${first.length + 1}–7</span>

# Your first week _(continued)_

${renderDayBlocks(second)}` : null,
  ].filter(Boolean) as string[];
}
