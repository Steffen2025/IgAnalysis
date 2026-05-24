CREATE TABLE `content_patterns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`audit_id` integer NOT NULL,
	`scope` text NOT NULL,
	`patterns_json` text NOT NULL,
	`post_count` integer DEFAULT 0 NOT NULL,
	`calculated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `audits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `competitor_posts` ADD `caption_length` integer;--> statement-breakpoint
ALTER TABLE `competitor_posts` ADD `emoji_count` integer;--> statement-breakpoint
ALTER TABLE `competitor_posts` ADD `emoji_density` real;--> statement-breakpoint
ALTER TABLE `competitor_posts` ADD `hook_type` text;--> statement-breakpoint
ALTER TABLE `competitor_posts` ADD `tone` text;--> statement-breakpoint
ALTER TABLE `competitor_posts` ADD `content_elements` text;--> statement-breakpoint
ALTER TABLE `competitor_posts` ADD `hashtag_count` integer;--> statement-breakpoint
ALTER TABLE `posts` ADD `caption_length` integer;--> statement-breakpoint
ALTER TABLE `posts` ADD `emoji_count` integer;--> statement-breakpoint
ALTER TABLE `posts` ADD `emoji_density` real;--> statement-breakpoint
ALTER TABLE `posts` ADD `hook_type` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `tone` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `content_elements` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `hashtag_count` integer;