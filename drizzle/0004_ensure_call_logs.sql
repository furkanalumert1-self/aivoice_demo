-- Migration 0004: Ensure call_logs table and all columns exist
-- Safe to run multiple times (all IF NOT EXISTS / IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS "call_logs" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "caller_number"  text,
  "vapi_call_id"   text,
  "transcript"     text,
  "summary"        text,
  "duration"       integer,
  "intent"         text,
  "call_status"    text DEFAULT 'completed',
  "cost"           numeric,
  "recording_url"  text,
  "appointment_id" uuid,
  "created_at"     timestamp DEFAULT now()
);

-- Add any columns that might be missing from older installs
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "caller_number"  text;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "vapi_call_id"   text;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "transcript"     text;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "summary"        text;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "duration"       integer;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "intent"         text;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "call_status"    text DEFAULT 'completed';
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "cost"           numeric;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "recording_url"  text;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "appointment_id" uuid;
ALTER TABLE "call_logs" ADD COLUMN IF NOT EXISTS "created_at"     timestamp DEFAULT now();

-- Unique index on vapi_call_id (NULLs are allowed to repeat — only non-NULL values are unique)
CREATE UNIQUE INDEX IF NOT EXISTS "call_logs_vapi_call_id_idx"
  ON "call_logs"("vapi_call_id")
  WHERE "vapi_call_id" IS NOT NULL;

-- Ensure performance index on created_at for ORDER BY DESC queries
CREATE INDEX IF NOT EXISTS "call_logs_created_at_idx"
  ON "call_logs"("created_at" DESC);

-- Ensure doctors table exists (used in N8N doctor-information workflow)
CREATE TABLE IF NOT EXISTS "doctors" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "full_name"     text NOT NULL,
  "specialization" text NOT NULL,
  "working_hours" jsonb,
  "active"        boolean DEFAULT true,
  "created_at"    timestamp DEFAULT now()
);

-- Ensure callback_requests table exists
CREATE TABLE IF NOT EXISTS "callback_requests" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_name" text,
  "phone"        text NOT NULL,
  "reason"       text,
  "status"       text DEFAULT 'bekliyor',
  "requested_at" timestamp DEFAULT now(),
  "completed_at" timestamp
);

-- Ensure all appointment columns exist that the app expects
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "patient_phone"    text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "doctor_id"        uuid;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "doctor_name"      text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "appointment_date" text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "appointment_time" text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "appointment_at"   timestamp;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "notes"            text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "source"           text DEFAULT 'voice_agent';
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "updated_at"       timestamp DEFAULT now();
