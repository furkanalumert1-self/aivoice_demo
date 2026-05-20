export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { calls } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const records = await db
      .select()
      .from(calls)
      .orderBy(desc(calls.createdAt));

    return NextResponse.json(records);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get calls error:", message);
    // Return empty array instead of 500 so UI renders gracefully
    return NextResponse.json([], { status: 200 });
  }
}
