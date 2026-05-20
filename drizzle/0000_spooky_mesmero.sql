CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_name" text,
	"phone" text,
	"doctor_name" text,
	"appointment_at" timestamp,
	"status" text DEFAULT 'onaylandi',
	"source" text DEFAULT 'voice_agent',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caller_phone" text,
	"duration_seconds" integer,
	"transcript" text,
	"summary" text,
	"cost" numeric,
	"outcome" text,
	"appointment_id" uuid,
	"recording_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"description" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
