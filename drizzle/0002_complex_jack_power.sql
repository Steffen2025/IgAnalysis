ALTER TABLE `audits` ADD `reference_markets` text;--> statement-breakpoint
ALTER TABLE `audits` ADD `mode` text DEFAULT 'mixed' NOT NULL;--> statement-breakpoint
ALTER TABLE `competitors` ADD `competitor_type` text;--> statement-breakpoint
ALTER TABLE `competitors` ADD `geographic_market` text;--> statement-breakpoint
ALTER TABLE `competitors` ADD `discovery_query` text;--> statement-breakpoint
ALTER TABLE `competitors` ADD `confidence_score` integer;--> statement-breakpoint
ALTER TABLE `competitors` ADD `deep_scraped` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `competitors` ADD `skip_reason` text;