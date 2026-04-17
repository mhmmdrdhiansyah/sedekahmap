"use client";

import { useState, useEffect } from "react";

interface PublicStats {
  totalFamilies: number;
  totalVillages: number;
  totalDistributions: number;
}

interface StatsState {
  data: PublicStats | null;
  loading: boolean;
  error: string | null;
}

export function useStats() {
  const [state, setState] = useState<StatsState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetch("/api/public/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat statistik");
        return res.json();
      })
      .then((json) => {
        setState({ data: json.data, loading: false, error: null });
      })
      .catch((err) => {
        setState({ data: null, loading: false, error: err.message });
      });
  }, []);

  return state;
}
