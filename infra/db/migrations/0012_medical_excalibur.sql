CREATE TABLE "patient_import_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"import_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"source_hospital" text DEFAULT '' NOT NULL,
	"hospital_id" text,
	"name" text DEFAULT '' NOT NULL,
	"normalized_key" text DEFAULT '' NOT NULL,
	"age" integer,
	"condition" text,
	"status" text,
	"raw_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"document_hash" text,
	"validation_errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"validation_warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dedup_status" text DEFAULT 'pending' NOT NULL,
	"dedup_candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" double precision DEFAULT 0 NOT NULL,
	"row_status" text DEFAULT 'pending' NOT NULL,
	"patient_id" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"failed_stage" text,
	"source" text DEFAULT 'api' NOT NULL,
	"source_record_id" text,
	"integration" text,
	"content_type" text DEFAULT 'application/json' NOT NULL,
	"job_id" text,
	"idempotency_key_hash" text,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"valid_rows" integer DEFAULT 0 NOT NULL,
	"invalid_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_rows" integer DEFAULT 0 NOT NULL,
	"review_rows" integer DEFAULT 0 NOT NULL,
	"applied_rows" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"error_summary" text,
	"created_at" bigint NOT NULL,
	"processed_at" bigint,
	"applied_at" bigint,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hospital_patients" ADD COLUMN "document_hash" text;--> statement-breakpoint
ALTER TABLE "patient_import_rows" ADD CONSTRAINT "patient_import_rows_import_id_patient_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."patient_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_patient_import_rows_import" ON "patient_import_rows" USING btree ("import_id","row_index");--> statement-breakpoint
CREATE INDEX "idx_patient_import_rows_status" ON "patient_import_rows" USING btree ("import_id","row_status");--> statement-breakpoint
CREATE INDEX "idx_patient_imports_status" ON "patient_imports" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_patient_imports_actor_idempotency" ON "patient_imports" USING btree ("created_by","idempotency_key_hash") WHERE idempotency_key_hash IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_hospital_patients_document_hash" ON "hospital_patients" USING btree ("hospital_id","document_hash") WHERE document_hash IS NOT NULL;