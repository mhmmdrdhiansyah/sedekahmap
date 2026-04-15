# SedekahMap

Platform distribusi sedekah tepat sasaran berbasis peta, dengan alur multi-role:

- Verifikator mengelola data penerima bantuan
- Donatur mengajukan akses, menyalurkan bantuan, upload bukti, dan menulis ulasan
- Admin melakukan review akses dan verifikasi bukti penyaluran

## 1) Arsitektur, Struktur Folder, dan Penamaan

Proyek ini menggunakan arsitektur berlapis:

- Presentation layer: halaman Next.js App Router + API Route handler
- Business logic layer: service di `src/services`
- Persistence layer: schema + query lewat Drizzle ORM

Prinsip penting:

- API route bersifat thin controller: parsing request, auth/permission check, panggil service, mapping error ke HTTP response
- Query database dan business rule dikerjakan di service
- Route tidak langsung menyentuh ORM/schema

Struktur folder utama:

```text
sedekahmap/
├─ src/
│  ├─ app/
│  │  ├─ (public)/                # Halaman publik
│  │  ├─ (auth)/                  # Login/register
│  │  ├─ (dashboard)/             # Dashboard per role (admin/donatur/verifikator)
│  │  ├─ api/                     # API routes (admin, donatur, verifikator, public, auth, cron)
│  │  ├─ unauthorized/            # Halaman akses ditolak
│  │  ├─ layout.tsx
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ ui/                      # Design system (Badge, Button, Card, Input, Modal, Select, Table, Toast)
│  │  ├─ filters/                 # Komponen filter data
│  │  ├─ layout/                  # Layout dan navigasi (sidebar, header)
│  │  ├─ map/                     # Komponen peta (Leaflet)
│  │  ├─ modals/                  # Modal dialogs
│  │  └─ reviews/                 # Komponen ulasan
│  ├─ hooks/                      # Custom hooks (useHeatmapData, useMapData, useStats)
│  ├─ lib/
│  │  ├─ auth.ts                  # Auth.js v5 config
│  │  ├─ auth-utils.ts            # Helper auth & permission check
│  │  ├─ constants.ts             # PERMISSIONS, ROLES, STATUS
│  │  └─ utils/                   # Utility functions (generate-code, dll)
│  ├─ services/                   # Business logic utama
│  ├─ db/
│  │  ├─ schema/                  # Definisi tabel dan relasi Drizzle
│  │  ├─ seed.ts                  # Seed data awal
│  │  └─ seed-admin-distributions.ts  # Seed data distribusi admin
│  └─ proxy.ts                    # Route protection (auth + role)
├─ scripts/                       # Migration scripts (village coordinates, dll)
├─ drizzle/                       # SQL migration output
├─ e2e/                           # End-to-end tests (Playwright)
├─ docs/best-practices/           # Pedoman coding dan arsitektur
└─ agent/                         # Perencanaan issue/task implementasi
```

Konvensi penamaan:

- Route handler: `route.ts`
- Next.js page: `page.tsx`
- Service: `*.service.ts` — file terpisah per domain (access-request, auth, beneficiary, distribution, donatur, review, upload, user, user-management, role-management, permission-management)
- Schema: entitas per file, misal `users.ts`, `distributions.ts`

## 2) API yang Tersedia

### Public API (`/api/public`)

| Endpoint | Method | Kegunaan |
|---|---|---|
| `/api/public/stats` | GET | Statistik publik |
| `/api/public/regions` | GET | Data wilayah/hirarki region + pencarian |
| `/api/public/geocode` | GET | Geocoding (3-layer cache: memory → DB → Nominatim) |
| `/api/public/heatmap-data` | GET | Data heatmap peta |
| `/api/public/map-data` | GET | Data marker/legend peta |
| `/api/public/beneficiaries-by-region` | GET | Daftar penerima per wilayah (privacy-aware) |
| `/api/public/reviews` | GET | Daftar ulasan distribusi |

### Auth API (`/api/auth`)

| Endpoint | Method | Kegunaan |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | Handler Auth.js (login/logout/callback) |
| `/api/auth/register` | POST | Registrasi user |

### Upload API

| Endpoint | Method | Kegunaan |
|---|---|---|
| `/api/upload` | POST | Upload foto bukti distribusi |

### Admin API (`/api/admin`)

| Endpoint | Method | Kegunaan |
|---|---|---|
| `/api/admin/distributions` | GET | List distribusi (filter status, pagination) |
| `/api/admin/distributions/[id]` | PATCH | Verifikasi atau tolak distribusi |
| `/api/admin/access-requests` | GET | List permintaan akses |
| `/api/admin/access-requests/[id]` | PATCH | Approve/reject permintaan akses |
| `/api/admin/users` | GET, POST | List dan tambah user |
| `/api/admin/users/[id]` | GET, PUT, PATCH, DELETE | Detail, update, nonaktifkan, hapus user |
| `/api/admin/users/roles` | GET, POST | List dan buat role |
| `/api/admin/users/roles/[id]` | GET, PUT, PATCH, DELETE | Detail, update, hapus role |
| `/api/admin/users/permissions` | GET, POST | List dan buat permission |
| `/api/admin/users/permissions/[id]` | GET, PUT, DELETE | Detail, update, hapus permission |

### Donatur API (`/api/donatur`)

