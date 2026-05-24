export const STYLES = `
/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
:root {
  /* Backgrounds */
  --bg: #FAFAF7;
  --bg-print: #FFFFFF;
  --bg-card: #F4F1E8;
  --bg-accent: #1A2238;

  /* Text */
  --text: #1A2238;
  --text-muted: #5C5A52;
  --text-inverse: #FAFAF7;

  /* Borders */
  --border: #D9D5C6;
  --border-strong: #1A2238;
  --hairline: #E5E2D6;

  /* Accent palette */
  --accent: #1A2238;
  --accent-warm: #B07D1E;
  --accent-rust: #8B3A2E;
  --accent-deep-teal: #0F6E56;

  /* Score thresholds */
  --score-high: #0F6E56;
  --score-mid: #B07D1E;
  --score-low: #8B3A2E;

  /* Typography */
  --font-serif: "Iowan Old Style", Georgia, "Times New Roman", serif;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace;

  --max-width: 780px;
  --radius: 10px;
  --radius-sm: 6px;
}

/* ─────────────────────────────────────────────
   RESET & BASE
───────────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body { background: var(--bg); }

@media screen {
  body { padding: 0 0 80px; }
}

/* ─────────────────────────────────────────────
   LAYOUT
───────────────────────────────────────────── */
.report-wrapper {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 32px;
}

.page {
  padding: 72px 0;
  border-bottom: 1px solid var(--hairline);
}
.page:last-child { border-bottom: none; }

/* ─────────────────────────────────────────────
   TYPOGRAPHY
───────────────────────────────────────────── */
h1, h2, h3, h4 {
  font-family: var(--font-serif);
  font-weight: 400;
  line-height: 1.18;
  color: var(--text);
}

.eyebrow {
  font-family: var(--font-sans);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 16px;
  display: block;
}

.eyebrow-warm {
  color: var(--accent-warm);
}

.section-title {
  font-family: var(--font-serif);
  font-size: 2.25rem;
  font-weight: 400;
  line-height: 1.15;
  margin-bottom: 28px;
  color: var(--text);
}

.section-subtitle {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 400;
  margin-bottom: 20px;
  color: var(--text);
}

p { margin-bottom: 18px; color: var(--text); font-size: 1.05rem; }
p:last-child { margin-bottom: 0; }
ul, ol { padding-left: 22px; margin-bottom: 18px; }
li { margin-bottom: 7px; font-size: 1.05rem; }
strong { font-weight: 600; }

.body-text {
  font-size: 1.05rem;
  line-height: 1.68;
  color: var(--text);
}

.muted { color: var(--text-muted); }

/* ─────────────────────────────────────────────
   COVER PAGE
───────────────────────────────────────────── */
.cover-page {
  min-height: 88vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 56px 0 48px;
  border-bottom: 1px solid var(--hairline);
}

.cover-wordmark {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 1rem;
  color: var(--text-muted);
  letter-spacing: 0.01em;
}

.cover-meta-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.cover-audit-ref {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-muted);
}

.cover-center {
  padding: 32px 0;
}

.cover-business-name {
  font-family: var(--font-serif);
  font-size: 3rem;
  font-weight: 400;
  line-height: 1.1;
  color: var(--text);
  margin-bottom: 10px;
}

.cover-handle {
  font-size: 0.95rem;
  color: var(--text-muted);
  margin-bottom: 44px;
}

/* Cover stat row */
.cover-stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-card);
}

.cover-stat-cell {
  padding: 28px 24px;
  border-right: 1px solid var(--border);
}
.cover-stat-cell:last-child { border-right: none; }

.cover-stat-value {
  font-family: var(--font-serif);
  font-size: 3.5rem;
  line-height: 1;
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;
  color: var(--text);
  margin-bottom: 6px;
}

.cover-stat-suffix {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  color: var(--text-muted);
}

.cover-stat-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 4px;
  display: block;
}

.cover-stat-context {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-top: 4px;
}

.cover-bottom {
  border-top: 1px solid var(--hairline);
  padding-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cover-tagline {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-style: italic;
}

.cover-date {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

/* ─────────────────────────────────────────────
   ACT DIVIDER
───────────────────────────────────────────── */
.act-divider {
  padding: 80px 0;
  border-bottom: 1px solid var(--hairline);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.act-eyebrow {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-warm);
  margin-bottom: 12px;
}

.act-numeral {
  font-family: var(--font-serif);
  font-size: 7rem;
  line-height: 1;
  font-weight: 400;
  color: var(--text);
  margin-bottom: 12px;
  letter-spacing: -0.03em;
}

.act-title {
  font-family: var(--font-serif);
  font-size: 2rem;
  font-weight: 400;
  color: var(--text);
  margin-bottom: 12px;
}

.act-intent {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 1.05rem;
  color: var(--text-muted);
  max-width: 480px;
  line-height: 1.5;
}

/* ─────────────────────────────────────────────
   OPENING NARRATIVE
───────────────────────────────────────────── */
.opening-narrative-text {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  line-height: 1.72;
  color: var(--text);
  margin-bottom: 40px;
}

.opening-narrative-text p {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  line-height: 1.72;
  margin-bottom: 24px;
}

/* ─────────────────────────────────────────────
   STAT CALLOUT
───────────────────────────────────────────── */
.stat-callout {
  background: var(--bg-card);
  border-left: 3px solid var(--accent);
  border-radius: 0 var(--radius) var(--radius) 0;
  padding: 28px 32px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  margin: 32px 0;
}

.stat-callout.four-col {
  grid-template-columns: repeat(4, 1fr);
}

.stat-cell {
  padding: 8px 16px 8px 0;
  border-right: 1px solid var(--border);
}
.stat-cell:last-child {
  border-right: none;
  padding-right: 0;
}
.stat-cell:first-child { padding-left: 0; }

.stat-value {
  font-family: var(--font-serif);
  font-size: 3.25rem;
  line-height: 1;
  font-feature-settings: "tnum";
  color: var(--text);
  margin-bottom: 4px;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-suffix {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  color: var(--text-muted);
}

.stat-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 4px;
  display: block;
}

.stat-context {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-top: 4px;
}

/* ─────────────────────────────────────────────
   NARRATIVE QUOTE
───────────────────────────────────────────── */
.narrative-quote {
  border-left: 3px solid var(--accent);
  padding: 4px 0 4px 28px;
  margin: 36px 0;
}

.narrative-quote-text {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  font-style: italic;
  line-height: 1.5;
  color: var(--text);
  margin-bottom: 10px;
}

.narrative-quote-attr {
  font-size: 0.78rem;
  font-family: var(--font-mono);
  color: var(--text-muted);
}

/* ─────────────────────────────────────────────
   BATTLE PLAN
───────────────────────────────────────────── */
.battle-intro {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  font-style: italic;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 44px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--hairline);
}

.priority-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.priority-row {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 20px;
  align-items: start;
}

.priority-badge {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1.5px solid var(--border-strong);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 1.35rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.priority-title {
  font-weight: 600;
  font-size: 1.05rem;
  margin-bottom: 5px;
  color: var(--text);
}

.priority-body {
  font-size: 0.92rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 6px;
}

.priority-citation {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--accent-warm);
  line-height: 1.4;
}

/* ─────────────────────────────────────────────
   SCORE CARD
───────────────────────────────────────────── */
.score-narrative {
  font-size: 1rem;
  line-height: 1.68;
  color: var(--text);
  margin-bottom: 32px;
  max-width: 640px;
}

.score-bars {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 8px 0 8px;
}

.score-bar-row {
  display: grid;
  grid-template-columns: 200px 1fr 52px;
  align-items: center;
  gap: 16px;
}

.score-bar-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text);
}

.score-bar-track {
  height: 8px;
  background: var(--bg-card);
  border-radius: 4px;
  overflow: hidden;
}

.score-bar-fill {
  height: 100%;
  border-radius: 4px;
}

.score-bar-value {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
  text-align: right;
}

.score-caption {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-style: italic;
  margin-top: 20px;
}

/* ─────────────────────────────────────────────
   PATTERN ANALYSIS
───────────────────────────────────────────── */
.narrative-prose p {
  font-size: 1rem;
  color: var(--text);
  line-height: 1.7;
  margin-bottom: 16px;
}

.narrative-prose h2, .narrative-prose h3 {
  font-size: 1.3rem;
  margin: 24px 0 12px;
}

.narrative-prose ul { margin-bottom: 16px; }
.narrative-prose li { font-size: 1rem; margin-bottom: 7px; }
.narrative-prose strong { font-weight: 600; }
.narrative-prose code {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background: var(--bg-card);
  padding: 1px 5px;
  border-radius: 3px;
}

/* ─────────────────────────────────────────────
   AUDIENCE VOICE
───────────────────────────────────────────── */
.quote-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 24px 0;
}

.quote-block {
  border-left: 3px solid var(--accent);
  padding: 12px 20px;
  background: var(--bg-card);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  font-size: 0.95rem;
  font-style: italic;
  color: var(--text);
  line-height: 1.55;
}

.audience-fallback {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 28px 32px;
  font-size: 1rem;
  color: var(--text);
  line-height: 1.65;
}

/* ─────────────────────────────────────────────
   HASHTAG CHIPS
───────────────────────────────────────────── */
.hashtag-section {
  margin: 28px 0;
}

.hashtag-group-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 10px;
  display: block;
}

.hashtag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 20px;
}

.hashtag-chip {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 14px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--accent);
}

.hashtag-note {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
  margin-top: 4px;
}

/* ─────────────────────────────────────────────
   FIX CARDS
───────────────────────────────────────────── */
.fix-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 28px;
  border-left: 3px solid var(--accent);
  margin-bottom: 20px;
}

.fix-card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.fix-badge {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--text-inverse);
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
  color: var(--text);
}

.fix-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.fix-meta-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 4px;
  display: block;
}

.fix-meta-value {
  font-size: 0.88rem;
  color: var(--text);
  line-height: 1.45;
}

/* ─────────────────────────────────────────────
   DAY BLOCKS
───────────────────────────────────────────── */
.day-block {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 24px 28px;
  border-left: 3px solid var(--accent);
  margin-bottom: 14px;
}

.day-eyebrow {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: var(--accent-warm);
  margin-bottom: 6px;
  display: block;
}

.day-title {
  font-weight: 600;
  font-size: 0.97rem;
  margin-bottom: 14px;
  color: var(--text);
}

.day-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.day-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--text);
  line-height: 1.5;
  margin-bottom: 0;
}

.day-dot {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  flex-shrink: 0;
  margin-top: 3px;
}

/* ─────────────────────────────────────────────
   TOOLKIT
───────────────────────────────────────────── */
.toolkit-intro {
  font-size: 1rem;
  color: var(--text-muted);
  line-height: 1.65;
  margin-bottom: 44px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--hairline);
  max-width: 600px;
}

.toolkit-subsection {
  margin-bottom: 56px;
}
.toolkit-subsection:last-child { margin-bottom: 0; }

/* Post template card */
.post-template-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 32px;
  margin-bottom: 28px;
  border-top: 2px solid var(--hairline);
}

.post-template-number {
  font-family: var(--font-serif);
  font-size: 3rem;
  font-weight: 400;
  line-height: 1;
  color: var(--border);
  float: right;
  margin-left: 16px;
  margin-top: -4px;
}

.post-template-style {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-warm);
  margin-bottom: 6px;
  display: block;
}

.post-template-title {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-weight: 400;
  color: var(--text);
  margin-bottom: 6px;
}

.post-template-purpose {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 20px;
}

.post-template-copy {
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 20px;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 1.7;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 14px;
}

.post-template-when {
  font-size: 0.78rem;
  color: var(--text-muted);
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.post-template-when strong {
  font-weight: 600;
  color: var(--text);
}

/* AI prompt card */
.ai-prompt-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 28px;
  margin-bottom: 20px;
}

.ai-prompt-eyebrow {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--accent-warm);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-prompt-eyebrow::before {
  content: "⬡";
  font-size: 0.7rem;
}

.ai-prompt-title {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  font-weight: 400;
  color: var(--text);
  margin-bottom: 6px;
}

.ai-prompt-desc {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin-bottom: 18px;
  line-height: 1.5;
}

.ai-prompt-code-wrap {
  position: relative;
}

.ai-prompt-code {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 18px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.72;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-prompt-hint {
  position: absolute;
  top: 10px;
  right: 12px;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-muted);
  opacity: 0.6;
  pointer-events: none;
}

/* Reel cards in toolkit */
.reel-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 28px;
  border-left: 3px solid var(--accent);
  margin-bottom: 20px;
}

.content-card-header {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-warm);
  margin-bottom: 6px;
}

.content-card-topic {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 14px;
  color: var(--text);
}

.reel-contrast {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
  margin-bottom: 6px;
  background: white;
  padding: 7px 12px;
  border-radius: 5px;
  display: inline-block;
}

.reel-pattern {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.reel-hook {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  font-style: italic;
  line-height: 1.45;
  color: var(--text);
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--hairline);
}

.reel-body {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--hairline);
}

.reel-body ul { list-style: none; padding: 0; margin: 0; }

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
  color: var(--accent-warm);
  flex-shrink: 0;
}

.reel-caption-label, .reel-cta-label, .carousel-caption-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 4px;
  display: block;
}

.reel-caption {
  font-size: 0.85rem;
  color: var(--text);
  line-height: 1.6;
  margin-bottom: 14px;
  font-family: var(--font-mono);
  background: white;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
}

.reel-cta, .carousel-cta {
  font-size: 0.9rem;
  color: var(--accent);
  font-weight: 600;
}

/* Carousel cards */
.carousel-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 28px;
  border-left: 3px solid var(--accent);
  margin-bottom: 20px;
}

.carousel-slides {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--hairline);
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
  font-size: 0.75rem;
  color: var(--text-muted);
  flex-shrink: 0;
  width: 18px;
  margin-top: 2px;
}

.carousel-caption {
  font-size: 0.87rem;
  color: var(--text);
  margin-bottom: 10px;
  line-height: 1.55;
}

/* ─────────────────────────────────────────────
   DO THIS NEXT
───────────────────────────────────────────── */
.action-checklist {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.action-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 13px 16px;
  border-radius: var(--radius-sm);
}

.action-item:nth-child(odd) { background: var(--bg-card); }

.action-item-last {
  background: var(--bg-card) !important;
  border: 1.5px solid var(--accent);
  border-radius: var(--radius-sm);
  margin-top: 10px;
}

.action-circle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  flex-shrink: 0;
  margin-top: 2px;
}

.action-item-last .action-circle {
  background: var(--accent);
  border-color: var(--accent);
}

.action-num {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-muted);
  flex-shrink: 0;
  width: 18px;
  margin-top: 3px;
}

.action-text {
  flex: 1;
  font-size: 0.92rem;
  color: var(--text);
  line-height: 1.45;
}

.action-item-last .action-text {
  font-weight: 600;
  color: var(--accent);
}

.action-tag {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: 2px;
}

.tag-today    { background: #FEF3C7; color: #92400E; }
.tag-week     { background: #DCEFE7; color: var(--accent-deep-teal); }
.tag-month    { background: #F3F4F6; color: var(--text-muted); }
.tag-30days   { background: var(--accent); color: var(--text-inverse); }

/* ─────────────────────────────────────────────
   FOOTER / 30 DAYS FROM NOW
───────────────────────────────────────────── */
.footer-page {}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 28px 0;
}

.kpi-cell {
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  padding: 18px 20px;
  text-align: center;
}

.kpi-value {
  font-family: var(--font-serif);
  font-size: 1.6rem;
  color: var(--text);
  line-height: 1;
  margin-bottom: 5px;
}

.kpi-label {
  font-size: 0.68rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-weight: 700;
}

.reaudit-banner {
  background: var(--bg-card);
  border: 1.5px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: 16px 20px;
  font-size: 0.92rem;
  color: var(--accent);
  margin: 20px 0;
  font-weight: 500;
}

.footer-hairline {
  border: none;
  border-top: 1px solid var(--hairline);
  margin: 28px 0 20px;
}

.footer-brand {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.footer-brand-name {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.95rem;
  color: var(--text-muted);
}

.footer-disclaimer {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.6;
}

/* ─────────────────────────────────────────────
   PRINT
───────────────────────────────────────────── */
@media print {
  html { font-size: 11pt; background: white; }
  body { background: white; padding: 0; }

  .report-wrapper { padding: 0 16px; }

  .page, .act-divider {
    padding: 28px 0;
    page-break-before: always;
    border-bottom: none;
  }
  .page:first-child { page-break-before: auto; }
  .cover-page { min-height: auto; page-break-after: always; }
  .act-divider { page-break-after: always; }

  /* Remove bg colors for ink savings; use borders */
  .bg-card,
  .day-block,
  .fix-card,
  .reel-card,
  .carousel-card,
  .stat-callout,
  .cover-stat-row,
  .post-template-card,
  .ai-prompt-card,
  .ai-prompt-code,
  .post-template-copy,
  .action-item,
  .kpi-cell,
  .audience-fallback,
  .quote-block {
    background: white !important;
    border: 1px solid #ccc !important;
  }

  .fix-card, .day-block, .reel-card, .carousel-card {
    page-break-inside: avoid;
  }

  .cover-business-name { font-size: 2rem; }
  .act-numeral { font-size: 4rem; }
  .stat-value { font-size: 2rem; }
  .cover-stat-value { font-size: 2.2rem; }

  .narrative-quote { page-break-inside: avoid; }
  .priority-row { page-break-inside: avoid; }
  .post-template-card { page-break-inside: avoid; }
}
`;
