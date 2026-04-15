# Issues: Admin — Kelola User (CRUD)

> Dibuat: 2026-04-15
> Branch: `feat/distribution-service`
> Status: Planned

---

## Codebase Context (Ringkasan Analisis)

### Database Schema
- **`users`** (`src/db/schema/users.ts`): id, name, email, password (bcrypt), phone, address, isActive, timestamps
- **`user_roles`** (`src/db/schema/users.ts`): junction table (userId, roleId) — many-to-many user↔role
- **`roles`** (`src/db/schema/roles.ts`): id, name (admin/verifikator/donatur), description
- **`permissions`** (`src/db/schema/permissions.ts`): id, name (module:action), description, module

### Permission Constants (sudah ada di `src/lib/constants.ts:65-70`)
```typescript
USER_CREATE: 'user:create'
USER_READ: 'user:read'
USER_UPDATE: 'user:update'
USER_DELETE: 'user:delete'
USER_ASSIGN_ROLE: 'user:assign_role'
```

### API Route yang Sudah Ada (di `src/lib/constants.ts:34`)
```typescript
ADMIN_USERS: '/api/admin/users'
```

### Architecture Rules
- **Service layer**: Import `db` dari `@/db`, schema dari `@/db/schema/*`, ORM dari `drizzle-orm`
- **Route layer**: Import `next/server`, `next/navigation`, auth-utils. **DILARANG** import `@/db`, `drizzle-orm`, `bcryptjs`
- **Permission check**: `await requirePermission(PERMISSIONS.USER_READ)` di setiap route handler
- **Error handling**: Throw `Error()` dengan prefix `UNAUTHORIZED:` atau `FORBIDDEN:`, route layer map ke HTTP status
- **Pagination**: `{ data: T[], total: number }` dari service, response: `{ data, pagination: { limit, offset, total } }`
- **Indonesian messages**: Semua error message dalam Bahasa Indonesia

### UI Patterns (dari `admin/approvals/page.tsx`)
- Client component (`"use client"`)
- State: loading, error, data, total, pagination (limit/offset), modal states
- Fetch dengan `useEffect`, refresh setelah action
- Desktop: tabel, Mobile: card
- Filter tabs, status badges, action buttons
- Modal konfirmasi untuk destructive actions

### Sidebar (dari `admin/layout.tsx:14`)
Menu "Users" sudah ada di sidebar: `{ label: 'Users', path: '/admin/users', icon: 'user' }`

---

## Issue #1 — User Management Service
**Priority:** P0 (Critical) | **Effort:** M | **Estimate:** 2-3 jam

### Description
Buat service layer untuk semua business logic user management. Service ini menangani semua query DB, validasi, dan orchestration.

### Technical Details

**File:** `src/services/user-management.service.ts` (BARU)

**Fungsi yang harus dibuat:**

1. **`listUsers(filters?, pagination?)`**
   - Input: `{ search?: string, role?: string, isActive?: boolean }`, `{ limit: number, offset: number }`
   - Query: JOIN users → user_roles → roles, LEFT JOIN untuk include roles
   - Filter: search (name/email LIKE), role (by role name), isActive
   - Return: `{ data: UserWithRoles[], total: number }`
   - Password **TIDAK BOLEH** di-include di response

2. **`getUserById(id)`**
   - Input: user UUID
   - Query: JOIN users → user_roles → roles
   - Return: `UserWithRoles` atau throw Error "User tidak ditemukan"
   - Password **TIDAK BOLEH** di-include

3. **`createUser(data)`**
   - Input: `{ name, email, password, phone?, address?, roleIds: string[] }`
   - Validasi: email unique, minimal 1 role, password min 8 chars
   - Hash password menggunakan `bcryptjs` (import di service, BUKAN di route)
   - Insert ke `users`, lalu insert ke `user_roles` untuk setiap roleId
   - Validasi roleIds ada di database
   - Return: UserWithRoles (tanpa password)

