"use client";

import { useState, useEffect } from "react";
import { API_ROUTES, REGION_LEVELS } from "@/lib/constants";

export interface Region {
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
}

export interface RegionSelection {
  province?: { code: string; name: string };
  regency?: { code: string; name: string };
  district?: { code: string; name: string };
  village?: { code: string; name: string };
}

interface RegionFilterProps {
  onRegionChange?: (region: RegionSelection) => void;
}

export default function RegionFilter({ onRegionChange }: RegionFilterProps) {
  // Data states
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [regencies, setRegencies] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [villages, setVillages] = useState<Region[]>([]);

  // Selection states
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedRegency, setSelectedRegency] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedVillage, setSelectedVillage] = useState<string>("");

  // Loading/error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch provinces on mount
  useEffect(() => {
    fetchProvinces();
  }, []);

  // Fetch regencies when province changes
  useEffect(() => {
    if (selectedProvince) {
      fetchWilayahData("regencies", selectedProvince, setRegencies, REGION_LEVELS.KABUPATEN);
    } else {
      setRegencies([]);
    }
    setSelectedRegency("");
    setDistricts([]);
    setSelectedDistrict("");
    setVillages([]);
    setSelectedVillage("");
  }, [selectedProvince]);

  // Fetch districts when regency changes
  useEffect(() => {
    if (selectedRegency) {
      fetchWilayahData("districts", selectedRegency, setDistricts, REGION_LEVELS.KECAMATAN);
    } else {
      setDistricts([]);
    }
    setSelectedDistrict("");
    setVillages([]);
    setSelectedVillage("");
  }, [selectedRegency]);

  // Fetch villages when district changes
  useEffect(() => {
    if (selectedDistrict) {
      fetchWilayahData("villages", selectedDistrict, setVillages, REGION_LEVELS.DESA);
    } else {
      setVillages([]);
    }
    setSelectedVillage("");
  }, [selectedDistrict]);

  // Notify parent on any change
  useEffect(() => {
    const selection: RegionSelection = {};

    if (selectedProvince) {
      const province = provinces.find((p) => p.code === selectedProvince);
      if (province) selection.province = { code: province.code, name: province.name };
    }
    if (selectedRegency) {
      const regency = regencies.find((r) => r.code === selectedRegency);
      if (regency) selection.regency = { code: regency.code, name: regency.name };
    }
    if (selectedDistrict) {
      const district = districts.find((d) => d.code === selectedDistrict);
      if (district) selection.district = { code: district.code, name: district.name };
    }
    if (selectedVillage) {
      const village = villages.find((v) => v.code === selectedVillage);
      if (village) selection.village = { code: village.code, name: village.name };
    }

    onRegionChange?.(selection);
  }, [selectedProvince, selectedRegency, selectedDistrict, selectedVillage, provinces, regencies, districts, villages, onRegionChange]);

  const fetchProvinces = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_ROUTES.PUBLIC_REGIONS}?type=provinces`);
      if (!response.ok) throw new Error("Gagal memuat data provinsi");
      const json = await response.json();

      // Check for error response from proxy
      if (json.error) {
        throw new Error(json.error);
      }

      // Validate data is an array
      if (!Array.isArray(json.data)) {
        throw new Error("Format data tidak valid dari server");
      }

      // Transform wilayah.id response to our Region format
      const data: Region[] = json.data.map((item: any) => ({
        code: item.code,
        name: item.name,
        level: REGION_LEVELS.PROVINSI,
        parentCode: null,
      }));

      setProvinces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const fetchWilayahData = async (
    type: "regencies" | "districts" | "villages",
    parentCode: string,
    setter: (regions: Region[]) => void,
    level: number
  ) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_ROUTES.PUBLIC_REGIONS}?type=${type}&parentCode=${parentCode}`);
      if (!response.ok) throw new Error(`Gagal memuat data ${type}`);
      const json = await response.json();

      // Check for error response from proxy
      if (json.error) {
        throw new Error(json.error);
      }

      // Validate data is an array
      if (!Array.isArray(json.data)) {
        throw new Error("Format data tidak valid dari server");
      }

      // Transform wilayah.id response to our Region format
      const data: Region[] = json.data.map((item: any) => ({
        code: item.code,
        name: item.name,
        level,
        parentCode,
      }));

      setter(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-error/10 text-error px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Province Dropdown */}
      <div>
        <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
          Provinsi
        </label>
        <select
          id="province"
          value={selectedProvince}
          onChange={(e) => setSelectedProvince(e.target.value)}
          disabled={loading}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Pilih Provinsi</option>
          {provinces.map((province) => (
            <option key={province.code} value={province.code}>
              {province.name}
            </option>
          ))}
        </select>
      </div>

      {/* Regency Dropdown */}
      <div>
        <label htmlFor="regency" className="block text-sm font-medium text-gray-700 mb-1">
          Kabupaten/Kota
        </label>
        <select
          id="regency"
          value={selectedRegency}
          onChange={(e) => setSelectedRegency(e.target.value)}
          disabled={!selectedProvince || loading}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Pilih Kabupaten/Kota</option>
          {regencies.map((regency) => (
            <option key={regency.code} value={regency.code}>
              {regency.name}
            </option>
          ))}
        </select>
      </div>

      {/* District Dropdown */}
      <div>
        <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
          Kecamatan
        </label>
        <select
          id="district"
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          disabled={!selectedRegency || loading}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Pilih Kecamatan</option>
          {districts.map((district) => (
            <option key={district.code} value={district.code}>
              {district.name}
            </option>
          ))}
        </select>
      </div>

      {/* Village Dropdown */}
      <div>
        <label htmlFor="village" className="block text-sm font-medium text-gray-700 mb-1">
          Kelurahan/Desa
        </label>
        <select
          id="village"
          value={selectedVillage}
          onChange={(e) => setSelectedVillage(e.target.value)}
          disabled={!selectedDistrict || loading}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Pilih Kelurahan/Desa</option>
          {villages.map((village) => (
            <option key={village.code} value={village.code}>
              {village.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
