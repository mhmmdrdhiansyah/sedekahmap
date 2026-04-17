import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/constants';
import { getAuditLogs } from '@/services/audit.service';

// ============================================================
// GET /api/admin/audit-logs
// Get audit logs with optional filters
// Query params: tableName, recordId, limit
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.USER_READ);

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('tableName') || undefined;
    const recordId = searchParams.get('recordId') || undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : undefined;

    const data = await getAuditLogs({ tableName, recordId, limit });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Get audit logs error:', error);

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
      { error: 'Gagal memuat audit logs' },
      { status: 500 }
    );
  }
}
