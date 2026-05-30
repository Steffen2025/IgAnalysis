/**
 * Gold Master Markdown renderer.
 *
 * Deterministically renders a GoldMasterIntelligence object into the canonical
 * 22-section workbook markdown. This is the source of truth a later renderer
 * (PDF/HTML/slides) consumes — so it must be complete and self-explanatory.
 */

import type {
  GoldMasterIntelligence,
  ScoreDiagnosis,
  ActionMove,
  DayAction,
  WeekPlan,
  CompetitorCard,
  CompetitorDecision,
  HashtagGroup,
} from "./goldMasterSchema.js";

function h(level: number, text: string): string {
  return `${"#".repeat(level)} ${text}`;
}

function kv(label: string, value: string | number | null | undefined): string {
  return `- **${label}:** ${value ?? "—"}`;
}

function bullets(items: string[]): string {
  return items.length ? items.map((i) => `- ${i}`).join("\n") : "_None._";
}

function table(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
}

function scoreBlock(s: ScoreDiagnosis): string {
  return `**${s.dimension} — ${s.score}/100**
- _What we saw:_ ${s.whatWeSaw}
- _Why it matters:_ ${s.whyItMatters}
- _Next move:_ ${s.nextMove}`;
}

function moveBlock(m: ActionMove, i: number): string {
  return `### ${i + 1}. ${m.title}
- **Impact / Effort:** ${m.impact} impact · ${m.effort} effort
- **Score area:** ${m.scoreArea}
- **Why it matters:** ${m.whyItMatters}
- **Exact action:** ${m.exactAction}
- **Time required:** ${m.timeRequired}
- **Expected lift:** ${m.expectedLift}
- **Evidence:** ${m.evidence}`;
}

function dayBlock(d: DayAction): string {
  return `**Day ${d.day} — ${d.objective}** (${d.timeEstimate})
- _Action:_ ${d.action}
- _Exact instruction:_ ${d.exactInstruction}
- _Output by end of day:_ ${d.outputByEndOfDay}
- _Why:_ ${d.whyItMatters}`;
}

function weekBlock(w: WeekPlan): string {
  return `**Week ${w.week} — ${w.goal}**
${bullets(w.actions)}
- _Output:_ ${w.output}
- _Measure:_ ${w.measure}`;
}

function competitorCardBlock(c: CompetitorCard): string {
  return `**@${c.handle} — ${c.displayName}** (${c.type})
- Followers: ${c.followers ?? "—"} · Posts: ${c.posts ?? "—"}
- Profile image: ${c.profileImageAvailable ? "yes" : "no"} · Latest post: ${c.latestPostAvailable ? "yes" : "no"}
- Last posted: ${c.latestPostDate ?? "—"} (${c.activityStatus}) · Type: ${c.latestPostType ?? "—"}
- Latest hook: ${c.latestPostHook ? `“${c.latestPostHook}”` : "—"}
- Why selected: ${c.whySelected}
- Borrow: ${c.borrow}
- Avoid: ${c.avoid}`;
}

function decisionRow(d: CompetitorDecision): string[] {
  return [`@${d.handle}`, d.track, d.code, String(d.categoryMatchScore), String(d.contentMatchScore), String(d.embeddingScore ?? "—"), String(d.followerBandFit), String(d.successScore), String(d.confidenceScore), d.reason];
}
const DECISION_HEADERS = ["Handle", "Track", "Code", "Cat", "Content", "Semantic", "Band", "Success", "Conf", "Reason"];

function hashtagGroupBlock(g: HashtagGroup): string {
  const tags = g.tags.map((t) => `#${t.replace(/^#/, "")}`).join(" ");
  return `- **${g.group}:** ${tags || "—"}`;
}

