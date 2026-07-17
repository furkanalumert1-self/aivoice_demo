-- Fix appointments table: add columns that were missing from the initial migration.
-- The original table used "phone" but the schema now expects "patient_phone".
-- All statements are idempotent (IF NOT EXISTS).

ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "patient_phone"    text,
  ADD COLUMN IF NOT EXISTS "appointment_date" text,
  ADD COLUMN IF NOT EXISTS "appointment_time" text,
  ADD COLUMN IF NOT EXISTS "notes"            text;

-- Copy any legacy phone values into patient_phone so old rows aren't lost.
UPDATE "appointments"
  SET "patient_phone" = "phone"
  WHERE "patient_phone" IS NULL AND "phone" IS NOT NULL;
