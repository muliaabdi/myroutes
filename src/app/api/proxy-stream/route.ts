import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const streamUrl = searchParams.get("url");

    if (!streamUrl) {
      return NextResponse.json({ error: "Missing stream URL" }, { status: 400 });
    }

    // Use shorter timeout for cctv.bandungkab.go.id (server often doesn't respond)
    const isProblematicDomain = streamUrl.includes("cctv.bandungkab.go.id");
    const timeoutMs = isProblematicDomain ? 8000 : 30000; // 8 sec for problematic, 30 sec for others
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Fetch the stream from the actual CCTV server
      // Determine the correct headers based on the stream URL
      let headers: Record<string, string> = {};

      if (streamUrl.includes("cctv.bandungkab.go.id")) {
        // Try minimal headers for cctv.bandungkab.go.id
        // This server seems to reject custom headers
        headers = {
          "Accept": "*/*",
        };
      } else {
        // Use full headers for other domains
        headers = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://pelindung.bandung.go.id/",
          "Accept": "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Connection": "keep-alive",
        };
      }

      const response = await fetch(streamUrl, {
        headers,
        // @ts-ignore - redirect option exists
        redirect: "follow",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {

        // Special handling for 404 - stream not available
        if (response.status === 404) {
          return NextResponse.json(
            {
              error: "Stream not available",
              message: "This CCTV stream is currently offline or the URL is no longer valid. The camera may be disconnected or undergoing maintenance.",
              url: streamUrl,
              status: 404,
            },
            { status: 200 } // Return 200 so the client can handle the error gracefully
          );
        }

        return NextResponse.json(
          {
            error: `Failed to fetch stream: ${response.status} ${response.statusText}`,
            url: streamUrl,
            contentType: response.headers.get("content-type"),
            status: response.status,
          },
          { status: response.status }
        );
      }

      // Get the content type
      const contentType = response.headers.get("content-type") || "application/octet-stream";

      // Stream the response back using Web Streams
      const responseHeaders = new Headers();
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      responseHeaders.set("Access-Control-Allow-Headers", "Range, Content-Type");
      responseHeaders.set("Content-Type", contentType);
      responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
      responseHeaders.set("Pragma", "no-cache");
      responseHeaders.set("Expires", "0");

      // Check if it's an HLS manifest (m3u8)
      if (contentType.includes("mpegurl") || streamUrl.includes(".m3u8")) {
        const text = await response.text();
        const baseUrl = new URL(streamUrl);

        // Rewrite segment URLs to use the proxy
        const proxiedText = text
          .split("\n")
          .map((line) => {
            const trimmed = line.trim();

            // Skip empty lines and comments that don't contain URLs
            if (trimmed === "" || (trimmed.startsWith("#") && !trimmed.includes("URI="))) {
              return line;
            }

            // Handle tags with URI attribute (like #EXT-X-MAP:URI="init.mp4")
            if (trimmed.startsWith("#") && trimmed.includes("URI=")) {
              return line.replace(/URI="([^"]+)"/g, (_, uri) => {
                try {
                  const segmentUrl = uri.startsWith("http") ? uri : new URL(uri, baseUrl).href;
                  return `URI="/api/proxy-stream?url=${encodeURIComponent(segmentUrl)}"`;
                } catch {
                  return `URI="${uri}"`;
                }
              });
            }

            // It's a URL or path - rewrite to use proxy
            try {
              const segmentUrl = trimmed.startsWith("http") ? trimmed : new URL(trimmed, baseUrl).href;
              return `/api/proxy-stream?url=${encodeURIComponent(segmentUrl)}`;
            } catch {
              return line;
            }
          })
          .join("\n");

        return new NextResponse(proxiedText, {
          status: 200,
          headers: responseHeaders,
        });
      }

      // For video segments (TS files), stream directly
      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: responseHeaders,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        const isProblematicDomain = streamUrl.includes("cctv.bandungkab.go.id");
        const errorMsg = isProblematicDomain
          ? "Stream server not responding - this CCTV may be offline or the stream URL may be expired. Try opening in a new tab or use an alternative camera."
          : "Request timeout - stream may be slow or offline";
        return NextResponse.json({ error: errorMsg }, { status: 504 });
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Proxy stream error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to proxy stream" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
