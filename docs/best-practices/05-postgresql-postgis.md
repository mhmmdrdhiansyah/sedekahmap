# PostgreSQL + PostGIS - Best Practices

## Apa Itu PostgreSQL & PostGIS?

**PostgreSQL** adalah database relasional open-source yang powerful dan reliable. Cocok untuk aplikasi yang butuh integritas data tinggi.

**PostGIS** adalah ekstensi PostgreSQL untuk data geospasial (peta, koordinat, wilayah). Dengan PostGIS, kita bisa:
- Menyimpan titik koordinat, garis, polygon
- Query berdasarkan jarak, radius, area
- Mencari lokasi dalam wilayah tertentu

## Kapan Digunakan?

Dalam project SedekahMap:
- Menyimpan koordinat lokasi warga (lat, lng)
- Mencari warga dalam radius tertentu
- Filter warga berdasarkan wilayah administratif
- Heatmap density calculation

---

## Rules Utama

### DO's (Lakukan)

1. **Selalu aktifkan PostGIS extension**
2. **Gunakan tipe `GEOGRAPHY` untuk koordinat bumi** (lebih akurat untuk jarak)
3. **Index kolom geometry/geography**
4. **Simpan koordinat dalam format `longitude, latitude`** (x, y)

### DON'T's (Hindari)

1. **Jangan simpan lat/lng sebagai string**
2. **Jangan query geospatial tanpa index**
3. **Jangan gunakan `GEOMETRY` jika butuh akurasi jarak global**

---

## Pattern & Contoh Kode

### Setup PostGIS Extension

```sql
-- Jalankan sekali saat setup database
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verifikasi
SELECT PostGIS_Version();
```

### Schema dengan PostGIS (Drizzle)

```typescript
// lib/db/schema/warga.ts
import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// Untuk PostGIS, kita perlu custom type
export const warga = pgTable('warga', {
  id: uuid('id').defaultRandom().primaryKey(),
  nama: varchar('nama', { length: 255 }).notNull(),
  alamat: text('alamat').notNull(),
  
  // Simpan sebagai GEOGRAPHY point
  // Format: POINT(longitude latitude)
  lokasi: sql`GEOGRAPHY(POINT, 4326)`.notNull(),
  
  // Atau simpan terpisah (lebih simple untuk query basic)
  lat: sql`DOUBLE PRECISION`.notNull(),
  lng: sql`DOUBLE PRECISION`.notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

### Alternatif: Schema dengan lat/lng Terpisah

```typescript
// Pendekatan lebih simple - lat/lng sebagai kolom biasa
// Cocok jika tidak butuh query geospatial kompleks

import { pgTable, uuid, varchar, doublePrecision } from 'drizzle-orm/pg-core'

export const warga = pgTable('warga', {
  id: uuid('id').defaultRandom().primaryKey(),
  nama: varchar('nama', { length: 255 }).notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
})
```

### Raw SQL untuk PostGIS Queries

Karena Drizzle belum support PostGIS secara native, gunakan `sql` template:

```typescript
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

// Mencari warga dalam radius 5 km dari titik tertentu
const centerLat = -6.2088
const centerLng = 106.8456
const radiusKm = 5

const wargaDalamRadius = await db.execute(sql`
  SELECT 
    id, 
    nama, 
    alamat,
    lat,
    lng,
    ST_Distance(
      lokasi,
      ST_SetSRID(ST_MakePoint(${centerLng}, ${centerLat}), 4326)::geography
    ) / 1000 as jarak_km
  FROM warga
  WHERE ST_DWithin(
    lokasi,
    ST_SetSRID(ST_MakePoint(${centerLng}, ${centerLat}), 4326)::geography,
    ${radiusKm * 1000}  -- dalam meter
  )
  ORDER BY jarak_km ASC
`)
```

### Query Berdasarkan Bounding Box

```typescript
// Mencari warga dalam kotak koordinat (untuk peta)
const wargaDalamBox = await db.execute(sql`
  SELECT id, nama, lat, lng
  FROM warga
  WHERE lat BETWEEN ${southLat} AND ${northLat}
    AND lng BETWEEN ${westLng} AND ${eastLng}
`)
```

### Menghitung Jarak antara Dua Titik

```typescript
// Jarak antara dua koordinat dalam kilometer
const jarak = await db.execute(sql`
  SELECT ST_Distance(
    ST_SetSRID(ST_MakePoint(${lng1}, ${lat1}), 4326)::geography,
    ST_SetSRID(ST_MakePoint(${lng2}, ${lat2}), 4326)::geography
  ) / 1000 as jarak_km
`)
```

### Mencari Titik Terdekat

```typescript
// 10 warga terdekat dari lokasi user
const terdekat = await db.execute(sql`
  SELECT 
    id, 
    nama,
    lat,
    lng,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(${userLng}, ${userLat}), 4326)::geography
    ) / 1000 as jarak_km
  FROM warga
  ORDER BY 
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography <-> 
    ST_SetSRID(ST_MakePoint(${userLng}, ${userLat}), 4326)::geography
  LIMIT 10
`)
```

### Point in Polygon (Cek apakah titik dalam wilayah)

```typescript
// Cek apakah koordinat ada dalam polygon wilayah
const dalamWilayah = await db.execute(sql`
  SELECT EXISTS(
    SELECT 1 FROM wilayah
    WHERE ST_Contains(
      geom,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
    )
    AND nama = ${namaWilayah}
  ) as dalam_wilayah
`)
```

### Agregasi untuk Heatmap

```typescript
// Hitung jumlah warga per grid (untuk heatmap)
const heatmapData = await db.execute(sql`
  SELECT 
    ST_SnapToGrid(
      ST_SetSRID(ST_MakePoint(lng, lat), 4326),
      0.01  -- Grid size ~1km
    ) as grid_point,
    COUNT(*) as jumlah,
    AVG(lat) as center_lat,
    AVG(lng) as center_lng
  FROM warga
  WHERE status = 'verified'
  GROUP BY grid_point
  HAVING COUNT(*) > 0
`)
```

---

## Index untuk Performance

```sql
-- Index untuk kolom geography (PENTING!)
CREATE INDEX idx_warga_lokasi ON warga USING GIST (lokasi);

