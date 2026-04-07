# Next.js App Router - Best Practices

## Apa Itu Next.js App Router?

Next.js adalah framework React untuk membangun aplikasi web fullstack. App Router adalah sistem routing baru (mulai Next.js 13+) yang menggunakan folder `app/` sebagai basis routing.

**Keunggulan utama:**
- Server-Side Rendering (SSR) otomatis
- SEO-friendly
- API routes built-in
- File-based routing

## Kapan Digunakan?

Dalam project SedekahMap:
- Semua halaman web (publik & dashboard)
- API endpoints untuk komunikasi frontend-backend
- Middleware untuk proteksi route

---

## Rules Utama

### DO's (Lakukan)

1. **Gunakan Server Components secara default**
   - Komponen di App Router adalah Server Component by default
   - Lebih efisien karena tidak mengirim JavaScript ke client

2. **Gunakan `'use client'` hanya jika perlu**
   - Hanya untuk komponen yang butuh interaktivitas (useState, useEffect, event handlers)

3. **Pisahkan data fetching di Server Components**
   - Fetch data di level page/layout, bukan di client components

4. **Gunakan `loading.tsx` dan `error.tsx`**
   - Untuk handling loading state dan error secara otomatis

### DON'T's (Hindari)

1. **Jangan fetch data di Client Components jika bisa di Server**
   - Kecuali data yang berubah real-time

2. **Jangan gunakan `useEffect` untuk initial data fetch**
   - Gunakan Server Components atau React Query

3. **Jangan letakkan logic berat di middleware**
   - Middleware dijalankan di setiap request

---

## Pattern & Contoh Kode

### Struktur Folder Routing

```
app/
├── page.tsx                 # Route: /
├── layout.tsx               # Layout untuk semua halaman
├── loading.tsx              # Loading state global
├── error.tsx                # Error boundary global
├── (public)/                # Route group (tidak jadi URL)
│   ├── page.tsx             # Route: /
│   └── peta/
│       └── page.tsx         # Route: /peta
├── (dashboard)/             # Route group untuk dashboard
│   ├── layout.tsx           # Layout khusus dashboard
│   └── admin/
│       └── page.tsx         # Route: /admin
└── api/                     # API Routes
    └── warga/
        └── route.ts         # API: /api/warga
```

### Server Component (Default)

```typescript
// app/warga/page.tsx
// Ini adalah Server Component - TIDAK perlu 'use client'

import { db } from '@/lib/db'
import { warga } from '@/lib/db/schema'

async function WargaPage() {
  // Fetch langsung di component - ini aman di server
  const dataWarga = await db.select().from(warga).limit(10)
  
  return (
    <div>
      <h1>Daftar Warga</h1>
      <ul>
        {dataWarga.map((w) => (
          <li key={w.id}>{w.nama}</li>
        ))}
      </ul>
    </div>
  )
}

export default WargaPage
```

### Client Component (Interaktif)

```typescript
// components/SearchForm.tsx
'use client' // WAJIB di baris pertama

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function SearchForm() {
  const [query, setQuery] = useState('')
  const router = useRouter()
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/search?q=${query}`)
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari lokasi..."
      />
      <button type="submit">Cari</button>
    </form>
  )
}

export default SearchForm
```

### API Route

```typescript
// app/api/warga/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { warga } from '@/lib/db/schema'

// GET /api/warga
export async function GET(request: NextRequest) {
  try {
    const data = await db.select().from(warga)
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal mengambil data' },
      { status: 500 }
    )
  }
}

// POST /api/warga
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const newWarga = await db.insert(warga).values({
      nama: body.nama,
      alamat: body.alamat,
    }).returning()
    
    return NextResponse.json({ data: newWarga[0] }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal menyimpan data' },
      { status: 500 }
    )
  }
}
```

### Dynamic Route dengan Parameter

```typescript
// app/warga/[id]/page.tsx
import { db } from '@/lib/db'
import { warga } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'

interface PageProps {
  params: { id: string }
}

async function WargaDetailPage({ params }: PageProps) {
  const { id } = params
  
  const data = await db
    .select()
    .from(warga)
    .where(eq(warga.id, id))
    .limit(1)
  
  if (data.length === 0) {
    notFound() // Redirect ke 404
  }
  
  return (
    <div>
      <h1>{data[0].nama}</h1>
      <p>{data[0].alamat}</p>
    </div>
  )
}

export default WargaDetailPage
```

### Loading State

```typescript
// app/warga/loading.tsx
function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      <span className="ml-3">Memuat data...</span>
    </div>
  )
}

export default Loading
```

### Error Boundary

```typescript
// app/warga/error.tsx
'use client' // Error boundary HARUS client component

interface ErrorProps {
  error: Error
  reset: () => void
}

function ErrorPage({ error, reset }: ErrorProps) {
  return (
    <div className="text-center py-10">
      <h2 className="text-xl font-bold text-red-600">Terjadi Kesalahan</h2>
      <p className="text-gray-600 mt-2">{error.message}</p>
      <button 
        onClick={reset}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Coba Lagi
      </button>
    </div>
  )
}

export default ErrorPage
```

### Middleware untuk Proteksi Route

```typescript
// middleware.ts (di root project)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')
  const { pathname } = request.nextUrl
  
  // Proteksi route admin
  if (pathname.startsWith('/admin') && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

// Tentukan route mana yang kena middleware
export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*']
}
```

---

## Kesalahan Umum

### 1. Import Leaflet Langsung
```typescript
// SALAH - akan error "window is not defined"
import { MapContainer } from 'react-leaflet'

// BENAR - gunakan dynamic import
import dynamic from 'next/dynamic'
const Map = dynamic(() => import('@/components/Map'), { ssr: false })
```

### 2. Menggunakan Hooks di Server Component
```typescript
// SALAH - useState tidak bisa di Server Component
async function Page() {
  const [count, setCount] = useState(0) // ERROR!
}

// BENAR - pindahkan ke Client Component terpisah
```

### 3. Async Client Component
```typescript
// SALAH - Client Component tidak boleh async
'use client'
async function ClientComp() { // ERROR!
  const data = await fetch(...)
}

// BENAR - gunakan useEffect atau React Query
'use client'
function ClientComp() {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch(...).then(res => res.json()).then(setData)
  }, [])
}
```

---

## Referensi

- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
