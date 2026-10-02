"use client";

import dynamic from "next/dynamic";

// Dynamically import map component to avoid SSR issues with Leaflet
const RouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-300">Memuat peta & pantauan CCTV...</p>
        <p className="text-xs text-slate-500 mt-1">Bandung Traffic Network</p>
      </div>
    </div>
  ),
});

export default function RouteMapWrapper() {
  return <RouteMap />;
}
