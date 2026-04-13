"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
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
  regionName: string | null;
  regionPath: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface RegionSelection {
  province?: { code: string; name: string };
  regency?: { code: string; name: string };
  district?: { code: string; name: string };
  village?: { code: string; name: string };
}

export default function VerifikatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<Beneficiary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_ROUTES.VERIFIKATOR_BENEFICIARIES}/${id}`);

        if (!response.ok) {
          const json = await response.json();
          throw new Error(json.error || "Gagal memuat data");
        }

        const json = await response.json();
        setData(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      return;
    }

    try {
      const response = await fetch(`${API_ROUTES.VERIFIKATOR_BENEFICIARIES}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "Gagal menghapus data");
      }

      router.push("/verifikator/data-saya");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-gray-500 mt-4">Memuat data...</p>
      </div>
    );
  }

  if (error) {
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

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <p className="text-gray-500">Data tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/verifikator/data-saya")}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Detail Penerima Manfaat</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/verifikator/edit/${id}`)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-error text-white rounded-lg font-medium hover:bg-error/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Hapus
          </button>
        </div>
      </div>

      {/* Detail Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Pribadi</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Nama Lengkap</label>
                <p className="text-gray-900 font-medium">{data.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">NIK</label>
                <p className="text-gray-900 font-medium font-mono">{data.nik}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Alamat</label>
                <p className="text-gray-900">{data.address}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Kebutuhan</label>
                <p className="text-gray-900">{data.needs}</p>
              </div>
            </div>
          </div>

          {/* Location Info */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lokasi</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Wilayah</label>
                <p className="text-gray-900">{data.regionName || "-"}</p>
              </div>
              {data.regionPath && (
                <div>
                  <label className="text-sm text-gray-500">Path Wilayah</label>
                  <p className="text-gray-900 text-sm">{data.regionPath}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-500">Koordinat</label>
                <p className="text-gray-900 font-mono">
                  {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Peta Lokasi</h2>
            <LocationPicker
              value={{ lat: data.latitude, lng: data.longitude }}
              onChange={() => {}}
              height="300px"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {data.status === "verified" && "Terverifikasi"}
                  {data.status === "in_progress" && "Dalam Proses"}
                  {data.status === "completed" && "Selesai"}
                  {data.status === "expired" && "Kadaluarsa"}
                </span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Waktu</h2>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-gray-500">Dibuat</label>
                <p className="text-gray-900">{formatDate(data.createdAt)}</p>
              </div>
              {data.updatedAt !== data.createdAt && (
                <div>
                  <label className="text-gray-500">Diperbarui</label>
                  <p className="text-gray-900">{formatDate(data.updatedAt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
