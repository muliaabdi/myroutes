"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import map component to avoid SSR issues with Leaflet
const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="min-h-screen">
      <RouteMap />
    </main>
  );
}
