// Assembles the structured teardown Markdown report (spec §11). Deterministic
// sections render from computed facts; LLM-authored sections render when their
// JSON is present and degrade to an honest "not generated" note when the
// OpenRouter key is absent or a task failed — never fabricated.

import type { Teardown, TeardownContent } from "../../db/schema.js";
import type { IntegrityReport } from "./integrityReport.js";
import { renderIntegrityMarkdown } from "./integrityReport.js";
import type { TeardownMetrics, PerfRow } from "./metrics.js";
import type { CaptionStats } from "./captionAnalysis.js";
import type { HashtagTeardown } from "./hashtagTeardown.js";
import type { CommentDrivers } from "./commentDrivers.js";
import type { CommentCaptureResult } from "./teardownComments.js";
import type { LlmRunLog } from "../llm/llmClient.js";

export interface CaptionSystemLlm {
  hook_formulas?: string[];
  cta_strategy?: string;
  voice_and_tone?: string;
  caption_structure?: string[];
  replication_tips?: string[];
}
export interface CommentDriversLlm {
  primary_drivers?: string[];
  manufactured_vs_organic?: string;
  audience_signals?: string[];
  replication_tips?: string[];
}
export interface ThesisLlm {
  thesis?: string;
  pillars?: Array<{ name?: string; evidence?: string; so_what?: string }>;
  what_is_replicable?: string[];
  what_is_not_easily_replicable?: string[];
  preliminary_playbook?: string[];
  open_questions_for_later_milestones?: string[];
}

export interface ReportInputs {
  teardown: Teardown;
  content: TeardownContent[];
  integrity: IntegrityReport;
  metrics: TeardownMetrics;
  caption: CaptionStats;
  hashtags: HashtagTeardown;
  drivers: CommentDrivers;
  commentCapture: CommentCaptureResult;
  llm: {
    captionSystem: CaptionSystemLlm | null;
    commentDrivers: CommentDriversLlm | null;
    thesis: ThesisLlm | null;
  };
  exportPaths: { jsonPath: string; csvPath: string; integrityPath: string };
  llmLog: LlmRunLog;
}

const pct = (x: number | null | undefined): string =>
  x == null ? "—" : `${(x * 100).toFixed(0)}%`;
const pct1 = (x: number | null | undefined): string =>
  x == null ? "—" : `${(x * 100).toFixed(1)}%`;
const n0 = (x: number | null | undefined): string =>
  x == null ? "—" : Math.round(x).toLocaleString("en-US");
const dt = (s: string | null | undefined): string => (s ? s.slice(0, 10) : "—");

function ul(items: Array<string | null | undefined>): string {
  const clean = items.filter((i): i is string => Boolean(i && i.trim()));
  return clean.length ? clean.map((i) => `- ${i}`).join("\n") : "_none_";
}

function perfTable(rows: PerfRow[]): string {
  if (!rows.length) return "_none_";
  const head = "| Shortcode | Type | Date | Likes | Comments | Plays | ER |\n| --- | --- | --- | --- | --- | --- | --- |";
  const body = rows
    .map(
      (r) =>
        `| ${r.shortcode ?? "—"} | ${r.content_type} | ${dt(r.posted_at)} | ${n0(r.like_count)} | ${n0(r.comment_count)} | ${n0(r.play_count)} | ${pct1(r.engagement_rate)} |`,
    )
    .join("\n");
  return `${head}\n${body}`;
}

function llmMissingNote(log: LlmRunLog): string {
  return `> _This section is LLM-authored. It was not generated on this run (${
    log.toJSON().configured ? "the task failed validation" : "OPENROUTER_API_KEY not set"
  }). The deterministic signals above are complete and were not fabricated._`;
}

