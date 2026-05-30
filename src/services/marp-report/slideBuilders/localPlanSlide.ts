import type { ReportData } from "../../report/reportDataAssembler.js";

function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function extractHashtags(md: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const m of md.matchAll(/#([A-Za-z][A-Za-z0-9_]+)/g)) {
    const tag = `#${m[1]}`;
    if (!seen.has(tag)) { seen.add(tag); tags.push(tag); }
  }
  return tags;
}

export function localPlanSlide(data: ReportData, localMd: string): string {
  const city = e(data.reportContext.localMarketLabel ?? "your city");
  const tags = extractHashtags(localMd);

  const prose = localMd
    .split("\n")
    .filter(l => l.trim() && !l.startsWith("#") && !l.startsWith("|"))
    .map(l => l.replace(/\*\*/g, ""))
    .slice(0, 3)
    .join(" ")
    .slice(0, 400);

  const chips = tags.slice(0, 16).map(t => `<span class="hashtag-chip">${e(t)}</span>`).join("");

  return `<span class="eyebrow">Your Local Market</span>

# ${city} visibility

${prose ? `<p style="font-size:17px;margin-bottom:16px">${e(prose)}</p>` : ""}

${chips ? `<div class="hashtag-group-label">Competitor hashtags in your market</div>
<div>${chips}</div>
<p class="hashtag-note">Borrow the hashtags. Never the content.</p>` : `<p>No local hashtag data available. The 7-day plan includes specific local tagging instructions for ${city}.</p>`}`;
}
