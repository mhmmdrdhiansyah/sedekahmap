import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth-utils';
import { uploadProofPhoto } from '@/services/upload.service';

// ============================================================
// POST /api/upload
// Upload proof photo file
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // Auth check - user must be logged in
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'File harus diisi' },
        { status: 400 }
      );
    }

    // Upload file
    const result = await uploadProofPhoto(file);

    return NextResponse.json(
      {
        url: result.url,
        filename: result.filename,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error:', error);

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

      // Validation errors from upload service
      if (
        error.message.includes('Ukuran file terlalu besar') ||
        error.message.includes('Tipe file tidak valid') ||
        error.message.includes('File harus diisi')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Gagal mengupload file' },
      { status: 500 }
    );
  }
}
