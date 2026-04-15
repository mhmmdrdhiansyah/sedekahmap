# Auth Security Hardening — Implementation Issues

Dokumen ini adalah rencana implementasi terstruktur untuk memperbaiki kelemahan auth saat ini.
Target implementor: junior programmer atau AI model low-cost.

## Ringkasan Kondisi Saat Ini (hasil analisis codebase)

- Login memakai Auth.js v5 credentials + JWT 24 jam di src/lib/auth.ts.
- Register publik memakai service src/services/user.service.ts.
- Hashing masih memakai bcryptjs di:
  - src/services/auth.service.ts
  - src/services/user.service.ts
  - src/services/user-management.service.ts
  - src/db/seed.ts dan src/db/seed-admin-distributions.ts
- Password minimum tidak konsisten:
  - Register publik: minimal 6 (src/services/user.service.ts + src/app/(auth)/register/page.tsx)
  - Admin create user: minimal 8 (src/services/user-management.service.ts)
- Kolom emailVerifiedAt sudah ada di schema users, tapi belum dipakai di flow auth.
- Belum ada flow email verification, password reset, lockout, dan rate limiting auth.

## Prinsip Implementasi Wajib

- Ikuti arsitektur: Route (presentation) -> Service (business logic) -> DB (persistence).
- Route handler tetap thin controller: parse request, panggil service, map error.
- Route auth tidak boleh berisi query DB langsung.
- Gunakan requirePermission() untuk endpoint admin (tetap konsisten dengan project rules).
- Seluruh validasi password dipusatkan ke satu util agar tidak duplikatif.

## Urutan Implementasi yang Disarankan

1. Issue 1 (fondasi) -> 2 (hashing + password policy) -> 3 (email verification)
2. Issue 4 (password reset) -> 5 (lockout) -> 6 (rate limit)
3. Issue 7 (test, hardening, rollout)

---

## Issue 1 — Fondasi Auth Security (P0, Effort: 0.5-1 hari)

Description
- Siapkan struktur teknis dasar agar issue berikutnya lebih mudah dan minim regresi.

Technical details
- Tambahkan constants untuk security policy baru:
  - PASSWORD_MIN_LENGTH = 8
  - MAX_LOGIN_ATTEMPTS (contoh 5)
  - ACCOUNT_LOCK_MINUTES (contoh 15)
  - EMAIL_VERIFY_TOKEN_TTL_HOURS = 24
  - PASSWORD_RESET_TOKEN_TTL_MINUTES (contoh 30)
- Tambahkan util token aman (random + hashing token sebelum simpan ke DB).
- Tambahkan standar error class untuk auth security (opsional, bisa pakai error-mapper yang sudah ada).

Acceptance criteria
- [ ] Security constants terdefinisi jelas dan dipakai lintas service.
- [ ] Util generate + hash token tersedia dan teruji.
- [ ] Tidak ada hardcoded angka magic di service auth.

Files
- Update: src/lib/constants.ts
- New: src/lib/utils/security-tokens.ts
- (Opsional) Update: src/lib/http/error-mapper.ts

Dependencies
- Tidak ada.

---

## Issue 2 — Migrasi bcryptjs + Standarisasi Password (P0, Effort: 1 hari)

Description
- Ganti bcryptjs ke bcrypt (native async) untuk menurunkan blocking event loop.
- Samakan minimum password jadi 8 karakter di semua endpoint dan UI.

Technical details
- Dependency:
  - Remove: bcryptjs + @types/bcryptjs
  - Add: bcrypt + @types/bcrypt
- Ganti import dan pemakaian di semua file terkait auth + seeding.
- Terapkan policy password terpusat:
  - Validasi register publik dari 6 -> 8.
  - Validasi admin create user tetap 8, tapi gunakan util policy yang sama.
  - Update placeholder/error message UI register.
- Pastikan hash existing tetap kompatibel:
  - Hash format bcryptjs kompatibel untuk compare oleh bcrypt.

Acceptance criteria
- [ ] Tidak ada import bcryptjs di src/ dan scripts seed.
- [ ] Semua alur register/create user menolak password < 8.
- [ ] Login user lama tetap bisa (backward compatible hash format).
- [ ] Test lama yang mock bcryptjs sudah diperbarui ke bcrypt.

Files
- Update: package.json
- Update: src/services/auth.service.ts
- Update: src/services/user.service.ts
- Update: src/services/user-management.service.ts
- Update: src/app/(auth)/register/page.tsx
- Update: src/db/seed.ts
- Update: src/db/seed-admin-distributions.ts
- Update: src/services/__tests__/user.service.test.ts

