import { sqliteTable, integer, real, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Shared timestamp columns. Every table gets created_at and updated_at, auto-managed.
const timestamps = {
  created_at: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
};

// audits — top-level record of an analysis run for a single business. Everything else hangs off this.
export const audits = sqliteTable("audits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  status: text("status", {
    enum: ["queued", "scraping", "analyzing", "complete", "failed"],
  })
    .notNull()
    .default("queued"),
  business_name: text("business_name"),
  instagram_url: text("instagram_url"),
  website_url: text("website_url"),
  city: text("city"),
  service_area: text("service_area"),
  business_category: text("business_category"),
  main_offer: text("main_offer"),
  target_audience: text("target_audience"),
  follower_goal: text("follower_goal"),
  business_outcome: text("business_outcome"),
  report_type: text("report_type", {
    enum: ["growth", "local_lead_gen", "competitor_intel", "full_gtm"],
  }),
  status_detail: text("status_detail", {
    enum: [
      "CREATED",
      "CLIENT_PROFILE",
      "CLIENT_POSTS",
      "LOCAL_DISCOVERY",
      "REFERENCE_DISCOVERY",
      "COMPETITORS_QUEUED",
      "COMPETITORS_DONE",
      "HASHTAGS_DONE",
      "READY_FOR_ANALYSIS",
      "SCORING_COMPLETE",
      "CONTENT_PATTERNS_COMPLETE",
      "ENRICHMENT_COMPLETE",
      "REPORT_GENERATED",
      "ANALYZING",
      "COMPLETE",
      "FAILED",
    ],
  }),
  reference_markets: text("reference_markets"), // JSON array of "City, Region" strings
  mode: text("mode", { enum: ["local_only", "reference_only", "mixed"] })
    .notNull()
    .default("mixed"),
  ...timestamps,
});

// scrape_cache — TTL-bounded cache of normalized Apify results, keyed by actor + identifier.
export const scrape_cache = sqliteTable("scrape_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cache_key: text("cache_key").notNull().unique(),
  data_json: text("data_json").notNull(),
  scraped_at: text("scraped_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  expires_at: text("expires_at").notNull(),
  ...timestamps,
});

// profiles — scraped Instagram profile snapshot for the audited business.
export const profiles = sqliteTable("profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  scraped_at: text("scraped_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  username: text("username"),
  full_name: text("full_name"),
  bio: text("bio"),
  follower_count: integer("follower_count"),
  following_count: integer("following_count"),
  post_count: integer("post_count"),
  is_business: integer("is_business", { mode: "boolean" }),
  is_verified: integer("is_verified", { mode: "boolean" }),
  category: text("category"),
  website_url: text("website_url"),
  external_url_in_bio: text("external_url_in_bio"),
  highlight_titles: text("highlight_titles"), // JSON array as text
  raw_json: text("raw_json"),
  ...timestamps,
});

// posts — individual posts scraped from the audited business's profile.
export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  profile_id: integer("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  scraped_at: text("scraped_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  shortcode: text("shortcode"),
  post_type: text("post_type", {
    enum: ["reel", "carousel", "image", "video"],
  }),
  caption: text("caption"),
  hashtags: text("hashtags"), // JSON array as text
  mentions: text("mentions"), // JSON array as text
  location_name: text("location_name"),
  location_id: text("location_id"),
  like_count: integer("like_count"),
  comment_count: integer("comment_count"),
  play_count: integer("play_count"),
  posted_at: text("posted_at"),
  hook_text: text("hook_text"),
  has_cta: integer("has_cta", { mode: "boolean" }),
  has_local_reference: integer("has_local_reference", { mode: "boolean" }),
  engagement_rate: real("engagement_rate"),
  follower_count_snapshot: integer("follower_count_snapshot"),
  // Step 5.3 feature columns
  caption_length: integer("caption_length"),
  emoji_count: integer("emoji_count"),
  emoji_density: real("emoji_density"),
  hook_type: text("hook_type"),
  tone: text("tone"),
  content_elements: text("content_elements"), // JSON array
  hashtag_count: integer("hashtag_count"),
  raw_json: text("raw_json"),
  ...timestamps,
});

