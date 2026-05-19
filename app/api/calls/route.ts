import { NextResponse } from "next/server";
import { db } from "@/db";
import { calls } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const records = await db
      .select()
      .from(calls)
      .orderBy(sql`${calls.createdAt} desc`);
    return NextResponse.json(records);
  } catch (error) {
    console.error("GET /api/calls error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
