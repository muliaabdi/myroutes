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
    "CCTV Gedung Sate",
    "CCTV Alun Alun Bandung",
    "CCTV Buah Batu",
    "CCTV Soekarno Hatta",
    "SPKLU Bandung",
    "lokasi SPKLU Bandung",
    "SPKLU mobil listrik Bandung",
    "charging station Bandung",
    "SPKLU PLN Bandung",
    "SPKLU fast charging Bandung",
    "SPKLU terdekat Bandung",
    "tempat cas mobil listrik Bandung",
    "SPKLU 24 jam Bandung",
    "SPKLU Cimahi",
    "peta SPKLU Bandung",
    "rute tercepat Bandung",
  ],
  alternates: {
    canonical: "https://myroutes.muliaabdi.net",
  },
};

// Unique locations for internal linking & Google crawling
const popularLocations = [
  { name: "Pasteur", slug: "pasteur", desc: "Pintu masuk tol Pasteur & simpang Surya Sumantri" },
  { name: "Simpang Dago", slug: "djuanda", desc: "Jl. Ir. H. Djuanda, Cikapayang & Dago Atas" },
  { name: "Simpang Lima", slug: "simpang-lima", desc: "Titik temu Asia Afrika, Sunda & Gatot Subroto" },
  { name: "Soekarno Hatta", slug: "soekarno-hatta", desc: "ByPass Bandung, Kiaracondong, & Moh. Toha" },
  { name: "Cihampelas", slug: "cihampelas", desc: "Kawasan belanja & Flyover Pasupati" },
  { name: "Cipaganti", slug: "cipaganti", desc: "Akses Dago, Setiabudi, & Cihampelas" },
  { name: "Pasir Kaliki", slug: "pasir-kaliki", desc: "Stasiun Bandung & RS Hasan Sadikin" },
  { name: "Buah Batu", slug: "buah-batu", desc: "Kawasan perkantoran & pintu tol Buah Batu" },
  { name: "Gatot Subroto", slug: "gatot-subroto", desc: "TSM Bandung & koridor timur" },
  { name: "Setiabudi", slug: "setiabudi", desc: "Jalur utama Bandung arah Lembang" },
  { name: "Kopo", slug: "kopo", desc: "Pintu tol Kopo & pusat perdagangan busana" },
  { name: "Moch Toha", slug: "moch-toha", desc: "Pintu tol Moh Toha & akses Dayeuhkolot" },
  { name: "Asia Afrika", slug: "asia-afrika", desc: "Kawasan Alun-Alun & Museum KAA" },
  { name: "R.E. Martadinata", slug: "r-e-martadinata", desc: "Pusat kuliner & Factory Outlet Jl. Riau" },
  { name: "Surapati", slug: "surapati", desc: "Gasibu, Gedung Sate, & Flyover Pasupati" },
];

const popularSPKLUs = [
  { name: "SPKLU PLN UP3 Bandung", loc: "Jl. Soekarno Hatta No. 436", power: "50 kW DC Fast Charging" },
  { name: "SPKLU PLN UID Jawa Barat", loc: "Jl. Asia Afrika No. 63", power: "22 kW Medium Charging" },
  { name: "SPKLU PLN ULP Bandung Utara", loc: "Jl. Sukaasih No. 2, Gegerkalong", power: "30 kW Medium Charging" },
  { name: "SPKLU Gedung Sate", loc: "Jl. Diponegoro No. 22", power: "Fast Charging 24 Jam" },
  { name: "SPKLU Rest Area KM 149 Tol Purbaleunyi", loc: "Tol Purbaleunyi Arah Cileunyi", power: "DC Ultra Fast Charging" },
  { name: "SPKLU Pemkot Cimahi", loc: "Jl. Raden Demang Hardjakusumah", power: "Medium Charging Type 2" },
];

