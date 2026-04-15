buatkan issues.md di dalam folder agent yang berisi perencanaan untuk nanti di implementasikan oleh junior programmer atau ai model yang lebih murah.

Jelaskan tahapan-tahapan yang harus dilakukan untuk mengimplementasikan fitur ini, anggap nanti yang menggunakan implementasi adalah junior programmer atau model AI yang lebih murah

dari pull request ini, lihat file changes nya. lalu berikan saran dan kritik darimu tentang code yang dibuat jangan mengecek berputar putag saya sudah ada githubcli di terminal gunakan itu. dan apakah sudah sesuai best practice nya :
https://github.com/mhmmdrdhiansyah/sedekahmap/pull/17



--------------------------------------------------------------------------------------------------------------------
# Task: Tampilkan Ulasan di Halaman Publik

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
1. **Review service** (`src/services/review.service.ts`): Tambahkan:
   - `getPublicReviews(limit?)` — return reviews terbaru, include nama donatur, rating, content, area. **JANGAN** include nama target/NIK/alamat.

**Presentation Layer:**
2. **Public reviews API** (`src/app/api/public/reviews/route.ts`): Thin controller — GET, delegasi ke service
3. **ReviewCard component**: Card dengan rating bintang, teks, info area
4. **Update landing page**: Tambah section "Ulasan Terbaru"

**File target**: `src/services/review.service.ts` (update), `src/app/api/public/reviews/route.ts`, `src/components/reviews/ReviewCard.tsx`, update `src/app/(public)/page.tsx`
**AC**: Ulasan tampil tanpa data pribadi target. Route tidak import `@/db` atau `drizzle-orm`.

---

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