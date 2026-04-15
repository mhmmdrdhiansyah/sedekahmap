"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ============================================================
// ICONS
// ============================================================

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function UserGroupIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ============================================================
// ADMIN DASHBOARD PAGE
// ============================================================

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalDistributions: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch access request counts
        const statuses = ["pending", "approved", "rejected"];
        const accessRequestPromises = statuses.map(async (status) => {
          const params = new URLSearchParams({ status, limit: "1" });
          const res = await fetch(`/api/admin/access-requests?${params}`);
          if (!res.ok) return { status, count: 0 };
          const json = await res.json();
          return { status, count: json.pagination?.total || 0 };
        });

        const accessRequestResults = await Promise.all(accessRequestPromises);
        const newCounts = {
          pending: 0,
          approved: 0,
          rejected: 0,
          totalDistributions: 0,
          totalUsers: 0,
        };

        accessRequestResults.forEach(({ status, count }) => {
          newCounts[status as keyof typeof newCounts] = count;
        });

        // For now, distributions and users are not implemented yet
        // These will show 0 until the respective APIs are created
        setCounts(newCounts);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const stats = [
    {
      label: "Pending Approval",
      value: loading ? "..." : counts.pending.toString(),
      icon: ClockIcon,
      color: "bg-yellow-100 text-yellow-600",
      href: "/admin/approvals?status=pending",
    },
    {
      label: "Total Penyaluran",
      value: loading ? "..." : counts.totalDistributions.toString(),
      icon: GiftIcon,
      color: "bg-emerald-100 text-emerald-600",
      href: "/admin/distributions",
    },
    {
      label: "Total Users",
      value: loading ? "..." : counts.totalUsers.toString(),
      icon: UserGroupIcon,
      color: "bg-blue-100 text-blue-600",
      href: "/admin/users",
    },
    {
      label: "Completed Requests",
      value: loading ? "..." : counts.approved.toString(),
      icon: CheckIcon,
      color: "bg-green-100 text-green-600",
      href: "/admin/approvals?status=approved",
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Dashboard Admin
        </h1>
        <p className="text-gray-600">Kelola dan pantau seluruh aktivitas platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/admin/approvals"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
              <ClockIcon />
            </div>
            <div>
              <p className="font-medium text-gray-900">Review Permintaan</p>
              <p className="text-sm text-gray-500">
                Approve atau reject permintaan akses
              </p>
            </div>
          </Link>
          <Link
            href="/admin/approvals"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
              <GiftIcon />
            </div>
            <div>
              <p className="font-medium text-gray-900">Kelola Penyaluran</p>
              <p className="text-sm text-gray-500">
                Lihat dan verifikasi penyaluran
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Info Notice */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Info:</strong> Fitur admin masih dalam pengembangan. Beberapa
          menu mungkin belum tersedia.
        </p>
      </div>
    </div>
  );
}
