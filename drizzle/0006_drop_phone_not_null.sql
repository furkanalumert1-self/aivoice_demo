-- The original appointments table created "phone" as NOT NULL (no default).
-- After migrating to "patient_phone", new inserts no longer populate "phone",
-- causing null-constraint violations. Make it nullable so legacy rows are
-- preserved but new inserts succeed.

ALTER TABLE "appointments" ALTER COLUMN "phone" DROP NOT NULL;
