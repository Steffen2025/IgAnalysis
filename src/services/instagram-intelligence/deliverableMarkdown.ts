/**
 * Client-facing deliverable — "Instagram Growth Intelligence Report".
 *
 * A premium 20-section field guide (not an audit dump). Built from the same
 * GoldMasterIntelligence object, arranged so a business owner walks away
 * thinking "I understand my Instagram, I know what to fix, what to post, and
 * what to track." Every number is taught: what it means, good or bad, why it
 * matters, what to do, how to know it improved. See docs/report-blueprint.md.
 *
 * Voice: practical, direct, human, encouraging. No hype, minimal emojis.
 * All strategy is synthesised deterministically — no invented numbers.
 */

import type {
  GoldMasterIntelligence,
  ScoreDiagnosis,
  CompetitorCard,
  MetricComparison,
} from "./goldMasterSchema.js";

function num(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString("en-US");
}
function leadNum(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
function findRow(rows: MetricComparison[], re: RegExp): MetricComparison | undefined {
  return rows.find((r) => re.test(r.metric));
}
function bar(score: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(score / 10)));
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)} ${score}/100`;
}
function scoreLabel(s: number): string {
  if (s >= 80) return "Strong asset";
  if (s >= 60) return "Usable — needs refinement";
  if (s >= 40) return "Underperforming";
  return "Fix first";
}
function verdict(score: number): string {
  if (score >= 80) return "Strong. The work now is sharpening the edges, not fixing fundamentals.";
  if (score >= 60) return "Solid foundation. A focused month of consistency moves you into competitive territory.";
  if (score >= 40) return "Your account is not broken — it is under-signalled. Most of the upside is still on the table.";
  return "Early days. The fundamentals need attention, which means the gains from this plan are large.";
}
function dims(scores: ScoreDiagnosis[]) {
  const overall = scores.find((s) => /overall/i.test(s.dimension)) ?? null;
  const rest = scores.filter((s) => s !== overall);
  return { overall, rest };
}
function find(scores: ScoreDiagnosis[], re: RegExp): ScoreDiagnosis | undefined {
  return scores.find((s) => re.test(s.dimension));
}

export function renderDeliverable(gm: GoldMasterIntelligence): string {
  const m = gm.meta;
  const cat = m.normalizedCategory;
  const market = m.marketLabel || m.city || "your market";
  const city = m.city || market;
  const { overall, rest } = dims(gm.scores);
  const overallScore = overall?.score ?? gm.scores[0]?.score ?? 0;
  const weakest = [...rest].sort((a, b) => a.score - b.score)[0];
  const strongest = [...rest].sort((a, b) => b.score - a.score)[0];
  const topFix = gm.fixes[0];
  const cta = gm.category.ctaOptions[0] ?? "book";
  const out: string[] = [];
  const p = (s = "") => out.push(s);

  // ── COVER ──
  p(`# Instagram Growth Intelligence Report`);
  p();
  p(`### A 30-Day Action Plan to Improve Visibility, Trust, Content, and Local Lead Flow`);
  p();
  p(`**${m.account}** · @${m.handle} · ${cat} · ${market}`);
  p(`Power level today: **${overallScore}/100** · ${num(gm.account.followerCount)} followers · ${num(gm.account.postCount)} posts`);
  p(`Prepared by BotLogix · ${new Date(m.generatedAt).toISOString().slice(0, 10)}`);
  p();
  p("> **Your next 30 days are mapped inside.** You do not need to become an Instagram expert — you need to know which moves matter, why they matter, and what to do this week.");
  p();
  p("---");

  // ── 1. HOW TO USE THIS GUIDE ──
  p("## How to Use This Guide");
  p();
  p("This is a field guide, not a one-time report. Keep it open beside you while you work.");
  p();
  p("**The three steps, in order:**");
  p("1. **Fix the profile first** — it's the front door; everything else sends people to it.");
  p("2. **Publish the next 7 days** — momentum beats perfection.");
  p("3. **Repeat what earns saves, replies, comments, and profile visits** — let the data pick your winners.");
  p();
  p("> **Do not try to do everything.** Start with the highest-leverage moves. This guide ranks every recommendation by **impact, difficulty, speed, and business value** so you always know what to touch next.");
  p();
  p("---");

  // ── 2. THE SHORT VERSION ──
  p("## The Short Version");
  p();
  p(`**${verdict(overallScore)}**`);
  p();
  p("| | |");
  p("| --- | --- |");
  p(`| **Biggest opportunity** | ${topFix?.title ?? "Local discovery"} |`);
  p(`| **Biggest weakness** | ${weakest ? `${weakest.dimension} (${weakest.score}/100) — ${weakest.whatWeSaw}` : "—"} |`);
  p(`| **Fastest win** | ${gm.fixes.find((f) => f.effort === "low")?.title ?? topFix?.title ?? "Tighten bio, location tags, local hashtags"} |`);
  p(`| **30-day target** | More findable, a clearer profile, more useful content, and an obvious next step for buyers |`);
  p();
  p("This is the whole plan in one glance. The rest of the guide proves it and shows you exactly how.");
  p();
  p("---");

  // ── 3. WHERE YOU STAND TODAY (scoreboard) ──
  p("## Where You Stand Today");
  p();
  p("Your full diagnostic picture. These are decision tools, not vanity numbers — each one tells you whether to leave it alone or fix it now.");
  p();
  p("| Band | Meaning |");
  p("| --- | --- |");
  p("| 80–100 | Strong asset — protect it |");
  p("| 60–79 | Usable — needs refinement |");
  p("| 40–59 | Underperforming — improve soon |");
  p("| 0–39 | Fix first — biggest leverage |");
  p();
  if (overall) p(`**Overall** \`${bar(overall.score)}\` — *${scoreLabel(overall.score)}*`);
  p();
  for (const s of rest) {
    p(`**${s.dimension}** \`${bar(s.score)}\` — *${scoreLabel(s.score)}*`);
    p(`- _What it means:_ ${s.whatWeSaw}`);
    p(`- _Why it matters:_ ${s.whyItMatters}`);
    p(`- _Changes it fastest:_ ${s.nextMove}`);
    p();
  }
  p("---");

  // ── 4. WHAT THE NUMBERS MEAN ──
  p("## What the Numbers Mean");
  p();
  p("A quick lesson in reading your own account. Five indicators decide whether Instagram shows you — and whether buyers act.");
  p();
  const indicators: Array<{ d?: ScoreDiagnosis; igCares: string; buyersCare: string }> = [
    { d: find(gm.scores, /local/i), igCares: "Instagram needs clear category + location signals to know who to show you to.", buyersCare: "Buyers search and browse locally — if you're invisible there, you're invisible to them." },
    { d: find(gm.scores, /profile|conversion/i), igCares: "A clear profile keeps people on your page, which tells Instagram you're worth surfacing.", buyersCare: "A visitor decides in seconds whether to follow or leave." },
    { d: find(gm.scores, /content/i), igCares: "Saves and shares drive reach far more than likes.", buyersCare: "Useful content is what earns the follow and the eventual enquiry." },
    { d: find(gm.scores, /sales|readiness/i), igCares: "Profiles with an obvious next step convert attention the algorithm sends you.", buyersCare: "Attention is wasted without an obvious way to take the next step." },
    { d: find(gm.scores, /competitor/i), igCares: "Active, differentiated accounts get rewarded over copycats.", buyersCare: "You're judged against the accounts buyers already follow." },
  ];
  for (const i of indicators) {
    if (!i.d) continue;
    p(`### ${i.d.dimension} — ${i.d.score}/100 (${scoreLabel(i.d.score)})`);
    p(`- **What we measured:** ${i.d.whatWeSaw}`);
    p(`- **What your number means:** ${i.d.score >= 60 ? "A working asset you can build on." : i.d.score >= 40 ? "Underperforming — real upside if you act." : "The biggest constraint on your growth right now."}`);
    p(`- **Why Instagram cares:** ${i.igCares}`);
    p(`- **Why buyers care:** ${i.buyersCare}`);
    p(`- **What to do next:** ${i.d.nextMove}`);
    p();
  }
  p("---");

  // ── 5. THE GROWTH DIAGNOSIS ──
  p("## The Growth Diagnosis");
  p();
  p("**You do not have one Instagram problem. You have a sequence problem.** People have to move through five stages — and you're only as strong as your weakest one.");
  p();
  const funnel: Array<{ stage: string; q: string; d?: ScoreDiagnosis }> = [
    { stage: "1. Get found", q: "Can the right local people discover you?", d: find(gm.scores, /local/i) },
    { stage: "2. Make sense fast", q: "Does your profile explain who you help in seconds?", d: find(gm.scores, /profile|conversion/i) },
    { stage: "3. Be worth following", q: "Is your content useful enough to save and follow?", d: find(gm.scores, /content/i) },
    { stage: "4. Stand out", q: "Do you look different from every other account in your space?", d: find(gm.scores, /competitor/i) },
    { stage: "5. Drive action", q: "Is there an obvious next step for someone ready to buy?", d: find(gm.scores, /sales|readiness/i) },
  ];
  p("| Stage | The question | Your score | Status |");
  p("| --- | --- | --- | --- |");
  for (const f of funnel) {
    const sc = f.d?.score;
    p(`| ${f.stage} | ${f.q} | ${sc == null ? "—" : `${sc}/100`} | ${sc == null ? "—" : scoreLabel(sc)} |`);
  }
  p();
  if (weakest) p(`**The break in your chain is "${funnel.find((f) => f.d === weakest)?.stage.replace(/^\d+\.\s*/, "") ?? weakest.dimension}".** Traffic leaks out there first, so that's where this plan starts. Fix the earliest weak stage and every stage after it gets easier.`);
  p();
  p("---");

  // ── 6. WHAT YOUR COMPETITORS ARE TEACHING US (board) ──
  p("## What Your Competitors Are Teaching Us");
  p();
  p(`We studied **${num(gm.marketPatterns.postsStudied)} real posts** and pulled the accounts already winning in your space. The point isn't to copy them — it's to see what the market is already rewarding.`);
  p();
  if (gm.competitors.length) {
    p("| Account | Type | Followers | Format | Best thing to learn |");
    p("| --- | --- | --- | --- | --- |");
    for (const c of gm.competitors) {
      const label = c.whySelected.startsWith("Adjacent industry") ? "Adjacent" : c.type === "reference" ? "Reference" : "Local";
      const learn = c.borrow.replace(/\s*—.*$/, "").replace(/\.$/, "");
      p(`| @${c.handle} | ${label} | ${num(c.followers)} | ${c.latestPostType ?? "—"} | ${learn} |`);
    }
    p();
    p("> **Do not copy their creative or captions word-for-word.** Borrow the *structure* — the format, the hook style, the cadence — and rebuild it in your own voice.");
  } else {
    p("_No competitor accounts cleared the relevance bar for this niche — see the Market patterns below for the category-level read._");
  }
  p();
  p("---");

  // ── 7. COMPETITOR LESSONS ──
  p("## Five Lessons From the Market");
  p();
  p("Translating the data into moves you can make this week.");
  p();
  const topFmt = gm.marketPatterns.topFormats[0]?.label ?? "reel";
  const topHook = gm.marketPatterns.hookDistribution[0]?.label ?? "description";
  const topEl = gm.marketPatterns.contentElementDistribution[0]?.label ?? "customer focus";
  const lessons = [
    { l: `The market leads with **${topFmt}** content`, why: `${topFmt} earns the most reach in your category right now.`, adapt: `Make ${topFmt} your default format — at least one per week.`, post: `A ${topFmt} walking through one common question your buyers ask.` },
    { l: `Winning posts open with a **${topHook}** hook`, why: `${topHook} openers stop the scroll and set up the payoff.`, adapt: `Write your first line as a ${topHook}, then deliver one concrete takeaway.`, post: `"${topHook === "question" ? `The one question every ${city} buyer should ask before choosing a ${cat.toLowerCase()}` : `Here's what most ${city} buyers get wrong about ${cat.toLowerCase()}`}"` },
    { l: `Top accounts emphasize **${topEl}**`, why: `Content that centres the customer (not the brand) gets saved and shared.`, adapt: `Frame posts around the buyer's problem, not your services.`, post: `A before/after or a "mistake I keep seeing" post about your customers' situation.` },
    { l: `Consistency beats intensity`, why: `The accounts ahead of you simply post on a steady rhythm.`, adapt: `Pick a cadence you can keep for 30 days and hold it.`, post: `Batch three posts this weekend so next week is already done.` },
    { l: `Every post points somewhere`, why: `Reach without a next step doesn't convert.`, adapt: `End every caption with one clear action: "${cta}".`, post: `A post whose only job is to get the reader to ${cta.toLowerCase()}.` },
  ];
  lessons.forEach((x, i) => {
    p(`**${i + 1}. ${x.l}**`);
    p(`- _Why it works:_ ${x.why}`);
    p(`- _How to adapt it:_ ${x.adapt}`);
    p(`- _First post idea:_ ${x.post}`);
    p();
  });
  p("---");

  // ── 8. WHAT THE MARKET IS REWARDING (pattern snapshot) ──
  p("## What the Market Is Rewarding");
  p();
  p(`How you stack up against ${num(gm.marketPatterns.postsStudied)} posts in your category — with the action for each gap.`);
  p();
  p("| Metric | You | Market | What to do |");
  p("| --- | --- | --- | --- |");
  const advice = (metric: string, c: number | null, mk: number | null): string => {
    if (c == null || mk == null) return "Match the market's working pattern.";
    if (/week/i.test(metric)) return c < mk ? "Raise cadence to a rhythm you can keep." : "Hold your rhythm; focus on quality.";
    if (/caption/i.test(metric)) return c > mk * 1.3 ? "Tighten the first line; move detail lower." : "Keep captions useful and scannable.";
    if (/hashtag/i.test(metric)) return c > mk * 1.4 ? "Fewer, more intentional tags (local + intent + authority)." : "Keep a tight, intentional set.";
    return "Match the market's working pattern.";
  };
  for (const r of gm.marketComparison.rows) {
    p(`| ${r.metric} | ${r.client} | ${r.market} | ${advice(r.metric, leadNum(r.client), leadNum(r.market))} |`);
  }
  p();
  p(`**Read:** ${gm.marketComparison.interpretation}`);
  p();
  p(`**Proven pattern in your category:** ${topFmt}-first content, opening with a ${topHook} hook, centred on ${topEl}. Make that your default and you're aligned with what already works.`);
  p();
  p("---");

  // ── 9. CONTENT PATTERN RECIPES ──
  p("## Content Pattern Recipes");
  p();
  p("Four formulas to keep beside you when you post. Fill in the brackets and publish.");
  p();
  const recipes = [
    { name: "Educational proof post", when: "When you want to build authority.", open: `"Here's what I'd check first if you're choosing a ${cat.toLowerCase()} in ${city}."`, structure: "Hook → 3 quick points → one concrete takeaway → CTA.", idea: `A short teach on the #1 thing buyers overlook.` },
    { name: "Local FAQ post", when: "When you want local discovery.", open: `"${city} buyers ask me this all the time…"`, structure: "Question → plain-English answer → local proof → CTA.", idea: `Answer the single most common question you get, tagged to ${city}.` },
    { name: "Customer objection post", when: "When you want replies and DMs.", open: `"‘It's too expensive / too early / not for me’ — let's talk about that."`, structure: "Objection → why it's understandable → the reframe → CTA.", idea: `Turn your most common objection into a first-line hook.` },
    { name: "Proof / case-study post", when: "When you want trust.", open: `"Here's what changed for a ${city} client in 30 days."`, structure: "Before → what you did → result → CTA.", idea: `One real result (anonymised if needed) told as a mini story.` },
  ];
  for (const r of recipes) {
    p(`### ${r.name}`);
    p(`- **When to use it:** ${r.when}`);
    p(`- **Opening line:** ${r.open}`);
    p(`- **Structure:** ${r.structure}`);
    p(`- **CTA:** ${cta}`);
    p(`- **Example idea:** ${r.idea}`);
    p();
  }
  p("---");

  // ── 10. THE LOCAL VISIBILITY PLAN ──
  p("## The Local Visibility Plan");
  p();
  p(`> **Local growth is not one trick. It is repeated context.** ${city} should appear naturally everywhere a buyer or the algorithm looks.`);
  p();
  p("**Profile signals**");
  p(`- Put "${cat}" + ${city} in your name field and the first line of your bio.`);
  p(`- Make your link point to the single highest-value next step.`);
  p("**Post signals**");
  p(`- Add a ${city} location tag to every post.`);
  p(`- Drop one natural local line in each caption ("Serving ${city} & nearby").`);
  p("**Search signals**");
  if (gm.hashtags.find((h) => h.group === "local")) p(`- Lead with your local hashtag set: ${gm.hashtags.find((h) => h.group === "local")!.tags.slice(0, 6).map((t) => `#${t.replace(/^#/, "")}`).join(" ")}`);
  else p(`- Build a local hashtag set (city + region + neighbourhood) and use it every post.`);
  p("**Community signals**");
  if (gm.localSignal.spotlightedAccounts.length) p(`- Engage with the accounts local businesses tag: ${gm.localSignal.spotlightedAccounts.slice(0, 6).map((h) => `@${h}`).join(", ")}.`);
  else p(`- Comment on 5 local accounts a day; get tagged in local conversations.`);
  p("**Proof signals**");
  p(`- Pin a "how I help ${city}" post and save Highlights for Services, Proof, and FAQ.`);
  p();
  p("---");

  // ── 11. PROFILE FIX BLUEPRINT ──
  p("## Profile Fix Blueprint");
  p();
  p("Your first fix, made dead simple. The profile is the front door — get this right before anything else.");
  p();
  p("**Before (today):**");
  p(`- Name: ${gm.account.displayName}`);
  p(`- Bio: ${gm.account.bio ?? "—"}`);
  if (gm.account.profileGaps.length) p(`- Issues: ${gm.account.profileGaps.join("; ")}`);
  p();
  p("**After (recommended structure):**");
  p("```");
  p(`Line 1: Who you help`);
  p(`Line 2: Where you help them (${city} + nearby)`);
  p(`Line 3: The problem you solve`);
  p(`Line 4: CTA — ${cta}`);
  p("```");
  p();
  p(`**Worked example:**`);
  p("```");
  p(`Helping ${city} ${gm.category.likelyAudience ? gm.category.likelyAudience.toLowerCase().replace(/\.$/, "") : "customers"} get a better result`);
  p(`Serving ${market}`);
  p(`${gm.category.whatItSells ? gm.category.whatItSells.replace(/\.$/, "") : cat}`);
  p(`${cta} — link below`);
  p("```");
  p();
  p("---");

  // ── 12. THE FIVE MOVES THAT MATTER MOST ──
  p("## The Five Moves That Matter Most");
  p();
  p("Ranked by leverage. Do them in order — each makes the next one land harder.");
  p();
  gm.fixes.forEach((f, i) => {
    p(`### ${i + 1}. ${f.title}`);
    p(`| Impact | Effort | Time | Expected | When |`);
    p(`| --- | --- | --- | --- | --- |`);
    p(`| ${f.impact} | ${f.effort} | ${f.timeRequired} | ${f.expectedLift} | ${i === 0 ? "This week" : i < 3 ? "Week 1" : "Weeks 2–3"} |`);
    p();
    p(`**Why this matters:** ${f.whyItMatters}`);
    p();
    p(`**Do this:** ${f.exactAction}`);
    p();
    p(`**Track:** ${f.scoreArea === "local" ? "local reach / profile visits" : f.scoreArea === "sales" ? "link taps / DMs" : f.scoreArea === "content" ? "saves + shares" : "profile visits → follows"}`);
    p();
  });
  p("---");

  // ── 13. YOUR FIRST 7 DAYS ──
  p("## Your First 7 Days");
  p();
  p("Small daily blocks — 15–30 minutes — that stack into a finished foundation by day 7. Check each off as you go.");
  p();
  for (const d of gm.nextSevenDays) {
    p(`**☐ Day ${d.day} — ${d.objective}** *(${d.timeEstimate})*`);
    p(`- ${d.exactInstruction}`);
    p(`- _Why this matters:_ ${d.whyItMatters}`);
    p(`- _Done when:_ ${d.outputByEndOfDay}`);
    p();
  }
  p("---");

  // ── 14–16. 30-DAY GROWTH SPRINT (weeks 2-4) ──
  const sprintBlocks = [
    { title: "Days 8–14 — Build Proof & Trust", theme: "Build repeatable content and trust signals.", w: gm.sprint[1], track: "Profile visits · DMs · comments · saves · best-performing format" },
    { title: "Days 15–21 — Test What Resonates", theme: "Find what the market responds to.", w: gm.sprint[2], track: "Which hook, format, and CTA earned the most response" },
    { title: "Days 22–30 — Turn It Into a System", theme: "Build next month from what worked.", w: gm.sprint[3], track: "Best 3 posts · best hook · best CTA · best topic" },
  ];
  for (const b of sprintBlocks) {
    p(`## ${b.title}`);
    p();
    p(`**Theme: ${b.theme}**`);
    p();
    if (b.w) {
      for (const a of b.w.actions) p(`- ☐ ${a}`);
      p();
      p(`_Goal:_ ${b.w.goal} · _Output:_ ${b.w.output}`);
    } else {
      p("- ☐ Publish on your chosen cadence and keep the local signals on every post.");
    }
    p();
    if (b.title.startsWith("Days 15")) {
      p("**Testing table — fill this in as you post:**");
      p();
      p("| Post | Format | Hook type | CTA | Result | Keep / improve / stop |");
      p("| --- | --- | --- | --- | --- | --- |");
      p("|  |  |  |  |  |  |");
      p("|  |  |  |  |  |  |");
      p("|  |  |  |  |  |  |");
      p();
    }
    p(`**Track:** ${b.track}`);
    p();
    p("---");
  }

  // ── 17. COPY-AND-USE TOOLKIT ──
  p("## Copy-and-Use Posting Toolkit");
  p();
  p("Never start from a blank screen. Everything here is tuned to your category and market.");
  p();
  if (gm.toolkit.hookFormulas.length) {
    p("### Hook starters");
    p("*The first line decides whether anyone reads the rest.*");
    p();
    for (const h of gm.toolkit.hookFormulas) p(`- ${h}`);
    p();
  }
  if (gm.toolkit.captionFormulas.length) {
    p("### Caption frameworks");
    for (const c of gm.toolkit.captionFormulas) { p(c); p(); }
  }
  p("### CTA lines");
  for (const c of gm.category.ctaOptions.slice(0, 5)) p(`- ${c}`);
  p();
  if (gm.hashtags.length) {
    p("### Hashtag sets");
    p("*Rotate these — a tight, intentional set beats 30 generic tags.*");
    p();
    for (const g of gm.hashtags) p(`- **${g.group}:** ${g.tags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")}`);
    p();
  }
  if (gm.aiPrompts.length) {
    p("### Copy-ready AI prompts");
    p("*Paste into your AI tool to draft fast, then edit into your voice.*");
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
    p("### 10 hooks to start from");
    for (const h of gm.immediateContent.hooks) p(`- ${h}`);
    p();
  }
  p("---");

  // ── 18. 30-DAY CONTENT CALENDAR ──
  p("## Your 30-Day Content Calendar");
  p();
  p("Twelve posts, three a week, mapped to the month's themes. Each slot is ready to fill and ship.");
  p();
  const localTags = gm.hashtags.find((h) => h.group === "local")?.tags.slice(0, 3).map((t) => `#${t.replace(/^#/, "")}`).join(" ") ?? `#${city.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
  const localSig = `${city} location tag + ${localTags}`;
  const hookBank = [...gm.toolkit.hookFormulas, ...gm.immediateContent.hooks];
  const fmts = ["Carousel", "Reel", "Image"];
  const weeks = [
    { wk: "Week 1 — Fix signals", topics: ["Profile relaunch / who you help", `${city} FAQ`, "Common mistake + fix"] },
    { wk: "Week 2 — Build trust", topics: ["Proof / case study", "Behind the scenes", "Myth vs truth"] },
    { wk: "Week 3 — Test engagement", topics: ["Question / poll post", "Objection reframe", "Quick how-to"] },
    { wk: "Week 4 — Repeat winners", topics: ["Best post, new angle", "Customer win", "Plan-ahead / save-this"] },
  ];
  let slot = 0;
  for (const w of weeks) {
    p(`**${w.wk}**`);
    p();
    p("| # | Topic | Format | Hook | CTA | Local signal |");
    p("| --- | --- | --- | --- | --- | --- |");
    w.topics.forEach((topic, ti) => {
      slot++;
      const hook = (hookBank[slot - 1] ?? `A ${topic.toLowerCase()} for ${city} buyers`).replace(/\|/g, "/").slice(0, 80);
      p(`| ${slot} | ${topic} | ${fmts[ti % fmts.length]} | ${hook} | ${cta} | ${localSig} |`);
    });
    p();
  }
  p("---");

  // ── 19. YOUR NEXT CHECKPOINT ──
  p("## Your Next Checkpoint");
  p();
  p(`Re-measure on **${m.reviewDate}**. Growth on Instagram isn't one big leap — it's a monthly loop of act → measure → adjust. This is loop one.`);
  p();
  p("**What to measure in 30 days:**");
  p("- Score movement (re-run this report)");
  p("- Follower growth");
  p("- Profile visits");
  p("- Website / link clicks");
  p("- DMs");
  p("- Post saves & comments");
  p("- Best format · best hook · best CTA");
  p();
  p("**What success looks like in 30 days:**");
  p(`- Your profile clearly says who you help and where (${city})`);
  p("- Every post carries a local signal");
  p("- Every post has a clear next step");
  p("- You have 8–12 new content assets");
  p("- You know which format earned the most response");
  p("- You have a sharper plan for the next 30 days");
  p();
  p("---");

  // ── APPENDIX ──
  p("## Appendix — How This Was Built");
  p();
  p(`Generated from a live analysis of @${m.handle}, ${num(gm.marketPatterns.postsStudied)} posts across the ${cat} category, and ${gm.competitors.length} vetted, English-language competitor accounts scored for relevance and engagement.`);
  p();
  p(`- **Overall confidence:** ${gm.overallConfidence}/100 · **Validation:** ${gm.validation.passed ? "passed" : "failed"} (${gm.validation.blockingCount} blocking, ${gm.validation.warningCount} warnings)`);
  p(`- **Method version:** ${m.promptVersion}`);
  p();
  p("_Full discovery detail, evidence index, and per-section confidence live in the technical report (gold-master.md)._");
  p();

  return out.join("\n");
}
