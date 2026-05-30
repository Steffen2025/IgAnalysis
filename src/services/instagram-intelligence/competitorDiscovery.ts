/**
 * Competitor discovery (intelligence pipeline).
 *
 * Generic + client-input driven. Generates category/local search terms, then
 * runs the two-track relevance engine (local peers vs reference models) over the
 * available candidate pool, enhanced by:
 *   - the client's content signature (overlap scoring),
 *   - optional semantic embeddings (meaning-based relevance),
 *   - the persistent competitor library (vetted handles from prior audits).
 *
 * Honest by design: reports dataSource + discoveryStatus and never fabricates.
 * Live Apify fan-out on the generated terms is the next external integration;
 * when no candidate pool exists this returns `not_configured` with exact terms.
 */

import type { ReportCompetitor } from "../report/reportDataAssembler.js";
import type { CompetitorCard, CompetitorDebug } from "./goldMasterSchema.js";
import { evaluateCompetitors, type RelevanceContext } from "./competitorRelevance.js";
import type { ClientConfig } from "./clientConfig.js";
import type { ClientSignature } from "./clientSignature.js";
import { referenceFollowerBand, referenceMarkets } from "./referenceConfig.js";
import { semanticRelevance, embeddingsAvailable } from "../llm/embeddings.js";
import { fetchLibrarySeeds, saveSelectedToLibrary, type LibraryEntry } from "./competitorLibrary.js";

export interface CompetitorDiscoveryInput {
  auditId: number;
  handle: string;
  businessName?: string;
  city?: string;
  region?: string;
  country?: string;
  businessType: string;
  normalizedCategory: string;
  categoryKind?: string;
  website?: string;
  targetAudience?: string;
  competitorSeeds?: string[];
  categorySearchTerms?: string[];
  localMarketTerms?: string[];
  maxLocal?: number;
  maxReference?: number;
}

export interface CompetitorDiscoveryResult {
  searchTerms: string[];
  regionalSearchTerms: string[];
  referenceSearchTerms: string[];
  seedHandles: string[];
  librarySeeds: LibraryEntry[];
  candidatesFound: number;
  selected: CompetitorCard[];
  debug: CompetitorDebug;
  dataSource: "db" | "apify" | "manual_seed" | "library" | "mixed" | "none";
  discoveryStatus: "complete" | "partial" | "failed" | "not_configured";
  embeddingsUsed: boolean;
  failureReason?: string;
}

const STOPWORDS = new Set(["and", "the", "for", "with", "your", "app", "inc", "ltd", "co", "company", "services", "service"]);

function coreWords(input: CompetitorDiscoveryInput): string[] {
  const words = `${input.businessType} ${input.normalizedCategory}`
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return Array.from(new Set(words)).slice(0, 4);
}

/** Local-market search terms (client's own city). */
export function generateSearchTerms(input: CompetitorDiscoveryInput): string[] {
  const terms = new Set<string>();
  const add = (t: string) => { const v = t.trim().toLowerCase(); if (v) terms.add(v); };
  (input.categorySearchTerms ?? []).forEach(add);
  (input.localMarketTerms ?? []).forEach(add);
  const core = coreWords(input);
  const phrase = core.join(" ").trim();
  if (phrase) {
    add(phrase);
    add(`${phrase} tips`);
    if (input.city) { add(`${input.city} ${phrase}`); add(`${phrase} ${input.city}`); }
    if (input.region) add(`${phrase} ${input.region}`);
  }
  for (const w of core) { add(w); if (input.city) add(`${input.city} ${w}`); }
  return Array.from(terms).slice(0, 18);
}

/** Adjacent industries by kind — reach the same audience without being the same business. */
const COMPLEMENTARY_BY_KIND: Record<string, string[]> = {
  service: ["home services", "home improvement", "contractor", "local renovation", "home maintenance"],
  professional: ["financial services", "local business advisor", "real estate", "small business tips"],
  app: ["productivity app", "lifestyle app", "home organization", "tech for home"],
  retail: ["local shop", "small business", "local maker", "shop local"],
  creator: ["local creator", "lifestyle creator", "community spotlight"],
  generic: ["local business", "community spotlight", "small business"],
};

