"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MAP_CONFIG } from "@/lib/constants";

// Fix default marker icon - WAJIB untuk Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

interface Location {
  lat: number;
  lng: number;
}

// Region selection type (must match RegionFilter)
export interface RegionSelection {
  province?: { code: string; name: string };
  regency?: { code: string; name: string };
  district?: { code: string; name: string };
  village?: { code: string; name: string };
}

interface LocationPickerProps {
  value?: Location;
  onChange: (coords: Location) => void;
  height?: string;
  regionSelection?: RegionSelection;
  onGeocodingFailed?: (message: string) => void;
}

function MapClickHandler({
  onClick,
}: {
  onClick: (coords: Location) => void;
}) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Komponen untuk mengontrol map (zoom ke wilayah, dll)
function MapController({
  regionSelection,
  onRegionCenterFound,
  onRateLimit,
  onGeocodingChange,
  onGeocodingFailed,
}: {
  regionSelection: RegionSelection | undefined;
  onRegionCenterFound: (coords: Location) => void;
  onRateLimit: () => void;
  onGeocodingChange: (isGeocoding: boolean) => void;
  onGeocodingFailed?: (message: string) => void;
}) {
  const map = useMap();
  const [isGeocoding, setIsGeocoding] = useState(false);
  const lastGeocodedRef = useRef<string | null>(null);

  // Notify parent when geocoding state changes
  useEffect(() => {
    onGeocodingChange(isGeocoding);
  }, [isGeocoding, onGeocodingChange]);

  // Helper: Geocoding dengan fallback queries
  const geocodeWithFallback = async (
    queries: string[],
    cacheKey: string
  ): Promise<Location | null> => {
    // Cek localStorage cache dulu
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as Location;
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    // Coba setiap query
    for (const query of queries) {
      console.log('[MapController] Trying geocode:', query);

      const url = `/api/public/geocode?q=${encodeURIComponent(query)}`;
      const response = await fetch(url);

      if (response.status === 429) {
        console.warn('[MapController] Rate limited');
        onRateLimit();
        return null;
      }

      if (!response.ok) {
        console.warn('[MapController] Geocoding failed:', response.status);
        continue;
      }

      const result = await response.json();
      const geocodeData = Array.isArray(result) ? result : (result.data || []);

      if (geocodeData && geocodeData.length > 0) {
        const { lat, lon } = geocodeData[0];
        const coords = { lat: parseFloat(lat), lng: parseFloat(lon) };

        // Cache hasilnya
        localStorage.setItem(cacheKey, JSON.stringify(coords));
        return coords;
      }
    }

    return null;
  };

  useEffect(() => {
    // Tentukan level wilayah yang dipilih dan zoom level yang sesuai
    let targetRegion: { code: string; name: string } | undefined;
    let zoomLevel: number;
    let geocodeQueries: string[] = [];

    // Priority: Village > District > Regency > Province
    if (regionSelection?.village) {
      targetRegion = regionSelection.village;
      zoomLevel = 14;
      const v = regionSelection.village;
      geocodeQueries = [
        `${v.name}, ${regionSelection.district?.name}, ${regionSelection.regency?.name}, ${regionSelection.province?.name}, Indonesia`,
        `${v.name}, ${regionSelection.district?.name}, ${regionSelection.regency?.name}`,
        `${v.name}, ${regionSelection.district?.name}`,
        `${v.name}, ${regionSelection.regency?.name}`,
      ];
    } else if (regionSelection?.district) {
      targetRegion = regionSelection.district;
      zoomLevel = 11;
      const d = regionSelection.district;
      geocodeQueries = [
        `${d.name}, ${regionSelection.regency?.name}, ${regionSelection.province?.name}, Indonesia`,
        `${d.name}, ${regionSelection.regency?.name}`,
        `Kecamatan ${d.name}, ${regionSelection.regency?.name}`,
      ];
    } else if (regionSelection?.regency) {
      targetRegion = regionSelection.regency;
      zoomLevel = 10;
      const r = regionSelection.regency;
      geocodeQueries = [
        `${r.name}, ${regionSelection.province?.name}, Indonesia`,
        `${r.name}, ${regionSelection.province?.name}`,
        `Kabupaten ${r.name}, ${regionSelection.province?.name}`,
        `Kota ${r.name}, ${regionSelection.province?.name}`,
      ];
    } else if (regionSelection?.province) {
      targetRegion = regionSelection.province;
      zoomLevel = 8;
      const p = regionSelection.province;
      geocodeQueries = [
        `${p.name}, Indonesia`,
        `Provinsi ${p.name}, Indonesia`,
      ];
    } else {
      return; // Tidak ada wilayah yang dipilih
    }

    // Cegah geocoding ganda untuk wilayah yang sama
    const geocodeKey = `${targetRegion.code}_${zoomLevel}`;
    if (lastGeocodedRef.current === geocodeKey) {
      return;
    }

    const geocodeRegion = async () => {
      if (isGeocoding) return;

      lastGeocodedRef.current = geocodeKey;
      setIsGeocoding(true);

      try {
        const cacheKey = `geocode_${targetRegion!.code}_${zoomLevel}`;
        const coords = await geocodeWithFallback(geocodeQueries, cacheKey);

        if (coords) {
          console.log('[MapController] Flying to:', coords, 'zoom:', zoomLevel);
          map.flyTo([coords.lat, coords.lng], zoomLevel, {
            duration: 1.5,
          });
          onRegionCenterFound(coords);
        } else {
          const errorMsg = `Lokasi "${targetRegion!.name}" tidak ditemukan. Silakan pilih lokasi manual di peta.`;
          console.warn('[MapController]', errorMsg);
          onGeocodingFailed?.(errorMsg);
        }
      } catch (error) {
        console.error('[MapController] Geocoding error:', error);
        onGeocodingFailed?.('Gagal mencari lokasi. Silakan pilih lokasi manual di peta.');
      } finally {
        setIsGeocoding(false);
      }
    };

    geocodeRegion();
  }, [
    regionSelection?.province?.code,
    regionSelection?.province?.name,
    regionSelection?.regency?.code,
    regionSelection?.regency?.name,
    regionSelection?.district?.code,
    regionSelection?.district?.name,
    regionSelection?.village?.code,
    regionSelection?.village?.name,
    map,
    onRegionCenterFound,
    onRateLimit,
  ]);

  return null;
}

