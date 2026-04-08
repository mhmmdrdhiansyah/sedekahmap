import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { regions } from './schema/regions';

// ============================================================
// KONEKSI DATABASE (terpisah dari app, karena ini script standalone)
// ============================================================
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle({ client });

// ============================================================
// API CONSTANTS
// ============================================================
const WILAYAH_API_BASE = 'https://wilayah.id/api';
const RATE_LIMIT_MS = 50; // delay antar request
const VILLAGE_BATCH_SIZE = 2000;

// ============================================================
// TYPES
// ============================================================
interface WilayahItem {
  code: string;
  name: string;
}

interface WilayahResponse {
  data: WilayahItem[];
}

interface RegionInsert {
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
}

// ============================================================
// HELPERS
// ============================================================
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = 3): Promise<WilayahResponse> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`   ⚠️  Retry ${i + 1}/${retries} for ${url}`);
      await delay(1000 * (i + 1)); // exponential backoff
    }
  }
  throw new Error('fetchWithRetry failed');
}

async function batchInsert(regionsToInsert: RegionInsert[]) {
  if (regionsToInsert.length === 0) return;

  await db
    .insert(regions)
    .values(regionsToInsert)
    .onConflictDoNothing({ target: regions.code });
}

// ============================================================
// SEED FUNCTIONS
// ============================================================
async function seedProvinces() {
  console.log('\n📋 Level 1: Seeding provinces...');

  const response = await fetchWithRetry(`${WILAYAH_API_BASE}/provinces.json`);
  const provincesToInsert: RegionInsert[] = response.data.map((item) => ({
    code: item.code,
    name: item.name,
    level: 1,
    parentCode: null,
  }));

  await batchInsert(provincesToInsert);
  console.log(`   ✅ ${provincesToInsert.length} provinces inserted`);

  return response.data;
}

async function seedRegencies(provinces: WilayahItem[]) {
  console.log('\n🏛️  Level 2: Seeding regencies...');

  let allRegencies: RegionInsert[] = [];

  for (let i = 0; i < provinces.length; i++) {
    const province = provinces[i];
    process.stdout.write(`\r   Fetching ${i + 1}/${provinces.length}: ${province.name}...`);

    const response = await fetchWithRetry(`${WILAYAH_API_BASE}/regencies/${province.code}.json`);
    const regencies = response.data.map((item) => ({
      code: item.code,
      name: item.name,
      level: 2,
      parentCode: province.code,
    }));

    allRegencies.push(...regencies);
    await delay(RATE_LIMIT_MS);
  }

  console.log(`\n   ✅ ${allRegencies.length} regencies fetched, inserting...`);
  await batchInsert(allRegencies);
  console.log(`   ✅ ${allRegencies.length} regencies inserted`);

  return allRegencies;
}

async function seedDistricts(regencies: RegionInsert[]) {
  console.log('\n🏘️  Level 3: Seeding districts...');

  let allDistricts: RegionInsert[] = [];

  for (let i = 0; i < regencies.length; i++) {
    const regency = regencies[i];
    if (i % 50 === 0) {
      process.stdout.write(`\r   Fetching ${i + 1}/${regencies.length}: ${regency.name}...`);
    }

    try {
      const response = await fetchWithRetry(`${WILAYAH_API_BASE}/districts/${regency.code}.json`);
      const districts = response.data.map((item) => ({
        code: item.code,
        name: item.name,
        level: 3,
        parentCode: regency.code,
      }));

      allDistricts.push(...districts);
    } catch (error) {
      console.error(`\n   ❌ Error fetching districts for ${regency.code}:`, error);
    }

    await delay(RATE_LIMIT_MS);
  }

  console.log(`\n   ✅ ${allDistricts.length} districts fetched, inserting...`);
  await batchInsert(allDistricts);
  console.log(`   ✅ ${allDistricts.length} districts inserted`);

  return allDistricts;
}

async function seedVillages(districts: RegionInsert[]) {
  console.log('\n🏠 Level 4: Seeding villages (this will take a while)...');

  let allVillages: RegionInsert[] = [];
  let processedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < districts.length; i++) {
    const district = districts[i];
    processedCount++;

    if (processedCount % 100 === 0) {
      process.stdout.write(
        `\r   Fetching ${processedCount}/${districts.length}: ${district.name.padEnd(30)} | Errors: ${errorCount} | Collected: ${allVillages.length} villages...`
      );
    }

    try {
      const response = await fetchWithRetry(`${WILAYAH_API_BASE}/villages/${district.code}.json`);
      const villages = response.data.map((item) => ({
        code: item.code,
        name: item.name,
        level: 4,
        parentCode: district.code,
      }));

      allVillages.push(...villages);

      // Batch insert every VILLAGE_BATCH_SIZE villages
      if (allVillages.length >= VILLAGE_BATCH_SIZE) {
        await batchInsert(allVillages);
        console.log(`\n   ✅ Inserted batch: ${allVillages.length} villages`);
        allVillages = [];
      }
    } catch (error) {
      errorCount++;
      if (errorCount <= 5) {
        console.error(`\n   ❌ Error fetching villages for ${district.code}:`, error);
      }
    }

    await delay(RATE_LIMIT_MS);
  }

  // Insert remaining villages
  if (allVillages.length > 0) {
    await batchInsert(allVillages);
    console.log(`\n   ✅ Inserted final batch: ${allVillages.length} villages`);
  }

  console.log(`\n   ✅ Total villages inserted (cumulative): ${processedCount} districts processed`);
}

async function checkExistingData() {
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(regions);

  const total = countResult.count;

  if (total > 0) {
    const byLevel = await db
      .select({ level: regions.level, count: sql<number>`COUNT(*)::int` })
      .from(regions)
      .groupBy(regions.level)
      .orderBy(regions.level);

    console.log('\n📊 Existing data in regions table:');
    for (const row of byLevel) {
      const levelName = ['Provinsi', 'Kabupaten', 'Kecamatan', 'Desa'][row.level - 1];
      console.log(`   Level ${row.level} (${levelName}): ${row.count} rows`);
    }
    console.log(`   Total: ${total} rows\n`);
  }

  return total;
}

// ============================================================
// MAIN SEED FUNCTION
// ============================================================
async function seedRegions() {
  console.log('🌱 Seeding regions from wilayah.id API...\n');

  // Check existing data
  const existingCount = await checkExistingData();
  if (existingCount > 0) {
    console.log('⚠️  Regions table is not empty. Existing data will be preserved (onConflictDoNothing).');
    console.log('    To clear and re-seed, run: DELETE FROM regions;\n');
  }

  const startTime = Date.now();

  try {
    // Level 1: Provinces
    const provinces = await seedProvinces();

    // Level 2: Regencies
    const regencies = await seedRegencies(provinces);

    // Level 3: Districts
    const districts = await seedDistricts(regencies);

    // Level 4: Villages
    await seedVillages(districts);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Seeding complete in ${elapsed}s!`);

    // Show final stats
    await checkExistingData();
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    throw error;
  }
}

// ============================================================
// EXECUTE
// ============================================================
seedRegions()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
