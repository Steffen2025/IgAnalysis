CREATE TABLE "audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"business_name" text,
	"instagram_url" text,
	"website_url" text,
	"city" text,
	"service_area" text,
	"business_category" text,
	"main_offer" text,
	"target_audience" text,
	"follower_goal" text,
	"business_outcome" text,
	"delivery_email" text,
	"report_type" text,
	"status_detail" text,
	"reference_markets" text,
	"mode" text DEFAULT 'mixed' NOT NULL,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"week_number" integer NOT NULL,
	"day_of_week" text NOT NULL,
	"content_type" text NOT NULL,
	"topic" text,
	"hook" text,
	"cta" text,
	"content_pillar" text,
	"goal" text,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"post_id" integer,
	"competitor_post_id" integer,
	"commenter_username" text,
	"comment_text" text,
	"sentiment" text,
	"comment_length" integer,
	"has_question" boolean,
	"has_tag" boolean,
	"emoji_count" integer,
	"scraped_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitor_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"competitor_id" integer NOT NULL,
	"audit_id" integer NOT NULL,
	"post_type" text,
	"caption" text,
	"like_count" integer,
	"comment_count" integer,
	"play_count" integer,
	"posted_at" text,
	"hashtags" text,
	"location_name" text,
	"hook_text" text,
	"has_cta" boolean,
	"engagement_rate" real,
	"follower_count_snapshot" integer,
	"caption_length" integer,
	"emoji_count" integer,
	"emoji_density" real,
	"hook_type" text,
	"tone" text,
	"content_elements" text,
	"hashtag_count" integer,
	"raw_json" text,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitor_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"competitor_id" integer NOT NULL,
	"audit_id" integer NOT NULL,
	"scraped_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"follower_count" integer,
	"following_count" integer,
	"post_count" integer,
	"is_business" boolean,
	"bio" text,
	"category" text,
	"raw_json" text,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"username" text NOT NULL,
	"source" text NOT NULL,
	"discovery_keyword" text,
	"competitor_type" text,
	"geographic_market" text,
	"discovery_query" text,
	"confidence_score" integer,
	"deep_scraped" boolean DEFAULT false NOT NULL,
	"skip_reason" text,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_ideas" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"content_type" text NOT NULL,
	"hook" text,
	"talking_points" text,
	"caption_template" text,
	"cta" text,
	"local_angle" text,
	"content_pillar" text,
	"data_reason" text,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"scope" text NOT NULL,
	"patterns_json" text NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"calculated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hashtags" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"hashtag" text NOT NULL,
	"source" text NOT NULL,
	"post_count" integer,
	"geo_enhanced" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"prompt_hash" text NOT NULL,
	"model" text NOT NULL,
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	CONSTRAINT "llm_cache_prompt_hash_unique" UNIQUE("prompt_hash")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"profile_id" integer NOT NULL,
	"scraped_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"shortcode" text,
	"post_type" text,
	"caption" text,
	"hashtags" text,
	"mentions" text,
	"location_name" text,
	"location_id" text,
	"like_count" integer,
	"comment_count" integer,
	"play_count" integer,
	"posted_at" text,
	"hook_text" text,
	"has_cta" boolean,
	"has_local_reference" boolean,
	"engagement_rate" real,
	"follower_count_snapshot" integer,
	"caption_length" integer,
	"emoji_count" integer,
	"emoji_density" real,
	"hook_type" text,
	"tone" text,
	"content_elements" text,
	"hashtag_count" integer,
	"raw_json" text,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"scraped_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"username" text,
	"full_name" text,
	"bio" text,
	"follower_count" integer,
	"following_count" integer,
	"post_count" integer,
	"is_business" boolean,
	"is_verified" boolean,
	"category" text,
	"website_url" text,
	"external_url_in_bio" text,
	"highlight_titles" text,
	"raw_json" text,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"section" text NOT NULL,
	"priority" text NOT NULL,
	"what_to_do" text NOT NULL,
	"why_it_matters" text,
	"how_to_execute" text,
	"expected_impact" text,
	"effort" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"kind" text NOT NULL,
	"theme" text DEFAULT 'standard' NOT NULL,
	"path" text NOT NULL,
	"size_bytes" integer,
	"generated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"email_to" text NOT NULL,
	"artifact_path" text,
	"status" text NOT NULL,
	"error_message" text,
	"sent_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"section_key" text NOT NULL,
	"content_markdown" text,
	"generated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"token_count" integer,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"profile_conversion_score" integer,
	"content_performance_score" integer,
	"local_visibility_score" integer,
	"sales_readiness_score" integer,
	"competitor_gap_score" integer,
	"overall_score" integer,
	"score_explanations" text,
	"calculated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrape_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"cache_key" text NOT NULL,
	"data_json" text NOT NULL,
	"scraped_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	CONSTRAINT "scrape_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE "scrape_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_id" integer NOT NULL,
	"actor_id" text NOT NULL,
	"actor_label" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"apify_run_id" text,
	"input_json" text,
	"started_at" text,
	"completed_at" text,
	"item_count" integer,
	"error_message" text,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_items" ADD CONSTRAINT "calendar_items_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_competitor_post_id_competitor_posts_id_fk" FOREIGN KEY ("competitor_post_id") REFERENCES "public"."competitor_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_posts" ADD CONSTRAINT "competitor_posts_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_posts" ADD CONSTRAINT "competitor_posts_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_profiles" ADD CONSTRAINT "competitor_profiles_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_profiles" ADD CONSTRAINT "competitor_profiles_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_patterns" ADD CONSTRAINT "content_patterns_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hashtags" ADD CONSTRAINT "hashtags_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_artifacts" ADD CONSTRAINT "report_artifacts_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_deliveries" ADD CONSTRAINT "report_deliveries_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_sections" ADD CONSTRAINT "report_sections_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_jobs" ADD CONSTRAINT "scrape_jobs_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;