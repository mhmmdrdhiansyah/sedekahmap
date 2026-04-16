"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, ColumnDef } from "@/components/ui/Table";
import { useToast } from "@/components/ui/ToastProvider";

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

const STATUS_VARIANTS: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  pending_proof: "warning",
  pending_review: "info",
  completed: "success",
  rejected: "error",
};

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "pending_proof", label: "Menunggu Bukti" },
  { value: "pending_review", label: "Menunggu Verifikasi" },
  { value: "completed", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
];

export default function PenyaluranPage() {
  const { showToast } = useToast();

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

  // Copy code to clipboard
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast("Kode berhasil disalin!");
  };

  // Table columns definition
  const columns: ColumnDef<Distribution>[] = [
    {
      key: "distributionCode",
      header: "Kode Distribusi",
      render: (value) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-medium text-gray-900">{value as string}</span>
          <button
            onClick={() => copyCode(value as string)}
            className="text-gray-400 hover:text-gray-600"
            title="Salin kode"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      ),
    },
    {
      key: "beneficiary",
      header: "Penerima Manfaat",
      render: (_, row) => (
        <div>
          <p className="text-sm text-gray-900">{row.beneficiary.name}</p>
          <p className="text-sm text-gray-600">{row.beneficiary.regionName || "-"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (_, row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={STATUS_LABELS[row.status] || row.status} />
            {row.proofPhotoUrl && (
              <img
                src={row.proofPhotoUrl}
                alt="Bukti"
                className="w-8 h-8 object-cover rounded border border-gray-200"
              />
            )}
          </div>
          {STATUS_DESCRIPTIONS[row.status] && (
            <p className="text-xs text-gray-500">{STATUS_DESCRIPTIONS[row.status]}</p>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Tanggal Dibuat",
      render: (value) => <span className="text-sm text-gray-600">{formatDate(value as Date)}</span>,
    },
    {
      key: "actions",
      header: "Aksi",
      render: (_, row) => (
        row.status === "pending_proof" ? (
          <Link
            href={`/donatur/lapor?code=${row.distributionCode}`}
            className="inline-flex items-center gap-1 text-emerald-700 font-medium text-sm hover:underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Bukti
          </Link>
        ) : row.status === "rejected" ? (
          <Link
            href={`/donatur/lapor?code=${row.distributionCode}`}
            className="inline-flex items-center gap-1 text-amber-600 font-medium text-sm hover:underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Upload Ulang
          </Link>
        ) : row.status === "pending_review" ? (
          <span className="text-sm text-gray-400">Menunggu verifikasi admin</span>
        ) : row.status === "completed" ? (
          <Link
            href={`/donatur/penyaluran/${row.id}`}
            className="inline-flex items-center gap-1 text-emerald-700 font-medium text-sm hover:underline"
          >
            {reviewedDistributionIds.has(row.id) ? (
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
        ) : null
      ),
    },
  ];

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
            <StatusBadge status="Menunggu Bukti" />
            <span className="text-gray-600 text-xs">Belum upload</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="Menunggu Verifikasi" />
            <span className="text-gray-600 text-xs">Sedang dicek</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="Selesai" />
            <span className="text-gray-600 text-xs">Terverifikasi</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="Ditolak" />
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

      {/* Table */}
      <Table
        data={distributions}
        columns={columns}
        keyExtractor={(dist) => dist.id}
        loading={loading}
        error={error || undefined}
        emptyMessage="Belum ada penyaluran"
        pagination={
          total > limit
            ? {
                limit,
                offset,
                total,
                onPageChange: (newOffset) => setOffset(newOffset),
              }
            : undefined
        }
      />

      {/* Empty State CTA */}
      {!loading && distributions.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
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
      )}
    </div>
  );
}
