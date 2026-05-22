export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  // DB health check
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "healthy", latency: Date.now() - dbStart };
  } catch (err) {
    checks.database = { status: "unhealthy", error: err instanceof Error ? err.message : "Unknown" };
  }

  const allHealthy = Object.values(checks).every(c => c.status === "healthy");

  return NextResponse.json({
    status: allHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
    totalLatency: Date.now() - start,
  }, { status: allHealthy ? 200 : 503 });
}
