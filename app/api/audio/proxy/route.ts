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

  // Redirect to upstream URL — <audio> elements are not CORS-restricted and
  // can follow cross-origin redirects natively. This avoids proxying large
  // audio files through Vercel functions (timeout / size constraints) and lets
  // the browser talk directly to S3 including range requests for seeking.
  return NextResponse.redirect(parsedUrl.toString(), 302);
}
