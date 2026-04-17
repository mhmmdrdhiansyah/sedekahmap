buatkan issues.md di dalam folder agent yang berisi perencanaan untuk nanti di implementasikan oleh junior programmer atau ai model yang lebih murah.

tolong pecahkan dan berikan solusi untuk kekurangan sistem saya ini :
**Belum Siap Produksi dari Sisi Keamanan.** Upload file publik tanpa autentikasi, NIK disimpan plain text, tidak ada rate limiting, tidak ada CSRF protection, dan validasi file hanya berdasarkan MIME type dari client (bisa dipalsukan). Ini blocker utama untuk production.

**Tidak Ada Validasi Input Terpusat.** Semua validasi dilakukan manual di masing-masing route handler atau service. Tidak menggunakan Zod, Joi, atau Yup. Ini menyebabkan duplikasi kode dan potensi inkonsistensi validasi antara client-side dan server-side.

Jelaskan tahapan-tahapan yang harus dilakukan untuk mengimplementasikan permasalahan ini, anggap nanti yang menggunakan implementasi adalah junior programmer atau model AI yang lebih murah

dari pull request ini, lihat file changes nya. lalu berikan saran dan kritik darimu tentang code yang dibuat jangan mengecek berputar putag saya sudah ada githubcli di terminal gunakan itu. dan apakah sudah sesuai best practice nya :
https://github.com/mhmmdrdhiansyah/sedekahmap/pull/17



--------------------------------------------------------------------------------------------------------------------
# Task: Cron: Admin: Kelola User (CRUD)

## Instruksi Utama
Sebelum membuat kode, **WAJIB** lakukan analisis codebase terlebih dahulu untuk memahami:
1. Database schema yang sudah ada
2. Arsitektur dan patterns yang digunakan
3. Konvensi penamaan dan struktur folder
4. Error handling patterns
5. UI/UX patterns yang sudah diterapkan

---

## Deskripsi Fitur

**Business Logic Layer:**
1. **User management service** (`src/services/user-management.service.ts`): Fungsi:
   - `listUsers(filters?, pagination?)` — list users dengan pagination & filter role
   - `createUser(data)` — create user (admin/verifikator), hash password, assign roles
   - `updateUser(id, data)` — edit user, update roles
   - `toggleUserActive(id)` — aktifkan/nonaktifkan user
   - `assignRoles(userId, roleIds)` — assign/revoke roles

**Presentation Layer:**
2. **Admin users API** (`src/app/api/admin/users/route.ts`): Thin controller — GET list, POST create
3. **Admin user detail API** (`src/app/api/admin/users/[id]/route.ts`): Thin controller — GET, PUT, PATCH
4. **Halaman kelola user** (`/admin/users`): Tabel users dengan pagination & action buttons

**File target**: `src/services/user-management.service.ts`, `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts`, `src/app/(dashboard)/admin/users/page.tsx`
**AC**: CRUD user berfungsi, role assignment berfungsi. Route tidak import `@/db`, `bcryptjs`, atau `drizzle-orm`.



## Output yang Diharapkan

### 1. Analysis (opsional, bisa langsung di issues.md)
Identifikasi dari codebase existing untuk memahami context

### 2. Implementation Plan (`agent/issues.md`)
Buat breakdown issues dengan format:
- **Issue title** + priority + effort estimation
- **Description**: Apa yang harus dibuat
- **Technical details**: Berdasarkan analisis codebase
- **Acceptance criteria**: Checklist untuk validasi
- **Files**: File yang akan dibuat/dimodifikasi
- **Dependencies**: Issue mana yang harus selesai dulu

### 3. Source Code (setelah issues approved)
File-file yang disebutkan di deskripsi fitur

---

## Constraints & Acceptance Criteria

✅ **Must Have:**
- Follow existing architecture patterns
- Proper error handling
- TypeScript types yang lengkap
- UI konsisten dengan design system

⚠️ **Constraints:**
[TAMBAHKAN CONSTRAINT SPESIFIK DI SINI JIKA ADA]

---

## Notes untuk Implementor
- Pahami codebase dulu sebelum coding
- Buat issues.md yang detail
- Tanyakan jika ada yang ambigu