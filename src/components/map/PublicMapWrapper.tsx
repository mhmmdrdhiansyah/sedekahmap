"use client";

import dynamic from "next/dynamic";

const PublicMap = dynamic(() => import("./PublicMap"), {
  ssr: false, // CRITICAL: Harus false karena Leaflet butuh DOM
  loading: () => (
    <div className="h-[600px] w-full animate-pulse rounded-lg bg-gray-200" />
  ),
});

export default function PublicMapWrapper() {
  return <PublicMap />;
}
