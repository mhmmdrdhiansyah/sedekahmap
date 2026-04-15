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
│  │  ├─ api/                     # API routes (admin, donatur, verifikator, public, auth)
│  │  ├─ layout.tsx
│  │  └─ globals.css
│  ├─ components/                 # Reusable UI components
│  ├─ hooks/                      # Custom hooks
│  ├─ lib/                        # Auth, constants, helpers
│  ├─ services/                   # Business logic utama
│  ├─ db/
│  │  ├─ schema/                  # Definisi tabel dan relasi Drizzle
│  │  └─ seed.ts                  # Seed data awal
│  └─ proxy.ts                    # Route protection (auth + role)
├─ drizzle/                       # SQL migration output
├─ e2e/                           # End-to-end tests (Playwright)
├─ docs/best-practices/           # Pedoman coding dan arsitektur
└─ agent/                         # Perencanaan issue/task implementasi
```

Konvensi penamaan:

- Route handler: `route.ts`
- Next.js page: `page.tsx`
- Service: `*.service.ts`
- Schema: entitas per file, misal `users.ts`, `distributions.ts`

## 2) API yang Tersedia

### Public API (`/api/public`)

| Endpoint | Method | Kegunaan |
|---|---|---|
| `/api/public/stats` | GET | Statistik publik |
| `/api/public/regions` | GET | Data wilayah/hirarki region |
| `/api/public/geocode` | GET | Geocoding (dengan cache) |
| `/api/public/heatmap-data` | GET | Data heatmap peta |
| `/api/public/map-data` | GET | Data marker/legend peta |
| `/api/public/beneficiaries-by-region` | GET | Daftar penerima per wilayah (privacy-aware) |

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

### Donatur API (`/api/donatur`)

| Endpoint | Method | Kegunaan |
|---|---|---|
| `/api/donatur/statistics` | GET | Statistik donatur |
| `/api/donatur/recent-requests` | GET | Permintaan akses terbaru |
| `/api/donatur/distributions` | GET | List distribusi milik donatur |
| `/api/donatur/distributions/by-code/[code]` | GET | Detail distribusi berdasar kode |
| `/api/donatur/distributions/[code]` | PATCH | Update bukti penyaluran |
| `/api/donatur/access-requests` | POST, GET | Buat dan list permintaan akses |
| `/api/donatur/access-requests/[id]` | GET | Detail permintaan akses |
| `/api/donatur/reviews` | POST, GET | Buat dan lihat ulasan distribusi |

### Verifikator API (`/api/verifikator`)

| Endpoint | Method | Kegunaan |
|---|---|---|
| `/api/verifikator/beneficiaries` | GET, POST | List dan tambah penerima |
| `/api/verifikator/beneficiaries/[id]` | GET, PUT, DELETE | Detail, update, hapus penerima |

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

- Framework fullstack: Next.js (App Router)
- UI: React
- Bahasa: TypeScript
- Database: PostgreSQL + PostGIS
- ORM: Drizzle ORM + Drizzle Kit
- Authentication: Auth.js / NextAuth v5 (Credentials Provider)
- Styling: Tailwind CSS
- Mapping: Leaflet + react-leaflet
- Test: Vitest + Playwright

## 6) Library Utama yang Digunakan

Dependencies inti:

- `next`, `react`, `react-dom`
- `next-auth`
- `drizzle-orm`, `drizzle-kit`, `postgres`
- `leaflet`, `react-leaflet`, `leaflet.heat`
- `bcryptjs`

Dev dependencies inti:

- `typescript`
- `eslint`, `eslint-config-next`
- `tailwindcss`, `@tailwindcss/postcss`
- `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/jest-dom`
- `@playwright/test`
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
