# Issues Plan: Security Hardening + Centralized Validation

Dokumen ini adalah rencana implementasi bertahap untuk menutup blocker production:
1. Keamanan belum siap produksi.
2. Belum ada validasi input terpusat.

Target pembaca: junior programmer atau AI model biaya rendah.

## Ringkasan Kondisi Saat Ini (dari codebase)

- Upload route sudah mewajibkan login, tetapi belum ada CSRF dan rate limiting: [src/app/api/upload/route.ts](src/app/api/upload/route.ts).
- Validasi file upload masih bergantung pada MIME type dari client: [src/services/upload.service.ts](src/services/upload.service.ts).
- NIK masih dipakai plain text di service saat create/check unique: [src/services/beneficiary.service.ts](src/services/beneficiary.service.ts).
- Schema beneficiaries memberi catatan bahwa NIK seharusnya encrypted di application layer, tetapi implementasinya belum ada: [src/db/schema/beneficiaries.ts](src/db/schema/beneficiaries.ts).
- Validasi route dilakukan manual dan tersebar (contoh admin users, verifikator beneficiaries):
  - [src/app/api/admin/users/route.ts](src/app/api/admin/users/route.ts)
  - [src/app/api/verifikator/beneficiaries/route.ts](src/app/api/verifikator/beneficiaries/route.ts)

## Aturan Implementasi yang Wajib Diikuti

- Arsitektur harus tetap: Route -> Service -> DB.
- Route file dilarang import DB langsung (`@/db`, `drizzle-orm`, schema DB).
- Semua API route baru/perubahan wajib cek permission via `requirePermission()` (bukan hanya role).
- Setelah perubahan schema DB: jalankan `npm run db:push`.

---

## Issue 1 - Security Baseline dan Scope Lock

- Priority: P0
- Estimasi: 0.5-1 hari

### Description
Membuat baseline agar implementor tidak salah arah: endpoint prioritas, data sensitif, dan urutan rollout.

### Technical details
- Buat daftar endpoint mutasi data (POST/PUT/PATCH/DELETE), lalu tandai endpoint high-risk.
- Daftar minimal high-risk awal:
  - `/api/upload`
  - endpoint auth (`/api/auth/*`)
  - endpoint admin users (`/api/admin/users*`)
  - endpoint verifikator beneficiaries (`/api/verifikator/beneficiaries*`)
- Definisikan data sensitif: NIK, alamat detail, dokumen foto bukti.

### Acceptance criteria
- [ ] Ada checklist endpoint prioritas beserta owner dan status hardening.
- [ ] Ada dokumen threat list singkat (CSRF, brute force, file spoofing, data leakage).
- [ ] Urutan implementasi issue P0 disepakati.

### Files
- [agent/issues.md](agent/issues.md) (update status execution)
- (opsional) [docs/security-hardening.md](docs/security-hardening.md)

### Dependencies
- Tidak ada.

---

## Issue 2 - Harden Upload Authorization + Permission

- Priority: P0
- Estimasi: 1-2 hari

### Description
Memastikan upload file bukan sekadar user login, tetapi benar-benar punya izin dan kepemilikan data yang sah.

### Technical details
- Saat ini upload hanya `requireAuth()` di [src/app/api/upload/route.ts](src/app/api/upload/route.ts).
- Ubah gate menjadi permission-based (`requirePermission`) sesuai aturan proyek.
- Tambahkan business check di service:
  - File hanya boleh diupload untuk distribusi milik donatur terkait.
  - Status distribusi harus valid untuk upload bukti (misalnya `pending_proof`).
- Jika perlu, tambah permission baru di [src/lib/constants.ts](src/lib/constants.ts), contoh: `DISTRIBUTION_UPLOAD_PROOF`.

### Acceptance criteria
- [ ] Endpoint upload menolak user tanpa permission dengan HTTP 403.
- [ ] Endpoint upload menolak jika distribusi bukan milik user.
- [ ] Endpoint upload menolak jika status distribusi tidak valid.
- [ ] Tidak ada import DB di route file.

### Files
- [src/app/api/upload/route.ts](src/app/api/upload/route.ts)
- [src/services/upload.service.ts](src/services/upload.service.ts)
- [src/services/distribution.service.ts](src/services/distribution.service.ts)
- [src/lib/constants.ts](src/lib/constants.ts)

### Dependencies
- Issue 1 selesai.

---

## Issue 3 - File Upload Hardening (Server-side Verification)

- Priority: P0
- Estimasi: 2-3 hari

### Description
Menutup celah upload file berbahaya dan spoofing MIME type dari client.

### Technical details
- Tambah verifikasi signature file di server (magic number), bukan hanya `file.type`.
- Rekomendasi library: `file-type`.
- Validasi minimal:
  - ukuran maksimum,
  - MIME allowlist,
  - extension allowlist,
  - signature cocok dengan MIME.
