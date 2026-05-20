-- Migration 0001: Add missing columns to existing tables
-- Apply this if your tables were created before the full schema was defined.
-- All statements are idempotent (ADD COLUMN IF NOT EXISTS).

ALTER TABLE "calls"
  ADD COLUMN IF NOT EXISTS "duration_seconds" integer,
  ADD COLUMN IF NOT EXISTS "transcript"       text,
  ADD COLUMN IF NOT EXISTS "summary"          text,
  ADD COLUMN IF NOT EXISTS "cost"             numeric,
  ADD COLUMN IF NOT EXISTS "outcome"          text,
  ADD COLUMN IF NOT EXISTS "appointment_id"   uuid,
  ADD COLUMN IF NOT EXISTS "recording_url"    text;

ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "patient_name"   text,
  ADD COLUMN IF NOT EXISTS "phone"          text,
  ADD COLUMN IF NOT EXISTS "doctor_name"    text,
  ADD COLUMN IF NOT EXISTS "appointment_at" timestamp,
  ADD COLUMN IF NOT EXISTS "status"         text DEFAULT 'onaylandi',
  ADD COLUMN IF NOT EXISTS "source"         text DEFAULT 'voice_agent',
  ADD COLUMN IF NOT EXISTS "created_at"     timestamp DEFAULT now();

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "title"       text,
  ADD COLUMN IF NOT EXISTS "description" text,
  ADD COLUMN IF NOT EXISTS "is_read"     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "created_at"  timestamp DEFAULT now();
