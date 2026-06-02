/**
 * Per-client configuration & example fixtures.
 *
 * IMPORTANT: This is the ONLY place client-specific data (known-bad handles,
 * curated search terms, competitor seeds) is allowed to live. The core engine
 * must stay generic — it reads config from here, keyed by handle. BoxBuddy
 * exists here purely as a regression fixture proving the engine handles an app
 * account; remove or add clients without touching engine code.
 */

/**
 * Generic, user-facing input model for any Instagram account. `businessType`
 * is the strongest category signal when supplied; everything else is optional
 * and inferred when absent. The engine accepts this for ANY handle.
 */
export interface InstagramClientInput {
  auditId?: number;
  instagramHandle: string;
  businessName?: string;
  city?: string;
  region?: string;
  country?: string;
  businessType?: string;
  website?: string;
  targetAudience?: string;
  competitorSeeds?: string[];
  categorySearchTerms?: string[];
  localMarketTerms?: string[];
  knownInvalidCompetitors?: string[];
}

export interface ClientConfig {
  /** Lowercased handle, no @. */
  handle: string;
  /** Curated client-facing display name (e.g. "BoxBuddy" for @boxbuddyapp). */
  displayName?: string;
  /** Optional explicit business type — strongest category signal when set. */
  businessType?: string;
  /** Curated category/local search terms for competitor discovery. */
  categorySearchTerms?: string[];
  /** Optional seed competitor handles to consider. */
  competitorSeeds?: string[];
  /** Handles confirmed invalid for this client (never client-facing). */
  knownInvalidHandles?: string[];
  /** Industries that are never valid references for this client. */
  rejectIndustries?: string[];
}

/** Normalize a generic InstagramClientInput into the internal ClientConfig. */
export function configFromInput(input: InstagramClientInput): ClientConfig {
  return {
    handle: input.instagramHandle.replace(/^@/, "").toLowerCase(),
    businessType: input.businessType,
    categorySearchTerms: input.categorySearchTerms ?? input.localMarketTerms,
    competitorSeeds: input.competitorSeeds,
    knownInvalidHandles: input.knownInvalidCompetitors,
  };
}

/**
 * BoxBuddy — regression fixture (app account). Demonstrates the engine treating
 * a consumer app correctly: app CTAs, moving/home-organization search terms,
 * and rejection of the poisoned-discovery handles found in audit 27.
 */
const BOXBUDDY: ClientConfig = {
  handle: "boxbuddyapp",
  displayName: "BoxBuddy",
  businessType: "moving and home inventory app",
  categorySearchTerms: [
    "moving app",
    "moving checklist",
    "packing app",
    "moving boxes",
    "box inventory",
    "home inventory",
    "home organization",
    "decluttering",
    "storage",
    "moving tips",
    "toronto moving",
    "condo moving",
    "apartment moving",
    "family moving",
    "packing tips",
    "moving day checklist",
  ],
  knownInvalidHandles: [
    "fredagainagainagainagainagain",
    "none_like_mine",
    "none_tattooer",
    "windsorone",
    "devwindsor",
  ],
  rejectIndustries: ["music", "tattoo", "events", "building materials", "lumber"],
};

/**
 * ActiveDoor — fixture (local service / garage door company). Demonstrates the
 * engine treating a home-service account correctly: service CTAs (book/quote),
 * garage-door + local search terms.
 */
const ACTIVEDOOR: ClientConfig = {
  handle: "activedoor",
  displayName: "Active Door",
  businessType: "garage door company",
  categorySearchTerms: [
    "garage door", "garage door repair", "garage door installation", "garage door opener",
    "garage door spring", "burlington garage door", "oakville garage door", "hamilton garage door",
    "overhead door", "garage door service",
  ],
  rejectIndustries: ["music", "tattoo", "events"],
};

/**
 * Jelinek Mortgages — fixture (professional / mortgage broker). Demonstrates
 * the engine treating a financial-services account correctly: book-a-call /
 * pre-approval CTAs, mortgage + local search terms.
 */
const JELINEK: ClientConfig = {
  handle: "jelinekmortgages",
  displayName: "Jelinek Mortgages",
  businessType: "mortgage broker",
  categorySearchTerms: [
    "mortgage broker", "mortgage rates", "first time home buyer", "mortgage refinance",
    "pre-approval", "home loan", "waterdown mortgage", "hamilton mortgage", "burlington mortgage",
    "mortgage tips",
  ],
  rejectIndustries: ["music", "tattoo", "events"],
};

const REGISTRY: Record<string, ClientConfig> = {
  [BOXBUDDY.handle]: BOXBUDDY,
  [ACTIVEDOOR.handle]: ACTIVEDOOR,
  [JELINEK.handle]: JELINEK,
};

/** Look up client config by handle (case-insensitive). Returns {} when none. */
export function getClientConfig(handle: string | null | undefined): ClientConfig {
  const key = (handle ?? "").replace(/^@/, "").toLowerCase();
  return REGISTRY[key] ?? { handle: key };
}
