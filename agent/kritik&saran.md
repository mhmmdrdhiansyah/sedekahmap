# Kritik & Saran -- SedekahMap System Analysis

> Dokumen ini berisi analisis komprehensif terhadap keseluruhan sistem SedekahMap, mencakup kritik per-fitur, temuan audit keamanan, utang teknis, dan rekomendasi prioritas.

---

## Daftar Isi

1. [Penilaian Umum Sistem](#1-penilaian-umum-sistem)
2. [Kritik Per-Fitur dengan Saran](#2-kritik-per-fitur-dengan-saran)
3. [Temuan Audit Keamanan](#3-temuan-audit-keamanan)
4. [Utang Teknis & Kekhawatiran Arsitektur](#4-utang-teknis--kekhawatiran-arsitektur)
5. [Rekomendasi Prioritas](#5-rekomendasi-prioritas)

---

## 1. Penilaian Umum Sistem

### 1.1 Kekuatan (Strengths)

**Arsitektur Layered yang Konsisten.** Proyek ini menerapkan pemisahan layer yang rapi: Route handler (`src/app/api/`) hanya menangani HTTP concerns (auth check, parsing request, status code), lalu mendelegasikan logika bisnis ke service layer (`src/services/`). Setiap service file punya satu tanggung jawab jelas (misal `access-request.service.ts`, `distribution.service.ts`). Pola ini membuat kode mudah di-trace dan di-maintain.

**RBAC yang Granular.** Sistem permission menggunakan kombinasi Role + Permission yang terpisah di database (`roles`, `permissions`, `role_permissions`), bukan hard-coded role check. Helper `requireRole()` dan `requirePermission()` di `src/lib/auth-utils.ts` memberikan fleksibilitas tinggi. JWT menyimpan daftar permissions sehingga authorization check tidak perlu query DB setiap saat.

**Privasi Data Terancang.** Name masking (`maskName`), coordinate jittering (+-0.003 derajat / sekitar 300m), dan rencana enkripsi NIK menunjukkan kesadaran terhadap proteksi data pribadi penerima manfaat. Ini krusial untuk platform yang menangani data sensitif seperti NIK dan lokasi tempat tinggal.

**Proxy/Middleware yang Efektif.** File `src/proxy.ts` menggunakan Auth.js `auth()` wrapper untuk route protection di level middleware. Konfigurasi `ROLE_ROUTES` memastikan admin, verifikator, dan donatur hanya bisa akses route masing-masing.

**UI/UX Konsisten.** Komponen UI kustom (`src/components/ui/`) dibangun dengan konsistensi: Button, Input, Select, Badge, Card, Modal, Toast, Table. Dashboard sidebar responsif dengan mobile overlay. Branding Islamic theme (emerald green + gold) kohesif di seluruh halaman.

**Database Schema Terindex.** Setiap tabel punya index pada kolom yang sering di-query (`status`, `regionCode`, `donaturId`, foreign keys). Menunjukkan kesadaran performa query.

### 1.2 Kelemahan Utama (Weaknesses)

**Belum Siap Produksi dari Sisi Keamanan.** Upload file publik tanpa autentikasi, NIK disimpan plain text, tidak ada rate limiting, tidak ada CSRF protection, dan validasi file hanya berdasarkan MIME type dari client (bisa dipalsukan). Ini blocker utama untuk production.

**Testing Coverage Sangat Minim.** Hanya 1 file unit test (`distribution.service.test.ts`) dan 1 file E2E test (`admin-distributions.spec.ts`). Tidak ada integration test, tidak ada test untuk service lain, tidak ada test untuk API routes. Sangat berisiko untuk platform yang menangani data sensitif.

**Tidak Ada Validasi Input Terpusat.** Semua validasi dilakukan manual di masing-masing route handler atau service. Tidak menggunakan Zod, Joi, atau Yup. Ini menyebabkan duplikasi kode dan potensi inkonsistensi validasi antara client-side dan server-side.

---

## 2. Kritik Per-Fitur dengan Saran

### 2.1 Autentikasi dan Registrasi

**Kondisi Saat Ini:** Login via Auth.js v5 dengan JWT strategy (24 jam expiry). Register hanya untuk role donatur, dengan validasi manual. Password di-hash menggunakan `bcryptjs` salt round 12.

**Masalah:**

| # | Masalah | Detail |
|---|---------|--------|
| 1 | **bcryptjs memblokir event loop** | `bcryptjs.hash()` dan `bcryptjs.compare()` secara internal synchronous. Salt round 12 bisa memakan 200-400ms per operasi, menghambat concurrent requests. |
| 2 | **Tidak ada email verification** | Kolom `emailVerifiedAt` ada di schema tapi tidak pernah diisi. User bisa register dengan email palsu. |
| 3 | **Tidak ada password reset** | User yang lupa password tidak punya cara untuk reset. |
| 4 | **Tidak ada account lockout** | Brute force attack pada login tidak dibatasi. |
| 5 | **Password minimum inkonsisten** | Registrasi public: min 6 karakter. Admin-created user: min 8 karakter. Ini melemahkan keamanan. |

**Saran:**
- Ganti `bcryptjs` dengan `bcrypt` (native addon) yang async, atau `argon2` yang lebih modern dan dirancang untuk async.
- Implementasikan email verification: buat tabel `email_verification_tokens` dengan expiry 24 jam. Kirim email via Resend/Nodemailer.
- Tambahkan rate limiting pada `/api/auth/register` dan `/api/auth/[...nextauth]`.
- Standarisasi minimum password ke 8 karakter di semua endpoint.
- Implementasikan account lockout setelah N kali gagal login, lock selama 15-30 menit.

---

### 2.2 Verifikator -- Input Data Penerima Manfaat

**Kondisi Saat Ini:** Verifikator bisa membuat, melihat, mengedit, dan menghapus data beneficiary. Input meliputi NIK (16 digit), nama, alamat, kebutuhan, koordinat (via LocationPicker), dan wilayah (via RegionFilter). Data langsung berstatus `verified` saat dibuat.

**Masalah:**

| # | Masalah | Detail |
|---|---------|--------|
| 1 | **Data langsung live tanpa review admin** | Verifikator bisa memasukkan data palsu dan langsung tampil di peta publik. Risiko integritas data serius. |
| 2 | **NIK disimpan plain text** | Kolom schema bilang "ENCRYPTED" tapi `createBeneficiary` menyimpan NIK langsung tanpa enkripsi apapun. Jika database di-breach, semua NIK terekspos. Melanggar UU PDP Indonesia. |
| 3 | **Tidak ada bulk import** | Memasukkan data satu per satu tidak scalable untuk operasional lapangan. |
| 4 | **Tidak ada audit trail** | Edit dan delete beneficiary tidak meninggalkan catatan siapa yang mengubah apa dan kapan. |
| 5 | **Hard delete** | `deleteBeneficiary` menghapus data permanen tanpa recovery. |
| 6 | **Server Component query langsung** | Verifikator dashboard melakukan query DB langsung dari Server Component tanpa melalui service layer, melanggar pola arsitektur. |

**Saran:**
- Tambahkan status `pending_verification` untuk data baru. Admin harus approve sebelum data muncul di peta publik. Tambah kolom `approvedById` dan `approvedAt`.
- Implementasikan enkripsi NIK menggunakan `crypto.createCipheriv()` dengan AES-256-GCM. Simpan SHA-256 hash NIK di kolom terpisah (`nikHash`) untuk uniqueness check.
- Buat tabel `audit_logs` dengan: `id`, `userId`, `action`, `tableName`, `recordId`, `oldValues` (JSON), `newValues` (JSON), `timestamp`.
- Ubah hard delete menjadi soft delete (tambah kolom `deletedAt`).
- Pindahkan query langsung di verifikator dashboard ke service function baru.
- Tambahkan bulk import CSV/Excel untuk operasional lapangan.

---

### 2.3 Donatur -- Pencarian dan Permintaan Akses

**Kondisi Saat Ini:** Donatur bisa mencari beneficiary berdasarkan wilayah, melihat data ter-mask, mengajukan permintaan akses dengan niat sedekah, dan menghapus permintaan yang masih pending.

**Masalah:**

| # | Masalah | Detail |
|---|---------|--------|
| 1 | **Satu beneficiary per permintaan** | Untuk donatur yang ingin menyalurkan ke beberapa keluarga sekaligus, UX-nya merepotkan. |
| 2 | **Tidak ada notifikasi** | Donatur harus manual cek halaman "Permintaan Saya" untuk tahu status approval. |
| 3 | **Koordinat bocor di endpoint publik** | `getBeneficiariesByRegion` mengembalikan latitude/longitude asli tanpa jitter. Padahal heatmap sudah di-jitter. Privacy leak. |
| 4 | **Bug count review** | `getReviewsByDonaturId` menggunakan `select({ total: reviews.id })` yang mengembalikan UUID, bukan count. |
| 5 | **Tidak ada estimasi donasi** | Field `intention` hanya teks bebas, tidak ada kategori atau nominal. |

**Saran:**
- Izinkan batch access request -- donatur memilih multiple beneficiaries, kirim satu permintaan dengan satu intention.
- Implementasikan notification system: buat tabel `notifications` (`userId`, `type`, `title`, `message`, `isRead`, `relatedId`, `createdAt`). Tambah endpoint `GET /api/notifications` dan `PATCH /api/notifications/:id/read`.
- **Perbaiki bug:** jitter juga lat/lng pada `getBeneficiariesByRegion` atau hapus kolom koordinat dari response publik.
- **Perbaiki bug:** gunakan `count(reviews.id)` bukan `reviews.id` di count query.
- Tambahkan field `estimatedAmount` (opsional) di access request untuk tracking donasi.

---

### 2.4 Donatur -- Upload Bukti Penyaluran

**Kondisi Saat Ini:** Donatur upload foto bukti via `POST /api/upload` yang menyimpan ke `public/uploads/proofs/`. File divalidasi berdasarkan MIME type dan ukuran (max 5MB).

**Masalah:**

| # | Masalah | Detail | Severity |
|---|---------|--------|----------|
| 1 | **File di direktori public** | Siapapun bisa akses foto bukti langsung via URL `/uploads/proofs/[filename]` tanpa autentikasi. Foto bisa berisi wajah atau lokasi penerima manfaat. | **KRITIS** |
| 2 | **Validasi file tidak memadai** | Hanya memeriksa `file.type` (MIME type dari browser) yang bisa dipalsukan. Tidak ada pemeriksaan magic bytes/file signature. | **TINGGI** |
| 3 | **Math.random() untuk filename** | Bukan cryptographically secure, bisa diprediksi. | **SEDANG** |
| 4 | **Tidak ada cleanup mechanism** | Foto distribusi yang ditolak (rejected) tetap tersimpan tanpa pernah dihapus. | **SEDANG** |
| 5 | **Tidak ada role check di upload** | Endpoint hanya memeriksa `requireAuth()` -- verifikator atau user tanpa permission distribution bisa mengupload file. | **TINGGI** |

**Saran:**
- **Pindahkan storage ke luar `public/`**. Buat API route proxy: `GET /api/proofs/[filename]` yang memeriksa autentikasi sebelum serving file. Atau gunakan S3/R2 dengan signed URLs.
- Tambahkan validasi magic bytes (file signature) untuk memastikan file benar-benar gambar. Gunakan library `file-type`.
- Ganti `Math.random()` dengan `crypto.randomUUID()` atau `crypto.randomBytes()` untuk nama file.
- Tambahkan role/permission check: hanya user dengan distribution aktif yang boleh upload.
- Implementasikan scheduled cleanup untuk foto distribusi yang rejected/expired.

---

### 2.5 Admin -- Dashboard dan Manajemen

**Kondisi Saat Ini:** Admin dashboard menampilkan statistik sederhana (pending/approved/rejected counts). Ada halaman approval, distribusi, user management, role management, dan permission management.

**Masalah:**

| # | Masalah | Detail |
|---|---------|--------|
| 1 | **Inefficient API calls** | Dashboard melakukan 3 request API terpisah untuk count masing-masing status. Seharusnya satu API call mengembalikan semua statistik. |
| 2 | **Statistik tidak lengkap** | "Total Users: 0" dan "Total Penyaluran: 0" karena API untuk statistik tersebut belum dibuat. |
| 3 | **Tidak ada analytics/charts** | Admin tidak bisa melihat tren penyaluran per bulan, distribusi per wilayah, atau growth rate. |
| 4 | **Tidak ada export** | Tidak bisa export data beneficiary, distribusi, atau user ke CSV/PDF. |
| 5 | **Client components terlalu besar** | Halaman user/role/permission management adalah client components 13-21KB tanpa code splitting. |
| 6 | **Tidak ada system settings** | Tidak ada halaman konfigurasi (expiry beneficiary, max upload size, dsb). |
| 7 | **Tidak ada bulk operations** | Admin tidak bisa approve/reject multiple requests sekaligus. |

**Saran:**
- Buat endpoint `GET /api/admin/statistics` yang mengembalikan semua statistik dalam satu call menggunakan aggregate queries.
- Tambahkan chart library (rekomendasi: `recharts`). Buat dashboard dengan: line chart tren penyaluran bulanan, bar chart distribusi per wilayah, pie chart status.
- Implementasikan export: endpoint `GET /api/admin/export?type=beneficiaries&format=csv`. Gunakan `json2csv` untuk CSV.
- Pecah client components besar menjadi sub-komponen dengan lazy loading.
- Implementasikan bulk operations (checkbox multiple select + action button).

---

### 2.6 Peta Publik

**Kondisi Saat Ini:** Peta menggunakan Leaflet + react-leaflet dengan heatmap layer (leaflet.heat). Menampilkan marker per wilayah dengan popup jumlah keluarga.

**Masalah:**

| # | Masalah | Detail |
|---|---------|--------|
| 1 | **Tidak ada marker clustering** | Ketika data mencapai ribuan marker, peta akan sangat lambat dan tidak bisa dibaca. |
| 2 | **Tidak ada heatmap legend** | User tidak tahu apa yang diwakili warna pada heatmap. |
| 3 | **Tidak ada fullscreen toggle** | Peta tidak bisa diperbesar ke full screen. |
| 4 | **Tidak ada filter kebutuhan** | Tidak bisa filter berdasarkan jenis kebutuhan (sembako, obat, pendidikan, dll). |
| 5 | **Data heatmap tidak viewport-based** | Endpoint mengirim semua titik sekaligus tanpa filtering berdasarkan viewport. Berat untuk data besar. |
| 6 | **Tidak ada caching** | `useHeatmapData` dan `useMapData` mengambil data setiap mount tanpa caching. |

**Saran:**
- Implementasikan marker clustering menggunakan `react-leaflet-cluster` atau `Leaflet.markercluster`.
- Tambahkan heatmap legend component dengan gradient warna dan label (rendah/sedang/tinggi).
- Tambahkan fullscreen toggle button.
- Implementasikan viewport-based data fetching: hanya kirim titik yang visible di viewport. Gunakan bounding box parameter di API.
- Tambahkan filter berdasarkan jenis kebutuhan -- buat kolom `needsCategory` (enum).
- Tambahkan caching dengan React `cache()` atau revalidation (5-10 menit untuk data publik).

---

### 2.7 Sistem Review

**Kondisi Saat Ini:** Donatur bisa memberikan review (rating 1-5 + teks) untuk distribusi yang sudah completed. Review publik ditampilkan di homepage.

**Masalah:**

| # | Masalah | Detail |
|---|---------|--------|
| 1 | **Tidak ada edit/delete review** | Donatur tidak bisa mengubah atau menghapus review yang sudah dikirim. |
| 2 | **Tidak ada admin moderation** | Review yang tidak pantas langsung tampil di homepage tanpa moderasi. |
| 3 | **Nama donatur tidak dimask** | Nama lengkap ditampilkan di review publik. Inkonsisten dengan kebijakan privasi. |
| 4 | **Bug count** | `getReviewsByDonaturId` mengembalikan `total` yang salah -- menggunakan `reviews.id` (UUID) bukan `count()`. |
| 5 | **Feedback tidak terstruktur** | Hanya rating + teks, tidak ada kategori (kecepatan, komunikasi, transparansi). |

**Saran:**
- Tambahkan endpoint `PUT /api/donatur/reviews/:id` untuk edit (batasan 7 hari) dan `DELETE /api/donatur/reviews/:id`.
- Tambahkan kolom `isModerated` di reviews. Review baru tidak tampil publik sampai admin approve.
- Mask nama donatur di review publik (`maskName(donaturName)`).
- Perbaiki bug count.
- Pertimbangkan structured feedback dengan kategori terpisah.

---

### 2.8 Alur Distribusi

**Kondisi Saat Ini:** Donatur ajukan akses -> Admin approve -> Otomatis buat distribusi (`pending_proof`) -> Donatur upload bukti (`pending_review`) -> Admin verify (`completed`/`rejected`).

**Masalah:**

| # | Masalah | Detail | Severity |
|---|---------|--------|----------|
| 1 | **Tidak ada database transaction** | `approveAccessRequest` melakukan update access request + insert distribution sebagai dua operasi terpisah tanpa transaction. Jika insert gagal setelah update, data inkonsisten. | **KRITIS** |
| 2 | **Beneficiary completed permanen** | Saat distribusi selesai, status beneficiary jadi `completed` dan tidak bisa menerima bantuan lagi dari donatur lain. | **TINGGI** |
| 3 | **Hanya satu foto bukti** | Tidak bisa upload multiple photos per distribusi. | **SEDANG** |
| 4 | **Kode distribusi tidak secure** | Di-generate menggunakan `Math.random()` yang bisa diprediksi. | **SEDANG** |
| 5 | **Tidak ada timeline view** | User tidak bisa melihat history perubahan status distribusi. | **RENDAH** |

**Saran:**
- Bungkus semua operasi multi-tabel dalam `db.transaction()`. Drizzle ORM mendukung ini native.
- Setelah distribusi selesai, kembalikan beneficiary ke status `verified` (bukan `completed`) agar bisa menerima bantuan lagi. Tambah kolom `completedCount` untuk tracking.
- Izinkan multiple proof photos -- buat tabel `distribution_photos` (`distributionId`, `photoUrl`, `caption`, `order`).
- Gunakan `crypto.randomBytes()` atau `crypto.randomUUID()` untuk generate distribution code.
- Tambahkan kolom atau tabel terpisah untuk tracking timeline/status history.

---

## 3. Temuan Audit Keamanan

### 3.1 KRITIS

#### S-01: File Upload Publik Tanpa Autentikasi
- **Lokasi:** `src/services/upload.service.ts`, `public/uploads/proofs/`
- **Risiko:** Siapapun bisa mengakses foto bukti penyaluran langsung via URL. Foto bisa berisi wajah, rumah, atau data identitas penerima manfaat.
- **Mitigasi:** Pindahkan storage ke luar `public/`. Buat API route yang memeriksa auth sebelum serving file.

#### S-02: NIK Disimpan Plain Text
- **Lokasi:** `src/db/schema/beneficiaries.ts` (comment bilang ENCRYPTED), `src/services/beneficiary.service.ts` (NIK disimpan langsung)
- **Risiko:** Jika database di-breach, semua NIK (16 digit KTP) terekspos. Melanggar UU PDP (Undang-Undang Pelindungan Data Pribadi) Indonesia.
- **Mitigasi:** Implementasikan AES-256-GCM encryption. Simpan SHA-256 hash di kolom `nikHash` untuk uniqueness check.

#### S-03: Tidak Ada Rate Limiting
- **Lokasi:** Semua API routes
- **Risiko:** Brute force login, spam registrasi, DDoS pada endpoint publik, abuse upload endpoint.
- **Mitigasi:** Rate limiting per IP dan per user. Gunakan `next-rate-limit`, `rate-limiter-flexible`, atau Edge Middleware.

### 3.2 TINGGI

#### S-04: Validasi File Upload Tidak Memadai
- **Lokasi:** `src/services/upload.service.ts`
- **Risiko:** MIME type dari browser bisa dipalsukan. Attacker bisa mengupload file berbahaya (web shell, polyglot file).
- **Mitigasi:** Periksa file magic bytes/signature. Gunakan library `file-type` untuk verifikasi tipe file aktual.

#### S-05: Tidak Ada CSRF Protection yang Eksplisit
- **Risiko:** Cross-Site Request Forgery bisa memaksa user terautentikasi melakukan aksi tanpa sepengetahuan mereka.
- **Mitigasi:** Verifikasi bahwa Auth.js v5 CSRF token berfungsi di semua state-changing requests. Untuk API routes yang menerima JSON body, pastikan ada custom header check.

#### S-06: SQL Injection via LIKE Search
- **Lokasi:** `src/services/user-management.service.ts`, `src/services/permission-management.service.ts`
- **Risiko:** Input search dimasukkan ke `like()` dengan `%${search}%`. Karakter `%` dan `_` bisa memanipulasi LIKE pattern.
- **Mitigasi:** Escape karakter `%` dan `_` dari input search sebelum dimasukkan ke LIKE pattern.

#### S-07: CORS Tidak Dikonfigurasi
- **Risiko:** API endpoints bisa diakses dari origin manapun. Attacker bisa membuat situs palsu yang berinteraksi dengan API SedekahMap.
- **Mitigasi:** Konfigurasi CORS di `next.config.ts` atau middleware untuk hanya mengizinkan origin yang diizinkan.

### 3.3 SEDANG

#### S-08: Event Loop Blocking oleh bcryptjs
- **Lokasi:** `src/services/auth.service.ts`, `src/services/user.service.ts`, `src/services/user-management.service.ts`
- **Risiko:** Hashing bcrypt synchronous memblokir event loop. Di bawah beban tinggi, response time lambat untuk semua request.
- **Mitigasi:** Ganti ke `bcrypt` (native) atau `argon2`, keduanya async.

#### S-09: Insecure Distribution Code Generation
- **Lokasi:** `src/lib/utils/generate-code.ts`
- **Risiko:** `Math.random()` bukan PRNG yang cryptographically secure. Attacker bisa memprediksi kode distribusi.
- **Mitigasi:** Gunakan `crypto.randomBytes()` atau `crypto.randomUUID()`.

#### S-10: Tidak Ada Account Lockout
- **Risiko:** Brute force attack pada login endpoint tidak dibatasi.
- **Mitigasi:** Account lockout setelah N kali gagal. Simpan counter di database atau Redis. Lock 15-30 menit.

#### S-11: JWT Tanpa Refresh Mechanism
- **Lokasi:** `src/lib/auth.ts` (maxAge: 24 jam)
- **Risiko:** JWT valid 24 jam. Jika token dicuri, tidak bisa di-revoke sebelum expiry.
- **Mitigasi:** Pendek token lifetime (1 jam) + refresh token. Atau token revocation list di database.

---

## 4. Utang Teknis & Kekhawatiran Arsitektur

### 4.1 Tidak Ada Database Transaction

Operasi yang melibatkan multiple tabel dilakukan tanpa transaction:
- `approveAccessRequest` di `access-request.service.ts` -- update access_request + insert distribution
- `registerUser` di `user.service.ts` -- insert user + insert user_roles (ada partial rollback manual tapi tidak atomic)
- `deleteUser` di `user-management.service.ts` -- delete user_roles + delete users
- `assignRoles` di `user-management.service.ts` -- delete existing + insert new user_roles
- `verifyDistribution` di `distribution.service.ts` -- update distribution + update beneficiary

**Saran:** Bungkus semua operasi multi-tabel dalam `db.transaction()`. Drizzle ORM mendukung ini native.

### 4.2 Connection Pooling Tidak Dikonfigurasi

`src/db/index.ts` membuat postgres client tanpa opsi pooling. Default postgres.js menggunakan 10 connections. Untuk production, perlu tuning.

**Saran:** Tambahkan konfigurasi pooling:
```typescript
const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10
});
```

### 4.3 Server Components Query Langsung ke Database

Beberapa Server Components melakukan query database langsung tanpa melalui service layer:
- `src/app/(dashboard)/verifikator/page.tsx` (baris 103-134)
- `src/app/(dashboard)/donatur/page.tsx` (melalui service tapi import langsung)

Ini melanggar pola arsitektur dan membuat kode sulit di-test.

**Saran:** Pindahkan semua query ke service functions. Server Components hanya memanggil service functions.

### 4.4 Error Handling Tidak Konsisten

Setiap API route handler punya block try-catch dengan pattern hampir identik tapi sedikit berbeda. Beberapa handler memeriksa `error.message.startsWith('UNAUTHORIZED')`, yang lain tidak. Beberapa return JSON, yang lain mungkin throw.

**Saran:** Buat utility function `handleApiError(error)` yang sentral menangani semua jenis error (auth, validation, not found, internal) dengan status code konsisten. Gunakan custom error classes (`UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError`).

### 4.5 Tidak Ada Caching Layer

Semua query ke database dilakukan fresh tanpa caching. Untuk data yang jarang berubah (regions, public stats, map data), ini sangat inefficient.

**Saran:**
- React `cache()` atau `unstable_cache` untuk Server Component queries.
- Untuk API routes, gunakan `next-revalidate` atau Redis caching untuk data publik.
- Set revalidation time: stats (5 menit), heatmap data (10 menit), regions (1 jam).

### 4.6 Tidak Ada API Documentation

Dengan 30+ API endpoints, tidak ada dokumentasi formal. Developer baru harus membaca source code untuk memahami API contracts.

**Saran:** Integrasikan Swagger/OpenAPI menggunakan `next-swagger-doc` atau `swagger-jsdoc`. Generate dokumentasi otomatis dari JSDoc comments.

### 4.7 Tidak Ada Test Strategy

Hanya 1 unit test dan 1 E2E test untuk 30+ endpoints dan 12 service files. Tidak ada test untuk:
- Service layer (critical business logic)
- API route authentication dan authorization
- Permission checks
- Data privacy (name masking, NIK encryption, coordinate jittering)
- Edge cases (concurrent access requests, duplicate NIK, expired beneficiaries)

**Saran:**
- Target: minimal 80% coverage untuk service layer.
- Prioritaskan: auth flow, permission checks, access request lifecycle, distribution lifecycle, NIK uniqueness, name masking.
- Gunakan Vitest untuk unit tests (sudah terkonfigurasi).
- Gunakan Playwright (sudah terkonfigurasi) untuk E2E tests critical user flows.

### 4.8 Tidak Ada CI/CD Pipeline

Tidak ada konfigurasi CI/CD. Tidak ada automated testing, linting, atau deployment pipeline.

**Saran:** Buat GitHub Actions workflow yang menjalankan lint, type check, unit tests, dan build pada setiap PR.

---

## 5. Rekomendasi Prioritas

### PRIORITAS 1 -- Segera (Sebelum Production)

| # | Item | Effort | File Terkait |
|---|------|--------|--------------|
| 1 | Pindahkan file upload ke luar `public/` | 1 hari | `src/services/upload.service.ts`, buat `src/app/api/proofs/[filename]/route.ts` |
| 2 | Implementasikan enkripsi NIK (AES-256-GCM) | 2 hari | `src/services/beneficiary.service.ts`, `src/db/schema/beneficiaries.ts`, buat `src/lib/encryption.ts` |
| 3 | Tambahkan rate limiting | 1 hari | Semua API routes, `src/proxy.ts` |
| 4 | Bungkus operasi multi-tabel dalam database transaction | 0.5 hari | `access-request.service.ts`, `user.service.ts`, `user-management.service.ts`, `distribution.service.ts` |
| 5 | Perbaiki validasi file upload (magic bytes) | 0.5 hari | `src/services/upload.service.ts` |
| 6 | Ganti bcryptjs ke bcrypt/argon2 async | 0.5 hari | `src/services/auth.service.ts`, `src/services/user.service.ts`, `src/services/user-management.service.ts` |

### PRIORITAS 2 -- 1-2 Minggu

| # | Item | Effort | File Terkait |
|---|------|--------|--------------|
| 7 | Admin verification untuk data baru verifikator | 2 hari | `src/db/schema/beneficiaries.ts`, `src/services/beneficiary.service.ts`, approval flow baru |
| 8 | Implementasikan audit logging | 1.5 hari | Buat `src/db/schema/auditLogs.ts`, `src/services/audit.service.ts` |
| 9 | Perbaiki bug: jitter koordinat di `getBeneficiariesByRegion` | 0.5 hari | `src/services/beneficiary.service.ts` |
| 10 | Perbaiki bug: count review di `getReviewsByDonaturId` | 0.5 hari | `src/services/review.service.ts` |
| 11 | Ganti Math.random() ke crypto.randomBytes() | 0.5 hari | `src/lib/utils/generate-code.ts`, `src/services/upload.service.ts` |
| 12 | Tambahkan marker clustering di peta | 1 hari | `src/components/map/`, install `react-leaflet-cluster` |
| 13 | Buat centralized error handler | 1 hari | Buat `src/lib/api-error.ts`, update semua route handlers |
| 14 | Konfigurasi connection pooling | 0.5 hari | `src/db/index.ts` |

### PRIORITAS 3 -- 2-4 Minggu

| # | Item | Effort |
|---|------|--------|
| 15 | Validasi input dengan Zod | 2 hari |
| 16 | Notification system | 3 hari |
| 17 | Analytics dashboard dengan charts | 3 hari |
| 18 | Email verification | 2 hari |
| 19 | Password reset | 1.5 hari |
| 20 | Bulk import CSV/Excel | 3 hari |
| 21 | Unit tests untuk service layer (target 80%) | 5 hari |
| 22 | CI/CD pipeline (GitHub Actions) | 1 hari |
| 23 | API documentation (Swagger/OpenAPI) | 2 hari |
| 24 | Caching layer | 2 hari |
| 25 | Export CSV/PDF | 2 hari |

### PRIORITAS 4 -- 1-3 Bulan (Long-term)

- Image optimization untuk upload (sharp/libvips)
- Real-time updates (WebSocket/SSE) untuk notifikasi
- PWA untuk offline access di lapangan
- Monitoring dan alerting (Sentry, atau serupa)
- CDN untuk aset statis
- Internationalization (i18n) support
- Audit aksesibilitas (ARIA, keyboard navigation, screen reader)
- Dark mode
- GPS verification pada upload bukti
- Digital signature untuk konfirmasi penyaluran
- Multiple proof photos per distribusi
- Review moderation oleh admin
- Structured feedback di review (kecepatan, komunikasi, transparansi)

---

> Dokumen ini dibuat berdasarkan analisis kode pada branch `feat/distribution-service`. Beberapa temuan mungkin sudah berubah jika ada commit setelah analisis dilakukan.
