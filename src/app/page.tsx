import { Metadata } from "next";
import Link from "next/link";
import RouteMapWrapper from "@/components/RouteMapWrapper";

export const metadata: Metadata = {
  title: "CCTV Bandung Live ATCS Dishub & Lokasi SPKLU Mobil Listrik | MyRoutes",
  description: "Pantau siaran langsung 500+ CCTV ATCS Dishub Kota Bandung secara live & cek 116+ titik lokasi SPKLU mobil listrik (Fast Charging, 24 Jam, PLN) di Bandung Raya. Cek titik macet & navigasi rute tercepat.",
  keywords: [
    "CCTV Bandung",
    "CCTV Bandung live",
    "CCTV Bandung live streaming",
    "CCTV Dishub Bandung",
    "CCTV ATCS Bandung",
    "pantau macet Bandung",
    "lalu lintas Bandung hari ini",
    "CCTV Pasteur Bandung",
    "CCTV Simpang Dago",
    "CCTV Simpang Lima Bandung",
    "CCTV Soekarno Hatta",
    "SPKLU Bandung",
    "lokasi SPKLU Bandung",
    "SPKLU mobil listrik Bandung",
    "charging station Bandung",
    "SPKLU PLN Bandung",
    "SPKLU fast charging Bandung",
    "rute tercepat Bandung",
  ],
  alternates: {
    canonical: "https://myroutes.muliaabdi.net",
  },
  openGraph: {
    title: "CCTV Bandung Live ATCS Dishub & Lokasi SPKLU | MyRoutes",
    description: "Pantau siaran langsung 500+ CCTV ATCS Dishub Kota Bandung dan direktori 116+ titik SPKLU mobil listrik.",
    url: "https://myroutes.muliaabdi.net",
    locale: "id_ID",
    type: "website",
  },
};

// 19 verified location hubs from cctvs.json
const locationHubs = [
  { name: "Pasteur", slug: "pasteur", desc: "Pintu masuk tol Pasteur & simpang Surya Sumantri" },
  { name: "Simpang Dago", slug: "djuanda", desc: "Jl. Ir. H. Djuanda, Cikapayang & Dago Atas" },
  { name: "Simpang Lima", slug: "simpang-lima", desc: "Titik temu Asia Afrika, Sunda & Gatot Subroto" },
  { name: "Soekarno Hatta", slug: "soekarno-hatta", desc: "ByPass Bandung, Kiaracondong, Gedebage & Moh. Toha" },
  { name: "Surapati", slug: "surapati", desc: "Gasibu, Gedung Sate, & Flyover Pasupati" },
  { name: "Cihampelas", slug: "cihampelas", desc: "Kawasan belanja & akses Flyover Pasupati" },
  { name: "Cipaganti", slug: "cipaganti", desc: "Akses Dago, Setiabudi, & Cihampelas" },
  { name: "Sudirman", slug: "sudirman", desc: "Jalan protokol & sentra bisnis Kota Bandung barat" },
  { name: "Tamansari", slug: "tamansari", desc: "Kawasan kampus ITB & Kebun Binatang Bandung" },
  { name: "PHH Mustofa", slug: "phh-mustofa", desc: "Kawasan Suci, ITENAS, & koridor Cicaheum" },
  { name: "Pelajar Pejuang", slug: "pelajar-pejuang", desc: "Lingkar selatan, Laswi, & koridor Gatot Subroto" },
  { name: "BKR", slug: "bkr", desc: "Kawasan Lapangan Tegalega & jalan lingkar selatan" },
  { name: "Peta", slug: "peta", desc: "Pusat perniagaan Muara & akses Lingkar Kopo" },
  { name: "Sunda", slug: "sunda", desc: "Sentra kuliner & pertokoan Jl. Sunda" },
  { name: "Jawa", slug: "jawa", desc: "Kawasan Balaikota Bandung & perkantoran Pemkot" },
  { name: "Cimahi", slug: "cimahi", desc: "Titik perbatasan & jalan arteri Kota Cimahi" },
  { name: "Bandung Barat (KBB)", slug: "kbb", desc: "Padalarang, Ciburuy, Cipatat & jalur arteri barat" },
  { name: "Kabupaten Bandung", slug: "kab", desc: "Soreang, Pemda, Tol Soroja & Kopo Sayati" },
  { name: "Pelindung Smart City", slug: "pelindung", desc: "Jaringan 390+ titik kamera fasilitas publik Kota Bandung" },
];

