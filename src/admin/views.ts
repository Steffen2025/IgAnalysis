import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Audit, ReportArtifact, ReportDelivery } from "../db/schema.js";

type NavItem = { href: string; label: string };

function e(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeArtifactPath(pathValue: string): string {
  return pathValue.replace(/\\/g, "/").toLowerCase();
}

const adminLogoSrc = (() => {
  const logoPath = path.resolve(process.cwd(), "BotLogix Master Logo.png");
  if (!existsSync(logoPath)) return "";
  return `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;
})();

function phaseLabel(value: string | null | undefined): string {
  const raw = String(value ?? "").toUpperCase();
  if (!raw) return "Created";
  if (raw.includes("COMPETITOR")) return "Competitor";
  if (raw.includes("PROFILE")) return "Profile";
  if (raw.includes("POST")) return "Posts";
  if (raw.includes("LOCAL")) return "Local";
  if (raw.includes("REFERENCE")) return "Reference";
  if (raw.includes("HASHTAG")) return "Hashtags";
  if (raw.includes("SCORING")) return "Scoring";
  if (raw.includes("PATTERN")) return "Patterns";
  if (raw.includes("ENRICH")) return "Enrichment";
  if (raw.includes("REPORT")) return "Report";
  if (raw.includes("ANALYZ")) return "Analysis";
  if (raw.includes("READY")) return "Analysis ready";
  if (raw === "COMPLETE") return "Complete";
  if (raw === "FAILED") return "Failed";
  return raw
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function compactDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-CA", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: string | null | undefined): string {
  return `status status-${(status ?? "queued").toLowerCase()}`;
}

function layout(params: {
  title: string;
  active?: string;
  body: string;
  autorefresh?: boolean;
}): string {
  const nav: NavItem[] = [
    { href: "/audits", label: "Audits" },
    { href: "/audits/new", label: "New Audit" },
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${params.autorefresh ? '<meta http-equiv="refresh" content="12">' : ""}
  <title>${e(params.title)} · BotLogix Audit</title>
  <link rel="stylesheet" href="/admin.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/audits">
      ${adminLogoSrc ? `<img class="brand-logo" src="${adminLogoSrc}" alt="BotLogix">` : `<span class="brand-orb">B</span>`}
      <span><strong>BotLogix</strong><small>Audit Command</small></span>
    </a>
    <nav>
      ${nav.map((item) => `<a class="${params.active === item.href ? "active" : ""}" href="${item.href}">${item.label}</a>`).join("")}
    </nav>
    <form method="post" action="/logout">
      <button class="ghost" type="submit">Log out</button>
    </form>
  </header>
  <main>${params.body}</main>
</body>
</html>`;
}

export function loginPage(error?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login · BotLogix Audit</title>
  <link rel="stylesheet" href="/admin.css">
</head>
<body class="login-screen">
  <main class="login-card">
    <span class="eyebrow">Private Beta Console</span>
    <h1>BotLogix Audit Command</h1>
    <p>Run local Instagram intelligence, generate branded reports, and keep beta testers moving.</p>
    ${error ? `<div class="alert error">${e(error)}</div>` : ""}
    <form method="post" action="/login" class="stack">
      <input type="hidden" name="next" value="/audits">
      <label>Password
        <input name="password" type="password" autocomplete="current-password" required autofocus>
      </label>
      <button type="submit">Enter Dashboard</button>
    </form>
  </main>
</body>
</html>`;
}

export function auditsIndexPage(params: {
  audits: Array<Audit & { overallScore?: number | null; artifacts?: number }>;
  runningIds: number[];
  flash?: string;
}): string {
  const rows = params.audits
    .map((audit) => `<tr>
      <td><a class="row-link" href="/audits/${audit.id}">#${audit.id}</a></td>
      <td>
        <strong>${e(audit.business_name ?? "Untitled audit")}</strong>
        <small>${e(audit.instagram_url ?? "")}</small>
      </td>
      <td>${e([audit.city, audit.service_area].filter(Boolean).join(" · "))}</td>
      <td><span class="${statusClass(audit.status)}">${e(audit.status ?? "queued")}</span><small>${e(phaseLabel(audit.status_detail ?? "CREATED"))}</small></td>
      <td>${audit.overallScore == null ? "-" : `${audit.overallScore}/100`}</td>
      <td>${audit.artifacts ?? 0}</td>
      <td>
        <form method="post" action="/audits/${audit.id}/delete" onsubmit="return confirm('Delete audit #${audit.id}? This will remove the audit, database records, and generated files.');">
          <button class="danger" type="submit">Delete</button>
        </form>
      </td>
      <td>${compactDate(audit.created_at)}</td>
    </tr>`)
    .join("");

  return layout({
    title: "Audits",
    active: "/audits",
    autorefresh: params.runningIds.length > 0,
    body: `<section class="page-head">
      <div>
        <span class="eyebrow">Internal Operations</span>
        <h1>Audit dashboard</h1>
        <p>Past runs, live status, report artifacts, and delivery actions in one place.</p>
      </div>
      <a class="button" href="/audits/new">New Audit</a>
    </section>
    ${params.flash ? `<div class="alert success">${e(params.flash)}</div>` : ""}
    <section class="panel">
      <div class="panel-head">
        <h2>Runs</h2>
        <span>${params.runningIds.length ? `${params.runningIds.length} running` : "Ready"}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Business</th><th>Market</th><th>Status</th><th>Score</th><th>Files</th><th>Delete</th><th>Created</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="8" class="empty">No audits yet. Create the first one.</td></tr>`}</tbody>
        </table>
      </div>
    </section>`,
  });
}

