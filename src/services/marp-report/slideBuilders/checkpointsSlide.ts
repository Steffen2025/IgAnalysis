import type { ReportData } from "../../report/reportDataAssembler.js";

function e(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function addDays(d: Date, days: number): string {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return formatDate(r);
}

export function checkpointsSlide(data: ReportData): string {
  const auditDate = data.audit.created_at ? new Date(data.audit.created_at) : new Date();
  const checkpoints = [
    {
      label: "7-day checkpoint",
      date: addDays(auditDate, 7),
      measure: "Profile visits, saves, comments, and DMs",
      good: "At least one local post published, bio updated, and 2+ meaningful interactions",
      adjust: "Tighten the hook, add a clearer CTA, or post on a different day/time",
    },
    {
      label: "14-day checkpoint",
      date: addDays(auditDate, 14),
      measure: "Posting rhythm, reach on local posts, and repeat engagement",
      good: "3+ posts in 14 days with consistent local hashtags and location tags",
      adjust: "Reuse the best-performing format and cut the weakest post type",
    },
    {
      label: "30-day checkpoint",
      date: addDays(auditDate, 30),
      measure: "Follower trend, profile visits, saves, shares, DMs, and local reach",
      good: "Higher profile visits or DMs even if follower growth is still modest",
      adjust: "Run the same audit again and compare score movement by category",
    },
  ];

  return `<span class="eyebrow">Measurement checkpoints</span>

# When to measure

<p>Early wins show up as profile visits, saves, comments, and DMs — not just followers.</p>

<div class="checkpoint-timeline">
${checkpoints
  .map(
    (c, i) => `<div class="checkpoint-step">
  <div class="checkpoint-marker">${i + 1}</div>
  <div class="checkpoint-body">
    <div class="checkpoint-title">${e(c.label)}</div>
    <div class="checkpoint-date">${e(c.date)}</div>
    <div class="checkpoint-line"><strong>Measure:</strong> ${e(c.measure)}</div>
    <div class="checkpoint-line"><strong>Good:</strong> ${e(c.good)}</div>
    <div class="checkpoint-line"><strong>Adjust:</strong> ${e(c.adjust)}</div>
  </div>
</div>`,
  )
  .join("\n")}
</div>

<div class="guide-card full">
  <div class="kicker">Metrics to watch</div>
  <div class="copy">Profile visits · Follows · Saves · Shares · Comments · DMs · Reach on local posts · Reel watch time (if available)</div>
</div>`;
}
