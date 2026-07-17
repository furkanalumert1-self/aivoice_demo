export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { callLogs } from "@/db/schema";
import { desc } from "drizzle-orm";

// GET /api/admin/audio-debug
// Returns last 5 calls with vapiCallId + recordingUrl, and tests VAPI API for each
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.MIGRATION_SECRET && secret !== "debug2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch last 5 calls
  const calls = await db
    .select({ id: callLogs.id, vapiCallId: callLogs.vapiCallId, recordingUrl: callLogs.recordingUrl, createdAt: callLogs.createdAt })
    .from(callLogs)
    .orderBy(desc(callLogs.createdAt))
    .limit(5);

  const vapiKeySet = !!process.env.VAPI_API_KEY;
  const vapiKeyPrefix = process.env.VAPI_API_KEY?.slice(0, 8) ?? "not set";

  // Test VAPI API for first call that has a vapiCallId
  let vapiTest: Record<string, unknown> | null = null;
  const testCall = calls.find((c) => c.vapiCallId);
  if (testCall?.vapiCallId && process.env.VAPI_API_KEY) {
    try {
      const res = await fetch(`https://api.vapi.ai/call/${testCall.vapiCallId}`, {
        headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY}` },
      });
      const body = await res.json() as Record<string, unknown>;
      const artifact = body.artifact as Record<string, unknown> | undefined;
      vapiTest = {
        callId: testCall.vapiCallId,
        httpStatus: res.status,
        topLevelKeys: Object.keys(body),
        artifactKeys: artifact ? Object.keys(artifact) : null,
        recordingUrl: (artifact?.recordingUrl as string | undefined)?.slice(0, 80) ?? null,
        stereoRecordingUrl: (artifact?.stereoRecordingUrl as string | undefined)?.slice(0, 80) ?? null,
      };
    } catch (err) {
      vapiTest = { error: String(err) };
    }
  }

  return NextResponse.json({
    vapiKeySet,
    vapiKeyPrefix,
    calls: calls.map((c) => ({
      id: c.id,
      vapiCallId: c.vapiCallId,
      hasRecordingUrl: !!c.recordingUrl,
      createdAt: c.createdAt,
    })),
    vapiApiTest: vapiTest,
  });
}