/**
 * Complementary / adjacent-industry terms for thin niches — broaden to side
 * industries (and the client's own content keywords) that serve the same
 * interest group, so a sparse direct-competitor pool still has somewhere to look.
 */
export function generateComplementaryTerms(input: CompetitorDiscoveryInput, extraKeywords: string[] = []): string[] {
  const terms = new Set<string>();
  const add = (t: string) => { const v = t.trim().toLowerCase(); if (v) terms.add(v); };
  const adj = COMPLEMENTARY_BY_KIND[input.categoryKind ?? "generic"] ?? COMPLEMENTARY_BY_KIND.generic;
  for (const a of adj) { add(a); if (input.city) add(`${input.city} ${a}`); }
  // Parent category: drop the most specific leading word ("garage door company" → "door company").
  const words = input.normalizedCategory.toLowerCase().split(/\s+/);
  if (words.length > 1) add(words.slice(1).join(" "));
  for (const k of extraKeywords.slice(0, 4)) { add(k); if (input.city) add(`${input.city} ${k}`); }
  return Array.from(terms).slice(0, 12);
}

/**
 * Category hashtags for engagement-based discovery.
 *
 * The owners of TOP posts on a category hashtag are — by construction —
 * accounts succeeding at reach/engagement, which is exactly the population the
 * SEO-ranked Google net misses. Builds the bare category tag, common
 * intent-suffixed variants, a city-scoped local tag, and single core words.
 */
const HASHTAG_SUFFIX_BY_KIND: Record<string, string[]> = {
  service: ["repair", "installation", "contractor", "services", "tips"],
  professional: ["advisor", "tips", "broker", "consultant"],
  app: ["app", "tech", "tips"],
  retail: ["shop", "store", "local"],
  creator: ["creator", "tips"],
  generic: ["tips", "local", "services"],
};

export function generateHashtags(input: CompetitorDiscoveryInput): string[] {
  const tags = new Set<string>();
  const add = (t: string) => {
    const v = t.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (v.length >= 4 && v.length <= 30) tags.add(v);
  };
  const core = coreWords(input);
  const phrase = core.join("");
  if (phrase) {
    add(phrase);
    const suffixes = HASHTAG_SUFFIX_BY_KIND[input.categoryKind ?? "generic"] ?? HASHTAG_SUFFIX_BY_KIND.generic;
    for (const s of suffixes) add(`${phrase}${s}`);
    if (input.city) { add(`${input.city}${phrase}`.replace(/\s/g, "")); }
  }
  for (const w of core) add(w);
  return Array.from(tags).slice(0, 10);
}

/** Regional ring: same category across the client's region / nearby (middle ring). */
export function generateRegionalSearchTerms(input: CompetitorDiscoveryInput): string[] {
  const terms = new Set<string>();
  const add = (t: string) => { const v = t.trim().toLowerCase(); if (v) terms.add(v); };
  const phrase = coreWords(input).join(" ").trim();
  if (!phrase) return [];
  if (input.region) { add(`${phrase} ${input.region}`); add(`best ${phrase} ${input.region}`); add(`${phrase} ${input.region} based`); }
  if (input.city) add(`${phrase} near ${input.city}`);
  return Array.from(terms).slice(0, 10);
}

/** Reference-model search terms: same category across major metros (no local). */
export function generateReferenceSearchTerms(input: CompetitorDiscoveryInput): string[] {
  const terms = new Set<string>();
  const add = (t: string) => { const v = t.trim().toLowerCase(); if (v) terms.add(v); };
  const phrase = coreWords(input).join(" ").trim();
  if (!phrase) return [];
  add(phrase);
  add(`best ${phrase}`);
  add(`top ${phrase}`);
  for (const market of referenceMarkets()) { add(`${phrase} ${market}`); }
  return Array.from(terms).slice(0, 16);
}

export function buildVocabulary(input: CompetitorDiscoveryInput, searchTerms: string[]): string[] {
  const vocab = new Set<string>();
  for (const t of searchTerms) t.split(/[^a-z]+/i).forEach((w) => { if (w.length >= 4) vocab.add(w.toLowerCase()); });
  input.normalizedCategory.toLowerCase().split(/[^a-z]+/).forEach((w) => { if (w.length >= 4 && !STOPWORDS.has(w)) vocab.add(w); });
  return Array.from(vocab);
}

