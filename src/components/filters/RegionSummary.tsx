"use client";

import { useState, useEffect } from "react";
import { RegionSelection } from "./RegionFilter";
import { API_ROUTES } from "@/lib/constants";

interface SummaryData {
  totalFamilies: number;
  totalDistributions: number;
  lastUpdated?: string;
}

interface RegionSummaryProps {
  region: RegionSelection;
}

export default function RegionSummary({ region }: RegionSummaryProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      // Determine the most specific region code
      let regionCode: string | null = null;
      if (region.village) regionCode = region.village.code;
      else if (region.district) regionCode = region.district.code;
      else if (region.regency) regionCode = region.regency.code;
      else if (region.province) regionCode = region.province.code;

      if (!regionCode) {
        setSummary(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch map data and filter by region
        const response = await fetch(API_ROUTES.PUBLIC_MAP_DATA);
        if (!response.ok) throw new Error("Gagal memuat data ringkasan");

        const json = await response.json();
        const mapData = json.data;

        // Find all regions that match the selected region
        // (e.g., if district selected, include all villages in that district)
        const filteredData = mapData.filter((item: any) => {
          return item.regionCode.startsWith(regionCode!);
        });

        // Calculate totals
        const totalFamilies = filteredData.reduce((sum: number, item: any) => sum + item.count, 0);

        // Fetch distributions count
        const distResponse = await fetch(API_ROUTES.PUBLIC_STATS);
        if (!distResponse.ok) throw new Error("Gagal memuat data distribusi");

        const distJson = await distResponse.json();
        const totalDistributions = distJson.data.totalDistributions || 0;

        setSummary({
          totalFamilies,
          totalDistributions,
          lastUpdated: new Date().toISOString(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [region]);

  // Build breadcrumb
  const breadcrumb = [
    region.province?.name,
    region.regency?.name,
    region.district?.name,
    region.village?.name,
  ].filter(Boolean).join(" > ");

  // Empty state
  const hasSelection = region.province || region.regency || region.district || region.village;

  if (!hasSelection) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
        </svg>
        <p className="text-gray-500 text-sm">Pilih wilayah untuk melihat ringkasan</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Breadcrumb */}
      <div className="mb-4 pb-4 border-b border-gray-100">
        <p className="text-xs text-gray-500 mb-1">Lokasi Terpilih</p>
        <p className="text-sm font-medium text-gray-800 line-clamp-3">{breadcrumb}</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-error/10 text-error px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Summary Data */}
      {!loading && !error && summary && (
        <div className="grid grid-cols-1 gap-3">
          {/* Total Families */}
          <div className="bg-primary/5 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Keluarga Terdata</p>
                <p className="text-2xl font-bold text-primary">{summary.totalFamilies}</p>
              </div>
              <svg className="w-8 h-8 text-primary/30" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
          </div>

          {/* Total Distributions */}
          <div className="bg-secondary/5 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Distribusi Selesai</p>
                <p className="text-2xl font-bold text-secondary">{summary.totalDistributions}</p>
              </div>
              <svg className="w-8 h-8 text-secondary/30" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
