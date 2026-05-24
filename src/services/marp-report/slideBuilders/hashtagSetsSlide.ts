import type { ReportData } from "../../report/reportDataAssembler.js";

function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function extractHashtagsFromMd(md: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const m of md.matchAll(/#([A-Za-z][A-Za-z0-9_]+)/g)) {
    const tag = `#${m[1]}`;
    if (!seen.has(tag)) { seen.add(tag); tags.push(tag); }
  }
  return tags;
}

function chips(tags: string[]): string {
  return tags.map(t => `<span class="hashtag-chip">${e(t)}</span>`).join("");
}

export function hashtagSetsSlide(data: ReportData, localMd: string): string {
  const city = data.audit.city ?? "";
  const citySlug = city.toLowerCase().replace(/\s+/g, "");
  const cat = (data.audit.business_category ?? "").toLowerCase().replace(/\s+/g, "");
  const bizName = (data.audit.business_name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const fromMd = extractHashtagsFromMd(localMd);

  const local = Array.from(new Set([
    ...fromMd.filter(t => citySlug && t.toLowerCase().includes(citySlug.slice(0, 4))),
    citySlug ? `#${citySlug}` : "",
    citySlug ? `#${citySlug}business` : "",
    citySlug ? `#${citySlug}ontario` : "",
    "#hamOnt",
    "#localON",
    "#onbusiness",
    "#supportlocal",
  ].filter(Boolean))).slice(0, 8);

  const category = Array.from(new Set([
    "#aiautomation",
    "#instagramautomation",
    "#smallbizmarketing",
    "#dmautomation",
    "#instagramgrowth",
    "#digitalmarketing",
    cat ? `#${cat}` : "",
    "#aibusiness",
  ].filter(t => t !== "#"))).slice(0, 8);

  const branded = Array.from(new Set([
    bizName ? `#${bizName}` : "",
    "#botlogix",
    "#botlogixca",
    "#igstrategy",
  ].filter(Boolean))).slice(0, 4);

  return `<span class="eyebrow">Toolkit · Hashtag Sets</span>

# Three sets. Rotate on every post.

<div class="hashtag-group-label">LOCAL DISCOVERY (use on every post)</div>
<div>${chips(local)}</div>

<div class="hashtag-group-label">CATEGORY REACH (use on 3 of 5 posts per week)</div>
<div>${chips(category)}</div>

<div class="hashtag-group-label">YOUR BRANDED SET (use on every post)</div>
<div>${chips(branded)}</div>

<p class="hashtag-note">Borrow the hashtags. Never the content. Rotate sets so the same 30 tags don't appear on every post.</p>`;
}
