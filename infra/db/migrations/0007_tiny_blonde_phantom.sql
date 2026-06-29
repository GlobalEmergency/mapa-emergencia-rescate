CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"metadata" jsonb,
	"ip_hash" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capabilities" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role_id" text,
	"org_id" text,
	"token_hash" text NOT NULL,
	"invited_by" text NOT NULL,
	"created_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL,
	"accepted_at" bigint
);
--> statement-breakpoint
CREATE TABLE "permission_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"capability_key" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_user_id" text,
	"subject_role_id" text,
	"org_id" text,
	"granted_by" text NOT NULL,
	"granted_at" bigint NOT NULL,
	"expires_at" bigint,
	"revoked_at" bigint,
	"revoked_by" text,
	"reason" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_capabilities" (
	"role_id" text NOT NULL,
	"capability_key" text NOT NULL,
	CONSTRAINT "role_capabilities_role_id_capability_key_pk" PRIMARY KEY("role_id","capability_key")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"org_id" text,
	"created_by" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"password_hash" text,
	"role_id" text,
	"org_id" text,
	"status" text DEFAULT 'invited' NOT NULL,
	"created_at" bigint NOT NULL,
	"last_login_at" bigint
);
--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_log" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_target" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invitations_token" ON "invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_invitations_email" ON "invitations" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "idx_grants_cap_subject" ON "permission_grants" USING btree ("capability_key","subject_type","revoked_at");--> statement-breakpoint
CREATE INDEX "idx_grants_user" ON "permission_grants" USING btree ("subject_user_id");--> statement-breakpoint
CREATE INDEX "idx_grants_role" ON "permission_grants" USING btree ("subject_role_id");--> statement-breakpoint
CREATE INDEX "idx_role_caps_role" ON "role_capabilities" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_roles_name_global" ON "roles" USING btree ("name") WHERE org_id IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_roles_name_org" ON "roles" USING btree ("org_id","name") WHERE org_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role_id");