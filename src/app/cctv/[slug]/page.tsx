import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import cctvs from "@/data/cctvs.json";
import RouteMapWrapper from "@/components/RouteMapWrapper";

// Generate static params for all CCTV locations in Bandung
export async function generateStaticParams() {
  const uniqueLocations = cctvs.reduce((acc: any[], cctv: any) => {
    const locationKey = cctv.name.replace(/KOTA - /, '').split(' - ')[0].trim();
    const slug = locationKey.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    if (!acc.find((loc: any) => loc.slug === slug)) {
      acc.push({ slug, locationKey, originalName: cctv.name });
    }
    return acc;
  }, []);

  return uniqueLocations.map((loc: any) => ({
    slug: loc.slug,
  }));
}

// Generate high-intent SEO metadata for each location
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
      title: "Lokasi CCTV Tidak Ditemukan - MyRoutes Bandung",
    };
  }

  const title = `CCTV ${location.locationKey} Bandung Live Streaming ATCS Dishub | MyRoutes`;
  const description = `Pantau siaran langsung kamera CCTV ATCS Dishub di persimpangan ${location.locationKey}, Kota Bandung secara live & real-time. Cek kondisi lalu lintas dan titik macet terkini.`;

  return {
    title,
    description,
    keywords: [
      `CCTV ${location.locationKey}`,
      `CCTV ${location.locationKey} Bandung`,
      `CCTV live ${location.locationKey}`,
      `pantau macet ${location.locationKey}`,
      `lalu lintas ${location.locationKey}`,
      `CCTV ATCS ${location.locationKey}`,
      `CCTV Dishub ${location.locationKey}`,
      `live streaming CCTV Bandung`,
      `info macet Bandung`,
    ],
    alternates: {
      canonical: `https://myroutes.muliaabdi.net/cctv/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://myroutes.muliaabdi.net/cctv/${slug}`,
      locale: "id_ID",
      type: "website",
      images: [
        {
          url: "https://myroutes.muliaabdi.net/og-image.png",
          width: 1200,
          height: 630,
          alt: `CCTV ${location.locationKey} Bandung Live Streaming`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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

  if (!location) {
    notFound();
  }

  const locationCCTVs = cctvs.filter((cctv: any) =>
    cctv.name.toLowerCase().includes(location.locationKey.toLowerCase())
  );

  const otherLocations = uniqueLocations
    .filter((loc: any) => loc.slug !== slug)
    .slice(0, 6);

  // Schema: BreadcrumbList + VideoObject
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Beranda",
        item: "https://myroutes.muliaabdi.net",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Direktori CCTV",
        item: "https://myroutes.muliaabdi.net/cctv",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `CCTV ${location.locationKey}`,
        item: `https://myroutes.muliaabdi.net/cctv/${slug}`,
      },
    ],
  };

  const videoJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `CCTV ${location.locationKey} Bandung Live Streaming`,
    description: `Pantauan live kamera CCTV ATCS Dishub di persimpangan jalan ${location.locationKey}, Bandung secara real-time.`,
    thumbnailUrl: "https://myroutes.muliaabdi.net/og-image.png",
    uploadDate: "2026-10-01T00:00:00+07:00",
    publication: {
      "@type": "BroadcastEvent",
      isLiveBroadcast: true,
      startDate: "2026-10-01T00:00:00+07:00",
    },
    locationCreated: {
      "@type": "Place",
      name: `${location.locationKey}, Bandung`,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Bandung",
        addressRegion: "Jawa Barat",
        addressCountry: "ID",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
      />
      <main className="min-h-screen bg-slate-950 text-slate-100">
        {/* Visible Header Banner with Navigation */}
        <header className="bg-slate-950 text-white py-6 px-4 border-b border-slate-800">
          <div className="max-w-5xl mx-auto">
            <nav className="flex items-center gap-2 text-xs text-slate-400 mb-3" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white transition-colors">
                Beranda
              </Link>
              <span>/</span>
              <Link href="/cctv" className="hover:text-white transition-colors">
                Direktori CCTV
              </Link>
              <span>/</span>
              <span className="text-indigo-400 font-medium">CCTV {location.locationKey}</span>
            </nav>

            <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  CCTV {location.locationKey} Bandung Live Streaming
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  Pantauan siaran langsung kamera ATCS Dishub persimpangan {location.locationKey}, Kota Bandung secara real-time.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {locationCCTVs.length} Kamera Terdeteksi
                </span>
                <Link
                  href="/"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors"
                >
                  Peta Rute
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Map Component */}
        <section aria-label="Peta Interaktif CCTV" className="relative">
          <RouteMapWrapper />
        </section>

        {/* Visible Structured Content for Users & Googlebot */}
        <div className="max-w-5xl mx-auto py-10 px-4 space-y-10">
          {/* Active Camera List Section */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">
              Daftar Titik Kamera CCTV {location.locationKey}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Kamera pengawas ATCS Dishub di kawasan {location.locationKey} yang dapat dipantau langsung pada peta di atas:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {locationCCTVs.map((cctv: any) => (
                <div
                  key={cctv.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {cctv.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Koordinat: {Number(cctv.lat).toFixed(4)}, {Number(cctv.lng).toFixed(4)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Live
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Traffic and Area Guide */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">
              Kondisi Lalu Lintas &amp; Informasi Wilayah {location.locationKey}
            </h2>
            <div className="text-slate-300 text-xs sm:text-sm leading-relaxed space-y-3">
              <p>
                Persimpangan <strong>{location.locationKey}</strong> merupakan salah satu simpul transportasi vital di Kota Bandung.
                Jalur ini sering mengalami peningkatan volume kendaraan pada jam sibuk pagi hari (07.00 - 09.00 WIB)
                saat jam berangkat kerja dan sekolah, serta sore hari (16.30 - 19.30 WIB).
              </p>
              <p>
                Kamera CCTV di kawasan ini terhubung langsung ke sistem ATCS (Area Traffic Control System) Dinas Perhubungan Kota Bandung.
                Data visual real-time ini membantu pengendara sepeda motor dan mobil mengambil keputusan rute terbaik,
                menghindari penumpukan antrean lampu merah, serta menghemat waktu perjalanan.
              </p>
            </div>
          </section>

          {/* Highlights & Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white mb-1">ATCS Dishub Resmi</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Feed siaran kamera dari jaringan Area Traffic Control System Dishub Bandung.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Rute Navigasi Cerdas</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cari alternatif jalan tercepat dengan deteksi titik kamera di sepanjang rute.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center mb-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Ringan di Ponsel</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Streaming lancar langsung dari browser mobile tanpa aplikasi tambahan.
              </p>
            </div>
          </div>

          {/* Internal Linking: Nearby & Other CCTV Locations */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-base font-bold text-white">
                Jelajahi Titik CCTV Lainnya di Bandung
              </h2>
              <Link
                href="/cctv"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Lihat Semua Lokasi →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {otherLocations.map((loc: any) => (
                <Link
                  key={loc.slug}
                  href={`/cctv/${loc.slug}`}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/40 transition-all text-xs font-medium text-slate-200 hover:text-indigo-300"
                >
                  CCTV {loc.locationKey}
                </Link>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/80 to-slate-900 border border-indigo-500/30 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold">Rencanakan Perjalanan Melewati {location.locationKey}?</h3>
              <p className="text-xs text-indigo-200 mt-1 max-w-lg">
                Atur titik keberangkatan dan tujuan di peta utama untuk mengecek kemacetan sebelum berangkat.
              </p>
            </div>
            <Link
              href="/"
              className="px-5 py-2.5 bg-white hover:bg-slate-100 text-indigo-950 font-semibold text-xs rounded-xl shadow-md transition-all shrink-0"
            >
              Buka Perencana Rute
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
