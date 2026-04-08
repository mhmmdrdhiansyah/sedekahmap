"use client";

import { useState, useEffect } from "react";

interface HeatmapState {
  data: [number, number, number][];
  loading: boolean;
  error: string | null;
}

export function useHeatmapData() {
  const [state, setState] = useState<HeatmapState>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetch("/api/public/heatmap-data")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data heatmap");
        return res.json();
      })
      .then((json) => {
        setState({ data: json.data, loading: false, error: null });
      })
      .catch((err) => {
        setState({ data: [], loading: false, error: err.message });
      });
  }, []);

  return state;
}
