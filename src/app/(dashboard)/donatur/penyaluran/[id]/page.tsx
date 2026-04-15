"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface DistributionDetail {
  id: string;
  distributionCode: string;
  beneficiaryName: string;
  regionName: string | null;
  needs: string;
  status: string;
  proofPhotoUrl: string | null;
  notes: string | null;
  createdAt: Date;
}

interface Review {
  id: string;
  distributionId: string;
  rating: number;
  content: string;
  createdAt: Date;
}

interface FormErrors {
  rating?: string;
  content?: string;
  general?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending_proof: "Menunggu Bukti",
  pending_review: "Menunggu Verifikasi",
  completed: "Selesai",
  rejected: "Ditolak",
};

const STATUS_STYLES: Record<string, string> = {
  pending_proof: "bg-yellow-100 text-yellow-700",
  pending_review: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function PenyaluranDetailPage() {
  const router = useRouter();
  const params = useParams();
  const distributionId = params.id as string;

  const [distribution, setDistribution] = useState<DistributionDetail | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingReview, setFetchingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);

  // Fetch distribution detail
  useEffect(() => {
    const fetchDistribution = async () => {
      setLoading(true);
      setError(null);

      try {
        // First, we need to get the distribution by ID
        // Since we only have by-code endpoint, let's fetch from distributions list
        const response = await fetch("/api/donatur/distributions");
        if (!response.ok) {
          throw new Error("Gagal memuat data distribusi");
        }

        const json = await response.json();
        const dist = json.data?.find((d: DistributionDetail) => d.id === distributionId);

        if (!dist) {
          throw new Error("Distribusi tidak ditemukan");
        }

        setDistribution(dist);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };

    if (distributionId) {
      fetchDistribution();
    }
  }, [distributionId]);

  // Fetch existing review when distribution is loaded
  useEffect(() => {
    const fetchReview = async () => {
      if (!distribution || distribution.status !== "completed") {
        return;
      }

      setFetchingReview(true);
      try {
        const response = await fetch(`/api/donatur/reviews?distributionId=${distribution.id}`);
        if (response.ok) {
          const json = await response.json();
          if (json.data) {
            setReview(json.data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch review:", err);
      } finally {
        setFetchingReview(false);
      }
    };

    fetchReview();
  }, [distribution]);

  // Handle review submit
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSuccess(false);

    // Validate
    const newErrors: FormErrors = {};
    if (rating < 1 || rating > 5) {
      newErrors.rating = "Rating harus antara 1-5";
    }
    if (!content.trim() || content.trim().length < 10) {
      newErrors.content = "Ulasan minimal 10 karakter";
    } else if (content.length > 1000) {
      newErrors.content = "Ulasan maksimal 1000 karakter";
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/donatur/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          distributionId: distribution!.id,
          rating,
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "Gagal mengirim ulasan");
      }

      const json = await response.json();
      setReview(json.data);
      setSuccess(true);
      setContent("");
      setRating(0);
    } catch (err) {
      setFormErrors({
        general: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Format date
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-600 mt-2">Memuat data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !distribution) {
    return (
      <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
        {error}
        <div className="mt-3">
          <Link
            href="/donatur/penyaluran"
            className="text-red-700 font-medium hover:underline"
          >
            ← Kembali ke daftar penyaluran
          </Link>
        </div>
      </div>
    );
  }

  if (!distribution) {
    return null;
  }

  const canReview = distribution.status === "completed" && !review;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              Detail Penyaluran
            </h1>
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                STATUS_STYLES[distribution.status] || "bg-gray-100 text-gray-700"
              }`}
            >
              {STATUS_LABELS[distribution.status] || distribution.status}
            </span>
          </div>
          <p className="text-gray-600">
            Kode Distribusi:{" "}
            <span className="font-mono font-semibold text-gray-900">
              {distribution.distributionCode}
            </span>
          </p>
        </div>
        <Link
          href="/donatur/penyaluran"
          className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali
        </Link>
      </div>

      {/* Distribution Info Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Informasi Penyaluran</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Penerima Manfaat</p>
            <p className="text-gray-900 font-medium">{distribution.beneficiaryName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Wilayah</p>
            <p className="text-gray-900">{distribution.regionName || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Kebutuhan</p>
            <p className="text-gray-900">{distribution.needs}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Tanggal Dibuat</p>
            <p className="text-gray-900">{formatDate(distribution.createdAt)}</p>
          </div>
        </div>

        {distribution.proofPhotoUrl && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Bukti Penyaluran</p>
            <img
              src={distribution.proofPhotoUrl}
              alt="Bukti penyaluran"
              className="w-full max-w-md rounded-lg border border-gray-200"
            />
          </div>
        )}

        {distribution.notes && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-1">Catatan</p>
            <p className="text-gray-900">{distribution.notes}</p>
          </div>
        )}
      </div>

      {/* Review Section */}
      {distribution.status === "completed" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Ulasan Anda</h2>

          {fetchingReview ? (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-4 h-4 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Memuat ulasan...</span>
            </div>
          ) : review ? (
            // Existing review display
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-5 h-5 ${
                      star <= review.rating ? "text-amber-400" : "text-gray-300"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{review.content}</p>
              <p className="text-sm text-gray-500">
                Dikirim pada {formatDate(review.createdAt)}
              </p>
            </div>
          ) : canReview ? (
            // Review form
            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-emerald-700 rounded"
                      disabled={submitting}
                    >
                      <svg
                        className={`w-8 h-8 ${
                          star <= (hoverRating || rating)
                            ? "text-amber-400"
                            : "text-gray-300"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {rating === 1 && "Kurang"}
                    {rating === 2 && "Cukup"}
                    {rating === 3 && "Biasa"}
                    {rating === 4 && "Baik"}
                    {rating === 5 && "Sangat Baik"}
                  </p>
                )}
                {formErrors.rating && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.rating}</p>
                )}
              </div>

              {/* Review Content */}
              <div>
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Ulasan
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Bagikan pengalaman Anda dalam memberikan sedekah..."
                  rows={4}
                  className={`w-full px-4 py-2 border rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 disabled:bg-gray-100 disabled:text-gray-500 ${
                    formErrors.content ? "border-red-600" : "border-gray-300"
                  }`}
                  disabled={submitting}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {content.length}/1000 karakter
                </p>
                {formErrors.content && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.content}</p>
                )}
              </div>

              {/* Error Message */}
              {formErrors.general && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
                  {formErrors.general}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg">
                  Ulasan berhasil dikirim! Terima kasih atas feedback Anda.
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || rating < 1 || content.trim().length < 10}
                className="w-full md:w-auto bg-emerald-700 text-white font-medium px-6 py-2 rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
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
                    Mengirim...
                  </span>
                ) : (
                  "Kirim Ulasan"
                )}
              </button>
            </form>
          ) : null}
        </div>
      )}

      {/* Info for non-completed distributions */}
      {distribution.status !== "completed" && (
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
              <p className="font-medium mb-1">Ulasan Tersedia Setelah Penyaluran Selesai</p>
              <p className="text-blue-700">
                Anda dapat memberikan ulasan setelah penyaluran selesai dan diverifikasi oleh admin.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
