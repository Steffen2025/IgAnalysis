/**
 * Offline fixture render for the 30-Day Instagram Action Workbook.
 *
 * Postgres/Docker is not required: this builds a synthetic ReportData object
 * (clearly fictional sample data) so the Marp deck can be rendered and visually
 * self-reviewed for layout regressions — clipping, overflow, raw-markdown
 * artifacts, broken matrices — without a live audit in the database.
 *
 * Run: npx tsx src/scripts/renderWorkbookFixture.ts
 */
import { mkdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import type { ReportCompetitor, ReportData } from "../services/report/reportDataAssembler.js";
import { buildWorkbookViewModel } from "../services/marp-report/workbookViewModel.js";
import { composeWorkbookMarkdown } from "../services/marp-report/marpGenerator.js";
import { convertDeck } from "../services/marp-report/marpConverter.js";

const OUT_DIR = "reports/marp";
const FIXTURE_AUDIT_ID = 9999;
mkdirSync(OUT_DIR, { recursive: true });

function competitor(over: Partial<ReportCompetitor>): ReportCompetitor {
  return {
    id: 0,
    username: "sample",
    full_name: "Sample Co",
    competitor_type: "local_intel",
    geographic_market: "Burlington, ON",
    confidence_score: 0.8,
    deep_scraped: true,
    follower_count: 4200,
    post_count: 310,
    bio: "Sample bio",
    category: "Local business",
    profile_pic_url: null,
    latest_post: {
      posted_at: new Date(Date.now() - 4 * 864e5).toISOString(),
      post_type: "Reel",
      caption: "Behind the scenes on today's install — swipe to see the before.",
      hook: "You won't believe the before-and-after on this one.",
      display_url: null,
      post_url: "https://www.instagram.com/p/SAMPLE/",
    },
    top_posts: [
      { post_type: "Reel", caption: "x", engagement_rate: 0.05, hook_type: "question", tone: "warm", safeToReference: true },
    ],
    ...over,
  };
}

const competitors: ReportCompetitor[] = [
  competitor({ id: 1, username: "northsidegarage", full_name: "Northside Garage", follower_count: 5800, post_count: 412,
    latest_post: { posted_at: new Date(Date.now() - 2 * 864e5).toISOString(), post_type: "Reel", caption: "Quick brake job, big difference.", hook: "Most people ignore this until it squeals.", display_url: null, post_url: "https://www.instagram.com/p/A/" } }),
  competitor({ id: 2, username: "lakeshoreauto", full_name: "Lakeshore Auto Detailing", follower_count: 3100, post_count: 198,
    latest_post: { posted_at: new Date(Date.now() - 20 * 864e5).toISOString(), post_type: "Carousel", caption: "Interior detail walkthrough.", hook: "This interior was unrecognizable after.", display_url: null, post_url: "https://www.instagram.com/p/B/" } }),
  competitor({ id: 3, username: "dormantmotors", full_name: "Dormant Motors", follower_count: 1500, post_count: 90,
    latest_post: { posted_at: new Date(Date.now() - 140 * 864e5).toISOString(), post_type: "Image", caption: "Old post.", hook: null, display_url: null, post_url: null } }),
  competitor({ id: 4, username: "bigcityrefs", full_name: "Big City Auto Studio", competitor_type: "reference_model", geographic_market: "Toronto, ON", follower_count: 41000, post_count: 1200,
    latest_post: { posted_at: new Date(Date.now() - 1 * 864e5).toISOString(), post_type: "Reel", caption: "Studio reveal.", hook: "Here's how we shoot a reveal in 30 seconds.", display_url: null, post_url: "https://www.instagram.com/p/C/" } }),
  competitor({ id: 5, username: "refmodeltwo", full_name: "Reference Model Two", competitor_type: "reference_model", geographic_market: "Toronto, ON", follower_count: 22000, post_count: 640,
    latest_post: { posted_at: new Date(Date.now() - 9 * 864e5).toISOString(), post_type: "Carousel", caption: "Tip carousel.", hook: "Five things every owner gets wrong.", display_url: null, post_url: "https://www.instagram.com/p/D/" } }),
];

const data = {
  reportContext: {
    instagramUrl: "https://www.instagram.com/sampleclient/",
    handle: "sampleclient",
    displayName: "Sample Client Auto",
    businessName: "Sample Client Auto",
    businessDescriptionFromInstagramBio: "Family-run auto shop.",
    businessLocation: { city: "Burlington", region: "Ontario", country: "Canada" },
    businessClassification: "Local auto service business",
    localMarketLabel: "Burlington, ON",
    websiteUrl: "https://sampleclient.example",
    followerCount: 1240,
    postCount: 86,
    postsPerWeek: 1.2,
    scoreToday: 58,
    nextCheckpointDate: "June 27, 2026",
    preparedForName: "Sample Client",
    generatedAt: new Date().toISOString(),
  },
  audit: {
    id: FIXTURE_AUDIT_ID,
    business_name: "Sample Client Auto",
    instagram_url: "https://www.instagram.com/sampleclient/",
    website_url: "https://sampleclient.example",
    city: "Burlington",
    service_area: "Burlington & Halton",
    business_category: "Auto service",
    main_offer: "Full-service repair & detailing",
    target_audience: "Local vehicle owners",
    follower_goal: "2500",
    business_outcome: "More booked appointments",
    mode: "full",
    status_detail: null,
    created_at: new Date().toISOString(),
  },
  client: {
    profile: {
      username: "sampleclient", full_name: "Sample Client Auto", bio: "Family-run auto shop in Burlington. Repair • Detailing • Tires.",
      follower_count: 1240, following_count: 480, post_count: 86, is_business: true, is_verified: false,
      category: "Automotive", website_url: "https://sampleclient.example", external_url_in_bio: null,
      highlight_titles: ["Detailing", "Reviews"], profile_pic_url: null,
    },
    posts: Array.from({ length: 86 }, (_, i) => ({
      id: i, shortcode: `p${i}`, post_type: i % 3 === 0 ? "Reel" : "Image", caption: "Sample caption",
      like_count: 30, comment_count: 4, engagement_rate: 0.03, hook_type: "statement", tone: "warm",
      content_elements: [], hashtag_count: 6, posted_at: new Date(Date.now() - i * 3 * 864e5).toISOString(),
    })),
    topPosts: [],
    feature_summary: {
      avg_caption_length: 240, avg_emoji_density: 0.4, avg_hashtag_count: 6.2,
      hook_distribution: { statement: 40, question: 12 }, tone_distribution: { warm: 50 },
      post_type_distribution: { Image: 56, Reel: 30 },
    },
  },
  competitors,
  scores: {
    overall: 58, profile_conversion: 64, content_performance: 52, local_visibility: 38,
    sales_readiness: 60, competitor_gap: 55, signals: {},
  },
  patterns: {
    category: {
      caption: { avgLength: 180 },
      hashtags: { avgCountPerPost: 9.4 },
      postTypes: { distribution: { Reel: 48, Carousel: 30, Image: 22 } },
    },
    client: {},
    gaps: [],
  },
  hashtagHygiene: {},
  comments: { summary: {}, topQuestions: [], topTaggingComments: [], topConcerns: [], audienceLanguage: [] },
} as unknown as ReportData;

const sections: Record<string, string> = {
  top_5_fixes: `| # | Fix | Why it matters | How | Impact | Effort |
|---|-----|----------------|-----|--------|--------|
| 1 | Add city + service to your bio name field | Locals search by area; the name field is indexed | Edit profile → Name: "Sample Client Auto — Burlington" | High | Low |
| 2 | Post 3 Reels a week showing real jobs | Reels reach non-followers; you mostly post static images | Film before/after on your phone, 15s each | High | Medium |
| 3 | Pin three proof posts to the top | First impression converts profile visitors | Pin a review, a result, and an offer | Medium | Low |
| 4 | Reply to every comment within an hour | Engagement velocity boosts reach | Turn on notifications, batch replies | Medium | Medium |
| 5 | Use a tight 8-hashtag local set | Bloated tag lists look spammy and dilute reach | Build one saved set, reuse it | Low | Low |`,
  next_7_days: `**Day 1 — Fix the bio.** Add city and service to the name field.
**Day 2 — Film two Reels.** Before/after of today's jobs.
**Day 3 — Pin proof.** Pin a review and a result post.
**Day 4 — Reply sprint.** Clear every unanswered comment.
**Day 5 — Build hashtag set.** One saved 8-tag local set.
**Day 6 — Post a customer story.** Tag the customer.
**Day 7 — Review.** Note which post got the most reach.`,
  do_this_next: `Open Instagram now and change your name field to include "Burlington". It takes 30 seconds and it is the single highest-leverage move on this list.`,
  local_visibility: `Use a saved set of 8 local tags: #burlingtonont #burlingtonbusiness #haltonregion #burlingtonauto plus 4 service tags. Avoid 30-tag dumps.`,
};

async function buildVariant(theme: "dark" | "light") {
  const vm = await buildWorkbookViewModel(data, FIXTURE_AUDIT_ID);
  const markdown = composeWorkbookMarkdown(data, vm, sections, theme);
  const base = `fixture-workbook-${theme}`;
  const mdPath = join(OUT_DIR, `${base}.md`);
  writeFileSync(mdPath, markdown, "utf8");
  const slideCount = (markdown.match(/^---$/gm) ?? []).length;
  console.log(`\n${theme.toUpperCase()} — ${slideCount} separators, ${Math.round(Buffer.byteLength(markdown) / 1024)} KB md`);
  const outputs = await convertDeck(mdPath, OUT_DIR, base, `themes/botlogix-${theme}.css`);
  const kb = (p: string) => { try { return `${Math.round(statSync(p).size / 1024)} KB`; } catch { return "MISSING"; } };
  console.log(`  pdf  ${outputs.pdf}  ${kb(outputs.pdf)}`);
  console.log(`  html ${outputs.html}  ${kb(outputs.html)}`);
  return outputs;
}

await buildVariant("light");
await buildVariant("dark");
console.log("\nFixture render complete.");
