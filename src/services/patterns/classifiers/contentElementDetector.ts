export type ContentElement =
  | "product_media"
  | "owner_team"
  | "customer_focus"
  | "process_shown"
  | "location_anchored"
  | "offer_present"
  | "personality";

// ── Owner / team signals ────────────────────────────────────────────────────
const OWNER_WORDS = [
  "our team", "the team", "meet our", "meet the", "family business", "family-owned",
  "owner", "founder", "co-founder", "principal", "director",
  "my father", "my mother", "my son", "my daughter", "my partner",
  "the chef", "the agent", "the trainer", "the coach", "the lawyer",
  "the therapist", "the doctor", "the designer", "the developer",
];

// ── Customer / social-proof signals ────────────────────────────────────────
const CUSTOMER_WORDS = [
  "customer", "client", "review", "testimonial", "feedback",
  "you said", "they said", "you loved", "you told us",
  "★", "⭐", "5 star", "five star",
  "we helped", "we served", "we worked with",
  "shoutout to", "shout-out to", "congratulations to",
];

// ── Work / service process signals ─────────────────────────────────────────
const PROCESS_WORDS = [
  "how we", "our process", "our method", "the way we", "here's how we",
  "step by step", "from start to finish", "watch us", "see how",
  "handmade", "hand-made", "hand made", "custom made", "made to order",
  "from scratch", "built by", "designed by", "created by",
  "before & after", "before and after", "transformation",
  "work in progress", "in progress", "we build", "we create", "we make",
  "prepared", "crafted", "assembled", "installed",
];

// ── Product / service media signals ────────────────────────────────────────
// "product_media" replaces the old food-only "food_close_up".
// Fires when a visual post (image or carousel) centres on the core deliverable,
// whatever it is — a dish, a property listing, a finished design, a before/after.
const PRODUCT_MEDIA_WORDS = [
  // universal presentation language
  "just listed", "new listing", "available now", "on the market",
  "new arrival", "just dropped", "now available", "just launched",
  "take a look", "check this out", "here it is", "introducing",
  "before & after", "before and after", "transformation", "results",
  "swipe to see", "swipe left", "tap to see",
  // food (still valid for food businesses)
  "shawarma", "falafel", "pita", "hummus", "wrap", "burger", "pizza",
  "pasta", "sandwich", "salad", "taco", "sushi", "ramen", "cake",
  "coffee", "latte", "bowl", "soup", "steak", "chicken", "lamb",
  // real estate
  "beds", "baths", "sqft", "sq ft", "open house", "just sold", "sold!",
  "for sale", "price reduced", "fully renovated", "stunning kitchen",
  // fitness / health
  "week 1", "week 8", "lost", "gained", "lbs", "kg", "body",
  // beauty / fashion
  "look of the day", "ootd", "glam", "makeup look", "nail art",
  // general service result
  "finished project", "completed", "final result", "the reveal",
];

// ── Offer / promotion signals ───────────────────────────────────────────────
const OFFER_WORDS = [
  "discount", "% off", "free", "special offer", "deal", "limited time",
  "today only", "save ", "promo", "coupon", "sale", "promotion",
  "book now", "order now", "reserve now", "sign up", "register now",
  "limited spots", "first month free", "complimentary",
];

/**
 * Detect which content elements are present in this post's caption.
 *
 * Fully category-agnostic — works for food, real estate, fitness, beauty,
 * legal, retail, or any other Instagram business vertical.
 *
 * @param caption      full caption text
 * @param postType     "image" | "reel" | "carousel" | "video" | null
 * @param clientCity   client's city name for location_anchored detection
 */
export function detectContentElements(
  caption: string,
  postType: string | null | undefined,
  clientCity: string | null | undefined,
): ContentElement[] {
  const lower = caption.toLowerCase();
  const flags: ContentElement[] = [];

  // product_media — visual post type + product/service presentation language
  const isVisual = postType === "image" || postType === "carousel";
  if (isVisual && PRODUCT_MEDIA_WORDS.some((w) => lower.includes(w))) {
    flags.push("product_media");
  }

  // owner_team — explicit reference to the people behind the business
  if (OWNER_WORDS.some((w) => lower.includes(w))) {
    flags.push("owner_team");
  }

  // customer_focus — social proof, reviews, client mentions
  if (CUSTOMER_WORDS.some((w) => lower.includes(w))) {
    flags.push("customer_focus");
  }

  // process_shown — any work / craft / service process being demonstrated
  if (PROCESS_WORDS.some((w) => lower.includes(w))) {
    flags.push("process_shown");
  }

  // location_anchored — mentions client city or geo anchor words
  if (clientCity && lower.includes(clientCity.toLowerCase())) {
    flags.push("location_anchored");
  } else if (
    /\b(downtown|the village|old town|main street|local|neighbourhood|neighborhood|community|district|area|region|uptown|midtown|westside|eastside|north end|south end)\b/.test(
      lower,
    )
  ) {
    flags.push("location_anchored");
  }

  // offer_present — any promotional or conversion-driving content
  if (OFFER_WORDS.some((w) => lower.includes(w))) {
    flags.push("offer_present");
  }

  // personality — first-person voice used heavily (we/our 3+ times, or I/my 3+ times)
  const weCount = (lower.match(/\bwe\b|\bour\b/g) ?? []).length;
  const iCount = (lower.match(/\bi\b|\bmy\b|\bme\b/g) ?? []).length;
  if (weCount >= 3 || iCount >= 3) {
    flags.push("personality");
  }

  return flags;
}
