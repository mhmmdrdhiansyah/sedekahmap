Dokumen Arsitektur & Alur Bisnis: Platform Distribusi Sedekah Tepat Sasaran
1. Deskripsi Proyek
Platform ini adalah aplikasi web-based yang berfungsi sebagai Jembatan Informasi antara pihak yang membutuhkan bantuan (warga miskin) dengan donatur. Sistem ini tidak memproses transaksi keuangan secara langsung. Fokus utama sistem adalah transparansi, keamanan data privasi kependudukan, dan pemetaan geografis.

2. Teknologi Utama (Tech Stack) & Versi Target
Standarisasi versi sangat penting untuk menjaga stabilitas environment.

Runtime & Framework:

Node.js (v20.x LTS): Lingkungan eksekusi utama.

Next.js (v16.1.x - App Router): Framework fullstack untuk SSR, SEO, dan API routes. Versi stable terbaru dengan React Compiler support.

React (v19.x): Library UI bawaan. Next.js 16 membutuhkan React 19 minimum.

Database & ORM:

PostgreSQL (v16.x) + PostGIS (v3.4): Database relasional utama. Ekstensi PostGIS wajib diaktifkan dari awal untuk mendukung query geospasial (pencarian radius dan bounding box skala nasional).

Drizzle ORM (^0.30.x): Untuk manajemen skema database, migrasi (drizzle-kit), dan query berbasis TypeScript.

Geospatial & UI (Frontend):

Tailwind CSS (v3.4.x): Styling engine.

Leaflet.js (v1.9.4) & react-leaflet (v4.2.x): Engine pemetaan utama dan wrapper React-nya. Menggunakan sumber peta gratis dari OpenStreetMap (OSM).

leaflet.heat: Plugin khusus untuk merender Heatmap data agregat warga miskin di halaman publik.

@turf/turf (^6.5.x): Library tambahan untuk kalkulasi geospasial di sisi client (contoh: menghitung jarak aktual antara lokasi device donatur dengan lokasi target penyaluran secara real-time).

3. Aktor Sistem (User Roles)
Sistem ini memiliki 3 tipe pengguna:

Admin: Mengelola persetujuan data warga, menyetujui akses donatur, dan mengawasi sistem.

Verifikator: Pihak kredibel (pemerintah desa/relawan) yang bertugas mencari dan memasukkan data target sedekah ke dalam sistem.

Donatur: Masyarakat umum yang memiliki dana dan mencari target sedekah.

4. Alur Bisnis (Business Flow)
Fase 1: Pendataan & Privasi (Data Onboarding)
Input Data: Verifikator memasukkan data target sedekah (Nama, NIK, Alamat, Kebutuhan, Titik Kordinat). Data otomatis masuk dengan status Verified karena verifikator dianggap sumber kredibel.

Keamanan Privasi: Di halaman publik, detail identitas disembunyikan. Sistem hanya menampilkan data agregat di peta menggunakan Leaflet.js (contoh: Heatmap atau "Terdapat 10 keluarga butuh sembako di Desa X").

Fase 2: Eksplorasi & Permintaan Akses (Discovery)
Pencarian: Donatur menggunakan peta atau filter wilayah untuk mencari target sedekah.

Request Akses: Donatur memilih satu area/target, lalu menekan tombol "Minta Akses Data". Donatur mengisi form niat sedekah.

Approval Admin: Admin meninjau profil donatur. Jika disetujui, identitas detail dan alamat target sedekah akan terbuka khusus untuk donatur tersebut. Sistem men-generate Kode Unik Penyaluran (contoh: SDK-123).

Fase 3: Penyaluran Offline & Ulasan (Distribution & Review)
Aksi Offline: Donatur pergi ke lokasi dan memberikan bantuan secara langsung kepada target.

Lapor Bantuan: Donatur login kembali ke sistem, memasukkan Kode Unik Penyaluran, lalu wajib mengunggah foto bukti penyaluran (foto penyerahan).

Verifikasi Penyaluran: Admin/Verifikator mengecek keaslian foto bukti. Jika valid, status penyaluran berubah menjadi Completed.

Ulasan (Review): Setelah status Completed, fitur Ulasan untuk donatur tersebut terbuka. Donatur dapat meninggalkan ulasan tentang kondisi target. Ulasan ini akan tampil di halaman publik (tanpa nama asli target) untuk meningkatkan kepercayaan donatur lain.

5. Aturan Penting Tambahan (Business Rules)
Re-Assessment: Data target sedekah memiliki masa kedaluwarsa (misalnya 6 bulan). Jika lewat dari waktu tersebut, Verifikator harus memperbarui status ekonomi target.

Data Standard: Penyimpanan data wilayah harus mengikuti hierarki standar pemerintah (Provinsi > Kabupaten > Kecamatan > Desa) agar filter pencarian optimal.

Read-Only Maps: Peta di halaman publik (frontend) murni bersifat read-only (hanya menampilkan visualisasi agregat data), tidak menampilkan titik presisi rumah target.

6. Panduan & Batasan Teknis (Technical Guidelines)
Aturan ini wajib dipatuhi oleh seluruh tim developer (termasuk AI assistant) selama fase development.

Aturan Integrasi Peta (Next.js + Leaflet):

CRITICAL: Leaflet berinteraksi langsung dengan DOM Window. Karena Next.js menggunakan Server-Side Rendering (SSR), pemanggilan komponen peta secara langsung akan menyebabkan error window is not defined.

Solusi: Komponen peta wajib diimpor menggunakan next/dynamic dengan parameter ssr: false.

JavaScript
// CONTOH WAJIB (DO NOT IMPORT DIRECTLY)
import dynamic from 'next/dynamic'
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false })
Manajemen Peta (OpenStreetMap):

Gunakan OSM tile server standar untuk fase MVP. Jika traffic pengguna publik mulai tinggi dan terkena rate-limit dari OSM, sistem harus siap bermigrasi menggunakan layanan tile provider pihak ketiga yang menyediakan free-tier cukup besar (seperti MapTiler atau Stadia Maps).

Infrastruktur & Deployment:

Untuk memastikan konsistensi antara environment development lokal dan server production (VPS berbasis Ubuntu/Debian/CentOS), seluruh stack aplikasi (termasuk image PostgreSQL+PostGIS) harus dikonfigurasi dan di-deploy menggunakan Docker dan Docker Compose.
