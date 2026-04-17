"use client";

import { useState, FormEvent } from "react";

interface Beneficiary {
  id: string;
  name: string;
  regionName: string | null;
  needs: string;
}

interface RequestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiary: Beneficiary | null;
  onSuccess: () => void;
}

export default function RequestAccessModal({
  isOpen,
  onClose,
  beneficiary,
  onSuccess,
}: RequestAccessModalProps) {
  const [intention, setIntention] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset form when modal opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIntention("");
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validation
    if (!intention.trim()) {
      setError("Niat sedekah harus diisi");
      return;
    }

    if (intention.trim().length < 10) {
      setError("Niat sedekah minimal 10 karakter");
      return;
    }

    if (!beneficiary) {
      setError("Data penerima tidak valid");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/donatur/access-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          beneficiaryId: beneficiary.id,
          intention: intention.trim(),
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Gagal mengirim permintaan");
      }

      setSuccess(true);

      // Close modal after success delay
      setTimeout(() => {
        handleOpenChange(false);
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[2000]"
        onClick={() => handleOpenChange(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4">
        <div
          className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Minta Akses Data Penerima
            </h2>
            <button
              onClick={() => handleOpenChange(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading || success}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Success Message */}
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Permintaan Terkirim!
              </h3>
              <p className="text-gray-600">
                Permintaan akses Anda akan ditinjau oleh admin.
              </p>
            </div>
          ) : (
            <>
              {/* Beneficiary Info */}
              {beneficiary && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-500 mb-1">Penerima Manfaat</p>
                  <p className="font-medium text-gray-900 mb-2">
                    {beneficiary.name}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Wilayah:</span>{" "}
                    {beneficiary.regionName || "-"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Kebutuhan:</span>{" "}
                    {beneficiary.needs}
                  </p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label
                    htmlFor="intention"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Niat Sedekah <span className="text-error">*</span>
                  </label>
                  <textarea
                    id="intention"
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    placeholder="Ceritakan niat Anda untuk membantu penerima manfaat ini (minimal 10 karakter)"
                    disabled={loading}
                    minLength={10}
                    maxLength={500}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {intention.length}/500 karakter
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-error/10 text-error px-4 py-3 rounded-lg mb-6 text-sm">
                    {error}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenChange(false)}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-6 py-2.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    disabled={loading}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white rounded-lg px-6 py-2.5 hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    disabled={loading}
                  >
                    {loading ? "Mengirim..." : "Kirim Permintaan"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
