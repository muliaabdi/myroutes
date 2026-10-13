import { NextRequest, NextResponse } from "next/server";
import { repairBandungKabUrl } from "@/lib/cctv-cache";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const streamUrl = searchParams.get("url");

    if (!streamUrl) {
      return NextResponse.json({ error: "Missing stream URL" }, { status: 400 });
    }

    // Auto-repair Bandung Kab URLs that might carry expired token hashes
    const isBandungKab = streamUrl.includes("cctv.bandungkab.go.id");
    let targetUrl = isBandungKab ? await repairBandungKabUrl(streamUrl) : streamUrl;

    const timeoutMs = isBandungKab ? 12000 : 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let headers: Record<string, string> = {};

      if (isBandungKab) {
        headers = {
          "Accept": "*/*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        };
      } else {
        headers = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://pelindung.bandung.go.id/",
          "Accept": "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Connection": "keep-alive",
        };
      }

      let response = await fetch(targetUrl, {
        headers,
        // @ts-ignore - redirect option exists
        redirect: "follow",
        signal: controller.signal,
      });

      // Handle Bandung Kab token expiration (status 401/403/404 or JSON { "ok": false, "msg": "Not Authorized" })
      let textBody: string | null = null;
      if (isBandungKab) {
        const contentType = response.headers.get("content-type") || "";
        const isM3u8OrJson = contentType.includes("json") || contentType.includes("mpegurl") || targetUrl.includes(".m3u8");

        if (!response.ok || isM3u8OrJson) {
          const peekText = await response.text();
          if (!response.ok || peekText.includes('"ok": false') || peekText.includes("Not Authorized")) {
            console.warn("[PROXY-STREAM] Expired token detected for KAB stream, force refreshing token...", targetUrl);
            const freshUrl = await repairBandungKabUrl(streamUrl, true);
            if (freshUrl !== targetUrl) {
              targetUrl = freshUrl;
              response = await fetch(targetUrl, {
                headers,
                // @ts-ignore
                redirect: "follow",
                signal: controller.signal,
              });
              if (response.ok) {
                textBody = await response.text();
              }
            } else {
              textBody = peekText;
            }
          } else {
            textBody = peekText;
          }
        }
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return NextResponse.json(
            {
              error: "Stream not available",
              message: "This CCTV stream is currently offline or the URL is no longer valid. The camera may be disconnected or undergoing maintenance.",
              url: targetUrl,
              status: 404,
            },
            { status: 200 }
          );
        }

        return NextResponse.json(
          {
            error: `Failed to fetch stream: ${response.status} ${response.statusText}`,
            url: targetUrl,
            contentType: response.headers.get("content-type"),
            status: response.status,
          },
          { status: response.status }
        );
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";

      const responseHeaders = new Headers();
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      responseHeaders.set("Access-Control-Allow-Headers", "Range, Content-Type");
      responseHeaders.set("Content-Type", contentType);
      responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
      responseHeaders.set("Pragma", "no-cache");
      responseHeaders.set("Expires", "0");

      // Check if it's an HLS manifest (m3u8)
      if (contentType.includes("mpegurl") || targetUrl.includes(".m3u8")) {
        const text = textBody !== null ? textBody : await response.text();
        const baseUrl = new URL(targetUrl);
        const searchToForward = baseUrl.search || "";

        const proxiedText = text
          .split("\n")
          .map((line) => {
            const trimmed = line.trim();
            if (trimmed === "") return line;

            if (trimmed.startsWith("#") && trimmed.includes("URI=")) {
              return line.replace(/URI="([^"]+)"/g, (_, uri) => {
                try {
                  let segmentUrl = uri.startsWith("http") ? uri : new URL(uri, baseUrl).href;
                  if (searchToForward && !segmentUrl.includes("?")) {
                    segmentUrl += searchToForward;
                  }
                  return `URI="/api/proxy-stream?url=${encodeURIComponent(segmentUrl)}"`;
                } catch {
                  return `URI="${uri}"`;
                }
              });
            }

            if (trimmed.startsWith("#")) return line;

            try {
              let segmentUrl = trimmed.startsWith("http") ? trimmed : new URL(trimmed, baseUrl).href;
              if (searchToForward && !segmentUrl.includes("?")) {
                segmentUrl += searchToForward;
              }
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
        const errorMsg = isBandungKab
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
