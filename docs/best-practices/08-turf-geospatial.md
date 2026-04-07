# Turf.js - Best Practices

## Apa Itu Turf.js?

Turf.js adalah library JavaScript untuk analisis geospasial di sisi client (browser). Berguna untuk kalkulasi yang tidak perlu query ke database.

**Fitur utama:**
- Menghitung jarak antara dua titik
- Cek apakah titik ada dalam area
- Membuat buffer/radius
- Operasi geometri (union, intersect)

## Kapan Digunakan?

Dalam project SedekahMap:
- Menghitung jarak real-time antara donatur dan target
- Filter lokasi dalam radius di frontend
- Validasi koordinat sebelum submit
- Kalkulasi yang tidak butuh akses database

---

## Rules Utama

### DO's (Lakukan)

1. **Import hanya fungsi yang dibutuhkan** (tree-shaking)
2. **Gunakan untuk kalkulasi client-side**
3. **Koordinat dalam format `[longitude, latitude]`** (GeoJSON standard)

### DON'T's (Hindari)

1. **Jangan gunakan untuk data besar** (lebih baik PostGIS)
2. **Jangan salah urutan koordinat** (lng, lat BUKAN lat, lng)

---

## Pattern & Contoh Kode

### Setup & Import

```typescript
// Import spesifik (recommended - smaller bundle)
import distance from '@turf/distance'
import { point } from '@turf/helpers'

// Atau import semua (lebih besar)
import * as turf from '@turf/turf'
```

### Membuat Point

```typescript
import { point } from '@turf/helpers'

// PENTING: Format [longitude, latitude] - BUKAN [lat, lng]!
const jakarta = point([106.8456, -6.2088]) // [lng, lat]
const bandung = point([107.6191, -6.9175])

// Point dengan properties
const lokasi = point([106.8456, -6.2088], {
  nama: 'Kantor Jakarta',
  kota: 'Jakarta',
})

console.log(lokasi)
// {
//   type: 'Feature',
//   geometry: { type: 'Point', coordinates: [106.8456, -6.2088] },
//   properties: { nama: 'Kantor Jakarta', kota: 'Jakarta' }
// }
```

### Menghitung Jarak

```typescript
import distance from '@turf/distance'
import { point } from '@turf/helpers'

const from = point([106.8456, -6.2088]) // Jakarta
const to = point([107.6191, -6.9175])   // Bandung

// Jarak dalam kilometer (default)
const jarakKm = distance(from, to)
console.log(`Jarak: ${jarakKm.toFixed(2)} km`) // ~120 km

// Jarak dalam meter
const jarakMeter = distance(from, to, { units: 'meters' })

// Jarak dalam miles
const jarakMiles = distance(from, to, { units: 'miles' })

// Units yang tersedia: 
// 'kilometers', 'miles', 'meters', 'feet', 'degrees', 'radians'
```

### Contoh Penggunaan di Component

```typescript
// components/DistanceCalculator.tsx
'use client'

import { useState, useMemo } from 'react'
import distance from '@turf/distance'
import { point } from '@turf/helpers'

interface Location {
  id: string
  nama: string
  lat: number
  lng: number
}

interface DistanceCalculatorProps {
  userLocation: { lat: number; lng: number }
  targets: Location[]
}

function DistanceCalculator({ userLocation, targets }: DistanceCalculatorProps) {
  const userPoint = point([userLocation.lng, userLocation.lat])
  
  // Hitung jarak untuk semua target
  const targetsWithDistance = useMemo(() => {
    return targets.map((target) => {
      const targetPoint = point([target.lng, target.lat])
      const dist = distance(userPoint, targetPoint)
      
      return {
        ...target,
        jarak: dist,
        jarakFormatted: dist < 1 
          ? `${(dist * 1000).toFixed(0)} m`
          : `${dist.toFixed(1)} km`
      }
    }).sort((a, b) => a.jarak - b.jarak) // Sort by nearest
  }, [targets, userPoint])
  
  return (
    <ul>
      {targetsWithDistance.map((target) => (
        <li key={target.id}>
          {target.nama} - {target.jarakFormatted}
        </li>
      ))}
    </ul>
  )
}

export default DistanceCalculator
```

### Cek Point dalam Radius

```typescript
import distance from '@turf/distance'
import { point } from '@turf/helpers'

interface Location {
  lat: number
  lng: number
}

function isWithinRadius(
  center: Location,
  target: Location,
  radiusKm: number
): boolean {
  const centerPoint = point([center.lng, center.lat])
  const targetPoint = point([target.lng, target.lat])
  
  const dist = distance(centerPoint, targetPoint)
  return dist <= radiusKm
}

// Penggunaan
const center = { lat: -6.2088, lng: 106.8456 }
const target = { lat: -6.2100, lng: 106.8500 }

if (isWithinRadius(center, target, 5)) {
  console.log('Target dalam radius 5 km')
}
```

### Filter Lokasi dalam Radius

```typescript
import distance from '@turf/distance'
import { point } from '@turf/helpers'

interface Location {
  id: string
  lat: number
  lng: number
}

function filterByRadius(
  center: { lat: number; lng: number },
  locations: Location[],
  radiusKm: number
): Location[] {
  const centerPoint = point([center.lng, center.lat])
  
  return locations.filter((loc) => {
    const locPoint = point([loc.lng, loc.lat])
    const dist = distance(centerPoint, locPoint)
    return dist <= radiusKm
  })
}

// Penggunaan
const userLocation = { lat: -6.2088, lng: 106.8456 }
const allLocations: Location[] = [/* ... */]

const nearby = filterByRadius(userLocation, allLocations, 10)
console.log(`${nearby.length} lokasi dalam radius 10 km`)
```

