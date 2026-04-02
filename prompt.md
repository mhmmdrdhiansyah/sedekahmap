buatkan issues.md berisi planning untuk membuat ini :

cek PRD dan sesuaikan versinya untuk setiap langkah langkahnya:

1. Jalankan:
   ```bash
   npx -y create-next-app@14 ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
   ```
2. Pastikan struktur folder menggunakan `src/app/` (App Router)
3. Verifikasi `npm run dev` berjalan tanpa error
4. Update `tailwind.config.ts` — tambahkan color palette brand (bisa pakai warna hijau/biru untuk tema sedekah)
5. Buat file `src/lib/constants.ts` untuk menyimpan konstanta global (APP_NAME, dll)

**File yang dibuat/diubah**:
- Seluruh boilerplate Next.js
- `tailwind.config.ts`
- `src/lib/constants.ts`

**Acceptance Criteria**:
- [x] `npm run dev` → halaman default Next.js muncul di `localhost:3000`
- [x] Tailwind CSS berfungsi (coba tambah class `bg-red-500`)

**Referensi context7**: `query-docs("next.js", "create next app with app router typescript tailwind")`

jangan terlalu low level atau detail

cukup instrukriska secara high level

nanti document nya akan digunakan untuk diimpelemntasikan oleh programmer atau model yang murah