4. **`updateUser(id, data)`**
   - Input: `{ name?, email?, phone?, address? }`
   - Validasi: jika email diubah, cek unique
   - Update hanya fields yang disediakan (partial update)
   - Return: UserWithRoles (tanpa password)

5. **`toggleUserActive(id)`**
   - Flip nilai `isActive` user
   - Return: { id, isActive }

6. **`assignRoles(userId, roleIds)`**
   - Input: userId (UUID), roleIds (string[])
   - Validasi: user exists, semua roleIds exists di database
   - Hapus semua user_roles lama, insert yang baru (delete + insert dalam satu operasi)
   - Return: UserWithRoles dengan roles terbaru

7. **`deleteUser(id)`**
   - Hapus user_roles dulu, lalu hapus user
   - Validasi: tidak bisa hapus diri sendiri
   - Return: { id, deleted: true }

**Types yang harus didefinisikan:**
```typescript
interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
}

interface PaginationParams {
  limit: number;
  offset: number;
}

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  roleIds: string[];
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface UserWithRoles {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roles: { id: string; name: string; description: string | null }[];
}
```

**Imports yang dibutuhkan:**
```typescript
import { eq, and, count, desc, like, or, sql, ilike } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { db } from '@/db';
import { users, userRoles } from '@/db/schema/users';
import { roles } from '@/db/schema/roles';
```

### Acceptance Criteria
- [ ] Semua fungsi terdefinisi dengan TypeScript types lengkap
- [ ] Password tidak pernah di-include di return values
- [ ] Email uniqueness check sebelum create/update
- [ ] Role validation sebelum assign
- [ ] Error messages dalam Bahasa Indonesia
- [ ] Tidak import `next/server`, `next/navigation`, atau `next/headers`
- [ ] Gunakan `hash` dari `bcryptjs` untuk password hashing

### Files
- **CREATE:** `src/services/user-management.service.ts`

### Dependencies
- Tidak ada (issue pertama)

---

## Issue #2 — Admin Users API (List & Create)
**Priority:** P0 (Critical) | **Effort:** S | **Estimate:** 1 jam

### Description
Buat API route untuk GET (list users) dan POST (create user). Thin controller pattern — parse request, call service, map errors.

### Technical Details

**File:** `src/app/api/admin/users/route.ts` (BARU)

**GET handler:**
```
GET /api/admin/users?search=xxx&role=admin&isActive=true&limit=20&offset=0
```
1. `await requirePermission(PERMISSIONS.USER_READ)`
2. Parse query params: search, role, isActive, limit (default 20, max 100), offset (default 0)
3. Call `listUsers(filters, pagination)`
4. Return: `{ data, pagination: { limit, offset, total } }`
5. Status: 200

**POST handler:**
```
POST /api/admin/users
Body: { name, email, password, phone?, address?, roleIds }
```
1. `await requirePermission(PERMISSIONS.USER_CREATE)`
2. Parse JSON body
3. Validasi required fields (name, email, password, roleIds)
4. Call `createUser(data)`
5. Return: `{ data: UserWithRoles }`
6. Status: 201

**Error mapping (SAMA PERSIS pattern existing):**
- `"UNAUTHORIZED"` → 401
- `"FORBIDDEN"` → 403
- `"tidak ditemukan"` → 404
- `"sudah terdaftar"` / `" sudah digunakan"` → 409
- default → 500

