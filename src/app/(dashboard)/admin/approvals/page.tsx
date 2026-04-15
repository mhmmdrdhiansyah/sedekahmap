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

interface AccessRequest {
  id: string;
  donatur: Donatur;
  beneficiary: Beneficiary;
  intention: string;
  status: string;
  createdAt: Date;
  distributionCode: string | null;
  rejectionReason: string | null;
}

type StatusFilter = "pending" | "approved" | "rejected";

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
};

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
];

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function AdminApprovalsPage() {
  const { showSuccess, showError } = useToast();

  const [activeFilter, setActiveFilter] = useState<StatusFilter>("pending");
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Counts per status for tabs
  const [counts, setCounts] = useState<Record<StatusFilter, number>>({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // Modal state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch all counts on mount
  useEffect(() => {
    const fetchAllCounts = async () => {
      try {
        const statuses: StatusFilter[] = ["pending", "approved", "rejected"];
        const countPromises = statuses.map(async (status) => {
          const params = new URLSearchParams({ status, limit: "1" });
          const response = await fetch(`/api/admin/access-requests?${params}`);
          if (!response.ok) return { status, count: 0 };
          const json = await response.json();
          return { status, count: json.pagination?.total || 0 };
        });

        const results = await Promise.all(countPromises);
        const newCounts = { pending: 0, approved: 0, rejected: 0 };
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

  // Fetch access requests
  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          status: activeFilter,
          limit: "50",
        });

        const response = await fetch(`/api/admin/access-requests?${params}`);

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

  // Handle action click
  const handleActionClick = (id: string, action: "approve" | "reject") => {
    setSelectedId(id);
    setActionType(action);
    setRejectionReason("");
  };

  // Refresh data helper
  const refreshData = async () => {
    // Refresh current list
    const params = new URLSearchParams({
      status: activeFilter,
      limit: "50",
    });

    const res = await fetch(`/api/admin/access-requests?${params}`);
    const json = await res.json();
    setRequests(json.data || []);
    setTotal(json.pagination?.total || 0);

    // Refresh all counts
    const statuses: StatusFilter[] = ["pending", "approved", "rejected"];
    const countPromises = statuses.map(async (status) => {
      const countParams = new URLSearchParams({ status, limit: "1" });
      const countRes = await fetch(`/api/admin/access-requests?${countParams}`);
      if (!countRes.ok) return { status, count: 0 };
      const countJson = await countRes.json();
      return { status, count: countJson.pagination?.total || 0 };
    });

    const countResults = await Promise.all(countPromises);
    const newCounts = { pending: 0, approved: 0, rejected: 0 };
    countResults.forEach(({ status, count }) => {
      newCounts[status] = count;
    });
    setCounts(newCounts);
  };

  // Confirm action
  const handleConfirm = async () => {
    if (!selectedId) return;
    setSubmitting(true);

    try {
      const body = {
        action: actionType,
        ...(actionType === "reject" && { reason: rejectionReason }),
      };

      const response = await fetch(`/api/admin/access-requests/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal memproses permintaan");
      }

      await refreshData();
      showSuccess(actionType === "approve" ? "Permintaan disetujui" : "Permintaan ditolak");
      setSelectedId(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Gagal memproses permintaan");
    } finally {
      setSubmitting(false);
    }
  };

  // Table columns definition
  const columns: ColumnDef<AccessRequest>[] = [
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
      header: "Target",
      render: (_, row) => (
        <div>
          <div className="text-sm text-gray-900">{row.beneficiary.name}</div>
          <div className="text-sm text-gray-500">{row.beneficiary.regionName || "-"}</div>
        </div>
      ),
    },
    {
      key: "intention",
      header: "Niat",
      render: (value) => (
        <div className="text-sm text-gray-900 max-w-xs truncate">{value as string}</div>
      ),
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
        row.status === "pending" ? (
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
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Approval Permintaan Akses
        </h1>
        <p className="text-gray-600">
          Kelola permintaan akses data dari donatur
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
        data={requests}
        columns={columns}
        keyExtractor={(request) => request.id}
        loading={loading}
        error={error || undefined}
        emptyMessage="Tidak ada permintaan akses"
      />

      {/* Confirmation Modal */}
      {selectedId && (
        <Modal
          isOpen={!!selectedId}
          onClose={() => setSelectedId(null)}
          title={actionType === "approve" ? "Setujui Permintaan?" : "Tolak Permintaan?"}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSelectedId(null)} disabled={submitting}>
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
