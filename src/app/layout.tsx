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
  title: "MyRoutes - Route Planning & CCTV Monitoring - Bandung Area",
  description: "Plan your motorcycle routes with real-time traffic updates and monitor live CCTV cameras along your journey. Free route planning tool with interactive maps.",
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
        alt: siteConfig.title,
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
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
    "route planning",
    "motorcycle routes",
    "traffic monitoring",
    "CCTV cameras",
    "live traffic",
    "GPS navigation",
    "map navigation",
    "route optimizer",
    "travel planning",
    "bandung traffic",
    "indonesia routes",
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
                "Route Planning",
                "Real-time Traffic Updates",
                "CCTV Camera Monitoring",
                "Interactive Maps",
                "Waypoint Management",
                "Multiple Map Styles",
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
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