| Endpoint | Method | Kegunaan |
|---|---|---|
| `/api/donatur/statistics` | GET | Statistik donatur |
| `/api/donatur/recent-requests` | GET | Permintaan akses terbaru |
| `/api/donatur/distributions` | GET | List distribusi milik donatur |
| `/api/donatur/distributions/by-code/[code]` | GET | Detail distribusi berdasar kode |
| `/api/donatur/distributions/[code]` | PATCH | Update bukti penyaluran |
| `/api/donatur/access-requests` | GET, POST | List dan buat permintaan akses |
| `/api/donatur/access-requests/[id]` | DELETE | Batalkan permintaan akses |
| `/api/donatur/reviews` | GET, POST | List dan buat ulasan distribusi |

### Verifikator API (`/api/verifikator`)

| Endpoint | Method | Kegunaan |
|---|---|---|
| `/api/verifikator/beneficiaries` | GET, POST | List dan tambah penerima |
| `/api/verifikator/beneficiaries/[id]` | GET, PUT, DELETE | Detail, update, hapus penerima |

### Cron API (`/api/cron`)

| Endpoint | Method | Kegunaan |
|---|---|---|
| `/api/cron/expire-beneficiaries` | POST, GET | Expire beneficiary yang sudah melewati deadline (dilindungi CRON_SECRET) |

### Ringkasan Akses

- Public: `/api/public/*`
- Auth.js internal: `/api/auth/*`
- Role-specific:
	- admin: `/api/admin/*`
	- donatur: `/api/donatur/*`
	- verifikator: `/api/verifikator/*`

## 3) Schema Database

Database menggunakan PostgreSQL dengan schema Drizzle di `src/db/schema`.

Tabel utama:

- `users`: akun pengguna, status aktif, profil dasar
- `roles`: master role (admin, verifikator, donatur)
- `permissions`: master permission per modul
- `user_roles`: junction user-role
- `role_permissions`: junction role-permission
- `regions`: master hirarki wilayah (provinsi sampai desa)
- `beneficiaries`: data penerima bantuan (dengan status lifecycle)
- `access_requests`: permintaan akses data penerima dari donatur
- `distributions`: data penyaluran bantuan + bukti foto + status verifikasi
- `reviews`: ulasan donatur terhadap distribusi selesai
- `village_coordinates`: cache koordinat desa untuk geocoding

Enum status penting:

- `beneficiary_status`: `verified`, `in_progress`, `completed`, `expired`
- `access_request_status`: `pending`, `approved`, `rejected`
- `distribution_status`: `pending_proof`, `pending_review`, `completed`, `rejected`

Relasi inti:

- User memiliki banyak role via `user_roles`
- Role memiliki banyak permission via `role_permissions`
- Donatur membuat `access_requests` dan `distributions`
- `distributions` terhubung ke `access_requests`, `beneficiaries`, dan reviewer admin
- `reviews` terhubung ke `distributions` dan donatur

## 4) Cara Setup Project

Prasyarat:

- Node.js 20+
- npm 10+
- PostgreSQL
- PostGIS extension

Langkah setup:

1. Install dependencies

```bash
npm install
```

2. Siapkan file environment

```bash
cp .env.example .env.local
```

3. Isi `.env.local` minimal:

```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/sedekahmap"
AUTH_SECRET="<generate-random-secret>"
AUTH_URL="http://localhost:3000"
```

4. Pastikan database sudah ada dan PostGIS aktif

```sql
CREATE DATABASE sedekahmap;
\c sedekahmap
CREATE EXTENSION IF NOT EXISTS postgis;
```

5. Push schema ke database

```bash
npm run db:push
```

6. Seed data awal (opsional tapi direkomendasikan)

```bash
npm run db:seed
npm run db:seed:admin
```

## 5) Stack yang Digunakan

- Framework fullstack: Next.js 16 (App Router)
- UI: React 19 + React Compiler
- Bahasa: TypeScript 5
- Database: PostgreSQL + PostGIS
- ORM: Drizzle ORM + Drizzle Kit
- Authentication: Auth.js v5 beta (Credentials Provider)
- Styling: Tailwind CSS v4
- Mapping: Leaflet + react-leaflet
- Test: Vitest + Playwright

## 6) Library Utama yang Digunakan

Dependencies inti:

- `next`, `react`, `react-dom`
- `next-auth`
- `drizzle-orm`, `drizzle-kit`, `postgres`
- `leaflet`, `react-leaflet`, `leaflet.heat`
- `bcryptjs`
- `babel-plugin-react-compiler`

Dev dependencies inti:

- `typescript`
- `eslint`, `eslint-config-next`
- `tailwindcss` v4, `@tailwindcss/postcss`
- `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/jest-dom`
- `@playwright/test`
- `happy-dom`
- `tsx`, `dotenv`

## 7) Cara Menjalankan Aplikasi

Mode development:

```bash
npm run dev
```

App akan berjalan di:

```text
http://localhost:3000
```

Mode production lokal:

```bash
npm run build
npm run start
```

## 8) Cara Menjalankan Test

Unit/Integration test (Vitest):

```bash
npm run test
```

Vitest UI:

```bash
npm run test:ui
```

Coverage:

```bash
npm run test:coverage
```

E2E test (Playwright):

```bash
npm run test:e2e
```

E2E UI mode:

```bash
npm run test:e2e:ui
```

## Tambahan Command DB

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```
