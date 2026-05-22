-- Migration 0003: Add observability and monitoring tables
-- All statements are idempotent (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS "workflow_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_name" text NOT NULL,
  "execution_id" text,
  "correlation_id" text,
  "status" text NOT NULL,
  "error_message" text,
  "payload" jsonb,
  "execution_duration" integer,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "system_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_type" text NOT NULL,
  "source" text NOT NULL,
  "severity" text DEFAULT 'info',
  "payload" jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "action" text NOT NULL,
  "actor" text,
  "target" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "workflow_health" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_name" text NOT NULL UNIQUE,
  "last_execution" timestamp,
  "success_rate" numeric,
  "avg_duration" integer,
  "failed_count" integer DEFAULT 0,
  "updated_at" timestamp DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_workflow_logs_name" ON "workflow_logs"("workflow_name");
CREATE INDEX IF NOT EXISTS "idx_workflow_logs_created" ON "workflow_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_system_events_type" ON "system_events"("event_type");
CREATE INDEX IF NOT EXISTS "idx_system_events_created" ON "system_events"("created_at");
CREATE INDEX IF NOT EXISTS "idx_call_logs_created" ON "call_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_appointments_status" ON "appointments"("status");
