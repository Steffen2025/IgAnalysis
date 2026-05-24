CREATE TABLE `scrape_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cache_key` text NOT NULL,
	`data_json` text NOT NULL,
	`scraped_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scrape_cache_cache_key_unique` ON `scrape_cache` (`cache_key`);--> statement-breakpoint
ALTER TABLE `audits` ADD `status_detail` text;