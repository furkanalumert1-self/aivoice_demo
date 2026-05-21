-- Migration 0001: New tables and appointments extension

CREATE TABLE IF NOT EXISTS "doctors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "full_name" text NOT NULL,
  "specialization" text NOT NULL,
  "working_hours" jsonb,
  "active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "call_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "caller_number" text,
  "vapi_call_id" text UNIQUE,
  "transcript" text,
  "summary" text,
  "duration" integer,
  "intent" text,
  "call_status" text DEFAULT 'completed',
  "cost" numeric,
  "recording_url" text,
  "appointment_id" uuid REFERENCES "appointments"("id"),
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "ai_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "action_type" text NOT NULL,
  "payload" jsonb,
  "result" text,
  "call_log_id" uuid REFERENCES "call_logs"("id"),
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "clinic_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clinic_name" text DEFAULT 'Klinik AI',
  "opening_hour" text DEFAULT '09:00',
  "closing_hour" text DEFAULT '18:00',
  "timezone" text DEFAULT 'Europe/Istanbul',
  "emergency_message" text,
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "callback_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_name" text,
  "phone" text NOT NULL,
  "reason" text,
  "status" text DEFAULT 'bekliyor',
  "requested_at" timestamp DEFAULT now(),
  "completed_at" timestamp
);
--> statement-breakpoint

-- Extend appointments table
ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "patient_phone" text,
  ADD COLUMN IF NOT EXISTS "doctor_id"      uuid REFERENCES "doctors"("id"),
  ADD COLUMN IF NOT EXISTS "appointment_date" text,
  ADD COLUMN IF NOT EXISTS "appointment_time" text,
  ADD COLUMN IF NOT EXISTS "notes"          text,
  ADD COLUMN IF NOT EXISTS "updated_at"     timestamp DEFAULT now();
