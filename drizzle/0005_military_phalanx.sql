CREATE TABLE `llm_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prompt_hash` text NOT NULL,
	`model` text NOT NULL,
	`prompt` text NOT NULL,
	`response` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `llm_cache_prompt_hash_unique` ON `llm_cache` (`prompt_hash`);--> statement-breakpoint
ALTER TABLE `comments` ADD `comment_length` integer;--> statement-breakpoint
ALTER TABLE `comments` ADD `has_question` integer;--> statement-breakpoint
ALTER TABLE `comments` ADD `has_tag` integer;--> statement-breakpoint
ALTER TABLE `comments` ADD `emoji_count` integer;--> statement-breakpoint
ALTER TABLE `hashtags` ADD `geo_enhanced` integer DEFAULT false NOT NULL;