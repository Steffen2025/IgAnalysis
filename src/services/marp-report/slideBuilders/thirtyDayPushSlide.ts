import type { ReportData } from "../../report/reportDataAssembler.js";
import { filterByRelevance } from "../competitorRelevance.js";
import { ctaForKind } from "../../audit/categoryCopy.js";

function e(s: string | null | undefined): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function lowestScoreArea(data: ReportData): string {
  const rows: Array<[string, number]> = [
    ["Profile", data.scores.profile_conversion ?? 0],
    ["Content", data.scores.content_performance ?? 0],
    ["Local", data.scores.local_visibility ?? 0],
    ["Sales", data.scores.sales_readiness ?? 0],
    ["Competitor", data.scores.competitor_gap ?? 0],
  ];
  rows.sort((a, b) => a[1] - b[1]);
  return rows[0]?.[0] ?? "Local";
}

/**
 * Relevance-filtered competitor handles for the sprint copy. Must never leak
 * the poisoned-discovery accounts (@none_*, musicians, etc.) — runs every
 * candidate through the same relevance gate used by the board.
 */
function topCompetitorHandles(data: ReportData, limit = 3): string {
  const ctx = data.reportContext;
  const locals = data.competitors.filter((c) => c.competitor_type === "local_intel");
  const { kept } = filterByRelevance(locals, ctx.businessClassification, ctx.categoryKind ?? "generic");
  const handles = kept.filter((c) => c.username).slice(0, limit);
  if (handles.length === 0) return "active accounts in your category (re-run discovery to surface them)";
  return handles.map((c) => `@${c.username}`).join(", ");
}

function weekBlock(
  label: string,
  focus: string,
  tasks: string[],
): string {
  return `<div class="guide-card full">
  <div class="kicker">${e(label)}</div>
  <div class="title">${e(focus)}</div>
  <ul class="compact-list">${tasks.map((t) => `<li>${e(t)}</li>`).join("\n")}</ul>
</div>`;
}

