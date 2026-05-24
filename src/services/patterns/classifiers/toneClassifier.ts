export type ToneType =
  | "sales"
  | "educational"
  | "story"
  | "behind_scenes"
  | "community"
  | "announcement"
  | "product_showcase"
  | "mixed";

type ToneKeywords = { tone: ToneType; keywords: string[] };

const TONE_KEYWORDS: ToneKeywords[] = [
  {
    // Hard sell / promotional push — any business type
    tone: "sales",
    keywords: [
      "discount", "% off", "free", "special offer", "deal", "limited time",
      "today only", "save ", "promo", "coupon", "sale",
      "book now", "order now", "reserve now", "sign up today",
      "limited spots", "don't miss", "act now", "call us today",
    ],
  },
  {
    // Teaches the audience something — any expertise domain
    tone: "educational",
    keywords: [
      "how to", "did you know", "here's how", "the key to", "tip:",
      "tips ", "pro tip", "fun fact", "what most people", "common mistake",
      "the truth about", "everything you need to know", "guide to",
      "step by step", "explained", "we explain", "let me break down",
      "most people don't know", "the difference between", "myth:",
      "fact:", "you should know", "here's why",
    ],
  },
  {
    // Narrative / origin / personal journey — any personal brand or business
    tone: "story",
    keywords: [
      "years ago", "it started", "how it started", "our story",
      "when i ", "when we ", "i remember", "it all began",
      "looking back", "this time last year", "journey",
      "we started", "founded", "the beginning", "back in",
      "my story", "our journey", "humble beginnings",
      "from day one", "i never thought", "i didn't know",
    ],
  },
  {
    // Shows the work environment, team, or daily operations — any business
    tone: "behind_scenes",
    keywords: [
      "behind the scenes", "bts", "day in the life", "a day in",
      "our team", "sneak peek", "work in progress", "wip",
      "this morning", "today we", "on site", "at the office",
      "at our studio", "in our space", "our workspace", "meet the team",
      "prep day", "setting up", "getting ready for", "early morning",
      "making the", "building the", "designing the", "creating the",
    ],
  },
  {
    // Celebrates the audience, clients, or local community — any business
    tone: "community",
    keywords: [
      "thank you", "thanks to", "shoutout", "shout out", "shout-out",
      "we appreciate", "grateful", "honoured", "honored", "blessed",
      "our community", "our clients", "our customers", "our members",
      "our followers", "you guys", "you all", "everyone who",
      "congratulations", "congrats", "so proud of", "love seeing",
      "couldn't do it without", "because of you",
    ],
  },
  {
    // Something new, an event, or a milestone — any business
    tone: "announcement",
    keywords: [
      "new ", "now open", "just launched", "just opened", "just listed",
      "coming soon", "introducing ", "this week we", "excited to",
      "we're thrilled", "grand opening", "soft launch", "now available",
      "just dropped", "we're live", "announcing", "big news",
      "exciting news", "it's here", "we're expanding", "new location",
    ],
  },
  {
    // Showcases the core product or service result — any business vertical.
    // Intentionally kept generic: what matters is the promotional framing,
    // not the specific product category.
    tone: "product_showcase",
    keywords: [
      // universal result/quality signals
      "stunning", "beautiful", "gorgeous", "incredible", "amazing",
      "perfect", "flawless", "exceptional", "premium", "luxury",
      "one of a kind", "handcrafted", "bespoke", "custom",
      // visual presentation signals
      "take a look", "check this out", "here it is", "swipe to see",
      "before & after", "before and after", "the results",
      "the reveal", "final result", "finished look",
      // listing / availability signals (cross-vertical)
      "just listed", "available now", "on the market", "for sale",
      "now booking", "slots available", "limited availability",
    ],
  },
];

/**
 * Score caption against each tone's keyword set and return the dominant tone.
 *
 * Fully category-agnostic — works for food, real estate, fitness, beauty,
 * professional services, or any other Instagram business vertical.
 *
 * Returns "mixed" when no keywords match or when the top two tones
 * are within 1 point of each other (no clear winner).
 */
export function classifyTone(caption: string): ToneType {
  const lower = caption.toLowerCase();

  const scores: Record<ToneType, number> = {
    sales: 0,
    educational: 0,
    story: 0,
    behind_scenes: 0,
    community: 0,
    announcement: 0,
    product_showcase: 0,
    mixed: 0,
  };

  for (const { tone, keywords } of TONE_KEYWORDS) {
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[tone]++;
    }
  }

  const sorted = (Object.entries(scores) as [ToneType, number][])
    .filter(([t]) => t !== "mixed")
    .sort(([, a], [, b]) => b - a);

  const [first, second] = sorted;
  if (!first || first[1] === 0) return "mixed";
  if (second && first[1] - second[1] <= 1) return "mixed";

  return first[0];
}