**Imports yang dibutuhkan:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { listUsers, createUser } from '@/services/user-management.service';
```

### Acceptance Criteria
- [ ] GET dengan filter & pagination berfungsi
- [ ] POST dengan validasi berfungsi
- [ ] Permission check di kedua handler
- [ ] Tidak import `@/db`, `drizzle-orm`, `bcryptjs`
- [ ] Error mapping ke HTTP status yang benar
- [ ] Response format konsisten: `{ data }` dan `{ data, pagination }`

### Files
- **CREATE:** `src/app/api/admin/users/route.ts`

### Dependencies
- Issue #1 (service layer)

---

## Issue #3 — Admin User Detail API (GET, PUT, PATCH, DELETE)
**Priority:** P0 (Critical) | **Effort:** S | **Estimate:** 1-1.5 jam

### Description
Buat API route untuk operasi pada single user. GET detail, PUT update profile, PATCH toggle active / assign roles, DELETE user.

### Technical Details

**File:** `src/app/api/admin/users/[id]/route.ts` (BARU)

**GET handler:**
```
GET /api/admin/users/:id
```
1. `await requirePermission(PERMISSIONS.USER_READ)`
2. Call `getUserById(id)`
3. Return: `{ data: UserWithRoles }`
4. Status: 200

**PUT handler:**
```
PUT /api/admin/users/:id
Body: { name?, email?, phone?, address? }
```
1. `await requirePermission(PERMISSIONS.USER_UPDATE)`
2. Parse JSON body
3. Call `updateUser(id, data)`
4. Return: `{ data: UserWithRoles }`
5. Status: 200

**PATCH handler (action-based pattern):**
```
PATCH /api/admin/users/:id
Body: { action: 'toggle_active' | 'assign_roles', roleIds?: string[] }
```
1. `await requirePermission(PERMISSIONS.USER_UPDATE)`
2. Untuk action `assign_roles`, tambahkan check: `await requirePermission(PERMISSIONS.USER_ASSIGN_ROLE)`
3. Parse body, validasi action
4. Call `toggleUserActive(id)` atau `assignRoles(id, roleIds)`
5. Return: `{ data }`
6. Status: 200

**DELETE handler:**
```
DELETE /api/admin/users/:id
```
1. `await requirePermission(PERMISSIONS.USER_DELETE)`
2. Call `deleteUser(id)`
3. Return: `{ data: { id, deleted: true } }`
4. Status: 200

**Dynamic params pattern (Next.js 15):**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ...
}
```

### Acceptance Criteria
- [ ] GET detail user berfungsi (tanpa password)
- [ ] PUT update profile berfungsi
- [ ] PATCH toggle active berfungsi
- [ ] PATCH assign roles berfungsi
- [ ] DELETE user berfungsi (tidak bisa hapus diri sendiri)
- [ ] Permission check yang sesuai di setiap handler
- [ ] Error mapping ke HTTP status yang benar
- [ ] Tidak import `@/db`, `drizzle-orm`, `bcryptjs`

### Files
- **CREATE:** `src/app/api/admin/users/[id]/route.ts`

### Dependencies
- Issue #1 (service layer)

---

## Issue #4 — Halaman Kelola User (UI)
**Priority:** P0 (Critical) | **Effort:** L | **Estimate:** 3-4 jam

### Description
Buat halaman admin untuk kelola user dengan tabel, search, filter, pagination, dan action modals (create, edit, assign roles, toggle active, delete).

### Technical Details

**File:** `src/app/(dashboard)/admin/users/page.tsx` (BARU)

**Komponen utama (SEMUA dalam satu file, sama pattern `approvals/page.tsx`):**

1. **Header**: Judul "Kelola Pengguna", tombol "+ Tambah User"
2. **Search bar**: Input search dengan debounce, filter dropdown (role, status aktif)
3. **Table (desktop)**:
   - Kolom: Nama, Email, Roles (badge), Status (badge aktif/nonaktif), Aksi
   - Pagination: "Menampilkan X-Y dari Z"
   - Tombol prev/next page
4. **Cards (mobile)**: Sama info, layout vertikal
5. **Action buttons per row**:
   - Edit (pencil icon) → buka modal edit
   - Assign Roles (shield icon) → buka modal roles
   - Toggle Active (toggle icon)
   - Delete (trash icon, warna merah) → konfirmasi modal
6. **Modal: Tambah/Edit User**:
   - Fields: Nama, Email, Password (hanya saat create), Phone, Address
   - Validasi client-side
   - Submit ke POST / PUT API
7. **Modal: Assign Roles**:
   - Checkbox list semua roles dari database
   - Fetch roles dari `/api/admin/users` atau endpoint terpisah
   - Submit ke PATCH API dengan action `assign_roles`
8. **Modal: Konfirmasi Delete**:
   - Pesan peringatan
   - Tombol batal & hapus

