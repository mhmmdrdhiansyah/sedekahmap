import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { villageCoordinates } from '@/db/schema';
import { eq } from 'drizzle-orm';

// ============================================================
// SERVER-SIDE CACHE + DATABASE CACHE
// Layer 1: In-memory cache (super fast, per-server)
// Layer 2: Database cache (persistent, shared across servers)
// Layer 3: Nominatim API (fallback)
// ============================================================

interface GeocodeCache {
  coords: { lat: number; lng: number };
  timestamp: number;
}

// In-memory cache (akan reset saat server restart)
const geocodeCache = new Map<string, GeocodeCache>();

// Cache expire time: 30 hari (dalam milliseconds)
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

// Helper: Extract village code dari query (format: "Desa Name, Kecamatan, Kabupaten, Provinsi")
// Tidak 100% akurat, tapi sebagai fallback untuk mencari di database
function extractVillageCode(query: string): string | null {
  // Coba cari pola kode desa di query (jika user mengirimnya)
  const codeMatch = query.match(/\b(\d{2}\.\d{2}\.\d{2}\.\d{4})\b/);
  if (codeMatch) {
    return codeMatch[1];
  }
  return null;
}

// ============================================================
// GET /api/public/geocode?q={query}&villageCode={code}
// Geocoding proxy untuk Nominatim (OpenStreetMap)
// Dengan 3-layer caching untuk menghindari rate limit
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const villageCode = searchParams.get('villageCode'); // Optional parameter untuk exact match

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" wajib diisi', data: null },
        { status: 400 }
      );
    }

    const now = Date.now();

    // ============================================================
    // LAYER 1: In-memory cache (celest, per-server instance)
    // ============================================================
    const memoryCacheKey = query.toLowerCase().trim();
    const memCached = geocodeCache.get(memoryCacheKey);

    if (memCached && now - memCached.timestamp < CACHE_TTL) {
      console.log('[Geocoding] Memory cache HIT:', query);
      return NextResponse.json(
        [
          {
            lat: memCached.coords.lat.toString(),
            lon: memCached.coords.lng.toString(),
            display_name: query,
          },
        ],
        { status: 200 }
      );
    }

    // ============================================================
    // LAYER 2: Database cache (persistent, shared across users)
    // ============================================================
    let dbResult = null;

    if (villageCode) {
      // Exact match by village code
      console.log('[Geocoding] Checking DB cache for village:', villageCode);
      const dbResults = await db
        .select()
        .from(villageCoordinates)
        .where(eq(villageCoordinates.villageCode, villageCode))
        .limit(1);

      if (dbResults.length > 0) {
        dbResult = dbResults[0];
        console.log('[Geocoding] DB cache HIT by code:', villageCode);

        // Update usage count
        await db
          .update(villageCoordinates)
          .set({
            usageCount: dbResult.usageCount + 1,
          })
          .where(eq(villageCoordinates.villageCode, villageCode));
      }
    }

    // Jika tidak ada hasil dari exact match, coba cari berdasarkan query text
    if (!dbResult) {
      // Cari berdasarkan nama query (tidak efisien, tapi sebagai fallback)
      // Kita tidak punya kolom nama di village_coordinates, jadi skip
      console.log('[Geocoding] DB cache MISS, need to fetch from API');
    }

    if (dbResult) {
      // Simpan ke in-memory cache untuk akses lebih cepat next time
      geocodeCache.set(memoryCacheKey, {
        coords: { lat: dbResult.latitude, lng: dbResult.longitude },
        timestamp: now,
      });

      return NextResponse.json(
        [
          {
            lat: dbResult.latitude.toString(),
            lon: dbResult.longitude.toString(),
            display_name: query,
            source: 'database',
          },
        ],
        { status: 200 }
      );
    }

    // ============================================================
    // LAYER 3: Nominatim API (fallback, bisa rate limit)
    // ============================================================
    console.log('[Geocoding] Fetching from Nominatim:', query);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=ID`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'SedekahMap/1.0 (https://github.com/mhmmdrdhiansyah/sedekahmap)',
      },
    });

    console.log('[Geocoding] Nominatim status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Geocoding] Nominatim error response:', errorText);
      return NextResponse.json(
        { error: `Nominatim API error: ${response.status}`, data: null },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Geocoding] Result count:', data.length);

    if (data && data.length > 0) {
      const { lat, lon } = data[0];
      const coords = { lat: parseFloat(lat), lng: parseFloat(lon) };

      // Simpan ke in-memory cache
      geocodeCache.set(memoryCacheKey, {
        coords,
        timestamp: now,
      });

      // Simpan ke database JIKA villageCode diberikan
      // Ini penting agar next request bisa langsung dari database
      if (villageCode) {
        try {
          await db.insert(villageCoordinates).values({
            villageCode,
            latitude: coords.lat,
            longitude: coords.lng,
            source: 'nominatim',
            usageCount: 1,
          }).onConflictDoNothing(); // Jangan overwrite jika sudah ada
          console.log('[Geocoding] Cached to database for village:', villageCode);
        } catch (dbError) {
          // Ignore duplicate key error atau error lainnya
          console.warn('[Geocoding] Failed to cache to DB:', dbError);
        }
      }

      return NextResponse.json(data, { status: 200 });
    }

    // Return empty result jika tidak ditemukan
    return NextResponse.json([], { status: 200 });
  } catch (error) {
    console.error('[Geocoding] Server error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal melakukan geocoding', data: null },
      { status: 500 }
    );
  }
}
