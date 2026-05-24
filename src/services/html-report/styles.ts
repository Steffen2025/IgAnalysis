export const STYLES = `
:root {
  --bg: #FAFAF7;
  --bg-soft: #F2F0EA;
  --text: #1A1A1A;
  --text-muted: #5C5A52;
  --border: #E5E2D6;
  --accent: #0F6E56;
  --accent-soft: #DCEFE7;
  --score-high: #0F6E56;
  --score-mid: #B07D1E;
  --score-low: #B23E3E;
  --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-serif: Georgia, "Iowan Old Style", "Times New Roman", serif;
  --font-mono: "SF Mono", "Cascadia Mono", "Consolas", monospace;
  --max-width: 760px;
  --radius: 12px;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

body {
  background: var(--bg);
}

.report-wrapper {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 24px;
}

/* ── PAGE ── */
.page {
  padding: 64px 0;
  border-bottom: 1px solid var(--border);
}
.page:last-child { border-bottom: none; }

.section-label {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 24px;
}

h1, h2, h3 {
  font-family: var(--font-serif);
  font-weight: normal;
  line-height: 1.2;
}

h2 {
  font-size: 1.75rem;
  margin-bottom: 24px;
  color: var(--text);
}

h3 {
  font-size: 1.2rem;
  margin-bottom: 12px;
}

p {
  margin-bottom: 16px;
  color: var(--text);
}

p:last-child { margin-bottom: 0; }

ul, ol {
  padding-left: 20px;
  margin-bottom: 16px;
}

li { margin-bottom: 6px; }

strong { font-weight: 600; }

/* ── COVER PAGE ── */
.cover-page {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 80px 0;
  border-bottom: 1px solid var(--border);
}

.cover-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.cover-top-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.cover-audit-number {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.cover-center {
  text-align: center;
  padding: 40px 0;
}

.cover-business-name {
  font-family: var(--font-serif);
  font-size: 2.8rem;
  font-weight: normal;
  color: var(--text);
  margin-bottom: 10px;
  line-height: 1.1;
}

.cover-handle {
  font-size: 1rem;
  color: var(--text-muted);
  margin-bottom: 48px;
}

.cover-score-wrap {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.cover-score-number {
  font-family: var(--font-serif);
  font-size: 9rem;
  line-height: 1;
  font-weight: normal;
  letter-spacing: -4px;
}

.cover-score-denom {
  font-family: var(--font-serif);
  font-size: 1.8rem;
  color: var(--text-muted);
  margin-top: -12px;
}

.cover-score-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-style: italic;
  max-width: 320px;
  line-height: 1.4;
}

.cover-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.cover-date {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.cover-brand {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: right;
}

/* ── BATTLE PLAN ── */
.battle-plan-framing {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  font-style: italic;
  color: var(--text-muted);
  margin-bottom: 40px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
  line-height: 1.55;
}

.priority-list {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.priority-row {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 20px;
  align-items: start;
}

.priority-number {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 1.3rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.priority-content {}

.priority-title {
  font-weight: 600;
  font-size: 1.05rem;
  margin-bottom: 6px;
  color: var(--text);
}

.priority-body {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.55;
}

/* ── SCORE CARD ── */
.score-bars {
  margin: 32px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.score-bar-row {
  display: grid;
  grid-template-columns: 180px 1fr 48px;
  align-items: center;
  gap: 16px;
}

.score-bar-label {
  font-size: 0.875rem;
  color: var(--text);
}

.score-bar-track {
  height: 8px;
  background: var(--bg-soft);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.score-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.score-bar-value {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: right;
}

.score-caption {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
  margin-top: 8px;
}

/* ── SNAPSHOT PROSE ── */
.snapshot-prose p {
  font-size: 1rem;
  color: var(--text);
  line-height: 1.7;
}

/* ── CARDS ── */
.card {
  background: var(--bg-soft);
  border-radius: var(--radius);
  padding: 24px;
  border-left: 3px solid var(--accent);
  margin-bottom: 20px;
}

.card:last-child { margin-bottom: 0; }

/* ── FIX CARDS ── */
.fix-card {
  background: var(--bg-soft);
  border-radius: var(--radius);
  padding: 24px;
  border-left: 3px solid var(--accent);
  margin-bottom: 20px;
}

.fix-card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.fix-number-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
}

.fix-title {
  font-weight: 600;
  font-size: 1.05rem;
  line-height: 1.3;
  margin-bottom: 0;
  color: var(--text);
}

.fix-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.fix-meta-item {}

.fix-meta-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.fix-meta-value {
  font-size: 0.85rem;
  color: var(--text);
  line-height: 1.4;
}

/* ── DAY BLOCKS ── */
.day-block {
  background: var(--bg-soft);
  border-radius: var(--radius);
  padding: 24px;
  border-left: 3px solid var(--accent);
  margin-bottom: 16px;
}

.day-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 8px;
}

.day-title {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 14px;
  color: var(--text);
}

.day-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--text);
  margin-bottom: 0;
}

.day-item-circle {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  flex-shrink: 0;
  margin-top: 3px;
}

/* ── PULL QUOTE ── */
.pull-quote {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  font-style: italic;
  line-height: 1.45;
  color: var(--text);
  border-left: 3px solid var(--accent);
  padding: 16px 24px;
  margin: 32px 0;
}

/* ── NARRATIVE PROSE ── */
.narrative-prose p {
  color: var(--text);
  margin-bottom: 16px;
}

/* ── HASHTAG CHIPS ── */
.hashtag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 20px 0;
}

.hashtag-chip {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 14px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--accent);
}

/* ── QUOTE BLOCKS ── */
.quote-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 24px 0;
}

.quote-block {
  border-left: 3px solid var(--accent);
  padding: 12px 18px;
  background: var(--bg-soft);
  border-radius: 0 var(--radius) var(--radius) 0;
  font-size: 0.9rem;
  font-style: italic;
  color: var(--text);
}

/* ── REEL & CAROUSEL CARDS ── */
.content-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 8px;
}

.reel-card, .carousel-card {
  background: var(--bg-soft);
  border-radius: var(--radius);
  padding: 28px;
  border-left: 3px solid var(--accent);
}

.content-card-header {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 6px;
}

.content-card-topic {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 12px;
  color: var(--text);
}

.reel-contrast {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
  margin-bottom: 6px;
  background: white;
  padding: 6px 12px;
  border-radius: 6px;
  display: inline-block;
}

.reel-pattern {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 14px;
}

.reel-hook {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  font-style: italic;
  line-height: 1.45;
  color: var(--text);
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.reel-body {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.reel-body ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.reel-body li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text);
  margin-bottom: 8px;
}

.reel-body li::before {
  content: "–";
  color: var(--accent);
  flex-shrink: 0;
}

.reel-caption-label, .reel-cta-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.reel-caption {
  font-size: 0.87rem;
  color: var(--text);
  line-height: 1.55;
  margin-bottom: 12px;
  font-family: var(--font-mono);
  background: white;
  padding: 10px 14px;
  border-radius: 6px;
}

.reel-cta {
  font-size: 0.87rem;
  color: var(--accent);
  font-weight: 600;
}

.carousel-slides {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.carousel-slide {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 0.9rem;
  color: var(--text);
  margin-bottom: 8px;
}

.carousel-slide-num {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-muted);
  flex-shrink: 0;
  width: 20px;
}

.carousel-caption {
  font-size: 0.87rem;
  color: var(--text);
  margin-bottom: 10px;
  line-height: 1.55;
}

.carousel-cta {
  font-size: 0.87rem;
  color: var(--accent);
  font-weight: 600;
}

/* ── CHECKLIST ── */
.action-checklist {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 8px;
  background: transparent;
}

.action-item:nth-child(odd) {
  background: var(--bg-soft);
}

.action-item-last {
  background: var(--accent-soft) !important;
  border: 1px solid var(--accent);
  border-radius: 8px;
  margin-top: 8px;
}

.action-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  flex-shrink: 0;
  margin-top: 2px;
}

.action-item-last .action-circle {
  border-color: var(--accent);
  background: var(--accent);
}

.action-number {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-muted);
  flex-shrink: 0;
  width: 20px;
  margin-top: 3px;
}

.action-text {
  flex: 1;
  font-size: 0.9rem;
  color: var(--text);
  line-height: 1.45;
}

.action-item-last .action-text {
  color: var(--accent);
  font-weight: 600;
}

.action-tag {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: 3px;
}

.tag-today { background: #FEF3C7; color: #92400E; }
.tag-week { background: var(--accent-soft); color: var(--accent); }
.tag-month { background: #F3F4F6; color: var(--text-muted); }
.tag-30days { background: var(--accent); color: white; }

/* ── FOOTER ── */
.footer-page {
  padding: 48px 0;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 24px 0;
}

.kpi-cell {
  background: var(--bg-soft);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.kpi-value {
  font-family: var(--font-serif);
  font-size: 1.6rem;
  color: var(--text);
  line-height: 1;
  margin-bottom: 4px;
}

.kpi-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.reaudit-banner {
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  border-radius: 8px;
  padding: 16px 20px;
  font-size: 0.9rem;
  color: var(--accent);
  margin: 24px 0;
  font-weight: 500;
}

.footer-disclaimer {
  font-size: 0.75rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: 20px;
  margin-top: 20px;
  line-height: 1.5;
}

/* ── DIVIDER ── */
.section-divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 32px 0;
}

/* ── PRINT ── */
@media print {
  html { font-size: 11pt; }

  .report-wrapper { padding: 0; }

  .page {
    padding: 32px 0;
    page-break-before: always;
    page-break-inside: avoid;
  }

  .page:first-child { page-break-before: auto; }

  .cover-page {
    min-height: auto;
    page-break-after: always;
  }

  .cover-score-number { font-size: 6rem; }

  .fix-card, .day-block, .reel-card, .carousel-card, .card {
    page-break-inside: avoid;
  }

  .hashtag-chip { border: 1px solid #ccc; }

  .pull-quote { font-size: 1.1rem; }

  body { background: white; }
  .bg-soft { background: #f5f5f0; }
}

/* ── SCREEN ONLY ── */
@media screen {
  body {
    padding: 24px 0 80px;
  }
}
`;
