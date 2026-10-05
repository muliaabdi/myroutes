import { Metadata } from "next";
import Link from "next/link";
import cctvs from "@/data/cctvs.json";

export const metadata: Metadata = {
  title: "Direktori CCTV Bandung Live ATCS Dishub | Pantau Macet Real-Time",
  description: "Daftar lengkap titik pantauan kamera CCTV ATCS Dishub Kota Bandung, Cimahi, dan Bandung Barat. Cek siaran langsung kondisi lalu lintas dan rute bebas macet.",
  keywords: [
    "CCTV Bandung",
    "Direktori CCTV Bandung",
    "CCTV Dishub Bandung live",
    "CCTV ATCS Bandung",
    "pantau macet Bandung",
    "CCTV Pasteur",
    "CCTV Simpang Dago",
    "CCTV Soekarno Hatta",
    "CCTV Simpang Lima",
  ],
  alternates: {
    canonical: "https://myroutes.muliaabdi.net/cctv",
  },
  openGraph: {
    title: "Direktori CCTV Bandung Live ATCS Dishub | MyRoutes",
    description: "Daftar lengkap titik pantauan kamera CCTV ATCS Dishub Kota Bandung dan sekitarnya.",
    url: "https://myroutes.muliaabdi.net/cctv",
    locale: "id_ID",
    type: "website",
  },
};

interface LocationHub {
  slug: string;
  name: string;
  count: number;
  description: string;
}

const HUB_DESCRIPTIONS: Record<string, string> = {
  "soekarno-hatta": "Jalur ByPass arteri utama Bandung: Gedebage, Ibrahim Adjie, Buah Batu, Moh. Toha, hingga Kopo.",
  "pasteur": "Pintu gerbang utama tol Pasteur, simpang Surya Sumantri, dan akses utama masuk Kota Bandung.",
  "simpang-lima": "Pusat pertemuan Jl. Asia Afrika, Jl. Sunda, dan Jl. Gatot Subroto di jantung Kota Bandung.",
  "djuanda": "Koridor Dago, Simpang Cikapayang, RS Borromeus, hingga kawasan Dago Atas.",
  "surapati": "Kawasan Gasibu, Gedung Sate, Monumen Perjuangan, dan akses Flyover Pasupati.",
  "cihampelas": "Sentra belanja jeans, wisata kuliner Cihampelas, dan akses Pasupati.",
  "cipaganti": "Akses penghubung strategis Dago, Setiabudi, dan Cihampelas.",
  "sudirman": "Pusat niaga dan jalan protokol legendaris arah barat Kota Bandung.",
  "tamansari": "Kawasan pendidikan kampus ITB, Unisba, Unpas, dan Kebun Binatang Bandung.",
  "phh-mustofa": "Kawasan Suci, kampus Itenas, Widyatama, dan akses timur Cicaheum.",
  "pelajar-pejuang": "Jalur lingkar penghubung Buah Batu, Laswi, dan Gatot Subroto.",
  "bkr": "Jalur lingkar selatan penghubung Lapangan Tegalega dan Moh. Toha.",
  "peta": "Kawasan perniagaan Muara, Festival Citylink, dan akses Kopo.",
  "sunda": "Pusat kuliner dan pertokoan penghubung Simpang Lima dan Kosambi.",
  "jawa": "Kawasan Balaikota Bandung, Taman Sejarah, dan pusat kantor Pemkot.",
  "cimahi": "Titik persimpangan strategis dan perbatasan Kota Bandung - Cimahi.",
  "kbb": "Wilayah Bandung Barat: Tol Purbaleunyi, Padalarang, Cipatat, dan Ciburuy.",
  "kab": "Wilayah Kabupaten Bandung: Soreang, Tol Soroja, Kopo Sayati, dan Banjaran.",
  "pelindung": "Jaringan ratusan titik CCTV fasilitas publik dan lingkungan Smart City Bandung.",
};

