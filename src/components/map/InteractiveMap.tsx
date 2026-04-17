"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import HeatmapLayer from "./HeatmapLayer";
import { useHeatmapData } from "@/hooks/useHeatmapData";
import { useMapData } from "@/hooks/useMapData";
import { MAP_CONFIG, REGION_LEVELS } from "@/lib/constants";
import { RegionSelection } from "@/components/filters/RegionFilter";

// Fix default marker icon - WAJIB untuk Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

// Zoom levels by region type
const ZOOM_LEVELS: Record<number, number> = {
  [REGION_LEVELS.PROVINSI]: 8,
  [REGION_LEVELS.KABUPATEN]: 10,
  [REGION_LEVELS.KECAMATAN]: 12,
  [REGION_LEVELS.DESA]: 14,
};

// Helper: Determine region level from code format
// Level 1 (Prov): "31" (2 digits)
// Level 2 (Kab): "31.74" (5 chars)
// Level 3 (Kec): "31.74.09" (8 chars)
// Level 4 (Des): "31.74.09.1001" (14+ chars)
function getRegionLevelFromCode(code: string): number {
  const dots = code.split('.').length;
  if (dots === 1) return 1; // Provinsi
  if (dots === 2) return 2; // Kabupaten
  if (dots === 3) return 3; // Kecamatan
  return 4; // Desa
}

// Region summary type from map data API
interface MapRegionSummary {
  regionCode: string;
  regionName: string | null;
  count: number;
  centerLat: number;
  centerLng: number;
}

interface MapControllerProps {
  regionCode: string | null;
  regionLevel: number | null;
  mapData: MapRegionSummary[];
}

function MapController({ regionCode, regionLevel, mapData }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!regionCode || !regionLevel) return;

    if (regionLevel === REGION_LEVELS.DESA) {
      // For desa level, find exact match
      const region = mapData.find((r) => r.regionCode === regionCode);
      if (region) {
        map.flyTo([region.centerLat, region.centerLng], ZOOM_LEVELS[regionLevel] || 10, {
          duration: 1.5,
        });
      }
    } else {
      // For parent levels, filter children and calculate average center
      const children = mapData.filter((r) => r.regionCode.startsWith(regionCode));
      if (children.length > 0) {
        const avgLat = children.reduce((sum, r) => sum + r.centerLat, 0) / children.length;
        const avgLng = children.reduce((sum, r) => sum + r.centerLng, 0) / children.length;
        map.flyTo([avgLat, avgLng], ZOOM_LEVELS[regionLevel] || 10, {
          duration: 1.5,
        });
      }
    }
  }, [regionCode, regionLevel, map, mapData]);

  return null;
}

interface InteractiveMapProps {
  onMapReady?: (map: L.Map) => void;
  regionSelection?: RegionSelection;
}

export default function InteractiveMap({ onMapReady, regionSelection }: InteractiveMapProps) {
  const heatmap = useHeatmapData();
  const mapData = useMapData();
  const mapRef = useRef<L.Map | null>(null);

  // Store map reference for external access
  const handleMapReady = (map: L.Map) => {
    mapRef.current = map;
    onMapReady?.(map);
  };

  // Get the most specific region selected from prop
  const [regionCode, regionLevel] = (() => {
    if (!regionSelection) return [null, null];

    if (regionSelection.village) return [regionSelection.village.code, REGION_LEVELS.DESA];
    if (regionSelection.district) return [regionSelection.district.code, REGION_LEVELS.KECAMATAN];
    if (regionSelection.regency) return [regionSelection.regency.code, REGION_LEVELS.KABUPATEN];
    if (regionSelection.province) return [regionSelection.province.code, REGION_LEVELS.PROVINSI];

    return [null, null];
  })();

  return (
    <MapContainer
      ref={handleMapReady}
      center={[MAP_CONFIG.DEFAULT_CENTER.lat, MAP_CONFIG.DEFAULT_CENTER.lng]}
      zoom={MAP_CONFIG.DEFAULT_ZOOM}
      minZoom={MAP_CONFIG.MIN_ZOOM}
      maxZoom={MAP_CONFIG.MAX_ZOOM}
      className="h-full w-full"
    >
      <MapController regionCode={regionCode} regionLevel={regionLevel} mapData={mapData.data} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {!heatmap.loading && heatmap.data.length > 0 && (
        <HeatmapLayer points={heatmap.data} />
      )}
      {mapData.data.map((region) => (
        <Marker
          key={region.regionCode}
          position={[region.centerLat, region.centerLng]}
        >
          <Popup>
            <div>
              <strong>{region.regionName || 'Unknown Region'}</strong>
              <br />
              {region.count} keluarga terdata
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
