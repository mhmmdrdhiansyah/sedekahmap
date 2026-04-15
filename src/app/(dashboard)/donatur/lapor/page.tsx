"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Status constants
const STATUS = {
  PENDING_PROOF: "pending_proof",
  PENDING_REVIEW: "pending_review",
  COMPLETED: "completed",
  REJECTED: "rejected",
};

interface FormErrors {
  distributionCode?: string;
  file?: string;
  general?: string;
}

interface DistributionInfo {
  distributionCode: string;
  beneficiaryName: string;
  regionName: string | null;
  needs: string;
}

export default function LaporPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code");

  const [distributionCode, setDistributionCode] = useState(codeFromUrl || "");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);

  // Distribution info (fetched when code is provided)
  const [distInfo, setDistInfo] = useState<DistributionInfo | null>(null);
  const [fetchingInfo, setFetchingInfo] = useState(false);

  // Fetch distribution info when code changes
  useEffect(() => {
    const fetchDistributionInfo = async (code: string) => {
      if (!code || code.length < 5) {
        setDistInfo(null);
        return;
      }

      setFetchingInfo(true);
      try {
        const response = await fetch(`/api/donatur/distributions/by-code/${code}`);
        if (response.ok) {
          const data = await response.json();
          setDistInfo(data.data);
        } else {
          setDistInfo(null);
        }
      } catch (err) {
        setDistInfo(null);
      } finally {
        setFetchingInfo(false);
      }
    };

    const timer = setTimeout(() => {
      if (distributionCode) {
        fetchDistributionInfo(distributionCode);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [distributionCode]);

  // Handle file change with client-side validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setErrors({});

    if (!selectedFile) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validate file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setErrors({
        file: `Ukuran file terlalu besar. Maksimal 5MB (file Anda: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`,
      });
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validate file type
    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setErrors({
        file: "Tipe file tidak valid. Hanya JPG, PNG, dan WebP yang diperbolehkan",
      });
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    setFile(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    // Validate
    const newErrors: FormErrors = {};
    if (!distributionCode.trim()) {
      newErrors.distributionCode = "Kode distribusi harus diisi";
    }
    if (!file) {
      newErrors.file = "Foto bukti penyaluran harus diupload";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      // Step 1: Upload file
      setUploading(true);
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      } else {
        throw new Error("File harus diisi");
      }

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json();
        throw new Error(uploadError.error || "Gagal mengupload file");
      }

      const uploadData = await uploadResponse.json();

      // Step 2: Update distribution with proof URL
      const updateResponse = await fetch(
        `/api/donatur/distributions/${distributionCode.trim()}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            proofPhotoUrl: uploadData.url,
            notes: notes.trim() || undefined,
          }),
        }
      );

      if (!updateResponse.ok) {
        const updateError = await updateResponse.json();
        throw new Error(updateError.error || "Gagal mengupdate distribusi");
      }

      setSuccess(true);

      // Redirect to penyaluran page after 2 seconds
      setTimeout(() => {
        router.push("/donatur/penyaluran");
      }, 2000);
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Lapor Penyaluran
        </h1>
        <p className="text-gray-600">
          Upload foto bukti penyaluran untuk memverifikasi sedekah Anda.
        </p>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <div className="flex gap-3">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
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
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Tentang Kode Distribusi</p>
            <p className="text-blue-700">
              Kode distribusi (contoh: <span className="font-mono font-semibold">SDK-ABC123</span>) didapatkan setelah admin menyetujui permintaan akses Anda.
              Kode dapat dilihat di halaman{" "}
              <a href="/donatur/penyaluran" className="underline font-medium hover:text-blue-900">
                Penyaluran
              </a>{" "}
              atau{" "}
              <a href="/donatur/permintaan-saya" className="underline font-medium hover:text-blue-900">
                Permintaan Saya
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Distribution Code Input */}
        <div>
          <label
            htmlFor="distributionCode"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Kode Distribusi
          </label>
          <input
            type="text"
            id="distributionCode"
            value={distributionCode}
            onChange={(e) => setDistributionCode(e.target.value.toUpperCase())}
            placeholder="Contoh: SDK-ABC123"
            className={`w-full px-4 py-2 border rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 disabled:bg-gray-100 disabled:text-gray-500 ${
              errors.distributionCode ? "border-red-600" : "border-gray-300"
            }`}
            disabled={loading}
          />
          {errors.distributionCode && (
            <p className="text-red-600 text-sm mt-1">{errors.distributionCode}</p>
          )}

          {/* Loading indicator for distribution info */}
          {fetchingInfo && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-4 h-4 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-500">Memuat info distribusi...</span>
            </div>
          )}

          {/* Distribution Info Card */}
          {distInfo && (
            <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 mb-1">
                    Distribusi Ditemukan
                  </p>
                  <div className="text-sm text-green-800 space-y-0.5">
                    <p>
                      <span className="font-medium">Penerima:</span>{" "}
                      {distInfo.beneficiaryName}
                    </p>
                    <p>
                      <span className="font-medium">Wilayah:</span>{" "}
                      {distInfo.regionName || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Kebutuhan:</span> {distInfo.needs}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Show error if distribution not found */}
          {!fetchingInfo && distributionCode.length >= 5 && !distInfo && (
            <p className="text-sm text-amber-600 mt-2">
              Distribusi dengan kode ini tidak ditemukan atau sudah diproses.
            </p>
          )}
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Foto Bukti Penyaluran
          </label>
          <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
            <div className="space-y-2 text-center">
              {previewUrl ? (
                <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="mx-auto h-64 w-auto object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                    }}
                    className="text-sm text-red-600 hover:underline"
                    disabled={loading}
                  >
                    Hapus foto
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-700 hover:text-emerald-800 focus-within:outline-none"
                    >
                      <span>Upload file</span>
                      <input
                        id="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleFileChange}
                        disabled={loading}
                      />
                    </label>
                    <p className="pl-1">atau drag & drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, WebP hingga 5MB
                  </p>
                </div>
              )}
            </div>
          </div>
          {errors.file && (
            <p className="text-red-600 text-sm mt-1">{errors.file}</p>
          )}
        </div>

        {/* Notes (Optional) */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Catatan (Opsional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tambahkan catatan tentang penyaluran..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 disabled:bg-gray-100 disabled:text-gray-500"
            disabled={loading}
          />
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
            {errors.general}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg">
            Bukti penyaluran berhasil diupload! Mengalihkan...
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !file || !distInfo}
          className="w-full bg-emerald-700 text-white font-medium px-6 py-3 rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {uploading ? "Mengupload file..." : "Memproses..."}
            </span>
          ) : (
            "Kirim Bukti Penyaluran"
          )}
        </button>
      </form>
    </div>
  );
}
