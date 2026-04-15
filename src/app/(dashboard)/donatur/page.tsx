import { getCurrentUser } from '@/lib/auth-utils';
import { STATUS } from '@/lib/constants';
import { getDonaturStatistics, getDonaturRecentRequests } from '@/services/donatur.service';

// ============================================================
// TYPES
// ============================================================
interface DashboardStats {
  totalDonation: number;
  activeDonations: number;
  beneficiariesHelped: number;
  completedDonations: number;
}

interface RecentRequest {
  id: string;
  beneficiaryName: string;
  needs: string;
  status: string;
  createdAt: Date;
}

// ============================================================
// STATUS BADGE COMPONENT
// ============================================================
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const labels: Record<string, string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
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
function StatsIcon({ variant }: { variant: 'total' | 'active' | 'beneficiaries' | 'completed' }) {
  const icons = {
    total: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    active: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    beneficiaries: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    completed: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
export default async function DonaturDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  // Fetch dashboard statistics
  const stats: DashboardStats = await getDonaturStatistics(user.id);

  // Fetch recent requests (limit 10)
  const recentData: RecentRequest[] = await getDonaturRecentRequests(user.id, 10);

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
          Berikut ringkasan aktivitas sedekah Anda.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Donasi */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Donasi</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalDonation}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <StatsIcon variant="total" />
            </div>
          </div>
        </div>

        {/* Donasi Aktif */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Donasi Aktif</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeDonations}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <StatsIcon variant="active" />
            </div>
          </div>
        </div>

        {/* Target Terbantu */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Target Terbantu</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.beneficiariesHelped}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <StatsIcon variant="beneficiaries" />
            </div>
          </div>
        </div>

        {/* Penyaluran Selesai */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Penyaluran Selesai</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.completedDonations}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-info/10 text-info flex items-center justify-center">
              <StatsIcon variant="completed" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Requests Table */}
      {recentData.length === 0 ? (
        // Empty State
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <EmptyIcon />
          </div>
          <p className="text-gray-500 mb-2">Anda belum memiliki permintaan akses.</p>
          <a
            href="/donatur/cari-target"
            className="text-primary hover:underline font-medium"
          >
            Cari target penerima manfaat
          </a>
        </div>
      ) : (
        // Table with data
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Permintaan Terbaru</h2>
            <a
              href="/donatur/permintaan-saya"
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
                    Nama Penerima
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kebutuhan
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentData.map((item) => {
                  const isApproved = item.status === 'approved';
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {isApproved ? item.beneficiaryName : '*** (Data tersembunyi)'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">
                        {item.needs}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
