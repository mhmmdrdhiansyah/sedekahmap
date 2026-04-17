import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { ROLES } from '@/lib/constants';
import { bulkImportBeneficiaries } from '@/services/beneficiary.service';
import { parseBeneficiaryCSV } from '@/lib/csv-parser';

// ============================================================
// POST /api/verifikator/beneficiaries/import
// Import beneficiaries from CSV file
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(ROLES.VERIFIKATOR);
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json({ error: 'File harus berformat CSV' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file maksimal 5MB' }, { status: 400 });
    }

    const csvText = await file.text();
    const parseResult = parseBeneficiaryCSV(csvText);

    if (parseResult.valid === 0) {
      return NextResponse.json({
        error: 'Tidak ada data valid untuk diimpor',
        validationErrors: parseResult.errors,
      }, { status: 400 });
    }

    const importResult = await bulkImportBeneficiaries(
      parseResult.data,
      user.id
    );

    return NextResponse.json({
      data: {
        total: parseResult.data.length,
        success: importResult.success,
        failed: importResult.failed,
        errors: importResult.errors,
        validationErrors: parseResult.errors,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Import error:', error);

    if (error instanceof Error) {
      if (error.message.startsWith('UNAUTHORIZED')) {
        return NextResponse.json(
          { error: 'Anda harus login terlebih dahulu' },
          { status: 401 }
        );
      }
      if (error.message.startsWith('FORBIDDEN')) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal mengimpor data' },
      { status: 500 }
    );
  }
}
