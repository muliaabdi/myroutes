import { NextRequest, NextResponse } from "next/server";

const ORIGIN = { lat: -6.894242955170832, lng: 107.63662774808225 };
const DESTINATION = { lat: -7.001763102205302, lng: 107.56769773144025 };

/**
 * Format distance to human readable string
 */
function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format duration to human readable string
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

/**
 * Decode polyline to array of coordinates (OSRM uses precision 5)
 */
function decodePolyline(encoded: string, precision: number = 5): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const factor = Math.pow(10, precision);

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push([lng / factor, lat / factor]);
  }

  return points;
}

/**
 * Color mapping for congestion levels
 */
const CONGESTION_COLORS: Record<string, string> = {
  low: "#22c55e",      // green-500
  moderate: "#eab308", // yellow-500
  heavy: "#f97316",    // orange-500
  severe: "#ef4444",   // red-500
  unknown: "#94a3b8",  // slate-400
};

/**
 * Calculate distance between two coordinates
 */
function coordDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1[1] * Math.PI) / 180;
  const φ2 = (coord2[1] * Math.PI) / 180;
  const Δφ = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const Δλ = ((coord2[0] - coord1[0]) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Fetch route from OSRM (motorcycle-friendly routing)
 */
async function getOSRMRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  const url = new URL(
    `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
  );

  url.searchParams.append("overview", "full");
  url.searchParams.append("geometries", "polyline");
  url.searchParams.append("steps", "true");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OSRM API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.code !== "Ok") {
    throw new Error(`OSRM error: ${data.code}`);
  }

  return data;
}

/**
 * Fetch traffic data from Mapbox
 */
async function getMapboxTrafficData(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  const apiKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;

  if (!apiKey) {
    throw new Error("Mapbox API key not configured");
  }

  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
  );

  url.searchParams.append("overview", "full");
  url.searchParams.append("geometries", "polyline6");
  url.searchParams.append("annotations", "congestion");
  url.searchParams.append("access_token", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Mapbox API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== "Ok") {
    throw new Error(`Mapbox error: ${data.code}`);
  }

  return data;
}

/**
 * Get human readable direction instruction from OSRM maneuver type
 */
function getDirectionInstruction(type: string, modifier?: string): string {
  const instructions: Record<string, string> = {
    turn: "Turn",
    "new name": "Continue",
    depart: "Head out",
    arrive: "Arrive at destination",
    merge: "Merge",
    "on ramp": "Take the ramp",
    "off ramp": "Take the exit",
    fork: "At the fork",
    "end of road": "At the end of the road",
    continue: "Continue",
    roundabout: "Enter the roundabout",
    rotary: "Enter the rotary",
  };

  const modifiers: Record<string, string> = {
    uturn: "Make a U-turn",
    "sharp right": "Turn sharp right",
    right: "Turn right",
    "slight right": "Turn slight right",
    straight: "Go straight",
    "slight left": "Turn slight left",
    left: "Turn left",
    "sharp left": "Turn sharp left",
  };

  if (type === "depart") {
    return "Start your journey";
  }

  if (type === "arrive") {
    return "Arrive at your destination";
  }

  if (modifier && modifiers[modifier]) {
    return modifiers[modifier];
  }

  if (type === "turn" && modifier) {
    return `${instructions.turn} ${modifier}`;
  }

  return instructions[type] || "Continue";
}

/**
 * Map traffic congestion to OSRM route coordinates
 * Returns an array of congestion levels for each coordinate in the OSRM route
 * Returns null for coordinates where no traffic data is available
 */
function mapTrafficToOSRMRoute(
  osrmCoords: [number, number][],
  mapboxData: any
): (string | null)[] {
  const congestion: (string | null)[] = [];

  if (!mapboxData.routes || !mapboxData.routes[0]) {
    return Array(osrmCoords.length).fill(null);
  }

  const mapboxRoute = mapboxData.routes[0];
  const mapboxLeg = mapboxRoute.legs[0];
  const annotation = mapboxLeg.annotation;

  if (!annotation || !annotation.congestion) {
    return Array(osrmCoords.length).fill(null);
  }

  // Decode Mapbox route geometry (polyline6)
  const mapboxCoords = decodePolyline(mapboxRoute.geometry, 6);
  const mapboxCongestion = annotation.congestion;

  // Maximum distance to consider traffic data valid (200 meters)
  // If OSRM route is too far from Mapbox route, don't use that traffic data
  const MAX_MATCH_DISTANCE = 200; // meters

  let matchedCount = 0;
  let tooFarCount = 0;

  // For each OSRM coordinate, find the closest Mapbox segment and use its congestion
  for (const osrmCoord of osrmCoords) {
    let minDistance = Infinity;
    let closestCongestion = null;

    // Search through Mapbox coordinates to find closest
    for (let i = 0; i < mapboxCoords.length; i++) {
      const distance = coordDistance(osrmCoord, mapboxCoords[i]);
      if (distance < minDistance) {
        minDistance = distance;
        // Get congestion for this segment (use the segment starting at this coordinate)
        const congestionIndex = Math.min(i, mapboxCongestion.length - 1);
        closestCongestion = mapboxCongestion[congestionIndex] || null;
      }
    }

    // Only use traffic data if the match is close enough
    if (minDistance <= MAX_MATCH_DISTANCE) {
      congestion.push(closestCongestion);
      matchedCount++;
    } else {
      congestion.push(null);
      tooFarCount++;
    }
  }

  return congestion;
}

/**
 * Build traffic segments from OSRM coordinates and congestion data
 * Skips segments with null/unknown congestion
 */
function buildTrafficSegments(
  osrmCoords: [number, number][],
  congestion: (string | null)[]
): Array<{
  coordinates: Array<{ lat: number; lng: number }>;
  congestion: string;
  color: string;
  distance: number;
  duration: number;
}> {
  const segments: Array<{
    coordinates: Array<{ lat: number; lng: number }>;
    congestion: string;
    color: string;
    distance: number;
    duration: number;
  }> = [];

  if (osrmCoords.length < 2) {
    return segments;
  }

  let segmentStart = 0;
  let currentCongestion = congestion[0];

  // Group consecutive coordinates with same congestion level
  for (let i = 1; i <= osrmCoords.length; i++) {
    const atEnd = i === osrmCoords.length;
    const congestionChanged = !atEnd && congestion[i] !== currentCongestion;

    // If congestion changed or we reached the end, create a segment
    // Skip segments with null/unknown congestion
    if (atEnd || congestionChanged) {
      // Only create segment if we have valid congestion data (not null and not "unknown")
      if (currentCongestion !== null && currentCongestion !== "unknown") {
        const segmentCoords = osrmCoords
          .slice(segmentStart, i)
          .map(([lng, lat]) => ({ lat, lng }));

        // Calculate segment distance
        let segDistance = 0;
        for (let j = segmentStart; j < i - 1; j++) {
          segDistance += coordDistance(osrmCoords[j], osrmCoords[j + 1]);
        }

        // Estimate duration (assume average speed of 30 km/h for urban areas)
        const avgSpeed = 30 * 1000 / 3600; // 30 km/h in m/s
        const segDuration = segDistance / avgSpeed;

        segments.push({
          coordinates: segmentCoords,
          congestion: currentCongestion,
          color: CONGESTION_COLORS[currentCongestion] || CONGESTION_COLORS.unknown,
          distance: segDistance,
          duration: segDuration,
        });
      }

      segmentStart = i;
      if (!atEnd) {
        currentCongestion = congestion[i];
      }
    }
  }

  return segments;
}

/**
 * Format route data with traffic from OSRM + Mapbox
 */
async function formatRouteWithTraffic(
  osrmData: any,
  mapboxData: any,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  const osrmRoute = osrmData.routes[0];
  const distance = osrmRoute.distance; // meters
  const duration = osrmRoute.duration; // seconds

  // Decode OSRM polyline to get detailed coordinates
  const coordinates = decodePolyline(osrmRoute.geometry, 5);

  // Map traffic congestion to OSRM route
  const congestion = mapTrafficToOSRMRoute(coordinates, mapboxData);

  // Build traffic segments
  const trafficSegments = buildTrafficSegments(coordinates, congestion);

  // Generate turn-by-turn instructions from OSRM steps
  const steps = osrmRoute.legs[0].steps.map((step: any) => {
    const maneuver = step.maneuver || {};
    const instruction = getDirectionInstruction(maneuver.type, maneuver.modifier);

    return {
      instruction,
      distance: {
        text: formatDistance(step.distance),
        meters: step.distance,
      },
      duration: {
        text: formatDuration(step.duration),
        seconds: step.duration,
      },
    };
  });

  return {
    summary: {
      origin,
      destination,
      distance: {
        text: formatDistance(distance),
        meters: distance,
      },
      duration: {
        text: formatDuration(duration),
        seconds: duration,
      },
      startAddress: `${origin.lat.toFixed(6)}, ${origin.lng.toFixed(6)}`,
      endAddress: `${destination.lat.toFixed(6)}, ${destination.lng.toFixed(6)}`,
    },
    coordinates: coordinates.map(([lng, lat]) => ({ lat, lng })),
    trafficSegments,
    steps,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const origin = body.origin || ORIGIN;
    const destination = body.destination || DESTINATION;

    // Fetch route from OSRM (motorcycle-friendly)
    const osrmData = await getOSRMRoute(origin, destination);

    // Fetch traffic data from Mapbox
    let mapboxData: any = null;
    try {
      mapboxData = await getMapboxTrafficData(origin, destination);
    } catch (mapboxError) {
      console.warn("Mapbox traffic data unavailable, using unknown congestion:", mapboxError);
    }

    // Format route with traffic overlay
    const formattedRoute = await formatRouteWithTraffic(
      osrmData,
      mapboxData,
      origin,
      destination
    );

    return NextResponse.json(formattedRoute);
  } catch (error) {
    console.error("Error generating route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate route" },
      { status: 500 }
    );
  }
}

// Also support GET for simpler testing
export async function GET(request: NextRequest) {
  return POST(request);
}
