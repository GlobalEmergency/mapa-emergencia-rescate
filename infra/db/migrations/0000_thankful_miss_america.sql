CREATE TABLE IF NOT EXISTS "analytics_events" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"type" text NOT NULL,
	"path" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"referrer" text DEFAULT '' NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"screen" text DEFAULT '' NOT NULL,
	"language" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Anónimo' NOT NULL,
	"role" text DEFAULT 'ciudadano' NOT NULL,
	"text" text NOT NULL,
	"reply_to" text,
	"reply_preview" text,
	"thread_root_id" text,
	"thread_bumped_at" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "click_counter_dedup" (
	"counter_key" text NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "click_counter_dedup_counter_key_ip_hash_pk" PRIMARY KEY("counter_key","ip_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "click_counters" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"ip_hash" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "damage_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"building_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"damage_level" text NOT NULL,
	"confidence" double precision DEFAULT 0 NOT NULL,
	"review_status" text DEFAULT 'needs_review' NOT NULL,
	"source_before" text DEFAULT '' NOT NULL,
	"source_after" text DEFAULT '' NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "donations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"amount_usd" integer NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"created_at" bigint NOT NULL,
	"status" text DEFAULT 'intent' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "geocode_cache" (
	"normalized_key" text PRIMARY KEY NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospital_patients" (
	"id" text PRIMARY KEY NOT NULL,
	"hospital_id" text NOT NULL,
	"name" text NOT NULL,
	"age" integer,
	"condition" text DEFAULT 'unknown' NOT NULL,
	"status" text DEFAULT 'hospitalized' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"admitted_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospitals" (
	"id" text PRIMARY KEY NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"facility_type" text DEFAULT 'hospital' NOT NULL,
	"state" text DEFAULT '' NOT NULL,
	"municipality" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"level" text,
	"priority_zone" text DEFAULT 'P3' NOT NULL,
	"is_priority" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "missing_persons" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"age" integer,
	"description" text DEFAULT '' NOT NULL,
	"last_seen" text DEFAULT '' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"photo" text,
	"status" text DEFAULT 'active' NOT NULL,
	"resolution_note" text,
	"resolution_photo" text,
	"resolved_at" bigint,
	"external_id" text,
	"source" text,
	"source_url" text,
	"photo_external_url" text,
	"lat" double precision,
	"lng" double precision,
	"created_at" bigint NOT NULL,
	"photo_migrated_at" bigint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_confirmations" (
	"report_id" text NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "report_confirmations_report_id_ip_hash_pk" PRIMARY KEY("report_id","ip_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"place" text NOT NULL,
	"affected" integer DEFAULT 0 NOT NULL,
	"needs" text DEFAULT '' NOT NULL,
	"photo" text,
	"confirmations" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"photo_migrated_at" bigint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"trigger" text,
	"ok" boolean NOT NULL,
	"fetched" integer DEFAULT 0 NOT NULL,
	"inserted" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	"from_page" integer,
	"to_page" integer,
	"next_page" integer,
	"cycle_completed" boolean,
	"error" text,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"started_at" bigint NOT NULL,
	"finished_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_state" (
	"source" text PRIMARY KEY NOT NULL,
	"next_page" integer DEFAULT 1 NOT NULL,
	"total_pages" integer,
	"last_run_at" bigint,
	"last_cycle_completed_at" bigint,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unidentified_persons" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'alive' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"surname" text DEFAULT '' NOT NULL,
	"location_found" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"photo" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_patients" ADD CONSTRAINT "hospital_patients_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_thread_bumped" ON "chat_messages" USING btree ("thread_bumped_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_reply" ON "chat_messages" USING btree ("reply_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_messages_created_at_idx" ON "contact_messages" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_messages_unread_idx" ON "contact_messages" USING btree ("read","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "donations_created_at_idx" ON "donations" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hospital_patients_hospital" ON "hospital_patients" USING btree ("hospital_id","status","admitted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_hospitals_external" ON "hospitals" USING btree ("external_id") WHERE external_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hospitals_state" ON "hospitals" USING btree ("state","priority_zone","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_missing_status_created" ON "missing_persons" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_missing_map_coords" ON "missing_persons" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_missing_photo_pending" ON "missing_persons" USING btree ("id") WHERE photo_migrated_at IS NULL AND (photo IS NOT NULL OR photo_external_url IS NOT NULL);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reports_created_at" ON "reports" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reports_photo_pending" ON "reports" USING btree ("id") WHERE photo_migrated_at IS NULL AND photo IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sync_runs_started" ON "sync_runs" USING btree ("started_at" DESC NULLS LAST);