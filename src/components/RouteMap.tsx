"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CCTVModal from "./CCTVModal";

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface TrafficSegment {
  coordinates: Array<{ lat: number; lng: number }>;
  congestion: string;
  color: string;
  distance: number;
  duration: number;
}

interface RouteData {
  summary: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    distance: { text: string; meters: number };
    duration: { text: string; seconds: number };
    startAddress: string;
    endAddress: string;
  };
  coordinates: { lat: number; lng: number }[];
  steps: Array<{
    instruction: string;
    distance: { text: string };
    duration: { text: string };
  }>;
  trafficSegments?: TrafficSegment[];
}

interface CCTV {
  id: string;
  name: string;
  lat: number;
  lng: number;
  streamUrl: string;
  online?: boolean;
}

export interface SPKLU {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  powerKw: number;
  chargingSpeed: string;
  provider: string;
  category: string;
  plugType: string;
  is24h: boolean;
}

interface Waypoint {
  lat: number;
  lng: number;
  address: string;
}

// Map styles configuration
const MAP_STYLES = {
  google: {
    name: "Google Maps",
    url: "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    attribution: '&copy; Google Maps contributors | Leaflet',
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
  },
  voyager: {
    name: "Voyager Modern",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> | Leaflet',
    subdomains: "abcd",
  },
  dark: {
    name: "Dark Matter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> | Leaflet',
    subdomains: "abcd",
  },
  satellite: {
    name: "Citra Satelit",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri | Leaflet",
    subdomains: undefined,
  },
  osm: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: undefined,
  },
};

// Helper: Haversine distance in meters
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Distance from point to line segment
function distanceToSegment(
  point: { lat: number; lng: number },
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): number {
  const lat1 = (start.lat * Math.PI) / 180;
  const lng1 = (start.lng * Math.PI) / 180;
  const lat2 = (end.lat * Math.PI) / 180;
  const lng2 = (end.lng * Math.PI) / 180;
  const lat3 = (point.lat * Math.PI) / 180;
  const lng3 = (point.lng * Math.PI) / 180;

  const R = 6371000;
  const dLng = lng2 - lng1;
  const dLat = lat2 - lat1;
  const segLen2 = dLat * dLat + dLng * dLng;

  if (segLen2 < 1e-12) {
    return calculateDistance(start.lat, start.lng, point.lat, point.lng);
  }

  const t = ((lat3 - lat1) * dLat + (lng3 - lng1) * dLng) / segLen2;
  if (t < 0) return calculateDistance(start.lat, start.lng, point.lat, point.lng);
  if (t > 1) return calculateDistance(end.lat, end.lng, point.lat, point.lng);

  const projLat = lat1 + t * dLat;
  const projLng = lng1 + t * dLng;
  const dLatProj = projLat - lat3;
  const dLngProj = projLng - lng3;
  const a = dLatProj * dLatProj + dLngProj * dLngProj * Math.cos((lat3 + projLat) / 2);

  return R * Math.sqrt(a);
}

// Distance from point to polyline
function distanceToPolyline(point: { lat: number; lng: number }, polyline: { lat: number; lng: number }[]): number {
  let minDistance = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const distance = distanceToSegment(point, polyline[i], polyline[i + 1]);
    minDistance = Math.min(minDistance, distance);
  }
  return minDistance;
}

// Optimized: Filter CCTVs near route with fast Bounding-Box pre-filtering
function getCCTVsNearRoute(
  cctvs: CCTV[],
  routeCoordinates: { lat: number; lng: number }[],
  maxDistance: number = 150
): CCTV[] {
  if (!routeCoordinates || routeCoordinates.length === 0 || cctvs.length === 0) return [];

  // Bounding box with buffer (~0.003 degrees ≈ 330m)
  const degBuffer = (maxDistance * 2.5) / 111000;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (let i = 0; i < routeCoordinates.length; i++) {
    const c = routeCoordinates[i];
    if (c.lat < minLat) minLat = c.lat;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lng < minLng) minLng = c.lng;
    if (c.lng > maxLng) maxLng = c.lng;
  }
  minLat -= degBuffer;
  maxLat += degBuffer;
  minLng -= degBuffer;
  maxLng += degBuffer;

  // 1. Fast pre-filter: O(N) simple bounds check (discards 95% of CCTVs in <1ms)
  const candidates = cctvs.filter(
    (c) => c.lat >= minLat && c.lat <= maxLat && c.lng >= minLng && c.lng <= maxLng
  );

  // 2. Exact polyline check only for candidates (typically 10-25 CCTVs instead of 528)
  const cctvWithRouteIndex = candidates
    .map((cctv) => {
      let minDistance = Infinity;
      let closestIndex = 0;

      routeCoordinates.forEach((coord, index) => {
        const dist = Math.sqrt(
          Math.pow(cctv.lat - coord.lat, 2) + Math.pow(cctv.lng - coord.lng, 2)
        );
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = index;
        }
      });

      const distanceToRoute = distanceToPolyline({ lat: cctv.lat, lng: cctv.lng }, routeCoordinates);

      return {
        cctv,
        closestIndex,
        distanceToRoute,
      };
    })
    .filter((item) => item.distanceToRoute <= maxDistance)
    .sort((a, b) => a.closestIndex - b.closestIndex);

  return cctvWithRouteIndex.map((item) => item.cctv);
}

// Optimized: Filter SPKLUs near route with fast Bounding-Box pre-filtering
function getSPKLUsNearRoute(
  spklus: SPKLU[],
  routeCoordinates: { lat: number; lng: number }[],
  maxDistance: number = 800
): SPKLU[] {
  if (!routeCoordinates || routeCoordinates.length === 0 || spklus.length === 0) return [];

  const degBuffer = (maxDistance * 2.5) / 111000;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (let i = 0; i < routeCoordinates.length; i++) {
    const c = routeCoordinates[i];
    if (c.lat < minLat) minLat = c.lat;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lng < minLng) minLng = c.lng;
    if (c.lng > maxLng) maxLng = c.lng;
  }
  minLat -= degBuffer;
  maxLat += degBuffer;
  minLng -= degBuffer;
  maxLng += degBuffer;

  const candidates = spklus.filter(
    (s) => s.lat >= minLat && s.lat <= maxLat && s.lng >= minLng && s.lng <= maxLng
  );

  const spkluWithRouteIndex = candidates
    .map((spklu) => {
      let minDistance = Infinity;
      let closestIndex = 0;

      routeCoordinates.forEach((coord, index) => {
        const dist = Math.sqrt(
          Math.pow(spklu.lat - coord.lat, 2) + Math.pow(spklu.lng - coord.lng, 2)
        );
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = index;
        }
      });

      const distanceToRoute = distanceToPolyline({ lat: spklu.lat, lng: spklu.lng }, routeCoordinates);

      return {
        spklu,
        closestIndex,
        distanceToRoute,
      };
    })
    .filter((item) => item.distanceToRoute <= maxDistance)
    .sort((a, b) => a.closestIndex - b.closestIndex);

  return spkluWithRouteIndex.map((item) => item.spklu);
}

