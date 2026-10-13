import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { redis } from "@/lib/redis";
import { cctvCache, fetchLiveKabStreams } from "@/lib/cctv-cache";

type CCTV = {
  id: string;
  name: string;
  lat: number | string;
  lng: number | string;
  streamUrl: string;
  region?: string;
  online?: boolean;
};

const KAB_ID_PREFIX = "kab-";
const PELINDUNG_ID_PREFIX = "pelindung-";
const KBB_ID_PREFIX = "kbb-";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readFileList(): CCTV[] {
  for (const rel of ["public/cctvs.json", "src/data/cctvs.json"]) {
    const p = path.join(process.cwd(), rel);
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, "utf8"));
      } catch {
        return [];
      }
    }
  }
  return [];
}

async function readRedisStreams(
  key: string
): Promise<Record<string, { streamUrl: string; name?: string; lat?: number; lng?: number }> | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get<string>(key);
    if (!raw) return null;
    return typeof raw === "string" ? JSON.parse(raw) : (raw as any);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const list = readFileList();
  const map = new Map<string, CCTV>(list.map((c) => [c.id, { ...c }]));

  const [kab, pelindung, kbb] = await Promise.all([
    readRedisStreams("cctv:kab_streams"),
    readRedisStreams("cctv:pelindung_streams"),
    readRedisStreams("cctv:kbb_streams"),
  ]);

  const apply = (
    src: Record<string, any> | null,
    prefix: string,
    fullReplace: boolean
  ) => {
    if (!src) return;
    for (const [id, u] of Object.entries(src)) {
      if (!id.startsWith(prefix)) continue;
      const existing = map.get(id);
      if (fullReplace) {
        map.set(id, {
          id,
          name: u.name ?? existing?.name ?? id,
          lat: u.lat ?? existing?.lat ?? 0,
          lng: u.lng ?? existing?.lng ?? 0,
          streamUrl: u.streamUrl ?? "",
          region: existing?.region,
          online: existing?.online,
        });
      } else if (existing) {
        existing.streamUrl = u.streamUrl ?? existing.streamUrl;
        if (u.name) existing.name = u.name;
        if (typeof u.lat === "number" && !isNaN(u.lat)) existing.lat = u.lat;
        if (typeof u.lng === "number" && !isNaN(u.lng)) existing.lng = u.lng;
      }
    }
  };

  // 1. Overlay from Redis (if available)
  apply(kab, KAB_ID_PREFIX, true);
  apply(pelindung, PELINDUNG_ID_PREFIX, false);
  apply(kbb, KBB_ID_PREFIX, false);

  // 2. Overlay from in-memory cache
  apply(cctvCache.kabStreams, KAB_ID_PREFIX, true);
  apply(cctvCache.pelindungStreams, PELINDUNG_ID_PREFIX, false);
  apply(cctvCache.kbbStreams, KBB_ID_PREFIX, false);

  // 3. If in-memory KAB stream cache is empty, fetch live tokens on cold start
  if (Object.keys(cctvCache.kabStreams).length === 0) {
    const liveKab = await fetchLiveKabStreams();
    apply(liveKab.streams, KAB_ID_PREFIX, true);
  }

  const merged = Array.from(map.values());

  return NextResponse.json(
    { source: redis ? "redis+file+memory" : "file+memory", count: merged.length, data: merged },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}