function candidateText(c: ReportCompetitor): string {
  return [c.full_name, c.bio, c.category, c.top_posts?.[0]?.caption].filter(Boolean).join(". ").slice(0, 1500);
}

/**
 * Run two-track discovery against the available candidate pool, enhanced by
 * content signature, optional embeddings, and the persistent library.
 */
export async function discoverCompetitors(
  input: CompetitorDiscoveryInput,
  dbCandidates: ReportCompetitor[],
  config: ClientConfig,
  signature?: ClientSignature,
): Promise<CompetitorDiscoveryResult> {
  const searchTerms = generateSearchTerms(input);
  const regionalSearchTerms = generateRegionalSearchTerms(input);
  const referenceSearchTerms = generateReferenceSearchTerms(input);
  const seedHandles = (input.competitorSeeds ?? []).map((h) => h.replace(/^@/, "").toLowerCase());
  const vocabulary = buildVocabulary(input, searchTerms);
  const band = referenceFollowerBand(input.categoryKind);

  // Optional semantic relevance (embeddings). Falls back silently when off.
  let embeddingScores: Map<string, number> | undefined;
  let embeddingsUsed = false;
  if (embeddingsAvailable() && signature?.seedText && dbCandidates.length > 0) {
    const scores = await semanticRelevance(
      signature.seedText,
      dbCandidates.filter((c) => c.username).map((c) => ({ id: c.username!.toLowerCase(), text: candidateText(c) })),
    );
    if (scores) { embeddingScores = scores; embeddingsUsed = true; }
  }

  const relCtx: RelevanceContext = {
    categoryLabel: input.normalizedCategory,
    categoryKind: input.categoryKind ?? "generic",
    city: input.city ?? "",
    vocabulary,
    config,
    signature,
    embeddingScores,
    band,
  };

  const { cards, debug } = evaluateCompetitors(dbCandidates, relCtx, searchTerms, (input.maxLocal ?? 3) + (input.maxReference ?? 3));
  // Three rings of recommended discovery terms: local → regional → national.
  debug.recommendedSearchTerms = Array.from(new Set([...searchTerms, ...regionalSearchTerms, ...referenceSearchTerms])).slice(0, 18);

  // Persist vetted competitors + pull prior-audit seeds (compounding library).
  const region = input.region ?? "";
  const fcByHandle = new Map(dbCandidates.map((c) => [(c.username ?? "").toLowerCase(), c.follower_count ?? null]));
  await saveSelectedToLibrary(
    input.normalizedCategory,
    region,
    input.auditId,
    debug.selected.map((d) => ({ ...d, followerCount: fcByHandle.get(d.handle.toLowerCase()) ?? null })),
  );
  const librarySeeds = (await fetchLibrarySeeds(input.normalizedCategory, region)).filter(
    (s) => s.handle.toLowerCase() !== input.handle.toLowerCase(),
  );

  let dataSource: CompetitorDiscoveryResult["dataSource"] = dbCandidates.length ? "db" : librarySeeds.length ? "library" : "none";
  let discoveryStatus: CompetitorDiscoveryResult["discoveryStatus"];
  let failureReason: string | undefined;

  if (dbCandidates.length === 0 && librarySeeds.length === 0) {
    discoveryStatus = "not_configured";
    failureReason = "No candidate pool and no library history. Live competitor discovery (Apify fan-out on the generated search terms) is not yet wired into the intelligence pipeline.";
  } else if (cards.length === 0) {
    discoveryStatus = "failed";
    failureReason = `All ${dbCandidates.length} candidates failed the relevance gate (${debug.emptyReason}). ${librarySeeds.length} vetted seed(s) available from prior audits for the next discovery run.`;
  } else if (cards.length < 3) {
    discoveryStatus = "partial";
  } else {
    discoveryStatus = "complete";
  }

  return { searchTerms, regionalSearchTerms, referenceSearchTerms, seedHandles, librarySeeds, candidatesFound: dbCandidates.length, selected: cards, debug, dataSource, discoveryStatus, embeddingsUsed, failureReason };
}
