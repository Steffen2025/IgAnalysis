CREATE TABLE `audits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`business_name` text,
	`instagram_url` text,
	`website_url` text,
	`city` text,
	`service_area` text,
	`business_category` text,
	`main_offer` text,
	`target_audience` text,
	`follower_goal` text,
	`business_outcome` text,
	`report_type` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendar_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` integer NOT NULL,
	`week_number` integer NOT NULL,
	`day_of_week` text NOT NULL,
	`content_type` text NOT NULL,
	`topic` text,
	`hook` text,
	`cta` text,
	`content_pillar` text,
	`goal` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` integer NOT NULL,
	`post_id` integer,
	`competitor_post_id` integer,
	`commenter_username` text,
	`comment_text` text,
	`sentiment` text,
	`scraped_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`competitor_post_id`) REFERENCES `competitor_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `competitor_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`competitor_id` integer NOT NULL,
	`audit_id` integer NOT NULL,
	`post_type` text,
	`caption` text,
	`like_count` integer,
	`comment_count` integer,
	`play_count` integer,
	`posted_at` text,
	`hashtags` text,
	`location_name` text,
	`hook_text` text,
	`has_cta` integer,
	`raw_json` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`competitor_id`) REFERENCES `competitors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `competitor_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`competitor_id` integer NOT NULL,
	`audit_id` integer NOT NULL,
	`scraped_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`follower_count` integer,
	`following_count` integer,
	`post_count` integer,
	`is_business` integer,
	`bio` text,
	`category` text,
	`raw_json` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`competitor_id`) REFERENCES `competitors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `competitors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` integer NOT NULL,
	`username` text NOT NULL,
	`source` text NOT NULL,
	`discovery_keyword` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `content_ideas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` integer NOT NULL,
	`content_type` text NOT NULL,
	`hook` text,
	`talking_points` text,
	`caption_template` text,
	`cta` text,
	`local_angle` text,
	`content_pillar` text,
	`data_reason` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `hashtags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` integer NOT NULL,
	`hashtag` text NOT NULL,
	`source` text NOT NULL,
	`post_count` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` integer NOT NULL,
	`profile_id` integer NOT NULL,
	`scraped_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`shortcode` text,
	`post_type` text,
	`caption` text,
	`hashtags` text,
	`mentions` text,
	`location_name` text,
	`location_id` text,
	`like_count` integer,
	`comment_count` integer,
	`play_count` integer,
	`posted_at` text,
	`hook_text` text,
	`has_cta` integer,
	`has_local_reference` integer,
	`raw_json` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` integer NOT NULL,
	`scraped_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`username` text,
	`full_name` text,
	`bio` text,
	`follower_count` integer,
	`following_count` integer,
	`post_count` integer,
	`is_business` integer,
	`is_verified` integer,
	`category` text,
	`website_url` text,
	`external_url_in_bio` text,
	`highlight_titles` text,
	`raw_json` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` integer NOT NULL,
	`section` text NOT NULL,
	`priority` text NOT NULL,
	`what_to_do` text NOT NULL,
	`why_it_matters` text,
	`how_to_execute` text,
	`expected_impact` text,
	`effort` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `report_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` integer NOT NULL,
	`section_key` text NOT NULL,
	`content_markdown` text,
	`generated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`token_count` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` integer NOT NULL,
	`profile_conversion_score` integer,
	`content_performance_score` integer,
	`local_visibility_score` integer,
	`sales_readiness_score` integer,
	`competitor_gap_score` integer,
	`overall_score` integer,
	`score_explanations` text,
	`calculated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scrape_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` integer NOT NULL,
	`actor_id` text NOT NULL,
	`actor_label` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`apify_run_id` text,
	`input_json` text,
	`started_at` text,
	`completed_at` text,
	`item_count` integer,
	`error_message` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
