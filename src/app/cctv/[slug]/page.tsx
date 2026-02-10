import { Metadata } from "next";
import Link from "next/link";
import cctvs from "@/data/cctvs.json";
import RouteMapWrapper from "@/components/RouteMapWrapper";

// Generate static params for all CCTV locations
export async function generateStaticParams() {
  const uniqueLocations = cctvs.reduce((acc: any[], cctv: any) => {
    const locationKey = cctv.name.replace(/KOTA - /, '').split(' - ')[0].trim();
    const slug = locationKey.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    if (!acc.find((loc: any) => loc.slug === slug)) {
      acc.push({ slug, locationKey, originalName: cctv.name });
    }
    return acc;
  }, []);

  return uniqueLocations.slice(0, 20).map((loc: any) => ({
    slug: loc.slug,
  }));
}

// Generate metadata for each location
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const uniqueLocations = cctvs.reduce((acc: any[], cctv: any) => {
    const locationKey = cctv.name.replace(/KOTA - /, '').split(' - ')[0].trim();
    const locationSlug = locationKey.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    if (!acc.find((loc: any) => loc.slug === locationSlug)) {
      acc.push({ slug: locationSlug, locationKey, originalName: cctv.name });
    }
    return acc;
  }, []);

  const location = uniqueLocations.find((loc: any) => loc.slug === slug);

  if (!location) {
    return {
      title: "CCTV Location Not Found - MyRoutes",
    };
  }

  return {
    title: `CCTV ${location.locationKey} Bandung - Live Traffic Camera | MyRoutes`,
    description: `Live CCTV camera at ${location.locationKey}, Bandung. Monitor real-time traffic conditions at ${location.locationKey} with free access to Dishub Bandung ATCS cameras.`,
    keywords: [
      `CCTV ${location.locationKey}`,
      `CCTV ${location.locationKey} Bandung`,
      `${location.locationKey} traffic`,
      `${location.locationKey} CCTV live`,
      `CCTV Bandung ${location.locationKey}`,
      `traffic ${location.locationKey}`,
      `monitor ${location.locationKey}`,
    ],
    openGraph: {
      title: `CCTV ${location.locationKey} Bandung - Live Traffic Camera`,
      description: `Live CCTV camera at ${location.locationKey}, Bandung. Monitor real-time traffic conditions.`,
      url: `https://myroutes.muliaabdi.net/cctv/${slug}`,
    },
  };
}

export default async function CCTVLocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const uniqueLocations = cctvs.reduce((acc: any[], cctv: any) => {
    const locationKey = cctv.name.replace(/KOTA - /, '').split(' - ')[0].trim();
    const locationSlug = locationKey.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    if (!acc.find((loc: any) => loc.slug === locationSlug)) {
      acc.push({ slug: locationSlug, locationKey, originalName: cctv.name });
    }
    return acc;
  }, []);

  const location = uniqueLocations.find((loc: any) => loc.slug === slug);
  const locationCCTVs = cctvs.filter((cctv: any) =>
    cctv.name.toLowerCase().includes(location?.locationKey.toLowerCase() || "")
  );

  if (!location) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Location Not Found</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            Return to MyRoutes
          </Link>
        </div>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `CCTV ${location.locationKey} Bandung - Live Traffic Camera`,
    description: `Live CCTV camera feed from ${location.locationKey}, Bandung. Monitor real-time traffic conditions at this location.`,
    thumbnailUrl: "https://myroutes.muliaabdi.net/og-image.png",
    uploadDate: new Date().toISOString(),
    locationCreated: {
      "@type": "Place",
      name: location.locationKey,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Bandung",
        addressRegion: "West Java",
        addressCountry: "Indonesia",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen">
        {/* SEO Content - Server Rendered */}
        <div className="sr-only">
          <article>
            <h1>CCTV {location.locationKey} Bandung - Live Traffic Camera</h1>
            <h2>Monitor Real-Time Traffic at {location.locationKey}</h2>
            <p>
              Access live CCTV camera feed at {location.locationKey}, Bandung, West Java, Indonesia.
              This camera is part of the Dishub Bandung ATCS (Area Traffic Control System) network
              providing real-time traffic monitoring for better route planning and traffic management.
            </p>

            <h2>About {location.locationKey} Location</h2>
            <p>
              {location.locationKey} is a key intersection in Bandung with significant traffic flow.
              Monitoring this location helps travelers and commuters plan their routes effectively
              and avoid congestion during peak hours.
            </p>

            <h2>Available Camera Views</h2>
            <ul>
              {locationCCTVs.map((cctv: any) => (
                <li key={cctv.id}>{cctv.name} - Live traffic monitoring</li>
              ))}
            </ul>

            <h2>How to Use This CCTV Feed</h2>
            <ol>
              <li>View the live camera stream above to check current traffic conditions</li>
              <li>Use the interactive map to explore nearby CCTV cameras</li>
              <li>Plan your route by setting origin and destination points</li>
              <li>Toggle &quot;Show All CCTVs&quot; to see all available cameras in Bandung</li>
            </ol>

            <h2> Nearby CCTV Locations</h2>
            <p>
              Explore other CCTV cameras in Bandung including Soekarno Hatta, Gatot Subroto,
              Padjadjaran, Sudirman, Dago, and many more strategic locations across the city.
            </p>
          </article>
        </div>

        {/* Visible Content */}
        <div className="bg-blue-600 text-white py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <Link href="/" className="text-blue-200 hover:text-white mb-4 inline-block">
              ← Back to MyRoutes
            </Link>
            <h1 className="text-3xl font-bold mt-2">
              CCTV {location.locationKey} Bandung
            </h1>
            <p className="text-blue-100 mt-2">
              Live traffic monitoring at {location.locationKey}, Bandung
            </p>
            <p className="text-sm text-blue-200 mt-1">
              {locationCCTVs.length} camera{locationCCTVs.length > 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        {/* Map Component */}
        <RouteMapWrapper />

        {/* Additional SEO Content */}
        <div className="max-w-4xl mx-auto py-12 px-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            About CCTV {location.locationKey}
          </h2>
          <p className="text-gray-600 mb-4">
            This CCTV camera at {location.locationKey} provides real-time traffic monitoring
            as part of Bandung&apos;s traffic management system. The live feed helps drivers,
            motorcyclists, and commuters check current road conditions before starting their journey.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">
            Key Features
          </h2>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li>Live streaming from Dishub Bandung ATCS cameras</li>
            <li>Real-time traffic condition monitoring</li>
            <li>Free access - no registration required</li>
            <li>Mobile-friendly design</li>
            <li>Integration with route planning tools</li>
          </ul>

          <div className="mt-8 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              Planning a route through {location.locationKey}?
            </h3>
            <p className="text-blue-700 mb-4">
              Use MyRoutes to plan your journey with real-time traffic updates. Set your
              origin and destination to see the optimal route with nearby CCTV cameras.
            </p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Plan Your Route
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
