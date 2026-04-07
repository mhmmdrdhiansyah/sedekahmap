# React 19 - Best Practices

## Apa Itu React?

React adalah library JavaScript untuk membangun user interface (UI). React 19 adalah versi terbaru dengan fitur-fitur baru seperti React Compiler dan improved Server Components.

**Konsep utama:**
- **Components**: Blok bangunan UI yang reusable
- **Props**: Data yang dikirim dari parent ke child
- **State**: Data internal yang bisa berubah dalam component
- **Hooks**: Fungsi untuk menggunakan fitur React

## Kapan Digunakan?

Dalam project SedekahMap:
- Semua komponen UI (form, button, card, dll)
- Interaksi user (click, input, submit)
- State management lokal

---

## Rules Utama

### DO's (Lakukan)

1. **Gunakan functional components**
   - Class components sudah tidak direkomendasikan

2. **Satu component = satu file**
   - Lebih mudah di-maintain dan di-test

3. **Props harus immutable**
   - Jangan pernah mengubah props langsung

4. **Gunakan TypeScript untuk props**
   - Type safety mencegah bug

### DON'T's (Hindari)

1. **Jangan mutasi state langsung**
   - Selalu gunakan setter function

2. **Jangan nested component definition**
   - Bikin component terpisah di luar

3. **Jangan overuse useEffect**
   - Banyak kasus bisa diselesaikan tanpa useEffect

---

## Pattern & Contoh Kode

### Basic Component dengan Props

```typescript
// components/WargaCard.tsx
interface WargaCardProps {
  nama: string
  alamat: string
  kebutuhan: string
  onSelect?: () => void
}

function WargaCard({ nama, alamat, kebutuhan, onSelect }: WargaCardProps) {
  return (
    <div 
      className="p-4 border rounded-lg hover:shadow-md cursor-pointer"
      onClick={onSelect}
    >
      <h3 className="font-bold">{nama}</h3>
      <p className="text-gray-600">{alamat}</p>
      <span className="text-sm bg-blue-100 px-2 py-1 rounded">
        {kebutuhan}
      </span>
    </div>
  )
}

export default WargaCard
```

### useState - State Management

```typescript
'use client'

import { useState } from 'react'

function Counter() {
  // [nilai, fungsiUntukUbahNilai] = useState(nilaiAwal)
  const [count, setCount] = useState(0)
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Tambah</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  )
}
```

### useState dengan Object

```typescript
'use client'

import { useState } from 'react'

interface FormData {
  nama: string
  email: string
  pesan: string
}

function ContactForm() {
  const [form, setForm] = useState<FormData>({
    nama: '',
    email: '',
    pesan: ''
  })
  
  // BENAR: Spread operator untuk update partial
  const handleChange = (field: keyof FormData, value: string) => {
    setForm(prev => ({
      ...prev,        // Copy semua field yang ada
      [field]: value  // Update field yang berubah saja
    }))
  }
  
  // SALAH: Jangan mutasi langsung
  // form.nama = 'John' // JANGAN SEPERTI INI!
  
  return (
    <form>
      <input 
        value={form.nama}
        onChange={(e) => handleChange('nama', e.target.value)}
        placeholder="Nama"
      />
      <input 
        value={form.email}
        onChange={(e) => handleChange('email', e.target.value)}
        placeholder="Email"
      />
      <textarea 
        value={form.pesan}
        onChange={(e) => handleChange('pesan', e.target.value)}
        placeholder="Pesan"
      />
    </form>
  )
}
```

### useEffect - Side Effects

```typescript
'use client'

import { useState, useEffect } from 'react'

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Fungsi untuk fetch data
    async function fetchUser() {
      setLoading(true)
      try {
        const res = await fetch(`/api/users/${userId}`)
        const data = await res.json()
        setUser(data)
      } catch (error) {
        console.error('Gagal fetch user:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUser()
  }, [userId]) // Dependency array - effect jalan ulang jika userId berubah
  
  if (loading) return <div>Loading...</div>
  if (!user) return <div>User tidak ditemukan</div>
  
  return <div>{user.nama}</div>
}
```

### useEffect - Cleanup Function

```typescript
'use client'

import { useState, useEffect } from 'react'

function LocationTracker() {
  const [position, setPosition] = useState({ lat: 0, lng: 0 })
  
  useEffect(() => {
    // Setup: mulai watch lokasi
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        })
      }
    )
    
    // Cleanup: stop watch ketika component unmount
    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, []) // Empty array = hanya jalan sekali saat mount
  
  return <div>Lat: {position.lat}, Lng: {position.lng}</div>
}
```

### useMemo - Memoize Expensive Calculation

