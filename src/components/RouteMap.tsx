"use client";

import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CCTVModal from "./CCTVModal";
import cctvData from "../data/cctvs.json";

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
}

// Map styles configuration
const MAP_STYLES = {
  voyager: {
    name: "Voyager (Google-like)",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    name: "Dark Matter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri',
  },
  osm: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

// CCTV data imported from JSON
const CCTVS: CCTV[] = cctvData
  // .filter((c: any) => c.stream_cctv && typeof c.stream_cctv === "string" && c.stream_cctv.startsWith("http"))
  .map((c: any) => ({
    id: c.id,
    name: c.name,
    lat: parseFloat(c.lat),
    lng: parseFloat(c.lng),
    streamUrl: c.streamUrl,
  }));

// Helper function to calculate distance between two coordinates in meters using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper function to calculate distance from point to polyline (route)
// Returns the minimum distance from the point to any segment of the polyline
function distanceToPolyline(point: { lat: number; lng: number }, polyline: { lat: number; lng: number }[]): number {
  let minDistance = Infinity;

  for (let i = 0; i < polyline.length - 1; i++) {
    const start = polyline[i];
    const end = polyline[i + 1];

    // Calculate distance from point to line segment
    const distance = distanceToSegment(point, start, end);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

// Helper function to calculate distance from point to line segment
function distanceToSegment(
  point: { lat: number; lng: number },
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): number {
  // Convert to radians
  const lat1 = (start.lat * Math.PI) / 180;
  const lng1 = (start.lng * Math.PI) / 180;
  const lat2 = (end.lat * Math.PI) / 180;
  const lng2 = (end.lng * Math.PI) / 180;
  const lat3 = (point.lat * Math.PI) / 180;
  const lng3 = (point.lng * Math.PI) / 180;

  // Earth's radius in meters
  const R = 6371000;

  // Calculate the projection factor
  const dLng = lng2 - lng1;
  const dLat = lat2 - lat1;

  // Length of the segment squared
  const segLen2 = dLat * dLat + dLng * dLng;

  // If segment is too short, just return distance to start
  if (segLen2 < 1e-12) {
    return calculateDistance(start.lat, start.lng, point.lat, point.lng);
  }

  // Calculate the projection parameter t
  const t = ((lat3 - lat1) * dLat + (lng3 - lng1) * dLng) / segLen2;

  // If t < 0, closest point is start
  if (t < 0) {
    return calculateDistance(start.lat, start.lng, point.lat, point.lng);
  }

  // If t > 1, closest point is end
  if (t > 1) {
    return calculateDistance(end.lat, end.lng, point.lat, point.lng);
  }

  // Projection point on the segment
  const projLat = lat1 + t * dLat;
  const projLng = lng1 + t * dLng;

  // Calculate the great circle distance from point to projection
  const dLatProj = projLat - lat3;
  const dLngProj = projLng - lng3;
  const a = dLatProj * dLatProj + dLngProj * dLngProj * Math.cos((lat3 + projLat) / 2);

  return R * Math.sqrt(a);
}

// Filter CCTVs that are near the route (within 300 meters) and sort by route order (origin to destination)
function getCCTVsNearRoute(cctvs: CCTV[], routeCoordinates: { lat: number; lng: number }[], maxDistance: number = 300): CCTV[] {
  // Find the closest route point index for each CCTV
  const cctvWithRouteIndex = cctvs
    .map((cctv) => {
      let minDistance = Infinity;
      let closestIndex = 0;

      // Find the closest point on the route
      routeCoordinates.forEach((coord, index) => {
        const dist = Math.sqrt(
          Math.pow(cctv.lat - coord.lat, 2) + Math.pow(cctv.lng - coord.lng, 2)
        );
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = index;
        }
      });

      // Check if within max distance of the route (using the polyline distance function)
      const distanceToRoute = distanceToPolyline({ lat: cctv.lat, lng: cctv.lng }, routeCoordinates);

      return {
        cctv,
        closestIndex,
        distanceToRoute
      };
    })
    .filter(item => item.distanceToRoute <= maxDistance)
    .sort((a, b) => a.closestIndex - b.closestIndex);

  return cctvWithRouteIndex.map(item => item.cctv);
}

export default function RouteMap() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const cctvMarkersRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCCTV, setSelectedCCTV] = useState<CCTV | null>(null);
  const [showCCTV, setShowCCTV] = useState(false);
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>("voyager");
  const [useMapboxTraffic, setUseMapboxTraffic] = useState(false);
  const [nearbyCCTVs, setNearbyCCTVs] = useState<CCTV[]>([]);
  const trafficSegmentsRef = useRef<L.Polyline[]>([]);
  const clickMarkerRef = useRef<L.Marker | null>(null);

  // Origin and Destination coordinates - start null
  const [origin, setOrigin] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; address: string } | null>(null);

  // Map click mode: 'origin' | 'destination' | null
  const [clickMode, setClickMode] = useState<'origin' | 'destination' | null>(null);
  const clickModeRef = useRef<'origin' | 'destination' | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ name: string; address: { lat: number; lng: number } }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Load origin and destination from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedOrigin = localStorage.getItem("myroutes-origin");
      const savedDestination = localStorage.getItem("myroutes-destination");

      if (savedOrigin) {
        setOrigin(JSON.parse(savedOrigin));
      }
      if (savedDestination) {
        setDestination(JSON.parse(savedDestination));
      }
    } catch (e) {
      console.error("Failed to load route from localStorage:", e);
    }
  }, []);

  // Save origin to localStorage when it changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (origin) {
        localStorage.setItem("myroutes-origin", JSON.stringify(origin));
      } else {
        localStorage.removeItem("myroutes-origin");
      }
    } catch (e) {
      console.error("Failed to save origin to localStorage:", e);
    }
  }, [origin]);

  // Save destination to localStorage when it changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if (destination) {
        localStorage.setItem("myroutes-destination", JSON.stringify(destination));
      } else {
        localStorage.removeItem("myroutes-destination");
      }
    } catch (e) {
      console.error("Failed to save destination to localStorage:", e);
    }
  }, [destination]);

  // Update ref when clickMode changes
  useEffect(() => {
    clickModeRef.current = clickMode;
  }, [clickMode]);

  // Search for locations
  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Cancel previous request
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    searchAbortRef.current = abortController;

    try {
      setSearchLoading(true);
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setSearchResults(data.results || []);
      setShowSearchResults(true);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Search error:", error);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle selecting a search result
  const handleSelectLocation = (result: { name: string; address: { lat: number; lng: number } }) => {
    const coords = result.address;
    const locationData = { lat: coords.lat, lng: coords.lng, address: result.name };

    if (clickMode === "origin") {
      setOrigin(locationData);
    } else if (clickMode === "destination") {
      setDestination(locationData);
    }

    // Clear search
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    setClickMode(null);
    clickModeRef.current = null;

    // Move map to selected location
    if (mapRef.current) {
      mapRef.current.setView([coords.lat, coords.lng], 14);
    }
  };

  // Change map style
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove existing tile layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    // Add new tile layer
    const style = MAP_STYLES[mapStyle];
    const tileLayer = L.tileLayer(style.url, {
      attribution: style.attribution,
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
  }, [mapStyle]);

  useEffect(() => {
    // Initialize map
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center (Bandung) when origin/destination not set
    const defaultCenter = { lat: -6.9175, lng: 107.6191 };
    const center: [number, number] = origin && destination
      ? [(origin.lat + destination.lat) / 2, (origin.lng + destination.lng) / 2]
      : [defaultCenter.lat, defaultCenter.lng];

    const map = L.map(mapContainerRef.current).setView(center, 12);

    // Add initial tile layer
    const style = MAP_STYLES[mapStyle];
    const tileLayer = L.tileLayer(style.url, {
      attribution: style.attribution,
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapRef.current = map;

    // Add map click handler
    map.on('click', (e) => {
      const currentClickMode = clickModeRef.current;
      if (!currentClickMode) return;

      const { lat, lng } = e.latlng;
      const coords = { lat, lng };

      // Create or update temporary click marker
      if (clickMarkerRef.current) {
        map.removeLayer(clickMarkerRef.current);
      }

      const clickIcon = L.divIcon({
        html: `<div class="flex items-center justify-center w-8 h-8 ${currentClickMode === 'origin' ? 'bg-green-500' : 'bg-red-500'} rounded-full border-2 border-white shadow-lg animate-pulse">
          <span class="text-white text-xs font-bold">${currentClickMode === 'origin' ? 'A' : 'B'}</span>
        </div>`,
        className: "custom-click-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      clickMarkerRef.current = L.marker([lat, lng], { icon: clickIcon }).addTo(map);

      // Update the appropriate state
      if (currentClickMode === 'origin') {
        setOrigin({ ...coords, address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}` });
      } else {
        setDestination({ ...coords, address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}` });
      }

      // Clear click mode after selection
      setClickMode(null);
      clickModeRef.current = null;
    });

    // Small delay to ensure container is fully rendered
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Add CCTV markers to map (only those near the route)
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Clear existing CCTV markers
    cctvMarkersRef.current.forEach((marker) => map.removeLayer(marker));
    cctvMarkersRef.current = [];

    // Create custom CCTV icon
    const cctvIcon = L.divIcon({
      html: `<div class="flex items-center justify-center w-10 h-10 bg-red-500 rounded-full border-3 border-white shadow-lg cursor-pointer hover:bg-red-600 transition-colors">
        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
        </svg>
      </div>`,
      className: "custom-cctv-marker",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Add CCTV markers (only nearby ones)
    nearbyCCTVs.forEach((cctv) => {
      const marker = L.marker([cctv.lat, cctv.lng], {
        icon: cctvIcon,
      }).addTo(map);

      marker.bindPopup(`
        <div class="text-center">
          <b>${cctv.name}</b><br>
          <button
            onclick="window.openCCTVModal('${cctv.id}')"
            class="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Watch Stream
          </button>
        </div>
      `);

      // Make marker clickable to open CCTV modal
      marker.on("click", () => {
        setSelectedCCTV(cctv);
        setShowCCTV(true);
      });

      cctvMarkersRef.current.push(marker);
    });

    // Make openCCTVModal available globally for the popup button
    (window as any).openCCTVModal = (id: string) => {
      const cctv = CCTVS.find((c) => c.id === id);
      if (cctv) {
        setSelectedCCTV(cctv);
        setShowCCTV(true);
      }
    };
  }, [nearbyCCTVs]);

  useEffect(() => {
    // Fetch route data from API
    const fetchRoute = async () => {
      // Only fetch if both origin and destination are set
      if (!origin || !destination) {
        setRouteData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Use Mapbox endpoint when traffic is enabled, otherwise use OSRM
        const endpoint = useMapboxTraffic ? "/api/route/mapbox" : "/api/route";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: destination.lat, lng: destination.lng }
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch route");
        }

        const data = await response.json();
        setRouteData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [useMapboxTraffic, origin, destination]);

  useEffect(() => {
    // Draw route on map when data is available
    if (!routeData || !mapRef.current) return;

    const map = mapRef.current;

    // Clear click marker if exists
    if (clickMarkerRef.current) {
      map.removeLayer(clickMarkerRef.current);
      clickMarkerRef.current = null;
    }

    // Clear existing route and markers
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
    }
    markersRef.current.forEach((marker) => map.removeLayer(marker));
    markersRef.current = [];

    // Clear existing traffic segments
    trafficSegmentsRef.current.forEach((polyline) => map.removeLayer(polyline));
    trafficSegmentsRef.current = [];

    // ALWAYS draw the blue route as base layer
    const latLngs = routeData.coordinates.map((coord) => [coord.lat, coord.lng] as [number, number]);
    const blueRoute = L.polyline(latLngs, {
      color: "#3b82f6", // Blue route
      weight: 6,
      opacity: 0.8,
    }).addTo(map);

    routeLayerRef.current = blueRoute;

    // Draw traffic segments on top if available
    if (routeData.trafficSegments && routeData.trafficSegments.length > 0) {
      routeData.trafficSegments.forEach((segment) => {
        const segmentLatLngs = segment.coordinates.map((coord) => [coord.lat, coord.lng] as [number, number]);
        const polyline = L.polyline(segmentLatLngs, {
          color: segment.color,
          weight: 6,
          opacity: 1.0,
        }).addTo(map);
        trafficSegmentsRef.current.push(polyline);
      });
    }

    // Fit map to route bounds
    map.fitBounds(blueRoute.getBounds(), { padding: [50, 50] });

    // Add origin marker
    const originIcon = L.divIcon({
      html: `<div class="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg"><span class="text-white text-xs font-bold">A</span></div>`,
      className: "custom-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    const originMarker = L.marker([routeData.summary.origin.lat, routeData.summary.origin.lng], {
      icon: originIcon,
    }).addTo(map);
    originMarker.bindPopup(`<b>Start:</b><br>${routeData.summary.startAddress}`);
    markersRef.current.push(originMarker);

    // Add destination marker
    const destIcon = L.divIcon({
      html: `<div class="flex items-center justify-center w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg"><span class="text-white text-xs font-bold">B</span></div>`,
      className: "custom-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    const destMarker = L.marker([routeData.summary.destination.lat, routeData.summary.destination.lng], {
      icon: destIcon,
    }).addTo(map);
    destMarker.bindPopup(`<b>Destination:</b><br>${routeData.summary.endAddress}`);
    markersRef.current.push(destMarker);

    // Calculate and set nearby CCTVs (within 50 meters of the route)
    const nearby = getCCTVsNearRoute(CCTVS, routeData.coordinates, 50);
    setNearbyCCTVs(nearby);
  }, [routeData]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Route</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Using OSRM (Open Source Routing Machine) for routing. No API key required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Map container */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className={`w-full h-full z-0 ${clickMode ? 'cursor-pointer' : ''}`} />

        {/* Map controls overlay */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          {/* Map style selector */}
          <div className="bg-white rounded-lg shadow-lg p-2">
            <label className="text-xs font-medium text-gray-600 block mb-2">Map Style</label>
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value as keyof typeof MAP_STYLES)}
              className="text-sm border rounded px-2 py-1 w-full"
            >
              {Object.entries(MAP_STYLES).map(([key, style]) => (
                <option key={key} value={key}>
                  {style.name}
                </option>
              ))}
            </select>
          </div>

          {/* Traffic toggle */}
          <div className="bg-white rounded-lg shadow-lg p-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useMapboxTraffic}
                onChange={(e) => setUseMapboxTraffic(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs font-medium text-gray-600">Traffic on Route</span>
            </label>
            <p className="text-[10px] text-gray-400 mt-1">
              Requires Mapbox API key
            </p>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow-lg p-2">
            <div className="text-xs font-medium text-gray-600 mb-1">Legend</div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Start</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>End</span>
            </div>
            {useMapboxTraffic ? (
              <>
                <div className="text-xs font-medium text-gray-400 mt-2 mb-1">Traffic</div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <div className="w-6 h-1 bg-green-500"></div>
                  <span>Low</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <div className="w-6 h-1 bg-yellow-500"></div>
                  <span>Moderate</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <div className="w-6 h-1 bg-orange-500"></div>
                  <span>Heavy</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <div className="w-6 h-1 bg-red-500"></div>
                  <span>Severe</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <div className="w-6 h-1 bg-blue-500"></div>
                <span>Route</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </div>
              <span>CCTV</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-96 bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>🏍️</span> MyRoutes
          </h1>
          <p className="text-blue-100 text-sm mt-1">MyRoutes - Route Planning & CCTV Monitoring</p>
        </div>

        {/* Plan Your Route - Always visible */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Plan Your Route</h2>

          <div className="space-y-4">
            {/* Origin Display or Prompt */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${origin ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className={`font-bold ${origin ? 'text-green-600' : 'text-gray-400'}`}>A</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">From</p>
                {origin ? (
                  <>
                    <p className="text-sm font-medium text-gray-800 truncate">{origin.address}</p>
                    <p className="text-xs text-gray-400">{origin.lat.toFixed(6)}, {origin.lng.toFixed(6)}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 italic">Click &quot;Set Origin&quot; to select starting point</p>
                )}
              </div>
            </div>

            {/* Destination Display or Prompt */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${destination ? 'bg-red-100' : 'bg-gray-100'}`}>
                <span className={`font-bold ${destination ? 'text-red-600' : 'text-gray-400'}`}>B</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">To</p>
                {destination ? (
                  <>
                    <p className="text-sm font-medium text-gray-800 truncate">{destination.address}</p>
                    <p className="text-xs text-gray-400">{destination.lat.toFixed(6)}, {destination.lng.toFixed(6)}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 italic">Click &quot;Set Destination&quot; to select ending point</p>
                )}
              </div>
            </div>

            {/* Click on Map / Search Section */}
            <div className={`rounded-lg p-3 transition-colors ${clickMode ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-600">📍 Set location:</p>
                {clickMode && (
                  <button
                    onClick={() => {
                      setClickMode(null);
                      clickModeRef.current = null;
                      setSearchQuery("");
                      setSearchResults([]);
                      setShowSearchResults(false);
                      if (clickMarkerRef.current && mapRef.current) {
                        mapRef.current.removeLayer(clickMarkerRef.current);
                        clickMarkerRef.current = null;
                      }
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={() => setClickMode('origin')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${clickMode === 'origin'
                    ? 'bg-green-600 text-white'
                    : 'bg-white border-2 border-green-300 text-green-700 hover:bg-green-50'
                    }`}
                >
                  Set Origin (A)
                </button>
                <button
                  onClick={() => setClickMode('destination')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${clickMode === 'destination'
                    ? 'bg-red-600 text-white'
                    : 'bg-white border-2 border-red-300 text-red-700 hover:bg-red-50'
                    }`}
                >
                  Set Destination (B)
                </button>
              </div>

              {/* Search input - shown when a mode is selected */}
              {clickMode && (
                <div className="relative mt-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchLocations(e.target.value);
                      }}
                      placeholder="Search location..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Search results dropdown */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectLocation(result)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-800 truncate">{result.name}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* No results message */}
                  {showSearchResults && searchQuery && searchResults.length === 0 && !searchLoading && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
                      No results found. Try clicking on the map instead.
                    </div>
                  )}
                </div>
              )}

              {clickMode && !searchQuery && (
                <p className="text-xs text-blue-600 mt-2 text-center">
                  Search above or click on the map to set {clickMode === 'origin' ? 'origin' : 'destination'}...
                </p>
              )}
            </div>

            {/* Calculate Route Button - Only show when both set */}
            {origin && destination && (
              <button
                onClick={() => {
                  setRouteData(null);
                  setLoading(true);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Calculate Route
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
            <p className="text-gray-500 text-sm mt-4">Fetching route data...</p>
          </div>
        ) : routeData ? (
          <>
            {/* Route Summary */}
            <div className="p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">A</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 truncate">From</p>
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {routeData.summary.startAddress}
                  </p>
                </div>
              </div>

              <div className="ml-5 border-l-2 border-dashed border-gray-300 h-6"></div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-bold">B</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 truncate">To</p>
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {routeData.summary.endAddress}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl mb-1">📏</div>
                  <p className="text-2xl font-bold text-blue-600">
                    {routeData.summary.distance.text}
                  </p>
                  <p className="text-sm text-gray-500">Distance</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl mb-1">⏱️</div>
                  <p className="text-2xl font-bold text-purple-600">
                    {routeData.summary.duration.text}
                  </p>
                  <p className="text-sm text-gray-500">Duration</p>
                </div>
              </div>
            </div>

            {/* CCTV Section */}
            {nearbyCCTVs.length > 0 && (
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-red-500">📹</span> CCTV Cameras
                  <span className="text-sm font-normal text-gray-500">({nearbyCCTVs.length})</span>
                </h2>
                <div className="space-y-2">
                  {nearbyCCTVs.map((cctv) => (
                    <button
                      key={cctv.id}
                      onClick={() => {
                        setSelectedCCTV(cctv);
                        setShowCCTV(true);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{cctv.name}</p>
                        <p className="text-xs text-gray-500">
                          {cctv.lat.toFixed(4)}, {cctv.lng.toFixed(4)}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No CCTVs nearby message */}
            {nearbyCCTVs.length === 0 && (
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-red-500">📹</span> CCTV Cameras
                </h2>
                <div className="text-center text-gray-500 py-4">
                  <p>No CCTV cameras found near this route.</p>
                  <p className="text-xs mt-1">CCTVs within 100m of the route will be shown here.</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-6 border-t bg-gray-50 space-y-2">
              <button
                onClick={() => {
                  const bounds = L.latLngBounds(
                    routeData.coordinates.map(({ lat, lng }) => [lat, lng] as [number, number])
                  );
                  if (mapRef.current) {
                    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Fit Route to View
              </button>
            </div>
          </>
        ) : null}
      </div>

      {/* CCTV Modal */}
      <CCTVModal
        isOpen={showCCTV}
        onClose={() => {
          setShowCCTV(false);
          setSelectedCCTV(null);
        }}
        cctv={selectedCCTV}
        allCCTVs={nearbyCCTVs}
        onCCTVChange={(newCCTV) => {
          setSelectedCCTV(newCCTV);
          // Optional: Pan map to the new CCTV
          if (mapRef.current) {
            mapRef.current.setView([newCCTV.lat, newCCTV.lng], mapRef.current.getZoom());
          }
        }}
      />
    </div>
  );
}