Dependencies
- Setelah Issue 1.

---

## Issue 3 — Email Verification Flow (P0, Effort: 1.5-2 hari)

Description
- Implement verifikasi email agar akun register publik tidak langsung trusted.

Technical details
- Tambah tabel email_verification_tokens:
  - id (uuid)
  - user_id (fk users)
  - token_hash (text, unique)
  - expires_at (timestamp)
  - used_at (timestamp, nullable)
  - created_at
- Saat register:
  - Buat user + assign role donatur.
  - Generate verification token.
  - Simpan token_hash (jangan simpan token raw).
  - Kirim email berisi link verifikasi.
- Endpoint verifikasi (GET/POST):
  - Validasi token (hash compare).
  - Cek belum expired dan belum used.
  - Set users.emailVerifiedAt = now().
  - Tandai token used.
- Update authorize di Auth.js:
  - Tolak login jika emailVerifiedAt null (minimal untuk user donatur hasil register publik).
- Email provider:
  - Gunakan abstraction service (misalnya email.service.ts).
  - Implement provider pertama: Resend atau Nodemailer.
  - Untuk dev mode: fallback log link ke console jika provider belum aktif.

Acceptance criteria
- [ ] User register menerima token verifikasi valid 24 jam.
- [ ] Verifikasi sukses mengisi emailVerifiedAt.
- [ ] Token expired/used ditolak.
- [ ] User belum verifikasi tidak bisa login (pesan error jelas).
- [ ] Tidak ada token raw tersimpan di DB.

Files
- New: src/db/schema/emailVerificationTokens.ts
- Update: src/db/schema/index.ts
- New: drizzle/xxxx_email_verification_tokens.sql (via drizzle generate/push)
- Update: src/services/user.service.ts
- Update: src/services/auth.service.ts
- Update: src/lib/auth.ts
- New: src/services/email.service.ts
- New: src/services/email-verification.service.ts
- New: src/app/api/auth/verify-email/route.ts
- (Opsional UI) New/Update: src/app/(auth)/verify-email/page.tsx
- Update: .env.example

Dependencies
- Setelah Issue 2.

---

## Issue 4 — Password Reset Flow (P0, Effort: 1.5-2 hari)

Description
- Tambahkan alur lupa password yang aman dan anti user enumeration.

Technical details
- Tambah tabel password_reset_tokens:
  - id, user_id, token_hash, expires_at, used_at, created_at
- Endpoint 1: forgot password (POST)
  - Input: email
  - Selalu balas pesan generik sukses (jangan bocorkan email ada/tidak).
  - Jika user ada & aktif: buat token + kirim email reset.
- Endpoint 2: reset password (POST)
  - Input: token + newPassword
  - Validasi token valid, belum used, belum expired.
  - Validasi password policy (>=8).
  - Hash password baru.
  - Invalidate token (set used_at).
  - Opsional: invalidate session/JWT existing (minimal catat sebagai tech debt jika belum bisa immediate).
- Tambah halaman UI:
  - /forgot-password
  - /reset-password?token=...

Acceptance criteria
- [ ] User bisa request reset password tanpa bocor user existence.
- [ ] Token reset hanya sekali pakai dan punya expiry.
- [ ] Password baru mengikuti policy minimal 8.
- [ ] Setelah reset, login dengan password baru berhasil.

Files
- New: src/db/schema/passwordResetTokens.ts
- Update: src/db/schema/index.ts
- New: drizzle/xxxx_password_reset_tokens.sql
- New: src/services/password-reset.service.ts
- New: src/app/api/auth/forgot-password/route.ts
- New: src/app/api/auth/reset-password/route.ts
- New: src/app/(auth)/forgot-password/page.tsx
- New: src/app/(auth)/reset-password/page.tsx
- Update: .env.example

Dependencies
- Setelah Issue 2.

---

## Issue 5 — Account Lockout (P0, Effort: 1-1.5 hari)

Description
- Cegah brute force dengan mekanisme lock akun setelah N gagal login.

Technical details
- Tambah kolom pada users:
  - failedLoginAttempts (int, default 0)
  - lockedUntil (timestamp nullable)
  - lastFailedLoginAt (timestamp nullable)
- Pada authorize flow:
  - Sebelum compare password: cek lockedUntil > now -> tolak login.
  - Jika password salah:
    - increment failedLoginAttempts
    - jika mencapai threshold (misal 5), set lockedUntil = now + 15 menit
  - Jika login sukses:
    - reset failedLoginAttempts = 0
    - lockedUntil = null