```typescript
'use client'

import { useState, useMemo } from 'react'

interface Warga {
  id: string
  nama: string
  kebutuhan: string
}

function WargaList({ wargaList }: { wargaList: Warga[] }) {
  const [filter, setFilter] = useState('')
  
  // useMemo: hanya hitung ulang jika wargaList atau filter berubah
  const filteredWarga = useMemo(() => {
    console.log('Filtering...') // Hanya log jika benar-benar filtering ulang
    return wargaList.filter(w => 
      w.nama.toLowerCase().includes(filter.toLowerCase())
    )
  }, [wargaList, filter])
  
  return (
    <div>
      <input 
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Cari nama..."
      />
      <ul>
        {filteredWarga.map(w => (
          <li key={w.id}>{w.nama}</li>
        ))}
      </ul>
    </div>
  )
}
```

### useCallback - Memoize Function

```typescript
'use client'

import { useState, useCallback } from 'react'

function ParentComponent() {
  const [count, setCount] = useState(0)
  
  // useCallback: fungsi tidak dibuat ulang setiap render
  const handleClick = useCallback(() => {
    console.log('Button clicked')
  }, []) // Empty deps = fungsi sama terus
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Tambah</button>
      <ChildComponent onClick={handleClick} />
    </div>
  )
}

// Child tidak akan re-render karena onClick selalu sama
function ChildComponent({ onClick }: { onClick: () => void }) {
  console.log('Child render')
  return <button onClick={onClick}>Click me</button>
}
```

### Custom Hook

```typescript
// hooks/useLocalStorage.ts
'use client'

import { useState, useEffect } from 'react'

function useLocalStorage<T>(key: string, initialValue: T) {
  // State untuk simpan nilai
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  
  // Load dari localStorage saat mount
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      console.error('Error reading localStorage:', error)
    }
  }, [key])
  
  // Fungsi untuk update nilai
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error('Error setting localStorage:', error)
    }
  }
  
  return [storedValue, setValue] as const
}

export default useLocalStorage

// Penggunaan:
// const [theme, setTheme] = useLocalStorage('theme', 'light')
```

### Conditional Rendering

```typescript
interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected'
}

function StatusBadge({ status }: StatusBadgeProps) {
  // Pattern 1: Object mapping (recommended untuk banyak kondisi)
  const statusConfig = {
    pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Disetujui', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-800' }
  }
  
  const config = statusConfig[status]
  
  return (
    <span className={`px-2 py-1 rounded text-sm ${config.color}`}>
      {config.label}
    </span>
  )
}

// Pattern 2: Ternary untuk kondisi sederhana
function Greeting({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div>
      {isLoggedIn ? <p>Selamat datang!</p> : <p>Silakan login</p>}
    </div>
  )
}

// Pattern 3: && untuk render kondisional
function Notification({ count }: { count: number }) {
  return (
    <div>
      {count > 0 && <span className="badge">{count}</span>}
    </div>
  )
}
```

### List Rendering dengan Key

```typescript
interface Item {
  id: string
  name: string
}

function ItemList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        // KEY WAJIB: gunakan ID unik, BUKAN index
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}

// SALAH: Jangan pakai index sebagai key jika list bisa berubah
// items.map((item, index) => <li key={index}>...)
```

---

## Kesalahan Umum

### 1. Mutasi State Langsung
```typescript
// SALAH
const [items, setItems] = useState(['a', 'b'])
items.push('c') // Mutasi langsung!
setItems(items) // Tidak akan trigger re-render

// BENAR
setItems([...items, 'c']) // Buat array baru
```

### 2. Missing Dependency di useEffect
```typescript
// SALAH - eslint akan warning
useEffect(() => {
  fetchData(userId) // userId tidak ada di deps
}, [])

// BENAR
useEffect(() => {
  fetchData(userId)
}, [userId])
```

### 3. Nested Component Definition
```typescript
// SALAH - ChildComponent dibuat ulang setiap render
function Parent() {
  function ChildComponent() { // Jangan definisi di sini!
    return <div>Child</div>
  }
  return <ChildComponent />
}

// BENAR - definisi di luar
function ChildComponent() {
  return <div>Child</div>
}

function Parent() {
  return <ChildComponent />
}
```

### 4. Overusing useEffect
```typescript
// SALAH - bisa pakai useMemo
useEffect(() => {
  const filtered = items.filter(i => i.active)
  setFilteredItems(filtered)
}, [items])

// BENAR
const filteredItems = useMemo(
  () => items.filter(i => i.active),
  [items]
)
```

---

## Referensi

- [React Documentation](https://react.dev)
- [React Hooks](https://react.dev/reference/react/hooks)
- [React 19 Blog Post](https://react.dev/blog)
- [Thinking in React](https://react.dev/learn/thinking-in-react)
