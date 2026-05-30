CREATE TABLE IF NOT EXISTS "cover_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" integer NOT NULL,
	"on_image_text" text,
	"layout" text,
	"has_face" boolean,
	"palette" text,
	"style_notes" text,
	"vision_model" text,
	"image_hash" text,
	"analyzed_at" text,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reel_transcripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" integer NOT NULL,
	"transcript" text,
	"hook_text" text,
	"word_timings" text,
	"deepgram_model" text,
	"transcribed_at" text,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teardown_artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"teardown_id" integer NOT NULL,
	"kind" text NOT NULL,
	"path" text NOT NULL,
	"size_bytes" integer,
	"generated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teardown_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" integer NOT NULL,
	"commenter_username" text,
	"comment_text" text,
	"comment_length" integer,
	"has_question" boolean,
	"has_tag" boolean,
	"emoji_count" integer,
	"scraped_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"raw_json" text,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teardown_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"teardown_id" integer NOT NULL,
	"shortcode" text,
	"content_type" text NOT NULL,
	"caption" text,
	"hashtags" text,
	"mentions" text,
	"like_count" integer,
	"comment_count" integer,
	"play_count" integer,
	"posted_at" text,
	"cover_url" text,
	"video_url" text,
	"child_count" integer,
	"child_media" text,
	"is_story" boolean DEFAULT false NOT NULL,
	"engagement_rate" real,
	"caption_length" integer,
	"hashtag_count" integer,
	"integrity_flag" text DEFAULT 'ok' NOT NULL,
	"captured_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"raw_json" text,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teardowns" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"phase" text DEFAULT 'CREATED' NOT NULL,
	"target_url" text NOT NULL,
	"target_handle" text,
	"business_unit" text,
	"content_window" integer DEFAULT 100 NOT NULL,
	"requested_count" integer,
	"captured_count" integer,
	"full_name" text,
	"bio" text,
	"follower_count" integer,
	"following_count" integer,
	"post_count" integer,
	"is_business" boolean,
	"is_verified" boolean,
	"category" text,
	"external_url_in_bio" text,
	"highlight_titles" text,
	"profile_raw_json" text,
	"integrity_json" text,
	"partial_flags" text,
	"started_at" text,
	"completed_at" text,
	"error_message" text,
	"created_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL,
	"updated_at" text DEFAULT (CURRENT_TIMESTAMP)::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scrape_jobs" ALTER COLUMN "audit_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scrape_jobs" ADD COLUMN IF NOT EXISTS "teardown_id" integer;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cover_analyses_content_id_teardown_content_id_fk') THEN ALTER TABLE "cover_analyses" ADD CONSTRAINT "cover_analyses_content_id_teardown_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."teardown_content"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reel_transcripts_content_id_teardown_content_id_fk') THEN ALTER TABLE "reel_transcripts" ADD CONSTRAINT "reel_transcripts_content_id_teardown_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."teardown_content"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teardown_artifacts_teardown_id_teardowns_id_fk') THEN ALTER TABLE "teardown_artifacts" ADD CONSTRAINT "teardown_artifacts_teardown_id_teardowns_id_fk" FOREIGN KEY ("teardown_id") REFERENCES "public"."teardowns"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teardown_comments_content_id_teardown_content_id_fk') THEN ALTER TABLE "teardown_comments" ADD CONSTRAINT "teardown_comments_content_id_teardown_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."teardown_content"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teardown_content_teardown_id_teardowns_id_fk') THEN ALTER TABLE "teardown_content" ADD CONSTRAINT "teardown_content_teardown_id_teardowns_id_fk" FOREIGN KEY ("teardown_id") REFERENCES "public"."teardowns"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scrape_jobs_teardown_id_teardowns_id_fk') THEN ALTER TABLE "scrape_jobs" ADD CONSTRAINT "scrape_jobs_teardown_id_teardowns_id_fk" FOREIGN KEY ("teardown_id") REFERENCES "public"."teardowns"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;