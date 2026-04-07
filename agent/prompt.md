buatkan issues.md di dalam folder agent yang berisi perencanaan untuk nanti di implementasikan oleh junior programmer atau ai model yang lebih murah.

Buat 2 API endpoint publik:
1. **`/api/public/map-data`**: Return jumlah beneficiaries per wilayah (GROUP BY region). Format: `{ regionCode, regionName, count, centerLat, centerLng }`. Filter hanya `verified` & belum expired. **JANGAN** return data pribadi (NIK, nama, alamat).
2. **`/api/public/heatmap-data`**: Return `[lat, lng, intensity]` untuk leaflet.heat. Koordinat harus di-**jitter** (tambah random offset kecil) agar tidak menunjuk lokasi presisi rumah.

**File target**: `src/app/api/public/map-data/route.ts`, `src/app/api/public/heatmap-data/route.ts`
**AC**: Response hanya data agregat, tidak ada PII.

Jelaskan tahapan-tahapan yang harus dilakukan untuk mengimplementasikan fitur ini, anggap nanti yang menggunakan implementasi adalah junior programmer atau model AI yang lebih murah

dari pull request ini, lihat file changes nya. lalu berikan saran dan kritik darimu tentang code yang dibuat jangan mengecek berputar putag saya sudah ada githubcli di terminal gunakan itu. dan apakah sudah sesuai best practice nya :
https://github.com/mhmmdrdhiansyah/sedekahmap/pull/17
