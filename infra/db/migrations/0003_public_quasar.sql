CREATE TABLE IF NOT EXISTS "hub_checkins" (
	"id" text PRIMARY KEY NOT NULL,
	"hub_id" text NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"external_id" text,
	"city" text,
	"lat" double precision,
	"lng" double precision,
	"hub_created_at" text,
	"ingested_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"photo_external_url" text,
	"photo_url" text,
	"photo_migrated_at" bigint,
	"photo_broken" boolean DEFAULT false NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"status" text,
	"message" text,
	"place_name" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hub_damaged_buildings" (
	"id" text PRIMARY KEY NOT NULL,
	"hub_id" text NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"external_id" text,
	"city" text,
	"lat" double precision,
	"lng" double precision,
	"hub_created_at" text,
	"ingested_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"photo_external_url" text,
	"photo_url" text,
	"photo_migrated_at" bigint,
	"photo_broken" boolean DEFAULT false NOT NULL,
	"place_name" text,
	"name" text,
	"description" text,
	"severity" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hub_help_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"hub_id" text NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"external_id" text,
	"city" text,
	"lat" double precision,
	"lng" double precision,
	"hub_created_at" text,
	"ingested_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"category" text,
	"description" text,
	"availability" text,
	"available" boolean
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hub_help_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"hub_id" text NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"external_id" text,
	"city" text,
	"lat" double precision,
	"lng" double precision,
	"hub_created_at" text,
	"ingested_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"category" text,
	"description" text,
	"urgency" text,
	"status" text,
	"place_name" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hub_missing_persons" (
	"id" text PRIMARY KEY NOT NULL,
	"hub_id" text NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"external_id" text,
	"city" text,
	"lat" double precision,
	"lng" double precision,
	"hub_created_at" text,
	"ingested_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"photo_external_url" text,
	"photo_url" text,
	"photo_migrated_at" bigint,
	"photo_broken" boolean DEFAULT false NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"status" text,
	"message" text,
	"place_name" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hub_sync_state" (
	"type" text PRIMARY KEY NOT NULL,
	"cursor" text,
	"last_run_at" bigint,
	"cycle_completed_at" bigint
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_hub_checkins_hubid" ON "hub_checkins" USING btree ("hub_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hub_checkins_source" ON "hub_checkins" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_hub_damaged_hubid" ON "hub_damaged_buildings" USING btree ("hub_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hub_damaged_source" ON "hub_damaged_buildings" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_hub_helpoffer_hubid" ON "hub_help_offers" USING btree ("hub_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hub_helpoffer_source" ON "hub_help_offers" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_hub_helpreq_hubid" ON "hub_help_requests" USING btree ("hub_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hub_helpreq_source" ON "hub_help_requests" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_hub_missing_hubid" ON "hub_missing_persons" USING btree ("hub_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hub_missing_source" ON "hub_missing_persons" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hub_missing_photo_pending" ON "hub_missing_persons" USING btree ("id") WHERE photo_migrated_at IS NULL AND photo_external_url IS NOT NULL;