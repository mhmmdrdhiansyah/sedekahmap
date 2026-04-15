# Agent Instructions - sedekahmap

## Pre-Execution Checklist (Untuk Non-Trivial Tasks)

SEBELUM membuat kode untuk fitur/signifikan changes, agent HARUS:

1. **Cek Docs** - Gunakan context7 MCP:
   - Next.js: `resolve-library-id` → `query-docs` untuk topik relevan
   - Drizzle: `resolve-library-id` → `query-docs` untuk topik relevan
   - react-leaflet: `resolve-library-id` → `query-docs` untuk topik relevan
   - NextAuth: `resolve-library-id` → `query-docs` untuk topik relevan
   - [library lain yang relevan dengan task]

2. **Baca project conventions** di bawah ini

---

## Project-Specific Rules

### Next.js Breaking Changes
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

### Leaflet CRITICAL
Selalu import via `next/dynamic` dengan `ssr: false`. JANGAN import langsung.
```typescript
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
```

### Privacy Rules
Halaman publik tidak boleh menampilkan:
- NIK
- Nama asli
- Alamat detail target

Koordinat di-jitter untuk privacy.

### RBAC
Setiap API route HARUS check permission (bukan hanya role). Gunakan `requirePermission()`.

### Database Changes
Setelah schema changes: `npm run db:push`

### Layered Architecture (CRITICAL - WAJIB)

API route pattern:
```
Route (Presentation) → Service (Business Logic) → DB (Persistence)
```

**DILARANG di route file:**
- ❌ Import `@/db`
- ❌ Import `@/db/schema/*`
- ❌ Import `drizzle-orm`
- ❌ Import `bcryptjs`

**DILARANG di service file:**
- ❌ Import `next/server`
- ❌ Import `next/navigation`

Service layer handle:
- Semua query DB
- Validasi business logic
- Orchestration

Route file handle:
- Parse request
- Panggil service
- Map error ke HTTP status
- Return response

---

## When to Skip This Checklist

Task KECIL yang tidak perlu checklist:
- Typo fixes
- Simple style changes
- One-line imports
- Variable renames
- Comment additions

Gunakan judgment: jika task membutuhkan architectural decision atau involves multiple files → run checklist.
