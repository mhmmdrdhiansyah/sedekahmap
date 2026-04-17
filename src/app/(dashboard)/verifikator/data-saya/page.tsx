"use client";

import { useEffect, useState } from "react";
import { API_ROUTES, STATUS } from "@/lib/constants";

interface Beneficiary {
  id: string;
  name: string;
  regionCode: string;
  regionName: string | null;
  status: string;
  createdAt: string;
}

interface ApiResponse {
  data: Beneficiary[];
  error?: string;
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    verified: "bg-green-100 text-green-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-blue-100 text-blue-700",
    expired: "bg-red-100 text-red-700",
  };

  const labels: Record<string, string> = {
    verified: "Terverifikasi",
    in_progress: "Dalam Proses",
    completed: "Selesai",
    expired: "Kadaluarsa",
  };

  const style = styles[status] ?? "bg-gray-100 text-gray-700";
  const label = labels[status] ?? status;

  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}

// Empty Icon
function EmptyIcon() {
  return (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

// Trash Icon
function TrashIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

// Refresh Icon
function RefreshIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

export default function VerifikatorDataSayaPage() {
  const [data, setData] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ROUTES.VERIFIKATOR_BENEFICIARIES);
      const json: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Gagal memuat data");
      }

      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    setDeleteLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_ROUTES.VERIFIKATOR_BENEFICIARIES}/${id}`, {
        method: "DELETE",
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Gagal menghapus data");
      }

      // Remove from local state
      setData((prev) => prev.filter((item) => item.id !== id));
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setDeleteLoading(false);
      setDeleteId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Saya</h1>
          <p className="text-gray-500 mt-1">
            Daftar data penerima manfaat yang telah Anda input.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshIcon />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-error/10 text-error px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-gray-500 mt-4">Memuat data...</p>
        </div>
      ) : data.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <EmptyIcon />
          </div>
          <p className="text-gray-500 mb-2">Anda belum memiliki data.</p>
          <a
            href="/verifikator/input"
            className="text-primary hover:underline font-medium"
          >
            Mulai input data pertama
          </a>
        </div>
      ) : (
        /* Data Table - Desktop */
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wilayah
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal Input
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.regionName || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteLoading && deleteId === item.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <TrashIcon />
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {data.map((item) => (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.regionName || "-"}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{formatDate(item.createdAt)}</p>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deleteLoading && deleteId === item.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <TrashIcon />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
