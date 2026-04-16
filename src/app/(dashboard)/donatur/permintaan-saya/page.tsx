"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, ColumnDef } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

interface Beneficiary {
  name: string;
  regionName: string | null;
}

interface AccessRequest {
  id: string;
  beneficiary: Beneficiary;
  intention: string;
  status: string;
  createdAt: Date;
  distributionCode: string | null;
  rejectionReason: string | null;
}

interface DeleteState {
  [id: string]: boolean;
}

interface ModalState {
  isOpen: boolean;
  intention: string;
  title: string;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
};

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
];

export default function PermintaanSayaPage() {
  const { showSuccess, showError } = useToast();

  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Delete state
  const [deleting, setDeleting] = useState<DeleteState>({});

  // Modal state for viewing intention
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    intention: "",
    title: "",
  });

  // Modal state for delete confirmation
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  // Open modal to view intention
  const handleViewIntention = (intention: string, displayName: string) => {
    setModal({
      isOpen: true,
      intention,
      title: displayName,
    });
  };

  // Close modal
  const handleCloseModal = () => {
    setModal({
      isOpen: false,
      intention: "",
      title: "",
    });
  };

  // Censor beneficiary name for pending/rejected requests
  const getBeneficiaryDisplayName = (request: AccessRequest) => {
    if (request.status === "approved") {
      return request.beneficiary.name;
    }
    // For pending and rejected, show censored name
    return "*** (Data tersembunyi)";
  };

  // Handle delete request
  const handleDelete = async (id: string) => {
    setDeleteModalId(id);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteModalId) return;

    setDeleting((prev) => ({ ...prev, [deleteModalId]: true }));
    setDeleteModalId(null);

    try {
      const response = await fetch(`/api/donatur/access-requests/${deleteModalId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "Gagal menghapus permintaan");
      }

      // Remove deleted request from state
      setRequests((prev) => prev.filter((r) => r.id !== deleteModalId));
      setTotal((prev) => Math.max(0, prev - 1));
      showSuccess("Permintaan berhasil dihapus");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setDeleting((prev) => ({ ...prev, [deleteModalId!]: false }));
    }
  };

  // Fetch access requests
  useEffect(() => {
    const fetchRequests = async () => {
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

        const response = await fetch(`/api/donatur/access-requests?${params}`);

        if (!response.ok) {
          throw new Error("Gagal memuat permintaan akses");
        }

        const json = await response.json();
        setRequests(json.data || []);
        setTotal(json.pagination?.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [activeFilter, offset]);

  // Format date
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Table columns definition
  const columns: ColumnDef<AccessRequest & { index: number }>[] = [
    {
      key: "index",
      header: "No",
      render: (_, row) => (
        <span className="text-sm text-gray-600 font-medium">{row.index}</span>
      ),
    },
    {
      key: "beneficiary",
      header: "Nama Penerima",
      render: (_, row) => (
        <span className="text-sm text-gray-900">{getBeneficiaryDisplayName(row)}</span>
      ),
    },
    {
      key: "regionName",
      header: "Wilayah",
      render: (_, row) => (
        <span className="text-sm text-gray-600">{row.beneficiary.regionName || "-"}</span>
      ),
    },
    {
      key: "intention",
      header: "Niat / Alasan",
      render: (_, row) => (
        <button
          onClick={() => handleViewIntention(row.intention, getBeneficiaryDisplayName(row))}
          className="text-left w-full text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
          title="Klik untuk lihat detail"
        >
          <span className="truncate max-w-xs">{row.intention}</span>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (_, row) => <StatusBadge status={STATUS_LABELS[row.status] || row.status} />,
    },
    {
      key: "createdAt",
      header: "Tanggal",
      render: (value) => <span className="text-sm text-gray-600">{formatDate(value as Date)}</span>,
    },
    {
      key: "distributionCode",
      header: "Kode Distribusi",
      render: (_, row) => (
        <div>
          <span className="text-sm text-gray-600">{row.distributionCode || "-"}</span>
          {row.rejectionReason && (
            <div className="text-xs text-error mt-1">{row.rejectionReason}</div>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (_, row) => (
        row.status === "pending" ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDelete(row.id)}
            isLoading={deleting[row.id]}
          >
            Hapus
          </Button>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
      ),
    },
  ];

  // Add index to requests for table
  const requestsWithIndex = requests.map((req, index) => ({ ...req, index: offset + index + 1 }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Permintaan Akses Saya
        </h1>
        <p className="text-gray-600">
          Kelola dan pantau status permintaan akses data penerima manfaat.
        </p>
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
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Table
        data={requestsWithIndex}
        columns={columns}
        keyExtractor={(request) => request.id}
        loading={loading}
        error={error || undefined}
        emptyMessage="Belum ada permintaan akses"
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
      {!loading && requestsWithIndex.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-600 mb-2">Belum ada permintaan akses</p>
          <a
            href="/donatur/cari-target"
            className="inline-block text-primary font-medium hover:underline"
          >
            Cari penerima manfaat →
          </a>
        </div>
      )}

      {/* Modal for viewing intention */}
      <Modal
        isOpen={modal.isOpen}
        onClose={handleCloseModal}
        title="Niat / Alasan Sedekah"
        size="md"
        footer={
          <Button onClick={handleCloseModal}>Tutup</Button>
        }
      >
        <div>
          <p className="text-sm text-gray-500 mb-1">Penerima:</p>
          <p className="font-medium text-gray-900 mb-4">{modal.title}</p>

          <p className="text-sm text-gray-500 mb-1">Alasan:</p>
          <p className="text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
            {modal.intention}
          </p>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModalId}
        onClose={() => setDeleteModalId(null)}
        title="Hapus Permintaan?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModalId(null)} disabled={deleting[deleteModalId || ""]}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete} isLoading={deleting[deleteModalId || ""]}>
              Ya, Hapus
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Apakah Anda yakin ingin menghapus permintaan ini? Tindakan ini tidak dapat dibatalkan.
        </p>
      </Modal>
    </div>
  );
}