export function newAuditPage(params: { error?: string; values?: Record<string, string> } = {}): string {
  const v = (name: string) => e(params.values?.[name] ?? "");
  const mode = v("mode") || "mixed";
  return layout({
    title: "New Audit",
    active: "/audits/new",
    body: `<section class="page-head">
      <div>
        <span class="eyebrow">New Intelligence Run</span>
        <h1>Drop the Instagram URL.</h1>
        <p>Give the system the account, market, and business type. It will scrape the account, find relevant competitors, score the gaps, and build the report artifacts.</p>
      </div>
      <div class="page-head-note">
        <strong>BotLogix Audit Command</strong>
        <span>Everything below is tuned for quick setup and clearer reading.</span>
      </div>
    </section>
    ${params.error ? `<div class="alert error">${e(params.error)}</div>` : ""}
    <form method="post" action="/audits" class="intake-panel intake-panel-light">
      <section class="intake-hero">
        <div class="intake-hero-copy">
          <span class="eyebrow">Quick Start</span>
          <h2>Everything important goes in once.</h2>
          <p>We use the Instagram URL, location, and business type to automate the competitor set, scoring, and report build. The rest is optional context for better recommendations.</p>
        </div>
        <button type="submit" class="launch-button">Launch Audit</button>
      </section>

      <section class="intake-primary">
        <label class="url-field">Instagram profile
          <input name="instagram_url" value="${v("instagram_url")}" required autofocus placeholder="https://www.instagram.com/clienthandle/ or @clienthandle">
          <small>We'll use this to analyze the account and compare it against relevant local accounts.</small>
        </label>
      </section>

      <section class="intake-required">
        <label>City
          <input name="city" value="${v("city")}" required placeholder="Hamilton">
          <small>This keeps the local strategy specific to the market they actually serve.</small>
        </label>
        <label>Province / State
          <input name="region" value="${v("region")}" required placeholder="Ontario">
          <small>This prevents the system from confusing cities with the same name.</small>
        </label>
        <label>Business type / category
          <input name="business_category" value="${v("business_category")}" required placeholder="Mortgage broker">
          <small>This helps us compare the account against the right competitors, hooks, hashtags, and actions.</small>
        </label>
      </section>

      <section class="intake-cards">
        <div>
          <strong>Auto-filled after scrape</strong>
          <span>Business name, website, follower baseline, offer clues, and audience clues.</span>
        </div>
        <div>
          <strong>Local intelligence</strong>
          <span>City, region, and business type drive competitor discovery and local recommendations.</span>
        </div>
        <div>
          <strong>Report artifacts</strong>
          <span>Dark deck, light deck, PDF, HTML, PPTX, and dashboard links are generated in the background.</span>
        </div>
      </section>

      <details class="intake-details" ${params.error ? "open" : ""}>
        <summary>
          <span>Optional market lock</span>
          <small>Use this only when the account bio may be vague or the city name is ambiguous.</small>
        </summary>
        <div class="form-grid compact-grid">
          ${field("business_name", "Business name", v("business_name"), false, "Auto-detect from Instagram")}
          ${field("website_url", "Website URL", v("website_url"), false, "Auto-detect from bio link")}
          ${field("service_area", "Service area override", v("service_area"), false, "Optional, e.g. Hamilton, Ontario, Canada")}
          ${field("follower_goal", "Follower goal", v("follower_goal"), false, "Auto-suggest from baseline")}
          ${textarea("main_offer", "Main offer", v("main_offer"), false, "Auto-detect from bio and posts")}
          ${textarea("target_audience", "Target audience", v("target_audience"), false, "Auto-infer from category and market")}
          ${textarea("business_outcome", "Business goal", v("business_outcome"), false, "Local leads, DMs, bookings, revenue")}
          ${field("reference_markets", "Reference markets", v("reference_markets"), false, "Leave blank for defaults, or add: Austin, TX; Nashville, TN; Denver, CO")}
          ${field("delivery_email", "Delivery email", v("delivery_email"), false, "optional")}
          <label>Audit mode
          <select name="mode">
            <option value="mixed" ${mode === "mixed" ? "selected" : ""}>Local + inspiration markets</option>
            <option value="local_only" ${mode === "local_only" ? "selected" : ""}>Local competitors only</option>
            <option value="reference_only" ${mode === "reference_only" ? "selected" : ""}>Inspiration markets only</option>
          </select>
          </label>
        </div>
      </details>

      <div class="form-actions">
        <a class="ghost-link" href="/audits">Cancel</a>
        <button type="submit">Launch Audit</button>
      </div>
    </form>`,
  });
}

