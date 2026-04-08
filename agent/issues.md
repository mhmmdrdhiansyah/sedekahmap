# SedekahMap — Issues Tracker

> Daftar task teknis untuk dieksekusi oleh programmer junior atau AI model.
> Setiap issue berisi konteks, instruksi langkah demi langkah, dan acceptance criteria.

---

## ISSUE-001: Refactor Layered Architecture — Service Layer Extraction

**Prioritas**: Tinggi (Technical Debt)
**Estimasi**: 2-3 jam
**Dependencies**: Tidak ada
**Branch**: `refactor/service-layer`

### Context

Saat ini project tidak memiliki **Service Layer**. Business logic dan database query bercampur langsung di API route controller dan `lib/auth.ts`. Akibatnya:

- API route melakukan validasi, query DB, dan format response dalam satu file
- Business logic sulit di-test tanpa HTTP context
- Filter query yang sama diduplikasi di beberapa route
- `lib/auth.ts` (seharusnya config murni) mengandung query DB

**Target arsitektur:**
```
Controller (app/api/) → Service (services/) → Persistence (db/)
```

### File yang Terpengaruh

| Status | File | Aksi |
|--------|------|------|
| BARU | `src/services/beneficiary-filters.ts` | Buat |
| BARU | `src/services/auth.service.ts` | Buat |
| BARU | `src/services/beneficiary.service.ts` | Buat |
| BARU | `src/services/user.service.ts` | Buat |
| EDIT | `src/lib/auth.ts` | Hapus DB query, pakai auth.service |
| EDIT | `src/app/api/auth/register/route.ts` | Thin controller |
| EDIT | `src/app/api/public/map-data/route.ts` | Thin controller |
| EDIT | `src/app/api/public/heatmap-data/route.ts` | Thin controller |

### File yang TIDAK berubah
- `src/lib/auth-utils.ts` — sudah bersih
- `src/lib/constants.ts` — tidak perlu perubahan
- `src/proxy.ts` — middleware, tidak perlu perubahan
- `src/app/api/auth/[...nextauth]/route.ts` — hanya import `handlers`
- `src/db/*` — semua schema dan koneksi tidak berubah
- `src/components/*` — semua komponen tidak berubah

---

### STEP 1: Buat `src/services/beneficiary-filters.ts`

**Tujuan:** Extract filter yang sama yang dipakai di `map-data` dan `heatmap-data`.

```typescript
// src/services/beneficiary-filters.ts

import { beneficiaries } from '@/db/schema/beneficiaries';
import { eq, and, or, isNull, gt, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

/**
 * Filter condition untuk beneficiary yang aktif dan verified.
 * - status = 'verified'
 * - DAN (expiresAt IS NULL ATAU expiresAt > NOW())
 */
export function activeVerifiedBeneficiaryFilter(): SQL {
  return and(
    eq(beneficiaries.status, 'verified'),
    or(
      isNull(beneficiaries.expiresAt),
      gt(beneficiaries.expiresAt, sql`NOW()`)
    )
  )!;
}
```

**Acceptance Criteria:**
- [ ] File bisa di-import tanpa error
- [ ] Return type adalah `SQL` dari drizzle-orm
- [ ] Filter logikanya sama persis dengan yang ada di route saat ini

---

### STEP 2: Buat `src/services/auth.service.ts`

**Tujuan:** Extract query DB dari `src/lib/auth.ts` agar auth config tidak bergantung langsung ke DB.

Buat file `src/services/auth.service.ts` dengan 3 fungsi:

**a) `findUserByEmail(email: string): Promise<UserWithPassword | null>`**
- Query `users` table by email
- Return full user row termasuk password hash, atau `null` jika tidak ditemukan
- Import: `db` dari `@/db`, `users` dari `@/db/schema/users`, `eq` dari `drizzle-orm`

**b) `getUserRolesAndPermissions(userId: string): Promise<UserRolesAndPermissions>`**
- Query `userRoles` JOIN `roles` untuk dapatkan role names
- Query `userRoles` JOIN `roles` JOIN `rolePermissions` JOIN `permissions` untuk dapatkan permission names
- Deduplicate permissions menggunakan `new Set()`
- Return `{ roles: string[], permissions: string[] }`
- Import: `userRoles`, `users` dari `@/db/schema/users`, `roles`, `rolePermissions` dari `@/db/schema/roles`, `permissions` dari `@/db/schema/permissions`

