# Leaflet & React-Leaflet - Best Practices

## Apa Itu Leaflet?

Leaflet adalah library JavaScript open-source untuk membuat peta interaktif. React-Leaflet adalah wrapper yang memudahkan penggunaan Leaflet di React.

**Fitur utama:**
- Peta interaktif (zoom, pan, click)
- Markers dan popups
- Layers (tile, GeoJSON, heatmap)
- Ringan dan mudah digunakan

## Kapan Digunakan?

Dalam project SedekahMap:
- Menampilkan peta lokasi warga
- Heatmap density warga per wilayah
- Marker titik lokasi (setelah akses disetujui)
- Interaksi user dengan peta (klik, zoom)

---

## CRITICAL RULE: SSR Safety

**PENTING!** Leaflet membutuhkan akses ke `window` dan `document`. Next.js melakukan Server-Side Rendering di mana `window` tidak ada. Ini akan menyebabkan error:

```
ReferenceError: window is not defined
```

### Solusi WAJIB: Dynamic Import

```typescript
// SALAH - JANGAN LAKUKAN INI!
import { MapContainer, TileLayer } from 'react-leaflet'

// BENAR - Selalu gunakan dynamic import
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-200 animate-pulse" />
})
```

---

## Rules Utama

### DO's (Lakukan)

1. **Selalu dynamic import dengan `ssr: false`**
2. **Import CSS Leaflet di layout/page**
3. **Set height eksplisit untuk container peta**
4. **Gunakan `useMemo` untuk data markers**

### DON'T's (Hindari)

1. **Jangan import Leaflet langsung di komponen Next.js**
2. **Jangan lupa import CSS Leaflet**
3. **Jangan render peta tanpa height**

---

## Pattern & Contoh Kode

### Setup Dasar

```typescript
// components/Map/index.tsx
'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix untuk icon marker yang tidak muncul
// (Known issue di Leaflet + webpack)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

interface MapProps {
  center: [number, number]
  zoom?: number
}

function Map({ center, zoom = 13 }: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-96 w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  )
}

export default Map
```

### Menggunakan Map di Page

```typescript
// app/peta/page.tsx
import dynamic from 'next/dynamic'

// Dynamic import dengan loading state
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-gray-200 rounded-lg flex items-center justify-center">
      <span className="text-gray-500">Memuat peta...</span>
    </div>
  ),
})

export default function PetaPage() {
  // Jakarta coordinates
  const center: [number, number] = [-6.2088, 106.8456]
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Peta Sebaran</h1>
      <Map center={center} zoom={12} />
    </div>
  )
}
```

### Menambahkan Markers

```typescript
// components/Map/MapWithMarkers.tsx
'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useMemo } from 'react'
import 'leaflet/dist/leaflet.css'

interface Location {
  id: string
  nama: string
  lat: number
  lng: number
  kebutuhan: string
}

interface MapWithMarkersProps {
  center: [number, number]
  zoom?: number
  locations: Location[]
}

function MapWithMarkers({ center, zoom = 13, locations }: MapWithMarkersProps) {
  // useMemo untuk prevent re-render yang tidak perlu
  const markers = useMemo(() => {
    return locations.map((loc) => (
      <Marker key={loc.id} position={[loc.lat, loc.lng]}>
        <Popup>
          <div className="text-sm">
            <p className="font-bold">{loc.nama}</p>
            <p className="text-gray-600">{loc.kebutuhan}</p>
          </div>
        </Popup>
      </Marker>
    ))
  }, [locations])
  
  return (
    <MapContainer center={center} zoom={zoom} className="h-96 w-full">
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers}
    </MapContainer>
  )
}

export default MapWithMarkers
```

### Custom Marker Icon

```typescript
// components/Map/CustomMarker.tsx
'use client'

import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Buat custom icon
const customIcon = new L.Icon({
  iconUrl: '/icons/marker-red.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32], // Titik anchor (bawah tengah)
  popupAnchor: [0, -32], // Posisi popup relatif ke anchor
})

// Icon berdasarkan status
const getIconByStatus = (status: string) => {
  const icons: Record<string, L.Icon> = {
    pending: new L.Icon({
      iconUrl: '/icons/marker-yellow.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    }),
    verified: new L.Icon({
      iconUrl: '/icons/marker-green.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    }),
    completed: new L.Icon({
      iconUrl: '/icons/marker-blue.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    }),
  }
  return icons[status] || icons.pending
}

interface CustomMarkerProps {
  position: [number, number]
  status: string
  children?: React.ReactNode
}

function CustomMarker({ position, status, children }: CustomMarkerProps) {
  return (
    <Marker position={position} icon={getIconByStatus(status)}>
      {children && <Popup>{children}</Popup>}
    </Marker>
  )
}

export default CustomMarker
```

### Heatmap untuk Data Agregat