**State management:**
```typescript
const [users, setUsers] = useState<UserWithRoles[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [total, setTotal] = useState(0);
const [search, setSearch] = useState('');
const [filterRole, setFilterRole] = useState('');
const [filterActive, setFilterActive] = useState('');
const [page, setPage] = useState(1);
const limit = 10;

// Modal states
const [showCreateModal, setShowCreateModal] = useState(false);
const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
const [assigningUser, setAssigningUser] = useState<UserWithRoles | null>(null);
const [deletingUser, setDeletingUser] = useState<UserWithRoles | null>(null);
const [submitting, setSubmitting] = useState(false);
```

**Data fetching pattern:**
```typescript
useEffect(() => {
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterRole) params.set('role', filterRole);
      if (filterActive) params.set('isActive', filterActive);
      params.set('limit', String(limit));
      params.set('offset', String((page - 1) * limit));
      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      setUsers(json.data || []);
      setTotal(json.pagination?.total || 0);
    } catch (err) { ... }
    finally { setLoading(false); }
  };
  fetchUsers();
}, [search, filterRole, filterActive, page]);
```

**Role badge styling:**
```
admin → bg-red-100 text-red-700
verifikator → bg-blue-100 text-blue-700
donatur → bg-green-100 text-green-700
```

**Status badge styling:**
```
aktif → bg-green-100 text-green-700
nonaktif → bg-gray-100 text-gray-700
```

### Acceptance Criteria
- [ ] Tabel users dengan pagination berfungsi
- [ ] Search dan filter (role, status) berfungsi
- [ ] Responsive: tabel di desktop, card di mobile
- [ ] Modal create user berfungsi (dengan password field)
- [ ] Modal edit user berfungsi (tanpa password field)
- [ ] Modal assign roles berfungsi (checkbox list)
- [ ] Toggle active/nonaktif berfungsi
- [ ] Delete dengan konfirmasi berfungsi
- [ ] Loading state dan error state ditampilkan
- [ ] Empty state ketika tidak ada data
- [ ] Konsisten styling dengan halaman admin lainnya (approvals)

### Files
- **CREATE:** `src/app/(dashboard)/admin/users/page.tsx`

### Dependencies
- Issue #2 (API list & create)
- Issue #3 (API detail & actions)

---

## Dependency Graph

```
Issue #1 (Service)
  ├── Issue #2 (API List & Create)
  └── Issue #3 (API Detail)
         └── Issue #4 (UI Page) ← depends juga #2
```

**Recommended execution order:** #1 → #2 → #3 → #4

---

## Checklist Sebelum Mulai Coding

- [ ] Baca `src/services/access-request.service.ts` sebagai referensi service pattern
- [ ] Baca `src/app/api/admin/access-requests/route.ts` sebagai referensi API pattern
- [ ] Baca `src/app/api/admin/access-requests/[id]/route.ts` sebagai referensi detail API pattern
- [ ] Baca `src/app/(dashboard)/admin/approvals/page.tsx` sebagai referensi UI pattern
- [ ] Pahami schema `users.ts`, `roles.ts`, `permissions.ts`
- [ ] Jalankan `rtk npm run db:push` setelah selesai jika ada schema changes (tidak ada di fitur ini)

---

## Catatan untuk Implementor

1. **Jangan lupa**: Sidebar menu "Users" sudah ada di `admin/layout.tsx:14`, tidak perlu ditambahkan
2. **API route constant** `ADMIN_USERS: '/api/admin/users'` sudah ada di `constants.ts:34`
3. **Permission constants** sudah ada di `constants.ts:65-70`
4. **Password hashing** hanya boleh dilakukan di service layer, gunakan `import { hash } from 'bcryptjs'`
5. **JANGAN** pernah return password field di API response
6. **Ikuti pattern error handling** yang sudah ada — lihat `access-requests` routes
7. **Gunakan `"use client"`** untuk halaman UI karena butuh interactivity
8. **Tidak ada schema change** di fitur ini — semua tabel sudah ada
