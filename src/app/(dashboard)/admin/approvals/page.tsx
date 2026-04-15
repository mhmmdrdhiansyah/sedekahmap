"use client";

import { useState, useEffect } from "react";

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

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
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

      // Refresh data
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

      setSelectedId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memproses permintaan");
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-600 mt-2">Memuat data...</p>
          </div>
        ) : error ? (
          <div className="bg-error/10 text-error px-4 py-3 text-center">
            {error}
          </div>
        ) : requests.length === 0 ? (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-gray-600">Tidak ada permintaan akses</p>
          </div>
        ) : (
          <>
            {/* Table - Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Donatur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Niat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {request.donatur.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.donatur.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {request.beneficiary.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.beneficiary.regionName || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {request.intention}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(request.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_STYLES[request.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {STATUS_LABELS[request.status] || request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        {request.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleActionClick(request.id, "approve")}
                              className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleActionClick(request.id, "reject")}
                              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards - Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {requests.map((request) => (
                <div key={request.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {request.donatur.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {request.beneficiary.name}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_STYLES[request.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {STATUS_LABELS[request.status] || request.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {request.intention}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {formatDate(request.createdAt)}
                    </span>
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleActionClick(request.id, "approve")}
                          className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleActionClick(request.id, "reject")}
                          className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              {actionType === "approve" ? "Setujui Permintaan?" : "Tolak Permintaan?"}
            </h3>
            {actionType === "reject" && (
              <div className="mb-4">
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
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedId(null)}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className={`px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${
                  actionType === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submitting
                  ? "Memproses..."
                  : actionType === "approve"
                  ? "Ya, Setujui"
                  : "Ya, Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