export default function RouteMap() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const cctvLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const spkluLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const waypointMarkersRef = useRef<L.Marker[]>([]);
  const trafficSegmentsRef = useRef<L.Polyline[]>([]);
  const clickMarkerRef = useRef<L.Marker | null>(null);

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCCTV, setSelectedCCTV] = useState<CCTV | null>(null);
  const [showCCTV, setShowCCTV] = useState(false);
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>("google");
  const [useMapboxTraffic, setUseMapboxTraffic] = useState(false);
  const [showAllCCTVs, setShowAllCCTVs] = useState(false);
  const [nearbyCCTVs, setNearbyCCTVs] = useState<CCTV[]>([]);
  const [CCTVS, setCCTVS] = useState<CCTV[]>([]);
  const [cctvStatus, setCctvStatus] = useState<Map<string, boolean>>(new Map());
  const [updatingCCTV, setUpdatingCCTV] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  // SPKLU States
  const [spklus, setSPKLUs] = useState<SPKLU[]>([]);
  const [showSPKLU, setShowSPKLU] = useState(true);
  const [showAllSPKLUs, setShowAllSPKLUs] = useState(false);
  const [nearbySPKLUs, setNearbySPKLUs] = useState<SPKLU[]>([]);
  const [sidebarTab, setSidebarTab] = useState<"cctv" | "spklu">("cctv");

  // Origin, Destination, Waypoints
  const [origin, setOrigin] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [activeSearchTarget, setActiveSearchTarget] = useState<"origin" | "destination" | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  // Click mode: 'origin' | 'destination' | 'waypoint' | null
  const [clickMode, setClickMode] = useState<"origin" | "destination" | "waypoint" | null>(null);
  const clickModeRef = useRef<"origin" | "destination" | "waypoint" | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ name: string; address: { lat: number; lng: number } }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Sync text inputs with origin & destination
  useEffect(() => {
    if (origin) setOriginText(origin.address);
    else setOriginText("");
  }, [origin]);

  useEffect(() => {
    if (destination) setDestinationText(destination.address);
    else setDestinationText("");
  }, [destination]);

  // UI state
  const [showSidebar, setShowSidebar] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Load saved points from localStorage
  useEffect(() => {
    try {
      const savedOrigin = localStorage.getItem("myroutes-origin");
      const savedDestination = localStorage.getItem("myroutes-destination");
      if (savedOrigin) setOrigin(JSON.parse(savedOrigin));
      if (savedDestination) setDestination(JSON.parse(savedDestination));
    } catch (e) {
      console.error("Failed to load saved route:", e);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      if (origin) localStorage.setItem("myroutes-origin", JSON.stringify(origin));
      else localStorage.removeItem("myroutes-origin");
    } catch {}
  }, [origin]);

  useEffect(() => {
    try {
      if (destination) localStorage.setItem("myroutes-destination", JSON.stringify(destination));
      else localStorage.removeItem("myroutes-destination");
    } catch {}
  }, [destination]);

  // Load CCTV data
  const loadCCTVs = useCallback(async () => {
    try {
      const res = await fetch(`/cctvs.json?t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to load CCTV data");
      const data = await res.json();
      const list: CCTV[] = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        lat: parseFloat(c.lat),
        lng: parseFloat(c.lng),
        streamUrl: c.streamUrl,
      }));
      setCCTVS(list);
    } catch (err) {
      console.error("Error loading CCTV data:", err);
      setCCTVS([]);
    }
  }, []);

  // Load SPKLU data
  const loadSPKLUs = useCallback(async () => {
    try {
      const res = await fetch(`/spklus.json?t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to load SPKLU data");
      const data = await res.json();
      setSPKLUs(data);
    } catch (err) {
      console.error("Error loading SPKLU data:", err);
      setSPKLUs([]);
    }
  }, []);

  useEffect(() => {
    loadCCTVs();
    loadSPKLUs();
  }, [loadCCTVs, loadSPKLUs]);

  // On-demand scraper update handler
  const handleUpdateCCTVs = useCallback(async () => {
    setUpdatingCCTV(true);
    setUpdateMessage(null);
    try {
      const res = await fetch("/api/update-cctv", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await Promise.all([loadCCTVs(), loadSPKLUs()]);
        setUpdateMessage(data.message || "Data CCTV & SPKLU berhasil diperbarui!");
      } else {
        setUpdateMessage("Gagal: " + (data.error || "Gagal update"));
      }
    } catch (err: any) {
      setUpdateMessage("Gagal: " + (err.message || String(err)));
    } finally {
      setUpdatingCCTV(false);
      setTimeout(() => setUpdateMessage(null), 4500);
    }
  }, [loadCCTVs, loadSPKLUs]);

  // Handle open CCTV modal
  const handleOpenCCTVModal = useCallback((cctv: CCTV) => {
    setSelectedCCTV(cctv);
    setShowCCTV(true);
  }, []);

  const handleCCTVError = useCallback((cctvId: string, hasError: boolean) => {
    setCctvStatus((prev) => new Map(prev).set(cctvId, !hasError));
  }, []);

  useEffect(() => {
    clickModeRef.current = clickMode;
  }, [clickMode]);

  // Geocode Search
  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (searchAbortRef.current) searchAbortRef.current.abort();
    const abort = new AbortController();
    searchAbortRef.current = abort;

    try {
      setSearchLoading(true);
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: abort.signal });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.results || []);
      setShowSearchResults(true);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Search error:", err);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectLocation = (
    item: { name: string; address: { lat: number; lng: number } },
    target?: "origin" | "destination"
  ) => {
    const effectiveTarget = target || activeSearchTarget || clickMode || "origin";
    const locationData = { lat: item.address.lat, lng: item.address.lng, address: item.name };

    if (effectiveTarget === "origin") {
      setOrigin(locationData);
      setOriginText(item.name);
    } else if (effectiveTarget === "destination") {
      setDestination(locationData);
      setDestinationText(item.name);
    } else if (effectiveTarget === "waypoint") {
      setWaypoints((prev) => [...prev, locationData]);
    }

    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    setActiveSearchTarget(null);
    setClickMode(null);
    clickModeRef.current = null;

    if (mapRef.current) {
      mapRef.current.setView([item.address.lat, item.address.lng], 14);
    }
  };

  // Get User Current Location
  const handleGetCurrentLocation = (target: "origin" | "destination" = "origin") => {
    if (!navigator.geolocation) {
      alert("Geolokasi tidak didukung oleh browser Anda.");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGettingLocation(false);
        const { latitude, longitude } = pos.coords;
        const locationData = {
          lat: latitude,
          lng: longitude,
          address: "Lokasi Anda Saat Ini",
        };
        if (target === "origin") {
          setOrigin(locationData);
          setOriginText(locationData.address);
        } else {
          setDestination(locationData);
          setDestinationText(locationData.address);
        }

        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 15);
        }
      },
      (err) => {
        setGettingLocation(false);
        console.error("Geolocation error:", err);
        alert("Gagal mendapatkan lokasi saat ini. Pastikan izin lokasi aktif.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Switch map tile layer
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);

    const style = MAP_STYLES[mapStyle];
    const tileLayer = L.tileLayer(style.url, {
      attribution: style.attribution,
      subdomains: style.subdomains ?? "abcd",
      maxZoom: 20,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
  }, [mapStyle]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultCenter = { lat: -6.9175, lng: 107.6191 }; // Bandung center
    const center: [number, number] =
      origin && destination
        ? [(origin.lat + destination.lat) / 2, (origin.lng + destination.lng) / 2]
        : [defaultCenter.lat, defaultCenter.lng];

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      preferCanvas: true,
    }).setView(center, 13);

    const cctvLayer = L.layerGroup().addTo(map);
    cctvLayerGroupRef.current = cctvLayer;

    const spkluLayer = L.layerGroup().addTo(map);
    spkluLayerGroupRef.current = spkluLayer;

    const style = MAP_STYLES[mapStyle];
    const tileLayer = L.tileLayer(style.url, {
      attribution: style.attribution,
      subdomains: style.subdomains ?? "abcd",
      maxZoom: 20,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapRef.current = map;

    // Remove default attribution
    const attribution = map.getContainer().querySelector(".leaflet-control-attribution") as HTMLElement;
    if (attribution) attribution.style.display = "none";

    // Map Click Handler
    map.on("click", (e) => {
      const mode = clickModeRef.current;
      if (!mode) return;

      const { lat, lng } = e.latlng;
      const coords = { lat, lng };

      if (clickMarkerRef.current) {
        map.removeLayer(clickMarkerRef.current);
      }

      const badgeColor = mode === "origin" ? "bg-emerald-500" : mode === "destination" ? "bg-rose-500" : "bg-amber-500";
      const badgeText = mode === "origin" ? "A" : mode === "destination" ? "B" : "+";

      const clickIcon = L.divIcon({
        html: `
          <div class="flex items-center justify-center w-8 h-8 ${badgeColor} rounded-full border-2 border-white shadow-xl animate-bounce">
            <span class="text-white text-xs font-bold">${badgeText}</span>
          </div>
        `,
        className: "custom-click-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      clickMarkerRef.current = L.marker([lat, lng], { icon: clickIcon }).addTo(map);

      const label = `Titik (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      if (mode === "origin") {
        setOrigin({ ...coords, address: label });
        setOriginText(label);
      } else if (mode === "destination") {
        setDestination({ ...coords, address: label });
        setDestinationText(label);
      } else if (mode === "waypoint") {
        setWaypoints((prev) => [...prev, { ...coords, address: label }]);
      }

      setClickMode(null);
      clickModeRef.current = null;
      setActiveSearchTarget(null);
    });

    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 150);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        cctvLayerGroupRef.current = null;
        spkluLayerGroupRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update CCTV Markers with Viewport Culling & optimized rendering
  const renderCCTVMarkers = useCallback(() => {
    if (!mapRef.current || !cctvLayerGroupRef.current) return;
    const map = mapRef.current;
    const layer = cctvLayerGroupRef.current;
    layer.clearLayers();

    const bounds = map.getBounds().pad(0.15);
    const cctvsSource = showAllCCTVs ? CCTVS : nearbyCCTVs;

    // Viewport Culling: only draw cameras inside visible map viewport
    const visibleList = showAllCCTVs
      ? cctvsSource.filter((c) => bounds.contains([c.lat, c.lng]))
      : cctvsSource;

    visibleList.forEach((cctv) => {
      const isOnline = cctvStatus.get(cctv.id) ?? true;
      // Do not run 500 animate-ping loops simultaneously
      const shouldAnimate = !showAllCCTVs && isOnline;

      const icon = L.divIcon({
        html: `
          <div class="group relative cursor-pointer">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center shadow-md transition-transform duration-150 group-hover:scale-125 ${
              isOnline
                ? "bg-slate-900 border-2 border-emerald-400 text-emerald-400"
                : "bg-slate-900 border-2 border-rose-500 text-rose-500"
            }">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </div>
            <span class="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              ${shouldAnimate ? '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>' : ""}
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? "bg-emerald-500" : "bg-rose-500"}"></span>
            </span>
          </div>
        `,
        className: "custom-cctv-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      const marker = L.marker([cctv.lat, cctv.lng], { icon });
      marker.bindPopup(`
        <div class="p-1 min-w-[200px]">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"}"></span>
            <span class="text-[10px] font-bold tracking-wider uppercase ${isOnline ? "text-emerald-600" : "text-rose-600"}">
              ${isOnline ? "Online Live" : "Offline"}
            </span>
          </div>
          <p class="font-semibold text-xs text-slate-900 leading-snug mb-2.5">${cctv.name}</p>
          <button
            onclick="window.openCCTVModal('${cctv.id}')"
            class="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tonton Live
          </button>
        </div>
      `);

      marker.on("click", () => handleOpenCCTVModal(cctv));
      layer.addLayer(marker);
    });

    (window as any).openCCTVModal = (id: string) => {
      const target = CCTVS.find((c) => c.id === id);
      if (target) handleOpenCCTVModal(target);
    };
  }, [showAllCCTVs, CCTVS, nearbyCCTVs, cctvStatus, handleOpenCCTVModal]);

  // Render SPKLU Charging Station Markers
  const renderSPKLUMarkers = useCallback(() => {
    if (!mapRef.current || !spkluLayerGroupRef.current) return;
    const map = mapRef.current;
    const layer = spkluLayerGroupRef.current;
    layer.clearLayers();

    if (!showSPKLU) return;

    const bounds = map.getBounds().pad(0.15);
    const sourceList = routeData && nearbySPKLUs.length > 0 && !showAllSPKLUs ? nearbySPKLUs : spklus;
    const visibleList = sourceList.filter((s) => bounds.contains([s.lat, s.lng]));

    visibleList.forEach((spklu) => {
      const isFast = spklu.powerKw >= 50 || spklu.chargingSpeed.toLowerCase().includes("fast");

      const icon = L.divIcon({
        html: `
          <div class="group relative cursor-pointer" title="${spklu.name}">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center shadow-md transition-transform duration-150 group-hover:scale-125 bg-slate-900 border-2 ${
              isFast ? "border-amber-400 text-amber-400" : "border-emerald-400 text-emerald-400"
            }">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4h7a2 2 0 0 1 2 2v14H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 8h4M7.5 13l2-3h-2l1-3" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 9h2a2 2 0 0 1 2 2v4a2 2 0 0 0 4 0V9a2 2 0 0 0-2-2h-1" />
              </svg>
            </div>
            ${
              spklu.powerKw > 0
                ? `<span class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-950 text-[8px] font-mono font-bold px-1 rounded border border-slate-700 text-slate-200 whitespace-nowrap shadow-sm">${spklu.powerKw}kW</span>`
                : ""
            }
          </div>
        `,
        className: "custom-spklu-marker",
        iconSize: [32, 36],
        iconAnchor: [16, 18],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([spklu.lat, spklu.lng], { icon });
      marker.bindPopup(`
        <div class="p-1 min-w-[220px] max-w-[260px]">
          <div class="flex items-center justify-between gap-1 mb-1.5">
            <span class="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md ${
              isFast
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }">
              ${spklu.chargingSpeed}
            </span>
            ${
              spklu.is24h
                ? '<span class="text-[9px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">24 Jam</span>'
                : ""
            }
          </div>
          <p class="font-bold text-xs text-slate-900 leading-tight mb-1">${spklu.name}</p>
          <p class="text-[11px] text-slate-500 mb-2 leading-snug line-clamp-2">${spklu.address || spklu.city}</p>
          <div class="grid grid-cols-2 gap-1 text-[10px] bg-slate-50 p-1.5 rounded-lg mb-2.5">
            <div>
              <span class="text-slate-400 block text-[9px]">Daya & Soket</span>
              <span class="font-semibold text-slate-700 truncate block">${spklu.powerKw} kW • ${spklu.plugType}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[9px]">Provider & Lokasi</span>
              <span class="font-semibold text-slate-700 truncate block">${spklu.provider} (${spklu.category})</span>
            </div>
          </div>
          <div class="flex gap-1.5">
            <button
              onclick="window.setSPKLUDestination(${spklu.lat}, ${spklu.lng}, '${spklu.name.replace(/'/g, "\\'")}')"
              class="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg shadow-sm transition-colors text-center"
            >
              Rute ke Sini
            </button>
            <button
              onclick="window.addSPKLUWaypoint(${spklu.lat}, ${spklu.lng}, '${spklu.name.replace(/'/g, "\\'")}')"
              class="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition-colors"
              title="Tambah Titik Singgah"
            >
              + Singgah
            </button>
          </div>
        </div>
      `);
      layer.addLayer(marker);
    });

    (window as any).setSPKLUDestination = (lat: number, lng: number, name: string) => {
      setDestination({ lat, lng, address: name });
      setDestinationText(name);
    };

    (window as any).addSPKLUWaypoint = (lat: number, lng: number, name: string) => {
      setWaypoints((prev) => [...prev, { lat, lng, address: name }]);
    };
  }, [showSPKLU, showAllSPKLUs, spklus, nearbySPKLUs, routeData]);

  // Synchronize CCTV & SPKLU markers and update on viewport pan/zoom
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    renderCCTVMarkers();
    renderSPKLUMarkers();

    const onMapMove = () => {
      if (showAllCCTVs) {
        renderCCTVMarkers();
      }
      if (showSPKLU) {
        renderSPKLUMarkers();
      }
    };

    map.on("moveend", onMapMove);
    return () => {
      map.off("moveend", onMapMove);
    };
  }, [renderCCTVMarkers, renderSPKLUMarkers, showAllCCTVs, showSPKLU]);

  // Fetch Route Data
  useEffect(() => {
    const fetchRoute = async () => {
      if (!origin || !destination) {
        setRouteData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const endpoint = useMapboxTraffic ? "/api/route/mapbox" : "/api/route";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: destination.lat, lng: destination.lng },
            waypoints: waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng })),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Gagal menghitung rute");
        }

        const data = await response.json();
        setRouteData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat rute");
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [useMapboxTraffic, origin, destination, waypoints]);

  // Draw Route & Pins
  useEffect(() => {
    if (!routeData || !mapRef.current) return;
    const map = mapRef.current;

    if (clickMarkerRef.current) {
      map.removeLayer(clickMarkerRef.current);
      clickMarkerRef.current = null;
    }

    if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    waypointMarkersRef.current.forEach((m) => map.removeLayer(m));
    waypointMarkersRef.current = [];
    trafficSegmentsRef.current.forEach((p) => map.removeLayer(p));
    trafficSegmentsRef.current = [];

    // Base glowing route
    const latLngs = routeData.coordinates.map((c) => [c.lat, c.lng] as [number, number]);
    const blueRoute = L.polyline(latLngs, {
      color: "#4f46e5", // Indigo accent
      weight: 6,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    routeLayerRef.current = blueRoute;

    // Traffic segments
    if (routeData.trafficSegments && routeData.trafficSegments.length > 0) {
      routeData.trafficSegments.forEach((seg) => {
        const segLatLngs = seg.coordinates.map((c) => [c.lat, c.lng] as [number, number]);
        const polyline = L.polyline(segLatLngs, {
          color: seg.color,
          weight: 6,
          opacity: 1.0,
          lineCap: "round",
        }).addTo(map);
        trafficSegmentsRef.current.push(polyline);
      });
    }

    map.fitBounds(blueRoute.getBounds(), { padding: [60, 60] });

    // Origin Pin
    const originIcon = L.divIcon({
      html: `
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-xl text-white font-bold text-xs">
          A
        </div>
      `,
      className: "custom-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
    const originMarker = L.marker([routeData.summary.origin.lat, routeData.summary.origin.lng], {
      icon: originIcon,
    }).addTo(map);
    originMarker.bindPopup(`<div class="p-1"><b class="text-xs text-emerald-700">Titik Awal (A)</b><p class="text-xs text-slate-700 mt-1">${routeData.summary.startAddress}</p></div>`);
    markersRef.current.push(originMarker);

    // Waypoints
    waypoints.forEach((wp, index) => {
      const waypointIcon = L.divIcon({
        html: `
          <div class="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 border-2 border-white shadow-lg text-white font-bold text-xs">
            ${index + 1}
          </div>
        `,
        className: "custom-marker",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });
      const wpMarker = L.marker([wp.lat, wp.lng], { icon: waypointIcon }).addTo(map);
      wpMarker.bindPopup(`<div class="p-1"><b class="text-xs text-amber-700">Singgah ${index + 1}</b><p class="text-xs text-slate-700 mt-1">${wp.address}</p></div>`);
      waypointMarkersRef.current.push(wpMarker);
    });

    // Destination Pin
    const destIcon = L.divIcon({
      html: `
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl text-white font-bold text-xs">
          B
        </div>
      `,
      className: "custom-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
    const destMarker = L.marker([routeData.summary.destination.lat, routeData.summary.destination.lng], {
      icon: destIcon,
    }).addTo(map);
    destMarker.bindPopup(`<div class="p-1"><b class="text-xs text-rose-700">Tujuan (B)</b><p class="text-xs text-slate-700 mt-1">${routeData.summary.endAddress}</p></div>`);
    markersRef.current.push(destMarker);

    // Calculate nearby CCTVs (150m buffer)
    const nearby = getCCTVsNearRoute(CCTVS, routeData.coordinates, 150);
    setNearbyCCTVs(nearby);

    // Calculate nearby SPKLUs (800m buffer)
    const nearSpklu = getSPKLUsNearRoute(spklus, routeData.coordinates, 800);
    setNearbySPKLUs(nearSpklu);
  }, [routeData, CCTVS, spklus, waypoints]);

  // Fit bounds helper
  const handleFitRoute = () => {
    if (!routeData || !mapRef.current) return;
    const bounds = L.latLngBounds(routeData.coordinates.map((c) => [c.lat, c.lng] as [number, number]));
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-full relative z-0"
        data-click-mode={clickMode || ""}
      />

      {/* Floating Header / Brand Pill on Mobile / Desktop */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800 shadow-lg text-slate-800 dark:text-zinc-100 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
          title={showSidebar ? "Sembunyikan Panel" : "Buka Panel Rute"}
        >
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <span>MyRoutes</span>
          <span className="hidden sm:inline-flex text-[11px] font-normal text-slate-500 dark:text-zinc-400 border-l border-slate-200 dark:border-zinc-700 pl-2">
            Bandung Live
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showSidebar ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Floating Map Action Controls (Right side dock) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        {/* Filter Pills Container */}
        <div className="flex items-center gap-2">
          {/* SPKLU Quick Toggle Pill */}
          <button
            onClick={() => {
              if (!showSPKLU) {
                setShowSPKLU(true);
                setShowAllSPKLUs(false);
              } else if (!showAllSPKLUs && routeData) {
                setShowAllSPKLUs(true);
              } else {
                setShowSPKLU(false);
                setShowAllSPKLUs(false);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl backdrop-blur-xl border text-xs font-semibold shadow-lg transition-all active:scale-95 ${
              showSPKLU
                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-500/25"
                : "bg-white/95 dark:bg-zinc-900/95 text-slate-800 dark:text-zinc-100 border-slate-200/80 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Toggle Titik Pengisian SPKLU EV"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7a2 2 0 0 1 2 2v14H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 8h4M7.5 13l2-3h-2l1-3" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 9h2a2 2 0 0 1 2 2v4a2 2 0 0 0 4 0V9a2 2 0 0 0-2-2h-1" />
            </svg>
            <span className="font-semibold text-current">
              {!showSPKLU
                ? "SPKLU Off"
                : routeData && !showAllSPKLUs
                ? `SPKLU Rute (${nearbySPKLUs.length})`
                : `Semua SPKLU (${spklus.length})`}
            </span>
          </button>

          {/* CCTV Quick Filter Pill */}
          <button
            onClick={() => setShowAllCCTVs(!showAllCCTVs)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl backdrop-blur-xl border text-xs font-semibold shadow-lg transition-all active:scale-95 ${
              showAllCCTVs
                ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 shadow-indigo-500/25"
                : "bg-white/95 dark:bg-zinc-900/95 text-slate-800 dark:text-zinc-100 border-slate-200/80 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Filter Kamera CCTV"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-current">
              {showAllCCTVs ? `Semua CCTV (${CCTVS.length})` : `CCTV Rute (${nearbyCCTVs.length})`}
            </span>
          </button>
        </div>

        {/* Floating Quick Dock */}
        <div className="flex flex-col rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800 shadow-lg p-1 gap-1">
          {/* Layer Style Popover Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowLayersMenu(!showLayersMenu)}
              className="p-2.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Ganti Lapisan Peta"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </button>

            {showLayersMenu && (
              <div className="absolute right-full top-0 mr-2 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1.5 z-40 text-xs">
                <p className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  Tipe Tampilan Peta
                </p>
                {Object.entries(MAP_STYLES).map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setMapStyle(key as keyof typeof MAP_STYLES);
                      setShowLayersMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-between ${
                      mapStyle === key
                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                        : "text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span>{style.name}</span>
                    {mapStyle === key && (
                      <svg className="w-3.5 h-3.5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Traffic Toggle */}
          <button
            onClick={() => setUseMapboxTraffic(!useMapboxTraffic)}
            className={`p-2.5 rounded-lg transition-colors ${
              useMapboxTraffic
                ? "bg-amber-500 text-white"
                : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
            title={useMapboxTraffic ? "Traffic Aktif (Mapbox)" : "Aktifkan Traffic"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          {/* Current Location */}
          <button
            onClick={() => handleGetCurrentLocation("origin")}
            disabled={gettingLocation}
            className="p-2.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Gunakan Lokasi Saat Ini Sebagai Titik Awal"
          >
            {gettingLocation ? (
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" strokeWidth={2} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v3m0 14v3M2 12h3m14 0h3" />
              </svg>
            )}
          </button>

          {/* Fit Route */}
          {routeData && (
            <button
              onClick={handleFitRoute}
              className="p-2.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Pusatkan Seluruh Rute"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}

          {/* Zoom In */}
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="p-2.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            title="Perbesar Peta (+)"
            aria-label="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="p-2.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            title="Perkecil Peta (-)"
            aria-label="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>

          {/* Legend Toggle */}
          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`p-2.5 rounded-lg transition-colors ${
              showLegend
                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600"
                : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
            title="Keterangan Peta (Legend)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Sync / Update CCTV Streams Button */}
          <button
            onClick={handleUpdateCCTVs}
            disabled={updatingCCTV}
            className={`p-2.5 rounded-lg transition-colors ${
              updatingCCTV
                ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600"
                : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
            title="Update & Sinkronkan Token Stream CCTV"
          >
            <svg
              className={`w-4 h-4 ${updatingCCTV ? "animate-spin text-indigo-600" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Update Notification Toast */}
        {updateMessage && (
          <div className="max-w-xs bg-slate-900/95 text-white backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-2.5 text-xs animate-fadeIn flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <p className="flex-1 text-[11px] leading-tight">{updateMessage}</p>
          </div>
        )}

        {/* Legend Drawer Pill */}
        {showLegend && (
          <div className="w-56 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800 rounded-xl shadow-xl p-3 text-xs space-y-2">
            <p className="font-semibold text-slate-800 dark:text-zinc-100 text-[11px] uppercase tracking-wider">
              Keterangan Peta
            </p>
            <div className="space-y-1.5 text-slate-600 dark:text-zinc-300">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Titik Awal (A)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span>Titik Tujuan (B)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Titik Singgah (Waypoint)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-600" />
                <span>Jalur Rekomendasi</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-zinc-800">
                <div className="w-3 h-3 rounded bg-slate-900 border border-emerald-400 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <span>CCTV Online Live</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-900 border border-rose-500 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                </div>
                <span>CCTV Offline</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Main Route Drawer (Responsive: Left floating card on desktop, bottom sheet on mobile) */}
      {showSidebar && (
        <div className="absolute inset-x-3 bottom-3 top-16 md:top-4 md:left-4 md:bottom-4 md:w-[410px] md:max-w-[calc(100vw-2rem)] z-30 pointer-events-none">
          <div className="pointer-events-auto w-full h-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-zinc-800/90 shadow-2xl rounded-2xl flex flex-col overflow-hidden transition-all duration-300">
            {/* Header with Title & Close button */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-900 dark:text-zinc-100 leading-tight">
                    Rute & Pantauan CCTV
                  </h1>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Kota & Kabupaten Bandung
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSidebar(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                title="Tutup Panel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80">
              {/* Unified Route Inputs Card */}
              <div className="p-4 space-y-3">
                {/* Click-on-map status banner */}
                {clickMode && (
                  <div
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs animate-fadeIn ${
                      clickMode === "origin"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : clickMode === "destination"
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                      <span className="font-semibold">
                        {clickMode === "origin"
                          ? "Klik lokasi di peta untuk Titik Awal (A)"
                          : clickMode === "destination"
                          ? "Klik lokasi di peta untuk Titik Tujuan (B)"
                          : "Klik lokasi di peta untuk Titik Singgah"}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setClickMode(null);
                        clickModeRef.current = null;
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                )}

                {/* Connected Inputs Box (A and B) */}
                <div className="relative bg-slate-50/70 dark:bg-zinc-800/40 rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-3 space-y-2.5">
                  {/* Origin Input (A) */}
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/30">
                        A
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={originText}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOriginText(val);
                            setActiveSearchTarget("origin");
                            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                            if (!val.trim()) {
                              setSearchResults([]);
                              setShowSearchResults(false);
                              return;
                            }
                            searchTimeoutRef.current = setTimeout(() => {
                              searchLocations(val);
                            }, 300);
                          }}
                          onFocus={() => {
                            if (originText.trim()) {
                              setActiveSearchTarget("origin");
                              searchLocations(originText);
                            }
                          }}
                          placeholder="Cari lokasi awal keberangkatan..."
                          className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        />
                        {activeSearchTarget === "origin" && searchLoading && (
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                            <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Clear Button */}
                      {origin && (
                        <button
                          onClick={() => {
                            setOrigin(null);
                            setOriginText("");
                            setRouteData(null);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                          title="Hapus Titik Awal"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}

                      {/* Pick on map */}
                      <button
                        onClick={() => {
                          const nextMode = clickMode === "origin" ? null : "origin";
                          setClickMode(nextMode);
                          setActiveSearchTarget(null);
                        }}
                        className={`p-2 rounded-xl transition-all ${
                          clickMode === "origin"
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                            : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-emerald-500 hover:border-emerald-500/50"
                        }`}
                        title="Pilih Titik Awal di Peta"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>

                      {/* GPS button */}
                      <button
                        onClick={() => handleGetCurrentLocation("origin")}
                        disabled={gettingLocation}
                        className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-indigo-500 hover:border-indigo-500/50 transition-colors disabled:opacity-50"
                        title="Gunakan Lokasi Saat Ini (GPS)"
                      >
                        {gettingLocation ? (
                          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="3" strokeWidth={2} />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Autocomplete Dropdown under Origin */}
                    {activeSearchTarget === "origin" && showSearchResults && searchResults.length > 0 && (
                      <div className="absolute left-9 right-16 top-full mt-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-zinc-800">
                        {searchResults.map((res, i) => (
                          <button
                            key={i}
                            onClick={() => handleSelectLocation(res, "origin")}
                            className="w-full text-left px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span className="truncate font-medium">{res.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Center Swap & Connector line */}
                  <div className="flex items-center justify-between px-2 -my-1">
                    <div className="ml-2.5 w-0.5 h-4 bg-slate-200 dark:bg-zinc-700" />
                    <button
                      onClick={() => {
                        if (origin && destination) {
                          const temp = origin;
                          setOrigin(destination);
                          setDestination(temp);
                        }
                      }}
                      disabled={!origin || !destination}
                      className="p-1 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-sm text-slate-500 hover:text-indigo-500 hover:rotate-180 disabled:opacity-30 disabled:hover:rotate-0 transition-all duration-300"
                      title="Tukar Titik A dan B"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </button>
                    <div className="w-8" />
                  </div>

                  {/* Destination Input (B) */}
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center shrink-0 border border-rose-500/30">
                        B
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={destinationText}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDestinationText(val);
                            setActiveSearchTarget("destination");
                            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                            if (!val.trim()) {
                              setSearchResults([]);
                              setShowSearchResults(false);
                              return;
                            }
                            searchTimeoutRef.current = setTimeout(() => {
                              searchLocations(val);
                            }, 300);
                          }}
                          onFocus={() => {
                            if (destinationText.trim()) {
                              setActiveSearchTarget("destination");
                              searchLocations(destinationText);
                            }
                          }}
                          placeholder="Cari lokasi tujuan..."
                          className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all"
                        />
                        {activeSearchTarget === "destination" && searchLoading && (
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                            <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Clear Button */}
                      {destination && (
                        <button
                          onClick={() => {
                            setDestination(null);
                            setDestinationText("");
                            setRouteData(null);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                          title="Hapus Titik Tujuan"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}

                      {/* Pick on map */}
                      <button
                        onClick={() => {
                          const nextMode = clickMode === "destination" ? null : "destination";
                          setClickMode(nextMode);
                          setActiveSearchTarget(null);
                        }}
                        className={`p-2 rounded-xl transition-all ${
                          clickMode === "destination"
                            ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                            : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:text-rose-500 hover:border-rose-500/50"
                        }`}
                        title="Pilih Titik Tujuan di Peta"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>

                    {/* Autocomplete Dropdown under Destination */}
                    {activeSearchTarget === "destination" && showSearchResults && searchResults.length > 0 && (
                      <div className="absolute left-9 right-8 top-full mt-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-zinc-800">
                        {searchResults.map((res, i) => (
                          <button
                            key={i}
                            onClick={() => handleSelectLocation(res, "destination")}
                            className="w-full text-left px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span className="truncate font-medium">{res.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Waypoint Action & Bandung Landmarks */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        const next = clickMode === "waypoint" ? null : "waypoint";
                        setClickMode(next);
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                        clickMode === "waypoint"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>{clickMode === "waypoint" ? "Klik Peta untuk Singgah" : "+ Titik Singgah"}</span>
                    </button>

                    {waypoints.length > 0 && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {waypoints.length} singgah
                      </span>
                    )}
                  </div>

                  {/* Waypoint list */}
                  {waypoints.length > 0 && (
                    <div className="space-y-1.5">
                      {waypoints.map((wp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-slate-800 dark:text-zinc-200"
                        >
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="flex-1 truncate" title={wp.address}>
                            {wp.address}
                          </span>
                          <button
                            onClick={() => setWaypoints((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                            title="Hapus titik singgah"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Landmarks in Bandung */}
                  <div className="pt-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Pilihan Cepat
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { name: "Alun-Alun", lat: -6.9218, lng: 107.6074 },
                        { name: "Gedung Sate", lat: -6.9025, lng: 107.6186 },
                        { name: "Stasiun Bandung", lat: -6.9126, lng: 107.6024 },
                        { name: "Simpang Dago", lat: -6.8856, lng: 107.6136 },
                        { name: "Tol Pasteur", lat: -6.8885, lng: 107.5756 },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (!origin) {
                              setOrigin({ lat: item.lat, lng: item.lng, address: item.name });
                              setOriginText(item.name);
                            } else {
                              setDestination({ lat: item.lat, lng: item.lng, address: item.name });
                              setDestinationText(item.name);
                            }
                            if (mapRef.current) {
                              mapRef.current.setView([item.lat, item.lng], 14);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-zinc-300 hover:text-indigo-600 transition-colors border border-slate-200/80 dark:border-zinc-700"
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status / Loading / Route Overview */}
              {loading && (
                <div className="p-6 text-center">
                  <div className="w-8 h-8 mx-auto mb-2 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Menghitung rute terbaik & mencari CCTV...
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 mx-4 my-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  <p className="font-semibold mb-1">Gagal Menghitung Rute</p>
                  <p>{error}</p>
                </div>
              )}

              {/* Route Summary Stats */}
              {routeData && (
                <div className="p-4 bg-slate-50/50 dark:bg-zinc-800/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 shadow-sm">
                      <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span>Jarak Tempuh</span>
                      </div>
                      <p className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                        {routeData.summary.distance.text}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 shadow-sm">
                      <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Estimasi Waktu</span>
                      </div>
                      <p className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                        {routeData.summary.duration.text}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Switcher: CCTV vs SPKLU */}
              <div className="px-4 pt-3 pb-1">
                <div className="flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl">
                  <button
                    onClick={() => setSidebarTab("cctv")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                      sidebarTab === "cctv"
                        ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    <span>CCTV</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-mono font-bold">
                      {routeData ? nearbyCCTVs.length : CCTVS.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setSidebarTab("spklu")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                      sidebarTab === "spklu"
                        ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7a2 2 0 0 1 2 2v14H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 8h4M7.5 13l2-3h-2l1-3" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 9h2a2 2 0 0 1 2 2v4a2 2 0 0 0 4 0V9a2 2 0 0 0-2-2h-1" />
                    </svg>
                    <span>SPKLU EV</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-mono font-bold">
                      {routeData ? nearbySPKLUs.length : spklus.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* TAB 1: CCTV List Along Route */}
              {sidebarTab === "cctv" && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      <h2 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                        {showAllCCTVs ? `Semua CCTV Bandung (${CCTVS.length})` : `CCTV di Jalur Ini (${nearbyCCTVs.length})`}
                      </h2>
                    </div>
                    {nearbyCCTVs.length > 0 && !showAllCCTVs && (
                      <span className="text-[10px] text-slate-400">Jarak ~150m dari rute</span>
                    )}
                  </div>

                  {(showAllCCTVs ? CCTVS : nearbyCCTVs).length > 0 ? (
                    <div className="space-y-2.5 pb-6">
                      {(showAllCCTVs ? CCTVS : nearbyCCTVs).map((cctv) => {
                        const isOnline = cctvStatus.get(cctv.id) ?? true;
                        return (
                          <button
                            key={cctv.id}
                            onClick={() => handleOpenCCTVModal(cctv)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 hover:border-indigo-300 dark:hover:border-indigo-600/60 hover:shadow-md transition-all text-left group"
                          >
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                                isOnline
                                  ? "bg-slate-900 text-emerald-400 border-emerald-500/30"
                                  : "bg-slate-900 text-rose-400 border-rose-500/30"
                              }`}
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {cctv.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={`text-[10px] font-semibold ${
                                    isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {isOnline ? "● Online" : "● Offline"}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {cctv.lat.toFixed(4)}, {cctv.lng.toFixed(4)}
                                </span>
                              </div>
                            </div>
                            <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                        {routeData
                          ? "Tidak ada CCTV yang terdeteksi di rute ini."
                          : "Tentukan titik awal & tujuan untuk menampilkan CCTV di sepanjang rute."}
                      </p>
                      <button
                        onClick={() => setShowAllCCTVs(true)}
                        className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Lihat Semua CCTV di Bandung ({CCTVS.length}) →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SPKLU Charging Stations */}
              {sidebarTab === "spklu" && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h2 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                        {showAllSPKLUs || !routeData
                          ? `Semua SPKLU Bandung (${spklus.length})`
                          : `SPKLU di Jalur Ini (${nearbySPKLUs.length})`}
                      </h2>
                    </div>
                    {routeData && (
                      <button
                        onClick={() => setShowAllSPKLUs(!showAllSPKLUs)}
                        className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        {showAllSPKLUs ? "Filter Rute" : "Lihat Semua"}
                      </button>
                    )}
                  </div>

                  {(showAllSPKLUs || !routeData ? spklus : nearbySPKLUs).length > 0 ? (
                    <div className="space-y-2.5 pb-6">
                      {(showAllSPKLUs || !routeData ? spklus : nearbySPKLUs).map((item) => {
                        return (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 hover:border-emerald-300 dark:hover:border-emerald-600/60 transition-all text-left space-y-2.5"
                          >
                            <div className="flex items-start gap-3">
                              {/* Professional EV Icon */}
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7a2 2 0 0 1 2 2v14H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 8h4M7.5 13l2-3h-2l1-3" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 9h2a2 2 0 0 1 2 2v4a2 2 0 0 0 4 0V9a2 2 0 0 0-2-2h-1" />
                                </svg>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200/70 dark:border-zinc-700">
                                    {item.chargingSpeed}
                                  </span>
                                  {item.powerKw > 0 && (
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                                      {item.powerKw} kW
                                    </span>
                                  )}
                                  {item.is24h && (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/70 dark:border-zinc-700">
                                      24 Jam
                                    </span>
                                  )}
                                </div>

                                <h3 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 leading-snug line-clamp-1">
                                  {item.name}
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                                  {item.address || item.city}
                                </p>

                                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 flex items-center gap-2 flex-wrap">
                                  <span className="inline-flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v4m6-4v4M6 7h12a2 2 0 0 1 2 2v4a6 6 0 0 1-6 6v2H10v-2a6 6 0 0 1-6-6V9a2 2 0 0 1 2-2Z" />
                                    </svg>
                                    <span>{item.plugType}</span>
                                  </span>
                                  <span className="text-slate-300 dark:text-zinc-600">•</span>
                                  <span>{item.provider}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                              <button
                                onClick={() => {
                                  if (mapRef.current) {
                                    mapRef.current.setView([item.lat, item.lng], 16);
                                  }
                                }}
                                className="flex-1 py-1.5 px-2 text-[11px] font-semibold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors text-center"
                              >
                                Lihat di Peta
                              </button>
                              <button
                                onClick={() => {
                                  setDestination({ lat: item.lat, lng: item.lng, address: item.name });
                                  setDestinationText(item.name);
                                }}
                                className="flex-1 py-1.5 px-2 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors text-center shadow-sm"
                              >
                                Rute ke Sini
                              </button>
                              <button
                                onClick={() => {
                                  setWaypoints((prev) => [...prev, { lat: item.lat, lng: item.lng, address: item.name }]);
                                }}
                                className="py-1.5 px-2.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors"
                                title="Tambah Titik Singgah"
                              >
                                + Singgah
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7a2 2 0 0 1 2 2v14H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8h4M7.5 13l2-3h-2l1-3" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 9h2a2 2 0 0 1 2 2v4a2 2 0 0 0 4 0V9a2 2 0 0 0-2-2h-1" />
                        </svg>
                      </div>
                      <p className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                        {routeData
                          ? "Tidak ada SPKLU di koridor rute ini (~800m)."
                          : "Tentukan rute perjalanan atau klik tombol di bawah untuk melihat semua titik pengisian SPKLU."}
                      </p>
                      <button
                        onClick={() => setShowAllSPKLUs(true)}
                        className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Lihat Semua SPKLU Bandung ({spklus.length}) →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            {routeData && (
              <div className="p-3 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/70 flex items-center gap-2 shrink-0">
                <button
                  onClick={handleFitRoute}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span>Pusatkan Rute</span>
                </button>
                <button
                  onClick={() => {
                    setOrigin(null);
                    setDestination(null);
                    setWaypoints([]);
                    setRouteData(null);
                  }}
                  className="py-2 px-3 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-medium rounded-xl transition-colors"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CCTV Broadcast Modal */}
      <CCTVModal
        isOpen={showCCTV}
        onClose={() => {
          setShowCCTV(false);
          setSelectedCCTV(null);
        }}
        cctv={selectedCCTV}
        allCCTVs={showAllCCTVs ? CCTVS : nearbyCCTVs}
        onCCTVChange={(newCCTV) => {
          setSelectedCCTV(newCCTV);
          if (mapRef.current) {
            mapRef.current.setView([newCCTV.lat, newCCTV.lng], mapRef.current.getZoom());
          }
        }}
        onError={handleCCTVError}
      />
    </div>
  );
}
