"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Fix default marker icon - WAJIB untuk Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

interface RegionData {
  regionCode: string;
  regionName: string | null;
  count: number;
  centerLat: number;
  centerLng: number;
}

interface MapViewProps {
  mapData: RegionData[];
  selectedRegion: { code: string; name: string } | null;
  mapCenter: [number, number] | null;
  mapZoom: number | undefined;
  onRegionSelect: (region: { code: string; name: string }) => void;
}

// ============================================================
// MAP FLY TO COMPONENT
// ============================================================

interface MapFlyToProps {
  center: [number, number];
  zoom?: number;
}

function MapFlyTo({ center, zoom }: MapFlyToProps) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 12, { duration: 1.5 });
    }
  }, [center, map, zoom]);

  return null;
}

// ============================================================
// MAIN MAP VIEW COMPONENT
// ============================================================

export default function CariTargetMapView({
  mapData,
  selectedRegion,
  mapCenter,
  mapZoom,
  onRegionSelect,
}: MapViewProps) {
  return (
    <div className="h-[500px] w-full">
      <MapContainer
        center={[-2.5489, 118.0149]}
        zoom={5}
        minZoom={3}
        maxZoom={18}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Map Fly To Component */}
        {mapCenter && <MapFlyTo center={mapCenter} zoom={mapZoom} />}

        {mapData.map((region) => (
          <Marker
            key={region.regionCode}
            position={[region.centerLat, region.centerLng]}
          >
            <Popup>
              <div className="p-1 min-w-[200px]">
                <strong className="block text-gray-900 mb-1">
                  {region.regionName || "Unknown Region"}
                </strong>
                <p className="text-sm text-gray-600 mb-3">
                  {region.count} keluarga terdata
                </p>
                <button
                  onClick={() =>
                    onRegionSelect({
                      code: region.regionCode,
                      name: region.regionName || "Unknown Region",
                    })
                  }
                  className="w-full bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Lihat Data Penerima
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
