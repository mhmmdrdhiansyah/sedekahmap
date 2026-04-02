# SedekahMap — Issues & Tasks

> Platform distribusi sedekah tepat sasaran berbasis peta.
> Scope awal: **Kabupaten Belitung Timur**.

---

## ISSUE-001: Initialize Next.js 16 Project

**Description**: Setup boilerplate Next.js 16.1.x dengan App Router, TypeScript, Tailwind CSS, dan ESLint. Gunakan `src/` directory untuk struktur project. Next.js 16 membutuhkan React 19 dan sudah termasuk React Compiler untuk optimalisasi performa.

**Versi Target (sesuai PRD)**:
- Node.js: v20.x LTS
- Next.js: v16.1.x (App Router) - latest stable
- React: v19.x (Next.js 16 requirement)
- React DOM: v19.x
- Tailwind CSS: v3.4.x

**Tasks**:
1. Jalankan perintah create-next-app untuk Next.js 16:
   ```bash
   npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
   ```
   > Catatan: Gunakan `@latest` untuk Next.js 16, atau `npx -y create-next-app@16` untuk spesifik versi 16
2. Verifikasi versi yang terinstall: Next.js 16.x dan React 19.x
3. Pastikan struktur folder menggunakan `src/app/` (App Router)
4. Verifikasi `npm run dev` berjalan tanpa error
5. Update `tailwind.config.ts` — tambahkan color palette brand (warna hijau/teal untuk tema sedekah)
6. (Optional) Aktifkan React Compiler di `next.config.ts`:
   ```typescript
   const nextConfig: NextConfig = {
     reactCompiler: true,
   }
   ```
7. Buat file `src/lib/constants.ts` untuk menyimpan konstanta global:
   - `APP_NAME = 'SedekahMap'`
   - Konstanta lain yang diperlukan

**Acceptance Criteria**:
- [ ] `npm run dev` → halaman default Next.js muncul di `localhost:3000`
- [ ] Package.json menunjukkan Next.js 16.x dan React 19.x
- [ ] Tailwind CSS berfungsi (coba tambah class `bg-red-500` di halaman)
- [ ] Struktur folder menggunakan `src/app/`
- [ ] Color palette brand sudah di-setup di `tailwind.config.ts`
- [ ] File `src/lib/constants.ts` sudah dibuat

**Dependencies**: None

**Referensi**: `query-docs("next.js", "create next app 16 with app router typescript tailwind")`

---

## Catatan Upgrade ke Next.js 16

Jika sudah ada project Next.js 14 dan ingin upgrade ke 16:

```bash
# Menggunakan codemod (recommended)
npx @next/codemod upgrade 16

# Atau manual
npm i next@latest react@latest react-dom@latest eslint-config-next@latest
npm i -D @types/react@latest @types/react-dom@latest
```

**Breaking Changes dari Next.js 14 ke 16**:
- React 19 required (bukan React 18)
- React Compiler available (experimental → stable)
- Turbopack configuration changed
- ESLint CLI changed dari `next lint` ke ESLint CLI native
- Middleware convention changed ke `proxy`
- Beberapa API `unstable_` sudah stable
