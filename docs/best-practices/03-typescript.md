# TypeScript - Best Practices

## Apa Itu TypeScript?

TypeScript adalah JavaScript dengan tambahan sistem tipe (type system). Kode TypeScript di-compile menjadi JavaScript biasa sebelum dijalankan.

**Keuntungan:**
- Mendeteksi error sebelum runtime
- Autocomplete yang lebih baik di editor
- Dokumentasi otomatis melalui types
- Refactoring lebih aman

## Kapan Digunakan?

Dalam project SedekahMap:
- Semua file `.ts` dan `.tsx`
- Definisi tipe untuk data (warga, donatur, lokasi)
- Props component React
- Response API

---

## Rules Utama

### DO's (Lakukan)

1. **Selalu definisikan tipe untuk function parameters**
2. **Gunakan `interface` untuk object shapes**
3. **Gunakan `type` untuk union types dan aliases**
4. **Export types yang digunakan di banyak tempat**

### DON'T's (Hindari)

1. **Jangan gunakan `any` kecuali terpaksa**
2. **Jangan abaikan TypeScript errors**
3. **Jangan over-engineer types**

---

## Pattern & Contoh Kode

### Basic Types

```typescript
// Primitive types
const nama: string = 'John'
const umur: number = 25
const aktif: boolean = true

// Array
const hobi: string[] = ['membaca', 'coding']
const angka: Array<number> = [1, 2, 3]

// Tuple (array dengan tipe fixed per posisi)
const koordinat: [number, number] = [-6.2088, 106.8456]

// Object
const user: { nama: string; umur: number } = {
  nama: 'John',
  umur: 25
}
```

### Interface - Object Shape

```typescript
// Interface untuk struktur object
interface Warga {
  id: string
  nama: string
  nik: string
  alamat: string
  koordinat: {
    lat: number
    lng: number
  }
  kebutuhan: string
  status: 'pending' | 'verified' | 'completed'
  createdAt: Date
  updatedAt: Date
}

// Menggunakan interface
const warga: Warga = {
  id: '1',
  nama: 'Budi',
  nik: '1234567890123456',
  alamat: 'Jl. Contoh No. 1',
  koordinat: { lat: -6.2088, lng: 106.8456 },
  kebutuhan: 'Sembako',
  status: 'verified',
  createdAt: new Date(),
  updatedAt: new Date()
}
```

### Interface Extension

```typescript
// Base interface
interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

// Extend interface
interface Warga extends BaseEntity {
  nama: string
  nik: string
  alamat: string
}

// Warga sekarang punya: id, createdAt, updatedAt, nama, nik, alamat
```

### Type Alias

```typescript
// Type untuk union (pilihan)
type UserRole = 'admin' | 'verifikator' | 'donatur'

type Status = 'pending' | 'approved' | 'rejected'

// Type untuk alias
type Koordinat = {
  lat: number
  lng: number
}

// Type untuk function signature
type CalculateDistance = (from: Koordinat, to: Koordinat) => number

// Menggunakan type
const role: UserRole = 'admin'

function hitungJarak(from: Koordinat, to: Koordinat): number {
  // implementasi...
  return 0
}
```

### Optional Properties

```typescript
interface SearchParams {
  query: string           // Wajib
  page?: number           // Optional (boleh undefined)
  limit?: number          // Optional
  provinsi?: string       // Optional
}

function search(params: SearchParams) {
  const { query, page = 1, limit = 10 } = params // Default value
  // ...
}

// Valid calls:
search({ query: 'sembako' })
search({ query: 'sembako', page: 2 })
search({ query: 'sembako', page: 2, limit: 20, provinsi: 'Jawa Barat' })
```

### Readonly Properties

```typescript
interface Config {
  readonly apiUrl: string
  readonly mapTileUrl: string
}

const config: Config = {
  apiUrl: 'https://api.sedekahmap.com',
  mapTileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
}

// config.apiUrl = 'xxx' // ERROR: Cannot assign to 'apiUrl' because it is a read-only property
```

### Function Types

```typescript
// Parameter dan return type
function tambah(a: number, b: number): number {
  return a + b
}

// Arrow function
const kurang = (a: number, b: number): number => a - b

// Function dengan optional parameter
function sapa(nama: string, sapaan?: string): string {
  return `${sapaan || 'Halo'}, ${nama}!`
}

// Function dengan default parameter
function formatCurrency(amount: number, currency: string = 'IDR'): string {
  return `${currency} ${amount.toLocaleString('id-ID')}`
}

// Async function
async function fetchWarga(id: string): Promise<Warga> {
  const res = await fetch(`/api/warga/${id}`)
  return res.json()
}

// Function yang tidak return (void)
function logError(message: string): void {
  console.error(message)
}
```

### Generics - Tipe yang Fleksibel