// competitors — accounts identified as competitors to the audited business.
export const competitors = sqliteTable("competitors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  source: text("source", {
    enum: [
      "user_provided",
      "instagram_search",
      "google_maps",
      "hashtag_discovery",
      "reference_search",
    ],
  }).notNull(),
  discovery_keyword: text("discovery_keyword"),
  competitor_type: text("competitor_type", {
    enum: ["local_intel", "reference_model"],
  }),
  geographic_market: text("geographic_market"),
  discovery_query: text("discovery_query"),
  confidence_score: integer("confidence_score"),
  deep_scraped: integer("deep_scraped", { mode: "boolean" })
    .notNull()
    .default(false),
  skip_reason: text("skip_reason"),
  ...timestamps,
});

// competitor_profiles — scraped profile snapshot for a competitor account.
export const competitor_profiles = sqliteTable("competitor_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  competitor_id: integer("competitor_id")
    .notNull()
    .references(() => competitors.id, { onDelete: "cascade" }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  scraped_at: text("scraped_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  follower_count: integer("follower_count"),
  following_count: integer("following_count"),
  post_count: integer("post_count"),
  is_business: integer("is_business", { mode: "boolean" }),
  bio: text("bio"),
  category: text("category"),
  raw_json: text("raw_json"),
  ...timestamps,
});

// competitor_posts — individual posts scraped from a competitor's profile.
export const competitor_posts = sqliteTable("competitor_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  competitor_id: integer("competitor_id")
    .notNull()
    .references(() => competitors.id, { onDelete: "cascade" }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  post_type: text("post_type", {
    enum: ["reel", "carousel", "image", "video"],
  }),
  caption: text("caption"),
  like_count: integer("like_count"),
  comment_count: integer("comment_count"),
  play_count: integer("play_count"),
  posted_at: text("posted_at"),
  hashtags: text("hashtags"), // JSON array as text
  location_name: text("location_name"),
  hook_text: text("hook_text"),
  has_cta: integer("has_cta", { mode: "boolean" }),
  engagement_rate: real("engagement_rate"),
  follower_count_snapshot: integer("follower_count_snapshot"),
  // Step 5.3 feature columns
  caption_length: integer("caption_length"),
  emoji_count: integer("emoji_count"),
  emoji_density: real("emoji_density"),
  hook_type: text("hook_type"),
  tone: text("tone"),
  content_elements: text("content_elements"), // JSON array
  hashtag_count: integer("hashtag_count"),
  raw_json: text("raw_json"),
  ...timestamps,
});

// content_patterns — aggregated pattern analysis results per audit and scope.
export const content_patterns = sqliteTable("content_patterns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  scope: text("scope", {
    enum: ["category_corpus", "client_only", "reference_only", "local_only"],
  }).notNull(),
  patterns_json: text("patterns_json").notNull(),
  post_count: integer("post_count").notNull().default(0),
  calculated_at: text("calculated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  ...timestamps,
});

// hashtags — every hashtag discovered during the audit, tagged with its source.
export const hashtags = sqliteTable("hashtags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  hashtag: text("hashtag").notNull(),
  source: text("source", {
    enum: [
      "client_post",
      "competitor_post",
      "local_search",
      "user_provided",
      "strategic_research",
      "local_awareness",
      "branded_local",
    ],
  }).notNull(),
  post_count: integer("post_count"),
  geo_enhanced: integer("geo_enhanced", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

// comments — engagement-level signal from a post (client or competitor).
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  post_id: integer("post_id").references(() => posts.id, {
    onDelete: "cascade",
  }),
  competitor_post_id: integer("competitor_post_id").references(
    () => competitor_posts.id,
    { onDelete: "cascade" },
  ),
  commenter_username: text("commenter_username"),
  comment_text: text("comment_text"),
  sentiment: text("sentiment", {
    enum: ["positive", "neutral", "negative"],
  }),
  comment_length: integer("comment_length"),
  has_question: integer("has_question", { mode: "boolean" }),
  has_tag: integer("has_tag", { mode: "boolean" }),
  emoji_count: integer("emoji_count"),
  scraped_at: text("scraped_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  ...timestamps,
});

// scrape_jobs — record of every Apify (or other) scrape invoked for an audit.
export const scrape_jobs = sqliteTable("scrape_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  actor_id: text("actor_id").notNull(),
  actor_label: text("actor_label").notNull(),
  status: text("status", {
    enum: ["queued", "running", "complete", "failed", "skipped"],
  })
    .notNull()
    .default("queued"),
  apify_run_id: text("apify_run_id"),
  input_json: text("input_json"),
  started_at: text("started_at"),
  completed_at: text("completed_at"),
  item_count: integer("item_count"),
  error_message: text("error_message"),
  ...timestamps,
});

