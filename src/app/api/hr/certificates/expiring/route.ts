import { NextRequest } from 'next/server';
import { getDrizzleDb } from '@/lib/db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { hrCertificate, sysEmployee } from '@/lib/db/schema';
import { withPermission } from '@/lib/api-permissions';
import { successResponse } from '@/lib/api-response';

const db = getDrizzleDb();

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const future = new Date(now);
  future.setDate(future.getDate() + days);

  const list = await db.select({
    id: hrCertificate.id,
    certName: hrCertificate.certName,
    certCode: hrCertificate.certCode,
    certType: hrCertificate.certType,
    employeeId: hrCertificate.employeeId,
    employeeName: sysEmployee.name,
    issueDate: hrCertificate.issueDate,
    expiryDate: hrCertificate.expiryDate,
    daysUntilExpiry: sql<number>`DATEDIFF(${hrCertificate.expiryDate}, CURDATE())`,
  })
    .from(hrCertificate)
    .leftJoin(sysEmployee, eq(hrCertificate.employeeId, sysEmployee.id))
    .where(and(
      eq(hrCertificate.deleted, 0),
      eq(hrCertificate.status, 1),
      gte(hrCertificate.expiryDate, now),
      lte(hrCertificate.expiryDate, future),
    ))
    .orderBy(hrCertificate.expiryDate);

  return successResponse({ list });
}, { errorMessage: '获取到期证书列表失败' });
