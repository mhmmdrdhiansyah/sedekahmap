import { db } from '@/db';
import { regions } from '@/db/schema/regions';
import { eq, and } from 'drizzle-orm';

export interface Region {
  code: string;
  name: string;
  level: number;
  parentCode: string | null;
}

export async function getRegions(level: number, parentCode?: string): Promise<Region[]> {
  const conditions = eq(regions.level, level);

  if (parentCode) {
    return await db
      .select({
        code: regions.code,
        name: regions.name,
        level: regions.level,
        parentCode: regions.parentCode,
      })
      .from(regions)
      .where(and(conditions, eq(regions.parentCode, parentCode)))
      .orderBy(regions.name);
  }

  return await db
    .select({
      code: regions.code,
      name: regions.name,
      level: regions.level,
      parentCode: regions.parentCode,
    })
    .from(regions)
    .where(conditions)
    .orderBy(regions.name);
}
