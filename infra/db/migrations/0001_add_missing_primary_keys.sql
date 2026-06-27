-- Repara tablas que el worker de migración de datos creó SIN PRIMARY KEY
-- (ensureTargetSchema solo creaba un índice único `mig_uniq_*`, no una PK).
-- Sin PK, `GROUP BY id` con columnas dependientes falla ("must appear in GROUP
-- BY") y Drizzle/Postgres no reconocen la dependencia funcional -> 500 en
-- endpoints como /api/hospitals.
--
-- schema.ts SÍ declara estas PKs, pero la 0000 usó CREATE TABLE IF NOT EXISTS y
-- estas tablas ya existían (sin PK), así que la PK nunca se añadió. Esta
-- migración la agrega de forma idempotente (salta si la PK ya existe).
--
-- En una base fresca (creada por la 0000 con PK), cada bloque es un no-op.

DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN invalid_table_definition THEN null; WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN invalid_table_definition THEN null; WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN invalid_table_definition THEN null; WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "damage_candidates" ADD CONSTRAINT "damage_candidates_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN invalid_table_definition THEN null; WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospital_patients" ADD CONSTRAINT "hospital_patients_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN invalid_table_definition THEN null; WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospitals" ADD CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN invalid_table_definition THEN null; WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN invalid_table_definition THEN null; WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_state" ADD CONSTRAINT "sync_state_pkey" PRIMARY KEY ("source");
EXCEPTION WHEN invalid_table_definition THEN null; WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unidentified_persons" ADD CONSTRAINT "unidentified_persons_pkey" PRIMARY KEY ("id");
EXCEPTION WHEN invalid_table_definition THEN null; WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
