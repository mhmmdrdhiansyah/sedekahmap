"use client";

import { useState, useEffect } from "react";
import type { RegionSummary } from "@/services/beneficiary.service";

interface MapDataState {
  data: RegionSummary[];
  loading: boolean;
  error: string | null;
}

export function useMapData() {
  const [state, setState] = useState<MapDataState>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetch("/api/public/map-data")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat data peta");
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
