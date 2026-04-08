"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

interface HeatmapLayerProps {
  points: [number, number, number][];
  options?: L.HeatMapOptions;
}

export default function HeatmapLayer({ points, options }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    const defaultOptions: L.HeatMapOptions = {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: {
        0.2: "#10b981",   // primary-light (green)
        0.4: "#047857",   // primary (emerald)
        0.6: "#d97706",   // accent (gold)
        0.8: "#f59e0b",   // accent-light (amber)
        1.0: "#ef4444",   // error (red for high density)
      },
    };

    const heat = (L as any).heatLayer(points, { ...defaultOptions, ...options });
    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points, options]);

  return null;
}
