export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

async function fetchFreshRecordingUrl(vapiCallId: string): Promise<string | null> {
  if (!process.env.VAPI_API_KEY) {
    console.error("[AUDIO-PROXY] VAPI_API_KEY not set");
    return null;
  }
  try {
    const res = await fetch(`https://api.vapi.ai/call/${vapiCallId}`, {
      headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY}` },
    });
    if (!res.ok) {
      console.error("[AUDIO-PROXY] VAPI API error:", res.status, "callId:", vapiCallId);
      return null;
    }
    const data = await res.json() as Record<string, unknown>;
    const artifact = data.artifact as Record<string, unknown> | undefined;

    // presignedMonoUrl / presignedStereoUrl are fresh signed URLs (no auth needed)
    // recordingUrl is a raw R2 URL that requires Bearer auth — avoid it
    const url =
      (artifact?.presignedMonoUrl as string | undefined) ??
      (artifact?.presignedStereoUrl as string | undefined) ??
      (artifact?.presignedCustomerUrl as string | undefined) ??
      (artifact?.recordingUrl as string | undefined) ??
      (data.recordingUrl as string | undefined) ??
      null;

    console.log("[AUDIO-PROXY] VAPI callId:", vapiCallId, "| presignedMono:", (artifact?.presignedMonoUrl as string | undefined)?.slice(0, 60) ?? "null", "| resolved url:", url?.slice(0, 60) ?? "null");
    return url;
  } catch (err) {
    console.error("[AUDIO-PROXY] VAPI API fetch error:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const vapiCallId = req.nextUrl.searchParams.get("vapiCallId");
  const urlParam = req.nextUrl.searchParams.get("url");

  let audioUrl: string | null = null;

  // Prefer vapiCallId — always fetches a fresh signed URL from VAPI API
  if (vapiCallId) {
    audioUrl = await fetchFreshRecordingUrl(vapiCallId);
    if (!audioUrl) {
      return new NextResponse("Recording not found", { status: 404 });
    }
  } else if (urlParam) {
    audioUrl = urlParam;
  } else {
    return new NextResponse("Missing vapiCallId or url", { status: 400 });
  }

  // Only allow HTTPS to prevent SSRF to internal services
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(audioUrl);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }
  if (parsedUrl.protocol !== "https:") {
    return new NextResponse("Only HTTPS URLs allowed", { status: 400 });
  }

  // Forward Range header so the browser can seek within the audio
  const upstreamHeaders: Record<string, string> = {};
  const range = req.headers.get("range");
  if (range) upstreamHeaders["Range"] = range;

  try {
    const upstream = await fetch(parsedUrl.toString(), { headers: upstreamHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      console.error("[AUDIO-PROXY] Upstream error:", upstream.status, parsedUrl.toString().slice(0, 80));
      return new NextResponse("Audio unavailable", { status: upstream.status });
    }

    const responseHeaders: Record<string, string> = {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=300",
      "Access-Control-Allow-Origin": "*",
    };
    const contentLength = upstream.headers.get("content-length");
    const contentRange = upstream.headers.get("content-range");
    if (contentLength) responseHeaders["Content-Length"] = contentLength;
    if (contentRange) responseHeaders["Content-Range"] = contentRange;

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[AUDIO-PROXY] Fetch error:", err);
    return new NextResponse("Failed to fetch audio", { status: 502 });
  }
}
