export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { callLogs } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = (page - 1) * limit;

    const records = await db
      .select({
        id: callLogs.id,
        callerNumber: callLogs.callerNumber,
        summary: callLogs.summary,
        duration: callLogs.duration,
        intent: callLogs.intent,
        callStatus: callLogs.callStatus,
        cost: callLogs.cost,
        vapiCallId: callLogs.vapiCallId,
        createdAt: callLogs.createdAt,
      })
      .from(callLogs)
      .orderBy(desc(callLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(callLogs);

    return NextResponse.json({
      data: records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get call logs error:", message);
    return NextResponse.json({ data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
  }
}