export default function CCTVDirectoryPage() {
  const hubMap = cctvs.reduce((acc: Record<string, LocationHub>, cctv: any) => {
    const locationKey = cctv.name.replace(/KOTA - /, "").split(" - ")[0].trim();
    const slug = locationKey.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    if (!acc[slug]) {
      acc[slug] = {
        slug,
        name: locationKey,
        count: 0,
        description: HUB_DESCRIPTIONS[slug] || `Kamera pantauan lalu lintas kawasan ${locationKey}, Bandung.`,
      };
    }
    acc[slug].count++;
    return acc;
  }, {});

  const hubs = Object.values(hubMap).sort((a, b) => b.count - a.count);
  const totalCameras = cctvs.length;

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
        name: "Direktori CCTV Bandung",
        item: "https://myroutes.muliaabdi.net/cctv",
      },
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Direktori CCTV Bandung Live ATCS Dishub",
    description: "Kumpulan seluruh titik pantauan kamera CCTV ATCS lalu lintas di Kota Bandung dan sekitarnya.",
    url: "https://myroutes.muliaabdi.net/cctv",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Bagaimana cara menonton siaran langsung CCTV ATCS Bandung?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Klik salah satu kawasan jalan di direktori ini atau buka Peta Interaktif. Anda bisa langsung menonton siaran live ATCS tanpa perlu registrasi, download aplikasi, atau membayar.",
        },
      },
      {
        "@type": "Question",
        name: "Kenapa sebagian siaran CCTV kadang berstatus offline atau hitam?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Feed CCTV dikelola langsung oleh server ATCS Dinas Perhubungan. Status offline biasanya terjadi jika kamera sedang dalam proses perbaikan fisik di jalan, gangguan jaringan fiber optik, atau pembaruan token streaming oleh Dishub.",
        },
      },
      {
        "@type": "Question",
        name: "Kapan jam rawan macet di jalan protokol Kota Bandung?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Jam macet utama terjadi pada jam berangkat kerja (06.30 - 08.30 WIB) dan jam pulang kerja (16.30 - 19.30 WIB) di koridor Soekarno-Hatta, Pasteur, dan Surapati. Pada akhir pekan, kepadatan meningkat di kawasan wisata Dago, Cihampelas, dan Setiabudi.",
        },
      },
      {
        "@type": "Question",
        name: "Apakah siaran kamera CCTV Bandung ini real-time?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ya, siaran ditayangkan langsung secara streaming HLS dari kamera Dishub Bandung dengan latensi hanya beberapa detik tergantung kecepatan koneksi internet Anda.",
        },
      },
      {
        "@type": "Question",
        name: "Berapa total kamera CCTV Dishub yang dipetakan di MyRoutes?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "MyRoutes memetakan lebih dari 500 kamera pantau yang mencakup Kota Bandung, Kabupaten Bandung (Soreang, Dayeuhkolot, Cileunyi), hingga Kota Cimahi.",
        },
      },
      {
        "@type": "Question",
        name: "Apakah ada rekaman riwayat video CCTV untuk bukti kecelakaan?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "MyRoutes hanya menayangkan siaran langsung (live feed) dan tidak menyimpan rekaman riwayat video. Untuk permohonan rekaman resmi insiden atau kecelakaan lalu lintas, masyarakat dapat menghubungi langsung kantor Dinas Perhubungan Kota Bandung.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">
              Beranda
            </Link>
            <span>/</span>
            <span className="text-indigo-400 font-medium">Direktori CCTV</span>
          </nav>

          {/* Header */}
          <div className="border-b border-slate-800 pb-8 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Direktori CCTV Bandung Live ATCS
                </h1>
                <p className="text-slate-400 mt-2 max-w-2xl text-sm sm:text-base leading-relaxed">
                  Pantau kondisi lalu lintas langsung dari {totalCameras}+ kamera CCTV Dinas Perhubungan Kota Bandung,
                  Kabupaten Bandung, dan Cimahi secara real-time.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span>Buka Peta Interaktif</span>
              </Link>
            </div>
          </div>

          {/* Grid of Locations */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">Pilih Kawasan CCTV</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hubs.map((hub) => (
                <Link
                  key={hub.slug}
                  href={`/cctv/${hub.slug}`}
                  className="group p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors">
                        {hub.name}
                      </h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        {hub.count} Kamera
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      {hub.description}
                    </p>
                  </div>
                  <span className="text-xs text-indigo-400 group-hover:text-indigo-300 font-semibold inline-flex items-center gap-1">
                    Buka Pantauan CCTV
                    <svg className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Helpful Information */}
          <section className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 text-sm leading-relaxed mb-8">
            <h2 className="text-lg font-bold text-white mb-2">Tentang CCTV ATCS Bandung</h2>
            <p className="mb-3">
              ATCS (Area Traffic Control System) Kota Bandung adalah sistem kendali lalu lintas berbasis teknologi informasi
              untuk mengoptimalkan kinerja jaringan jalan melalui optimasi dan koordinasi lampu lalu lintas di setiap persimpangan.
            </p>
            <p>
              Dengan MyRoutes, Anda dapat memantau feed video live dari kamera pengawas ATCS Dishub secara langsung tanpa login,
              membantu menentukan rute perjalanan terbaik dan menghindari titik rawan kemacetan di Kota Bandung.
            </p>
          </section>

          {/* Frequently Asked Questions (FAQ) */}
          <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-300 text-sm leading-relaxed mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <h2 className="text-xl font-bold text-white">Pertanyaan Umum (FAQ) Seputar CCTV Bandung</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <h3 className="font-semibold text-white mb-1.5 text-sm">Bagaimana cara menonton siaran langsung CCTV ATCS Bandung?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cukup pilih salah satu kawasan jalan di direktori ini atau buka Peta Interaktif. Video live streaming ATCS akan berputar secara instan tanpa perlu registrasi atau aplikasi tambahan.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <h3 className="font-semibold text-white mb-1.5 text-sm">Kenapa sebagian siaran CCTV kadang berstatus offline atau hitam?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Feed CCTV dikelola langsung oleh server ATCS Dishub. Status offline umumnya terjadi karena proses perbaikan fisik kamera di jalan, gangguan fiber optik, atau pembaruan token streaming berkala oleh Dishub.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <h3 className="font-semibold text-white mb-1.5 text-sm">Kapan jam rawan macet di jalan protokol Kota Bandung?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Jam padat utama terjadi pada jam berangkat kerja (06.30 - 08.30 WIB) dan jam pulang kerja (16.30 - 19.30 WIB) di koridor Soekarno-Hatta, Pasteur, dan Surapati, serta akhir pekan di kawasan wisata.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <h3 className="font-semibold text-white mb-1.5 text-sm">Apakah ada rekaman riwayat video CCTV untuk bukti kecelakaan?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  MyRoutes hanya menayangkan siaran langsung (live feed) dan tidak menyimpan rekaman riwayat. Untuk permohonan rekaman resmi insiden, silakan hubungi langsung Dinas Perhubungan Kota Bandung.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
