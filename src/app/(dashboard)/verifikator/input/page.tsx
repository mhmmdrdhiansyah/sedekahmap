"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import RegionFilter, { RegionSelection } from "@/components/filters/RegionFilter";
import { API_ROUTES } from "@/lib/constants";

// Dynamic import LocationPicker untuk SSR disable
const LocationPicker = dynamic(
  () => import("@/components/map/LocationPicker"),
  { ssr: false }
);

export default function VerifikatorInputPage() {
  // Form states
  const [name, setName] = useState("");
  const [nik, setNik] = useState("");
  const [address, setAddress] = useState("");
  const [needs, setNeeds] = useState("");
  const [region, setRegion] = useState<RegionSelection>({});
  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>();

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setName("");
    setNik("");
    setAddress("");
    setNeeds("");
    setRegion({});
    setLocation(undefined);
    setError(null);
    setSuccess(false);
  };

  const validateForm = (): string | null => {
    if (!name.trim()) return "Nama wajib diisi";
    if (!nik.trim()) return "NIK wajib diisi";
    if (!/^\d{16}$/.test(nik.trim())) return "NIK harus 16 digit angka";
    if (!address.trim()) return "Alamat wajib diisi";
    if (!needs.trim()) return "Kebutuhan wajib diisi";
    if (!region.village) return "Wilayah (Kelurahan/Desa) wajib dipilih";
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
    setSuccess(false);

    try {
      const response = await fetch(API_ROUTES.VERIFIKATOR_BENEFICIARIES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          nik: nik.trim(),
          address: address.trim(),
          needs: needs.trim(),
          latitude: location!.lat,
          longitude: location!.lng,
          regionCode: region.village!.code,
          regionName: region.village!.name,
          // Build regionPath from selected regions
          regionPath: [
            region.province?.name,
            region.regency?.name,
            region.district?.name,
            region.village?.name,
          ]
            .filter(Boolean)
            .join(" > "),
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Gagal menyimpan data");
      }

      setSuccess(true);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Input Data Baru</h1>
        <p className="text-gray-500 mt-1">
          Tambahkan data penerima manfaat baru ke sistem.
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-success/10 text-success px-4 py-3 rounded-lg flex items-center justify-between">
          <span>Data berhasil disimpan!</span>
          <button
            onClick={() => setSuccess(false)}
            className="text-success hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

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
              Wilayah <span className="text-error">*</span>
            </label>
            <RegionFilter onRegionChange={setRegion} />
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
              Pilih wilayah terlebih dahulu, peta akan otomatis menampilkan area desa. Klik untuk menentukan lokasi penerima manfaat.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Menyimpan..." : "Simpan Data"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={loading}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
