"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import HeatmapLayer from "./HeatmapLayer";
import { useHeatmapData } from "@/hooks/useHeatmapData";
import { useMapData } from "@/hooks/useMapData";
import { MAP_CONFIG } from "@/lib/constants";

// Fix default marker icon - WAJIB untuk Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

export default function PublicMap() {
  const heatmap = useHeatmapData();
  const mapData = useMapData();

  return (
    <MapContainer
      center={[MAP_CONFIG.DEFAULT_CENTER.lat, MAP_CONFIG.DEFAULT_CENTER.lng]}
      zoom={MAP_CONFIG.DEFAULT_ZOOM}
      minZoom={MAP_CONFIG.MIN_ZOOM}
      maxZoom={MAP_CONFIG.MAX_ZOOM}
      className="h-[600px] w-full rounded-lg"
    >
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
