"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import HeatmapLayer from "./HeatmapLayer";
import { useHeatmapData } from "@/hooks/useHeatmapData";
import { useMapData } from "@/hooks/useMapData";
import { MAP_CONFIG, REGION_LEVELS } from "@/lib/constants";

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

interface MapControllerProps {
  regionCode: string | null;
  regionLevel: number | null;
}

function MapController({ regionCode, regionLevel }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!regionCode || !regionLevel) return;

    const zoomToRegion = async () => {
      try {
        // Fetch map data to find the region center
        const response = await fetch("/api/public/map-data");
        const json = await response.json();
        const region = json.data.find((r: any) => r.regionCode === regionCode);

        if (region) {
          map.flyTo([region.centerLat, region.centerLng], ZOOM_LEVELS[regionLevel] || 10, {
            duration: 1.5,
          });
        }
      } catch (error) {
        console.error("Failed to zoom to region:", error);
      }
    };

    zoomToRegion();
  }, [regionCode, regionLevel, map]);

  return null;
}

interface InteractiveMapProps {
  onMapReady?: (map: L.Map) => void;
}

export default function InteractiveMap({ onMapReady }: InteractiveMapProps) {
  const heatmap = useHeatmapData();
  const mapData = useMapData();
  const mapRef = useRef<L.Map | null>(null);

  // Store map reference for external access
  const handleMapReady = (map: L.Map) => {
    mapRef.current = map;
    onMapReady?.(map);
  };

  // Get the most specific region selected (from window.sedekahRegion)
  const [regionCode, regionLevel] = (() => {
    const region = (window as any).sedekahRegion;
    if (!region) return [null, null];

    if (region.village) return [region.village.code, REGION_LEVELS.DESA];
    if (region.district) return [region.district.code, REGION_LEVELS.KECAMATAN];
    if (region.regency) return [region.regency.code, REGION_LEVELS.KABUPATEN];
    if (region.province) return [region.province.code, REGION_LEVELS.PROVINSI];

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
      <MapController regionCode={regionCode} regionLevel={regionLevel} />
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
              <strong>{region.regionName}</strong>
              <br />
              {region.count} keluarga terdata
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