**c) `verifyPassword(plainText: string, hash: string): Promise<boolean>`**
- Thin wrapper `bcrypt.compare(plainText, hash)`
- Import: `bcrypt` dari `bcryptjs`

**Type definitions:**
```typescript
export interface UserWithPassword {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRolesAndPermissions {
  roles: string[];
  permissions: string[];
}
```

**Acceptance Criteria:**
- [ ] `findUserByEmail` return `null` jika user tidak ada
- [ ] `getUserRolesAndPermissions` return array kosong jika user tidak punya role/permission
- [ ] `verifyPassword` return `false` jika password salah
- [ ] Tidak ada import ke `next-auth`

---

### STEP 3: Buat `src/services/beneficiary.service.ts`

**Tujuan:** Extract query agregat peta dan heatmap dari route.

Buat file `src/services/beneficiary.service.ts` dengan 2 fungsi:

**a) `getPublicMapData(): Promise<RegionSummary[]>`**

Pindahkan seluruh query dari `src/app/api/public/map-data/route.ts`:
- `db.select()` dengan JOIN `beneficiaries` + `regions`
- Gunakan `activeVerifiedBeneficiaryFilter()` dari STEP 1 (bukan tulis ulang filter-nya)
- GROUP BY `regionCode`, `name`, `level`
- ORDER BY count DESC
- Transformasi hasil: `parseFloat(String(row.centerLat))` dan `parseFloat(String(row.centerLng))`

```typescript
export interface RegionSummary {
  regionCode: string;
  regionName: string;
  regionLevel: number;
  count: number;
  centerLat: number;
  centerLng: number;
}
```

**b) `getPublicHeatmapData(): Promise<HeatmapPoint[]>`**

Pindahkan seluruh query dari `src/app/api/public/heatmap-data/route.ts`:
- `db.select()` latitude dan longitude dari `beneficiaries`
- Gunakan `activeVerifiedBeneficiaryFilter()` dari STEP 1
- Terapkan privacy jitter: `JITTER_RANGE = 0.003`, `INTENSITY = 1.0`
- Return array of `HeatmapPoint` objects (bukan `number[][]`)

```typescript
export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}
```

**JANGAN lupa:** Import `activeVerifiedBeneficiaryFilter` dari `./beneficiary-filters`.

**Acceptance Criteria:**
- [ ] `getPublicMapData()` return array `RegionSummary` dengan data yang benar
- [ ] `getPublicHeatmapData()` return array `HeatmapPoint` dengan jitter yang diterapkan
- [ ] Filter yang sama digunakan di kedua fungsi (dari `beneficiary-filters.ts`)
- [ ] Tidak ada import ke `next/server`

---

### STEP 4: Buat `src/services/user.service.ts`

**Tujuan:** Extract seluruh logic registrasi dari route.

Buat file `src/services/user.service.ts` dengan:

**a) `validateRegisterInput(input: RegisterInput): ValidationError[]`**

Validasi field:
- `name`: string, min 2 karakter setelah trim
- `email`: string, harus mengandung `@`
- `password`: string, min 6 karakter
- `phone` (optional): jika ada, harus string
- `address` (optional): jika ada, harus string

Return array of `{ message: string }`. Array kosong jika semua valid.

```typescript
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}
```

**b) `registerUser(input: RegisterInput): Promise<RegisterOutput>`**

Alur yang harus diikuti (pindahkan dari route saat ini):
1. Panggil `validateRegisterInput()` — jika ada error, return `{ success: false, code: 'VALIDATION_FAILED', message: 'Validasi gagal', details: string[] }`
2. Normalisasi email: `toLowerCase().trim()`
3. Cek email unik di DB — jika sudah ada, return `{ success: false, code: 'EMAIL_ALREADY_EXISTS', message: 'Email sudah terdaftar' }`
4. Hash password dengan `bcrypt.hash(password, 12)`
5. Insert user ke DB — gunakan `ROLES.DONATUR` dari `@/lib/constants` untuk role lookup
6. Cari role `donatur` — jika tidak ada, rollback (delete user) dan return `{ success: false, code: 'ROLE_NOT_FOUND', message: 'Konfigurasi role tidak ditemukan...' }`
7. Insert ke `userRoles`
8. Return `{ success: true, user: {...} }`

