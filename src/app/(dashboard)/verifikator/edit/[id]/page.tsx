"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import RegionFilter, { RegionSelection } from "@/components/filters/RegionFilter";
import { API_ROUTES } from "@/lib/constants";

// Dynamic import LocationPicker
const LocationPicker = dynamic(
  () => import("@/components/map/LocationPicker"),
  { ssr: false }
);

interface Beneficiary {
  id: string;
  name: string;
  nik: string;
  address: string;
  needs: string;
  latitude: number;
  longitude: number;
  regionCode: string;
  regionName: string | null;
  regionPath: string | null;
}

export default function VerifikatorEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Form states
  const [name, setName] = useState("");
  const [nik, setNik] = useState("");
  const [address, setAddress] = useState("");
  const [needs, setNeeds] = useState("");
  const [region, setRegion] = useState<RegionSelection>({});
  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>();

  // UI states
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing data
  useEffect(() => {
    const fetchData = async () => {
      setFetchLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_ROUTES.VERIFIKATOR_BENEFICIARIES}/${id}`);

        if (!response.ok) {
          const json = await response.json();
          throw new Error(json.error || "Gagal memuat data");
        }

        const json = await response.json();
        const data = json.data;

        setName(data.name);
        setNik(data.nik);
        setAddress(data.address);
        setNeeds(data.needs);
        setLocation({ lat: data.latitude, lng: data.longitude });

        // Parse regionPath if available
        if (data.regionPath) {
          const parts = data.regionPath.split(" > ");
          if (parts.length >= 1) region.province = { name: parts[0], code: "" };
          if (parts.length >= 2) region.regency = { name: parts[1], code: "" };
          if (parts.length >= 3) region.district = { name: parts[2], code: "" };
          if (parts.length >= 4) region.village = { name: parts[3], code: data.regionCode };
          setRegion({ ...region });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setFetchLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const validateForm = (): string | null => {
    if (!name.trim()) return "Nama wajib diisi";
    if (!nik.trim()) return "NIK wajib diisi";
    if (!/^\d{16}$/.test(nik.trim())) return "NIK harus 16 digit angka";
    if (!address.trim()) return "Alamat wajib diisi";
    if (!needs.trim()) return "Kebutuhan wajib diisi";
    if (!location) return "Lokasi wajib dipilih dari peta";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_ROUTES.VERIFIKATOR_BENEFICIARIES}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          nik: nik.trim(),
          address: address.trim(),
          needs: needs.trim(),
          latitude: location!.lat,
          longitude: location!.lng,
          // Only include region fields if available
          ...(region.village?.code && {
            regionCode: region.village.code,
            regionName: region.village.name,
          }),
          ...(region.province && {
            regionPath: [
              region.province?.name,
              region.regency?.name,
              region.district?.name,
              region.village?.name,
            ]
              .filter(Boolean)
              .join(" > "),
          }),
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Gagal mengupdate data");
      }

      router.push(`/verifikator/data-saya/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-gray-500 mt-4">Memuat data...</p>
      </div>
    );
  }

  if (error && !name) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center text-error">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-error mb-4">{error}</p>
        <button
          onClick={() => router.push("/verifikator/data-saya")}
          className="text-primary hover:underline font-medium"
        >
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push(`/verifikator/data-saya/${id}`)}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Detail
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Data Penerima Manfaat</h1>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-error/10 text-error px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nama */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap <span className="text-error">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Masukkan nama lengkap"
            />
          </div>

          {/* NIK */}
          <div>
            <label htmlFor="nik" className="block text-sm font-medium text-gray-700 mb-1">
              NIK (Nomor Induk Kependudukan) <span className="text-error">*</span>
            </label>
            <input
              type="text"
              id="nik"
              value={nik}
              onChange={(e) => setNik(e.target.value.replace(/\D/g, "").slice(0, 16))}
              disabled={loading}
              maxLength={16}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="16 digit NIK"
            />
            <p className="text-xs text-gray-500 mt-1">
              Masukkan 16 digit angka NIK
            </p>
          </div>

          {/* Alamat */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Alamat Lengkap <span className="text-error">*</span>
            </label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              placeholder="Jalan, RT/RW, detail alamat"
            />
          </div>

          {/* Kebutuhan */}
          <div>
            <label htmlFor="needs" className="block text-sm font-medium text-gray-700 mb-1">
              Kebutuhan <span className="text-error">*</span>
            </label>
            <textarea
              id="needs"
              value={needs}
              onChange={(e) => setNeeds(e.target.value)}
              disabled={loading}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              placeholder="Contoh: Sembako, obat-obatan, bantuan pendidikan, dll"
            />
          </div>

          {/* Wilayah */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wilayah (Opsional)
            </label>
            <RegionFilter onRegionChange={setRegion} initialRegion={region} />
            <p className="text-xs text-gray-500 mt-1">
              Pilih ulang wilayah jika ingin mengubah
            </p>
          </div>

          {/* Lokasi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lokasi di Peta <span className="text-error">*</span>
            </label>
            <LocationPicker
              value={location}
              onChange={setLocation}
              height="350px"
              regionSelection={region}
            />
            <p className="text-xs text-gray-500 mt-1">
              Klik pada peta untuk mengubah lokasi penerima manfaat.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/verifikator/data-saya/${id}`)}
              disabled={loading}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
