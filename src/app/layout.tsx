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
  title: "CCTV Bandung Live - MyRoutes | Traffic Monitoring & Route Planning",
  description: "Live CCTV Bandung - Monitor real-time traffic conditions with CCTV cameras across Bandung city. Free route planning tool with interactive maps, live traffic updates, and CCTV monitoring for motorcycle riders and drivers.",
  url: "https://myroutes.muliaabdi.net",
  ogImage: "/og-image.png",
  links: {
    github: "https://github.com/yourusername/myroutes",
  },
  author: {
    name: "MyRoutes Team",
    url: "https://myroutes.muliaabdi.net",
  },
};

// Advanced Metadata
export const metadata: Metadata = {
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
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },

  // Manifest
  manifest: "/manifest.json",

  // Open Graph / Facebook
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "CCTV Bandung Live - MyRoutes Traffic Monitoring",
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "CCTV Bandung Live - MyRoutes",
    description: "Monitor live CCTV cameras across Bandung city. Real-time traffic monitoring and route planning for Bandung area.",
    images: [siteConfig.ogImage],
    creator: "@myroutes",
  },

  // App Indexing
  applicationName: siteConfig.name,
  category: "travelnavigation",
  classification: "Route Planning, Navigation, Traffic Monitoring",

  // Verification
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
  },

  // Alternates
  alternates: {
    canonical: siteConfig.url,
    languages: {
      "en-US": siteConfig.url,
      "id-ID": `${siteConfig.url}/id`,
    },
  },

  // Additional SEO
  keywords: [
    "CCTV Bandung",
    "CCTV Bandung live",
    "CCTV traffic Bandung",
    "CCTV online Bandung",
    "monitor CCTV Bandung",
    "CCTV Dishub Bandung",
    "CCTV ATCS Bandung",
    "live traffic Bandung",
    "CCTV kota Bandung",
    "rute Bandung",
    "route planning Bandung",
    "motorcycle routes Bandung",
    "traffic monitoring",
    "CCTV cameras Indonesia",
    "live traffic updates",
    "GPS navigation Bandung",
    "map navigation",
    "route optimizer",
    "travel planning Bandung",
    "bandung traffic",
    "indonesia routes",
    "CCTV jalanan Bandung",
  ].join(", "),

  // Robots
  robots: {
    index: true,
    follow: true,
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
    <html lang="en-US" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://{s}.basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://server.arcgisonline.com" />
        <link rel="preconnect" href="https://{s}.tile.openstreetmap.org" />

        {/* DNS Prefetch for external domains */}
        <link rel="dns-prefetch" href="https://atcs-dishub.bandung.go.id" />

        {/* Additional meta tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#3b82f6" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1d4ed8" media="(prefers-color-scheme: dark)" />
        <meta name="color-scheme" content="light dark" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={siteConfig.name} />
        <meta name="google-site-verification" content="H56cpUZySaPjJiARR4tNGwCQSXXnGtya9iFHwg_AVpI" />

        {/* Structured Data - Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: siteConfig.name,
              description: siteConfig.description,
              url: siteConfig.url,
              applicationCategory: "TravelNavigationApplication",
              operatingSystem: "Web",
              locationCreated: {
                "@type": "City",
                name: "Bandung",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: "Bandung",
                  addressRegion: "West Java",
                  addressCountry: "Indonesia",
                },
              },
              areaServed: {
                "@type": "City",
                name: "Bandung",
                description: "Kota Bandung, West Java, Indonesia",
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Organization",
                name: siteConfig.author.name,
                url: siteConfig.author.url,
              },
              featureList: [
                "Live CCTV Bandung",
                "Route Planning",
                "Real-time Traffic Updates",
                "CCTV Camera Monitoring",
                "Interactive Maps",
                "Waypoint Management",
                "Multiple Map Styles",
                "Traffic Condition Monitoring",
              ],
              keywords: [
                "CCTV Bandung",
                "CCTV live Bandung",
                "traffic monitoring",
                "route planning",
                "Bandung navigation",
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
              url: siteConfig.url,
              description: siteConfig.description,
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />

        {/* Structured Data - SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: siteConfig.name,
              applicationCategory: "TravelNavigationApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.8",
                ratingCount: "120",
              },
            }),
          }}
        />

        {/* Structured Data - FAQ Page */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is MyRoutes CCTV Bandung?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "MyRoutes is a free web application that provides live CCTV monitoring from Bandung's Dishub ATCS cameras, along with route planning and real-time traffic updates for Bandung city, Indonesia.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How do I access live CCTV Bandung cameras?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Simply visit myroutes.muliaabdi.net, and the map will show CCTV camera locations. Click on any blue camera icon to view the live stream. Use the 'Show All CCTVs' toggle to see all available cameras.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Is MyRoutes CCTV Bandung free to use?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes, MyRoutes is completely free. No registration or API key is required to access CCTV Bandung live feeds or route planning features.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What areas in Bandung are covered by CCTV cameras?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "MyRoutes covers major intersections in Bandung including Jalan Asia Afrika, Jalan Gatot Subroto, Jalan Padjadjaran, Jalan Sudirman, Jalan Dago, Simpang Lima, Simpang Dago, Simpang Pasteur, Simpang Gasibu, Pasupati bridge, and many more strategic locations across the city.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Can I plan routes with MyRoutes?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes! MyRoutes includes a route planning feature. Set your origin and destination points on the map, and the system will calculate the optimal route showing distance, estimated travel time, and nearby CCTV cameras along the way.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Does MyRoutes work on mobile devices?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes, MyRoutes is fully responsive and works on all mobile devices including smartphones and tablets. The interface is optimized for touch interaction and on-the-go traffic monitoring.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What is the source of CCTV Bandung footage?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "The CCTV footage is sourced from Dishub Bandung's ATCS (Area Traffic Control System) cameras, which are installed at major intersections throughout the city for traffic monitoring and management.",
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
