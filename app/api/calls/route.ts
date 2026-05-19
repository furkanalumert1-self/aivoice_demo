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
    console.error("Get calls error:", error);
    return NextResponse.json({ error: "Çağrılar alınamadı" }, { status: 500 });
  }
}
