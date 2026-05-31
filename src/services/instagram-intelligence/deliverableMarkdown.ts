/**
 * Client-facing deliverable renderer — "Instagram Growth Plan".
 *
 * Consumes the same GoldMasterIntelligence object as goldMasterMarkdown.ts, but
 * arranges it as a report a business owner wants to read: lead with the answer,
 * a narrative arc (Stand → Market → Plan → Toolkit), and all diagnostic
 * internals (raw relevance scores, evidence index, validation) kept to a short
 * methodology appendix. See docs/report-blueprint.md.
 *
 * Voice: practical, direct, human. No hype.
 */

import type {
  GoldMasterIntelligence,
  ScoreDiagnosis,
  CompetitorCard,
} from "./goldMasterSchema.js";

function bar(score: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(score / 10)));
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)} ${score}/100`;
}

function num(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString("en-US");
}

/** Honest, non-hype read of the overall score. */
function verdict(score: number): string {
  if (score >= 80) return "Strong. The work now is sharpening the edges, not fixing fundamentals.";
  if (score >= 60) return "Solid foundation. A focused month of consistency moves you into competitive territory.";
  if (score >= 40) return "The basics are in place but under-used — most of the upside is still on the table.";
  return "Early days. The fundamentals need attention, which means the gains from this plan are large.";
}

function dims(scores: ScoreDiagnosis[]): { overall: ScoreDiagnosis | null; rest: ScoreDiagnosis[] } {
  const overall = scores.find((s) => /overall/i.test(s.dimension)) ?? null;
  const rest = scores.filter((s) => s !== overall);
  return { overall, rest };
}

/** A clean, human "why this account is here" line — no internal scores. */
function whyHere(c: CompetitorCard, category: string, market: string): string {
  if (c.whySelected.startsWith("Adjacent industry")) return c.whySelected;
  if (c.type === "reference") {
    return `An aspirational ${category} account (${num(c.followers)} followers) — big enough to learn from, reachable enough to catch. Activity: ${c.activityStatus}.`;
  }
  return `A local peer in ${market} (${num(c.followers)} followers) — a direct read on what works in your own market. Activity: ${c.activityStatus}.`;
}

function competitorBlock(c: CompetitorCard, category: string, market: string): string {
  const label = c.whySelected.startsWith("Adjacent industry")
    ? "Adjacent industry"
    : c.type === "reference" ? "Reference model" : "Local peer";
  const lines = [
    `#### @${c.handle} — ${c.displayName}`,
    `*${label}*`,
    "",
    `- **Why it's here:** ${whyHere(c, category, market)}`,
  ];
  if (c.latestPostHook) lines.push(`- **A recent post:** "${c.latestPostHook.slice(0, 110).trim()}"`);
  lines.push(`- **Borrow:** ${c.borrow}`);
  lines.push(`- **Avoid:** ${c.avoid}`);
  return lines.join("\n");
}