- Simpan file dengan nama acak kuat (UUID/crypto) dan path yang tidak mudah ditebak.
- Disarankan fase lanjut:
  - simpan file di private storage (tidak langsung di `public`),
  - akses file melalui endpoint terproteksi/signed URL.
- Sanitasi metadata gambar (opsional P1) untuk menghindari kebocoran EXIF.

### Acceptance criteria
- [ ] Upload gagal jika MIME client valid tetapi signature file tidak cocok.
- [ ] Upload gagal jika ukuran melebihi limit.
- [ ] Upload hanya menerima jenis file yang diizinkan.
- [ ] Tes unit untuk validator upload mencakup kasus spoofing.

### Files
- [src/services/upload.service.ts](src/services/upload.service.ts)
- [src/app/api/upload/route.ts](src/app/api/upload/route.ts)
- (baru) [src/services/__tests__/upload.service.test.ts](src/services/__tests__/upload.service.test.ts)

### Dependencies
- Issue 2 selesai.

---

## Issue 4 - Protect NIK at Rest (Encryption + Blind Index)

- Priority: P0
- Estimasi: 3-5 hari

### Description
Menghilangkan penyimpanan NIK plain text sambil tetap mendukung pencarian unik (anti duplikasi).

### Technical details
- Tambah utility crypto terpusat (application layer), contoh:
  - `encryptNik(plain)` -> ciphertext,
  - `decryptNik(ciphertext)` -> plain,
  - `hashNikForLookup(plain)` -> blind index deterministik (HMAC-SHA256).
- Ubah alur create/update beneficiary:
  - sebelum simpan: encrypt NIK,
  - uniqueness check pakai blind index, bukan plain text.
- Migrasi bertahap:
  1. Tambah kolom baru: `nik_ciphertext`, `nik_hash`.
  2. Backfill data lama.
  3. Tambah unique index pada `nik_hash`.
  4. Pindahkan read/write ke kolom baru.
  5. Hapus/abaikan kolom plain jika sudah aman.
- Simpan key di env (`NIK_ENCRYPTION_KEY`, `NIK_HASH_KEY`) dan rotasi key terdokumentasi.

### Acceptance criteria
- [ ] Data NIK baru tidak pernah disimpan plain text.
- [ ] Duplikasi NIK tetap bisa dideteksi via blind index.
- [ ] Data lama berhasil dimigrasikan.
- [ ] Akses publik tetap tidak mengekspos NIK.
- [ ] Dokumen rollback migrasi tersedia.

### Files
- [src/db/schema/beneficiaries.ts](src/db/schema/beneficiaries.ts)
- [src/services/beneficiary.service.ts](src/services/beneficiary.service.ts)
- (baru) [src/lib/security/nik-crypto.ts](src/lib/security/nik-crypto.ts)
- (baru) [scripts/migrate-beneficiary-nik-security.ts](scripts/migrate-beneficiary-nik-security.ts)

### Dependencies
- Issue 1 selesai.

---

## Issue 5 - CSRF Protection for State-Changing Requests

- Priority: P0
- Estimasi: 1-2 hari

### Description
Mencegah request palsu lintas situs untuk endpoint mutasi data.

### Technical details
- Implementasi pola double-submit token:
  - server set cookie CSRF token (HttpOnly=false, SameSite=Lax/Strict sesuai kebutuhan),
  - client kirim token yang sama via header `x-csrf-token`,
  - server verifikasi kecocokan cookie vs header.
- Terapkan validasi CSRF untuk metode POST/PUT/PATCH/DELETE pada API internal.
- Exclude endpoint tertentu jika memang harus publik read-only.
- Standarkan helper di lib agar reusable semua route.

### Acceptance criteria
- [ ] Request mutasi tanpa CSRF token ditolak (403).
- [ ] Token mismatch ditolak (403).
- [ ] Request valid tetap berjalan normal.
- [ ] Ada test integration minimal untuk skenario valid/invalid token.

### Files
- (baru) [src/lib/security/csrf.ts](src/lib/security/csrf.ts)
- [src/proxy.ts](src/proxy.ts) atau helper validasi per-route
- Route mutasi utama di [src/app/api](src/app/api)

### Dependencies
- Issue 1 selesai.

---

## Issue 6 - Global Rate Limiting untuk Endpoint Risky

- Priority: P0
- Estimasi: 1-2 hari

### Description
Mencegah abuse, brute-force, dan spam request pada endpoint kritikal.

### Technical details
- Terapkan rate limiter terpusat di lib (`key` berdasarkan user id + IP).
- Prioritas endpoint:
  - `/api/upload`
  - `/api/auth/login`
  - `/api/auth/register`
  - endpoint mutasi admin/verifikator yang sensitif.
