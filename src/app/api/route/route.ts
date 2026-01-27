import { NextRequest, NextResponse } from "next/server";

const ORIGIN = { lat: -6.894242955170832, lng: 107.63662774808225 };
const DESTINATION = { lat: -7.001763102205302, lng: 107.56769773144025 };

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

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
 * Fetch route from OSRM (Open Source Routing Machine) - Free, no API key needed
 * Supports waypoints for multi-leg routes
 */
async function getMotorcycleRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints?: { lat: number; lng: number }[]
) {
  // Build coordinates array: origin -> waypoints -> destination
  const coordinates = [
    `${origin.lng},${origin.lat}`,
    ...(waypoints?.map(wp => `${wp.lng},${wp.lat}`) || []),
    `${destination.lng},${destination.lat}`
  ];

  // OSRM public server (free for development/testing)
  const url = new URL(
    `https://router.project-osrm.org/route/v1/driving/${coordinates.join(';')}`
  );

  url.searchParams.append("overview", "full"); // Get full geometry
  url.searchParams.append("geometries", "polyline"); // Use polyline encoding

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
 * Decode polyline to array of coordinates
 */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

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

    points.push([lng * 1e-5, lat * 1e-5]);
  }

  return points;
}

/**
 * Convert route data to static format
 */
function formatRouteData(data: any, origin: any, destination: any) {
  const route = data.routes[0];
  const distance = route.distance; // meters
  const duration = route.duration; // seconds

  // Decode polyline to get detailed coordinates
  const coordinates = decodePolyline(route.geometry);

  // Generate simple turn-by-turn instructions based on route steps
  const steps = route.legs[0].steps.map((step: any) => {
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
      startAddress: `${origin.lat}, ${origin.lng}`,
      endAddress: `${destination.lat}, ${destination.lng}`,
    },
    coordinates: coordinates.map(([lng, lat]) => ({ lat, lng })),
    steps,
  };
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
    "fork": "At the fork",
    "end of road": "At the end of the road",
    "continue": "Continue",
    "roundabout": "Enter the roundabout",
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const origin = body.origin || ORIGIN;
    const destination = body.destination || DESTINATION;
    const waypoints = body.waypoints || [];

    // Fetch the route from OSRM (free, no API key needed)
    const routeData = await getMotorcycleRoute(origin, destination, waypoints);

    // Format the route data
    const formattedRoute = formatRouteData(routeData, origin, destination);

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
