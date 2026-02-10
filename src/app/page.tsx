import { Metadata } from "next";
import RouteMapWrapper from "@/components/RouteMapWrapper";

export const metadata: Metadata = {
  title: "CCTV Bandung Live - MyRoutes | Traffic Monitoring & Route Planning",
  description: "Live CCTV Bandung - Monitor real-time traffic conditions with CCTV cameras across Bandung city. Free route planning tool with interactive maps, live traffic updates, and CCTV monitoring for motorcycle riders and drivers.",
  keywords: ["CCTV Bandung", "CCTV Bandung live", "CCTV traffic Bandung", "CCTV online Bandung", "monitor CCTV Bandung", "CCTV Dishub Bandung", "CCTV ATCS Bandung", "live traffic Bandung", "CCTV kota Bandung", "rute Bandung"],
};

// Server-rendered SEO content section
function SEOContent() {
  return (
    <div className="sr-only">
      <article>
        <h1>CCTV Bandung Live - Real-Time Traffic Monitoring</h1>
        <h2>Monitor Live CCTV Cameras Across Bandung City</h2>
        <p>
          MyRoutes provides free access to live CCTV cameras across Bandung, West Java, Indonesia.
          Monitor real-time traffic conditions at major intersections including Jalan Asia Afrika,
          Jalan Gatot Subroto, Jalan Padjadjaran, Jalan Sudirman, Jalan Dago, Jalan Riau, and
          Pasupati bridge. Our CCTV Bandung live feed helps you plan your route and avoid traffic congestion.
        </p>

        <h2>Features of MyRoutes CCTV Bandung</h2>
        <ul>
          <li>Live CCTV streaming from Dishub Bandung ATCS cameras</li>
          <li>Real-time traffic monitoring across Bandung city</li>
          <li>Interactive route planning for motorcycle and car navigation</li>
          <li>Multiple map styles including satellite and traffic views</li>
          <li>Waypoint management for custom routes</li>
          <li>Mobile-friendly design for on-the-go traffic checking</li>
        </ul>

        <h2>CCTV Locations Covered</h2>
        <p>
          MyRoutes covers CCTV cameras at key locations in Bandung including:
          Simpang Lima, Simpang Dago, Simpang Pasteur, Simpang Gasibu, Simpang Cibiru,
          Buah Batu, Soekarno Hatta, and many more strategic points across the city.
        </p>

        <h2>How to Use CCTV Bandung Live</h2>
        <ol>
          <li>Select your origin point on the map or search for a location</li>
          <li>Set your destination to see the recommended route</li>
          <li>View nearby CCTV cameras along your route</li>
          <li>Click on any CCTV marker to view the live stream</li>
          <li>Toggle &quot;Show All CCTVs&quot; to see all available cameras</li>
        </ol>

        <h2>About Bandung Traffic Monitoring</h2>
        <p>
          Bandung, the capital of West Java province, experiences heavy traffic during peak hours.
          With MyRoutes CCTV Bandung live monitoring, you can check traffic conditions before
          starting your journey. The service integrates with Dishub Bandung&apos;s ATCS
          (Area Traffic Control System) to provide real-time traffic camera feeds.
        </p>

        <h2>Free Route Planning for Bandung</h2>
        <p>
          Plan your journey across Bandung with our free route planning tool. Get accurate
          directions, estimated travel time, and distance calculations. The system supports
          waypoint additions for multi-stop trips and provides real-time traffic updates
          when available.
        </p>

        <h2>Popular Routes in Bandung</h2>
        <ul>
          <li>Bandung City Center to Dago</li>
          <li>Bandung to Lembang route via Setiabudi</li>
          <li>Jalan Asia Afrika to Jalan Riau</li>
          <li>Pasupati bridge to Ciumbuleuit</li>
          <li>Bandung Train Station to Alun-Alun</li>
          <li>Juanda Airport transfer routes</li>
        </ul>
      </article>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <SEOContent />
      <RouteMapWrapper />
    </main>
  );
}
