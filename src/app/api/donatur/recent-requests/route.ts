import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { ROLES } from '@/lib/constants';
import { getDonaturRecentRequests } from '@/services/donatur.service';

// ============================================================
// GET /api/donatur/recent-requests
// Get recent access requests for the logged-in donatur
// ============================================================
export async function GET() {
  try {
    const user = await requireRole(ROLES.DONATUR);
    const data = await getDonaturRecentRequests(user.id);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Get recent requests error:', error);

    // Handle auth errors
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
      { error: 'Gagal memuat data permintaan terbaru' },
      { status: 500 }
    );
  }
}
