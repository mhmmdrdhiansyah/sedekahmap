"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import type { ParsedBeneficiaryRow, ValidationError } from "@/lib/csv-parser";

// ============================================================
// TYPES
// ============================================================

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
  validationErrors: ValidationError[];
}

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function VerifikatorImportPage() {
  const { showSuccess, showError } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedBeneficiaryRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);

      // Parse and preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(selectedFile);
    }
  };

  // Parse CSV for preview
  const parseCSV = async (csvText: string) => {
    try {
      const { Papa } = await import('papaparse');

      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
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

      result.data.forEach((row: any, index: number) => {
        const rowNumber = index + 2;
        let hasError = false;

        // Validate NIK
        if (!row.nik || !/^\d{16}$/.test(row.nik?.trim())) {
          errors.push({
            row: rowNumber,
            field: 'nik',
            message: 'NIK harus 16 digit angka'
          });
          hasError = true;
        }

        // Validate required fields
        if (!row.nama?.trim()) {
          errors.push({ row: rowNumber, field: 'nama', message: 'Nama wajib diisi' });
          hasError = true;
        }
        if (!row.alamat?.trim()) {
          errors.push({ row: rowNumber, field: 'alamat', message: 'Alamat wajib diisi' });
          hasError = true;
        }

        // Validate coordinates
        const lat = parseFloat(row.latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          errors.push({
            row: rowNumber,
            field: 'latitude',
            message: 'Latitude tidak valid'
          });
          hasError = true;
        }

        const lng = parseFloat(row.longitude);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          errors.push({
            row: rowNumber,
            field: 'longitude',
            message: 'Longitude tidak valid'
          });
          hasError = true;
        }

        if (!hasError) {
          validRows.push({
            nik: row.nik.trim(),
            nama: row.nama.trim(),
            alamat: row.alamat.trim(),
            kebutuhan: row.kebutuhan?.trim() || '',
            latitude: row.latitude,
            longitude: row.longitude,
            kodeWilayah: row.kodeWilayah?.trim() || '',
            namaWilayah: row.namaWilayah?.trim() || '',
            jalurWilayah: row.jalurWilayah?.trim() || '',
          });
        }
      });

      setPreview(validRows.slice(0, 10)); // Show max 10 rows for preview
      setValidationErrors(errors);
    } catch (err) {
      showError('Gagal membaca file CSV');
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(droppedFile);
    } else {
      showError('File harus berformat CSV');
    }
  }, [showError]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Import data
  const handleImport = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/verifikator/beneficiaries/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal mengimpor data');
      }

      const result = await response.json();
      setImportResult(result.data);
      showSuccess(`Import selesai: ${result.data.success} berhasil, ${result.data.failed} gagal`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Gagal mengimpor data');
    } finally {
      setUploading(false);
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    const template = `nik,nama,alamat,kebutuhan,latitude,longitude,kodeWilayah,namaWilayah,jalurWilayah
3201234567890001,John Doe,Jl. Merdeka No. 1,Bahan makanan,-6.2088,106.8456,32.01.01.01,Desa Contoh,"Jawa Barat > Kab. Contoh > Kec. Contoh > Desa Contoh"
3201234567890002,Jane Smith,Jl. Sudirman No. 2,Obat-obatan,-6.1751,106.8650,32.01.01.02,Desa Lain,"Jawa Barat > Kab. Contoh > Kec. Contoh > Desa Lain"`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-beneficiary.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Import CSV Data Penerima Manfaat
        </h1>
        <p className="text-gray-600">
          Import banyak data sekaligus dari file CSV
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors"
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-gray-600 mb-2">
              Drag & drop file CSV di sini, atau{" "}
              <span className="text-primary font-medium">browse</span>
            </p>
            <p className="text-sm text-gray-400">Maksimal 5MB</p>
          </label>
        </div>

        {/* File info */}
        {file && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="text-sm text-gray-700">
              <span className="font-medium">{file.name}</span>
              <span className="text-gray-400 ml-2">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFile(null);
                setPreview([]);
                setValidationErrors([]);
                setImportResult(null);
              }}
            >
              Hapus
            </Button>
          </div>
        )}

        {/* Template download */}
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateModal(true)}
          >
            Lihat Template CSV
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-red-800 mb-2">
            Error Validasi ({validationErrors.length})
          </h3>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {validationErrors.slice(0, 10).map((error, idx) => (
              <div key={idx} className="text-xs text-red-700">
                Baris {error.row}: {error.field} - {error.message}
              </div>
            ))}
            {validationErrors.length > 10 && (
              <div className="text-xs text-red-600 italic">
                ... dan {validationErrors.length - 10} error lainnya
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && !importResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Preview Data ({preview.length} baris ditampilkan)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">NIK</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Nama</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Alamat</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Kebutuhan</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Koordinat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-gray-900">{row.nik}</td>
                    <td className="px-3 py-2 text-gray-900">{row.nama}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[150px] truncate">{row.alamat}</td>
                    <td className="px-3 py-2 text-gray-600">{row.kebutuhan}</td>
                    <td className="px-3 py-2 text-gray-600">{row.latitude}, {row.longitude}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import button */}
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleImport}
              isLoading={uploading}
              disabled={validationErrors.length > 0}
            >
              Import {preview.length} Data
            </Button>
          </div>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className={`rounded-xl p-4 border ${
          importResult.failed === 0
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <h3 className={`text-sm font-medium mb-3 ${
            importResult.failed === 0 ? 'text-green-800' : 'text-yellow-800'
          }`}>
            Hasil Import
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium text-gray-900">{importResult.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Berhasil:</span>
              <span className="font-medium text-green-700">{importResult.success}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gagal:</span>
              <span className={`font-medium ${importResult.failed > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                {importResult.failed}
              </span>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-2">Error Details:</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {importResult.errors.map((error, idx) => (
                  <div key={idx} className="text-xs text-red-700">
                    Baris {error.row}: {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImportResult(null);
                setFile(null);
                setPreview([]);
                setValidationErrors([]);
              }}
            >
              Import Lagi
            </Button>
            {importResult.success > 0 && (
              <Button
                size="sm"
                onClick={() => window.location.href = '/verifikator/data-saya'}
              >
                Lihat Data Saya
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Template Modal */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Template CSV"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTemplateModal(false)}>
              Tutup
            </Button>
            <Button onClick={handleDownloadTemplate}>
              Download Template
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Download template ini dan isi dengan data Anda. Pastikan format sesuai.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
            <code className="text-xs text-gray-700 whitespace-pre">
{`nik,nama,alamat,kebutuhan,latitude,longitude,kodeWilayah,namaWilayah,jalurWilayah
3201234567890001,John Doe,Jl. Merdeka No. 1,Bahan makanan,-6.2088,106.8456,32.01.01.01,Desa Contoh,"Jawa Barat > Kab. Contoh > Kec. Contoh > Desa Contoh"
3201234567890002,Jane Smith,Jl. Sudirman No. 2,Obat-obatan,-6.1751,106.8650,32.01.01.02,Desa Lain,"Jawa Barat > Kab. Contoh > Kec. Contoh > Desa Lain"`}
            </code>
          </div>
          <div className="text-xs text-gray-500">
            <p className="font-medium mb-1">Keterangan kolom:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>nik:</strong> 16 digit angka</li>
              <li><strong>latitude:</strong> -90 sampai 90</li>
              <li><strong>longitude:</strong> -180 sampai 180</li>
              <li><strong>jalurWilayah:</strong> Format: "Prov > Kab > Kec > Desa"</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}
