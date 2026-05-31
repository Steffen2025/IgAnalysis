/**
 * Client-facing deliverable renderer — "Instagram Growth Plan".
 *
 * Consumes the same GoldMasterIntelligence object as goldMasterMarkdown.ts, but
 * arranges it as an advisory document a business owner wants to read: lead with
 * the answer, then a strategic narrative (Big Picture → Stand → Market → Plan →
 * Toolkit → What This Unlocks), with diagnostic internals kept to a short
 * methodology appendix. See docs/report-blueprint.md.
 *
 * The strategy is synthesised deterministically from the data — no hype, no
 * invented numbers. Voice: practical, direct, human, encouraging.
 */

import type {
  GoldMasterIntelligence,
  ScoreDiagnosis,
  CompetitorCard,
  MetricComparison,
} from "./goldMasterSchema.js";

function bar(score: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(score / 10)));
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)} ${score}/100`;
}

function num(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString("en-US");
}

/** Parse the leading number out of a "0.2" / "669 chars" / "image" cell. */
function leadNum(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function findRow(rows: MetricComparison[], re: RegExp): MetricComparison | undefined {
  return rows.find((r) => re.test(r.metric));
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
  const topFix = gm.fixes[0];
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
  p(`**Your biggest opportunity:** ${topFix?.title ?? "Tighten profile + cadence for local discovery."}`);
  p();
  p("**Your first three moves this week:**");
  gm.fixes.slice(0, 3).forEach((f, i) => p(`${i + 1}. **${f.title}** — ${f.expectedLift}, ~${f.timeRequired}.`));
  p();
  if (weakest && strongest) {
    p(`**The headline:** your strongest area is **${strongest.dimension.toLowerCase()}** (${strongest.score}/100); the fastest win is **${weakest.dimension.toLowerCase()}** (${weakest.score}/100). This plan spends most of its energy there.`);
    p();
  }
  p("---");

  // ── THE BIG PICTURE (strategic synthesis) ──
  p("## The Big Picture");
  p();
  p(`Let's be straight about where @${m.handle} is and where it can go. You're a ${category.toLowerCase()} in ${market} with ${num(gm.account.followerCount)} followers and a real offer — the bones are here. What's missing isn't effort or talent; it's a **repeatable system** that tells Instagram who you are, who you serve, and why someone should act.`);
  p();
  // Cadence reality from the market comparison.
  const ppwRow = findRow(gm.marketComparison.rows, /week/i);
  const clientPpw = leadNum(ppwRow?.client);
  const marketPpw = leadNum(ppwRow?.market);
  if (clientPpw != null && marketPpw != null && marketPpw > 0) {
    const ratio = clientPpw > 0 ? Math.round(marketPpw / clientPpw) : null;
    p(`The single clearest signal in the data: **cadence**. You post about ${clientPpw}×/week; the accounts winning in your category post around ${marketPpw}×/week${ratio && ratio >= 2 ? ` — roughly ${ratio}× more often` : ""}. Instagram rewards consistency, and right now that's the cheapest, highest-leverage lever you have. You don't need to post more *kinds* of things — you need a rhythm you can actually keep.`);
    p();
  }
  if (weakest) {
    p(`**The 30-day bet:** fix **${weakest.dimension.toLowerCase()}** first (today it scores ${weakest.score}/100), because it's the gap throttling everything downstream. ${topFix ? `That starts with one move — *${topFix.title.toLowerCase()}* — and the rest of this plan compounds off it.` : ""} We're not chasing virality. We're building a profile that converts, a cadence the algorithm trusts, and a signature format that makes you recognisable.`);
    p();
  }
  p(`Everything below is sequenced so each step makes the next one easier. Read it once end-to-end, then work Part 3 day by day.`);
  p();
  p("---");

  // ── PART 1 — WHERE YOU STAND ──
  p("## Part 1 — Where You Stand Today");
  p();
  p("A clear, honest read on your account as it is right now — the numbers, and what's quietly holding it back. No fluff: this is the baseline we'll measure against in 30 days.");
  p();
  p("### Your scorecard");
  p();
  if (overall) p(`- **Overall** \`${bar(overall.score)}\``);
  for (const s of rest) p(`- **${s.dimension}** \`${bar(s.score)}\``);
  p();
  if (weakest) p(`> **Fix first:** ${weakest.dimension} (${weakest.score}/100) — ${weakest.nextMove} This is where the plan focuses.`);
  if (strongest) p(`>\n> **Lean on:** ${strongest.dimension} (${strongest.score}/100) is already your strength — use it as the foundation, don't neglect it.`);
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
    p("These are small, fixable things — but each one quietly costs you reach or conversions every single day:");
    p();
    for (const g of gm.account.profileGaps) p(`- ${g}`);
    p();
  }
  p("---");

  // ── PART 2 — WHAT'S WORKING IN YOUR MARKET ──
  p("## Part 2 — What's Working In Your Market");
  p();
  p(`This is the part most audits skip. We studied **${num(gm.marketPatterns.postsStudied)} real posts** across your category and pulled the accounts already succeeding in it — so your plan is built on what the market actually rewards, not generic best-practice.`);
  p();
  p("### How you compare");
  p();
  p("| Metric | You | Market average |");
  p("| --- | --- | --- |");
  for (const r of gm.marketComparison.rows) p(`| ${r.metric} | ${r.client} | ${r.market} |`);
  p();
  p(`**Read:** ${gm.marketComparison.interpretation}`);
  p();
  // Strategic synthesis of the gaps.
  const capRow = findRow(gm.marketComparison.rows, /caption/i);
  const tagRow = findRow(gm.marketComparison.rows, /hashtag/i);
  const fmtRow = findRow(gm.marketComparison.rows, /format/i);
  const insights: string[] = [];
  const cCap = leadNum(capRow?.client); const mCap = leadNum(capRow?.market);
  if (cCap != null && mCap != null && cCap > mCap * 1.3) insights.push(`Your captions run **${cCap} characters** vs the market's ${mCap} — you're over-writing. Lead with the hook in line one; move detail lower or cut it.`);
  const cTag = leadNum(tagRow?.client); const mTag = leadNum(tagRow?.market);
  if (cTag != null && mTag != null && cTag > mTag * 1.4) insights.push(`You use **${cTag} hashtags/post** against a market norm of ${mTag}. More isn't better — a tight, intentional set (local + category) reads as confident, not spammy.`);
  if (fmtRow && fmtRow.client && fmtRow.market && fmtRow.client.toLowerCase() !== fmtRow.market.toLowerCase()) insights.push(`The market wins with **${fmtRow.market}**; you lean on **${fmtRow.client}**. Shift weight toward ${fmtRow.market} — it's what earns reach in your space right now.`);
  if (insights.length) {
    p("**What this means for you:**");
    for (const i of insights) p(`- ${i}`);
    p();
  }
  if (gm.competitors.length) {
    p("### Accounts worth studying");
    p();
    const refs = gm.competitors.filter((c) => c.type === "reference");
    const locals = gm.competitors.filter((c) => c.type === "local");
    p(`We surfaced **${gm.competitors.length} relevant accounts** — ${refs.length} aspirational reference models and ${locals.length} local peers. Don't copy them; reverse-engineer *why* their posts work and rebuild that in your own voice. The borrow/avoid lines tell you exactly how.`);
    p();
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
  p("### The patterns that win in your category");
  p();
  const fmtDist = (d: { label: string; pct: number }[]) => d.slice(0, 5).map((x) => `${x.label} ${x.pct}%`).join(" · ");
  p(`From ${num(gm.marketPatterns.postsStudied)} posts studied:`);
  p();
  p(`- **Top formats:** ${fmtDist(gm.marketPatterns.topFormats) || "—"}`);
  p(`- **Hook styles:** ${fmtDist(gm.marketPatterns.hookDistribution) || "—"}`);
  p(`- **What posts emphasize:** ${fmtDist(gm.marketPatterns.contentElementDistribution) || "—"}`);
  p();
  const topFmt = gm.marketPatterns.topFormats[0]?.label;
  const topHook = gm.marketPatterns.hookDistribution[0]?.label;
  if (topFmt && topHook) p(`**The takeaway:** in your category, ${topFmt}-first content opening with a ${topHook} hook is the proven pattern. Make that your default and you're already aligned with what the algorithm and your audience reward.`);
  p();
  // Local & adjacent opportunities (only when there's real signal).
  const ls = gm.localSignal;
  const hasLocal = ls.spotlightedAccounts.length || ls.localWording.length || ls.complementaryTerms.length || ls.successStories.length;
  if (hasLocal) {
    p("### Local & adjacent opportunities");
    p();
    p("Discovery in a local market is a different game from going viral. These are the levers that put you in front of the *right* nearby people:");
    p();
    if (ls.successStories.length) {
      p("**Local accounts doing well (study these closely):**");
      for (const s of ls.successStories) p(`- @${s.handle} (${num(s.followers)} followers) — ${s.whatTheyDoWell}`);
      p();
    }
    if (ls.spotlightedAccounts.length) p(`- **Accounts local businesses tag/spotlight:** ${ls.spotlightedAccounts.map((h) => `@${h}`).join(", ")} — engaging and being tagged by these builds local reach.`);
    if (ls.localWording.length) p(`- **Language that resonates locally:** ${ls.localWording.slice(0, 12).join(", ")} — weave these naturally into captions.`);
    if (ls.complementaryTerms.length) p(`- **Adjacent industries reaching the same audience:** ${ls.complementaryTerms.slice(0, 8).join(", ")} — borrow their formats and collaborate, don't compete.`);
    p();
  }
  p("---");

  // ── PART 3 — YOUR 30-DAY PLAN ──
  p("## Part 3 — Your 30-Day Plan");
  p();
  p(`Everything above points here. The logic is simple: ${weakest ? `fix **${weakest.dimension.toLowerCase()}** first, ` : ""}build a cadence you can keep, and turn attention into action with a clear next step. Five moves, a day-by-day first week, a four-week sprint, and exactly how we'll know it worked.`);
  p();
  p("### The five moves that matter most");
  p();
  p("Do them in order — each is sequenced to make the next one land harder.");
  p();
  gm.fixes.forEach((f, i) => {
    p(`#### ${i + 1}. ${f.title}`);
    p(`*${f.impact} impact · ${f.effort} effort · ~${f.timeRequired} · expected: ${f.expectedLift}*`);
    p();
    p(`**Why this matters:** ${f.whyItMatters}`);
    p();
    p(`**Do this:** ${f.exactAction}`);
    p();
  });
  p("### Your first seven days");
  p();
  p("Small daily blocks — 15–30 minutes — that stack into a finished foundation by day 7.");
  p();
  for (const d of gm.nextSevenDays) {
    p(`**Day ${d.day} — ${d.objective}** *(${d.timeEstimate})*`);
    p(`- ${d.exactInstruction}`);
    p(`- _Done when:_ ${d.outputByEndOfDay}`);
    p();
  }
  p("### The 30-day sprint");
  p();
  p("Zoom out: here's how the month builds, week by week, from foundation to measurable momentum.");
  p();
  for (const w of gm.sprint) {
    p(`**Week ${w.week} — ${w.goal}**`);
    for (const a of w.actions) p(`- ${a}`);
    p(`- _Output:_ ${w.output} · _Measure:_ ${w.measure}`);
    p();
  }
  p("### How we'll measure success");
  p();
  p("Vanity metrics lie. These are the checkpoints that actually tell you whether the system is working:");
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
  p("The point of a plan is that you never stare at a blank screen. These are copy-paste building blocks tuned to your category and market — fill in the brackets and post.");
  p();
  if (gm.toolkit.hookFormulas.length) {
    p("### Hook formulas");
    p("*The first line decides whether anyone reads the rest. Start here.*");
    p();
    for (const h of gm.toolkit.hookFormulas) p(`- ${h}`);
    p();
  }
  if (gm.toolkit.captionFormulas.length) {
    p("### Caption formulas");
    for (const c of gm.toolkit.captionFormulas) { p(c); p(); }
  }
  if (gm.hashtags.length) {
    p("### Hashtag sets");
    p("*Rotate these — a tight, intentional set beats 30 generic tags.*");
    p();
    for (const g of gm.hashtags) p(`- **${g.group}:** ${g.tags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")}`);
    p();
  }
  if (gm.aiPrompts.length) {
    p("### Copy-ready AI prompts");
    p("*Paste these into your AI tool of choice to draft fast — then edit into your voice.*");
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

  // ── WHAT THIS UNLOCKS (closing) ──
  p("## What This Unlocks");
  p();
  p(`Thirty days of this isn't about a magic spike — it's about compounding. ${weakest ? `Close the ${weakest.dimension.toLowerCase()} gap, ` : ""}hold the cadence, and ship one signature format consistently, and three things change at once: Instagram starts showing you to the right local people, visitors who land on your profile understand the offer in seconds, and the ones who are ready get an obvious next step.`);
  p();
  p(`That's the system. It keeps paying off after the 30 days, because every post now reinforces a clear position instead of starting from scratch.`);
  p();
  p(`**Then we measure.** Re-run this analysis on **${m.reviewDate}** to see exactly what moved — and to set the next month's focus from fresh data. Growth on Instagram isn't one big leap; it's a monthly loop of *act → measure → adjust*. This is loop one.`);
  p();
  p("---");

  // ── APPENDIX — METHODOLOGY ──
  p("## Appendix — How this was built");
  p();
  p(`This plan was generated from a live analysis of @${m.handle}, ${num(gm.marketPatterns.postsStudied)} posts across the ${category} category, and ${gm.competitors.length} vetted, English-language competitor accounts discovered and scored for relevance and engagement success.`);
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
