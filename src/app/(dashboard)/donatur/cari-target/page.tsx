"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useMapData } from "@/hooks/useMapData";
import { MAP_CONFIG, REGION_LEVELS } from "@/lib/constants";
import RequestAccessModal from "@/components/modals/RequestAccessModal";
import RegionFilter, { RegionSelection } from "@/components/filters/RegionFilter";

// Dynamic import Map components with SSR disabled
const MapView = dynamic(
  () => import("@/components/map/CariTargetMapView"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] w-full bg-gray-200 rounded-xl animate-pulse flex items-center justify-center">
        <p className="text-gray-500">Memuat peta...</p>
      </div>
    )
  }
);

// Zoom levels by region type
const ZOOM_LEVELS: Record<number, number> = {
  [REGION_LEVELS.PROVINSI]: 8,
  [REGION_LEVELS.KABUPATEN]: 10,
  [REGION_LEVELS.KECAMATAN]: 12,
  [REGION_LEVELS.DESA]: 14,
};

// Helper to get region level from region code
function getRegionLevelFromCode(code: string): number {
  const dots = code.split('.').length;
  if (dots === 1) return REGION_LEVELS.PROVINSI;
  if (dots === 2) return REGION_LEVELS.KABUPATEN;
  if (dots === 3) return REGION_LEVELS.KECAMATAN;
  return REGION_LEVELS.DESA;
}

interface Beneficiary {
  id: string;
  name: string;
  needs: string;
  regionName: string | null;
  latitude?: number;
  longitude?: number;
}

interface RegionData {
  regionCode: string;
  regionName: string | null;
  count: number;
  centerLat: number;
  centerLng: number;
}

