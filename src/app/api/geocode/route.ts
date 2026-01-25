import { NextRequest, NextResponse } from "next/server";

// LocationIQ API - Free tier: 5,000 requests/day
// Get your API key at: https://locationiq.com/
const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY || "pk.0c5440790e98062c0e59e8f94e610b62";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    // Use LocationIQ for geocoding - 5,000 free requests/day
    const locationiqUrl = `https://us1.locationiq.com/v1/autocomplete.php?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(query)}&limit=5&format=json`;

    const response = await fetch(locationiqUrl, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("LocationIQ API request failed");
    }

    const data = await response.json();

    // Transform LocationIQ response to our format
    const results = (data || []).map((item: any) => ({
      name: item.display_name || item.display_place,
      address: {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      },
      // Additional useful info
      type: item.type,
      class: item.class,
      importance: item.importance,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      { error: "Failed to search location" },
      { status: 500 }
    );
  }
}