/** 30-day execution calendar — the product hook between audits. */
export function thirtyDayPushSlide(data: ReportData): string {
  const ctx = data.reportContext;
  const market = e(ctx.localMarketLabel);
  const business = e(ctx.businessName);
  const handle = e(ctx.handle);
  const weakest = lowestScoreArea(data);
  const peers = topCompetitorHandles(data);
  const postsPerWeek = ctx.postsPerWeek != null ? `${ctx.postsPerWeek.toFixed(1)}/wk` : "low";
  const targetRhythm =
    (ctx.postsPerWeek ?? 0) < 2
      ? "3 posts per week (Tue / Thu / Sat)"
      : "4 posts per week (add one Reel)";

  const auditDate = data.audit.created_at ? new Date(data.audit.created_at) : new Date();
  const day30 = formatDate(addDays(auditDate, 30));

  const isApp = ctx.isApp ?? false;
  const cta = ctaForKind(ctx.categoryKind ?? "generic");
  // App vs local-service framing for the foundation week + conversion week.
  const week1Carousel = isApp
    ? "Day 4: Publish one “before your next move, do this” carousel (5 slides)."
    : "Day 4: Publish one “who we help in [city]” carousel (5 slides).";
  const week1Bio = isApp
    ? "Day 1–2: Rewrite bio — what the app does, who it's for, one benefit, one CTA (download / link)."
    : "Day 1–2: Rewrite bio — city, who you help, one offer, one CTA (DM / link).";
  const week3Cta = isApp
    ? `One post with explicit CTA: “${cta.action} — tap the link in bio.”`
    : "One post with explicit CTA: “Comment [keyword] for [lead magnet / consult].”";

  return `<span class="eyebrow">30-day sprint</span>

# Your 30-day plan

<p><strong>${business}</strong> (@${handle}) · ${market} · Today you post about <strong>${postsPerWeek}</strong>. This plan targets <strong>${targetRhythm}</strong> with copy-paste actions — not theory.</p>

<p><strong>Weakest score today:</strong> ${e(weakest)} — most of Week 1 focuses here. <strong>Watch:</strong> ${e(peers)}.</p>

${weekBlock(
    "Week 1 · Fix the foundation",
    "Profile + local signals",
    [
      week1Bio,
      "Day 3: Save 3 Story highlights: Services, Proof, FAQ.",
      week1Carousel,
      "Day 5–7: Comment on 5 local business posts/day (real sentences, not emojis).",
    ],
  )}

${weekBlock(
    "Week 2 · Post with a rhythm",
    "Content that matches what competitors win with",
    [
      "Post 3×: proof (before/after or testimonial), FAQ, behind-the-scenes.",
      "Use hashtag set from this deck on every post (8–12 tags).",
      "Add location tag + city name in first line of caption.",
      "Study one Reel from " + peers + " — note hook + length, then publish yours.",
    ],
  )}

${weekBlock(
    "Week 3 · Turn attention into conversations",
    "Sales readiness",
    [
      "Add pinned post or Story: “How to work with us in 3 steps.”",
      "Reply to every comment within 2 hours for 7 days.",
      "DM everyone who saves or shares (thank + one question).",
      week3Cta,
    ],
  )}

${weekBlock(
    "Week 4 · Measure and prepare for review",
    "Checkpoint before your next audit",
    [
      "Screenshot Insights: profile visits, reach, saves, DMs (last 28 days).",
      "List top 3 posts by saves or comments — note format + hook.",
      "Note what you stopped doing (low performers).",
      `Book your <strong>30-day review</strong> for <strong>${e(day30)}</strong> — same audit, new numbers.`,
    ],
  )}

<div class="guide-card full accent-border">
  <div class="kicker">Copy into ChatGPT · Monthly review prep</div>
  <div class="prompt">I run ${business} (@${handle}) in ${market}. Here are my Instagram insights from the last 30 days: [paste screenshots or numbers]. My audit scores were Profile ${data.scores.profile_conversion ?? "—"}, Content ${data.scores.content_performance ?? "—"}, Local ${data.scores.local_visibility ?? "—"}, Sales ${data.scores.sales_readiness ?? "—"}, Competitor ${data.scores.competitor_gap ?? "—"}. What improved, what stalled, and what should I prioritize for the next 30 days? Give me 5 specific post ideas with hooks.</div>
</div>`;
}

/** Strong return visit CTA — save this deck until day 30. */
export function thirtyDayReviewSlide(data: ReportData): string {
  const ctx = data.reportContext;
  const auditDate = data.audit.created_at ? new Date(data.audit.created_at) : new Date();
  const reviewDate = formatDate(addDays(auditDate, 30));
  const business = e(ctx.preparedForName);

  return `<span class="eyebrow">Day 30 review appointment</span>

# Your monthly check-in

<p>Save this workbook. Execute the sprint. On <strong>${e(reviewDate)}</strong>, run the same analysis again — we compare scores, competitors, hashtags, and what actually moved.</p>

<div class="checkpoint-grid">
  <div class="stat-card">
    <div class="num accent-text">30</div>
    <div class="label">Days to next audit</div>
  </div>
  <div class="stat-card">
    <div class="num">${e(reviewDate)}</div>
    <div class="label">Target review date</div>
  </div>
</div>

<div class="guide-card full">
  <div class="kicker">Bring these to your review</div>
  <ul class="compact-list">
    <li>Profile visits, reach, saves, shares, comments, DMs (28-day trend)</li>
    <li>Your 3 best posts + 2 worst — what was different?</li>
    <li>Which fixes from this deck you completed (check tear-off sheet)</li>
    <li>Any new competitor accounts you noticed locally</li>
  </ul>
</div>

<div class="guide-card full">
  <div class="kicker">Why businesses come back every month</div>
  <div class="copy">Instagram shifts weekly. Competitors post. Hashtags change. A monthly BotLogix review turns guessing into a system: fresh data, updated leaderboard, new copy-paste actions. <em>(Subscription pricing is coming — your first audit is the baseline.)</em></div>
</div>

<p style="font-size:13px;margin-top:12px">Prepared for <strong>${business}</strong>. Pin <strong>${e(reviewDate)}</strong> on your calendar — that is when this document pays off twice.</p>`;
}
