export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// One-time migration endpoint — protected by MIGRATION_SECRET env var.
// Call once: POST /api/admin/run-migration  with header  x-migration-secret: <value>

export async function POST(req: NextRequest) {
  const secret = process.env.MIGRATION_SECRET;
  if (!secret || req.headers.get("x-migration-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });

  const sql = neon(url);

  try {
    await sql`
      ALTER TABLE "appointments"
        ADD COLUMN IF NOT EXISTS "patient_phone"    text,
        ADD COLUMN IF NOT EXISTS "appointment_date" text,
        ADD COLUMN IF NOT EXISTS "appointment_time" text,
        ADD COLUMN IF NOT EXISTS "notes"            text
    `;

    await sql`
      UPDATE "appointments"
        SET "patient_phone" = "phone"
        WHERE "patient_phone" IS NULL AND "phone" IS NOT NULL
    `;

    return NextResponse.json({ ok: true, message: "Migration applied successfully." });
  } catch (err) {
    console.error("[MIGRATION] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
