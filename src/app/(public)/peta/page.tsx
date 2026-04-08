"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import RegionFilter, { RegionSelection } from "@/components/filters/RegionFilter";
import RegionSummary from "@/components/filters/RegionSummary";

const PublicMap = dynamic(() => import("@/components/map/InteractiveMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 animate-pulse bg-gray-200" />
  ),
});

export default function PetaPage() {
  const [selectedRegion, setSelectedRegion] = useState<RegionSelection>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Share selected region with map component via window
  useEffect(() => {
    (window as any).sedekahRegion = selectedRegion;
  }, [selectedRegion]);

  const handleRegionChange = useCallback((region: RegionSelection) => {
    setSelectedRegion(region);
  }, []);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row">
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-20 left-4 z-[1000] bg-primary text-white p-2 rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto
          fixed md:relative h-[calc(100vh-64px)] z-[999] transition-transform duration-300 ease-in-out
        `}
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-primary">Peta Sebaran</h1>
            <p className="text-sm text-gray-600 mt-1">
              Filter berdasarkan wilayah untuk melihat sebaran penerima manfaat
            </p>
          </div>

          {/* Region Filter */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Filter Wilayah</h2>
            <RegionFilter onRegionChange={handleRegionChange} />
          </div>

          {/* Region Summary */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Ringkasan Area</h2>
            <RegionSummary region={selectedRegion} />
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[998]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <PublicMap />
      </div>
    </div>
  );
}
