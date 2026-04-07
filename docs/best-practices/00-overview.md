# Overview - Best Practices SedekahMap

## Tentang Dokumentasi Ini

Folder ini berisi panduan best practices untuk semua teknologi yang digunakan di project SedekahMap. Ditulis dengan bahasa sederhana agar mudah dipahami oleh:
- Junior programmer yang baru bergabung
- AI assistant (model yang lebih ringan)
- Developer yang ingin quick reference

## Tech Stack Project Ini

| Kategori | Teknologi | Versi |
|----------|-----------|-------|
| Runtime | Node.js | v20.x LTS |
| Framework | Next.js (App Router) | v16.1.x |
| UI Library | React | v19.x |
| Database | PostgreSQL + PostGIS | v16.x + v3.6 |
| ORM | Drizzle ORM | v0.30.x |
| Styling | Tailwind CSS | v3.4.x |
| Mapping | Leaflet.js + react-leaflet | v1.9.4 + v4.2.x |
| Geospatial | @turf/turf | v6.5.x |
| Deployment | Docker + Docker Compose | latest |

## Cara Membaca Dokumentasi

Setiap file mengikuti struktur yang sama:

1. **Apa Itu [Teknologi]?** - Penjelasan singkat
2. **Kapan Digunakan?** - Konteks dalam project ini
3. **Rules Utama** - DO's dan DON'T's
4. **Pattern & Contoh Kode** - Implementasi yang benar
5. **Kesalahan Umum** - Error yang sering terjadi
6. **Referensi** - Link dokumentasi resmi

## Daftar File

| No | File | Topik |
|----|------|-------|
| 01 | `01-nextjs-app-router.md` | Routing, SSR, API Routes |
| 02 | `02-react-19.md` | Hooks, Components, State |
| 03 | `03-typescript.md` | Types, Interfaces, Conventions |
| 04 | `04-drizzle-orm.md` | Database queries, Migrations |
| 05 | `05-postgresql-postgis.md` | Geospatial database |
| 06 | `06-tailwindcss.md` | Styling patterns |
| 07 | `07-leaflet-react.md` | Map integration |
| 08 | `08-turf-geospatial.md` | Client-side geo calculations |
| 09 | `09-docker-deployment.md` | Container & deployment |
| 10 | `10-testing.md` | Unit, Integration, E2E testing |

## Konvensi Kode Umum

### Penamaan File
```
components/     -> PascalCase (MapView.tsx)
hooks/          -> camelCase dengan prefix "use" (useLocation.ts)
utils/          -> camelCase (formatDate.ts)
types/          -> PascalCase (User.ts)
```

### Penamaan Variabel
```typescript
// Konstanta global -> SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com'

// Variabel & fungsi -> camelCase
const userName = 'John'
function calculateDistance() {}

// Komponen React -> PascalCase
function MapContainer() {}

// Type & Interface -> PascalCase
type UserRole = 'admin' | 'verifikator' | 'donatur'
interface LocationData {}
```

### Import Order
```typescript
// 1. React & Next.js
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. Library eksternal
import { eq } from 'drizzle-orm'

// 3. Internal modules (absolute path)
import { db } from '@/lib/db'
import { Button } from '@/components/ui/Button'

// 4. Types
import type { User } from '@/types'
```

## Aturan Penting Project Ini

### 1. SSR Safety untuk Leaflet
Leaflet butuh `window` object. Next.js render di server dulu. Selalu gunakan dynamic import:

```typescript
// WAJIB seperti ini
import dynamic from 'next/dynamic'
const Map = dynamic(() => import('@/components/Map'), { ssr: false })
```

### 2. Data Privasi
- NIK dan data sensitif TIDAK BOLEH tampil di halaman publik
- Halaman publik hanya menampilkan data agregat (heatmap, jumlah per wilayah)
- Detail lokasi hanya terbuka setelah approval admin

### 3. Geospatial
- Selalu gunakan PostGIS untuk query lokasi di backend
- Gunakan Turf.js untuk kalkulasi di frontend (jarak, radius)
- Koordinat disimpan dalam format: `longitude, latitude` (x, y)

## Quick Links

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Leaflet Docs](https://leafletjs.com/reference.html)
- [PostGIS Docs](https://postgis.net/documentation/)
