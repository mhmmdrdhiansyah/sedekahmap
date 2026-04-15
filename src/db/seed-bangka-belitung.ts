import { db } from '@/db';
import { beneficiaries } from '@/db/schema/beneficiaries';
import { accessRequests } from '@/db/schema/accessRequests';
import { distributions } from '@/db/schema/distributions';
import { reviews } from '@/db/schema/reviews';
import { users } from '@/db/schema/users';

// ============================================================
// SEED: Clear tables and add Bangka Belitung beneficiaries
// ============================================================

interface BangkaBelitungBeneficiary {
  nik: string;
  name: string;
  address: string;
  needs: string;
  latitude: number;
  longitude: number;
  regionCode: string;
  regionName: string;
  regionPath: string;
}

// 10 Dummy data Bangka Belitung
const BANGKA_BELITUNG_BENEFICIARIES: BangkaBelitungBeneficiary[] = [
  {
    nik: "1901010101900001",
    name: "Budi Santoso",
    address: "Jl. Jenderal Sudirman No. 45, Pangkalbalam",
    needs: "Sembako (beras, minyak goreng, gula) untuk keluarga 4 orang",
    latitude: -2.1315,
    longitude: 106.1169,
    regionCode: "19.01.01.1001",
    regionName: "Pangkalbalam",
    regionPath: "Kepulauan Bangka Belitung > Kota Pangkalpinang > Kec. Gerunggang > Kel. Taman Sari"
  },
  {
    nik: "1902020202900002",
    name: "Siti Aminah",
    address: "Jl. Pemuda No. 12, Sungailiat",
    needs: "Bantuan pengobatan darurat untuk diabetes",
    latitude: -1.8596,
    longitude: 106.1099,
    regionCode: "19.02.01.1001",
    regionName: "Sungailiat",
    regionPath: "Kepulauan Bangka Belitung > Kab. Bangka > Kec. Sungailiat > Kel. Paritpadang"
  },
  {
    nik: "1903030303900003",
    name: "Ahmad Subarjo",
    address: "Dusun 1, Desa Belo Laut, Mentok",
    needs: "Perbaikan atap rumah yang bocor dan biaya sekolah anak",
    latitude: -1.7700,
    longitude: 105.1700,
    regionCode: "19.03.01.2001",
    regionName: "Mentok",
    regionPath: "Kepulauan Bangka Belitung > Kab. Bangka Barat > Kec. Mentok > Desa Belo Laut"
  },
  {
    nik: "1904040404900004",
    name: "Maria Kristina",
    address: "Jl. Pantai Tikus No. 8, Toboali",
    needs: "Modal usaha kecil untuk jualan gorengan",
    latitude: -3.0133,
    longitude: 106.4526,
    regionCode: "19.04.01.1001",
    regionName: "Toboali",
    regionPath: "Kepulauan Bangka Belitung > Kab. Bangka Selatan > Kec. Toboali > Kel. Toboali"
  },
  {
    nik: "1905050505900005",
    name: "Rahmat Hidayat",
    address: "Dusun 2, Desa Klabat, Belinyu",
    needs: "Sembako dan biaya pengobatan istri yang sakit",
    latitude: -1.6426,
    longitude: 105.7769,
    regionCode: "19.05.01.2002",
    regionName: "Belinyu",
    regionPath: "Kepulauan Bangka Belitung > Kab. Bangka > Kec. Belinyu > Desa Klabat"
  },
  {
    nik: "1906060606900006",
    name: "Dewi Sartika",
    address: "Jl. Pembangunan No. 23, Koba",
    needs: "Bantuan pendidikan anak SMA dan biaya hidup sehari-hari",
    latitude: -2.4940,
    longitude: 106.3892,
    regionCode: "19.06.01.1001",
    regionName: "Koba",
    regionPath: "Kepulauan Bangka Belitung > Kab. Bangka Tengah > Kec. Koba > Kel. Koba"
  },
  {
    nik: "1907070707900007",
    name: "Mangku Jaya",
    address: "Dusun 3, Desa Kelapa, Manggar",
    needs: "Modal usaha warung kopi dan perbaikan rumah",
    latitude: -2.8876,
    longitude: 106.4889,
    regionCode: "19.07.01.2003",
    regionName: "Manggar",
    regionPath: "Kepulauan Bangka Belitung > Kab. Bangka Timur > Kec. Manggar > Desa Kelapa"
  },
  {
    nik: "1908080808900008",
    name: "Nyoman Suastika",
    address: "Jl. Pendidikan No. 56, Tanjung Pandan",
    needs: "Bantuan biaya sekolah 3 anak dan sembako",
    latitude: -2.7435,
    longitude: 107.6362,
    regionCode: "19.08.01.1001",
    regionName: "Tanjung Pandan",
    regionPath: "Kepulauan Bangka Belitung > Kab. Belitung > Kec. Tanjung Pandan > Kel. Tanjung Pendam"
  },
  {
    nik: "1909090909900009",
    name: "Hasan Basri",
    address: "Dusun 1, Desa Sijuk, Belitung",
    needs: "Perbaikan sepeda motor untuk ojek dan sembako",
    latitude: -2.6149,
    longitude: 107.6303,
    regionCode: "19.08.02.2001",
    regionName: "Sijuk",
    regionPath: "Kepulauan Bangka Belitung > Kab. Belitung > Kec. Sijuk > Desa Sijuk"
  },
  {
    nik: "1910101010900010",
    name: "Ratna Sari",
    address: "Jl. Lintas Pantai No. 34, Manggar",
    needs: "Bantuan modal usaha kue tradisional dan biaya pengobatan orang tua",
    latitude: -3.2341,
    longitude: 107.8917,
    regionCode: "19.08.03.1001",
    regionName: "Membalong",
    regionPath: "Kepulauan Bangka Belitung > Kab. Belitung > Kec. Membalong > Kel. Membalong"
  }
];

export async function seedBangkaBelitungBeneficiaries() {
  console.log("🌴 Seeding Bangka Belitung beneficiaries...\n");

  try {
    // Step 1: Clear existing data (in correct order due to FK constraints)
    console.log("🗑️  Clearing existing data...");

    await db.delete(reviews);
    console.log("   ✓ Cleared reviews table");

    await db.delete(distributions);
    console.log("   ✓ Cleared distributions table");

    await db.delete(accessRequests);
    console.log("   ✓ Cleared access_requests table");

    await db.delete(beneficiaries);
    console.log("   ✓ Cleared beneficiaries table");

    console.log("");

    // Step 2: Insert Bangka Belitung beneficiaries
    console.log("📥 Inserting 10 Bangka Belitung beneficiaries...");

    for (const beneficiary of BANGKA_BELITUNG_BENEFICIARIES) {
      await db.insert(beneficiaries).values({
        nik: beneficiary.nik,
        name: beneficiary.name,
        address: beneficiary.address,
        needs: beneficiary.needs,
        latitude: beneficiary.latitude,
        longitude: beneficiary.longitude,
        regionCode: beneficiary.regionCode,
        regionName: beneficiary.regionName,
        regionPath: beneficiary.regionPath,
        status: 'verified',
      });
      console.log(`   ✓ Inserted: ${beneficiary.name} (${beneficiary.regionName})`);
    }

    console.log("");
    console.log("✅ Seeding completed successfully!");
    console.log(`   - Total beneficiaries: ${BANGKA_BELITUNG_BENEFICIARIES.length}`);
    console.log("   - Region: Kepulauan Bangka Belitung");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedBangkaBelitungBeneficiaries()
    .then(() => {
      console.log("\n✨ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Error:", error);
      process.exit(1);
    });
}
