-- ============================================================
-- SEED SCRIPT: Clear tables and add Bangka Belitung beneficiaries
-- Run this directly in your database (pgAdmin, DBeaver, or psql)
-- ============================================================

-- Step 1: Clear existing data (in correct order due to FK constraints)
DELETE FROM reviews;
DELETE FROM distributions;
DELETE FROM access_requests;
DELETE FROM beneficiaries;

-- Step 2: Insert 10 Bangka Belitung beneficiaries
INSERT INTO beneficiaries (
  id,
  nik,
  name,
  address,
  needs,
  latitude,
  longitude,
  region_code,
  region_name,
  region_path,
  status,
  created_at,
  updated_at
) VALUES
(
  gen_random_uuid(),
  '1901010101900001',
  'Budi Santoso',
  'Jl. Jenderal Sudirman No. 45, Pangkalbalam',
  'Sembako (beras, minyak goreng, gula) untuk keluarga 4 orang',
  -2.1315,
  106.1169,
  '19.01.01.1001',
  'Pangkalbalam',
  'Kepulauan Bangka Belitung > Kota Pangkalpinang > Kec. Gerunggang > Kel. Taman Sari',
  'verified',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '1902020202900002',
  'Siti Aminah',
  'Jl. Pemuda No. 12, Sungailiat',
  'Bantuan pengobatan darurat untuk diabetes',
  -1.8596,
  106.1099,
  '19.02.01.1001',
  'Sungailiat',
  'Kepulauan Bangka Belitung > Kab. Bangka > Kec. Sungailiat > Kel. Paritpadang',
  'verified',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '1903030303900003',
  'Ahmad Subarjo',
  'Dusun 1, Desa Belo Laut, Mentok',
  'Perbaikan atap rumah yang bocor dan biaya sekolah anak',
  -1.7700,
  105.1700,
  '19.03.01.2001',
  'Mentok',
  'Kepulauan Bangka Belitung > Kab. Bangka Barat > Kec. Mentok > Desa Belo Laut',
  'verified',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '1904040404900004',
  'Maria Kristina',
  'Jl. Pantai Tikus No. 8, Toboali',
  'Modal usaha kecil untuk jualan gorengan',
  -3.0133,
  106.4526,
  '19.04.01.1001',
  'Toboali',
  'Kepulauan Bangka Belitung > Kab. Bangka Selatan > Kec. Toboali > Kel. Toboali',
  'verified',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '1905050505900005',
  'Rahmat Hidayat',
  'Dusun 2, Desa Klabat, Belinyu',
  'Sembako dan biaya pengobatan istri yang sakit',
  -1.6426,
  105.7769,
  '19.05.01.2002',
  'Belinyu',
  'Kepulauan Bangka Belitung > Kab. Bangka > Kec. Belinyu > Desa Klabat',
  'verified',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '1906060606900006',
  'Dewi Sartika',
  'Jl. Pembangunan No. 23, Koba',
  'Bantuan pendidikan anak SMA dan biaya hidup sehari-hari',
  -2.4940,
  106.3892,
  '19.06.01.1001',
  'Koba',
  'Kepulauan Bangka Belitung > Kab. Bangka Tengah > Kec. Koba > Kel. Koba',
  'verified',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '1907070707900007',
  'Mangku Jaya',
  'Dusun 3, Desa Kelapa, Manggar',
  'Modal usaha warung kopi dan perbaikan rumah',
  -2.8876,
  106.4889,
  '19.07.01.2003',
  'Manggar',
  'Kepulauan Bangka Belitung > Kab. Bangka Timur > Kec. Manggar > Desa Kelapa',
  'verified',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '1908080808900008',
  'Nyoman Suastika',
  'Jl. Pendidikan No. 56, Tanjung Pandan',
  'Bantuan biaya sekolah 3 anak dan sembako',
  -2.7435,
  107.6362,
  '19.08.01.1001',
  'Tanjung Pandan',
  'Kepulauan Bangka Belitung > Kab. Belitung > Kec. Tanjung Pandan > Kel. Tanjung Pendam',
  'verified',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '1909090909900009',
  'Hasan Basri',
  'Dusun 1, Desa Sijuk, Belitung',
  'Perbaikan sepeda motor untuk ojek dan sembako',
  -2.6149,
  107.6303,
  '19.08.02.2001',
  'Sijuk',
  'Kepulauan Bangka Belitung > Kab. Belitung > Kec. Sijuk > Desa Sijuk',
  'verified',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '1910101010900010',
  'Ratna Sari',
  'Jl. Lintas Pantai No. 34, Manggar',
  'Bantuan modal usaha kue tradisional dan biaya pengobatan orang tua',
  -3.2341,
  107.8917,
  '19.08.03.1001',
  'Membalong',
  'Kepulauan Bangka Belitung > Kab. Belitung > Kec. Membalong > Kel. Membalong',
  'verified',
  NOW(),
  NOW()
);

-- Verify insertion
SELECT COUNT(*) as total_beneficiaries, region_name
FROM beneficiaries
GROUP BY region_name;

-- Display all inserted data
SELECT id, name, region_name, needs, status
FROM beneficiaries
ORDER BY region_name;