export function renderGoldMasterMarkdown(gm: GoldMasterIntelligence): string {
  const m = gm.meta;
  const parts: string[] = [];

  parts.push(h(1, "30-Day Instagram Intelligence Workbook"));

  // 0. Metadata
  parts.push(h(2, "0. Report Metadata"));
  parts.push([
    kv("Audit ID", m.auditId),
    kv("Account", m.account),
    kv("Handle", `@${m.handle}`),
    kv("Website", m.website),
    kv("Raw category", m.rawCategory),
    kv("Normalized category", m.normalizedCategory),
    kv("Category kind", m.categoryKind),
    kv("Market / location", m.marketLabel),
    kv("Generated", m.generatedAt),
    kv("Review date", m.reviewDate),
    kv("Model used", m.modelUsed),
    kv("Prompt version", m.promptVersion),
    kv("Data confidence", `${m.dataConfidence}/100`),
  ].join("\n"));

  // 1. Executive snapshot
  const weakest = [...gm.scores].sort((a, b) => a.score - b.score)[0];
  const strongest = [...gm.scores].sort((a, b) => b.score - a.score)[0];
  parts.push(h(2, "1. Executive Snapshot"));
  parts.push([
    kv("Baseline score", `${gm.account.postsPerWeek != null ? "" : ""}${strongest ? "" : ""}` + (gm.scores.find((s) => s.dimension === "Overall")?.score ?? "—")),
    kv("Followers", gm.account.followerCount),
    kv("Posts", gm.account.postCount),
    kv("Posts / week", gm.account.postsPerWeek?.toFixed(1)),
    kv("Weakest score", weakest ? `${weakest.dimension} (${weakest.score})` : "—"),
    kv("Strongest score", strongest ? `${strongest.dimension} (${strongest.score})` : "—"),
    kv("Current opportunity", gm.fixes[0]?.title ?? "—"),
    kv("Immediate action", gm.fixes[0]?.exactAction ?? gm.quickActions[0]?.action ?? "—"),
  ].join("\n"));

  // 2. Account profile snapshot
  const a = gm.account;
  parts.push(h(2, "2. Account Profile Snapshot"));
  parts.push([
    kv("Display name", a.displayName),
    kv("Handle", `@${a.handle}`),
    kv("Bio", a.bio),
    kv("Raw category", a.rawCategory),
    kv("Normalized business type", a.normalizedBusinessType),
    kv("Website / link", a.website),
    kv("Follower count", a.followerCount),
    kv("Post count", a.postCount),
    kv("CTA status", a.ctaStatus),
    kv("Local / category signal status", a.localSignalStatus),
  ].join("\n"));
  parts.push(`**Profile gaps:**\n${bullets(a.profileGaps)}`);

  // 3. Category diagnosis
  const c = gm.category;
  parts.push(h(2, "3. Category Diagnosis"));
  parts.push([
    kv("Normalized category", c.normalizedCategory),
    kv("Kind", c.categoryKind),
    kv("Confidence", `${c.confidence}/100 (source: ${c.source})`),
    kv("What this account sells", c.whatItSells),
    kv("Likely audience", c.likelyAudience),
    kv("Content that should work", c.contentThatWorks),
    kv("CTA type", c.ctaType),
  ].join("\n"));
  parts.push(`**Recommended CTAs:** ${c.ctaOptions.join(" · ")}`);

  // 4. Score breakdown
  parts.push(h(2, "4. Score Breakdown"));
  parts.push(gm.scores.map(scoreBlock).join("\n\n"));

  // 5. Required fixes
  parts.push(h(2, "5. Required Fixes — Five Moves That Matter Most"));
  parts.push(gm.fixes.length ? gm.fixes.map(moveBlock).join("\n\n") : "_No fixes generated — BLOCKING ERROR._");

  // 6. Next seven days
  parts.push(h(2, "6. Next Seven Days"));
  parts.push(gm.nextSevenDays.length ? gm.nextSevenDays.map(dayBlock).join("\n\n") : "_No daily plan generated — BLOCKING ERROR._");

  // 7. Sprint
  parts.push(h(2, "7. 30-Day Sprint"));
  parts.push(gm.sprint.map(weekBlock).join("\n\n"));

  // 8. Market comparison
  parts.push(h(2, "8. Market Comparison"));
  parts.push(table(["Metric", "You", "Market avg"], gm.marketComparison.rows.map((r) => [r.metric, r.client, r.market])));
  parts.push(`**Activity level:** ${gm.marketComparison.activityLevel}\n\n**Interpretation:** ${gm.marketComparison.interpretation}`);

  // 9. Market pattern dashboard
  const mp = gm.marketPatterns;
  parts.push(h(2, "9. Market Pattern Dashboard"));
  parts.push([
    kv("Posts studied", mp.postsStudied),
    kv("Average caption", `${mp.avgCaptionChars} chars`),
    kv("Average hashtags", mp.avgHashtags),
    kv("Average emojis", mp.avgEmojis),
  ].join("\n"));
  parts.push(`**Top formats:** ${mp.topFormats.map((d) => `${d.label} ${d.pct}%`).join(" · ") || "—"}`);
  parts.push(`**Hook types:** ${mp.hookDistribution.map((d) => `${d.label} ${d.pct}%`).join(" · ") || "—"}`);
  parts.push(`**Content elements:** ${mp.contentElementDistribution.map((d) => `${d.label} ${d.pct}%`).join(" · ") || "—"}`);

  // 10. Competitor discovery debug
  const cd = gm.competitorDebug;
  parts.push(h(2, "10. Competitor Discovery Debug"));
  parts.push(`**Search terms used:** ${cd.searchTermsUsed.join(", ") || "—"}`);
  parts.push(`**Candidates found:** ${cd.candidatesFound} · **Selected:** ${cd.selected.length} · **Rejected:** ${cd.rejected.length}`);
  if (cd.selected.length) {
    parts.push("**Selected:**\n" + table(DECISION_HEADERS, cd.selected.map(decisionRow)));
  }
  if (cd.rejected.length) {
    parts.push("**Rejected:**\n" + table(DECISION_HEADERS, cd.rejected.map(decisionRow)));
  }
  if (cd.emptyReason && cd.emptyReason !== "none") {
    parts.push(`**No relevant competitors selected.** Classified as a **${cd.emptyReason.replace(/_/g, " ")}**. Recommended next search terms: ${cd.recommendedSearchTerms.join(", ")}.`);
  }

  // 11. Competitor relevance board
  parts.push(h(2, "11. Competitor Relevance Board"));
  if (gm.competitors.length) {
    parts.push(gm.competitors.map(competitorCardBlock).join("\n\n"));
  } else {
    parts.push(`No competitors qualified for the client-facing board. This is a **${cd.emptyReason?.replace(/_/g, " ") ?? "relevance"}** issue.
- Why none qualified: every candidate failed the category-relevance gate (see section 10).
- Search terms to try next: ${cd.recommendedSearchTerms.join(", ")}.
- Data needed: profiles + recent posts for accounts matching the category terms above.`);
  }

  // 12. Observed competitor posts
  parts.push(h(2, "12. Observed Competitor Posts"));
  if (gm.observedPosts.length) {
    parts.push(gm.observedPosts.map((p) => `**@${p.account} · ${p.postType}${p.date ? ` · ${p.date}` : ""}**
- Hook: “${p.hook}”
- Why it works: ${p.whyItWorks}
- How to adapt: ${p.howToAdapt}`).join("\n\n"));
  } else {
    parts.push("_No observed competitor posts available — competitor post-level scrape data is missing for the selected accounts._");
  }

  // 13. Content mechanics
  parts.push(h(2, "13. Content Mechanics To Borrow Ethically"));
  parts.push(gm.contentMechanics.length
    ? gm.contentMechanics.map((cm) => `**${cm.pattern}**
- Why it works: ${cm.whyItWorks}
- How to adapt: ${cm.howToAdapt}
- Example post idea: ${cm.examplePostIdea}
- What not to copy: ${cm.whatNotToCopy}`).join("\n\n")
    : "_Pattern data insufficient to derive mechanics._");

  // 14. Visibility strategy
  parts.push(h(2, "14. Local / Category Visibility Strategy"));
  parts.push(gm.visibilityStrategy.map((v) => `- **${v.surface}:** ${v.recommendation}`).join("\n"));
  const ls = gm.localSignal;
  parts.push(`### Local intelligence\n\n${ls.note}`);
  if (ls.successStories.length) {
    parts.push("**Local success stories (5k–50k, doing well):**\n" + ls.successStories.map((s) => `- **@${s.handle}** — ${s.followers ?? "?"} followers · success ${s.successScore}/100 · ${s.whatTheyDoWell}`).join("\n"));
  } else {
    parts.push("_No local accounts in the 5k–50k success band were found — see complementary industries below._");
  }
  if (ls.spotlightedAccounts.length) parts.push(`**Accounts local businesses spotlight/tag:** ${ls.spotlightedAccounts.map((h2) => `@${h2}`).join(", ")}`);
  if (ls.localWording.length) parts.push(`**Local wording in use:** ${ls.localWording.join(", ")}`);
  if (ls.complementaryTerms.length) parts.push(`**Complementary industries to study (same audience, thin direct niche):** ${ls.complementaryTerms.join(", ")}`);

  // 15. Hashtag strategy
  parts.push(h(2, "15. Hashtag Strategy"));
  parts.push(gm.hashtags.map(hashtagGroupBlock).join("\n"));

  // 16. Posting toolkit
  const t = gm.toolkit;
  parts.push(h(2, "16. Posting Toolkit"));
  parts.push(`**Hook formulas:**\n${bullets(t.hookFormulas)}`);
  parts.push(`**Caption formulas:**\n${bullets(t.captionFormulas)}`);
  parts.push(`**CTA options:**\n${bullets(t.ctaOptions)}`);
  parts.push(`**Reel ideas:**\n${bullets(t.reelIdeas)}`);
  parts.push(`**Carousel ideas:**\n${bullets(t.carouselIdeas)}`);
  parts.push(`**Proof ideas:**\n${bullets(t.proofIdeas)}`);

  // 17. Copy-ready AI prompts
  parts.push(h(2, "17. Copy-Ready AI Prompts"));
  parts.push(gm.aiPrompts.map((p) => `**${p.label}**\n\n\`\`\`\n${p.prompt}\n\`\`\``).join("\n\n"));

  // 18. Immediate content
  const ic = gm.immediateContent;
  parts.push(h(2, "18. Content You Can Create Immediately"));
  parts.push(`**10 hooks:**\n${bullets(ic.hooks)}`);
  parts.push(`**Caption topics:**\n${bullets(ic.captionTopics)}`);
  parts.push(`**Carousel ideas:**\n${bullets(ic.carouselIdeas)}`);
  parts.push(`**Reel ideas:**\n${bullets(ic.reelIdeas)}`);
  parts.push(`**Story ideas:**\n${bullets(ic.storyIdeas)}`);

  // 19. Quick actions
  parts.push(h(2, "19. 10 Quick Actions"));
  parts.push(gm.quickActions.map((q) => `- _[${q.when.replace(/_/g, " ")}]_ ${q.action}`).join("\n"));

  // 20. Measurement plan
  parts.push(h(2, "20. Measurement Plan"));
  parts.push(gm.measurement.map((c2) => `**Day ${c2.dayMark}**
- Measure: ${c2.measure}
- Good sign: ${c2.goodSign}
- Adjust if: ${c2.adjustIf}`).join("\n\n"));

  // 21. Day 30 review
  parts.push(h(2, "21. Day 30 Review"));
  parts.push(`**Bring back:**\n${bullets(gm.day30.bringBack)}`);
  parts.push(`**What we compare:**\n${bullets(gm.day30.whatWeCompare)}`);
  parts.push(`**Why monthly matters:** ${gm.day30.whyMonthlyMatters}`);
  parts.push(`**Next run:** ${gm.day30.nextRunCta}`);

  // 22. Data gaps & confidence
  parts.push(h(2, "22. Data Gaps and Confidence"));
  parts.push(gm.dataGaps.length
    ? gm.dataGaps.map((g) => `- **[${g.severity}] ${g.area}:** ${g.detail} → _${g.recommendedFix}_`).join("\n")
    : "_No significant data gaps detected._");
  parts.push(`**Overall confidence:** ${gm.overallConfidence}/100`);

  // 23. Source evidence index
  parts.push(h(2, "23. Source Evidence Index"));
  parts.push(gm.evidence.length
    ? table(["ID", "Source", "Label", "Value", "Conf"], gm.evidence.map((e) => [e.id, e.sourceType, e.label, String(e.value), String(e.confidence)]))
    : "_No evidence captured._");

  // 24. Validation summary
  parts.push(h(2, "24. Validation Summary"));
  parts.push([
    kv("Result", gm.validation.passed ? "PASSED" : "FAILED"),
    kv("Blocking", gm.validation.blockingCount),
    kv("Warnings", gm.validation.warningCount),
    kv("Overall confidence", `${gm.overallConfidence}/100`),
  ].join("\n"));
  if (gm.sectionConfidence.length) {
    parts.push("**Section confidence:**\n" + table(["Section", "Score", "Level", "Gaps"], gm.sectionConfidence.map((s) => [s.sectionId, String(s.score), s.level, s.dataGaps.join("; ") || "—"])));
  }
  if (gm.validation.issues.length) {
    parts.push("**Issues:**\n" + gm.validation.issues.map((i) => `- ${i.severity === "blocking" ? "🛑" : "⚠️"} [${i.rule}] ${i.detail}`).join("\n"));
  }

  return parts.join("\n\n");
}
