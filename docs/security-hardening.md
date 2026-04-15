# Security Hardening Baseline

Dokumen ini menjadi acuan implementasi security hardening. Tujuannya agar semua implementor memiliki pemahaman yang sama tentang endpoint prioritas, data sensitif, dan urutan rollout.

**Terakhir diperbarui:** 2026-04-15

---

## 1. Mutation Endpoint Checklist

### High-Risk Endpoints

Endpoint yang menangani data sensitif atau operasi kritis. Wajib diharden pertama.

| # | Endpoint | Method | Owner | Permission Gate | Sensitive Data | AuthZ | CSRF | Rate Limit | Zod | File Sig |
|---|----------|--------|-------|-----------------|----------------|-------|------|------------|-----|----------|
| 1 | `/api/upload` | POST | donatur | `requireAuth()` | File upload | **N** | N | N | N | N |
| 2 | `/api/auth/register` | POST | public | none | Password, email | - | N | N | N | - |
| 3 | `/api/auth/[...nextauth]` | POST | public | none | Credentials | - | N | N | - | - |
| 4 | `/api/admin/users` | POST | admin | `USER_CREATE` | Password, email | **Y** | N | N | N | - |
| 5 | `/api/admin/users/[id]` | PUT | admin | `USER_UPDATE` | Password, email | **Y** | N | N | N | - |
| 6 | `/api/admin/users/[id]` | PATCH | admin | `USER_ASSIGN_ROLE` | Role assignment | **Y** | N | N | N | - |
| 7 | `/api/admin/users/[id]` | DELETE | admin | `USER_DELETE` | User data | **Y** | N | N | N | - |
| 8 | `/api/verifikator/beneficiaries` | POST | verifikator | `requireRole(VERIFIKATOR)` | **NIK**, address | **N** | N | N | N | - |
| 9 | `/api/verifikator/beneficiaries/[id]` | PUT | verifikator | `requireRole(VERIFIKATOR)` | **NIK**, address | **N** | N | N | N | - |
| 10 | `/api/verifikator/beneficiaries/[id]` | DELETE | verifikator | `requireRole(VERIFIKATOR)` | Beneficiary data | **N** | N | N | N | - |

### Medium-Risk Endpoints

Endpoint mutasi data yang sudah memiliki permission gate, perlu hardening tambahan.

| # | Endpoint | Method | Owner | Permission Gate | AuthZ | CSRF | Rate Limit | Zod |
|---|----------|--------|-------|-----------------|-------|------|------------|-----|
| 11 | `/api/admin/access-requests/[id]` | PATCH | admin | `ACCESS_REQUEST_APPROVE` | Y | N | N | N |
| 12 | `/api/admin/distributions/[id]` | PATCH | admin | `DISTRIBUTION_VERIFY` | Y | N | N | N |
| 13 | `/api/admin/users/roles` | POST | admin | `USER_ASSIGN_ROLE` | Y | N | N | N |
| 14 | `/api/admin/users/roles/[id]` | PUT | admin | `USER_ASSIGN_ROLE` | Y | N | N | N |
| 15 | `/api/admin/users/roles/[id]` | PATCH | admin | `USER_ASSIGN_ROLE` | Y | N | N | N |
| 16 | `/api/admin/users/roles/[id]` | DELETE | admin | `USER_ASSIGN_ROLE` | Y | N | N | N |
| 17 | `/api/admin/users/permissions` | POST | admin | `USER_ASSIGN_ROLE` | Y | N | N | N |
| 18 | `/api/admin/users/permissions/[id]` | PUT | admin | `USER_ASSIGN_ROLE` | Y | N | N | N |
| 19 | `/api/admin/users/permissions/[id]` | DELETE | admin | `USER_ASSIGN_ROLE` | Y | N | N | N |
| 20 | `/api/donatur/access-requests` | POST | donatur | `requireRole(DONATUR)` | **N** | N | N | N |
| 21 | `/api/donatur/access-requests/[id]` | DELETE | donatur | `ACCESS_REQUEST_CREATE` | Y | N | N | N |
| 22 | `/api/donatur/distributions/[code]` | PATCH | donatur | `DISTRIBUTION_READ` | Y | N | N | N |
| 23 | `/api/donatur/reviews` | POST | donatur | `REVIEW_CREATE` | Y | N | N | N |
| 24 | `/api/cron/expire-beneficiaries` | POST | system | `CRON_SECRET` header | Y | - | N | - |

