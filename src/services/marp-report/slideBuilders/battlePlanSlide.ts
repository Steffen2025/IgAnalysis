import type { ScoreResult } from "../../scoring/types.js";

function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface Priority {
  number: string;
  title: string;
  support: string;
  cite: string;
}

function parsePriorities(md: string): Priority[] {
  const results: Priority[] = [];
  // Match numbered items or bold-titled sections
  const lines = md.split("\n");
  let current: Partial<Priority> | null = null;

  for (const line of lines) {
    const numberedMatch = line.match(/^(\d+)[.)]\s*\*{0,2}(.+?)\*{0,2}\s*$/);
    const boldMatch = line.match(/^\*\*(.+?)\*\*/);
    const bulletMatch = line.match(/^[-*]\s+(.+)/);

    if (numberedMatch) {
      if (current?.title) results.push(current as Priority);
      current = { number: numberedMatch[1], title: numberedMatch[2].replace(/\*\*/g, "").trim(), support: "", cite: "" };
    } else if (boldMatch && !current) {
      if (current && (current as any).title) results.push(current as Priority);
      current = { number: String(results.length + 1), title: boldMatch[1].trim(), support: "", cite: "" };
    } else if (current && bulletMatch) {
      const text = bulletMatch[1].trim();
      if (text.match(/^\d+/) || text.includes("%") || text.includes("score")) {
        current.cite = (current.cite ? current.cite + " · " : "") + text;
      } else if (!current.support) {
        current.support = text;
      }
    } else if (current && line.trim() && !line.startsWith("#")) {
      const stripped = line.replace(/\*\*/g, "").trim();
      if (stripped && !current.support) {
        current.support = stripped.slice(0, 120);
      }
    }
  }
  if (current?.title) results.push(current as Priority);
  return results.slice(0, 5);
}

function renderPriorityList(priorities: Priority[]): string {
  return `<ul class="priority-list">
${priorities.map(p => `  <li class="priority-row">
    <div class="priority-num">${e(p.number)}</div>
    <div class="priority-body">
      <div class="priority-title">${e(p.title)}</div>
      ${p.support ? `<p class="priority-support">${e(p.support)}</p>` : ""}
      ${p.cite ? `<div class="priority-cite">${e(p.cite)}</div>` : ""}
    </div>
  </li>`).join("\n")}
</ul>`;
}

export function battlePlanSlides(md: string, scores: ScoreResult): string[] {
  const priorities = parsePriorities(md);

  if (priorities.length === 0) {
    // Fallback: show markdown prose
    return [`<span class="eyebrow">The Battle Plan</span>

# Where to focus

<div style="font-size:17px;color:var(--text-secondary);line-height:1.6">${e(md.slice(0, 800))}</div>`];
  }

  const overall = scores.overall ?? 0;
  const framing = `Overall score: ${overall}/100. These five moves — executed in order — address the highest-leverage gaps in the data.`;

  if (priorities.length <= 3) {
    return [`<span class="eyebrow">The Battle Plan</span>

# Where to focus

<p style="font-size:18px;margin-bottom:16px">${framing}</p>

${renderPriorityList(priorities)}`];
  }

  // Split 1-3 / 4-5
  return [
    `<span class="eyebrow">The Battle Plan · Priorities 1–3</span>

# Where to focus

<p style="font-size:18px;margin-bottom:16px">${framing}</p>

${renderPriorityList(priorities.slice(0, 3))}`,

    `<span class="eyebrow">The Battle Plan · Priorities 4–5</span>

# Where to focus _(continued)_

${renderPriorityList(priorities.slice(3, 5))}`,
  ];
}