function SEOContent() {
  return (
    <section className="sr-only" aria-label="Informasi CCTV Bandung, Pantau Macet dan SPKLU Mobil Listrik">
      <article>
        <h1>CCTV Bandung Live Streaming ATCS Dishub &amp; Peta SPKLU Mobil Listrik Real-Time</h1>
        
        <p>
          MyRoutes menyediakan akses siaran langsung 500+ kamera CCTV ATCS Dishub Kota Bandung dan Kabupaten Bandung secara gratis,
          serta direktori lengkap 116+ titik SPKLU (Stasiun Pengisian Kendaraan Listrik Umum) di wilayah Bandung Raya.
          Pantau kondisi lalu lintas secara live untuk menghindari kemacetan dan temukan lokasi pengisian mobil listrik terdekat di rute perjalanan harian Anda.
        </p>

        <h2>Titik CCTV Favorit di Kota Bandung</h2>
        <ul>
          {popularLocations.map((loc) => (
            <li key={loc.slug}>
              <Link href={`/cctv/${loc.slug}`}>
                <strong>CCTV {loc.name} Bandung:</strong> {loc.desc}
              </Link>
            </li>
          ))}
        </ul>

        <h2>Titik SPKLU Mobil Listrik Populer di Bandung</h2>
        <ul>
          {popularSPKLUs.map((s, idx) => (
            <li key={idx}>
              <strong>{s.name}:</strong> {s.loc} ({s.power})
            </li>
          ))}
        </ul>

        <h2>Fitur Utama MyRoutes Bandung</h2>
        <ul>
          <li><strong>Siaran Langsung CCTV ATCS:</strong> Lebih dari 528 kamera CCTV jalan Dishub Kota Bandung dan Kabupaten Bandung aktif 24 jam.</li>
          <li><strong>Direktori 116+ SPKLU Bandung:</strong> Temukan charging station mobil listrik terdekat dengan informasi daya kW, soket (CCS2, Type 2, GB/T), dan status operasional 24 jam.</li>
          <li><strong>Perencana Rute Cerdas:</strong> Navigasi titik awal (A) dan tujuan (B) dengan tampilan kamera CCTV serta stasiun pengisian SPKLU di sepanjang lintasan.</li>
          <li><strong>Deteksi Macet Real-Time:</strong> Pantau kepadatan jalan, durasi perjalanan, serta jarak tempuh kilometer.</li>
          <li><strong>Shortcut Landmark Populer:</strong> Akses instan Alun-Alun Bandung, Gedung Sate, Stasiun Bandung, Tol Pasteur, dan Simpang Dago.</li>
          <li><strong>Akses Cepat Mobile &amp; Hemat Kuota:</strong> Tanpa aplikasi berat, langsung streaming lancar dari browser HP.</li>
        </ul>

        <h2>Cara Menggunakan CCTV &amp; SPKLU Bandung Live</h2>
        <ol>
          <li>Tentukan <em>Titik Keberangkatan (A)</em> menggunakan pencarian nama jalan, GPS lokasi saat ini, atau klik langsung pada peta.</li>
          <li>Masukkan <em>Titik Tujuan (B)</em> untuk melihat rute perjalanan tercepat.</li>
          <li>Sistem secara otomatis menampilkan kamera CCTV dan SPKLU charging station di sepanjang rute yang Anda lalui.</li>
          <li>Klik penanda kamera CCTV di peta untuk membuka siaran live ATCS, atau klik penanda SPKLU untuk melihat rute dan info daya pengisian.</li>
        </ol>

        <h2>Pertanyaan Umum seputar CCTV &amp; SPKLU Bandung (FAQ)</h2>
        <div>
          <h3>Bagaimana cara melihat CCTV Bandung secara live?</h3>
          <p>
            Cukup buka situs MyRoutes di browser, klik ikon kamera CCTV di peta atau cari nama simpang jalan. Video streaming akan diputar seketika.
          </p>

          <h3>Di mana lokasi SPKLU mobil listrik di Bandung?</h3>
          <p>
            MyRoutes memetakan lebih dari 116 lokasi SPKLU di Kota Bandung, Kab. Bandung, dan Cimahi, termasuk kantor PLN UP3, PLN UID Jawa Barat, mall ternama, dan rest area tol.
          </p>

          <h3>Apakah ada SPKLU Fast Charging 24 jam di Bandung?</h3>
          <p>
            Ya, banyak titik SPKLU PLN di Bandung seperti di Jl. Soekarno-Hatta dan Asia Afrika yang beroperasi 24 jam dengan kapasitas DC Fast Charging 50 kW hingga 200 kW.
          </p>

          <h3>Apakah MyRoutes berbayar?</h3>
          <p>
            Layanan MyRoutes 100% gratis untuk seluruh warga dan wisatawan Kota Bandung tanpa biaya apapun.
          </p>
        </div>
      </article>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <SEOContent />
      <RouteMapWrapper />
    </main>
  );
}
