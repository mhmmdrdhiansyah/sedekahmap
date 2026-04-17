import { getCurrentUser } from '@/lib/auth-utils';
import { STATUS } from '@/lib/constants';
import {
  getVerifikatorDashboardStats,
  getRecentBeneficiariesByVerifikator,
} from '@/services/beneficiary.service';

// ============================================================
// TYPES
// ============================================================
interface DashboardStats {
  total: number;
  verified: number;
  inProgress: number;
  completed: number;
}

interface RecentBeneficiary {
  name: string;
  address: string;
  needs: string;
  status: string;
  createdAt: Date;
}

// ============================================================
// STATUS BADGE COMPONENT
// ============================================================
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    rejected: 'bg-red-100 text-red-700',
    verified: 'bg-green-100 text-green-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    expired: 'bg-red-100 text-red-700',
  };

  const labels: Record<string, string> = {
    pending: 'Menunggu Approval',
    rejected: 'Ditolak',
    verified: 'Terverifikasi',
    in_progress: 'Dalam Proses',
    completed: 'Selesai',
    expired: 'Kadaluarsa',
  };

  const style = styles[status] ?? 'bg-gray-100 text-gray-700';
  const label = labels[status] ?? status;

  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

// ============================================================
// SVG ICONS
// ============================================================
function StatsIcon({ variant }: { variant: 'total' | 'verified' | 'inProgress' | 'completed' }) {
  const icons = {
    total: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    verified: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    inProgress: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    completed: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  };

  return icons[variant];
}

function EmptyIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}

// ============================================================
// PAGE COMPONENT
// ============================================================
export default async function VerifikatorDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  // Fetch dashboard statistics using service layer
  const stats = await getVerifikatorDashboardStats(user.id);

  // Fetch recent beneficiaries using service layer
  const recentData = await getRecentBeneficiariesByVerifikator(user.id, 5);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Selamat datang, {user.name}!
        </h1>
        <p className="text-gray-500 mt-1">
          Berikut ringkasan data yang Anda kelola.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Data */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Data</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <StatsIcon variant="total" />
            </div>
          </div>
        </div>

        {/* Terverifikasi */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Terverifikasi</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.verified}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <StatsIcon variant="verified" />
            </div>
          </div>
        </div>

        {/* Dalam Proses */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Dalam Proses</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.inProgress}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <StatsIcon variant="inProgress" />
            </div>
          </div>
        </div>

        {/* Selesai */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Selesai</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-info/10 text-info flex items-center justify-center">
              <StatsIcon variant="completed" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Data Table */}
      {stats.total === 0 ? (
        // Empty State
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <EmptyIcon />
          </div>
          <p className="text-gray-500 mb-2">Anda belum memiliki data.</p>
          <a
            href="/verifikator/input"
            className="text-primary hover:underline font-medium"
          >
            Mulai input data pertama
          </a>
        </div>
      ) : (
        // Table with data
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Data Terbaru</h2>
            <a
              href="/verifikator/data-saya"
              className="text-sm text-primary hover:underline font-medium"
            >
              Lihat semua
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alamat
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kebutuhan
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">
                      {item.address}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">
                      {item.needs}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
