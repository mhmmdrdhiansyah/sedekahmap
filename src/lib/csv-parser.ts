import Papa from 'papaparse';

export interface ParsedBeneficiaryRow {
  nik: string;
  nama: string;
  alamat: string;
  kebutuhan: string;
  latitude: string;
  longitude: string;
  kodeWilayah: string;
  namaWilayah: string;
  jalurWilayah: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParseResult {
  data: ParsedBeneficiaryRow[];
  errors: ValidationError[];
  valid: number;
  invalid: number;
}

/**
 * parseBeneficiaryCSV - Parse and validate CSV content
 * @param csvText - Raw CSV text content
 * @returns ParseResult with data and validation errors
 */
export function parseBeneficiaryCSV(csvText: string): ParseResult {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => {
      const mapping: Record<string, string> = {
        'nik': 'nik',
        'nama': 'nama',
        'alamat': 'alamat',
        'kebutuhan': 'kebutuhan',
        'latitude': 'latitude',
        'longitude': 'longitude',
        'kodeWilayah': 'kodeWilayah',
        'namaWilayah': 'namaWilayah',
        'jalurWilayah': 'jalurWilayah',
      };
      return mapping[header] || header;
    },
  });

  const errors: ValidationError[] = [];
  const validRows: ParsedBeneficiaryRow[] = [];

  result.data.forEach((row: any, index) => {
    const rowNumber = index + 2; // +2 because of header and 0-based index
    let hasError = false;

    // Validate required fields
    if (!row.nik || row.nik.trim() === '') {
      errors.push({ row: rowNumber, field: 'nik', message: 'NIK wajib diisi' });
      hasError = true;
    } else if (!/^\d{16}$/.test(row.nik.trim())) {
      errors.push({ row: rowNumber, field: 'nik', message: 'NIK harus 16 digit angka' });
      hasError = true;
    }

    if (!row.nama || row.nama.trim() === '') {
      errors.push({ row: rowNumber, field: 'nama', message: 'Nama wajib diisi' });
      hasError = true;
    }

    if (!row.alamat || row.alamat.trim() === '') {
      errors.push({ row: rowNumber, field: 'alamat', message: 'Alamat wajib diisi' });
      hasError = true;
    }

    if (!row.kebutuhan || row.kebutuhan.trim() === '') {
      errors.push({ row: rowNumber, field: 'kebutuhan', message: 'Kebutuhan wajib diisi' });
      hasError = true;
    }

    // Validate coordinates
    const lat = parseFloat(row.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push({ row: rowNumber, field: 'latitude', message: 'Latitude tidak valid (-90 sampai 90)' });
      hasError = true;
    }

    const lng = parseFloat(row.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push({ row: rowNumber, field: 'longitude', message: 'Longitude tidak valid (-180 sampai 180)' });
      hasError = true;
    }

    if (!row.kodeWilayah || row.kodeWilayah.trim() === '') {
      errors.push({ row: rowNumber, field: 'kodeWilayah', message: 'Kode wilayah wajib diisi' });
      hasError = true;
    }

    // Add to valid rows if no errors
    if (!hasError) {
      validRows.push({
        nik: row.nik.trim(),
        nama: row.nama.trim(),
        alamat: row.alamat.trim(),
        kebutuhan: row.kebutuhan.trim(),
        latitude: row.latitude,
        longitude: row.longitude,
        kodeWilayah: row.kodeWilayah.trim(),
        namaWilayah: row.namaWilayah?.trim() || '',
        jalurWilayah: row.jalurWilayah?.trim() || '',
      });
    }
  });

  return {
    data: validRows,
    errors,
    valid: validRows.length,
    invalid: errors.length,
  };
}

/**
 * getCSVTemplate - Return CSV template content
 */
export function getCSVTemplate(): string {
  return `nik,nama,alamat,kebutuhan,latitude,longitude,kodeWilayah,namaWilayah,jalurWilayah
3201234567890001,John Doe,Jl. Merdeka No. 1,Bahan makanan,-6.2088,106.8456,32.01.01.01,Desa Contoh,"Jawa Barat > Kab. Contoh > Kec. Contoh > Desa Contoh"
3201234567890002,Jane Smith,Jl. Sudirman No. 2,Obat-obatan,-6.1751,106.8650,32.01.01.02,Desa Lain,"Jawa Barat > Kab. Contoh > Kec. Contoh > Desa Lain"`;
}
