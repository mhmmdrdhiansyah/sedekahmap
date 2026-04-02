# SedekahMap — Issues & Tasks

> Platform distribusi sedekah tepat sasaran berbasis peta.
> Scope awal: **Kabupaten Belitung Timur**.

---

## ISSUE-001: Initialize Next.js 14 Project

**Description**: Setup boilerplate Next.js 14.2.x dengan App Router, TypeScript, Tailwind CSS, dan ESLint. Gunakan `src/` directory untuk struktur project.

**Versi Target (sesuai PRD)**:
- Node.js: v20.x LTS
- Next.js: v14.2.x (App Router)
- React: v18.2.x
- Tailwind CSS: v3.4.x

**Tasks**:
1. Jalankan perintah create-next-app:
   ```bash
   npx -y create-next-app@14 ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
   ```
2. Pastikan struktur folder menggunakan `src/app/` (App Router)
3. Verifikasi `npm run dev` berjalan tanpa error
4. Update `tailwind.config.ts` — tambahkan color palette brand (warna hijau/teal untuk tema sedekah)
5. Buat file `src/lib/constants.ts` untuk menyimpan konstanta global:
   - `APP_NAME = 'SedekahMap'`
   - Konstanta lain yang diperlukan

**Acceptance Criteria**:
- [ ] `npm run dev` → halaman default Next.js muncul di `localhost:3000`
- [ ] Tailwind CSS berfungsi (coba tambah class `bg-red-500` di halaman)
- [ ] Struktur folder menggunakan `src/app/`
- [ ] Color palette brand sudah di-setup di `tailwind.config.ts`
- [ ] File `src/lib/constants.ts` sudah dibuat

**Dependencies**: None

**Referensi**: `query-docs("next.js", "create next app with app router typescript tailwind")`
