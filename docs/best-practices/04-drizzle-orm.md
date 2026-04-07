# Drizzle ORM - Best Practices

## Apa Itu Drizzle ORM?

Drizzle adalah ORM (Object-Relational Mapping) untuk TypeScript/JavaScript. ORM adalah jembatan antara kode dan database - kita menulis kode TypeScript, Drizzle yang mengubahnya jadi SQL.

**Keunggulan Drizzle:**
- Type-safe queries (autocomplete & error checking)
- Lightweight (tidak bloated)
- SQL-like syntax (mudah dipahami jika tahu SQL)
- Support PostgreSQL, MySQL, SQLite

## Kapan Digunakan?

Dalam project SedekahMap:
- Semua interaksi dengan database PostgreSQL
- Definisi schema/tabel
- Query data (SELECT, INSERT, UPDATE, DELETE)
- Database migrations

---

## Rules Utama

### DO's (Lakukan)

1. **Definisikan schema di satu folder khusus** (`lib/db/schema/`)
2. **Gunakan Drizzle Kit untuk migrations**
3. **Selalu gunakan parameterized queries** (sudah otomatis di Drizzle)
4. **Index kolom yang sering di-query**

### DON'T's (Hindari)

1. **Jangan raw SQL kecuali terpaksa**
2. **Jangan skip migrations**
3. **Jangan query tanpa limit di production**

---

## Pattern & Contoh Kode

### Setup Database Connection

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(pool, { schema })
```

### Schema Definition

```typescript
// lib/db/schema/warga.ts
import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp,
  doublePrecision,
  pgEnum 
} from 'drizzle-orm/pg-core'

// Enum untuk status
export const wargaStatusEnum = pgEnum('warga_status', [
  'pending', 
  'verified', 
  'completed'
])

