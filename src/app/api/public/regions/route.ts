import { NextRequest, NextResponse } from 'next/server';
import { getRegions } from '@/services/region.service';
import { REGION_LEVELS } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const levelParam = searchParams.get('level');
    const parentCode = searchParams.get('parentCode');

    // Validate required parameters
    if (!levelParam) {
      return NextResponse.json(
        { error: 'Parameter "level" wajib diisi' },
        { status: 400 }
      );
    }

    const level = parseInt(levelParam, 10);

    // Validate level value
    if (
      isNaN(level) ||
      level < REGION_LEVELS.PROVINSI ||
      level > REGION_LEVELS.DESA
    ) {
      return NextResponse.json(
        { error: 'Parameter "level" harus antara 1-4' },
        { status: 400 }
      );
    }

    // Validate parentCode for levels > 1
    if (level > REGION_LEVELS.PROVINSI && !parentCode) {
      return NextResponse.json(
        { error: 'Parameter "parentCode" wajib diisi untuk level > 1' },
        { status: 400 }
      );
    }

    const data = await getRegions(level, parentCode || undefined);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Public regions API error:', error);
    return NextResponse.json(
      { error: 'Gagal memuat data wilayah' },
      { status: 500 }
    );
  }
}