// scores — computed scorecard for the audit across the five core dimensions.
export const scores = sqliteTable("scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  profile_conversion_score: integer("profile_conversion_score"),
  content_performance_score: integer("content_performance_score"),
  local_visibility_score: integer("local_visibility_score"),
  sales_readiness_score: integer("sales_readiness_score"),
  competitor_gap_score: integer("competitor_gap_score"),
  overall_score: integer("overall_score"),
  score_explanations: text("score_explanations"), // JSON: explanation per score
  calculated_at: text("calculated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  ...timestamps,
});

// recommendations — actionable items the report tells the business to do.
export const recommendations = sqliteTable("recommendations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  section: text("section").notNull(),
  priority: text("priority", {
    enum: ["critical", "high", "medium", "low"],
  }).notNull(),
  what_to_do: text("what_to_do").notNull(),
  why_it_matters: text("why_it_matters"),
  how_to_execute: text("how_to_execute"),
  expected_impact: text("expected_impact"),
  effort: text("effort", { enum: ["low", "medium", "high"] }),
  status: text("status", { enum: ["pending", "done"] })
    .notNull()
    .default("pending"),
  ...timestamps,
});

// content_ideas — generated content concepts tailored to the business.
export const content_ideas = sqliteTable("content_ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  content_type: text("content_type", {
    enum: ["reel", "carousel", "story", "post"],
  }).notNull(),
  hook: text("hook"),
  talking_points: text("talking_points"), // JSON array as text
  caption_template: text("caption_template"),
  cta: text("cta"),
  local_angle: text("local_angle"),
  content_pillar: text("content_pillar"),
  data_reason: text("data_reason"),
  ...timestamps,
});

// calendar_items — 4-week posting calendar derived from content_ideas + strategy.
export const calendar_items = sqliteTable("calendar_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  week_number: integer("week_number").notNull(),
  day_of_week: text("day_of_week").notNull(),
  content_type: text("content_type", {
    enum: ["reel", "carousel", "story", "post"],
  }).notNull(),
  topic: text("topic"),
  hook: text("hook"),
  cta: text("cta"),
  content_pillar: text("content_pillar"),
  goal: text("goal"),
  ...timestamps,
});

// report_sections — rendered markdown blocks that make up the final deliverable.
export const report_sections = sqliteTable("report_sections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  audit_id: integer("audit_id")
    .notNull()
    .references(() => audits.id, { onDelete: "cascade" }),
  section_key: text("section_key").notNull(),
  content_markdown: text("content_markdown"),
  generated_at: text("generated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  token_count: integer("token_count"),
  ...timestamps,
});

// llm_cache — TTL-bounded cache of LLM responses, keyed by sha1(model+prompt).
export const llm_cache = sqliteTable("llm_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  prompt_hash: text("prompt_hash").notNull().unique(),
  model: text("model").notNull(),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  expires_at: text("expires_at").notNull(),
  ...timestamps,
});

// Row + insert types for every table — import these from elsewhere.
export type Audit = typeof audits.$inferSelect;
export type NewAudit = typeof audits.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Competitor = typeof competitors.$inferSelect;
export type NewCompetitor = typeof competitors.$inferInsert;
export type CompetitorProfile = typeof competitor_profiles.$inferSelect;
export type NewCompetitorProfile = typeof competitor_profiles.$inferInsert;
export type CompetitorPost = typeof competitor_posts.$inferSelect;
export type NewCompetitorPost = typeof competitor_posts.$inferInsert;
export type Hashtag = typeof hashtags.$inferSelect;
export type NewHashtag = typeof hashtags.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type ScrapeJob = typeof scrape_jobs.$inferSelect;
export type NewScrapeJob = typeof scrape_jobs.$inferInsert;
export type Score = typeof scores.$inferSelect;
export type NewScore = typeof scores.$inferInsert;
export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;
export type ContentIdea = typeof content_ideas.$inferSelect;
export type NewContentIdea = typeof content_ideas.$inferInsert;
export type CalendarItem = typeof calendar_items.$inferSelect;
export type NewCalendarItem = typeof calendar_items.$inferInsert;
export type ReportSection = typeof report_sections.$inferSelect;
export type NewReportSection = typeof report_sections.$inferInsert;
export type ScrapeCache = typeof scrape_cache.$inferSelect;
export type NewScrapeCache = typeof scrape_cache.$inferInsert;
export type ContentPattern = typeof content_patterns.$inferSelect;
export type NewContentPattern = typeof content_patterns.$inferInsert;
export type LlmCache = typeof llm_cache.$inferSelect;
export type NewLlmCache = typeof llm_cache.$inferInsert;