export function renderReportMarkdown(inp: ReportInputs): string {
  const t = inp.teardown;
  const m = inp.metrics;
  const cap = inp.caption;
  const ht = inp.hashtags;
  const cd = inp.drivers;
  const handle = t.target_handle ?? "account";
  const captured = inp.content.length;
  const today = new Date().toISOString().slice(0, 10);

  const allByDate = [...inp.content].sort(
    (a, b) => Date.parse(b.posted_at ?? "") - Date.parse(a.posted_at ?? ""),
  );

  const L: string[] = [];

  // Title
  L.push(`# Teardown: @${handle}  (captured ${dt(t.completed_at) || today})`);
  L.push("");
  L.push(
    `> ${t.full_name ?? handle}${t.category ? ` · ${t.category}` : ""} · ${n0(t.follower_count)} followers · ${n0(t.post_count)} posts`,
  );
  L.push(`> Source: ${t.target_url}`);
  L.push(
    `> Milestone: **M3 (text intelligence)** — captions, hashtags, engagement/momentum, comment drivers. Cover-image vision (M5) and reel transcripts (M4) are not yet included.`,
  );
  L.push("");

  // 1. Success Thesis
  L.push("## 1. Success Thesis");
  L.push("");
  if (inp.llm.thesis) {
    const th = inp.llm.thesis;
    if (th.thesis) L.push(th.thesis, "");
    if (th.pillars?.length) {
      L.push("**Pillars**", "");
      L.push("| Pillar | Evidence | Why it matters |");
      L.push("| --- | --- | --- |");
      for (const p of th.pillars) {
        L.push(`| ${p.name ?? "—"} | ${p.evidence ?? "—"} | ${p.so_what ?? "—"} |`);
      }
      L.push("");
    }
    if (th.what_is_replicable?.length) {
      L.push("**What's replicable**", "", ul(th.what_is_replicable), "");
    }
    if (th.what_is_not_easily_replicable?.length) {
      L.push("**Hard to copy**", "", ul(th.what_is_not_easily_replicable), "");
    }
  } else {
    L.push(llmMissingNote(inp.llmLog), "");
  }

  // 2. Account Snapshot
  L.push("## 2. Account Snapshot");
  L.push("");
  L.push("| Field | Value |");
  L.push("| --- | --- |");
  L.push(`| Handle | @${handle} |`);
  L.push(`| Name | ${t.full_name ?? "—"} |`);
  L.push(`| Category | ${t.category ?? "—"} |`);
  L.push(`| Followers | ${n0(t.follower_count)} |`);
  L.push(`| Following | ${n0(t.following_count)} |`);
  L.push(`| Total posts | ${n0(t.post_count)} |`);
  L.push(`| Verified / Business | ${t.is_verified ? "yes" : "no"} / ${t.is_business ? "yes" : "no"} |`);
  L.push(`| Items analyzed | ${captured} |`);
  L.push(`| Bio | ${(t.bio ?? "—").replace(/\n/g, " ")} |`);
  L.push("");

  // 3. Momentum & Growth
  L.push("## 3. Momentum & Growth");
  L.push("");
  L.push(
    `- Capture window: **${dt(m.dateRange.first)} → ${dt(m.dateRange.last)}** (${m.dateRange.spanDays ?? "—"} days)`,
  );
  L.push(`- Posting cadence: **${m.cadence.postsPerWeek ?? "—"}/week** (median gap ${m.cadence.medianGapDays ?? "—"} days)`);
  L.push(
    `- Avg likes: **${n0(m.overall.avgLikes)}** (median ${n0(m.overall.medianLikes)}) · Avg comments: **${n0(m.overall.avgComments)}** (median ${n0(m.overall.medianComments)})`,
  );
  if (m.overall.avgPlays != null) L.push(`- Avg plays (video/reel): **${n0(m.overall.avgPlays)}**`);
  L.push(`- Avg engagement rate: **${pct1(m.overall.avgEngagementRate)}** (median ${pct1(m.overall.medianEngagementRate)})`);
  L.push(
    `- Comment-to-like ratio: **${m.overall.commentToLikeRatio != null ? m.overall.commentToLikeRatio.toFixed(3) : "—"}** (high = comment-engineered via CTAs)`,
  );
  L.push("");
  L.push("**Momentum (recent half vs prior half by post date)**", "");
  L.push("| Window | Items | Avg likes | Avg comments | Avg ER |");
  L.push("| --- | --- | --- | --- | --- |");
  L.push(
    `| ${m.momentum.recent.label} | ${m.momentum.recent.items} | ${n0(m.momentum.recent.avgLikes)} | ${n0(m.momentum.recent.avgComments)} | ${pct1(m.momentum.recent.avgEngagementRate)} |`,
  );
  L.push(
    `| ${m.momentum.prior.label} | ${m.momentum.prior.items} | ${n0(m.momentum.prior.avgLikes)} | ${n0(m.momentum.prior.avgComments)} | ${pct1(m.momentum.prior.avgEngagementRate)} |`,
  );
  L.push("");
  L.push(
    `- Trend in avg likes: **${m.momentum.likeDirection.toUpperCase()}**${m.momentum.pctChangeLikes != null ? ` (${(m.momentum.pctChangeLikes * 100).toFixed(0)}%)` : ""} across the captured window.`,
  );
  L.push(
    `- _Note: this is within-window momentum from captured posts. True follower-growth history is not scrapable; the cohort tracker (M2) builds it forward from daily snapshots._`,
  );
  L.push("");

  // 4. Content Performance
  L.push("## 4. Content Performance");
  L.push("");
  L.push("**Format mix**", "");
  L.push("| Type | Count | Share | Avg likes | Avg comments | Avg ER |");
  L.push("| --- | --- | --- | --- | --- | --- |");
  for (const f of m.formatMix) {
    L.push(
      `| ${f.type} | ${f.count} | ${pct(f.pct)} | ${n0(f.avgLikes)} | ${n0(f.avgComments)} | ${pct1(f.avgEngagementRate)} |`,
    );
  }
  L.push("");
  L.push("**Top 5 by likes**", "", perfTable(m.topByLikes), "");
  L.push("**Top 5 by comments**", "", perfTable(m.topByComments), "");
  if (m.topByPlays.length) L.push("**Top 5 by plays**", "", perfTable(m.topByPlays), "");
  L.push("**Top 5 by engagement rate**", "", perfTable(m.topByEngagementRate), "");
  if (m.outliers.length) L.push("**Viral outliers (≥2.5× median likes)**", "", perfTable(m.outliers), "");
  L.push(`<details><summary><b>Full content table (${allByDate.length} items)</b></summary>`, "");
  L.push(perfTable(allByDate.map((c) => ({
    shortcode: c.shortcode,
    content_type: c.content_type,
    posted_at: c.posted_at,
    like_count: c.like_count,
    comment_count: c.comment_count,
    play_count: c.play_count,
    engagement_rate: c.engagement_rate,
  }))));
  L.push("", "</details>", "");

  // 5. Visual System (deferred)
  L.push("## 5. Visual System");
  L.push("");
  L.push(
    "> _Cover-image teardown (on-image text, layout, faces, palette, thumbnail-stop power) arrives in **M5 (vision)**. Cover URLs are already captured for every item and stored in the dataset, ready for that pass._",
  );
  L.push("");

  // 6. Caption & Hook System
  L.push("## 6. Caption & Hook System");
  L.push("");
  L.push("**Measured signals**", "");
  L.push(`- Captions present: ${cap.withCaption}/${cap.analyzed}`);
  L.push(`- Caption length: avg **${cap.length.avg}** chars (median ${cap.length.median}, range ${cap.length.min}–${cap.length.max})`);
  L.push(`- Hook (first line): avg **${cap.hooks.avgFirstLineLength}** chars · question hooks ${pct(cap.hooks.questionHookPct)} · number hooks ${pct(cap.hooks.numberHookPct)}`);
  L.push(`- Emoji usage: ${pct(cap.emojiUsagePct)} of captions`);
  L.push(
    `- CTA mix: comment-keyword **${pct(cap.cta.commentKeywordPct)}** · link-in-bio ${pct(cap.cta.linkInBioPct)} · DM ${pct(cap.cta.dmPct)} · save ${pct(cap.cta.savePct)} · follow ${pct(cap.cta.followPct)} · tag-a-friend ${pct(cap.cta.tagFriendPct)}`,
  );
  if (cap.hooks.commonOpeners.length) {
    L.push(`- Common hook openers: ${cap.hooks.commonOpeners.map((o) => `"${o.opener}" (${o.count})`).join(", ")}`);
  }
  if (cap.cta.keywords.length) {
    L.push(`- "Comment KEYWORD" triggers used: ${cap.cta.keywords.map((k) => `${k.keyword} (${k.count})`).join(", ")}`);
  }
  L.push("");
  if (inp.llm.captionSystem) {
    const cs = inp.llm.captionSystem;
    if (cs.hook_formulas?.length) L.push("**Hook formulas**", "", ul(cs.hook_formulas), "");
    if (cs.cta_strategy) L.push("**CTA strategy**", "", cs.cta_strategy, "");
    if (cs.voice_and_tone) L.push("**Voice & tone**", "", cs.voice_and_tone, "");
    if (cs.caption_structure?.length) L.push("**Caption structure templates**", "", ul(cs.caption_structure), "");
    if (cs.replication_tips?.length) L.push("**Replication tips**", "", ul(cs.replication_tips), "");
  } else {
    L.push(llmMissingNote(inp.llmLog), "");
  }

  // 7. Reel Script System (deferred)
  L.push("## 7. Reel Script System");
  L.push("");
  L.push(
    "> _Spoken-hook + full reel-script teardown (Deepgram transcripts) arrives in **M4 (audio)**. Video URLs are captured but expire quickly, so transcription runs close to capture time._",
  );
  L.push("");

  // 8. Hashtag System
  L.push("## 8. Hashtag System");
  L.push("");
  L.push(`- Posts using hashtags: ${ht.postsWithHashtags}/${captured} · unique tags: ${ht.totalUniqueTags}`);
  L.push(`- Avg **${ht.avgPerPost}**/post (median ${ht.medianPerPost}) — assessment: **${ht.countAssessment.replace("_", " ")}**`);
  if (ht.coreSet.length) L.push(`- Core reused set: ${ht.coreSet.join(" ")}`);
  L.push("", ul(ht.notes), "");
  if (ht.topTags.length) {
    L.push("**Top hashtags**", "");
    L.push("| Hashtag | Posts | Share |");
    L.push("| --- | --- | --- |");
    for (const tag of ht.topTags.slice(0, 15)) {
      L.push(`| ${tag.tag} | ${tag.count} | ${pct(tag.pct)} |`);
    }
    L.push("");
  }
  if (ht.topPairs.length) {
    L.push(`**Most-paired tags:** ${ht.topPairs.slice(0, 6).map((p) => `${p.pair[0]}+${p.pair[1]} (${p.count})`).join(", ")}`, "");
  }

  // 9. What Drives Comments
  L.push("## 9. What Drives Comments");
  L.push("");
  L.push(
    `- Comments analyzed: **${cd.totalComments}** across ${cd.postsWithComments} posts (${inp.commentCapture.postsScraped} scraped, ${inp.commentCapture.cacheHits} cached, ${inp.commentCapture.skippedAlreadyHave} already stored)`,
  );
  if (cd.totalComments > 0) {
    L.push(`- Question rate ${pct(cd.questionRate)} · tag rate ${pct(cd.tagRate)} · emoji rate ${pct(cd.emojiRate)} · avg length ${cd.avgLength} chars`);
    L.push(`- Short replies (≤3 words) **${pct(cd.shortReplyRate)}** · keyword-echo replies **${pct(cd.keywordEchoRate)}** (people typing the caption's CTA keyword)`);
    if (cd.topTokens.length) L.push(`- Top comment tokens: ${cd.topTokens.slice(0, 12).map((tk) => `${tk.token} (${tk.count})`).join(", ")}`);
  }
  L.push(
    `- Caption-CTA comment lift: posts with a "comment KEYWORD" CTA avg **${n0(cap.ctaCommentLift.withCtaAvgComments)}** comments vs **${n0(cap.ctaCommentLift.withoutCtaAvgComments)}** without` +
      (cap.ctaCommentLift.liftRatio != null ? ` (**${cap.ctaCommentLift.liftRatio.toFixed(1)}×**)` : ""),
  );
  if (inp.commentCapture.budgetStopped) {
    L.push("- ⚠️ Comment capture stopped early on the Apify budget cap — comment analysis is partial.");
  }
  L.push("");
  if (inp.llm.commentDrivers) {
    const dl = inp.llm.commentDrivers;
    if (dl.primary_drivers?.length) L.push("**Primary drivers**", "", ul(dl.primary_drivers), "");
    if (dl.manufactured_vs_organic) L.push("**Manufactured vs organic**", "", dl.manufactured_vs_organic, "");
    if (dl.audience_signals?.length) L.push("**Audience signals**", "", ul(dl.audience_signals), "");
    if (dl.replication_tips?.length) L.push("**Replication tips**", "", ul(dl.replication_tips), "");
  } else if (cd.totalComments === 0) {
    L.push("> _No comments were captured for this teardown, so comment-driver synthesis was skipped. Caption-CTA lift above is computed from post-level comment counts._", "");
  } else {
    L.push(llmMissingNote(inp.llmLog), "");
  }

  // 10. Replication Playbook
  L.push("## 10. Replication Playbook");
  L.push("");
  if (inp.llm.thesis?.preliminary_playbook?.length) {
    L.push("_Preliminary (text-only) playbook — sharpens with M4 reel scripts + M5 visual analysis._", "");
    const steps = inp.llm.thesis.preliminary_playbook;
    L.push(steps.map((s, i) => `${i + 1}. ${s}`).join("\n"), "");
    if (inp.llm.thesis.open_questions_for_later_milestones?.length) {
      L.push("**Open questions for M4/M5**", "", ul(inp.llm.thesis.open_questions_for_later_milestones), "");
    }
  } else {
    L.push(llmMissingNote(inp.llmLog), "");
  }

  // 0. Data Integrity Report (appended near the end but numbered §0 per spec)
  L.push("## 0. Data Integrity Report");
  L.push("");
  L.push(renderIntegrityMarkdown(inp.integrity).split("\n").slice(1).join("\n").trim());
  L.push("");

  // Appendix
  L.push("## Appendix: raw export paths");
  L.push("");
  L.push(`- JSON dataset: \`${inp.exportPaths.jsonPath}\``);
  L.push(`- Content CSV: \`${inp.exportPaths.csvPath}\``);
  L.push(`- Integrity report: \`${inp.exportPaths.integrityPath}\``);
  L.push("");
  const logJson = inp.llmLog.toJSON();
  L.push(
    `_LLM provenance: provider ${logJson.provider}, configured=${logJson.configured}, ${logJson.calls.length} call(s). ` +
      `${logJson.calls.map((c) => `${c.task}:${c.ok ? (c.cached ? "cached" : "ok") : "failed"}`).join(", ") || "no calls"}._`,
  );
  L.push("");

  return L.join("\n");
}