```typescript
export interface RegisterResult {
  success: true;
  user: { id: string; name: string; email: string; phone: string | null; address: string | null; isActive: boolean; createdAt: Date };
}

export interface RegisterError {
  success: false;
  code: 'VALIDATION_FAILED' | 'EMAIL_ALREADY_EXISTS' | 'ROLE_NOT_FOUND' | 'INTERNAL_ERROR';
  message: string;
  details?: string[];
}

export type RegisterOutput = RegisterResult | RegisterError;
```

**Acceptance Criteria:**
- [ ] Validasi mengembalikan error message Bahasa Indonesia yang sama dengan saat ini
- [ ] Email dicek dengan case-insensitive
- [ ] Password di-hash dengan cost factor 12
- [ ] Role `donatur` di-assign otomatis
- [ ] Rollback bekerja jika role tidak ditemukan
- [ ] Error mapping: `VALIDATION_FAILED→400`, `EMAIL_ALREADY_EXISTS→409`, `ROLE_NOT_FOUND→500`, `INTERNAL_ERROR→500`

---

### STEP 5: Modifikasi `src/lib/auth.ts`

**Tujuan:** Hapus semua DB query dan bcrypt import, ganti dengan import dari `auth.service.ts`.

**Yang dihapus:**
- `import bcrypt from 'bcryptjs'`
- `import { db } from '@/db'`
- `import { users, userRoles } from '@/db/schema/users'`
- `import { roles, rolePermissions } from '@/db/schema/roles'`
- `import { permissions } from '@/db/schema/permissions'`
- `import { eq } from 'drizzle-orm'`
- Seluruh isi fungsi private `getUserRolesAndPermissions` (deklarasi fungsi + body)

**Yang ditambahkan:**
```typescript
import {
  findUserByEmail,
  getUserRolesAndPermissions,
  verifyPassword,
} from '@/services/auth.service';
```

**Yang diubah di authorize callback:**
- Ganti query DB user lookup dengan: `const user = await findUserByEmail(email);`
- Ganti `bcrypt.compare(...)` dengan: `const isPasswordValid = await verifyPassword(password, user.password);`
- Ganti panggilan `getUserRolesAndPermissions(user.id)` — sekarang import dari service
- Logic kondisi (`if (!user)`, `if (!user.isActive)`, `if (!isPasswordValid)`) tetap sama

**Yang TIDAK berubah:**
- Semua `declare module 'next-auth'` type augmentation
- Session strategy, maxAge, pages config
- `jwt` dan `session` callbacks
- Export: `handlers`, `signIn`, `signOut`, `auth`

**Acceptance Criteria:**
- [ ] `auth.ts` tidak import `bcryptjs`, `@/db`, atau schema apapun
- [ ] `handlers`, `signIn`, `signOut`, `auth` tetap di-export
- [ ] Login masih berfungsi (NextAuth authorize callback behavior tidak berubah)

---

### STEP 6: Modifikasi `src/app/api/auth/register/route.ts`

**Tujuan:** Ubah jadi thin controller yang hanya handle HTTP.

**Ganti seluruh isi file** dengan:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { registerUser, type RegisterInput } from '@/services/user.service';

