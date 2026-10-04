import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// In-memory update buffer with debouncing to prevent concurrent file write conflicts
const pendingUpdates = new Map<string, boolean>();
let flushTimer: NodeJS.Timeout | null = null;

function flushUpdates() {
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
    } catch (err) {
      console.error(`[CCTV-STATUS] Error updating ${filePath}:`, err);
    }
  }
}

function queueUpdate(id: string, online: boolean) {
  pendingUpdates.set(id, online);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushUpdates, 800);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

    // Support batch update: { updates: [{ id: string, online: boolean }] }
    if (Array.isArray(body.updates)) {
      const slice = body.updates.slice(0, 1000);
      for (const item of slice) {
        if (
          typeof item.id === "string" &&
          SAFE_ID_PATTERN.test(item.id) &&
          typeof item.online === "boolean"
        ) {
          pendingUpdates.set(item.id, item.online);
        }
      }
      flushUpdates();
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

    queueUpdate(id, online);

    return NextResponse.json({ success: true, id, online });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui status CCTV" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "cctvs.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "cctvs.json tidak ditemukan" }, { status: 404 });
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const onlineCount = data.filter((c: any) => c.online !== false).length;
    const offlineCount = data.filter((c: any) => c.online === false).length;

    return NextResponse.json({
      total: data.length,
      online: onlineCount,
      offline: offlineCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
