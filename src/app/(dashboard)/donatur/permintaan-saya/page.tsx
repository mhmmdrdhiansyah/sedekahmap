"use client";

import { useState, useEffect } from "react";

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

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
];

export default function PermintaanSayaPage() {
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
    if (!confirm("Apakah Anda yakin ingin menghapus permintaan ini?")) {
      return;
    }

    setDeleting((prev) => ({ ...prev, [id]: true }));

    try {
      const response = await fetch(`/api/donatur/access-requests/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "Gagal menghapus permintaan");
      }

      // Remove deleted request from state
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setDeleting((prev) => ({ ...prev, [id]: false }));
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
            <p className="text-gray-600">Belum ada permintaan akses</p>
            <a
              href="/donatur/cari-target"
              className="inline-block mt-4 text-primary font-medium hover:underline"
            >
              Cari penerima manfaat →
            </a>
          </div>
        ) : (
          <>
            {/* Table - Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Penerima
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wilayah
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Niat / Alasan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kode Distribusi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((request, index) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-sm text-gray-600 font-medium">
                        {offset + index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {getBeneficiaryDisplayName(request)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {request.beneficiary.regionName || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                        <button
                          onClick={() => handleViewIntention(request.intention, getBeneficiaryDisplayName(request))}
                          className="text-left w-full text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                          title="Klik untuk lihat detail"
                        >
                          <span className="truncate">{request.intention}</span>
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
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
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(request.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {request.distributionCode || "-"}
                        {request.rejectionReason && (
                          <div className="text-xs text-error mt-1">
                            {request.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {request.status === "pending" && (
                          <button
                            onClick={() => handleDelete(request.id)}
                            disabled={deleting[request.id]}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {deleting[request.id] ? (
                              <>
                                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Menghapus...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Hapus
                              </>
                            )}
                          </button>
                        )}
                        {request.status !== "pending" && (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table - Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {requests.map((request, index) => (
                <div key={request.id} className="p-4">
                  {/* Row Number and Status */}
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      #{offset + index + 1}
                    </span>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_STYLES[request.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {STATUS_LABELS[request.status] || request.status}
                    </span>
                  </div>

                  {/* Beneficiary Info */}
                  <div className="mb-2">
                    <p className="font-medium text-gray-900">
                      {getBeneficiaryDisplayName(request)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {request.beneficiary.regionName || "-"}
                    </p>
                  </div>

                  {/* Niat / Alasan */}
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">Niat / Alasan:</p>
                    <button
                      onClick={() => handleViewIntention(request.intention, getBeneficiaryDisplayName(request))}
                      className="text-left w-full text-sm text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                    >
                      <span className="line-clamp-2">{request.intention}</span>
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{formatDate(request.createdAt)}</span>
                    {request.distributionCode && (
                      <span className="font-medium text-gray-900">
                        {request.distributionCode}
                      </span>
                    )}
                  </div>
                  {request.rejectionReason && (
                    <div className="mt-2 text-xs text-error">
                      {request.rejectionReason}
                    </div>
                  )}
                  {request.status === "pending" && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleDelete(request.id)}
                        disabled={deleting[request.id]}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {deleting[request.id] ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Menghapus...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Hapus Permintaan
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Menampilkan {Math.min(offset + 1, total)}-{Math.min(offset + limit, total)} dari {total} permintaan
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

      {/* Modal for viewing intention */}
      {modal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Niat / Alasan Sedekah
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">Penerima:</p>
              <p className="font-medium text-gray-900 mb-4">{modal.title}</p>

              <p className="text-sm text-gray-500 mb-1">Alasan:</p>
              <p className="text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
                {modal.intention}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-emerald-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
