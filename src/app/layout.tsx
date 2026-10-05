import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Site configuration
const siteConfig = {
  name: "MyRoutes",
  title: "CCTV Bandung Live ATCS Dishub & Lokasi SPKLU Mobil Listrik - Pantau Rute & Macet | MyRoutes",
  description: "Pantau siaran langsung 500+ CCTV ATCS Dishub Bandung secara live & cek 116+ titik lokasi SPKLU mobil listrik (Fast Charging, 24 Jam, PLN) di Bandung Raya. Rute tercepat & info macet real-time gratis.",
  url: "https://myroutes.muliaabdi.net",
  ogImage: "/og-image.png",
  links: {
    github: "https://github.com/muliaabdi/myroutes",
  },
  author: {
    name: "MyRoutes Bandung",
    url: "https://myroutes.muliaabdi.net",
  },
};

// Advanced SEO Metadata for Google Page 1 ranking
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  // Basic
  title: {
    default: siteConfig.title,
    template: "%s | MyRoutes",
  },
  description: siteConfig.description,
  authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
  creator: siteConfig.author.name,
  publisher: siteConfig.author.name,

  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },

  // Manifest
  manifest: "/manifest.json",

  // Open Graph / Facebook
  openGraph: {
    type: "website",
    locale: "id_ID",
    alternateLocale: ["en_US"],
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "CCTV Bandung Live Streaming ATCS Dishub & Peta SPKLU Mobil Listrik - MyRoutes",
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "CCTV Bandung Live ATCS Dishub & SPKLU Mobil Listrik | MyRoutes",
    description: "Pantau 500+ CCTV ATCS Dishub live & temukan 116+ SPKLU charging mobil listrik terdekat di Bandung Raya.",
    images: [siteConfig.ogImage],
    creator: "@myroutes",
  },

  // App Indexing
  applicationName: siteConfig.name,
  category: "travelnavigation",
  classification: "CCTV Bandung, SPKLU Bandung, Pantau Macet, Navigasi Rute, Dishub ATCS, Mobil Listrik",

  // Search Engine Verification
  verification: {
    google: "H56cpUZySaPjJiARR4tNGwCQSXXnGtya9iFHwg_AVpI",
  },

  // Alternates & Canonical
  alternates: {
    canonical: siteConfig.url,
  },

  // High-Intent Targeted Keywords
  keywords: [
    "CCTV Bandung",
    "CCTV Bandung live",
    "CCTV Bandung live streaming",
    "CCTV Dishub Bandung",
    "CCTV ATCS Bandung",
    "pantau macet Bandung",
    "lalu lintas Bandung hari ini",
    "CCTV lalu lintas Bandung",
    "CCTV online Bandung",
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
    "info macet Bandung",
    "peta jalan Bandung",
    "ATCS Kota Bandung",
  ].join(", "),

  // Robots indexing instructions
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://{s}.basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://server.arcgisonline.com" />
        <link rel="preconnect" href="https://{s}.tile.openstreetmap.org" />

        {/* DNS Prefetch for streaming domains */}
        <link rel="dns-prefetch" href="https://atcs-dishub.bandung.go.id" />
        <link rel="dns-prefetch" href="https://cctv.bandung.go.id" />

        {/* Theme Initialization to prevent flicker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var savedTheme = localStorage.getItem('theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />

        {/* Mobile & App Meta */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#10b981" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#09090b" media="(prefers-color-scheme: dark)" />
        <meta name="color-scheme" content="light dark" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={siteConfig.name} />

        {/* Local SEO / Geo Targeting tags for Bandung, Indonesia */}
        <meta name="geo.region" content="ID-JB" />
        <meta name="geo.placename" content="Bandung" />
        <meta name="geo.position" content="-6.917464;107.619123" />
        <meta name="ICBM" content="-6.917464, 107.619123" />

        {/* Structured Data - WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "MyRoutes - CCTV Bandung Live & Pantau Macet",
              description: siteConfig.description,
              url: siteConfig.url,
              applicationCategory: "TravelNavigationApplication",
              operatingSystem: "All",
              browserRequirements: "Requires JavaScript. Requires HTML5.",
              locationCreated: {
                "@type": "City",
                name: "Bandung",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: "Bandung",
                  addressRegion: "Jawa Barat",
                  addressCountry: "ID",
                },
              },
              areaServed: {
                "@type": "City",
                name: "Bandung",
                description: "Kota Bandung & Kabupaten Bandung, Jawa Barat, Indonesia",
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "IDR",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                ratingCount: "385",
                bestRating: "5",
                worstRating: "1",
              },
              author: {
                "@type": "Organization",
                name: siteConfig.author.name,
                url: siteConfig.author.url,
              },
              featureList: [
                "Live Streaming 500+ CCTV ATCS Dishub Bandung",
                "Pemantauan Kondisi Kemacetan Lalu Lintas Real-Time",
                "Peta 116+ Titik Lokasi SPKLU Mobil Listrik di Bandung Raya",
                "Informasi Daya kW, Tipe Soket (CCS2, Type 2, GB/T) & Operasional 24 Jam SPKLU",
                "Navigasi Rute Cerdas untuk Mobil, Motor, dan Kendaraan Listrik (EV)",
                "Pilihan Berbagai Tampilan Peta Interaktif (Google, Satellite, Carto)",
                "Pencarian Simpang & Jalan Cepat di Bandung",
                "Titik Singgah & Perhitungan Jarak Akurat",
              ],
            }),
          }}
        />

        {/* Structured Data - WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: siteConfig.name,
              alternateName: ["CCTV Bandung Live", "SPKLU Bandung MyRoutes", "Pantau Macet Bandung", "ATCS Bandung Live"],
              url: siteConfig.url,
              description: siteConfig.description,
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${siteConfig.url}/?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />

        {/* Structured Data - FAQPage (Enables Google Rich Results FAQ snippets in SERP) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "Bagaimana cara melihat CCTV Bandung secara live streaming di MyRoutes?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Buka situs myroutes.muliaabdi.net langsung dari browser HP atau komputer. Klik ikon kamera CCTV di peta atau gunakan fitur pencarian untuk menemukan simpang jalan yang ingin dipantau. Siaran langsung kamera ATCS akan tampil seketika.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Dari mana sumber siaran CCTV Bandung di MyRoutes?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Siaran kamera CCTV berasal dari sistem ATCS (Area Traffic Control System) resmi Dinas Perhubungan (Dishub) Kota Bandung dan Dishub Kabupaten Bandung yang terpasang di ratusan titik simpang strategis.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Di mana saja lokasi SPKLU pengisian mobil listrik di wilayah Bandung?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "MyRoutes memetakan 116+ titik SPKLU aktif di Kota Bandung, Kabupaten Bandung, Bandung Barat, dan Cimahi. Meliputi kantor PLN UP3 Bandung, PLN UID Jabar, rest area tol (KM 149, KM 125, KM 72), pusat perbelanjaan (PVJ, TSM, Ciwalk), hotel, dan dealer resmi Wuling/Hyundai dengan tipe charger Fast Charging DC hingga Standard AC Type 2.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Apakah ada SPKLU yang buka 24 jam dan mendukung Fast Charging di Bandung?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Ya, sebagian besar SPKLU PLN di Bandung seperti PLN UP3 Bandung (Soekarno-Hatta), PLN UID Jawa Barat (Asia Afrika), dan rest area jalan tol beroperasi 24 jam nonstop serta mendukung DC Fast Charging (50 kW hingga 200 kW) dengan soket CCS2 dan CHAdeMO.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Apakah layanan CCTV Bandung dan peta SPKLU ini gratis?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Ya, MyRoutes 100% gratis digunakan oleh siapa saja tanpa perlu download aplikasi tambahan, tanpa login, dan tanpa biaya berlangganan.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Bagaimana cara merencanakan rute perjalanan dan singgah di SPKLU terdekat?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Pilih Titik Keberangkatan (A) dan Titik Tujuan (B) pada peta. Buka tab SPKLU untuk melihat stasiun pengisian daya yang berada tepat di lintasan perjalanan Anda (~800m), lalu klik '+ Singgah' atau 'Rute ke Sini' untuk memasukkan SPKLU ke dalam navigasi perjalanan.",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