// Table definition
export const warga = pgTable('warga', {
  id: uuid('id').defaultRandom().primaryKey(),
  nama: varchar('nama', { length: 255 }).notNull(),
  nik: varchar('nik', { length: 16 }).notNull().unique(),
  alamat: text('alamat').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  kebutuhan: text('kebutuhan').notNull(),
  status: wargaStatusEnum('status').default('pending').notNull(),
  verifikatorId: uuid('verifikator_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Type inference dari schema
export type Warga = typeof warga.$inferSelect
export type NewWarga = typeof warga.$inferInsert
```

```typescript
// lib/db/schema/users.ts
import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', [
  'admin', 
  'verifikator', 
  'donatur'
])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  nama: varchar('nama', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

```typescript
// lib/db/schema/index.ts
// Export semua schema dari satu file
export * from './warga'
export * from './users'
export * from './donations'
```

### Basic Queries

```typescript
import { db } from '@/lib/db'
import { warga, users } from '@/lib/db/schema'
import { eq, and, or, like, desc, asc, count } from 'drizzle-orm'

// SELECT * FROM warga
const semuaWarga = await db.select().from(warga)

// SELECT * FROM warga WHERE id = ?
const satuWarga = await db
  .select()
  .from(warga)
  .where(eq(warga.id, 'uuid-here'))

// SELECT nama, alamat FROM warga
const namaAlamat = await db
  .select({
    nama: warga.nama,
    alamat: warga.alamat,
  })
  .from(warga)

// SELECT * FROM warga WHERE status = 'verified' ORDER BY created_at DESC
const wargaVerified = await db
  .select()
  .from(warga)
  .where(eq(warga.status, 'verified'))
  .orderBy(desc(warga.createdAt))

// SELECT * FROM warga LIMIT 10 OFFSET 0
const wargaPaginated = await db
  .select()
  .from(warga)
  .limit(10)
  .offset(0)
```

### Complex WHERE Conditions

```typescript
import { eq, and, or, like, gt, lt, between, isNull, isNotNull } from 'drizzle-orm'

// WHERE status = 'verified' AND kebutuhan LIKE '%sembako%'
const filtered = await db
  .select()
  .from(warga)
  .where(
    and(
      eq(warga.status, 'verified'),
      like(warga.kebutuhan, '%sembako%')
    )
  )

// WHERE status = 'pending' OR status = 'verified'
const multiStatus = await db
  .select()
  .from(warga)
  .where(
    or(
      eq(warga.status, 'pending'),
      eq(warga.status, 'verified')
    )
  )

// WHERE created_at > '2024-01-01'
const recent = await db
  .select()
  .from(warga)
  .where(gt(warga.createdAt, new Date('2024-01-01')))

// WHERE verifikator_id IS NOT NULL
const hasVerifikator = await db
  .select()
  .from(warga)
  .where(isNotNull(warga.verifikatorId))
```

### INSERT Data

```typescript
import { db } from '@/lib/db'
import { warga, type NewWarga } from '@/lib/db/schema'

// Insert satu data
const newWarga: NewWarga = {
  nama: 'Budi Santoso',
  nik: '1234567890123456',
  alamat: 'Jl. Contoh No. 1, Jakarta',
  lat: -6.2088,
  lng: 106.8456,
  kebutuhan: 'Sembako bulanan',
  status: 'pending',
}

const inserted = await db
  .insert(warga)
  .values(newWarga)
  .returning() // Return data yang baru diinsert

console.log(inserted[0].id) // UUID yang digenerate

// Insert multiple data
const banyakWarga: NewWarga[] = [
  { nama: 'Andi', nik: '111...', alamat: '...', lat: -6.1, lng: 106.8, kebutuhan: '...' },
  { nama: 'Beni', nik: '222...', alamat: '...', lat: -6.2, lng: 106.9, kebutuhan: '...' },
]

await db.insert(warga).values(banyakWarga)
```

### UPDATE Data

```typescript
import { db } from '@/lib/db'
import { warga } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// UPDATE warga SET status = 'verified' WHERE id = ?
const updated = await db
  .update(warga)
  .set({ 
    status: 'verified',
    updatedAt: new Date() 
  })
  .where(eq(warga.id, 'uuid-here'))
  .returning()

// Update multiple fields
await db
  .update(warga)
  .set({
    alamat: 'Alamat baru',
    kebutuhan: 'Kebutuhan updated',
    updatedAt: new Date(),
  })
  .where(eq(warga.id, 'uuid-here'))
```

### DELETE Data

```typescript
import { db } from '@/lib/db'
import { warga } from '@/lib/db/schema'
import { eq, and, lt } from 'drizzle-orm'

// DELETE FROM warga WHERE id = ?
await db
  .delete(warga)
  .where(eq(warga.id, 'uuid-here'))

// Soft delete pattern (lebih disarankan)
// Tambahkan kolom deletedAt di schema, lalu:
await db
  .update(warga)
  .set({ deletedAt: new Date() })
  .where(eq(warga.id, 'uuid-here'))
```

### JOIN Tables

```typescript
import { db } from '@/lib/db'
import { warga, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// INNER JOIN - hanya data yang ada di kedua tabel
const wargaDenganVerifikator = await db
  .select({
    wargaNama: warga.nama,
    wargaAlamat: warga.alamat,
    verifikatorNama: users.nama,
  })
  .from(warga)
  .innerJoin(users, eq(warga.verifikatorId, users.id))

// LEFT JOIN - semua warga, verifikator mungkin null
const semuaWargaDenganVerifikator = await db
  .select({
    warga: warga,
    verifikator: users,
  })
  .from(warga)
  .leftJoin(users, eq(warga.verifikatorId, users.id))
```

### Aggregation

```typescript
import { db } from '@/lib/db'
import { warga } from '@/lib/db/schema'
import { count, sum, avg, sql } from 'drizzle-orm'

// COUNT(*) FROM warga
const totalWarga = await db
  .select({ count: count() })
  .from(warga)

console.log(totalWarga[0].count) // number

// COUNT dengan GROUP BY
const countPerStatus = await db
  .select({
    status: warga.status,
    total: count(),
  })
  .from(warga)
  .groupBy(warga.status)

// Result: [{ status: 'pending', total: 10 }, { status: 'verified', total: 25 }]
```

### Transactions

```typescript
import { db } from '@/lib/db'
import { warga, donations } from '@/lib/db/schema'

// Transaction memastikan semua query berhasil atau semua dibatalkan
await db.transaction(async (tx) => {
  // Insert donasi
  const [donation] = await tx
    .insert(donations)
    .values({
      wargaId: 'uuid',
      donaturId: 'uuid',
      amount: 500000,
    })
    .returning()
  
  // Update status warga
  await tx
    .update(warga)
    .set({ status: 'completed' })
    .where(eq(warga.id, 'uuid'))
  
  // Jika salah satu gagal, semua dibatalkan (rollback)
})
```

### Prepared Statements (untuk performance)

```typescript
import { db } from '@/lib/db'
import { warga } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Prepared statement - di-compile sekali, dipakai berkali-kali
const getWargaById = db
  .select()
  .from(warga)
  .where(eq(warga.id, sql.placeholder('id')))
  .prepare('get_warga_by_id')

// Penggunaan
const result1 = await getWargaById.execute({ id: 'uuid-1' })
const result2 = await getWargaById.execute({ id: 'uuid-2' })
```

---

## Migrations dengan Drizzle Kit

### Setup drizzle.config.ts

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema/index.ts',
  out: './drizzle/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config
```

### Commands

```bash
# Generate migration dari perubahan schema
npx drizzle-kit generate:pg

# Jalankan migration ke database
npx drizzle-kit push:pg

# Buka Drizzle Studio (GUI untuk lihat database)
npx drizzle-kit studio
```

---

## Kesalahan Umum

### 1. Lupa await
```typescript
// SALAH - query tidak dijalankan
const data = db.select().from(warga)
console.log(data) // Promise, bukan hasil!

// BENAR
const data = await db.select().from(warga)
```

### 2. Query tanpa limit di production
```typescript
// SALAH - bisa return jutaan row
const semua = await db.select().from(warga)

// BENAR - selalu limit
const semua = await db.select().from(warga).limit(100)
```

### 3. N+1 Query Problem
```typescript
// SALAH - query dalam loop (N+1 problem)
const wargaList = await db.select().from(warga)
for (const w of wargaList) {
  const verifikator = await db
    .select()
    .from(users)
    .where(eq(users.id, w.verifikatorId)) // Query per item!
}

// BENAR - gunakan JOIN
const wargaWithVerifikator = await db
  .select()
  .from(warga)
  .leftJoin(users, eq(warga.verifikatorId, users.id))
```

---

## Referensi

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)
- [Drizzle with PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
