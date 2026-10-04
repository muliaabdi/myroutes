import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

    // Default fast update: Scrape & update Dishub Kabupaten Bandung streams in real-time
    const kabUrl = "https://dishub.bandungkab.go.id/cctv/";
    const res = await fetch(kabUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch dishub.bandungkab.go.id: HTTP ${res.status}`);
    }

    const html = await res.text();

    // Match only the active cctvData block (before /* comment)
    const activeBlockMatch = html.match(/const\s+cctvData\s*=\s*\[([\s\S]*?)\];/);
    const targetHtml = activeBlockMatch ? activeBlockMatch[1] : html;

    // Pattern: { id: 1, name: "NAME", code: "SP", coordinates: [lat, lng], streamUrl: "URL" }
    const pattern = /\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)",\s*code:\s*"([^"]*)",\s*coordinates:\s*\[([^\]]+)\],\s*streamUrl:\s*"([^"]+)"\s*\}/g;

    const newKabStreams: Record<
      string,
      { id: string; name: string; lat: number; lng: number; streamUrl: string }
    > = {};

    let match;
    while ((match = pattern.exec(targetHtml)) !== null) {
      const cctvId = match[1];
      const name = match[2];
      const coords = match[4].split(",");
      const lat = parseFloat(coords[0].trim());
      const lng = parseFloat(coords[1].trim());
      const streamUrl = match[5];

      newKabStreams[`kab-${cctvId}`] = {
        id: `kab-${cctvId}`,
        name: `KAB - ${name}`,
        lat,
        lng,
        streamUrl,
      };
    }

    const scrapedCount = Object.keys(newKabStreams).length;
    if (scrapedCount === 0) {
      throw new Error("Tidak ada data CCTV yang ditemukan pada halaman sumber.");
    }

    // Update both src/data/cctvs.json and public/cctvs.json
    const rootDir = process.cwd();
    const targetFiles = [
      path.join(rootDir, "src", "data", "cctvs.json"),
      path.join(rootDir, "public", "cctvs.json"),
    ];

    let totalCount = 0;
    for (const filePath of targetFiles) {
      if (!fs.existsSync(filePath)) continue;

      let list: any[] = JSON.parse(fs.readFileSync(filePath, "utf8"));

      // Remove inactive kab-4 if present
      list = list.filter((item) => item.id !== "kab-4");

      // Update existing or append new
      list = list.map((item) => {
        if (newKabStreams[item.id]) {
          return {
            ...item,
            name: newKabStreams[item.id].name,
            lat: newKabStreams[item.id].lat,
            lng: newKabStreams[item.id].lng,
            streamUrl: newKabStreams[item.id].streamUrl,
          };
        }
        return item;
      });

      fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf8");
      totalCount = list.length;
    }

    // Also scrape & sync SPKLU Bandung from spklu.web.id
    let spkluCount = 0;
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

        const bandungSpklu = (spkluJson.data || [])
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
          fs.writeFileSync(f, JSON.stringify(bandungSpklu, null, 2), "utf8");
        }
      }
    } catch (spkluErr) {
      console.warn("SPKLU sync warning:", spkluErr);
    }

    return NextResponse.json({
      success: true,
      type: "fast_kab",
      message: `Berhasil memperbarui ${scrapedCount} CCTV Kab. Bandung & ${spkluCount} SPKLU!`,
      updatedKab: scrapedCount,
      totalCCTV: totalCount,
      spkluCount,
      streams: Object.values(newKabStreams).map((c) => ({ id: c.id, name: c.name })),
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