export default function LocationPicker({
  value,
  onChange,
  height = "300px",
  regionSelection,
  onGeocodingFailed,
}: LocationPickerProps) {
  const [markerPosition, setMarkerPosition] = useState<Location | undefined>(
    value
  );
  const [mapCenter, setMapCenter] = useState<Location | undefined>(undefined);
  const [rateLimited, setRateLimited] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    setMarkerPosition(value);
    // Update manual input fields when value changes externally
    if (value) {
      setManualLat(value.lat.toString());
      setManualLng(value.lng.toString());
    }
  }, [value]);

  // Update map center ketika region ditemukan via geocoding
  const handleRegionCenterFound = useCallback((coords: Location) => {
    setMapCenter(coords);
    setRateLimited(false); // Reset rate limit on success
    setGeocodingError(null); // Reset error on success
  }, []);

  // Handle rate limit
  const handleRateLimit = useCallback(() => {
    setRateLimited(true);
    // Auto-reset after 5 seconds
    setTimeout(() => setRateLimited(false), 5000);
  }, []);

  // Handle geocoding failed
  const handleGeocodingFailedInternal = useCallback((message: string) => {
    setGeocodingError(message);
    onGeocodingFailed?.(message);
  }, [onGeocodingFailed]);

  // Handle geocoding state change
  const handleGeocodingChange = useCallback((geocoding: boolean) => {
    setIsGeocoding(geocoding);
  }, []);

  const handleClick = (coords: Location) => {
    setMarkerPosition(coords);
    setManualLat(coords.lat.toString());
    setManualLng(coords.lng.toString());
    onChange(coords);
  };

  // Handle manual coordinate input
  const handleManualCoordinate = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      setGeocodingError("Koordinat tidak valid. Masukkan angka yang benar.");
      return;
    }

    if (lat < -90 || lat > 90) {
      setGeocodingError("Latitude harus antara -90 dan 90.");
      return;
    }

    if (lng < -180 || lng > 180) {
      setGeocodingError("Longitude harus antara -180 dan 180.");
      return;
    }

    const coords = { lat, lng };
    setMarkerPosition(coords);
    setGeocodingError(null);
    onChange(coords);

    // Zoom map to the coordinates
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 16, {
        duration: 1.5,
      });
    }
  };

  // Handle Enter key in coordinate inputs
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualCoordinate();
    }
  };

  // Clear manual coordinates
  const handleClearCoordinates = () => {
    setManualLat("");
    setManualLng("");
    setMarkerPosition(undefined);
    setGeocodingError(null);
    onChange(undefined as any);
  };

  // Gunakan marker position jika ada, otherwise gunakan map center dari geocoding, atau default
  const center: [number, number] = markerPosition
    ? [markerPosition.lat, markerPosition.lng]
    : mapCenter
    ? [mapCenter.lat, mapCenter.lng]
    : [MAP_CONFIG.DEFAULT_CENTER.lat, MAP_CONFIG.DEFAULT_CENTER.lng];

  return (
    <div className="space-y-3">
      {/* Manual Coordinate Input */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label htmlFor="manual-lat" className="block text-xs font-medium text-gray-600 mb-1">
            Latitude
          </label>
          <input
            id="manual-lat"
            type="number"
            step="any"
            value={manualLat}
            onChange={(e) => setManualLat(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="-6.2088"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="manual-lng" className="block text-xs font-medium text-gray-600 mb-1">
            Longitude
          </label>
          <input
            id="manual-lng"
            type="number"
            step="any"
            value={manualLng}
            onChange={(e) => setManualLng(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="106.8456"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex items-end gap-1 pb-0.5">
          <button
            type="button"
            onClick={handleManualCoordinate}
            disabled={!manualLat || !manualLng}
            className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Cari lokasi dari koordinat"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          {markerPosition && (
            <button
              type="button"
              onClick={handleClearCoordinates}
              className="px-3 py-2 bg-error text-white rounded-lg text-sm font-medium hover:bg-error-dark transition-colors"
              title="Hapus koordinat"
            >
              <svg
                className="w-4 h-4"
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
          )}
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={markerPosition ? 15 : mapCenter ? 14 : MAP_CONFIG.DEFAULT_ZOOM}
        className="w-full rounded-lg border border-gray-200"
        style={{ height }}
        ref={(mapInstance) => {
          if (mapInstance && !mapRef.current) {
            mapRef.current = mapInstance;
          }
        }}
      >
        <MapController
          regionSelection={regionSelection}
          onRegionCenterFound={handleRegionCenterFound}
          onRateLimit={handleRateLimit}
          onGeocodingChange={handleGeocodingChange}
          onGeocodingFailed={handleGeocodingFailedInternal}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markerPosition && (
          <Marker position={[markerPosition.lat, markerPosition.lng]} />
        )}
        <MapClickHandler onClick={handleClick} />
      </MapContainer>

      {/* Geocoding loading indicator */}
      {isGeocoding && (
        <div className="bg-info/10 text-info px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <svg
            className="w-4 h-4 flex-shrink-0 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Mencari lokasi wilayah...</span>
        </div>
      )}

      {/* Rate limit warning */}
      {rateLimited && (
        <div className="bg-warning/10 text-warning px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>
            Terlalu banyak permintaan. Silakan tunggu beberapa detik atau pilih lokasi
            manual di peta.
          </span>
        </div>
      )}

      {/* Geocoding failed warning */}
      {geocodingError && !rateLimited && !isGeocoding && (
        <div className="bg-error/10 text-error px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{geocodingError}</span>
        </div>
      )}

      {regionSelection?.village && !rateLimited && !isGeocoding && !geocodingError && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>
            Map menampilkan: {regionSelection.village.name}, {regionSelection.district?.name}, {regionSelection.regency?.name}
          </span>
        </div>
      )}

      {regionSelection?.district && !regionSelection?.village && !rateLimited && !isGeocoding && !geocodingError && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>
            Map menampilkan: Kecamatan {regionSelection.district.name}, {regionSelection.regency?.name}
          </span>
        </div>
      )}

      {regionSelection?.regency && !regionSelection?.district && !rateLimited && !isGeocoding && !geocodingError && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>
            Map menampilkan: {regionSelection.regency.name}, {regionSelection.province?.name}
          </span>
        </div>
      )}

      {regionSelection?.province && !regionSelection?.regency && !rateLimited && !isGeocoding && !geocodingError && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>
            Map menampilkan: Provinsi {regionSelection.province.name}
          </span>
        </div>
      )}

      {markerPosition && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Koordinat terpilih:</span>{" "}
          {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
        </div>
      )}

      {!markerPosition && !mapCenter && (
        <div className="text-sm text-gray-500">
          Masukkan koordinat manual di atas, atau pilih wilayah lalu klik pada peta
        </div>
      )}

      {mapCenter && !markerPosition && (
        <div className="text-sm text-gray-500">
          Peta menampilkan area wilayah yang dipilih. Masukkan koordinat, klik pada peta,
          atau zoom untuk menentukan lokasi tepat.
        </div>
      )}
    </div>
  );
}
