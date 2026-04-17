# Issues: Beneficiary Input - Verifikator Role

> **Target implementer:** Junior programmer atau AI model (Haiku/Sonnet)
> **Branch base:** `feat/distribution-service`
> **Tanggal dibuat:** 2026-04-16
> **Status:** Ready for implementation

---

## Daftar Isi

1. [Overview](#overview)
2. [Issue #1 - Approval Workflow (Data Pending)](#issue-1---approval-workflow-data-pending)
3. [Issue #2 - Enkripsi NIK](#issue-2---enkripsi-nik)
4. [Issue #3 - Audit Trail](#issue-3---audit-trail)
5. [Issue #4 - Soft Delete](#issue-4---soft-delete)
6. [Issue #5 - Pindahkan Server Component Query ke Service](#issue-5---pindahkan-server-component-query-ke-service)
7. [Issue #6 - Bulk Import CSV](#issue-6---bulk-import-csv)
8. [Urutan Implementasi (Dependency Order)](#urutan-implementasi)
9. [Testing Checklist](#testing-checklist)

---

## Overview

### Kondisi Saat Ini

Verifikator membuat data beneficiary langsung berstatus `verified` dan langsung muncul di peta publik. NIK disimpan plain text. Tidak ada audit trail, hard delete, dan query di Server Component tidak melalui service layer.

### File-File yang Terlibat

| File | Fungsi |
|------|--------|
| `src/db/schema/beneficiaries.ts` | Schema tabel beneficiaries |
| `src/services/beneficiary.service.ts` | Business logic CRUD beneficiary |
| `src/app/api/verifikator/beneficiaries/route.ts` | API GET list & POST create |
| `src/app/api/verifikator/beneficiaries/[id]/route.ts` | API GET/PUT/DELETE by ID |
| `src/app/(dashboard)/verifikator/page.tsx` | Dashboard - Server Component, query langsung ke DB |
| `src/app/(dashboard)/verifikator/data-saya/page.tsx` | Daftar data beneficiary (Client Component) |
| `src/app/(dashboard)/verifikator/data-saya/[id]/page.tsx` | Detail beneficiary |
| `src/app/(dashboard)/verifikator/edit/[id]/page.tsx` | Edit form beneficiary |
| `src/lib/auth-utils.ts` | `requirePermission()`, `requireRole()` |
| `src/lib/constants.ts` | PERMISSIONS dan ROLES constants |

### Arsitektur yang Harus Diikuti

```
Route (Presentation) → Service (Business Logic) → DB (Persistence)
```

- Route file: parse request, panggil service, return response
- Service file: semua query DB, validasi business logic
- **DILARANG** import `@/db` atau `drizzle-orm` di route file

---

## Issue #1 - Approval Workflow (Data Pending)

### Masalah

Data beneficiary baru langsung berstatus `verified` dan muncul di peta publik tanpa review admin. Verifikator bisa memasukkan data palsu.

### Solusi

Tambahkan status `pending` sebagai status awal. Admin harus approve sebelum data muncul di peta.

### Langkah Implementasi

#### Step 1.1 - Update Schema Beneficiaries

**File:** `src/db/schema/beneficiaries.ts`

Ubah status enum. Tambahkan status baru di awal array:

```typescript
// SEBELUM:
export const BENEFICIARY_STATUS = pgEnum('beneficiary_status', [
  'verified',
  'in_progress',
  'completed',
  'expired',
]);

// SESUDAH:
export const BENEFICIARY_STATUS = pgEnum('beneficiary_status', [
  'pending',        // BARU: menunggu approval admin
  'verified',
  'in_progress',
  'completed',
  'expired',
  'rejected',       // BARU: ditolak admin
]);
```

Tambahkan kolom baru di tabel beneficiaries:

```typescript
// Tambahkan kolom-kolom ini setelah kolom verifiedById:
approvedById: uuid('approved_by_id').references(() => users.id),
approvedAt: timestamp('approved_at', { withTimezone: true }),
rejectedById: uuid('rejected_by_id').references(() => users.id),
rejectedAt: timestamp('rejected_at', { withTimezone: true }),
rejectionReason: text('rejection_reason'),
```

Tambahkan index baru:

```typescript
// Tambahkan di array indexes:
index('idx_beneficiaries_approved_by_id').on(table.approvedById),
```

#### Step 1.2 - Update Beneficiary Service

**File:** `src/services/beneficiary.service.ts`

**A. Ubah `createBeneficiary`:**

```typescript
// SEBELUM: status default adalah 'verified'
// SESUDAH: status default adalah 'pending'

// Di dalam createBeneficiary, ubah insert:
await db.insert(beneficiaries).values({
  ...data,
  verifiedById: verifikatorId,
  // HAPUS: status: 'verified',   <-- jangan set status lagi
  // HAPUS: verifiedAt: new Date(),
  // HAPUS: expiresAt di sini (nanti di-set saat approve)
  // Biarkan default dari schema (tidak perlu set status, default-nya 'pending')
});
```

Catatan: ubah juga bahwa `verifiedById` sebaiknya jangan di-set saat create, karena data belum diverifikasi. Sebagai gantinya, gunakan field `createdById` (tambahkan kolom ini jika belum ada) atau tetap simpan di `verifiedById` tapi field ini hanya menandakan siapa yang menginput, bukan yang memverifikasi.

**Rekomendasi:** Tambahkan kolom `createdById` untuk tracking siapa verifikator yang menginput data:

```typescript
// Di schema, tambahkan:
createdById: uuid('created_by_id').references(() => users.id).notNull(),
```

Lalu di `createBeneficiary`:

```typescript
await db.insert(beneficiaries).values({
  ...data,
  createdById: verifikatorId,
  // status default 'pending' dari schema
});
```

**B. Tambahkan fungsi baru untuk Admin:**

```typescript
/**
 * Approve beneficiary - Admin only
 */
export async function approveBeneficiary(id: string, adminId: string) {
  const [beneficiary] = await db
    .update(beneficiaries)
    .set({
      status: 'verified',
      approvedById: adminId,
      approvedAt: new Date(),
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 bulan
    })
    .where(eq(beneficiaries.id, id))
    .returning();

  if (!beneficiary) throw new AppError('NOT_FOUND', 'Beneficiary tidak ditemukan');
  return beneficiary;
}

/**
 * Reject beneficiary - Admin only
 */
export async function rejectBeneficiary(
  id: string,
  adminId: string,
  reason: string
) {
  const [beneficiary] = await db
    .update(beneficiaries)
    .set({
      status: 'rejected',
      rejectedById: adminId,
      rejectedAt: new Date(),
      rejectionReason: reason,
    })
    .where(eq(beneficiaries.id, id))
    .returning();

  if (!beneficiary) throw new AppError('NOT_FOUND', 'Beneficiary tidak ditemukan');
  return beneficiary;
}

/**
 * Get pending beneficiaries - Admin only
 */
export async function getPendingBeneficiaries(page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const data = await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.status, 'pending'))
    .orderBy(desc(beneficiaries.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(beneficiaries)
    .where(eq(beneficiaries.status, 'pending'));

  return { data, total: count, page, totalPages: Math.ceil(count / limit) };
}
```

**C. Update `getPublicMapData` dan fungsi publik lainnya:**

Pastikan fungsi publik hanya mengembalikan data berstatus `verified` (bukan `pending` atau `rejected`). Cek semua query yang mengakses beneficiaries dan tambahkan filter `status = 'verified'` jika belum ada.

#### Step 1.3 - Buat API Route untuk Admin Approval

**Buat file baru:** `src/app/api/admin/beneficiaries/approve/route.ts`

```typescript
import { requireRole } from '@/lib/auth-utils';
import { approveBeneficiary } from '@/services/beneficiary.service';

export async function POST(request: Request) {
  try {
    const user = await requireRole('admin');
    const { id } = await request.json();

    if (!id) {
      return Response.json({ error: 'ID wajib diisi' }, { status: 400 });
    }

    const result = await approveBeneficiary(id, user.id);
    return Response.json({ data: result });
  } catch (error) {
    // map error ke HTTP status seperti pattern yang sudah ada
  }
}
```

**Buat file baru:** `src/app/api/admin/beneficiaries/reject/route.ts`

Pattern sama dengan approve, tapi menerima juga `reason`.

**Buat file baru:** `src/app/api/admin/beneficiaries/pending/route.ts`

GET route yang memanggil `getPendingBeneficiaries()`.

#### Step 1.4 - Buat Halaman Admin untuk Approval

**Buat file baru:** `src/app/(dashboard)/admin/approvals/page.tsx`

Halaman yang menampilkan daftar beneficiary dengan status `pending` dengan tombol Approve/Reject. Gunakan pattern yang sama dengan halaman approval yang sudah ada di `src/app/(dashboard)/admin/approvals/`.

#### Step 1.5 - Update Verifikator Dashboard

**File:** `src/app/(dashboard)/verifikator/page.tsx` dan `src/app/(dashboard)/verifikator/data-saya/page.tsx`

Tambahkan indikator status `pending` dan `rejected` di UI. Verifikator harus bisa melihat mana data yang masih pending, sudah approved, atau ditolak.

#### Step 1.6 - Update Permissions

**File:** `src/lib/constants.ts`

Tambahkan permission baru:

```typescript
BENEFICIARY_APPROVE: 'beneficiary:approve',
BENEFICIARY_REJECT: 'beneficiary:reject',
```

**File:** `src/db/seed.ts`

Tambahkan permission baru ke role admin:

```typescript
admin: [...existingPermissions, 'beneficiary:approve', 'beneficiary:reject'],
```

#### Step 1.7 - Jalankan Migration

```bash
npm run db:push
```

Lalu jalankan seed untuk menambahkan permission baru:

```bash
npm run db:seed
```

---

## Issue #2 - Enkripsi NIK

### Masalah

NIK disimpan plain text di database. Jika database di-breach, semua NIK terekspos. Melanggar UU PDP Indonesia.

### Solusi

Enkripsi NIK dengan AES-256-GCM. Simpan hash SHA-256 di kolom terpisah untuk uniqueness check.

### Langkah Implementasi

#### Step 2.1 - Buat Crypto Utility

**Buat file baru:** `src/lib/crypto.ts`

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Ambil dari environment variable ENCRYPTION_KEY (32 bytes = 256 bit)
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY environment variable belum di-set');
  return Buffer.from(key, 'hex');
}

/**
 * Enkripsi plaintext menggunakan AES-256-GCM
 * Returns format: "iv:authTag:ciphertext" (base64)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Dekripsi ciphertext yang di-enkripsi dengan encrypt()
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivB64, tagB64, encrypted] = ciphertext.split(':');

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash NIK untuk uniqueness check (SHA-256)
 * Hash ini one-way, tidak bisa didekripsi
 */
export function hashNIK(nik: string): string {
  return crypto.createHash('sha256').update(nik).digest('hex');
}
```

#### Step 2.2 - Tambahkan Environment Variable

**File:** `.env.local` (atau file environment yang digunakan)

```bash
# Generate dengan: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<hasil-generate-64-hex-chars>
```

**File:** `.env.example`

```bash
ENCRYPTION_KEY=  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Step 2.3 - Update Schema Beneficiaries

**File:** `src/db/schema/beneficiaries.ts`

```typescript
// Ubah kolom nik, tambahkan kolom nikHash:
// SEBELUM:
nik: text('nik').notNull(),

// SESUDAH:
nik: text('nik').notNull(),        // Akan berisi encrypted value
nikHash: varchar('nik_hash', { length: 64 }).notNull(),  // SHA-256 hash untuk uniqueness

// Tambahkan unique index:
// Di array indexes:
index('idx_beneficiaries_nik_hash').on(table.nikHash),
```

#### Step 2.4 - Update Beneficiary Service

**File:** `src/services/beneficiary.service.ts`

```typescript
import { encrypt, decrypt, hashNIK } from '@/lib/crypto';

// Di createBeneficiary:
export async function createBeneficiary(data: CreateBeneficiaryInput, verifikatorId: string) {
  const nikHash = hashNIK(data.nik);

  // Cek duplikat menggunakan hash
  const existing = await db
    .select({ id: beneficiaries.id })
    .from(beneficiaries)
    .where(eq(beneficiaries.nikHash, nikHash))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError('CONFLICT', 'NIK sudah terdaftar');
  }

  const encryptedNIK = encrypt(data.nik);

  const [beneficiary] = await db
    .insert(beneficiaries)
    .values({
      ...data,
      nik: encryptedNIK,     // Simpan encrypted NIK
      nikHash: nikHash,      // Simpan hash untuk uniqueness check
      createdById: verifikatorId,
    })
    .returning();

  return beneficiary;
}

// Di getBeneficiaryById - dekripsi NIK saat mengembalikan:
export async function getBeneficiaryById(id: string) {
  const [beneficiary] = await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.id, id));

  if (!beneficiary) throw new AppError('NOT_FOUND', 'Beneficiary tidak ditemukan');

  return {
    ...beneficiary,
    nik: decrypt(beneficiary.nik),  // Dekripsi untuk ditampilkan
  };
}

// Di updateBeneficiary - jika NIK diupdate, re-encrypt:
export async function updateBeneficiary(id: string, data: UpdateBeneficiaryInput) {
  const updateData: Record<string, any> = { ...data, updatedAt: new Date() };

  if (data.nik) {
    updateData.nik = encrypt(data.nik);
    updateData.nikHash = hashNIK(data.nik);

    // Cek duplikat
    const existing = await db
      .select({ id: beneficiaries.id })
      .from(beneficiaries)
      .where(
        and(
          eq(beneficiaries.nikHash, updateData.nikHash),
          ne(beneficiaries.id, id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new AppError('CONFLICT', 'NIK sudah terdaftar');
    }
  }

  const [beneficiary] = await db
    .update(beneficiaries)
    .set(updateData)
    .where(eq(beneficiaries.id, id))
    .returning();

  if (!beneficiary) throw new AppError('NOT_FOUND', 'Beneficiary tidak ditemukan');

  return {
    ...beneficiary,
    nik: decrypt(beneficiary.nik),
  };
}
```

**PENTING:** Fungsi `getPublicMapData` dan fungsi publik lainnya **JANGAN** mengembalikan NIK (bahkan yang sudah didekripsi). NIK hanya boleh diakses oleh verifikator pemilik data dan admin.

#### Step 2.5 - Buat Migration Script untuk Data yang Sudah Ada

**Buat file baru:** `scripts/encrypt-existing-nik.ts`

Script ini harus:
1. Ambil semua data beneficiary yang NIK-nya belum terenkripsi
2. Untuk setiap record, enkripsi NIK dan generate hash
3. Update record di database

```typescript
import { db } from '@/db';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { encrypt, hashNIK } from '@/lib/crypto';
import { isEncrypted } from '@/lib/crypto'; // helper function

async function main() {
  const all = await db.select().from(beneficiaries);

  for (const b of all) {
    // Skip jika sudah terenkripsi
    if (isEncrypted(b.nik)) continue;

    const encryptedNIK = encrypt(b.nik);
    const nikHash = hashNIK(b.nik);

    await db
      .update(beneficiaries)
      .set({ nik: encryptedNIK, nikHash: nikHash })
      .where(eq(beneficiaries.id, b.id));

    console.log(`Updated beneficiary ${b.id}`);
  }

  console.log('Done!');
}

main();
```

Tambahkan helper `isEncrypted` di `src/lib/crypto.ts`:

```typescript
/**
 * Cek apakah string sudah terenkripsi (format: "iv:tag:ciphertext")
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 3;
}
```

#### Step 2.6 - Jalankan Migration

```bash
# Push schema changes
npm run db:push

# Jalankan enkripsi data yang sudah ada
npx tsx scripts/encrypt-existing-nik.ts
```

---

## Issue #3 - Audit Trail

### Masalah

Edit dan delete beneficiary tidak meninggalkan catatan siapa yang mengubah apa dan kapan.

### Solusi

Buat tabel `audit_logs` dan utility untuk mencatat setiap perubahan data.

### Langkah Implementasi

#### Step 3.1 - Buat Schema Audit Logs

**Buat file baru:** `src/db/schema/auditLogs.ts`

```typescript
import { pgTable, uuid, text, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    // Nilai: 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SOFT_DELETE', 'RESTORE'
    tableName: varchar('table_name', { length: 100 }).notNull(),
    recordId: uuid('record_id').notNull(),
    oldValues: jsonb('old_values'),    // Data sebelum perubahan (null untuk CREATE)
    newValues: jsonb('new_values'),    // Data setelah perubahan (null untuk DELETE)
    ipAddress: varchar('ip_address', { length: 45 }),   // IPv6 compatible
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_logs_user_id').on(table.userId),
    index('idx_audit_logs_table_record').on(table.tableName, table.recordId),
    index('idx_audit_logs_action').on(table.action),
    index('idx_audit_logs_created_at').on(table.createdAt),
  ]
);
```

#### Step 3.2 - Export dari Schema Index

**File:** `src/db/schema/index.ts` (atau file yang men-export semua schema)

Tambahkan:

```typescript
export { auditLogs } from './auditLogs';
```

#### Step 3.3 - Buat Audit Service

**Buat file baru:** `src/services/audit.service.ts`

```typescript
import { db } from '@/db';
import { auditLogs } from '@/db/schema/auditLogs';
import { eq, desc, and, sql } from 'drizzle-orm';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'SOFT_DELETE'
  | 'RESTORE';

interface CreateAuditLogInput {
  userId: string;
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Catat audit log
 */
export async function createAuditLog(input: CreateAuditLogInput) {
  const [log] = await db
    .insert(auditLogs)
    .values({
      userId: input.userId,
      action: input.action,
      tableName: input.tableName,
      recordId: input.recordId,
      oldValues: input.oldValues ?? null,
      newValues: input.newValues ?? null,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    })
    .returning();

  return log;
}

/**
 * Ambil audit log untuk record tertentu
 */
export async function getAuditLogs(
  tableName: string,
  recordId: string,
  page = 1,
  limit = 20
) {
  const offset = (page - 1) * limit;

  const data = await db
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.tableName, tableName),
        eq(auditLogs.recordId, recordId)
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return data;
}
```

#### Step 3.4 - Integrasikan dengan Beneficiary Service

**File:** `src/services/beneficiary.service.ts`

Tambahkan pemanggilan `createAuditLog` di setiap operasi CRUD:

```typescript
import { createAuditLog } from './audit.service';

// Di createBeneficiary:
// Setelah insert berhasil:
await createAuditLog({
  userId: verifikatorId,
  action: 'CREATE',
  tableName: 'beneficiaries',
  recordId: beneficiary.id,
  newValues: { /* data yang baru di-insert, TANPA NIK plain text */ },
});

// Di updateBeneficiary:
// Ambil data lama SEBELUM update
const [oldData] = await db.select().from(beneficiaries).where(eq(beneficiaries.id, id));
// Setelah update berhasil:
await createAuditLog({
  userId: updaterId,
  action: 'UPDATE',
  tableName: 'beneficiaries',
  recordId: id,
  oldValues: { /* data lama, TANPA NIK plain text */ },
  newValues: { /* data baru, TANPA NIK plain text */ },
});

// Di deleteBeneficiary (soft delete - lihat Issue #4):
await createAuditLog({
  userId: deleterId,
  action: 'SOFT_DELETE',
  tableName: 'beneficiaries',
  recordId: id,
  oldValues: { /* data sebelum di-soft-delete */ },
});

// Di approveBeneficiary:
await createAuditLog({
  userId: adminId,
  action: 'APPROVE',
  tableName: 'beneficiaries',
  recordId: id,
});

// Di rejectBeneficiary:
await createAuditLog({
  userId: adminId,
  action: 'REJECT',
  tableName: 'beneficiaries',
  recordId: id,
  newValues: { rejectionReason: reason },
});
```

**PENTING:**
- `oldValues` dan `newValues` **JANGAN** menyimpan NIK plain text. Simpan `nikHash` saja, atau mask NIK.
- Fungsi `update` dan `delete` perlu menerima `userId` sebagai parameter agar tahu siapa yang melakukan aksi. Update signature function.

#### Step 3.5 - Buat API Route untuk Audit Logs (Admin)

**Buat file baru:** `src/app/api/admin/audit-logs/route.ts`

```typescript
// GET /api/admin/audit-logs?tableName=beneficiaries&recordId=xxx
// Hanya admin yang boleh mengakses
```

#### Step 3.6 - Jalankan Migration

```bash
npm run db:push
```

---

## Issue #4 - Soft Delete

### Masalah

`deleteBeneficiary` menghapus data permanen tanpa recovery.

### Solusi

Ubah hard delete menjadi soft delete dengan kolom `deletedAt`.

### Langkah Implementasi

#### Step 4.1 - Update Schema

**File:** `src/db/schema/beneficiaries.ts`

```typescript
// Tambahkan kolom:
deletedAt: timestamp('deleted_at', { withTimezone: true }),
deletedById: uuid('deleted_by_id').references(() => users.id),

// Tambahkan index:
index('idx_beneficiaries_deleted_at').on(table.deletedAt),
```

#### Step 4.2 - Update Beneficiary Service

**File:** `src/services/beneficiary.service.ts`

```typescript
// SEBELUM (hard delete):
export async function deleteBeneficiary(id: string) {
  await db.delete(beneficiaries).where(eq(beneficiaries.id, id));
}

// SESUDAH (soft delete):
export async function softDeleteBeneficiary(id: string, userId: string) {
  // Ambil data lama untuk audit
  const [oldData] = await db
    .select()
    .from(beneficiaries)
    .where(eq(beneficiaries.id, id));

  if (!oldData) throw new AppError('NOT_FOUND', 'Beneficiary tidak ditemukan');
  if (oldData.deletedAt) throw new AppError('CONFLICT', 'Data sudah dihapus');

  const [beneficiary] = await db
    .update(beneficiaries)
    .set({
      deletedAt: new Date(),
      deletedById: userId,
    })
    .where(eq(beneficiaries.id, id))
    .returning();

  // Catat audit log
  await createAuditLog({
    userId,
    action: 'SOFT_DELETE',
    tableName: 'beneficiaries',
    recordId: id,
    oldValues: sanitizeForAudit(oldData),
  });

  return beneficiary;
}

// Opsional: Fungsi restore untuk admin
export async function restoreBeneficiary(id: string, adminId: string) {
  const [beneficiary] = await db
    .update(beneficiaries)
    .set({
      deletedAt: null,
      deletedById: null,
    })
    .where(eq(beneficiaries.id, id))
    .returning();

  if (!beneficiary) throw new AppError('NOT_FOUND', 'Beneficiary tidak ditemukan');

  await createAuditLog({
    userId: adminId,
    action: 'RESTORE',
    tableName: 'beneficiaries',
    recordId: id,
  });

  return beneficiary;
}
```

#### Step 4.3 - Filter Data Terhapus di Semua Query

**File:** `src/services/beneficiary.service.ts`

Di **setiap** fungsi query yang mengakses tabel beneficiaries, tambahkan filter `deletedAt IS NULL`:

```typescript
import { isNull } from 'drizzle-orm';

// Contoh di getBeneficiariesByVerifikator:
const data = await db
  .select()
  .from(beneficiaries)
  .where(
    and(
      eq(beneficiaries.createdById, verifikatorId),
      isNull(beneficiaries.deletedAt)   // <-- tambahkan ini
    )
  );
```

Lakukan hal yang sama untuk:
- `getBeneficiaryById`
- `getPublicMapData`
- `getPublicHeatmapData`
- `getPublicStats`
- `getBeneficiariesByRegion`
- `getPendingBeneficiaries`
- Semua query lain yang membaca tabel beneficiaries

#### Step 4.4 - Update API Route

**File:** `src/app/api/verifikator/beneficiaries/[id]/route.ts`

Ubah DELETE handler:

```typescript
// SEBELUM:
await beneficiaryService.deleteBeneficiary(id);

// SESUDAH:
await beneficiaryService.softDeleteBeneficiary(id, user.id);
```

#### Step 4.5 - Update UI

**File:** `src/app/(dashboard)/verifikator/data-saya/page.tsx`

Ubah teks tombol/konfirmasi delete dari "Hapus" menjadi "Arsipkan" atau "Hapus Sementara" agar jelas bahwa data bisa dikembalikan.

#### Step 4.6 - Jalankan Migration

```bash
npm run db:push
```

---

## Issue #5 - Pindahkan Server Component Query ke Service

### Masalah

Verifikator dashboard (`page.tsx`) melakukan query DB langsung dari Server Component tanpa melalui service layer, melanggar pola arsitektur layered.

### Solusi

Buat fungsi service baru dan panggil dari Server Component.

### Langkah Implementasi

#### Step 5.1 - Identifikasi Query Langsung

**File:** `src/app/(dashboard)/verifikator/page.tsx`

Baca file ini dan identifikasi semua import dan query langsung ke database. Cari:
- `import { db } from '@/db'`
- `import { beneficiaries } from '@/db/schema/beneficiaries'`
- `import { eq, count, ... } from 'drizzle-orm'`
- Penggunaan `db.select()` langsung di dalam Server Component

#### Step 5.2 - Buat Fungsi Service Baru

**File:** `src/services/beneficiary.service.ts`

```typescript
/**
 * Get dashboard statistics untuk verifikator
 */
export async function getVerifikatorDashboardStats(verifikatorId: string) {
  const [{ total }] = await db
    .select({ total: sql`count(*)::int` })
    .from(beneficiaries)
    .where(
      and(
        eq(beneficiaries.createdById, verifikatorId),
        isNull(beneficiaries.deletedAt)
      )
    );

  const [{ pending }] = await db
    .select({ pending: sql`count(*)::int` })
    .from(beneficiaries)
    .where(
      and(
        eq(beneficiaries.createdById, verifikatorId),
        eq(beneficiaries.status, 'pending'),
        isNull(beneficiaries.deletedAt)
      )
    );

  const [{ verified }] = await db
    .select({ verified: sql`count(*)::int` })
    .from(beneficiaries)
    .where(
      and(
        eq(beneficiaries.createdById, verifikatorId),
        eq(beneficiaries.status, 'verified'),
        isNull(beneficiaries.deletedAt)
      )
    );

  const [{ inProgress }] = await db
    .select({ inProgress: sql`count(*)::int` })
    .from(beneficiaries)
    .where(
      and(
        eq(beneficiaries.createdById, verifikatorId),
        eq(beneficiaries.status, 'in_progress'),
        isNull(beneficiaries.deletedAt)
      )
    );

  return { total, pending, verified, inProgress };
}

/**
 * Get recent beneficiaries untuk verifikator dashboard
 */
export async function getRecentBeneficiariesByVerifikator(
  verifikatorId: string,
  limit = 5
) {
  return db
    .select({
      id: beneficiaries.id,
      name: beneficiaries.name,
      status: beneficiaries.status,
      regionName: beneficiaries.regionName,
      createdAt: beneficiaries.createdAt,
    })
    .from(beneficiaries)
    .where(
      and(
        eq(beneficiaries.createdById, verifikatorId),
        isNull(beneficiaries.deletedAt)
      )
    )
    .orderBy(desc(beneficiaries.createdAt))
    .limit(limit);
}
```

#### Step 5.3 - Update Server Component

**File:** `src/app/(dashboard)/verifikator/page.tsx`

```typescript
// HAPUS semua import ini:
// import { db } from '@/db'
// import { beneficiaries } from '@/db/schema/beneficiaries'
// import { eq, count, desc } from 'drizzle-orm'

// GANTI dengan:
import { getVerifikatorDashboardStats, getRecentBeneficiariesByVerifikator } from '@/services/beneficiary.service';

// Di dalam komponen:
export default async function VerifikatorDashboard() {
  const user = await getCurrentUser();
  // ... auth checks

  // SEBELUM: db.select().from(beneficiaries).where(...)
  // SESUDAH:
  const stats = await getVerifikatorDashboardStats(user.id);
  const recentData = await getRecentBeneficiariesByVerifikator(user.id);

  return (
    // ... JSX menggunakan stats.total, stats.pending, dll
  );
}
```

#### Step 5.4 - Cek Halaman Lain

Periksa semua Server Component lain yang mungkin melakukan query langsung:

```bash
# Cari file yang import langsung dari db/schema
grep -r "from '@/db'" src/app/ --include="*.tsx" --include="*.ts"
grep -r "from '@/db/schema" src/app/ --include="*.tsx" --include="*.ts"
```

Jika ada, lakukan pattern yang sama: pindahkan query ke service layer.

---

## Issue #6 - Bulk Import CSV

### Masalah

Memasukkan data beneficiary satu per satu tidak scalable untuk operasional lapangan.

### Solusi

Buat fitur bulk import CSV dengan validasi dan preview sebelum import.

### Langkah Implementasi

#### Step 6.1 - Install Dependencies

```bash
npm install papaparse
npm install -D @types/papaparse
```

#### Step 6.2 - Buat CSV Parser Utility

**Buat file baru:** `src/lib/csv-parser.ts`

```typescript
import Papa from 'papaparse';

export interface CSVBeneficiaryRow {
  nik: string;
  nama: string;
  alamat: string;
  kebutuhan: string;
  latitude: string;
  longitude: string;
  kodeWilayah: string;
  namaWilayah?: string;
  jalurWilayah?: string;
}

export interface CSVParseResult {
  valid: CSVBeneficiaryRow[];
  errors: { row: number; message: string }[];
  totalRows: number;
}

/**
 * Parse CSV string ke array beneficiary
 */
export function parseBeneficiaryCSV(csvContent: string): CSVParseResult {
  const result = Papa.parse<CSVBeneficiaryRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  });

  const valid: CSVBeneficiaryRow[] = [];
  const errors: { row: number; message: string }[] = [];

  result.data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 karena header dan 0-indexed
    const rowErrors: string[] = [];

    if (!row.nik || !/^\d{16}$/.test(row.nik)) {
      rowErrors.push('NIK harus 16 digit angka');
    }
    if (!row.nama?.trim()) {
      rowErrors.push('Nama wajib diisi');
    }
    if (!row.alamat?.trim()) {
      rowErrors.push('Alamat wajib diisi');
    }
    if (!row.kebutuhan?.trim()) {
      rowErrors.push('Kebutuhan wajib diisi');
    }
    if (!row.latitude || isNaN(Number(row.latitude))) {
      rowErrors.push('Latitude tidak valid');
    }
    if (!row.longitude || isNaN(Number(row.longitude))) {
      rowErrors.push('Longitude tidak valid');
    }
    if (!row.kodeWilayah?.trim()) {
      rowErrors.push('Kode Wilayah wajib diisi');
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, message: rowErrors.join('; ') });
    } else {
      valid.push(row);
    }
  });

  return {
    valid,
    errors,
    totalRows: result.data.length,
  };
}
```

#### Step 6.3 - Buat Bulk Import Service Function

**File:** `src/services/beneficiary.service.ts`

```typescript
import { parseBeneficiaryCSV, CSVBeneficiaryRow } from '@/lib/csv-parser';

interface BulkImportResult {
  success: number;
  failed: number;
  errors: { row: number; nik: string; message: string }[];
}

/**
 * Bulk import beneficiaries dari CSV
 */
export async function bulkImportBeneficiaries(
  rows: CSVBeneficiaryRow[],
  verifikatorId: string
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      await createBeneficiary(
        {
          nik: row.nik,
          name: row.nama,
          address: row.alamat,
          needs: row.kebutuhan,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          regionCode: row.kodeWilayah,
          regionName: row.namaWilayah,
          regionPath: row.jalurWilayah,
        },
        verifikatorId
      );
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({
        row: i + 2,
        nik: row.nik,
        message: error.message || 'Import gagal',
      });
    }
  }

  return result;
}
```

#### Step 6.4 - Buat API Route

**Buat file baru:** `src/app/api/verifikator/beneficiaries/import/route.ts`

```typescript
import { requireRole } from '@/lib/auth-utils';
import { parseBeneficiaryCSV } from '@/lib/csv-parser';
import { bulkImportBeneficiaries } from '@/services/beneficiary.service';

export async function POST(request: Request) {
  try {
    const user = await requireRole('verifikator');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'File CSV wajib diupload' }, { status: 400 });
    }

    // Validasi file type
    if (!file.name.endsWith('.csv')) {
      return Response.json({ error: 'Hanya file CSV yang didukung' }, { status: 400 });
    }

    // Validasi ukuran file (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'File maksimal 5MB' }, { status: 400 });
    }

    const csvContent = await file.text();
    const parsed = parseBeneficiaryCSV(csvContent);

    if (parsed.valid.length === 0) {
      return Response.json({
        error: 'Tidak ada data valid untuk diimport',
        parseErrors: parsed.errors,
      }, { status: 400 });
    }

    const result = await bulkImportBeneficiaries(parsed.valid, user.id);

    return Response.json({
      ...result,
      parseErrors: parsed.errors,
    });
  } catch (error) {
    // map error
  }
}
```

#### Step 6.5 - Buat UI Import

**Buat file baru:** `src/app/(dashboard)/verifikator/import/page.tsx`

Buat halaman dengan:
1. Upload area untuk file CSV (drag & drop)
2. Template CSV download link (agar verifikator tahu format yang benar)
3. Preview data sebelum import (tampilkan valid vs error)
4. Tombol "Import" yang memanggil API
5. Hasil import (berhasil/gagal per baris)

**Template CSV format:**

```csv
nik,nama,alamat,kebutuhan,latitude,longitude,kodeWilayah,namaWilayah,jalurWilayah
3201234567890001,John Doe,Jl. Merdeka No. 1,Bahan makanan,-6.2088,106.8456,32.01.01.01,Desa Contoh,"Jawa Barat > Kab. Contoh > Kec. Contoh > Desa Contoh"
```

#### Step 6.6 - Tambahkan Menu Link

**File:** `src/app/(dashboard)/verifikator/layout.tsx`

Tambahkan menu item "Import CSV" di sidebar yang mengarah ke `/verifikator/import`.

---

## Urutan Implementasi

Implementasi harus mengikuti urutan ini karena ada dependency antar issue:

```
Phase 1 (Foundations - tidak ada dependency)
├── Issue #3: Audit Trail        ← Buat tabel & service dulu
├── Issue #4: Soft Delete        ← Ubah schema & service
└── Issue #5: Service Layer      ← Pindahkan query ke service

Phase 2 (Data Protection - depends on Phase 1)
└── Issue #2: Enkripsi NIK       ← Butuh audit trail untuk log changes

Phase 3 (Workflow - depends on Phase 1 & 2)
└── Issue #1: Approval Workflow  ← Butuh semua di atas sudah siap

Phase 4 (Enhancement - depends on Phase 3)
└── Issue #6: Bulk Import CSV    ← Butuh approval workflow & enkripsi siap
```

### Detail Urutan Per File

1. **Schema changes** (semua sekaligus di awal):
   - `src/db/schema/beneficiaries.ts` - semua kolom baru (pending status, approvedBy, rejectedBy, nikHash, deletedAt, createdById)
   - `src/db/schema/auditLogs.ts` - tabel baru
   - `npm run db:push`

2. **Crypto utility**:
   - `src/lib/crypto.ts` - buat baru
   - `.env.local` - tambah ENCRYPTION_KEY

3. **Services**:
   - `src/services/audit.service.ts` - buat baru
   - `src/services/beneficiary.service.ts` - update semua fungsi

4. **API Routes**:
   - Update verifikator routes
   - Buat admin approval routes
   - Buat import route

5. **Frontend**:
   - Update verifikator dashboard
   - Buat admin approval page
   - Buat import CSV page

6. **Migration data existing**:
   - `scripts/encrypt-existing-nik.ts`
   - Jalankan script

---

## Testing Checklist

Setelah implementasi, pastikan semua test case berikut lulus:

### Approval Workflow
- [ ] Verifikator membuat data baru → status `pending` (bukan `verified`)
- [ ] Data `pending` **TIDAK** muncul di peta publik
- [ ] Admin bisa melihat daftar data pending
- [ ] Admin approve → status berubah ke `verified`, data muncul di peta
- [ ] Admin reject dengan alasan → status `rejected`
- [ ] Verifikator bisa lihat status data mereka (pending/approved/rejected)
- [ ] Verifikator bisa lihat alasan rejection jika ditolak

### Enkripsi NIK
- [ ] NIK baru di-enkripsi saat disimpan ke database
- [ ] NIK bisa didekripsi saat ditampilkan ke verifikator/admin
- [ ] NIK **TIDAK** muncul di response API publik
- [ ] NikHash digunakan untuk cek duplikat NIK
- [ ] Duplikat NIK ditolak dengan error 409
- [ ] Data NIK lama (plain text) berhasil di-migrasi ke encrypted

### Audit Trail
- [ ] CREATE beneficiary → audit log tercatat
- [ ] UPDATE beneficiary → audit log tercatat dengan old & new values
- [ ] SOFT_DELETE beneficiary → audit log tercatat
- [ ] APPROVE beneficiary → audit log tercatat
- [ ] REJECT beneficiary → audit log tercatat
- [ ] Audit log TIDAK menyimpan NIK plain text
- [ ] Admin bisa melihat audit log per record

### Soft Delete
- [ ] Delete beneficiary → data tidak hilang, hanya `deletedAt` terisi
- [ ] Data yang di-soft-delete **TIDAK** muncul di list/query
- [ ] Data yang di-soft-delete **TIDAK** muncul di peta publik
- [ ] Admin bisa restore data yang di-soft-delete

### Service Layer
- [ ] Verifikator dashboard TIDAK ada import dari `@/db` atau `@/db/schema/*`
- [ ] Semua query database melalui service layer
- [ ] Cek tidak ada import `drizzle-orm` di file route/dashboard

### Bulk Import
- [ ] Upload file CSV valid → data terimport dengan status `pending`
- [ ] Upload file bukan CSV → error
- [ ] Upload file > 5MB → error
- [ ] CSV dengan NIK duplikat → error pada baris tersebut, baris lain tetap diproses
- [ ] CSV dengan NIK tidak valid (bukan 16 digit) → error pada baris tersebut
- [ ] Download template CSV tersedia
- [ ] Preview data sebelum import

---

## Catatan untuk Implementer

1. **Satu issue per commit** - jangan gabungkan semua issue dalam satu commit besar
2. **Test manual** setelah setiap issue - jangan tunggu semua selesai
3. **Jangan skip `npm run db:push`** setelah schema changes
4. **Backup database** sebelum menjalankan migration script enkripsi NIK
5. **Jangan hardcode** ENCRYPTION_KEY - selalu dari environment variable
6. **Jangan log NIK plain text** di console.log atau audit log
7. **Error handling** - gunakan pattern AppError yang sudah ada di project
8. **TypeScript** - pastikan tidak ada `any` yang tidak perlu
9. **Lihat pattern yang sudah ada** - ikuti gaya kode yang sudah ada di project
