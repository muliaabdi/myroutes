import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { redis } from "@/lib/redis";

// In-memory update buffer with debouncing to prevent concurrent file write conflicts (for local/Docker)
const pendingUpdates = new Map<string, boolean>();
let flushTimer: NodeJS.Timeout | null = null;

function flushFileUpdates() {
  if (pendingUpdates.size === 0) return;

  const updatesToApply = new Map(pendingUpdates);
  pendingUpdates.clear();

  const rootDir = process.cwd();
  const targetFiles = [
    path.join(rootDir, "public", "cctvs.json"),
    path.join(rootDir, "src", "data", "cctvs.json"),
  ];

  for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      let changed = false;

      for (const item of data) {
        if (updatesToApply.has(item.id)) {
          const newStatus = updatesToApply.get(item.id)!;
          if (item.online !== newStatus) {
            item.online = newStatus;
            changed = true;
          }
        }
      }

      if (changed) {
        const tempPath = `${filePath}.tmp.${Date.now()}`;
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
        fs.renameSync(tempPath, filePath);
      }
    } catch {
      // Safe fallback if filesystem is read-only (e.g. Vercel)
    }
  }
}

function queueFileUpdate(id: string, online: boolean) {
  pendingUpdates.set(id, online);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushFileUpdates, 800);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

    // Support batch update: { updates: [{ id: string, online: boolean }] }
    if (Array.isArray(body.updates)) {
      const slice = body.updates.slice(0, 1000);
      const redisBatch: Record<string, string> = {};

      for (const item of slice) {
        if (
          typeof item.id === "string" &&
          SAFE_ID_PATTERN.test(item.id) &&
          typeof item.online === "boolean"
        ) {
          queueFileUpdate(item.id, item.online);
          redisBatch[item.id] = item.online ? "1" : "0";
        }
      }

      if (redis && Object.keys(redisBatch).length > 0) {
        try {
          await redis.hset("cctv:status", redisBatch);
        } catch (redisErr) {
          console.error("[REDIS] Error batch saving cctv:status:", redisErr);
        }
      }

      flushFileUpdates();
      return NextResponse.json({ success: true, count: slice.length });
    }

    // Support single update: { id: string, online: boolean }
    const { id, online } = body;
    if (!id || typeof online !== "boolean" || !SAFE_ID_PATTERN.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Format salah. Wajib sertakan 'id' valid (string alphanumeric) dan 'online' (boolean).",
        },
        { status: 400 }
      );
    }

    // 1. Sync to Redis (serverless / persistent cloud)
    if (redis) {
      try {
        await redis.hset("cctv:status", { [id]: online ? "1" : "0" });
      } catch (redisErr) {
        console.error("[REDIS] Error saving cctv:status:", redisErr);
      }
    }

    // 2. Queue local file write if applicable
    queueFileUpdate(id, online);

    return NextResponse.json({
      success: true,
      id,
      online,
      storage: redis ? "redis" : "file",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui status CCTV" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 1. Try reading live status from Redis
    if (redis) {
      try {
        const statuses = await redis.hgetall<Record<string, string>>("cctv:status");
        if (statuses && Object.keys(statuses).length > 0) {
          const values = Object.values(statuses);
          const onlineCount = values.filter((v) => v === "1").length;
          const offlineCount = values.filter((v) => v === "0").length;

          return NextResponse.json({
            source: "redis",
            total: values.length,
            online: onlineCount,
            offline: offlineCount,
            statuses,
          });
        }
      } catch (redisErr) {
        console.error("[REDIS] Error reading cctv:status:", redisErr);
      }
    }

    // 2. Fallback to local cctvs.json
    const filePath = path.join(process.cwd(), "public", "cctvs.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "cctvs.json tidak ditemukan" }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const onlineCount = data.filter((c: any) => c.online !== false).length;
    const offlineCount = data.filter((c: any) => c.online === false).length;

    return NextResponse.json({
      source: "file",
      total: data.length,
      online: onlineCount,
      offline: offlineCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
