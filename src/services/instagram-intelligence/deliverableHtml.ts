/**
 * Branded, print-ready HTML deliverable.
 *
 * Wraps the client-facing Markdown (deliverableMarkdown.ts) in a self-contained,
 * BotLogix-styled HTML document: embedded fonts/colours, embedded logo, styled
 * score bars and competitor cards, and print rules so it exports cleanly to PDF
 * from any browser. No external assets — one portable file.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";
import type { GoldMasterIntelligence } from "./goldMasterSchema.js";
import { renderDeliverable } from "./deliverableMarkdown.js";

function logoDataUri(): string | null {
  for (const name of ["BotLogix Logo.png", "BotLogix Master Logo.png", "BotLogix Master Icon.png"]) {
    try {
      const buf = readFileSync(path.resolve(name));
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch { /* try next */ }
  }
  return null;
}

/** Turn the monospace `█████░░░░░ 46/100` bars into styled HTML meters. */
function styleScoreBars(html: string): string {
  return html.replace(/<code>([█░]+)\s*(\d+)\/100<\/code>/g, (_m, _bar: string, n: string) => {
    const v = Number(n);
    const cls = v >= 67 ? "high" : v >= 34 ? "mid" : "low";
    return `<span class="bar"><span class="bar-fill ${cls}" style="width:${v}%"></span></span><span class="bar-num">${v}<span class="bar-den">/100</span></span>`;
  });
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,opt@0,500;0,600;1,500&display=swap');
:root{
  --bg:#FFFFFF;--bg-card:#F4F6FA;--border:#DBE0E8;--border-strong:#B8C2D1;
  --text:#0A1628;--text-secondary:#3A4858;--text-muted:#6B7B95;
  --accent:#008FA8;--accent-soft:rgba(0,143,168,.08);
  --high:#008FA8;--mid:#B07D1E;--low:#B23E3E;
  --serif:'Newsreader',Georgia,serif;--sans:'Inter',-apple-system,system-ui,sans-serif;
  --mono:ui-monospace,'SF Mono',Menlo,monospace;
}
*{box-sizing:border-box}
body{margin:0;background:#E9EDF3;color:var(--text);font-family:var(--sans);font-size:15px;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:820px;margin:0 auto;background:var(--bg);box-shadow:0 1px 40px rgba(10,22,40,.08)}
header.cover{background:linear-gradient(135deg,#0A1628 0%,#0d2438 55%,#08323b 100%);color:#fff;padding:46px 56px 40px}
header.cover .logo-chip{display:inline-block;background:#fff;padding:10px 16px;border-radius:14px;margin-bottom:30px;box-shadow:0 4px 18px rgba(0,0,0,.25)}
header.cover .logo-chip img{height:30px;display:block}
header.cover .kicker{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#7fd3e0;font-weight:600;margin-bottom:8px}
header.cover h1{font-family:var(--serif);font-size:40px;line-height:1.08;margin:0 0 12px;color:#fff;font-weight:600}
header.cover .tagline{font-size:15px;color:#cfe0ee;margin:0 0 22px;max-width:560px;line-height:1.5}
header.cover .meta{font-size:13px;color:#9fb3c8}
header.cover .hero{display:flex;align-items:baseline;gap:14px;margin:0 0 18px}
header.cover .hero .score{font-family:var(--serif);font-size:64px;font-weight:600;color:#fff;line-height:1}
header.cover .hero .of{font-size:20px;color:#7fd3e0}
header.cover .hero .label{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9fb3c8}
main{padding:8px 56px 56px}
h2{font-family:var(--serif);font-size:26px;font-weight:600;margin:44px 0 4px;padding-top:26px;border-top:2px solid var(--accent);color:var(--text)}
h2:first-of-type{border-top:none;padding-top:0;margin-top:24px}
h3{font-family:var(--sans);font-size:15px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--accent);margin:30px 0 12px}
h4{font-family:var(--sans);font-size:16px;font-weight:600;margin:18px 0 2px;color:var(--text)}
p{margin:0 0 12px;color:var(--text-secondary)}
strong{color:var(--text);font-weight:600}
em{color:var(--text-muted)}
ul,ol{margin:0 0 14px;padding-left:22px}
li{margin-bottom:5px;color:var(--text-secondary)}
a{color:var(--accent);text-decoration:none}
hr{border:none;border-top:1px solid var(--border);margin:34px 0}
blockquote{margin:14px 0;padding:14px 18px;background:var(--accent-soft);border-left:3px solid var(--accent);border-radius:0 8px 8px 0}
blockquote p{margin:0;color:var(--text)}
table{width:100%;border-collapse:collapse;margin:8px 0 18px;font-size:14px}
th{text-align:left;background:var(--bg-card);color:var(--text);font-weight:600;padding:9px 12px;border-bottom:2px solid var(--border-strong)}
td{padding:9px 12px;border-bottom:1px solid var(--border);color:var(--text-secondary)}
code{font-family:var(--mono);font-size:13px;background:var(--bg-card);padding:1px 5px;border-radius:4px;color:var(--text-secondary)}
pre{background:#0A1628;color:#cfe8ee;padding:14px 16px;border-radius:8px;overflow:auto;font-size:13px}
pre code{background:none;color:inherit;padding:0}
/* score bars */
.bar{display:inline-block;width:200px;height:9px;background:var(--bg-card);border-radius:6px;overflow:hidden;vertical-align:middle;margin-right:10px;border:1px solid var(--border)}
.bar-fill{display:block;height:100%;border-radius:6px}
.bar-fill.high{background:var(--high)}.bar-fill.mid{background:var(--mid)}.bar-fill.low{background:var(--low)}
.bar-num{font-family:var(--mono);font-weight:600;color:var(--text);font-size:13px}
.bar-den{color:var(--text-muted);font-weight:400}
/* competitor cards: an h4 followed by its em label + list */
h4 + p em{display:inline-block;font-style:normal;font-size:11px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;color:var(--accent);background:var(--accent-soft);padding:2px 9px;border-radius:20px}
@media print{
  body{background:#fff}
  .page{box-shadow:none;max-width:none}
  main h2{break-before:page;break-after:avoid}
  main h2:first-of-type{break-before:auto}
  h3,h4,blockquote,pre,table,li{break-inside:avoid}
  header.cover{padding:40px;break-after:page}
}
`;

export function renderDeliverableHtml(gm: GoldMasterIntelligence): string {
  const md = renderDeliverable(gm);
  // The Markdown opens with a cover block (title + meta + intro). We render the
  // body from the part after that and build a styled cover from gm.meta.
  const m = gm.meta;
  let body = marked.parse(md, { async: false }) as string;
  body = styleScoreBars(body);
  // Strip the leading Markdown cover (first <h1> + the two following <p>s) — the
  // HTML cover replaces it. Everything from the first <hr> onward is the report.
  const firstHr = body.indexOf("<hr>");
  const reportBody = firstHr >= 0 ? body.slice(firstHr + 4) : body;
  const logo = logoDataUri();
  const date = new Date(m.generatedAt).toISOString().slice(0, 10);
  const overall = gm.scores.find((s) => /overall/i.test(s.dimension))?.score ?? gm.scores[0]?.score ?? 0;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Instagram Growth Plan — @${m.handle}</title>
<style>${CSS}</style>
</head>
<body>
<div class="page">
<header class="cover">
${logo ? `<span class="logo-chip"><img src="${logo}" alt="BotLogix"></span>` : `<div class="kicker">BotLogix</div>`}
<div class="kicker">Instagram Growth Plan</div>
<h1>Instagram Growth Intelligence Report</h1>
<p class="tagline">A 30-day action plan to improve visibility, trust, content, and local lead flow — built from your own account, your market, and the accounts already winning in your space.</p>
<div class="hero"><span class="score">${overall}</span><span class="of">/100</span><span class="label">Power level today<br>Your next 30 days are mapped inside</span></div>
<div class="meta">@${m.handle} · ${m.account} · ${m.normalizedCategory} · ${m.marketLabel || m.city}<br>Prepared by BotLogix · ${date} · Review on ${m.reviewDate}</div>
</header>
<main>
${reportBody}
</main>
</div>
</body>
</html>`;
}
