export interface KabStreamInfo {
  id: string;
  name: string;
  lat: number;
  lng: number;
  streamUrl: string;
}

export interface CctvCacheState {
  kabStreams: Record<string, KabStreamInfo>;
  pelindungStreams: Record<string, { streamUrl: string; name?: string; lat?: number; lng?: number }>;
  kbbStreams: Record<string, { streamUrl: string; name?: string; lat?: number; lng?: number }>;
  kabTokenHash: string | null;
  kabApiQuery: string | null;
  lastScrapedKab: number;
}

const g = globalThis as unknown as { __cctv_cache?: CctvCacheState };
if (!g.__cctv_cache) {
  g.__cctv_cache = {
    kabStreams: {},
    pelindungStreams: {},
    kbbStreams: {},
    kabTokenHash: null,
    kabApiQuery: null,
    lastScrapedKab: 0,
  };
}

export const cctvCache = g.__cctv_cache;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Scrapes fresh stream URLs directly from dishub.bandungkab.go.id
 * Caches in memory for 5 minutes unless forced.
 */
export async function fetchLiveKabStreams(force = false): Promise<{
  streams: Record<string, KabStreamInfo>;
  tokenHash: string | null;
  apiQuery: string | null;
}> {
  const now = Date.now();
  if (!force && now - cctvCache.lastScrapedKab < 5 * 60 * 1000 && cctvCache.kabTokenHash) {
    return {
      streams: cctvCache.kabStreams,
      tokenHash: cctvCache.kabTokenHash,
      apiQuery: cctvCache.kabApiQuery,
    };
  }

  try {
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

    const out: Record<string, KabStreamInfo> = {};
    let firstHash: string | null = null;
    let firstApiQuery: string | null = null;
    let m: RegExpExecArray | null;

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

      if (!firstHash) {
        const hashMatch = streamUrl.match(/cctv\.bandungkab\.go\.id\/([a-f0-9]{32})\//i);
        if (hashMatch) firstHash = hashMatch[1];
        const apiMatch = streamUrl.match(/[?&]api=([^&]+)/);
        if (apiMatch) firstApiQuery = apiMatch[1];
      }
    }

    if (Object.keys(out).length > 0) {
      cctvCache.kabStreams = out;
      cctvCache.kabTokenHash = firstHash;
      cctvCache.kabApiQuery = firstApiQuery;
      cctvCache.lastScrapedKab = now;
    }

    return {
      streams: cctvCache.kabStreams,
      tokenHash: cctvCache.kabTokenHash,
      apiQuery: cctvCache.kabApiQuery,
    };
  } catch (err) {
    console.warn("[CCTV-CACHE] Error fetching fresh KAB streams:", err);
    return {
      streams: cctvCache.kabStreams,
      tokenHash: cctvCache.kabTokenHash,
      apiQuery: cctvCache.kabApiQuery,
    };
  }
}

/**
 * Repairs a Bandung Kab stream URL by replacing any expired 32-char token hash
 * and api query with the active valid token.
 */
export async function repairBandungKabUrl(url: string, forceRefresh = false): Promise<string> {
  if (!url.includes("cctv.bandungkab.go.id")) return url;

  const { tokenHash, apiQuery } = await fetchLiveKabStreams(forceRefresh);
  if (!tokenHash) return url;

  let repaired = url.replace(/cctv\.bandungkab\.go\.id\/[a-f0-9]{32}\//i, `cctv.bandungkab.go.id/${tokenHash}/`);

  if (apiQuery) {
    if (repaired.includes("api=")) {
      repaired = repaired.replace(/([?&]api=)[^&]+/, `$1${apiQuery}`);
    } else {
      repaired += (repaired.includes("?") ? "&" : "?") + `api=${apiQuery}`;
    }
  }

  return repaired;
}
