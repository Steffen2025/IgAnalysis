import { desc, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { first } from "../../../db/query.js";
import { posts, profiles } from "../../../db/schema.js";
import { signal, tallyScore, type ScoreResult } from "../types.js";

export const W = {
  BIO_HAS_CTA: 20,
  EXTERNAL_URL_ACTIONABLE: 15,
  CTA_USAGE_RATE: 25,
  SALES_HIGHLIGHTS_PRESENT: 15,
  TESTIMONIAL_CONTENT_RATE: 15,
  OFFER_CONTENT_PRESENT: 10,
} as const;

const BIO_CTA = ["book", "call", "dm", "shop", "order", "contact", "visit", "link"];
const URL_ACTIONABLE = ["book", "shop", "order", "menu", "contact", "reserve", "calendly", "linktree", "linktr.ee"];
const SALES_HIGHLIGHTS = ["menu", "order", "book", "shop", "offers", "deals", "contact"];
const TESTIMONIAL_TERMS = ["review", "customer", "testimonial", "★", "⭐", "love"];
const QUOTED_LONG = /"[^"]{20,}"/;
const OFFER_TERMS = ["discount", "free", "%", "special", "offer", "deal"];

const DAY_MS = 24 * 3600 * 1000;

function parseJsonArray(blob: string | null | undefined): string[] {
  if (!blob) return [];
  try {
    const arr = JSON.parse(blob);
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export async function scoreSalesReadiness(auditId: number): Promise<ScoreResult> {
  const profile = await first(db
    .select()
    .from(profiles)
    .where(eq(profiles.audit_id, auditId))
    .orderBy(desc(profiles.scraped_at))
    .limit(1));
  const allPosts = await db.select().from(posts).where(eq(posts.audit_id, auditId));

  if (!profile || allPosts.length === 0) {
    return {
      score: 0,
      maxPossible: 100,
      signals: [],
      explanation: "Insufficient data for sales readiness.",
      computedAt: new Date(),
    };
  }

  const signals = [];
  const bioLower = (profile.bio ?? "").toLowerCase();
  const url = (profile.external_url_in_bio ?? profile.website_url ?? "").toLowerCase();
  const highlights = parseJsonArray(profile.highlight_titles).map((h) => h.toLowerCase());

  // Bio has CTA
  const bioCta = BIO_CTA.some((t) => bioLower.includes(t));
  signals.push(
    signal(
      "bio_has_cta",
      "Bio contains a CTA verb",
      bioCta,
      profile.bio?.slice(0, 80) ?? "",
      W.BIO_HAS_CTA,
      bioCta ? W.BIO_HAS_CTA : 0,
    ),
  );

  // External URL actionable
  const urlAction = !!url && URL_ACTIONABLE.some((t) => url.includes(t));
  signals.push(
    signal(
      "external_url_actionable",
      "Bio URL points to an action page (book/menu/order/etc.)",
      urlAction,
      url,
      W.EXTERNAL_URL_ACTIONABLE,
      urlAction ? W.EXTERNAL_URL_ACTIONABLE : url ? W.EXTERNAL_URL_ACTIONABLE * 0.4 : 0,
    ),
  );

  // CTA usage rate (matches contentPerformance pattern)
  const ctas = allPosts.filter((p) => p.has_cta).length;
  const ctaPct = (ctas / allPosts.length) * 100;
  let ctaEarned = 0;
  if (ctaPct > 50) ctaEarned = W.CTA_USAGE_RATE;
  else if (ctaPct >= 25) ctaEarned = W.CTA_USAGE_RATE * (2 / 3);
  else if (ctaPct > 0) ctaEarned = W.CTA_USAGE_RATE * (1 / 3);
  signals.push(
    signal(
      "cta_usage_rate",
      "% of posts with a CTA",
      ctaPct >= 25,
      Number(ctaPct.toFixed(1)),
      W.CTA_USAGE_RATE,
      ctaEarned,
      `${ctas}/${allPosts.length}`,
    ),
  );

  // Sales-oriented highlights
  const salesHl = SALES_HIGHLIGHTS.filter((t) => highlights.some((h) => h.includes(t)));
  signals.push(
    signal(
      "sales_highlights_present",
      "Highlights include a sales/conversion topic",
      salesHl.length > 0,
      salesHl.join(", "),
      W.SALES_HIGHLIGHTS_PRESENT,
      salesHl.length > 0 ? W.SALES_HIGHLIGHTS_PRESENT : 0,
    ),
  );

  // Testimonial content rate
  const testCount = allPosts.filter((p) => {
    const c = (p.caption ?? "").toLowerCase();
    if (TESTIMONIAL_TERMS.some((t) => c.includes(t))) return true;
    return QUOTED_LONG.test(p.caption ?? "");
  }).length;
  const testPct = (testCount / allPosts.length) * 100;
  let testEarned = 0;
  if (testPct >= 20) testEarned = W.TESTIMONIAL_CONTENT_RATE;
  else if (testPct >= 10) testEarned = W.TESTIMONIAL_CONTENT_RATE * 0.6;
  else if (testPct > 0) testEarned = W.TESTIMONIAL_CONTENT_RATE * 0.3;
  signals.push(
    signal(
      "testimonial_content_rate",
      "% of posts with testimonial/social-proof signal",
      testPct > 0,
      Number(testPct.toFixed(1)),
      W.TESTIMONIAL_CONTENT_RATE,
      testEarned,
      `${testCount}/${allPosts.length}`,
    ),
  );

  // Offer content in last 30 days
  const cutoff = Date.now() - 30 * DAY_MS;
  const offerHit = allPosts.some((p) => {
    if (!p.posted_at) return false;
    const t = new Date(p.posted_at).getTime();
    if (!Number.isFinite(t) || t < cutoff) return false;
    const cap = (p.caption ?? "").toLowerCase();
    return OFFER_TERMS.some((term) => cap.includes(term));
  });
  signals.push(
    signal(
      "offer_content_present",
      "≥1 post in last 30 days mentions an offer",
      offerHit,
      offerHit ? "yes" : "no",
      W.OFFER_CONTENT_PRESENT,
      offerHit ? W.OFFER_CONTENT_PRESENT : 0,
    ),
  );

  const score = tallyScore(signals);
  const gaps = signals
    .filter((s) => s.earned < s.weight)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((s) => s.key);
  const explanation = `Sales readiness scored ${score}/100. ${
    gaps.length ? `Biggest gaps: ${gaps.join(", ")}.` : "All signals firing."
  }`;

  return { score, maxPossible: 100, signals, explanation, computedAt: new Date() };
}
