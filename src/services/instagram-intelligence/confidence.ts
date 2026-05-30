/**
 * Section-level confidence scoring.
 *
 * We never claim a blanket "99.9% confident". Each major section gets a score
 * backed by source coverage, data gaps, and validation status. Overall
 * confidence is the evidence-weighted mean, dragged down by any blocked section.
 *
 * Levels:
 *   90-100 high    — strong source coverage, validated, no major gaps
 *   75-89  medium  — usable, minor gaps
 *   50-74  low     — usable with caution, visible gaps
 *   <50    low/blocked — do not present as high-confidence
 *   blocked        — required evidence missing or validation failed
 */

import type {
  GoldMasterIntelligence,
  SectionConfidence,
  EvidenceItem,
} from "./goldMasterSchema.js";

function levelFor(score: number, blocked: boolean): SectionConfidence["level"] {
  if (blocked) return "blocked";
  if (score >= 90) return "high";
  if (score >= 75) return "medium";
  return "low";
}

function mk(
  sectionId: string,
  score: number,
  blocked: boolean,
  reasons: string[],
  sourceCoverage: string[],
  dataGaps: string[],
): SectionConfidence {
  return { sectionId, score: Math.max(0, Math.min(100, Math.round(score))), level: levelFor(score, blocked), reasons, sourceCoverage, dataGaps };
}

/**
 * Compute confidence for each major section from the assembled object + the
 * evidence index. Pure: takes the (already validated) gold master.
 */
export function computeSectionConfidence(gm: GoldMasterIntelligence, evidence: EvidenceItem[]): SectionConfidence[] {
  const out: SectionConfidence[] = [];
  const hasEvidence = (type: EvidenceItem["sourceType"]) => evidence.some((e) => e.sourceType === type);
  const profileEv = hasEvidence("profile");
  const scoreEv = hasEvidence("score");
  const patternEv = hasEvidence("market_pattern");

  // Category diagnosis — driven by the normalizer source + confidence.
  out.push(mk(
    "category",
    gm.category.confidence,
    !gm.category.normalizedCategory || gm.category.confidence < 30,
    [`Category source: ${gm.category.source}`],
    profileEv ? ["profile bio/website"] : [],
    gm.category.source === "fallback" ? ["Weak category signal — verify business type"] : [],
  ));

  // Scores — fully deterministic from the audit score model.
  out.push(mk(
    "scores",
    scoreEv ? 92 : 60,
    gm.scores.length < 5,
    ["Derived from the audit scoring model"],
    scoreEv ? ["audit scores + signals"] : [],
    scoreEv ? [] : ["No score signals captured"],
  ));

  // Fixes / Next 7 / Sprint — lower confidence when LLM enrichment fell back.
  const deterministicAll = gm.dataGaps.some((g) => /llm enrichment/i.test(g.area));
  const fixesFallback = deterministicAll || gm.dataGaps.some((g) => /five moves/i.test(g.area));
  const daysFallback = deterministicAll || gm.dataGaps.some((g) => /seven days/i.test(g.area));
  out.push(mk("fixes", gm.fixes.length < 5 ? 40 : fixesFallback ? 65 : 85, gm.fixes.length < 5, [fixesFallback ? "LLM enrichment fell back to deterministic" : "LLM-generated, schema-validated"], ["audit scores"], fixesFallback ? ["Used deterministic fallback"] : []));
  out.push(mk("nextSevenDays", gm.nextSevenDays.length < 7 ? 40 : daysFallback ? 65 : 85, gm.nextSevenDays.length < 7, [daysFallback ? "LLM enrichment fell back to deterministic" : "LLM-generated, schema-validated"], ["top moves"], daysFallback ? ["Used deterministic fallback"] : []));
  out.push(mk("sprint", gm.sprint.length >= 4 ? 88 : 50, false, ["Standard 4-week structure"], [], gm.sprint.length < 4 ? ["Fewer than 4 weeks"] : []));

  // Market comparison / patterns — depend on category corpus.
  out.push(mk(
    "marketPatterns",
    patternEv && gm.marketPatterns.postsStudied > 0 ? 88 : 45,
    false,
    [`${gm.marketPatterns.postsStudied} posts studied`],
    patternEv ? ["category corpus"] : [],
    gm.marketPatterns.postsStudied === 0 ? ["No category corpus posts available"] : [],
  ));

  // Competitors — the honest one. Confidence reflects actual data QUALITY:
  // how many were selected, whether we found aspirational reference models (not
  // just local peers), and how much post-level data backs them. A thin niche
  // with only local peers is reported honestly at a lower score than a rich
  // category with in-band reference models and full post coverage.
  const cards = gm.competitors;
  const n = cards.length;
  const refs = cards.filter((c) => c.type === "reference").length;
  const locals = n - refs;
  const withPosts = cards.filter((c) => c.latestPostAvailable).length;
  const postCoverage = n ? withPosts / n : 0;

  let compScore: number;
  const compReasons: string[] = [];
  const compGaps: string[] = [];
  if (n === 0) {
    compScore = gm.competitorDebug.candidatesFound > 0 ? 35 : 20;
    compReasons.push(`0 selected (${gm.competitorDebug.candidatesFound} candidates, ${gm.competitorDebug.emptyReason})`);
    compGaps.push(`No relevant competitors (${gm.competitorDebug.emptyReason})`);
  } else {
    // Count alone caps ~74; reference models push into "high"; posts confirm depth.
    let s = 50 + Math.min(n, 6) * 4;       // 1→54 … 6→74
    s += Math.min(refs, 3) * 6;             // aspirational models, up to +18
    s += Math.round(postCoverage * 8);      // post-level evidence, up to +8
    compScore = Math.min(92, s);
    compReasons.push(`${n} selected (${refs} reference, ${locals} local) · ${withPosts}/${n} with post data`);
    if (refs === 0) compGaps.push("No aspirational reference models in band — only local peers (thin niche)");
    else if (refs < 2) compGaps.push(`Limited aspirational reference models (${refs}) — niche has few large accounts`);
    if (postCoverage < 0.5) compGaps.push("Several selected competitors lack post-level data");
  }
  const compCoverage: string[] = [];
  if (n) compCoverage.push("scored competitor candidates");
  if (refs) compCoverage.push("in-band reference models");
  if (withPosts) compCoverage.push("competitor post-level data");
  out.push(mk("competitors", compScore, false, compReasons, compCoverage, compGaps));

  // Observed posts / content mechanics — currently data-limited.
  out.push(mk("observedPosts", gm.observedPosts.length ? 80 : 20, false, [], gm.observedPosts.length ? ["competitor posts"] : [], gm.observedPosts.length ? [] : ["No post-level competitor data"]));

  // Hashtags / toolkit / prompts — deterministic, category-derived.
  out.push(mk("hashtags", 75, false, ["Category-derived, human-realistic"], ["category"], []));
  out.push(mk("toolkit", 75, false, ["Category-derived formulas"], ["category"], []));
  out.push(mk("aiPrompts", 80, false, ["Category + CTA aware"], ["category", "cta"], []));

  return out;
}

export function overallConfidence(sections: SectionConfidence[], severeGaps = false): number {
  if (sections.length === 0) return 0;
  const blocked = sections.some((s) => s.level === "blocked");
  const mean = sections.reduce((s, x) => s + x.score, 0) / sections.length;
  // A blocked section caps overall at "low" (<50). Severe data gaps cap at 80.
  let score = mean;
  if (severeGaps) score = Math.min(score, 80);
  if (blocked) score = Math.min(score, 49);
  return Math.round(score);
}
