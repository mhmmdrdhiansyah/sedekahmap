"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Beneficiary {
  id: string;
  name: string;
  needs: string;
  regionName: string | null;
}

interface Distribution {
  id: string;
  distributionCode: string;
  status: string;
  proofPhotoUrl: string | null;
  notes: string | null;
  createdAt: Date;
  beneficiary: Beneficiary;
}

type StatusFilter = "all" | "pending_proof" | "pending_review" | "completed" | "rejected";

const STATUS_LABELS: Record<string, string> = {
  pending_proof: "Menunggu Bukti",
  pending_review: "Menunggu Verifikasi",
  completed: "Selesai",
  rejected: "Ditolak",
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  pending_proof: "Anda belum mengupload bukti penyaluran",
  pending_review: "Bukti sedang diverifikasi oleh admin",
  completed: "Penyaluran telah selesai dan diverifikasi",
  rejected: "Bukti ditolak oleh admin",
};

const STATUS_STYLES: Record<string, string> = {
  pending_proof: "bg-yellow-100 text-yellow-700",
  pending_review: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "pending_proof", label: "Menunggu Bukti" },
  { value: "pending_review", label: "Menunggu Verifikasi" },
  { value: "completed", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
];

export default function PenyaluranPage() {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Track which distributions have been reviewed
  const [reviewedDistributionIds, setReviewedDistributionIds] = useState<Set<string>>(new Set());

  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Fetch distributions
  useEffect(() => {
    const fetchDistributions = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
        });

        if (activeFilter !== "all") {
          params.append("status", activeFilter);
        }

        const response = await fetch(`/api/donatur/distributions?${params}`);

        if (!response.ok) {
          throw new Error("Gagal memuat data distribusi");
        }

        const json = await response.json();
        setDistributions(json.data || []);
        setTotal(json.pagination?.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        setDistributions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDistributions();
  }, [activeFilter, offset]);

  // Fetch reviews for completed distributions
  useEffect(() => {
    const fetchReviews = async () => {
      const completedDistributions = distributions.filter(d => d.status === 'completed');
      if (completedDistributions.length === 0) {
        return;
      }

      const reviewedIds = new Set<string>();

      await Promise.all(
        completedDistributions.map(async (dist) => {
          try {
            const response = await fetch(`/api/donatur/reviews?distributionId=${dist.id}`);
            if (response.ok) {
              const json = await response.json();
              if (json.data) {
                reviewedIds.add(dist.id);
              }
            }
          } catch (err) {
            console.error(`Failed to fetch review for ${dist.id}:`, err);
          }
        })
      );

      setReviewedDistributionIds(reviewedIds);
    };

    fetchReviews();
  }, [distributions]);

  // Format date
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Penyaluran Saya
          </h1>
          <p className="text-gray-600">
            Pantau status penyaluran sedekah Anda dan upload bukti penyaluran.
          </p>
        </div>
        <Link
          href="/donatur/lapor"
          className="bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap"
        >
          + Lapor Penyaluran
        </Link>
      </div>

      {/* Info Card - What is this page */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex gap-3">
          <svg
            className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">Tentang Halaman Ini</p>
            <p className="text-gray-600">
              Halaman ini menampilkan semua penyaluran sedekah Anda. Setiap penyaluran memiliki{" "}
              <span className="font-medium">Kode Distribusi</span> unik yang digunakan untuk melaporkan bukti penyaluran.
            </p>
            <p className="text-gray-600 mt-2">
              <span className="font-medium">Alur:</span> Cari Target → Minta Akses → Admin Approve → Dapat Kode → Upload Bukti → Verifikasi
            </p>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Keterangan Status:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              Menunggu Bukti
            </span>
            <span className="text-gray-600 text-xs">Belum upload</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              Menunggu Verifikasi
            </span>
            <span className="text-gray-600 text-xs">Sedang dicek</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Selesai
            </span>
            <span className="text-gray-600 text-xs">Terverifikasi</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              Ditolak
            </span>
            <span className="text-gray-600 text-xs">Perlu upload ulang</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setActiveFilter(filter.value);
              setOffset(0);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === filter.value
                ? "bg-emerald-700 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-600 mt-2">Memuat data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 px-4 py-3 text-center">
            {error}
          </div>
        ) : distributions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <p className="text-gray-600 mb-2">Belum ada penyaluran</p>
            <p className="text-sm text-gray-500 mb-4">
              Mulai sedekah dengan mencari penerima manfaat terlebih dahulu
            </p>
            <Link
              href="/donatur/cari-target"
              className="inline-block text-emerald-700 font-medium hover:underline"
            >
              Cari Penerima Manfaat →
            </Link>
          </div>
        ) : (
          <>
            {/* Table - Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kode Distribusi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Penerima Manfaat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wilayah
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Dibuat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {distributions.map((distribution) => (
                    <tr
                      key={distribution.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-medium text-gray-900">
                            {distribution.distributionCode}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(distribution.distributionCode);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                            title="Salin kode"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {distribution.beneficiary.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {distribution.beneficiary.regionName || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                STATUS_STYLES[distribution.status] ||
                                "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {STATUS_LABELS[distribution.status] ||
                                distribution.status}
                            </span>
                            {distribution.proofPhotoUrl && (
                              <img
                                src={distribution.proofPhotoUrl}
                                alt="Bukti"
                                className="w-8 h-8 object-cover rounded border border-gray-200"
                              />
                            )}
                          </div>
                          {STATUS_DESCRIPTIONS[distribution.status] && (
                            <p className="text-xs text-gray-500">
                              {STATUS_DESCRIPTIONS[distribution.status]}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(distribution.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {distribution.status === "pending_proof" && (
                          <Link
                            href={`/donatur/lapor?code=${distribution.distributionCode}`}
                            className="inline-flex items-center gap-1 text-emerald-700 font-medium text-sm hover:underline"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Upload Bukti
                          </Link>
                        )}
                        {distribution.status === "rejected" && (
                          <Link
                            href={`/donatur/lapor?code=${distribution.distributionCode}`}
                            className="inline-flex items-center gap-1 text-amber-600 font-medium text-sm hover:underline"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Upload Ulang
                          </Link>
                        )}
                        {distribution.status === "pending_review" && (
                          <span className="text-sm text-gray-400">
                            Menunggu verifikasi admin
                          </span>
                        )}
                        {distribution.status === "completed" && (
                          <Link
                            href={`/donatur/penyaluran/${distribution.id}`}
                            className="inline-flex items-center gap-1 text-emerald-700 font-medium text-sm hover:underline"
                          >
                            {reviewedDistributionIds.has(distribution.id) ? (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Lihat Ulasan
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Beri Ulasan
                              </>
                            )}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards - Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {distributions.map((distribution) => (
                <div key={distribution.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-medium text-gray-900 text-sm">
                          {distribution.distributionCode}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(distribution.distributionCode);
                          }}
                          className="text-gray-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-gray-900 mt-1">
                        {distribution.beneficiary.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {distribution.beneficiary.regionName || "-"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_STYLES[distribution.status] ||
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {STATUS_LABELS[distribution.status] ||
                        distribution.status}
                    </span>
                  </div>

                  {/* Status description */}
                  {STATUS_DESCRIPTIONS[distribution.status] && (
                    <p className="text-xs text-gray-500">
                      {STATUS_DESCRIPTIONS[distribution.status]}
                    </p>
                  )}

                  {/* Proof photo thumbnail */}
                  {distribution.proofPhotoUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={distribution.proofPhotoUrl}
                        alt="Bukti"
                        className="w-12 h-12 object-cover rounded border border-gray-200"
                      />
                      <span className="text-xs text-gray-500">Bukti diupload</span>
                    </div>
                  )}

                  {/* Rejection reason */}
                  {distribution.status === "rejected" && distribution.notes && (
                    <p className="text-xs text-error bg-red-50 p-2 rounded">
                      {distribution.notes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-600">
                      {formatDate(distribution.createdAt)}
                    </span>
                    {distribution.status === "pending_proof" && (
                      <Link
                        href={`/donatur/lapor?code=${distribution.distributionCode}`}
                        className="text-emerald-700 font-medium text-sm"
                      >
                        Upload Bukti →
                      </Link>
                    )}
                    {distribution.status === "rejected" && (
                      <Link
                        href={`/donatur/lapor?code=${distribution.distributionCode}`}
                        className="text-amber-600 font-medium text-sm"
                      >
                        Upload Ulang →
                      </Link>
                    )}
                    {distribution.status === "completed" && (
                      <Link
                        href={`/donatur/penyaluran/${distribution.id}`}
                        className="text-emerald-700 font-medium text-sm"
                      >
                        {reviewedDistributionIds.has(distribution.id) ? "Lihat Ulasan →" : "Beri Ulasan →"}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Menampilkan {Math.min(offset + 1, total)}-{Math.min(offset + limit, total)} dari {total} penyaluran
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