```typescript
// Generic function
function getFirst<T>(array: T[]): T | undefined {
  return array[0]
}

// Penggunaan - TypeScript akan infer tipe
const firstNumber = getFirst([1, 2, 3])         // number | undefined
const firstString = getFirst(['a', 'b', 'c'])   // string | undefined

// Generic interface
interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

// Penggunaan dengan berbagai tipe data
type WargaResponse = ApiResponse<Warga>
type WargaListResponse = ApiResponse<Warga[]>

// Contoh response
const response: WargaResponse = {
  data: { /* warga object */ } as Warga,
  message: 'Success',
  success: true
}
```

### Utility Types

```typescript
interface User {
  id: string
  nama: string
  email: string
  password: string
  role: UserRole
}

// Partial<T> - Semua property jadi optional
type UpdateUserInput = Partial<User>
// { id?: string; nama?: string; email?: string; ... }

// Pick<T, Keys> - Ambil beberapa property saja
type UserPreview = Pick<User, 'id' | 'nama'>
// { id: string; nama: string }

// Omit<T, Keys> - Buang beberapa property
type UserWithoutPassword = Omit<User, 'password'>
// { id: string; nama: string; email: string; role: UserRole }

// Required<T> - Semua property jadi required
type RequiredUser = Required<Partial<User>>

// Record<Keys, Type> - Object dengan key tertentu
type StatusLabels = Record<Status, string>
const labels: StatusLabels = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak'
}
```

### Type Guards

```typescript
// typeof guard
function processValue(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase() // TypeScript tahu ini string
  }
  return value * 2 // TypeScript tahu ini number
}

// in operator guard
interface Admin {
  role: 'admin'
  permissions: string[]
}

interface Donatur {
  role: 'donatur'
  donationCount: number
}

type User = Admin | Donatur

function getUserInfo(user: User) {
  if ('permissions' in user) {
    // TypeScript tahu ini Admin
    return `Admin dengan ${user.permissions.length} permissions`
  }
  // TypeScript tahu ini Donatur
  return `Donatur dengan ${user.donationCount} donasi`
}

// Custom type guard
function isAdmin(user: User): user is Admin {
  return user.role === 'admin'
}

function handleUser(user: User) {
  if (isAdmin(user)) {
    console.log(user.permissions) // Aman!
  }
}
```

### React Component Props

```typescript
// Props interface
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  loading?: boolean
  children?: React.ReactNode
}

function Button({ 
  label, 
  onClick, 
  variant = 'primary',
  disabled = false,
  loading = false 
}: ButtonProps) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn btn-${variant}`}
    >
      {loading ? 'Loading...' : label}
    </button>
  )
}

// Props dengan children
interface CardProps {
  title: string
  children: React.ReactNode
}

function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {children}
    </div>
  )
}
```

### Event Types di React

```typescript
'use client'

import { useState, ChangeEvent, FormEvent, MouseEvent } from 'react'

function Form() {
  const [value, setValue] = useState('')
  
  // Input change event
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
  }
  
  // Form submit event
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log('Submitted:', value)
  }
  
  // Button click event
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    console.log('Clicked at:', e.clientX, e.clientY)
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input value={value} onChange={handleChange} />
      <button type="submit" onClick={handleClick}>Submit</button>
    </form>
  )
}
```

---

## Kesalahan Umum

### 1. Menggunakan `any`
```typescript
// SALAH
function process(data: any) {
  return data.name.toUpperCase() // Tidak ada type checking!
}

// BENAR - definisikan tipe
interface Data {
  name: string
}

function process(data: Data) {
  return data.name.toUpperCase() // Type safe!
}
```

### 2. Type Assertion Berlebihan
```typescript
// SALAH - memaksakan tipe
const data = fetchData() as User // Berbahaya jika salah!

// BENAR - validasi dulu atau gunakan type guard
const data = fetchData()
if (isValidUser(data)) {
  // Sekarang aman
}
```

### 3. Tidak Handle null/undefined
```typescript
// SALAH
function getName(user: User | null) {
  return user.name // Error: user mungkin null!
}

// BENAR - check dulu
function getName(user: User | null) {
  if (!user) return 'Unknown'
  return user.name
}

// Atau gunakan optional chaining
function getName(user: User | null) {
  return user?.name ?? 'Unknown'
}
```

---

## File Types untuk Project

Buat file `types/index.ts` untuk types yang dipakai di banyak tempat:

```typescript
// types/index.ts

export type UserRole = 'admin' | 'verifikator' | 'donatur'

export type WargaStatus = 'pending' | 'verified' | 'completed'

export interface Koordinat {
  lat: number
  lng: number
}

export interface Warga {
  id: string
  nama: string
  nik: string
  alamat: string
  koordinat: Koordinat
  kebutuhan: string
  status: WargaStatus
  verifikatorId: string
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  nama: string
  email: string
  role: UserRole
}

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}
```

---

## Referensi

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [TypeScript Cheat Sheet](https://www.typescriptlang.org/cheatsheets)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
