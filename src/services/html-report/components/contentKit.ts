import { parseReels, parseCarousels, escapeHTML, markdownToHTML } from "./utils.js";

export function renderContentKit(md: string): string {
  if (!md) return placeholder();

  const reels = parseReels(md);
  const carousels = parseCarousels(md);

  const reelCards = reels.length > 0
    ? reels.map(r => `
      <div class="reel-card">
        <div class="content-card-header">Reel ${r.number}</div>
        <div class="content-card-topic">${escapeHTML(r.topic)}</div>
        ${r.contrast ? `<div class="reel-contrast">${escapeHTML(r.contrast)}</div>` : ""}
        ${r.hookPattern ? `<div class="reel-pattern">Pattern: ${escapeHTML(r.hookPattern)}${r.compositeScore ? ` · Score: ${escapeHTML(r.compositeScore)}` : ""}</div>` : ""}
        ${r.hook ? `<div class="reel-hook">${escapeHTML(r.hook)}</div>` : ""}
        ${r.body.length > 0 ? `<div class="reel-body"><ul>${r.body.map(b => `<li>${escapeHTML(b)}</li>`).join("")}</ul></div>` : ""}
        ${r.caption ? `<div class="reel-caption-label">Caption</div><div class="reel-caption">${escapeHTML(r.caption)}</div>` : ""}
        ${r.cta ? `<div class="reel-cta-label">CTA</div><div class="reel-cta">${escapeHTML(r.cta)}</div>` : ""}
      </div>`).join("")
    : "";

  const carouselCards = carousels.length > 0
    ? carousels.map(c => `
      <div class="carousel-card">
        <div class="content-card-header">Carousel ${c.number}</div>
        <div class="content-card-topic">${escapeHTML(c.topic)}</div>
        ${c.slides.length > 0 ? `<div class="carousel-slides">${c.slides.map((s, i) => `
          <div class="carousel-slide">
            <span class="carousel-slide-num">${i + 1}</span>
            <span>${escapeHTML(s)}</span>
          </div>`).join("")}</div>` : ""}
        ${c.caption ? `<div class="carousel-caption">${escapeHTML(c.caption)}</div>` : ""}
        ${c.cta ? `<div class="carousel-cta">${escapeHTML(c.cta)}</div>` : ""}
      </div>`).join("")
    : "";

  // Fallback if parsing failed
  if (!reelCards && !carouselCards) {
    return `
<section class="page">
  <div class="section-label">Content Execution Kit</div>
  <h2>Scripts &amp; outlines</h2>
  <div class="narrative-prose">${markdownToHTML(md)}</div>
</section>`;
  }

  return `
<section class="page">
  <div class="section-label">Content Execution Kit</div>
  <h2>Reel scripts</h2>
  <div class="content-grid">${reelCards}</div>

  <h2 style="margin-top:48px">Carousel outlines</h2>
  <div class="content-grid">${carouselCards}</div>
</section>`;
}

function placeholder(): string {
  return `<section class="page"><div class="section-label">Content Execution Kit</div><p><em>Section unavailable.</em></p></section>`;
}