- Pesan error jangan terlalu informatif (hindari membantu attacker).

Acceptance criteria
- [ ] Setelah N gagal login, akun terkunci sementara.
- [ ] Selama lock period, login valid tetap ditolak.
- [ ] Setelah lock period lewat, user bisa coba login lagi.
- [ ] Login sukses mereset counter.

Files
- Update: src/db/schema/users.ts
- New: drizzle/xxxx_users_lockout_fields.sql
- Update: src/services/auth.service.ts
- Update: src/lib/auth.ts

Dependencies
- Setelah Issue 2.

---

## Issue 6 — Rate Limiting Auth Endpoint (P0, Effort: 1-1.5 hari)

Description
- Tambahkan rate limit pada endpoint auth utama untuk menahan abuse.

Technical details
- Endpoint target minimal:
  - POST /api/auth/register
  - POST /api/auth/[...nextauth] (credentials login)
- Strategi key:
  - prioritas email (jika ada) + fallback IP
  - route-specific key (register dan login dipisah)
- Opsi implementasi (pilih satu, jangan campur):
  - Opsi A (direkomendasikan awal): DB-based sliding window sederhana
  - Opsi B: Redis/Upstash jika infrastruktur tersedia
- Integrasi response:
  - Return 429 dengan Retry-After (sudah didukung RateLimitError di error-mapper)

Acceptance criteria
- [ ] Burst request login/register dibatasi sesuai threshold.
- [ ] Response rate-limit konsisten status 429 + Retry-After.
- [ ] False positive rendah pada traffic normal.

Files
- New: src/services/rate-limit.service.ts
- Update: src/app/api/auth/register/route.ts
- Update: src/app/api/auth/[...nextauth]/route.ts (wrap handler untuk POST)
- (Jika DB strategy) New: src/db/schema/authRateLimits.ts
- (Jika DB strategy) Update: src/db/schema/index.ts
- (Jika DB strategy) New: drizzle/xxxx_auth_rate_limits.sql
- Update: src/lib/http/error-mapper.ts

Dependencies
- Setelah Issue 1.
- Sebaiknya setelah Issue 5 agar lockout + rate limit saling melengkapi.

---

## Issue 7 — Test, Hardening, dan Rollout Aman (P1, Effort: 1-1.5 hari)

Description
- Pastikan semua perubahan aman dirilis tanpa memutus alur login lama.

Technical details
- Unit test minimal:
  - auth.service: lockout logic, reset counter, compare password
  - user.service: register + email verification token creation
  - password-reset.service: token lifecycle
  - rate-limit.service: threshold + retry behavior
- Route/API test minimal:
  - register, verify-email, forgot-password, reset-password
  - nextauth POST saat locked/rate-limited
- Tambahkan logging security event:
  - login_failed, account_locked, password_reset_requested, password_reset_success, email_verified
- Tambahkan migration + rollback notes.
- Update dokumentasi env:
  - email provider key, app URL, dll.

Acceptance criteria
- [ ] Semua test utama lulus.
- [ ] Tidak ada lint/type error baru.
- [ ] Alur login normal tetap berjalan.
- [ ] Dokumentasi setup env untuk fitur baru tersedia.

Files
- Update: src/services/__tests__/*.test.ts (dan file test baru yang relevan)
- Update: README.md
- Update: .env.example
- (Opsional) New: docs/security-hardening-auth.md

Dependencies
- Setelah Issue 2-6.

---

## Checklist Eksekusi untuk Junior / AI Low-Cost

1. Kerjakan issue berurutan (jangan lompat) agar dependency aman.
2. Setelah setiap issue selesai:
   - Jalankan npm run lint
   - Jalankan npm run test
   - Jalankan npm run db:push (jika ada perubahan schema)
3. Buat PR kecil per issue (lebih mudah review dan rollback).
4. Untuk endpoint baru auth, pastikan error message tidak membocorkan data sensitif.
5. Saat implement rate limit + lockout, uji skenario normal agar tidak mengganggu user valid.

## Definisi Selesai (Definition of Done)

- Semua 5 masalah awal terselesaikan:
  - bcryptjs blocking -> diganti bcrypt async
  - email verification -> aktif dan enforced
  - password reset -> tersedia end-to-end
  - account lockout -> aktif berdasarkan threshold
  - password minimum -> konsisten 8 karakter di semua jalur
- Test coverage minimum untuk path kritis auth tersedia.
- Dokumentasi env + alur operasional diperbarui.
