export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { doctors } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const records = await db
      .select({
        id: doctors.id,
        fullName: doctors.fullName,
        specialization: doctors.specialization,
        workingHours: doctors.workingHours,
        active: doctors.active,
        createdAt: doctors.createdAt,
      })
      .from(doctors)
      .where(eq(doctors.active, true));

    return NextResponse.json(records);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get doctors error:", message);
    return NextResponse.json([], { status: 200 });
  }
}