export function renderDeliverable(gm: GoldMasterIntelligence): string {
  const m = gm.meta;
  const category = m.normalizedCategory;
  const market = m.marketLabel || m.city || "your market";
  const { overall, rest } = dims(gm.scores);
  const overallScore = overall?.score ?? gm.scores[0]?.score ?? 0;
  const weakest = [...rest].sort((a, b) => a.score - b.score)[0];
  const strongest = [...rest].sort((a, b) => b.score - a.score)[0];
  const out: string[] = [];
  const p = (s = "") => out.push(s);

  // ── COVER ──
  p(`# Instagram Growth Plan — @${m.handle}`);
  p();
  p(`**${m.account}** · ${category} · ${market}`);
  p(`Prepared by BotLogix · ${new Date(m.generatedAt).toISOString().slice(0, 10)} · Review on ${m.reviewDate}`);
  p();
  p("> A 30-day plan to turn your Instagram into a discovery and lead channel — built from your own account, your market, and the accounts already winning in your space.");
  p();
  p("---");

  // ── EXECUTIVE SUMMARY ──
  p("## Executive Summary");
  p();
  p(`**Where you stand:** ${overallScore}/100. ${verdict(overallScore)}`);
  p();
  p(`**Your biggest opportunity:** ${gm.fixes[0]?.title ?? "Tighten profile + cadence for local discovery."}`);
  p();
  p("**Your first three moves this week:**");
  gm.fixes.slice(0, 3).forEach((f, i) => p(`${i + 1}. **${f.title}** — ${f.expectedLift}, ~${f.timeRequired}.`));
  p();
  if (weakest && strongest) {
    p(`**The headline:** your strongest area is **${strongest.dimension.toLowerCase()}** (${strongest.score}/100); the fastest win is **${weakest.dimension.toLowerCase()}** (${weakest.score}/100). This plan spends most of its energy there.`);
    p();
  }
  p("---");

  // ── PART 1 — WHERE YOU STAND ──
  p("## Part 1 — Where You Stand Today");
  p();
  p("A clear read on your account as it is right now — the numbers, and what's quietly holding it back.");
  p();
  p("### Your scorecard");
  p();
  if (overall) p(`- **Overall** \`${bar(overall.score)}\``);
  for (const s of rest) p(`- **${s.dimension}** \`${bar(s.score)}\``);
  p();
  if (weakest) p(`> **Fix first:** ${weakest.dimension} — ${weakest.nextMove}`);
  p();
  p("### Profile snapshot");
  p();
  p(`- **Display name:** ${gm.account.displayName}`);
  p(`- **Bio:** ${gm.account.bio ?? "—"}`);
  p(`- **Link:** ${gm.account.website ?? "—"}`);
  const ppw = gm.account.postsPerWeek == null ? "—" : Math.round(gm.account.postsPerWeek * 10) / 10;
  p(`- **Followers:** ${num(gm.account.followerCount)} · **Posts:** ${num(gm.account.postCount)} · **Posts/week:** ${ppw}`);
  p(`- **CTA status:** ${gm.account.ctaStatus} · **Local signal:** ${gm.account.localSignalStatus}`);
  p();
  if (gm.account.profileGaps.length) {
    p("### What's holding you back");
    p();
    for (const g of gm.account.profileGaps) p(`- ${g}`);
    p();
  }
  p("---");

  // ── PART 2 — WHAT'S WORKING IN YOUR MARKET ──
  p("## Part 2 — What's Working In Your Market");
  p();
  p(`We studied ${num(gm.marketPatterns.postsStudied)} posts across your category and pulled the accounts already succeeding in it. Here's what the market rewards — and who to learn from.`);
  p();
  p("### How you compare");
  p();
  p("| Metric | You | Market average |");
  p("| --- | --- | --- |");
  for (const r of gm.marketComparison.rows) p(`| ${r.metric} | ${r.client} | ${r.market} |`);
  p();
  p(`**Read:** ${gm.marketComparison.interpretation}`);
  p();
  if (gm.competitors.length) {
    p("### Accounts worth studying");
    p();
    const refs = gm.competitors.filter((c) => c.type === "reference");
    const locals = gm.competitors.filter((c) => c.type === "local");
    if (refs.length) {
      p("**Reference models — aspirational accounts in your space:**");
      p();
      for (const c of refs) { p(competitorBlock(c, category, market)); p(); }
    }
    if (locals.length) {
      p("**Local peers — your own market:**");
      p();
      for (const c of locals) { p(competitorBlock(c, category, market)); p(); }
    }
  }
  p("### Proven patterns in your category");
  p();
  const fmtDist = (d: { label: string; pct: number }[]) => d.slice(0, 5).map((x) => `${x.label} ${x.pct}%`).join(" · ");
  p(`- **Top formats:** ${fmtDist(gm.marketPatterns.topFormats) || "—"}`);
  p(`- **Hook styles:** ${fmtDist(gm.marketPatterns.hookDistribution) || "—"}`);
  p(`- **What posts emphasize:** ${fmtDist(gm.marketPatterns.contentElementDistribution) || "—"}`);
  p();
  // Local & adjacent opportunities (only when there's real signal).
  const ls = gm.localSignal;
  const hasLocal = ls.spotlightedAccounts.length || ls.localWording.length || ls.complementaryTerms.length || ls.successStories.length;
  if (hasLocal) {
    p("### Local & adjacent opportunities");
    p();
    if (ls.successStories.length) {
      p("**Local accounts doing well (study these closely):**");
      for (const s of ls.successStories) p(`- @${s.handle} (${num(s.followers)} followers) — ${s.whatTheyDoWell}`);
      p();
    }
    if (ls.spotlightedAccounts.length) p(`- **Accounts local businesses tag/spotlight:** ${ls.spotlightedAccounts.map((h) => `@${h}`).join(", ")}`);
    if (ls.localWording.length) p(`- **Language that resonates locally:** ${ls.localWording.slice(0, 12).join(", ")}`);
    if (ls.complementaryTerms.length) p(`- **Adjacent industries reaching the same audience:** ${ls.complementaryTerms.slice(0, 8).join(", ")}`);
    p();
  }
  p("---");

  // ── PART 3 — YOUR 30-DAY PLAN ──
  p("## Part 3 — Your 30-Day Plan");
  p();
  p("Everything above points here. Five moves, a day-by-day first week, a four-week sprint, and exactly how we'll know it worked.");
  p();
  p("### The five moves that matter most");
  p();
  gm.fixes.forEach((f, i) => {
    p(`#### ${i + 1}. ${f.title}`);
    p(`*${f.impact} impact · ${f.effort} effort · ~${f.timeRequired} · expected: ${f.expectedLift}*`);
    p();
    p(`**Why:** ${f.whyItMatters}`);
    p();
    p(`**Do this:** ${f.exactAction}`);
    p();
  });
  p("### Your first seven days");
  p();
  for (const d of gm.nextSevenDays) {
    p(`**Day ${d.day} — ${d.objective}** *(${d.timeEstimate})*`);
    p(`- ${d.exactInstruction}`);
    p(`- _Done when:_ ${d.outputByEndOfDay}`);
    p();
  }
  p("### The 30-day sprint");
  p();
  for (const w of gm.sprint) {
    p(`**Week ${w.week} — ${w.goal}**`);
    for (const a of w.actions) p(`- ${a}`);
    p(`- _Output:_ ${w.output} · _Measure:_ ${w.measure}`);
    p();
  }
  p("### How we'll measure success");
  p();
  for (const c of gm.measurement) {
    p(`**Day ${c.dayMark}** — measure ${c.measure}. Good sign: ${c.goodSign}. Adjust if: ${c.adjustIf}.`);
  }
  p();
  if (gm.day30.bringBack.length) {
    p(`**At day 30, bring back:** ${gm.day30.bringBack.join("; ")}.`);
    p(`**Why monthly:** ${gm.day30.whyMonthlyMatters}`);
    p();
  }
  p("---");

  // ── PART 4 — TOOLKIT ──
  p("## Part 4 — Your Content Toolkit");
  p();
  p("Copy-paste building blocks so you never start from a blank screen.");
  p();
  if (gm.toolkit.hookFormulas.length) {
    p("### Hook formulas");
    for (const h of gm.toolkit.hookFormulas) p(`- ${h}`);
    p();
  }
  if (gm.toolkit.captionFormulas.length) {
    p("### Caption formulas");
    for (const c of gm.toolkit.captionFormulas) { p(c); p(); }
  }
  if (gm.hashtags.length) {
    p("### Hashtag sets");
    for (const g of gm.hashtags) p(`- **${g.group}:** ${g.tags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")}`);
    p();
  }
  if (gm.aiPrompts.length) {
    p("### Copy-ready AI prompts");
    p();
    for (const pr of gm.aiPrompts) {
      p(`**${pr.label}**`);
      p("```");
      p(pr.prompt);
      p("```");
      p();
    }
  }
  if (gm.immediateContent.hooks.length) {
    p("### Idea bank — 10 hooks to start from");
    for (const h of gm.immediateContent.hooks) p(`- ${h}`);
    p();
  }
  if (gm.quickActions.length) {
    p("### Quick wins");
    for (const q of gm.quickActions) p(`- _[${q.when.replace(/_/g, " ")}]_ ${q.action}`);
    p();
  }
  p("---");

  // ── APPENDIX — METHODOLOGY ──
  p("## Appendix — How this was built");
  p();
  p(`This plan was generated from a live analysis of @${m.handle}, ${num(gm.marketPatterns.postsStudied)} posts across the ${category} category, and ${gm.competitors.length} vetted competitor accounts discovered and scored for relevance and engagement success.`);
  p();
  p(`- **Overall confidence:** ${gm.overallConfidence}/100`);
  p(`- **Model:** ${m.modelUsed} · **Method version:** ${m.promptVersion}`);
  p(`- **Validation:** ${gm.validation.passed ? "passed" : "failed"} (${gm.validation.blockingCount} blocking, ${gm.validation.warningCount} warnings)`);
  if (gm.dataGaps.length) {
    p();
    p("**Known data gaps:**");
    for (const g of gm.dataGaps) p(`- _${g.severity}_ — ${g.area}: ${g.detail}`);
  }
  p();
  p("_Full competitor discovery detail, evidence index, and per-section confidence are available in the technical report (gold-master.md)._");
  p();

  return out.join("\n");
}