### Read-Only Endpoints (Reference)

Endpoint GET yang tidak memerlukan CSRF protection, tetapi perlu rate limiting untuk publik.

| # | Endpoint | Owner | Permission Gate |
|---|----------|-------|-----------------|
| 25 | `/api/public/map-data` | public | none |
| 26 | `/api/public/heatmap-data` | public | none |
| 27 | `/api/public/regions` | public | none |
| 28 | `/api/public/reviews` | public | none |
| 29 | `/api/public/beneficiaries-by-region` | public | none |
| 30 | `/api/public/geocode` | public | none |
| 31 | `/api/donatur/statistics` | donatur | `requireRole(DONATUR)` |
| 32 | `/api/donatur/recent-requests` | donatur | `requireRole(DONATUR)` |
| 33 | `/api/admin/users` | admin | `USER_READ` |
| 34 | `/api/admin/distributions` | admin | `DISTRIBUTION_READ` |

### Legenda Status

- **AuthZ** = Permission-based authorization (`requirePermission()`) bukan hanya role
- **CSRF** = Double-submit token verification
- **Rate Limit** = Rate limiting per user/IP
- **Zod** = Input validation via Zod schema
- **File Sig** = Server-side file signature (magic number) verification
- **Y** = Sudah diimplementasi
- **N** = Belum diimplementasi
- **-** = Tidak applicable

---

## 2. Threat List

### 2.1 CSRF (Cross-Site Request Forgery)

**Severity:** High

**Attack vector:**
Semua endpoint mutasi (POST/PUT/PATCH/DELETE) menerima request tanpa verifikasi CSRF token. Meskipun NextAuth cookie memiliki `SameSite` policy, ini tidak cukup untuk perlindungan penuh.

**Endpoints affected:** Semua 24 mutation endpoints di atas.