function field(name: string, label: string, value: string, required = false, placeholder = ""): string {
  return `<label>${label}
    <input name="${name}" value="${value}" ${required ? "required" : ""} placeholder="${e(placeholder)}">
  </label>`;
}

function textarea(name: string, label: string, value: string, required = false, placeholder = ""): string {
  return `<label class="wide">${label}
    <textarea name="${name}" ${required ? "required" : ""} placeholder="${e(placeholder)}">${value}</textarea>
  </label>`;
}

export function auditShowPage(params: {
  audit: Audit;
  score?: {
    profile: number | null;
    content: number | null;
    local: number | null;
    sales: number | null;
    competitor: number | null;
    overall: number | null;
  } | null;
  artifacts: ReportArtifact[];
  inferredArtifacts: Array<{ label: string; path: string; size: number }>;
  deliveries: ReportDelivery[];
  scrapeJobs: Array<{ status: string; count: number }>;
  failedJobs: Array<{ actor_label: string; error_message: string | null }>;
  competitors: Array<{ username: string; competitor_type: string | null; geographic_market: string | null; deep_scraped: boolean; confidence_score: number | null }>;
  sections: Array<{ section_key: string; generated_at: string; token_count: number | null }>;
  running: boolean;
  job?: { status: string; step: string; error?: string } | null;
  message?: string;
  error?: string;
}): string {
  const audit = params.audit;
  const running = params.running || ["queued", "scraping", "analyzing"].includes(audit.status ?? "");
  const recordedArtifacts = [...params.artifacts].filter(isPrimaryArtifact).sort(compareArtifacts);
  const inferredArtifacts = [...params.inferredArtifacts].filter((artifact) => isPrimaryInferredArtifact(artifact.path)).sort(compareInferredArtifacts);
  const recordedArtifactPaths = new Set(recordedArtifacts.map((artifact) => normalizeArtifactPath(artifact.path)));
  const artifactRows = [
    ...recordedArtifacts.map((artifact) => `<div class="artifact ${artifact.theme === "dark" && artifact.kind === "pdf" ? "artifact-primary" : ""}">
      <div><strong>${e(artifactLabel(artifact.theme, artifact.kind))}</strong><small>${e(artifact.path)} · ${formatBytes(artifact.size_bytes)}</small></div>
      <a href="/artifacts/${artifact.id}">Open</a>
    </div>`),
    ...inferredArtifacts
      .filter((artifact) => !recordedArtifactPaths.has(normalizeArtifactPath(artifact.path)))
      .map((artifact) => `<div class="artifact ${isPrimaryInferredArtifact(artifact.path) ? "artifact-primary" : ""}">
      <div><strong>${e(inferredArtifactLabel(artifact.label, artifact.path))}</strong><small>${e(artifact.path)} · ${formatBytes(artifact.size)}</small></div>
      <a href="/artifact-file?path=${encodeURIComponent(artifact.path)}">Open</a>
    </div>`),
  ].join("");
  const compRows = params.competitors.map((c) => `<tr>
    <td>@${e(c.username)}</td>
    <td>${e(c.competitor_type ?? "-")}</td>
    <td>${e(c.geographic_market ?? "-")}</td>
    <td>${c.confidence_score ?? "-"}</td>
    <td>${c.deep_scraped ? "Yes" : "No"}</td>
  </tr>`).join("");
  const sectionRows = params.sections.map((section) => `<div class="mini-row">
    <span>${e(section.section_key)}<small>${compactDate(section.generated_at)}</small></span>
    <strong>${section.token_count ?? "-"}</strong>
  </div>`).join("");
  const scoreRows = params.score ? [
    ["Profile", params.score.profile],
    ["Content", params.score.content],
    ["Local", params.score.local],
    ["Sales", params.score.sales],
    ["Competitor", params.score.competitor],
  ].map(([label, value]) => `<div class="score-line">
    <span>${e(label)}</span>
    <div class="score-track"><div style="width:${Math.max(0, Math.min(100, Number(value ?? 0)))}%"></div></div>
    <strong>${value ?? "-"}</strong>
  </div>`).join("") : "";
  const failedRows = params.failedJobs.map((job) => `<div class="alert error"><strong>${e(job.actor_label)}</strong><br>${e(job.error_message ?? "")}</div>`).join("");
  const emailValue = e(params.audit.delivery_email ?? "");

  return layout({
    title: `Audit #${audit.id}`,
    active: "/audits",
    autorefresh: running,
    body: `<section class="page-head">
      <div>
        <span class="eyebrow">Audit #${audit.id}</span>
        <h1>${e(audit.business_name ?? "Untitled audit")}</h1>
        <p>${e(audit.instagram_url)} · ${e(audit.city)} · ${e(audit.service_area)}</p>
      </div>
      <span class="${statusClass(audit.status)}">${e(audit.status ?? "queued")}</span>
    </section>
    ${params.message ? `<div class="alert success">${e(params.message)}</div>` : ""}
    ${params.error ? `<div class="alert error">${e(params.error)}</div>` : ""}
    <section class="metrics">
      ${metric("Phase", phaseLabel(audit.status_detail ?? "CREATED"))}
      ${metric("Overall", params.score?.overall == null ? "-" : `${params.score.overall}/100`)}
      ${metric("Competitors", params.competitors.length)}
      ${metric("Artifacts", params.artifacts.length + params.inferredArtifacts.length)}
    </section>
    ${params.job ? `<section class="job-strip"><strong>${e(params.job.status)}</strong><span>${e(params.job.step)}</span>${params.job.error ? `<em>${e(params.job.error)}</em>` : ""}</section>` : ""}
    <section class="control-grid">
      <article class="control-card">
        <span class="eyebrow">Primary action</span>
        <h3>${params.running ? "Audit running" : "Run or resume the audit"}</h3>
        <p>${params.running ? "The system is already working through the pipeline." : "Start the scrape, scoring, competitor review, and report generation pipeline."}</p>
        <form method="post" action="/audits/${audit.id}/run">
          <button type="submit" ${params.running ? "disabled" : ""}>${params.running ? "Running..." : "Run Audit"}</button>
        </form>
      </article>
      <article class="control-card">
        <span class="eyebrow">Reports</span>
        <h3>Refresh the deck files</h3>
        <p>Rebuild the dark and light report outputs without rerunning the full scrape.</p>
        <form method="post" action="/audits/${audit.id}/regenerate">
          <button type="submit" ${params.running ? "disabled" : ""}>Regenerate Reports</button>
        </form>
      </article>
      <article class="control-card">
        <span class="eyebrow">Delivery</span>
        <h3>Email the report</h3>
        <form method="post" action="/audits/${audit.id}/email" class="stack compact-stack">
          <input name="email_to" type="email" placeholder="client@example.com" value="${emailValue}" required>
          <button type="submit">Email Report</button>
        </form>
      </article>
    </section>
    <section class="control-grid single">
      <article class="control-card danger-card">
        <span class="eyebrow">Cleanup</span>
        <h3>Delete this audit</h3>
        <p>Remove the audit record and generated files when this is just a test run.</p>
        <form method="post" action="/audits/${audit.id}/delete" onsubmit="return confirm('Delete audit #${audit.id}? This removes the audit and generated files.');">
          <button type="submit" class="danger">Delete Audit</button>
        </form>
      </article>
    </section>
    ${failedRows}
    <div class="two-col">
      <section class="panel">
        <div class="panel-head"><h2>Test reports</h2><span>${artifactRows ? "Dark + light PDFs only" : "None yet"}</span></div>
        <div class="artifact-list">${artifactRows || `<div class="empty">Run or regenerate reports to create artifacts.</div>`}</div>
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Scrape jobs</h2><span>Apify progress</span></div>
        ${params.scrapeJobs.map((job) => `<div class="mini-row"><span>${e(job.status)}</span><strong>${job.count}</strong></div>`).join("") || `<div class="empty">No scrape jobs yet.</div>`}
      </section>
    </div>
    <div class="two-col">
      <section class="panel">
        <div class="panel-head"><h2>Scores</h2><span>Current breakdown</span></div>
        ${scoreRows || `<div class="empty">No scores yet.</div>`}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Report sections</h2><span>${params.sections.length} generated</span></div>
        ${sectionRows || `<div class="empty">No report sections yet.</div>`}
      </section>
    </div>
    <section class="panel">
      <div class="panel-head"><h2>Competitors tested</h2><span>Local and reference intel</span></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Account</th><th>Type</th><th>Market</th><th>Confidence</th><th>Deep scraped</th></tr></thead>
        <tbody>${compRows || `<tr><td colspan="5" class="empty">No competitors discovered yet.</td></tr>`}</tbody>
      </table></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Delivery history</h2><span>Email sends</span></div>
      ${params.deliveries.map((d) => `<div class="mini-row"><span>${e(d.email_to)} · ${compactDate(d.sent_at)}</span><strong>${e(d.status)}</strong></div>`).join("") || `<div class="empty">No report emails sent yet.</div>`}
    </section>`,
  });
}