const popularSPKLUs = [
  { name: "SPKLU PLN UP3 Bandung", loc: "Jl. Soekarno Hatta No. 436", power: "50 kW DC Fast Charging" },
  { name: "SPKLU PLN UID Jawa Barat", loc: "Jl. Asia Afrika No. 63", power: "22 kW Medium Charging" },
  { name: "SPKLU PLN ULP Bandung Utara", loc: "Jl. Sukaasih No. 2, Gegerkalong", power: "30 kW Medium Charging" },
  { name: "SPKLU Gedung Sate", loc: "Jl. Diponegoro No. 22", power: "Fast Charging 24 Jam" },
  { name: "SPKLU Rest Area KM 149 Tol Purbaleunyi", loc: "Tol Purbaleunyi Arah Cileunyi", power: "DC Ultra Fast Charging" },
  { name: "SPKLU Pemkot Cimahi", loc: "Jl. Raden Demang Hardjakusumah", power: "Medium Charging Type 2" },
];

function VisibleSEOSection() {
  return (
    <section className="bg-slate-950 text-slate-200 border-t border-slate-800/80 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Section Intro */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Direktori CCTV Bandung &amp; SPKLU Mobil Listrik
            </h2>
            <Link
              href="/cctv"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Buka Direktori Lengkap CCTV →
            </Link>
          </div>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-4xl">
            MyRoutes menghadirkan siaran langsung 500+ kamera pengawas CCTV ATCS Dinas Perhubungan Kota Bandung,
            Kabupaten Bandung, dan Cimahi secara bebas akses. Pantau kondisi kemacetan di persimpangan jalan secara real-time
            dan temukan 116+ lokasi stasiun pengisian kendaraan listrik (SPKLU) terdekat di sepanjang rute Anda.
          </p>
        </div>

        {/* 19 Valid Location Hubs */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4">
            Titik CCTV Favorit di Wilayah Bandung Raya
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locationHubs.map((loc) => (
              <Link
                key={loc.slug}
                href={`/cctv/${loc.slug}`}
                className="group p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-white group-hover:text-indigo-300 transition-colors">
                    CCTV {loc.name}
                  </span>
                  <span className="text-[11px] text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                    Pantau →
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {loc.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* SPKLU Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-3">
            Titik SPKLU Mobil Listrik Populer di Bandung
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {popularSPKLUs.map((s, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <p className="text-xs font-bold text-emerald-400 mb-1">{s.name}</p>
                <p className="text-xs text-slate-300">{s.loc}</p>
                <p className="text-[11px] text-slate-500 mt-1">{s.power}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Pertanyaan Umum (FAQ) CCTV &amp; Rute Bandung
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-300">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/70">
              <h4 className="font-bold text-white mb-1.5">Bagaimana cara melihat CCTV Bandung live?</h4>
              <p className="text-slate-400 leading-relaxed">
                Pilih titik di peta atau klik salah satu lokasi di direktori atas. Anda dapat melihat siaran langsung ATCS tanpa aplikasi tambahan.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/70">
              <h4 className="font-bold text-white mb-1.5">Apakah MyRoutes menampilkan lokasi SPKLU?</h4>
              <p className="text-slate-400 leading-relaxed">
                Ya, lebih dari 116 titik SPKLU aktif di Bandung Raya dapat ditampilkan di peta lengkap dengan info daya kW dan tipe konektor.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/70">
              <h4 className="font-bold text-white mb-1.5">Apakah rute yang dihasilkan memperhitungkan kemacetan?</h4>
              <p className="text-slate-400 leading-relaxed">
                Algoritma perencana rute mendeteksi segmen jalan padat dan menampilkan kamera CCTV di rute tersebut sehingga Anda bisa mengecek kondisi langsung.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/70">
              <h4 className="font-bold text-white mb-1.5">Apakah layanan ini berbayar?</h4>
              <p className="text-slate-400 leading-relaxed">
                MyRoutes 100% gratis untuk seluruh masyarakat dan wisatawan yang bepergian di Kota Bandung dan sekitarnya.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-slate-900 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} MyRoutes Bandung. Data sumber dari ATCS Dishub Kota Bandung.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-300 transition-colors">Peta Rute</Link>
            <Link href="/cctv" className="hover:text-slate-300 transition-colors">Direktori CCTV</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950">
      <RouteMapWrapper />
      <VisibleSEOSection />
    </main>
  );
}
