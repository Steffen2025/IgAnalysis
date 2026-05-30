import { analyzePatterns, type PatternResult } from "./patternAnalyzer.js";

export interface GapExample {
  postId: number;
  sourceTable: "posts" | "competitor_posts";
  username: string;
  competitorType: string | null;
  safeToReference: boolean;
}

export interface GapFinding {
  dimension: string;
  clientValue: unknown;
  categoryValue: unknown;
  insight: string;
  severity: "high" | "medium" | "low";
  exampleToEmulate?: GapExample;
}

function severity(clientVal: number, categoryVal: number): GapFinding["severity"] {
  if (categoryVal === 0) return "low";
  const pct = Math.abs(clientVal - categoryVal) / categoryVal;
  if (pct > 0.5) return "high";
  if (pct > 0.2) return "medium";
  return "low";
}

function findExample(
  category: PatternResult,
  filter: (ex: (typeof category.topPostExamples)[0]) => boolean,
): GapExample | undefined {
  // Prefer reference_model first, then client, then local_intel last
  const ordered = [...category.topPostExamples].sort((a, b) => {
    const rank = (ct: string | null) =>
      ct === "reference_model" ? 0 : ct === null ? 1 : 2;
    return rank(a.competitorType) - rank(b.competitorType);
  });
  const ex = ordered.find(filter);
  if (!ex) return undefined;
  return {
    postId: ex.postId,
    sourceTable: ex.sourceTable,
    username: ex.username,
    competitorType: ex.competitorType,
    safeToReference: ex.competitorType !== "local_intel",
  };
}