-- Index untuk lat/lng jika pakai kolom terpisah
CREATE INDEX idx_warga_lat_lng ON warga (lat, lng);

-- Composite index untuk query dengan filter
CREATE INDEX idx_warga_status_lokasi ON warga (status) 
  WHERE status = 'verified';
```

---

## Data Wilayah Indonesia

Untuk filter wilayah administratif, simpan data hierarki:

```typescript
// lib/db/schema/wilayah.ts
export const provinsi = pgTable('provinsi', {
  id: varchar('id', { length: 2 }).primaryKey(), // Kode BPS
  nama: varchar('nama', { length: 255 }).notNull(),
})

export const kabupaten = pgTable('kabupaten', {
  id: varchar('id', { length: 4 }).primaryKey(),
  provinsiId: varchar('provinsi_id', { length: 2 }).references(() => provinsi.id),
  nama: varchar('nama', { length: 255 }).notNull(),
})

export const kecamatan = pgTable('kecamatan', {
  id: varchar('id', { length: 6 }).primaryKey(),
  kabupatenId: varchar('kabupaten_id', { length: 4 }).references(() => kabupaten.id),
  nama: varchar('nama', { length: 255 }).notNull(),
})

export const desa = pgTable('desa', {
  id: varchar('id', { length: 10 }).primaryKey(),
  kecamatanId: varchar('kecamatan_id', { length: 6 }).references(() => kecamatan.id),
  nama: varchar('nama', { length: 255 }).notNull(),
})
```

---

## Kesalahan Umum

### 1. Urutan Koordinat Salah
```sql
-- SALAH: lat, lng (y, x)
ST_MakePoint(-6.2088, 106.8456)

-- BENAR: lng, lat (x, y) - standar GeoJSON/PostGIS
ST_MakePoint(106.8456, -6.2088)
```

### 2. Tidak Specify SRID
```sql
-- SALAH: tanpa SRID
ST_MakePoint(106.8456, -6.2088)

-- BENAR: dengan SRID 4326 (WGS84 - standar GPS)
ST_SetSRID(ST_MakePoint(106.8456, -6.2088), 4326)
```

### 3. Geometry vs Geography
```sql
-- GEOMETRY: untuk bidang datar, unit dalam degree
-- GEOGRAPHY: untuk bola bumi, unit dalam meter (lebih akurat untuk jarak)

-- Gunakan geography untuk aplikasi peta
lokasi GEOGRAPHY(POINT, 4326)
```

### 4. Query Tanpa Index
```sql
-- Pastikan ada GIST index sebelum query geospatial
CREATE INDEX idx_lokasi ON warga USING GIST (lokasi);
```

---

## Cheat Sheet PostGIS Functions

| Function | Kegunaan |
|----------|----------|
| `ST_MakePoint(x, y)` | Buat point dari koordinat |
| `ST_SetSRID(geom, srid)` | Set coordinate reference system |
| `ST_Distance(a, b)` | Jarak antara dua geometry |
| `ST_DWithin(a, b, distance)` | Cek dalam radius |
| `ST_Contains(polygon, point)` | Cek point dalam polygon |
| `ST_Intersects(a, b)` | Cek dua geometry berpotongan |
| `ST_AsGeoJSON(geom)` | Convert ke GeoJSON |
| `ST_GeomFromGeoJSON(json)` | Parse dari GeoJSON |
| `ST_X(point)`, `ST_Y(point)` | Extract X (lng) dan Y (lat) |

---

## Referensi

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [PostGIS Reference](https://postgis.net/docs/reference.html)
- [Spatial Reference (SRID)](https://spatialreference.org/ref/epsg/4326/)
