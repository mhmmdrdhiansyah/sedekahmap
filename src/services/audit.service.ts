import { db } from '@/db';
import { auditLogs } from '@/db/schema/auditLogs';
import { eq, and, desc } from 'drizzle-orm';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'SOFT_DELETE'
  | 'RESTORE';

export interface CreateAuditLogParams {
  userId: string;
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * createAuditLog - Create a new audit log entry
 * CRITICAL: oldValues and newValues MUST NOT contain NIK plain text
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  await db.insert(auditLogs).values({
    userId: params.userId,
    action: params.action,
    tableName: params.tableName,
    recordId: params.recordId,
    oldValues: params.oldValues ?? null,
    newValues: params.newValues ?? null,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
  });
}

export interface GetAuditLogsParams {
  tableName?: string;
  recordId?: string;
  limit?: number;
}

/**
 * getAuditLogs - Get audit logs with optional filters
 */
export async function getAuditLogs(
  params: GetAuditLogsParams = {}
): Promise<any[]> {
  const { tableName, recordId, limit = 100 } = params;

  let query = db.select().from(auditLogs);

  const conditions = [];
  if (tableName) {
    conditions.push(eq(auditLogs.tableName, tableName));
  }
  if (recordId) {
    conditions.push(eq(auditLogs.recordId, recordId));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return await query.orderBy(desc(auditLogs.createdAt)).limit(limit);
}
