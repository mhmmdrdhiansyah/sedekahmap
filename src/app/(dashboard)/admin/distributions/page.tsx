"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, ColumnDef } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

// ============================================================
// TYPES
// ============================================================

interface Donatur {
  id: string;
  name: string;
  email: string;
}

interface Beneficiary {
  id: string;
  name: string;
  needs: string;
  regionName: string | null;
}

interface Distribution {
  id: string;
  distributionCode: string;
  proofPhotoUrl: string | null;
  status: string;
  verifiedById: string | null;
  verifiedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  donatur: Donatur;
  beneficiary: Beneficiary;
}

type StatusFilter = "pending_review" | "completed" | "rejected";

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Menunggu Review",
  completed: "Terverifikasi",
  rejected: "Ditolak",
};

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "pending_review", label: "Menunggu Review" },
  { value: "completed", label: "Terverifikasi" },
  { value: "rejected", label: "Ditolak" },
];

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function AdminDistributionsPage() {
  const { showSuccess, showError } = useToast();

  const [activeFilter, setActiveFilter] = useState<StatusFilter>("pending_review");
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Counts per status for tabs
  const [counts, setCounts] = useState<Record<StatusFilter, number>>({
    pending_review: 0,
    completed: 0,
    rejected: 0,
  });

  // Modal state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"verify" | "reject">("verify");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Photo preview modal state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Fetch all counts on mount
  useEffect(() => {
    const fetchAllCounts = async () => {
      try {
        const statuses: StatusFilter[] = ["pending_review", "completed", "rejected"];
        const countPromises = statuses.map(async (status) => {
          const params = new URLSearchParams({ status, limit: "1" });
          const response = await fetch(`/api/admin/distributions?${params}`);
          if (!response.ok) return { status, count: 0 };
          const json = await response.json();
          return { status, count: json.pagination?.total || 0 };
        });

        const results = await Promise.all(countPromises);
        const newCounts = { pending_review: 0, completed: 0, rejected: 0 };
        results.forEach(({ status, count }) => {
          newCounts[status] = count;
        });
        setCounts(newCounts);
      } catch (err) {
        console.error("Failed to fetch counts:", err);
      }
    };

    fetchAllCounts();
  }, []);

  // Fetch distributions
  useEffect(() => {
    const fetchDistributions = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          status: activeFilter,
          limit: "50",
        });

        const response = await fetch(`/api/admin/distributions?${params}`);

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
  }, [activeFilter]);

  // Format date
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Refresh counts helper
  const refreshCounts = async () => {
    const statuses: StatusFilter[] = ["pending_review", "completed", "rejected"];
    const countPromises = statuses.map(async (status) => {
      const countParams = new URLSearchParams({ status, limit: "1" });
      const countRes = await fetch(`/api/admin/distributions?${countParams}`);
      if (!countRes.ok) return { status, count: 0 };
      const countJson = await countRes.json();
      return { status, count: countJson.pagination?.total || 0 };
    });

    const countResults = await Promise.all(countPromises);
    const newCounts = { pending_review: 0, completed: 0, rejected: 0 };
    countResults.forEach(({ status, count }) => {
      newCounts[status] = count;
    });
    setCounts(newCounts);
  };

  // Refresh data helper
  const refreshData = async () => {
    const params = new URLSearchParams({
      status: activeFilter,
      limit: "50",
    });

    const res = await fetch(`/api/admin/distributions?${params}`);
    const json = await res.json();
    setDistributions(json.data || []);
    setTotal(json.pagination?.total || 0);
  };

  // Handle action click
  const handleActionClick = (id: string, action: "verify" | "reject") => {
    setSelectedId(id);
    setActionType(action);
    setRejectionReason("");
  };

  // Confirm action
  const handleConfirm = async () => {
    if (!selectedId) return;
    setSubmitting(true);

    try {
      const body = {
        action: actionType,
        ...(actionType === "reject" && { notes: rejectionReason }),
      };

      const response = await fetch(`/api/admin/distributions/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal memproses distribusi");
      }

      await Promise.all([refreshData(), refreshCounts()]);
      showSuccess(actionType === "verify" ? "Distribusi diverifikasi" : "Distribusi ditolak");
      setSelectedId(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Gagal memproses distribusi");
    } finally {
      setSubmitting(false);
    }
  };

  // Photo preview component
  const PhotoPreview = ({ url }: { url: string | null }) => {
    if (!url) {
      return (
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }

    return (
      <img
        src={url}
        alt="Bukti penyaluran"
        className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setPhotoPreview(url)}
      />
    );
  };

  // Table columns definition
  const columns: ColumnDef<Distribution>[] = [
    {
      key: "donatur",
      header: "Donatur",
      render: (_, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.donatur.name}</div>
          <div className="text-sm text-gray-500">{row.donatur.email}</div>
        </div>
      ),
    },
    {
      key: "beneficiary",
      header: "Penerima",
      render: (_, row) => (
        <div>
          <div className="text-sm text-gray-900">{row.beneficiary.name}</div>
          <div className="text-sm text-gray-500">{row.beneficiary.regionName || "-"}</div>
        </div>
      ),
    },
    {
      key: "distributionCode",
      header: "Kode",
      render: (value) => (
        <span className="text-sm font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">{value as string}</span>
      ),
    },
    {
      key: "proofPhotoUrl",
      header: "Bukti Foto",
      render: (_, row) => <PhotoPreview url={row.proofPhotoUrl} />,
    },
    {
      key: "createdAt",
      header: "Tanggal",
      render: (value) => (
        <span className="text-sm text-gray-600">{formatDate(value as Date)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (value) => (
        <StatusBadge status={STATUS_LABELS[value as string] || value as string} />
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (_, row) => (
        row.status === "pending_review" ? (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-green-700 border-green-200 hover:bg-green-50"
              onClick={() => handleActionClick(row.id, "verify")}
            >
              Terverifikasi
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-700 border-red-200 hover:bg-red-50"
              onClick={() => handleActionClick(row.id, "reject")}
            >
              Tolak
            </Button>
          </div>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Verifikasi Penyaluran
        </h1>
        <p className="text-gray-600">
          Kelola dan verifikasi bukti penyaluran donasi
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === filter.value
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {filter.label} ({counts[filter.value]})
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
        emptyMessage="Tidak ada data penyaluran"
      />

      {/* Confirmation Modal */}
      {selectedId && (
        <Modal
          isOpen={!!selectedId}
          onClose={() => setSelectedId(null)}
          title={actionType === "verify" ? "Verifikasi Penyaluran?" : "Tolak Penyaluran?"}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSelectedId(null)} disabled={submitting}>
                Batal
              </Button>
              <Button
                variant={actionType === "verify" ? "primary" : "destructive"}
                onClick={handleConfirm}
                isLoading={submitting}
              >
                {actionType === "verify" ? "Ya, Verifikasi" : "Ya, Tolak"}
              </Button>
            </>
          }
        >
          {actionType === "reject" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catatan (opsional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="Tambahkan catatan..."
              />
            </div>
          )}
        </Modal>
      )}

      {/* Photo Preview Modal */}
      {photoPreview && (
        <Modal
          isOpen={!!photoPreview}
          onClose={() => setPhotoPreview(null)}
          size="xl"
        >
          <img
            src={photoPreview}
            alt="Bukti penyaluran"
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
          />
        </Modal>
      )}
    </div>
  );
}
