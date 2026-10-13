import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import https from "https";
import { exec } from "child_process";
import { promisify } from "util";
import { redis } from "@/lib/redis";
import { cctvCache, fetchLiveKabStreams } from "@/lib/cctv-cache";

const execAsync = promisify(exec);

// Self-signed cert bypass for pelindung.bandung.go.id
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function fetchWithInsecure(url: string, init: RequestInit = {}): Promise<Response> {
  // Node 18+ supports `agent` in undici-backed fetch when passed via dispatcher,
  // but undici isn't a direct dep. Use https.get as fallback for self-signed hosts.
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        method: init.method || "GET",
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        agent: insecureAgent,
        headers: (init.headers as Record<string, string>) || {},
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          const headers = new Headers();
          Object.entries(res.headers).forEach(([k, v]) => {
            if (Array.isArray(v)) v.forEach((vv) => headers.append(k, vv));
            else if (v != null) headers.set(k, String(v));
          });
          resolve(
            new Response(body, {
              status: res.statusCode || 200,
              statusText: res.statusMessage || "OK",
              headers,
            })
          );
        });
      }
    );
    req.on("error", reject);
    if (init.body) req.write(init.body);
    req.end();
  });
}

async function scrapeKab(): Promise<Record<string, { id: string; name: string; lat: number; lng: number; streamUrl: string }>> {
  const res = await fetch("https://dishub.bandungkab.go.id/cctv/", {
    headers: { "User-Agent": BROWSER_UA, Accept: "text/html,*/*" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KAB HTTP ${res.status}`);
  const html = await res.text();
  const block = html.match(/const\s+cctvData\s*=\s*\[([\s\S]*?)\];/);
  const target = block ? block[1] : html;
  const pattern =
    /\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)",\s*code:\s*"([^"]*)",\s*coordinates:\s*\[([^\]]+)\],\s*streamUrl:\s*"([^"]+)"\s*\}/g;
  const out: Record<string, any> = {};
  let m;
  while ((m = pattern.exec(target)) !== null) {
    const [, cctvId, name, , coords, streamUrl] = m;
    const [latS, lngS] = coords.split(",");
    out[`kab-${cctvId}`] = {
      id: `kab-${cctvId}`,
      name: `KAB - ${name}`,
      lat: parseFloat(latS),
      lng: parseFloat(lngS),
      streamUrl,
    };
  }
  return out;
}

async function scrapePelindung(): Promise<Record<string, { streamUrl: string; name?: string; lat?: number; lng?: number }>> {
  const res = await fetchWithInsecure("https://pelindung.bandung.go.id:8443/api/cek", {
    headers: { "User-Agent": BROWSER_UA, "X-Requested-With": "XMLHttpRequest" },
  });
  if (!res.ok) throw new Error(`Pelindung HTTP ${res.status}`);
  const data = (await res.json()) as Array<Record<string, any>>;
  const out: Record<string, any> = {};
  for (const item of data) {
    const id = item?.id;
    if (id == null) continue;
    out[`pelindung-${id}`] = {
      streamUrl: item.stream_cctv || "",
      name: item.cctv_name ? `PELINDUNG - ${item.cctv_name}` : undefined,
      lat: typeof item.lat === "number" ? item.lat : parseFloat(item.lat),
      lng: typeof item.lng === "number" ? item.lng : parseFloat(item.lng),
    };
  }
  return out;
}

async function scrapeKbb(): Promise<Record<string, { streamUrl: string; name?: string; lat?: number; lng?: number }>> {
  const res = await fetch("https://atcs.bandungbaratkab.go.id/get-cctv", {
    headers: { "User-Agent": BROWSER_UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KBB HTTP ${res.status}`);
  const json: any = await res.json();
  if (json?.status !== "success" || !Array.isArray(json.data)) return {};
  const out: Record<string, any> = {};
  json.data.forEach((item: any, i: number) => {
    const coords = String(item?.koordinat || "0,0").split(",");
    const streamUrl = String(item?.link || "")
      .replace(".html", ".m3u8")
      .replace("id/", "id/memfs/");
    out[`kbb-${i}`] = {
      streamUrl,
      name: item?.nama_cctv ? `KBB - ${item.nama_cctv}` : undefined,
      lat: parseFloat(coords[0]),
      lng: parseFloat(coords[1]),
    };
  });
  return out;
}

export async function POST(request: NextRequest) {
  return handleUpdate(request);
}

export async function GET(request: NextRequest) {
  return handleUpdate(request);
}

async function handleUpdate(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fullScrape = searchParams.get("full") === "true";
    const checkStatus = searchParams.get("check_status") === "true";

    // If check status requested, run check_cctv_status.py
    if (checkStatus) {
      try {
        const rootDir = process.cwd();
        const { stdout } = await execAsync("python3 check_cctv_status.py", {
          cwd: rootDir,
          timeout: 60000,
        });

        return NextResponse.json({
          success: true,
          type: "status_check",
          message: "Pengecekan status CCTV selesai.",
          output: stdout.slice(-500),
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            error: "Gagal menjalankan check_cctv_status: " + (err.message || String(err)),
          },
          { status: 500 }
        );
      }
    }

    // If full scrape requested, run scraper.py
    if (fullScrape) {
      try {
        const rootDir = process.cwd();
        const { stdout, stderr } = await execAsync("python3 scraper.py", {
          cwd: rootDir,
          timeout: 120000,
        });

        return NextResponse.json({
          success: true,
          type: "full",
          message: "Full scraper Python berhasil dijalankan.",
          output: stdout.slice(-500),
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error("Full scraper error:", err);
        return NextResponse.json(
          {
            success: false,
            error: "Gagal menjalankan full scraper python: " + (err.message || String(err)),
          },
          { status: 500 }
        );
      }
    }

    // Default fast update: refresh tokens for all expiring providers (KAB, Pelindung, KBB) in parallel
    const [kabResult, pelindungResult, kbbResult] = await Promise.allSettled([
      fetchLiveKabStreams(true).then((r) => r.streams),
      scrapePelindung(),
      scrapeKbb(),
    ]);

    const newKabStreams: Record<string, { id: string; name: string; lat: number; lng: number; streamUrl: string }> =
      kabResult.status === "fulfilled" ? kabResult.value : {};
    const newPelindungStreams: Record<string, { streamUrl: string; name?: string; lat?: number; lng?: number }> =
      pelindungResult.status === "fulfilled" ? pelindungResult.value : {};
    const newKbbStreams: Record<string, { streamUrl: string; name?: string; lat?: number; lng?: number }> =
      kbbResult.status === "fulfilled" ? kbbResult.value : {};

    // 1. Immediately update in-memory cache so subsequent /api/cctvs & /api/proxy-stream requests use them
    if (Object.keys(newKabStreams).length > 0) {
      cctvCache.kabStreams = newKabStreams;
    }
    if (Object.keys(newPelindungStreams).length > 0) {
      cctvCache.pelindungStreams = newPelindungStreams;
    }
    if (Object.keys(newKbbStreams).length > 0) {
      cctvCache.kbbStreams = newKbbStreams;
    }

    const providerErrors: Record<string, string> = {};
    if (kabResult.status === "rejected") providerErrors.kab = String(kabResult.reason);
    if (pelindungResult.status === "rejected") providerErrors.pelindung = String(pelindungResult.reason);
    if (kbbResult.status === "rejected") providerErrors.kbb = String(kbbResult.reason);

    const scrapedCount =
      Object.keys(newKabStreams).length +
      Object.keys(newPelindungStreams).length +
      Object.keys(newKbbStreams).length;

    if (scrapedCount === 0) {
      throw new Error(
        "Tidak ada data CCTV yang berhasil di-scrape dari semua provider. " +
          JSON.stringify(providerErrors)
      );
    }

    // Merge scrapes into existing CCTV list & persist to disk
    const rootDir = process.cwd();
    const targetFiles = [
      path.join(rootDir, "src", "data", "cctvs.json"),
      path.join(rootDir, "public", "cctvs.json"),
    ];

    let totalCount = 0;
    const perProviderUpdated = {
      kab: Object.keys(newKabStreams).length,
      pelindung: Object.keys(newPelindungStreams).length,
      kbb: Object.keys(newKbbStreams).length,
    };

    for (const filePath of targetFiles) {
      if (!fs.existsSync(filePath)) continue;

      try {
        let list: any[] = JSON.parse(fs.readFileSync(filePath, "utf8"));

        // Remove inactive kab-4 if present
        list = list.filter((item) => item.id !== "kab-4");

        // Update existing items with fresh tokens from each provider
        list = list.map((item) => {
          if (item.id.startsWith("kab-") && newKabStreams[item.id]) {
            const u = newKabStreams[item.id];
            return { ...item, name: u.name, lat: u.lat, lng: u.lng, streamUrl: u.streamUrl };
          }
          if (item.id.startsWith("pelindung-") && newPelindungStreams[item.id]) {
            const u = newPelindungStreams[item.id];
            return {
              ...item,
              streamUrl: u.streamUrl,
              ...(u.name ? { name: u.name } : {}),
              ...(u.lat != null && !isNaN(u.lat) ? { lat: u.lat } : {}),
              ...(u.lng != null && !isNaN(u.lng) ? { lng: u.lng } : {}),
            };
          }
          if (item.id.startsWith("kbb-") && newKbbStreams[item.id]) {
            const u = newKbbStreams[item.id];
            return {
              ...item,
              streamUrl: u.streamUrl,
              ...(u.name ? { name: u.name } : {}),
              ...(u.lat != null && !isNaN(u.lat) ? { lat: u.lat } : {}),
              ...(u.lng != null && !isNaN(u.lng) ? { lng: u.lng } : {}),
            };
          }
          return item;
        });

        totalCount = list.length;
        fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf8");
      } catch (writeErr: any) {
        console.warn(`[UPDATE-CCTV] Cannot write to ${filePath} (${writeErr.code || writeErr.message})`);
      }
    }

    // Also scrape & sync SPKLU Bandung from spklu.web.id
    let spkluCount = 0;
    let bandungSpklu: any[] = [];
    try {
      const spkluRes = await fetch("https://spklu.web.id/wp-content/themes/spklu-web/data/spklu_data.json", {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 0 },
      });
      if (spkluRes.ok) {
        const spkluJson = await spkluRes.json();
        const lk = spkluJson.lookup || {};
        const speeds = lk.speeds || ["DC Ultra Fast", "DC Fast Charging", "Medium Charging", "Standard AC"];
        const kats = lk.kats || lk.kategori || ["Rest Area Tol", "Mall / Pusat Belanja", "Hotel / Penginapan", "Kantor PLN", "Dealer / Bengkel", "Dealer / Bengkel Wuling", "SPBU", "Area Publik"];
        const sokets = lk.sokets || ["CCS2 & CHAdeMO", "Type 2 (AC)", "GB/T (Wuling)", "GB/T (Wuling) & AC Type 2", "Multi-socket"];

        bandungSpklu = (spkluJson.data || [])
          .map((item: any, idx: number) => {
            const lat = typeof item[3] === "number" ? item[3] : parseFloat(item[3]);
            const lng = typeof item[4] === "number" ? item[4] : parseFloat(item[4]);
            return {
              id: `spklu-${idx + 1}`,
              name: item[0] || "",
              address: item[1] || "",
              city: item[2] || "",
              lat,
              lng,
              powerKw: typeof item[5] === "number" ? item[5] : parseInt(item[5], 10) || 0,
              chargingSpeed: speeds[item[6]] || "Standard",
              provider: item[7] || "PLN",
              category: kats[item[8]] || "Area Publik",
              plugType: sokets[item[9]] || "Multi-socket",
              is24h: item[10] === 1,
            };
          })
          .filter((s: any) => {
            const kotaLower = (s.city || "").toLowerCase();
            const isBandungCity = kotaLower.includes("bandung") || kotaLower.includes("cimahi");
            const isBandungCoord = s.lat >= -7.2 && s.lat <= -6.7 && s.lng >= 107.38 && s.lng <= 107.88;
            const isOther = ["garut", "sumedang", "subang", "purwakarta"].some((c) => kotaLower.includes(c));
            if (isOther) return false;
            return isBandungCity || isBandungCoord;
          });

        spkluCount = bandungSpklu.length;
        const spkluFiles = [
          path.join(rootDir, "src", "data", "spklus.json"),
          path.join(rootDir, "public", "spklus.json"),
        ];
        for (const f of spkluFiles) {
          if (!fs.existsSync(f)) continue;
          try {
            fs.writeFileSync(f, JSON.stringify(bandungSpklu, null, 2), "utf8");
          } catch {
            // Read-only filesystem safe
          }
        }
      }
    } catch (spkluErr) {
      console.warn("SPKLU sync warning:", spkluErr);
    }

    // Save to Redis if connected
    if (redis) {
      try {
        if (Object.keys(newKabStreams).length > 0) {
          await redis.set("cctv:kab_streams", JSON.stringify(newKabStreams));
        }
        if (Object.keys(newPelindungStreams).length > 0) {
          await redis.set("cctv:pelindung_streams", JSON.stringify(newPelindungStreams));
        }
        if (Object.keys(newKbbStreams).length > 0) {
          await redis.set("cctv:kbb_streams", JSON.stringify(newKbbStreams));
        }
        if (bandungSpklu.length > 0) {
          await redis.set("spklu:data", JSON.stringify(bandungSpklu));
        }
      } catch (redisErr) {
        console.error("[REDIS] Error saving updated data:", redisErr);
      }
    }


    return NextResponse.json({
      success: true,
      type: "fast_multi",
      message: `Berhasil memperbarui ${perProviderUpdated.kab} KAB + ${perProviderUpdated.pelindung} Pelindung + ${perProviderUpdated.kbb} KBB, ${spkluCount} SPKLU.`,
      updated: perProviderUpdated,
      scraped: {
        kab: Object.keys(newKabStreams).length,
        pelindung: Object.keys(newPelindungStreams).length,
        kbb: Object.keys(newKbbStreams).length,
      },
      totalCCTV: totalCount,
      spkluCount,
      providerErrors: Object.keys(providerErrors).length ? providerErrors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error updating CCTV:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memperbarui CCTV",
      },
      { status: 500 }
    );
  }
}
