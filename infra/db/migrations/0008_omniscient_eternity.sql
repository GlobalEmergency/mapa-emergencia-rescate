CREATE TABLE "password_resets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"created_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL,
	"consumed_at" bigint,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_pwreset_user" ON "password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_pwreset_expires" ON "password_resets" USING btree ("expires_at");