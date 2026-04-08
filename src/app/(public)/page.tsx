"use client";

import PublicMapWrapper from "@/components/map/PublicMapWrapper";
import { useStats } from "@/hooks/useStats";

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-100">
      <p className="text-4xl font-bold text-primary">{value}</p>
      <p className="mt-2 text-gray-600 font-medium">{label}</p>
    </div>
  );
}

export default function HomePage() {
  const stats = useStats();

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-secondary py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            SedekahMap
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">
            Platform Distribusi Sedekah Tepat Sasaran Berbasis Peta.
            Transparan, akuntabel, dan menjangkau yang paling membutuhkan.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#peta"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent-light transition-colors"
            >
              Lihat Peta
            </a>
            <a
              href="/register"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border-2 border-white text-white font-medium hover:bg-white/10 transition-colors"
            >
              Daftar sebagai Donatur
            </a>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section id="peta" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Peta Sebaran</h2>
            <p className="mt-2 text-gray-600">
              Visualisasi sebaran penerima manfaat yang terverifikasi di seluruh Indonesia
            </p>
          </div>
          <PublicMapWrapper />
        </div>
      </section>

      {/* Stats Section */}
      <section id="statistik" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Dampak Kami</h2>
            <p className="mt-2 text-gray-600">
              Data real-time dari platform SedekahMap
            </p>
          </div>
          {stats.loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-8 text-center animate-pulse">
                  <div className="h-10 bg-gray-200 rounded w-20 mx-auto" />
                  <div className="h-4 bg-gray-200 rounded w-32 mx-auto mt-4" />
                </div>
              ))}
            </div>
          ) : stats.data ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard
                value={stats.data.totalFamilies.toLocaleString('id-ID')}
                label="Keluarga Terdata"
              />
              <StatCard
                value={stats.data.totalVillages.toLocaleString('id-ID')}
                label="Desa Terjangkau"
              />
              <StatCard
                value={stats.data.totalDistributions.toLocaleString('id-ID')}
                label="Penyaluran Selesai"
              />
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