function artifactRank(theme: string | null | undefined, kind: string | null | undefined, pathValue = ""): number {
  const pathLower = pathValue.toLowerCase();
  if (theme === "dark" && kind === "pdf") return 0;
  if (theme === "dark" && kind === "html") return 1;
  if (theme === "dark" && kind === "pptx") return 2;
  if (theme === "light" && kind === "pdf") return 3;
  if (theme === "light" && kind === "html") return 4;
  if (theme === "light" && kind === "pptx") return 5;
  if (pathLower.includes("-dark.pdf")) return 0;
  if (pathLower.includes("-dark.html")) return 1;
  if (pathLower.includes("-dark.pptx")) return 2;
  if (pathLower.includes("-light.pdf")) return 3;
  if (pathLower.includes("-light.html")) return 4;
  if (pathLower.includes("-light.pptx")) return 5;
  if (theme === "dark" && kind === "markdown") return 6;
  if (theme === "light" && kind === "markdown") return 7;
  if (kind === "html") return 20;
  if (kind === "markdown") return 21;
  return 30;
}

function compareArtifacts(a: ReportArtifact, b: ReportArtifact): number {
  return artifactRank(a.theme, a.kind, a.path) - artifactRank(b.theme, b.kind, b.path)
    || a.path.localeCompare(b.path);
}