- Response standar saat limit terlampaui:
  - HTTP 429,
  - header `Retry-After`,
  - pesan error konsisten.
- Rekomendasi backend store: Redis (untuk multi-instance). In-memory hanya untuk local dev.

### Acceptance criteria
- [ ] Endpoint prioritas mengembalikan 429 saat limit terlampaui.
- [ ] Rate limiter konsisten antar route (helper tunggal).
- [ ] Metrik hit/blocked tercatat di log.

### Files
- (baru) [src/lib/security/rate-limit.ts](src/lib/security/rate-limit.ts)
- [src/app/api/upload/route.ts](src/app/api/upload/route.ts)
- Endpoint auth/admin/verifikator di [src/app/api](src/app/api)

### Dependencies
- Issue 1 selesai.

---

## Issue 7 - Standardisasi Validasi Input dengan Zod

- Priority: P0
- Estimasi: 3-4 hari

### Description
Menyatukan validasi agar tidak duplikasi manual di setiap route/service dan menjaga konsistensi client-server.

### Technical details
- Pilih satu library utama: Zod.
- Buat struktur schema terpusat, contoh:
  - `src/lib/validation/common.schema.ts`
  - `src/lib/validation/beneficiary.schema.ts`
  - `src/lib/validation/user.schema.ts`
  - `src/lib/validation/upload.schema.ts`
- Gunakan pattern parse tunggal:
  - Route parse request -> pass data typed ke service.
  - Service hanya validasi business rules lanjutan.
- Refactor endpoint yang saat ini validasi manual:
  - [src/app/api/verifikator/beneficiaries/route.ts](src/app/api/verifikator/beneficiaries/route.ts)
  - [src/app/api/verifikator/beneficiaries/[id]/route.ts](src/app/api/verifikator/beneficiaries/[id]/route.ts)
  - [src/app/api/admin/users/route.ts](src/app/api/admin/users/route.ts)
  - [src/app/api/admin/users/[id]/route.ts](src/app/api/admin/users/[id]/route.ts)
- Optional: share schema ke client form agar pesan error konsisten.

### Acceptance criteria
- [ ] Validasi input route prioritas memakai schema Zod.
- [ ] Tidak ada lagi regex/manual validation duplikatif untuk field yang sama.
- [ ] Error response validasi konsisten (format dan status code).
- [ ] TypeScript inference dari schema dipakai di service input type.

### Files
- (baru) [src/lib/validation](src/lib/validation)
- Route API prioritas di [src/app/api](src/app/api)
- Service yang menerima input typed di [src/services](src/services)

### Dependencies
- Issue 1 selesai.

---

## Issue 8 - Unified Error Mapping + Test Coverage

- Priority: P1
- Estimasi: 2-3 hari

### Description
Menstandarkan format error lintas route dan menambah tes regresi untuk security + validation.

### Technical details
- Buat helper mapping error -> HTTP response (401/403/404/409/422/429/500).
- Tambah test minimal:
  - Unit test validator Zod,
  - Unit test upload signature validation,
  - Integration test CSRF/rate limit,
  - Test NIK encryption path.
- Gunakan pola test yang sudah ada di [src/services/__tests__/distribution.service.test.ts](src/services/__tests__/distribution.service.test.ts).

### Acceptance criteria
- [ ] Error shape API konsisten lintas route prioritas.
- [ ] Test baru lulus di CI.
- [ ] Kasus negatif penting (spoofed file, CSRF missing, rate limit hit, NIK duplicate) tercakup.

### Files
- (baru) [src/lib/http/error-mapper.ts](src/lib/http/error-mapper.ts)
- [src/services/__tests__](src/services/__tests__)
- [e2e](e2e)

### Dependencies
- Issue 2, 3, 4, 5, 6, 7 selesai.

---

## Urutan Eksekusi yang Disarankan (untuk Junior)

1. Kerjakan Issue 1 dulu (scope lock).
2. Paralel terbatas: Issue 2, 5, 6 (authz + csrf + rate limit).
3. Lanjut Issue 3 (upload hardening) karena bergantung authz.
4. Jalankan Issue 4 (NIK encryption) dengan migration plan hati-hati.
5. Refactor validasi dengan Issue 7.
6. Tutup dengan Issue 8 (error unifikasi + test).

## Definition of Done (Global)

- [ ] Tidak ada blocker keamanan P0 tersisa.
- [ ] NIK tidak tersimpan plain text.
- [ ] Endpoint mutasi terlindungi CSRF + rate limit.
- [ ] Upload tervalidasi server-side (bukan MIME client saja).
- [ ] Validasi input terpusat (Zod) untuk endpoint prioritas.
- [ ] Semua perubahan lolos lint/test.
