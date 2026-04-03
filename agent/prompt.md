buatkan issues2.md di dalam folder agent yang berisi perencanaan untuk perbaikan nanti di implementasikan oleh junior programmer atau ai model yang lebih murah.

Buat `docker-compose.yml` dengan service PostgreSQL 16 + PostGIS 3.4 (`postgis/postgis:16-3.4`). Buat `.env.local` dan `.env.example` dengan `DATABASE_URL`. Pastikan `.env.local` ada di `.gitignore`.

**File target**: `docker-compose.yml`, `.env.local`, `.env.example`
**AC**: Container running, `SELECT PostGIS_Version();` mengembalikan hasil.

Jelaskan tahapan-tahapan yang harus dilakukan untuk mengimplementasikan fitur ini, anggap nanti yang menggunakan implementasi adalah junior programmer atau model AI yang lebih murah
