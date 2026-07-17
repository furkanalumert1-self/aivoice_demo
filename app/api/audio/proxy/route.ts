export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  // Only allow HTTPS to prevent SSRF to internal services
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
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
      "Cache-Control": "private, max-age=3600",
      // Allow browser audio element to read the response (same-origin after proxy)
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
