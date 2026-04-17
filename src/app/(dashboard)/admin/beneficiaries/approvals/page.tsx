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

interface Beneficiary {
  id: string;
  name: string;
  address: string;
  needs: string;
  regionName: string | null;
  status: string;
  createdAt: Date;
}

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu Approval",
  rejected: "Ditolak",
  verified: "Terverifikasi",
  in_progress: "Dalam Proses",
  completed: "Selesai",
  expired: "Kadaluarsa",
};

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function AdminBeneficiaryApprovalsPage() {
  const { showSuccess, showError } = useToast();

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Modal state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch pending beneficiaries
  useEffect(() => {
    const fetchBeneficiaries = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/beneficiaries/pending");

        if (!response.ok) {
          throw new Error("Gagal memuat data penerima manfaat");
        }

        const json = await response.json();
        setBeneficiaries(json.data || []);
        setTotal(json.data?.length || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        setBeneficiaries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBeneficiaries();
  }, []);

  // Format date
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Handle action click
  const handleActionClick = (id: string, action: "approve" | "reject") => {
    setSelectedId(id);
    setActionType(action);
    setRejectionReason("");
  };

  // Refresh data helper
  const refreshData = async () => {
    const res = await fetch("/api/admin/beneficiaries/pending");
    const json = await res.json();
    setBeneficiaries(json.data || []);
    setTotal(json.data?.length || 0);
  };

  // Confirm action
  const handleConfirm = async () => {
    if (!selectedId) return;
    setSubmitting(true);

    try {
      const body = actionType === "reject" ? { reason: rejectionReason } : {};

      const response = await fetch(
        `/api/admin/beneficiaries/${selectedId}/${actionType}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal memproses permintaan");
      }

      await refreshData();
      showSuccess(
        actionType === "approve"
          ? "Data penerima manfaat disetujui"
          : "Data penerima manfaat ditolak"
      );
      setSelectedId(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Gagal memproses permintaan");
    } finally {
      setSubmitting(false);
    }
  };

  // Table columns definition
  const columns: ColumnDef<Beneficiary>[] = [
    {
      key: "name",
      header: "Nama",
      render: (value) => (
        <div className="text-sm font-medium text-gray-900">{value as string}</div>
      ),
    },
    {
      key: "address",
      header: "Alamat",
      render: (value) => (
        <div className="text-sm text-gray-600 max-w-[200px] truncate">
          {value as string}
        </div>
      ),
    },
    {
      key: "needs",
      header: "Kebutuhan",
      render: (value) => (
        <div className="text-sm text-gray-900 max-w-[150px] truncate">
          {value as string}
        </div>
      ),
    },
    {
      key: "regionName",
      header: "Wilayah",
      render: (value) => (
        <div className="text-sm text-gray-600">
          {(value as string) || "-"}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Tanggal Input",
      render: (value) => (
        <span className="text-sm text-gray-600">{formatDate(value as Date)}</span>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (_, row) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-green-700 border-green-200 hover:bg-green-50"
            onClick={() => handleActionClick(row.id, "approve")}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-700 border-red-200 hover:bg-red-50"
            onClick={() => handleActionClick(row.id, "reject")}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Approval Data Penerima Manfaat
        </h1>
        <p className="text-gray-600">
          Kelola data penerima manfaat yang menunggu approval
        </p>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="text-sm text-gray-500">
          Total Menunggu Approval:{" "}
          <span className="font-semibold text-gray-900">{total}</span>
        </div>
      </div>

      {/* Table */}
      <Table
        data={beneficiaries}
        columns={columns}
        keyExtractor={(beneficiary) => beneficiary.id}
        loading={loading}
        error={error || undefined}
        emptyMessage="Tidak ada data penerima manfaat yang menunggu approval"
      />

      {/* Confirmation Modal */}
      {selectedId && (
        <Modal
          isOpen={!!selectedId}
          onClose={() => setSelectedId(null)}
          title={
            actionType === "approve"
              ? "Setujui Data Penerima Manfaat?"
              : "Tolak Data Penerima Manfaat?"
          }
          size="sm"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setSelectedId(null)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                variant={actionType === "approve" ? "primary" : "destructive"}
                onClick={handleConfirm}
                isLoading={submitting}
              >
                {actionType === "approve" ? "Ya, Setujui" : "Ya, Tolak"}
              </Button>
            </>
          }
        >
          {actionType === "reject" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alasan Penolakan (opsional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="Jelaskan alasan penolakan..."
              />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