**Mitigasi (Issue #92 / Issue 5):**
- Implementasi double-submit token pattern
- Server set cookie CSRF token (`HttpOnly=false`, `SameSite=Lax`)
- Client kirim token via header `x-csrf-token`
- Server verifikasi kecocokan cookie vs header

### 2.2 Brute Force

**Severity:** High

**Attack vector:**
- `/api/auth/register` - Tidak ada rate limiting, bisa di-spam untuk akun massal
- `/api/auth/[...nextauth]` (login) - Tidak ada rate limiting, rentan credential stuffing
- `/api/cron/expire-beneficiaries` - Hanya pakai static `CRON_SECRET`, bisa di-brute jika secret lemah
- `/api/upload` - Bisa di-spam untuk menghabiskan storage

**Endpoints affected:** Auth endpoints, upload, cron.

**Mitigasi (Issue #93 / Issue 6):**
- Rate limiter terpusat di `src/lib/security/rate-limit.ts`
- Key berdasarkan user id + IP
- Response 429 dengan header `Retry-After`
- Priority: auth endpoints, upload, admin/verifikator mutations

### 2.3 File Spoofing

**Severity:** Medium-High

**Attack vector:**
`src/services/upload.service.ts` hanya mengecek `file.type` dari client (HTTP header). Attacker bisa mengirim file berbahaya (misalnya PHP webshell) dengan MIME type `image/jpeg`.

```typescript
// Kode saat ini (VULNERABLE):
if (!ALLOWED_MIME_TYPES.includes(file.type)) { // file.type dari client, bisa dispoof
  return { valid: false, error: 'Tipe file tidak valid...' };
}
```

**Endpoints affected:** `/api/upload`

**Mitigasi (Issue #90 / Issue 3):**
- Verifikasi file signature (magic number) di server
- Rekomendasi library: `file-type`
- Validasi: ukuran, MIME, extension, signature cocok
- Filename acak (UUID/crypto), path tidak predictable

### 2.4 Data Leakage

**Severity:** High

**Attack vectors:**

1. **NIK Plain Text:**
   Schema `beneficiaries.nik` menyimpan NIK plain text. Comment mengatakan "ENCRYPTED" tapi tidak diimplementasi.
   - File: `src/db/schema/beneficiaries.ts`
   - Service: `src/services/beneficiary.service.ts` - NIK dipakai langsung di query uniqueness

2. **Admin Endpoint Exposure:**
   `/api/admin/users` mengembalikan email pengguna. Perlu dipertimbangkan apakah ini perlu di-mask.

3. **EXIF Metadata:**
   Upload foto tidak sanitasi EXIF metadata (lokasi GPS, tanggal, dll). Ini bisa bocor di fase lanjut.

**Mitigasi (Issue #91 / Issue 4):**
- Encrypt NIK di application layer dengan `encryptNik()` / `decryptNik()`
- Blind index (`hashNikForLookup()` via HMAC-SHA256) untuk uniqueness check
- Migrasi bertahap: kolom baru → backfill → switch → drop kolom lama
- Key di env: `NIK_ENCRYPTION_KEY`, `NIK_HASH_KEY`

### 2.5 Input Validation Gap

**Severity:** Medium

**Attack vector:**
Validasi input dilakukan manual dan tersebar di setiap route. Tidak ada schema terpusat, sehingga:
- Validasi bisa tidak konsisten antar endpoint
- Field yang sama divalidasi berbeda di tempat berbeda
- Tidak ada TypeScript inference dari schema

**Endpoints affected:** Semua mutation endpoints.

**Mitigasi (Issue #94 / Issue 7):**
- Implementasi Zod schemas terpusat di `src/lib/validation/`
- Route parse request → pass typed data ke service
- Share schema ke client form

---

## 3. Implementation Order

Urutan eksekusi berdasarkan risiko dan dependency:

```
Phase 1 - Baseline (blocker semua issue lain)
  └── Issue 1 (#88)  Security Baseline dan Scope Lock         ← SELESAI

Phase 2 - Paralel (setelah baseline selesai)
  ├── Issue 2 (#89)  Harden Upload Authorization + Permission
  ├── Issue 5 (#92)  CSRF Protection
  └── Issue 6 (#93)  Global Rate Limiting

Phase 3 - Sequential (setelah Phase 2)
  └── Issue 3 (#90)  File Upload Hardening (needs Issue 2)

Phase 4 - Complex (bisa paralel dengan Phase 3)
  └── Issue 4 (#91)  NIK Encryption + Migration

Phase 5 - Standardization (setelah Phase 2-4)
  └── Issue 7 (#94)  Zod Validation Standardization

Phase 6 - Final
  └── Issue 8 (#95)  Unified Error Mapping + Test Coverage
```

### Rationale

- **Issue 2, 5, 6 paralel** karena tidak saling bergantung
- **Issue 3 sequential setelah 2** karena upload hardening butuh authz yang benar
- **Issue 4 independent** tapi complex (migration), bisa paralel tapi hati-hati
- **Issue 7 setelah semua** karena refactor validation menyentuh banyak file
- **Issue 8 terakhir** karena butuh semua fitur security terpasang untuk test lengkap

---

## 4. Sensitive Data Definitions

| Data | Storage | Current Protection | Required Protection |
|------|---------|--------------------|---------------------|
| NIK | `beneficiaries.nik` (plain text) | Tidak ada | AES-256 encryption + HMAC blind index |
| Password | `users.password` (bcrypt hash) | bcrypt, 12 rounds | Sudah adequate |
| Email | `users.email` (plain text) | Tidak ada | Perlu dipertimbangkan encryption |
| Address detail | `beneficiaries.address` (plain text) | Tidak diekspos ke publik | Adequate, tapi jangan expose di API publik |
| Foto bukti | `public/uploads/proofs/` | `requireAuth()` | Permission-based + private storage |
| Koordinat | `beneficiaries.latitude/longitude` | Jittered di heatmap | Adequate untuk publik |

---

## 5. Quick Reference: File Locations

| Komponen | File |
|----------|------|
| Auth helpers | `src/lib/auth-utils.ts` |
| Constants (permissions) | `src/lib/constants.ts` |
| Upload service | `src/services/upload.service.ts` |
| Beneficiary service | `src/services/beneficiary.service.ts` |
| User service | `src/services/user.service.ts` |
| Error mapping | `src/lib/http/error-mapper.ts` (baru) |
| CSRF protection | `src/lib/security/csrf.ts` (baru, Issue 5) |
| Rate limiter | `src/lib/security/rate-limit.ts` (baru, Issue 6) |
| NIK crypto | `src/lib/security/nik-crypto.ts` (baru, Issue 4) |
| Validation schemas | `src/lib/validation/` (baru, Issue 7) |