export default function CariTargetPage() {
  const mapData = useMapData();

  const [selectedRegion, setSelectedRegion] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false);
  const [beneficiariesError, setBeneficiariesError] = useState<string | null>(null);

  // Region filter selection
  const [regionSelection, setRegionSelection] = useState<RegionSelection>({});

  // Modal state
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  // Map fly to state
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);

  // Use ref to store mapData to avoid dependency issues
  const mapDataRef = useRef<RegionData[]>([]);
  mapDataRef.current = mapData.data;

  // ============================================================
  // STABLE CALCULATIONS with useMemo
  // ============================================================

  // Get the most specific region code from selection (stable)
  const regionCode = useMemo((): string | null => {
    if (regionSelection.village) return regionSelection.village.code;
    if (regionSelection.district) return regionSelection.district.code;
    if (regionSelection.regency) return regionSelection.regency.code;
    if (regionSelection.province) return regionSelection.province.code;
    return null;
  }, [regionSelection.village?.code, regionSelection.district?.code, regionSelection.regency?.code, regionSelection.province?.code]);

  // Get region name from selection (stable)
  const regionName = useMemo((): string => {
    if (regionSelection.village) return regionSelection.village.name;
    if (regionSelection.district) return regionSelection.district.name;
    if (regionSelection.regency) return regionSelection.regency.name;
    if (regionSelection.province) return regionSelection.province.name;
    return "";
  }, [regionSelection.village?.name, regionSelection.district?.name, regionSelection.regency?.name, regionSelection.province?.name]);

  // Get region level for zoom (stable)
  const regionLevel = useMemo((): number | null => {
    if (regionSelection.village) return REGION_LEVELS.DESA;
    if (regionSelection.district) return REGION_LEVELS.KECAMATAN;
    if (regionSelection.regency) return REGION_LEVELS.KABUPATEN;
    if (regionSelection.province) return REGION_LEVELS.PROVINSI;
    return null;
  }, [regionSelection.village, regionSelection.district, regionSelection.regency, regionSelection.province]);

  // ============================================================
  // CALLBACKS with useCallback (prevent infinite loop)
  // ============================================================

  // Fetch beneficiaries for a region - REUSABLE FUNCTION
  const fetchBeneficiariesForRegion = useCallback(async (code: string, name: string, level?: number | null) => {
    setLoadingBeneficiaries(true);
    setBeneficiariesError(null);

    try {
      const response = await fetch(
        `/api/public/beneficiaries-by-region?regionCode=${encodeURIComponent(code)}`
      );

      if (!response.ok) {
        throw new Error("Gagal memuat data penerima manfaat");
      }

      const json = await response.json();
      const beneficiariesData = json.data || [];
      setBeneficiaries(beneficiariesData);

      // Update selected region name
      setSelectedRegion({ code, name });

      // Calculate map center from beneficiaries data
      if (beneficiariesData.length > 0) {
        const validBeneficiaries = beneficiariesData.filter((b: Beneficiary) => b.latitude && b.longitude);
        if (validBeneficiaries.length > 0) {
          const avgLat = validBeneficiaries.reduce((sum: number, b: Beneficiary) => sum + (b.latitude || 0), 0) / validBeneficiaries.length;
          const avgLng = validBeneficiaries.reduce((sum: number, b: Beneficiary) => sum + (b.longitude || 0), 0) / validBeneficiaries.length;
          const zoomLevel = level ?? getRegionLevelFromCode(code);
          setMapCenter([avgLat, avgLng]);
          setMapZoom(ZOOM_LEVELS[zoomLevel] ?? ZOOM_LEVELS[REGION_LEVELS.KABUPATEN]);
        }
      } else {
        setMapCenter(null);
        setMapZoom(undefined);
      }
    } catch (err) {
      setBeneficiariesError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setBeneficiaries([]);
    } finally {
      setLoadingBeneficiaries(false);
    }
  }, []);

  // Handle region filter change - STABLE FUNCTION
  const handleRegionChange = useCallback((selection: RegionSelection) => {
    setRegionSelection(selection);
  }, []);

  // Handle modal success - STABLE FUNCTION
  const handleModalSuccess = useCallback(() => {
    setShowModal(false);
    setSelectedBeneficiary(null);
  }, []);

  // Handle "Minta Akses" button click - STABLE FUNCTION
  const handleRequestAccess = useCallback((beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setShowModal(true);
    setModalKey((prev) => prev + 1);
  }, []);

  // Handle region select from map marker - NOW FETCHES BENEFICIARIES
  const handleRegionSelect = useCallback((region: { code: string; name: string }) => {
    fetchBeneficiariesForRegion(region.code, region.name);
  }, [fetchBeneficiariesForRegion]);

  // Handle close panel - STABLE FUNCTION
  const handleClosePanel = useCallback(() => {
    setSelectedRegion(null);
    setRegionSelection({});
  }, []);

  // ============================================================
  // FETCH BENEFICIARIES (only when regionCode changes)
  // ============================================================

  useEffect(() => {
    if (!regionCode) {
      setBeneficiaries([]);
      setBeneficiariesError(null);
      setSelectedRegion(null);
      setMapCenter(null);
      setMapZoom(undefined);
      return;
    }

    fetchBeneficiariesForRegion(regionCode, regionName, regionLevel);
  }, [regionCode, regionName, regionLevel, fetchBeneficiariesForRegion]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Cari Penerima Manfaat
        </h1>
        <p className="text-gray-600">
          Pilih wilayah di peta untuk melihat penerima manfaat dan ajukan permintaan akses.
        </p>
      </div>

      {/* Region Filter */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter Wilayah
        </label>
        <RegionFilter onRegionChange={handleRegionChange} />
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <MapView
          mapData={mapData.data}
          selectedRegion={selectedRegion}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          onRegionSelect={handleRegionSelect}
        />
      </div>

      {/* Beneficiaries Panel */}
      {selectedRegion && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Penerima di Wilayah: {selectedRegion.name}
              </h2>
              <p className="text-sm text-gray-600">
                {beneficiaries.length} penerima manfaat ditemukan
              </p>
            </div>
            <button
              onClick={handleClosePanel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Loading */}
          {loadingBeneficiaries && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600 mt-2">Memuat data...</p>
            </div>
          )}

          {/* Error */}
          {beneficiariesError && (
            <div className="bg-error/10 text-error px-4 py-3 rounded-lg text-center">
              {beneficiariesError}
            </div>
          )}

          {/* Empty */}
          {!loadingBeneficiaries && !beneficiariesError && beneficiaries.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-600">Tidak ada penerima manfaat di wilayah ini</p>
            </div>
          )}

          {/* Beneficiaries List */}
          {!loadingBeneficiaries && !beneficiariesError && beneficiaries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {beneficiaries.map((beneficiary) => (
                <div
                  key={beneficiary.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <h3 className="font-medium text-gray-900 mb-2">
                    {beneficiary.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Wilayah:</span>{" "}
                    {beneficiary.regionName || "-"}
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">Kebutuhan:</span> {beneficiary.needs}
                  </p>
                  <button
                    onClick={() => handleRequestAccess(beneficiary)}
                    className="w-full bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Minta Akses
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <RequestAccessModal
        key={modalKey}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        beneficiary={selectedBeneficiary}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