export async function analyzeClientGap(auditId: number): Promise<{
  clientPatterns: PatternResult;
  categoryPatterns: PatternResult;
  gaps: GapFinding[];
}> {
  const client = await analyzePatterns(auditId, "client_only");

  // Category corpus = competitor posts only (excluding client to avoid self-comparison bias)
  // We request "category_corpus" which includes both; if there are enough competitor posts
  // the signal will still be meaningful. The client posts are a minority.
  const category = await analyzePatterns(auditId, "category_corpus");

  const gaps: GapFinding[] = [];

  // ── 1. Hook gap ────────────────────────────────────────────────────────────
  const categoryBestHook = category.hooks.bestPerformingHookByEngagement ?? category.hooks.topHook;
  const clientTopHook = client.hooks.topHook;
  if (categoryBestHook !== clientTopHook) {
    const catHookCount = category.hooks.distribution[categoryBestHook] ?? 0;
    const clientHookCount = client.hooks.distribution[categoryBestHook] ?? 0;
    const clientUsageRate = client.postCount > 0 ? clientHookCount / client.postCount : 0;
    const categoryUsageRate = category.postCount > 0 ? catHookCount / category.postCount : 0;

    gaps.push({
      dimension: "hook_type",
      clientValue: clientTopHook,
      categoryValue: categoryBestHook,
      insight: `Top-performing accounts use "${categoryBestHook}" hooks (${Math.round(categoryUsageRate * 100)}% of posts), but this client defaults to "${clientTopHook}" hooks.`,
      severity: severity(clientUsageRate, categoryUsageRate),
      exampleToEmulate: findExample(category, (ex) => ex.hookType === categoryBestHook),
    });
  }

  // ── 2. Tone gap ────────────────────────────────────────────────────────────
  const categoryBestTone = category.tones.bestPerformingToneByEngagement ?? category.tones.topTone;
  const clientTopTone = client.tones.topTone;
  if (categoryBestTone !== clientTopTone) {
    const catToneCount = category.tones.distribution[categoryBestTone] ?? 0;
    const clientToneCount = client.tones.distribution[categoryBestTone] ?? 0;
    const clientUsageRate = client.postCount > 0 ? clientToneCount / client.postCount : 0;
    const categoryUsageRate = category.postCount > 0 ? catToneCount / category.postCount : 0;

    gaps.push({
      dimension: "tone",
      clientValue: clientTopTone,
      categoryValue: categoryBestTone,
      insight: `Best-performing posts in this category lean on "${categoryBestTone}" tone — client predominantly uses "${clientTopTone}" tone instead.`,
      severity: severity(clientUsageRate, categoryUsageRate),
      exampleToEmulate: findExample(category, (ex) => ex.tone === categoryBestTone),
    });
  }

  // ── 3. Caption length gap ──────────────────────────────────────────────────
  const clientAvgLen = client.caption.avgLength;
  const catAvgLen = category.caption.avgLength;
  if (Math.abs(clientAvgLen - catAvgLen) > 30) {
    const direction = clientAvgLen < catAvgLen ? "shorter" : "longer";
    gaps.push({
      dimension: "caption_length",
      clientValue: Math.round(clientAvgLen),
      categoryValue: Math.round(catAvgLen),
      insight: `Client captions average ${Math.round(clientAvgLen)} chars — category average is ${Math.round(catAvgLen)} chars (client is ${direction}). ${direction === "shorter" ? "Longer captions give the algorithm more to index and signal deeper engagement." : "Concise captions can drive higher engagement with time-pressed audiences."}`,
      severity: severity(clientAvgLen, catAvgLen),
    });
  }

  // ── 4. Emoji density gap ───────────────────────────────────────────────────
  const clientEmoji = client.caption.avgEmojiDensity;
  const catEmoji = category.caption.avgEmojiDensity;
  if (Math.abs(clientEmoji - catEmoji) > 0.3) {
    const direction = clientEmoji < catEmoji ? "fewer" : "more";
    gaps.push({
      dimension: "emoji_density",
      clientValue: +clientEmoji.toFixed(2),
      categoryValue: +catEmoji.toFixed(2),
      insight: `Client uses ${direction} emojis (${clientEmoji.toFixed(1)} per 100 chars) than the category average (${catEmoji.toFixed(1)} per 100 chars). Emojis increase scannability and emotional resonance.`,
      severity: severity(clientEmoji, catEmoji),
    });
  }

  // ── 5. Post type gap ───────────────────────────────────────────────────────
  const catBestType = category.postTypes.bestPerformingByEngagement;
  if (catBestType) {
    const clientTypeCount = client.postTypes.distribution[catBestType.post_type] ?? 0;
    const clientTypeRate = client.postCount > 0 ? clientTypeCount / client.postCount : 0;
    const catTypeCount = category.postTypes.distribution[catBestType.post_type] ?? 0;
    const catTypeRate = category.postCount > 0 ? catTypeCount / category.postCount : 0;
    if (clientTypeRate < catTypeRate - 0.1) {
      gaps.push({
        dimension: "post_type",
        clientValue: clientTypeRate,
        categoryValue: catTypeRate,
        insight: `"${catBestType.post_type}" is the highest-engagement format in this category (avg ${(catBestType.avgEngagementRate * 100).toFixed(2)}% ER), but client only uses it ${Math.round(clientTypeRate * 100)}% of the time vs ${Math.round(catTypeRate * 100)}% across the category.`,
        severity: severity(clientTypeRate, catTypeRate),
        exampleToEmulate: findExample(category, (ex) => ex.sourceTable === "competitor_posts"),
      });
    }
  }

  // ── 6. Content element gap ─────────────────────────────────────────────────
  const bestElem = category.contentElements.bestPerformingElementByEngagement;
  if (bestElem) {
    const clientElemCount = client.contentElements.distribution[bestElem] ?? 0;
    const clientElemRate = client.postCount > 0 ? clientElemCount / client.postCount : 0;
    if (clientElemRate < 0.25) {
      const catElemCount = category.contentElements.distribution[bestElem] ?? 0;
      const catElemRate = category.postCount > 0 ? catElemCount / category.postCount : 0;
      gaps.push({
        dimension: "content_element",
        clientValue: +clientElemRate.toFixed(2),
        categoryValue: +catElemRate.toFixed(2),
        insight: `"${bestElem}" is the highest-engagement content element in this category — client only uses it in ${Math.round(clientElemRate * 100)}% of posts. Incorporating it more could meaningfully lift engagement.`,
        severity: clientElemRate < 0.1 ? "high" : "medium",
        exampleToEmulate: findExample(
          category,
          (ex) => {
            try {
              return (JSON.parse(ex.captionExcerpt) as string[]).includes(bestElem);
            } catch { return false; }
          },
        ) ?? findExample(category, (ex) => ex.sourceTable === "competitor_posts"),
      });
    }
  }

  // Sort: high → medium → low
  const severityOrder = { high: 0, medium: 1, low: 2 };
  gaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return { clientPatterns: client, categoryPatterns: category, gaps };
}