export async function POST(request: NextRequest) {
  const body: RegisterInput = await request.json();
  const result = await registerUser(body);

  if (!result.success) {
    const statusCode: Record<string, number> = {
      VALIDATION_FAILED: 400,
      EMAIL_ALREADY_EXISTS: 409,
      ROLE_NOT_FOUND: 500,
      INTERNAL_ERROR: 500,
    };

    const status = statusCode[result.code] ?? 500;
    const responseBody: Record<string, unknown> = { error: result.message };

    if (result.details) {
      responseBody.details = result.details;
    }

    return NextResponse.json(responseBody, { status });
  }

  return NextResponse.json(
    { message: 'Registrasi berhasil', user: result.user },
    { status: 201 }
  );
}
```

**Acceptance Criteria:**
- [ ] File tidak import `bcryptjs`, `@/db`, atau schema apapun
- [ ] Response format identik dengan sebelumnya:
  - Success: `{ message: 'Registrasi berhasil', user: {...} }` status 201
  - Validation: `{ error: 'Validasi gagal', details: string[] }` status 400
  - Email exists: `{ error: 'Email sudah terdaftar' }` status 409
  - Error: `{ error: '...' }` status 500

---

### STEP 7: Modifikasi `src/app/api/public/map-data/route.ts`

**Tujuan:** Ubah jadi thin controller.

**Ganti seluruh isi file** dengan:

```typescript
import { NextResponse } from 'next/server';
import { getPublicMapData } from '@/services/beneficiary.service';

export async function GET() {
  try {
    const data = await getPublicMapData();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Public map data error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat data peta' },
      { status: 500 }
    );
  }
}
```

**Acceptance Criteria:**
- [ ] File tidak import `@/db` atau schema apapun
- [ ] Response format: `{ data: RegionSummary[] }` — sama seperti sebelumnya

---

### STEP 8: Modifikasi `src/app/api/public/heatmap-data/route.ts`

**Tujuan:** Ubah jadi thin controller.

**Ganti seluruh isi file** dengan:

```typescript
import { NextResponse } from 'next/server';
import { getPublicHeatmapData } from '@/services/beneficiary.service';

export async function GET() {
  try {
    const points = await getPublicHeatmapData();
    const data = points.map((p) => [p.lat, p.lng, p.intensity]);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Public heatmap data error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat data heatmap' },
      { status: 500 }
    );
  }
}
```

**Catatan:** Transformasi `HeatmapPoint[]` ke `number[][]` dilakukan di controller untuk menjaga backward compatibility dengan frontend yang sudah ada.

**Acceptance Criteria:**
- [ ] File tidak import `@/db` atau schema apapun
- [ ] Response format: `{ data: number[][] }` — sama seperti sebelumnya
- [ ] Privacy jitter masih diterapkan (logic-nya ada di service)

---

### Verifikasi Akhir

Setelah semua step selesai, jalankan:

```bash
# 1. Build check
npm run build

# 2. Lint check
npm run lint

# 3. Manual test — registrasi
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# 4. Manual test — map data
curl http://localhost:3000/api/public/map-data

# 5. Manual test — heatmap data
curl http://localhost:3000/api/public/heatmap-data

# 6. Login test — pastikan NextAuth masih berfungsi
# Buka halaman login dan coba login dengan akun admin
```

**Semua acceptance criteria harus pass sebelum issue dianggap selesai.**

---

### Diagram Arsitektur Hasil Refactoring

```
BEFORE:
  Route ──→ (validation + DB query + business logic + HTTP response) → DB

AFTER:
  Route ──→ Service ──→ DB
    ↑
  HTTP parse, status code mapping, response format
```

```
src/
├── app/api/                    ← CONTROLLER (HTTP only)
│   ├── auth/register/route.ts  ← thin: parse JSON → call registerUser() → format response
│   └── public/
│       ├── map-data/route.ts   ← thin: call getPublicMapData() → format response
│       └── heatmap-data/route.ts ← thin: call getPublicHeatmapData() → format response
├── services/                   ← BUSINESS LOGIC (baru)
│   ├── auth.service.ts         ← findUserByEmail, getUserRolesAndPermissions, verifyPassword
│   ├── user.service.ts         ← validateRegisterInput, registerUser
│   ├── beneficiary.service.ts  ← getPublicMapData, getPublicHeatmapData
│   └── beneficiary-filters.ts  ← activeVerifiedBeneficiaryFilter (shared)
├── db/                         ← PERSISTENCE (tidak berubah)
├── lib/                        ← UTILITIES (tidak berubah)
└── components/                 ← PRESENTATION (tidak berubah)
```