function isPrimaryArtifact(artifact: ReportArtifact): boolean {
  return artifact.kind === "pdf" && (artifact.theme === "dark" || artifact.theme === "light");
}

function compareInferredArtifacts(
  a: { label: string; path: string; size: number },
  b: { label: string; path: string; size: number },
): number {
  return artifactRank(null, inferredKind(a.path), a.path) - artifactRank(null, inferredKind(b.path), b.path)
    || a.path.localeCompare(b.path);
}

function inferredKind(pathValue: string): string {
  const ext = pathValue.split(".").pop()?.toLowerCase();
  return ext === "pdf" || ext === "html" || ext === "pptx" || ext === "md" ? (ext === "md" ? "markdown" : ext) : "file";
}

function artifactLabel(theme: string | null | undefined, kind: string | null | undefined): string {
  if (theme === "dark" && kind === "pdf") return "Recommended report - dark PDF";
  if (theme === "dark" && kind === "html") return "Dark web deck";
  if (theme === "dark" && kind === "pptx") return "Dark PowerPoint";
  if (theme === "light" && kind === "pdf") return "Print-friendly report - light PDF";
  if (theme === "light" && kind === "html") return "Light web deck";
  if (theme === "light" && kind === "pptx") return "Light PowerPoint";
  if (theme === "standard" && kind === "html") return "Legacy narrative HTML";
  if (theme === "standard" && kind === "markdown") return "Legacy narrative Markdown";
  return `${theme ?? "standard"} ${kind ?? "file"}`;
}

function inferredArtifactLabel(label: string, pathValue: string): string {
  const lower = pathValue.toLowerCase();
  if (lower.includes("-dark.pdf")) return "Recommended report - dark PDF";
  if (lower.includes("-dark.html")) return "Dark web deck";
  if (lower.includes("-dark.pptx")) return "Dark PowerPoint";
  if (lower.includes("-light.pdf")) return "Print-friendly report - light PDF";
  if (lower.includes("-light.html")) return "Light web deck";
  if (lower.includes("-light.pptx")) return "Light PowerPoint";
  if (/reports\/audit-\d+\.html$/i.test(pathValue)) return "Legacy narrative HTML";
  if (/reports\/audit-\d+\.md$/i.test(pathValue)) return "Legacy narrative Markdown";
  return label;
}

function isPrimaryInferredArtifact(pathValue: string): boolean {
  const lower = pathValue.toLowerCase();
  return lower.includes("-dark.pdf") || lower.includes("-light.pdf");
}

function metric(label: string, value: unknown): string {
  return `<div class="metric"><span>${e(label)}</span><strong>${e(value)}</strong></div>`;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "size unknown";
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