```typescript
// components/Map/HeatmapLayer.tsx
'use client'

import { useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet.heat'

interface HeatmapPoint {
  lat: number
  lng: number
  intensity?: number
}

interface HeatmapLayerProps {
  points: HeatmapPoint[]
  options?: {
    radius?: number
    blur?: number
    maxZoom?: number
  }
}

function HeatmapLayer({ points, options = {} }: HeatmapLayerProps) {
  const map = useMap()
  
  useEffect(() => {
    // Convert ke format yang dibutuhkan leaflet.heat
    const heatData = points.map((p) => [
      p.lat,
      p.lng,
      p.intensity || 1,
    ])
    
    // Buat heat layer
    const heat = (L as any).heatLayer(heatData, {
      radius: options.radius || 25,
      blur: options.blur || 15,
      maxZoom: options.maxZoom || 17,
    })
    
    heat.addTo(map)
    
    // Cleanup saat unmount
    return () => {
      map.removeLayer(heat)
    }
  }, [map, points, options])
  
  return null
}

export default HeatmapLayer
```

```typescript
// Penggunaan Heatmap
// components/Map/MapWithHeatmap.tsx
'use client'

import { MapContainer, TileLayer } from 'react-leaflet'
import HeatmapLayer from './HeatmapLayer'
import 'leaflet/dist/leaflet.css'

const heatmapData = [
  { lat: -6.2088, lng: 106.8456, intensity: 0.8 },
  { lat: -6.2100, lng: 106.8500, intensity: 0.5 },
  { lat: -6.2050, lng: 106.8400, intensity: 1.0 },
  // ... more points
]

function MapWithHeatmap() {
  return (
    <MapContainer
      center={[-6.2088, 106.8456]}
      zoom={13}
      className="h-96 w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      <HeatmapLayer points={heatmapData} />
    </MapContainer>
  )
}

export default MapWithHeatmap
```

### Event Handling

```typescript
// components/Map/MapWithEvents.tsx
'use client'

import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'

interface ClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void
}

function ClickHandler({ onMapClick }: ClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

interface MapWithEventsProps {
  center: [number, number]
  onLocationSelect: (lat: number, lng: number) => void
}

function MapWithEvents({ center, onLocationSelect }: MapWithEventsProps) {
  return (
    <MapContainer center={center} zoom={13} className="h-96 w-full">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      <ClickHandler onMapClick={onLocationSelect} />
    </MapContainer>
  )
}

export default MapWithEvents
```

### Mengontrol Map dari Luar

```typescript
// components/Map/ControlledMap.tsx
'use client'

import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useEffect } from 'react'

// Komponen untuk update view
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])
  
  return null
}

interface ControlledMapProps {
  center: [number, number]
  zoom: number
}

function ControlledMap({ center, zoom }: ControlledMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-96 w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      <ChangeView center={center} zoom={zoom} />
    </MapContainer>
  )
}

export default ControlledMap
```

### GeoJSON Layer

```typescript
// components/Map/GeoJSONLayer.tsx
'use client'

import { GeoJSON } from 'react-leaflet'
import type { GeoJsonObject } from 'geojson'

interface GeoJSONLayerProps {
  data: GeoJsonObject
  style?: L.PathOptions
  onEachFeature?: (feature: any, layer: L.Layer) => void
}

function GeoJSONLayer({ data, style, onEachFeature }: GeoJSONLayerProps) {
  const defaultStyle: L.PathOptions = {
    fillColor: '#3388ff',
    weight: 2,
    opacity: 1,
    color: '#3388ff',
    fillOpacity: 0.3,
  }
  
  return (
    <GeoJSON
      data={data}
      style={style || defaultStyle}
      onEachFeature={onEachFeature}
    />
  )
}

export default GeoJSONLayer
```

---

## Setup Icon Files

Copy icon files dari `node_modules/leaflet/dist/images/` ke `public/leaflet/`:

```
public/
└── leaflet/
    ├── marker-icon.png
    ├── marker-icon-2x.png
    └── marker-shadow.png
```

---

## Kesalahan Umum

### 1. Lupa Dynamic Import
```typescript
// SALAH
import Map from '@/components/Map'

// BENAR
const Map = dynamic(() => import('@/components/Map'), { ssr: false })
```

### 2. Map Tidak Muncul (Height 0)
```typescript
// SALAH - tidak ada height
<MapContainer center={center} zoom={13}>

// BENAR - set height eksplisit
<MapContainer center={center} zoom={13} className="h-96 w-full">
```

### 3. Icon Marker Tidak Muncul
```typescript
// Tambahkan fix ini di komponen Map
import L from 'leaflet'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})
```

### 4. Lupa Import CSS
```typescript
// WAJIB import di komponen Map
import 'leaflet/dist/leaflet.css'
```

---

## Tile Providers Alternatif

Jika terkena rate-limit dari OpenStreetMap:

```typescript
// OpenStreetMap (default)
const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

// CartoDB (lebih minimalis)
const cartoLight = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const cartoDark = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

// Stadia Maps (perlu API key untuk production)
const stadiaOutdoors = 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png'
```

---

## Referensi

- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [React-Leaflet Documentation](https://react-leaflet.js.org/)
- [Leaflet.heat Plugin](https://github.com/Leaflet/Leaflet.heat)
