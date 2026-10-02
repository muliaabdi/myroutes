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

        {/* Visible Header Banner */}
        <div className="bg-slate-950 text-white py-8 px-4 border-b border-slate-800">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Kembali ke Peta Utama</span>
            </Link>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  CCTV {location.locationKey} Bandung
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Pantauan lalu lintas realtime persimpangan {location.locationKey}, Kota Bandung
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {locationCCTVs.length} Kamera Aktif
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Component */}
        <RouteMapWrapper />

        {/* Additional Info Section */}
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-1">ATCS Dishub Bandung</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Feed langsung dari kamera Area Traffic Control System Dishub Kota Bandung secara realtime.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-1">Rute Bebas Macet</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Kalkulasi rute cerdas untuk mobil & motor dengan deteksi kamera CCTV di sepanjang jalan.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center mb-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-1">Ringan & Mobile-First</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                Dioptimalkan untuk akses cepat di ponsel pengendara tanpa aplikasi tambahan.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold">Rencanakan Perjalanan Melewati {location.locationKey}?</h3>
              <p className="text-xs text-indigo-200 mt-1 max-w-lg">
                Atur titik awal dan tujuan Anda di peta utama untuk mengecek kemacetan sebelum berangkat.
              </p>
            </div>
            <Link
              href="/"
              className="px-5 py-2.5 bg-white hover:bg-slate-100 text-indigo-950 font-semibold text-xs rounded-xl shadow-sm transition-all shrink-0"
            >
              Buka Perencana Rute
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