### Membuat Circle/Buffer

```typescript
import circle from '@turf/circle'

// Buat circle dengan radius 5 km
const center = [106.8456, -6.2088] // [lng, lat]
const radius = 5
const options = { steps: 64, units: 'kilometers' as const }

const circleGeojson = circle(center, radius, options)

// circleGeojson adalah Polygon GeoJSON
// Bisa digunakan untuk:
// 1. Render di peta sebagai area
// 2. Cek apakah point lain ada di dalam circle
```

### Cek Point dalam Polygon

```typescript
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point, polygon } from '@turf/helpers'

// Definisi polygon (misalnya batas wilayah)
const wilayahJakarta = polygon([[
  [106.7, -6.1],  // [lng, lat]
  [106.9, -6.1],
  [106.9, -6.3],
  [106.7, -6.3],
  [106.7, -6.1],  // Tutup polygon (kembali ke titik awal)
]])

// Cek apakah titik ada di dalam polygon
const lokasi = point([106.8, -6.2])
const dalamJakarta = booleanPointInPolygon(lokasi, wilayahJakarta)

console.log(dalamJakarta) // true
```

### Bounding Box

```typescript
import bbox from '@turf/bbox'
import bboxPolygon from '@turf/bbox-polygon'
import { featureCollection, point } from '@turf/helpers'

// Kumpulan points
const points = featureCollection([
  point([106.8, -6.2]),
  point([106.9, -6.1]),
  point([107.0, -6.3]),
])

// Hitung bounding box [minLng, minLat, maxLng, maxLat]
const box = bbox(points)
console.log(box) // [106.8, -6.3, 107.0, -6.1]

// Convert bbox ke polygon
const boxPolygon = bboxPolygon(box)
```

### Centroid (Titik Tengah)

```typescript
import centroid from '@turf/centroid'
import { featureCollection, point } from '@turf/helpers'

// Kumpulan points
const points = featureCollection([
  point([106.8, -6.2]),
  point([106.9, -6.1]),
  point([107.0, -6.3]),
])

// Hitung centroid
const center = centroid(points)
console.log(center.geometry.coordinates) // [106.9, -6.2]
```

### Bearing (Arah Kompas)

```typescript
import bearing from '@turf/bearing'
import { point } from '@turf/helpers'

const from = point([106.8456, -6.2088])
const to = point([107.6191, -6.9175])

// Bearing dalam degrees (0 = utara, 90 = timur)
const arah = bearing(from, to)
console.log(`Arah: ${arah.toFixed(0)}°`) // ~135° (tenggara)

// Convert ke arah kompas
function bearingToCompass(deg: number): string {
  const directions = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL']
  const index = Math.round(deg / 45) % 8
  return directions[index < 0 ? index + 8 : index]
}

console.log(bearingToCompass(arah)) // "TG" (Tenggara)
```

### Hook untuk Jarak Real-time

```typescript
// hooks/useDistance.ts
'use client'

import { useState, useEffect, useMemo } from 'react'
import distance from '@turf/distance'
import { point } from '@turf/helpers'

interface Location {
  lat: number
  lng: number
}

function useDistance(target: Location | null) {
  const [userLocation, setUserLocation] = useState<Location | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Watch user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung')
      return
    }
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      (err) => {
        setError(err.message)
      },
      { enableHighAccuracy: true }
    )
    
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])
  
  // Calculate distance
  const distanceKm = useMemo(() => {
    if (!userLocation || !target) return null
    
    const from = point([userLocation.lng, userLocation.lat])
    const to = point([target.lng, target.lat])
    
    return distance(from, to)
  }, [userLocation, target])
  
  return {
    userLocation,
    distanceKm,
    error,
    isLoading: !userLocation && !error,
  }
}

export default useDistance
```

```typescript
// Penggunaan hook
function DistanceDisplay({ target }: { target: Location }) {
  const { distanceKm, isLoading, error } = useDistance(target)
  
  if (isLoading) return <span>Mendeteksi lokasi...</span>
  if (error) return <span>Error: {error}</span>
  if (!distanceKm) return null
  
  return (
    <span>
      Jarak: {distanceKm < 1 
        ? `${(distanceKm * 1000).toFixed(0)} meter`
        : `${distanceKm.toFixed(1)} km`
      }
    </span>
  )
}
```

---

## Kesalahan Umum

### 1. Urutan Koordinat Salah
```typescript
// SALAH - lat, lng (seperti Google Maps)
const point1 = point([-6.2088, 106.8456])

// BENAR - lng, lat (GeoJSON standard)
const point1 = point([106.8456, -6.2088])
```

### 2. Lupa Units
```typescript
// SALAH - asumsi unit
const dist = distance(from, to) // Ini kilometers

// BENAR - eksplisit
const distMeters = distance(from, to, { units: 'meters' })
```

### 3. Import Seluruh Library
```typescript
// SALAH - import semua (bundle besar)
import * as turf from '@turf/turf'
turf.distance(...)

// BENAR - import spesifik
import distance from '@turf/distance'
distance(...)
```

---

## Referensi

- [Turf.js Documentation](https://turfjs.org/)
- [Turf.js API Reference](https://turfjs.org/docs/)
- [GeoJSON Specification](https://geojson.org/)
