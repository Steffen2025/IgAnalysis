/**
 * Category-aware copy + metric-aware recommendation helpers.
 *
 * Keeps client-facing language honest:
 *   - CTAs match the business model (an app says "download", not "book a call").
 *   - Posting advice respects actual cadence (never tell an account posting
 *     11.7×/week to "post more").
 *   - Hashtag tokens are sanitized so a junk category can't produce
 *     "#TorontoNoneSoftware".
 */

import type { CategoryKind } from "./categoryNormalizer.js";

export interface CtaProfile {
  /** Primary verb-led CTA, e.g. "Download the app". */
  primary: string;
  /** Short bio-line CTA, e.g. "Get the app — link in bio". */
  bioLine: string;
  /** Caption-ending CTA. */
  caption: string;
  /** The single best conversion action word. */
  action: string;
}

const CTA_BY_KIND: Record<CategoryKind, CtaProfile> = {
  app: {
    primary: "Download the app",
    bioLine: "Get the app — link in bio",
    caption: "Tap the link in bio to download and start your move.",
    action: "download",
  },
  service: {
    primary: "Book a free quote",
    bioLine: "Book now — link in bio",
    caption: "DM us or tap the link in bio to book.",
    action: "book",
  },
  professional: {
    primary: "Book a call",
    bioLine: "Book a call — link in bio",
    caption: "Ready to talk? Book a call via the link in bio.",
    action: "book a call",
  },
  retail: {
    primary: "Order online",
    bioLine: "Order now — link in bio",
    caption: "Order online or visit us — link in bio.",
    action: "order",
  },
  creator: {
    primary: "Follow for more",
    bioLine: "Follow + link in bio",
    caption: "Follow for more and tap the link in bio.",
    action: "follow",
  },
  generic: {
    primary: "Visit the link in bio",
    bioLine: "Link in bio",
    caption: "Tap the link in bio to learn more.",
    action: "learn more",
  },
};

/** CTA language appropriate to the business model. */
export function ctaForKind(kind: CategoryKind): CtaProfile {
  return CTA_BY_KIND[kind] ?? CTA_BY_KIND.generic;
}

export interface CadenceInput {
  /** Account's current posts per week. */
  postsPerWeek: number | null | undefined;
  /** Market/category average posts per week, if known. */
  marketPerWeek?: number | null;
}

export interface CadenceRecommendation {
  /** "increase" | "maintain" | "refine" — drives copy. */
  verdict: "increase" | "maintain" | "refine";
  headline: string;
  detail: string;
}

/**
 * Metric-aware posting recommendation. The core rule: an account already
 * posting far above market average must NOT be told to "post more" — the
 * leverage is quality, positioning, and conversion, not volume.
 */
export function recommendCadence(input: CadenceInput): CadenceRecommendation {
  const ppw = input.postsPerWeek ?? 0;
  const market = input.marketPerWeek ?? null;

  // Well above market (or simply high absolute cadence) → refine, don't add.
  const aboveMarket = market != null && market > 0 ? ppw >= market * 1.5 : ppw >= 5;
  if (aboveMarket) {
    return {
      verdict: "refine",
      headline: "Your volume is not the problem",
      detail:
        market != null && market > 0
          ? `You already post ${ppw.toFixed(1)}×/week vs a market average near ${market.toFixed(1)}×. The gap is sharper positioning, stronger hooks, and a clearer CTA — not more posts. Trade a few low-effort posts for fewer, more intentional ones.`
          : `At ${ppw.toFixed(1)} posts/week you are posting plenty. Focus on hooks, saves/shares, and a clearer CTA rather than raising volume.`,
    };
  }

  // Below market → cadence increase is the right call.
  if (market != null && market > 0 && ppw < market * 0.75) {
    return {
      verdict: "increase",
      headline: "Raise your posting rhythm",
      detail: `You post ${ppw.toFixed(1)}×/week vs a market average near ${market.toFixed(1)}×. Build a repeatable weekly cadence so the algorithm and your audience see you consistently.`,
    };
  }

  return {
    verdict: "maintain",
    headline: "Hold your cadence, sharpen the content",
    detail: `Your ${ppw.toFixed(1)} posts/week is in a healthy range. Keep the rhythm and put the effort into hooks, formats, and conversion.`,
  };
}

/**
 * Sanitize a phrase into a safe hashtag token. Strips junk category fragments
 * ("none", "software" alone) so we never emit #TorontoNoneSoftware. Returns
 * empty string if nothing usable remains (callers should skip empties).
 */
export function safeHashtagToken(phrase: string | null | undefined): string {
  const cleaned = (phrase ?? "")
    .replace(/[,/|]+/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
    .filter((w) => w && !/^(none|null|undefined|nan|na|software|app|business)$/i.test(w))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return cleaned;
}
