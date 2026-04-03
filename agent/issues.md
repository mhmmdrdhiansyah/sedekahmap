# Step 2 — Setup Database PostgreSQL + PostGIS (Laragon Windows)

## Konteks

Project SedekahMap membutuhkan database **PostgreSQL** dengan ekstensi **PostGIS** untuk fitur geospasial (peta, koordinat, pencarian radius). Developer menggunakan **Windows + Laragon** yang sudah terinstal PostgreSQL dan PostGIS, jadi **TIDAK** menggunakan Docker.

## Prasyarat

- Laragon sudah terinstal dan running di Windows
- PostgreSQL sudah aktif di Laragon (pastikan service PostgreSQL running di Laragon menu)
- PostGIS sudah terinstal sebagai extension PostgreSQL di Laragon

## Tahapan Implementasi

### 1. Verifikasi PostgreSQL Running di Laragon

1. Buka **Laragon** → klik **Start All** (atau pastikan PostgreSQL sudah running)
2. Buka **Terminal Laragon** (klik kanan tray icon → Terminal, atau tombol Terminal di Laragon)
3. Jalankan perintah ini untuk cek PostgreSQL aktif:
   ```bash
   psql -U postgres -c "SELECT version();"
   ```
4. Jika berhasil, akan muncul versi PostgreSQL. Catat versi nya.

> Jika `psql` tidak dikenali, pastikan path PostgreSQL Laragon (`C:\laragon\bin\postgresql\postgresql-X.X\bin`) sudah ada di System PATH, atau jalankan dari Laragon Terminal.

---

### 2. Buat Database `sedekahmap`

1. Di terminal Laragon, jalankan:
   ```bash
   psql -U postgres
   ```
2. Setelah masuk prompt `postgres=#`, jalankan perintah SQL:
   ```sql
   CREATE DATABASE sedekahmap;
   ```
3. Keluar dari psql:
   ```sql
   \q
   ```

---

### 3. Aktifkan Ekstensi PostGIS

1. Connect ke database `sedekahmap`:
   ```bash
   psql -U postgres -d sedekahmap
   ```
2. Aktifkan PostGIS:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Verifikasi PostGIS aktif:
   ```sql
   SELECT PostGIS_Version();
   ```
4. Harus mengembalikan versi PostGIS (contoh: `3.4 ...` atau `3.6 ...`). **Screenshot atau catat hasilnya.**
5. Keluar:
   ```sql
   \q
   ```

> **Jika PostGIS tidak ditemukan**: Ekstensi PostGIS belum terinstal di Laragon. Download PostGIS bundle yang sesuai dengan versi PostgreSQL kamu dari https://postgis.net/install/ dan install ke folder PostgreSQL Laragon.

---

### 4. Buat File `.env.local`

Buat file `.env.local` di **root project** (`d:\laragon\www\sedekahmap\.env.local`) dengan isi:

```env
# Database
DATABASE_URL="postgresql://postgres:@localhost:5432/sedekahmap"
```

**Penjelasan format `DATABASE_URL`:**
```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

- `postgres` = username default Laragon PostgreSQL
- Password kosong (default Laragon, tidak ada password) — jika kamu set password, tambahkan setelah `:`
- `localhost:5432` = host dan port default PostgreSQL
- `sedekahmap` = nama database yang baru dibuat

> **Jika PostgreSQL Laragon pakai port lain** (misalnya 5433), sesuaikan port-nya.

---

### 5. Buat File `.env.example`

Buat file `.env.example` di **root project** (`d:\laragon\www\sedekahmap\.env.example`) dengan isi:

```env
# Database - sesuaikan dengan konfigurasi lokal
DATABASE_URL="postgresql://postgres:@localhost:5432/sedekahmap"
```

File ini berfungsi sebagai **template** bagi developer lain yang clone project. Tidak berisi secret sesungguhnya.

---

### 6. Verifikasi `.gitignore`

Buka file `.gitignore` di root project. Pastikan sudah ada baris yang mengabaikan file env:

```
.env*
```

File `.gitignore` project ini **sudah** memiliki baris `.env*` di line 34, jadi **tidak perlu diubah**. File `.env.local` otomatis tidak akan ter-commit ke git.

---

## Acceptance Criteria

- [ ] PostgreSQL running di Laragon
- [ ] Database `sedekahmap` berhasil dibuat
- [ ] `SELECT PostGIS_Version();` mengembalikan versi PostGIS (bukan error)
- [ ] File `.env.local` ada di root project dengan `DATABASE_URL` yang benar
- [ ] File `.env.example` ada di root project sebagai template
- [ ] `.env.local` **tidak** ter-track oleh git (sudah ada di `.gitignore`)

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `psql` tidak dikenali | Gunakan Laragon Terminal, atau tambahkan `C:\laragon\bin\postgresql\postgresql-X.X\bin` ke System PATH |
| `CREATE EXTENSION postgis` error | PostGIS belum terinstal. Download dari postgis.net dan install ke folder PostgreSQL Laragon |
| Port 5432 sudah dipakai | Cek Laragon settings, ganti port PostgreSQL atau matikan service lain yang pakai port 5432 |
| Connection refused | Pastikan PostgreSQL service running di Laragon (hijau/aktif) |
