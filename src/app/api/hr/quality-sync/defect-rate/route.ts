import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';
import { getDrizzleDb } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { hrPieceWorkDetail } from '@/lib/db/schema';

const db = getDrizzleDb();

export const GET = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId');
  const month = searchParams.get('month');
  const processCode = searchParams.get('processCode');

  if (!employeeId || !month) {
    return errorResponse(ts('k_o23ml3'), 400, 400);
  }

  const empId = parseInt(employeeId);
  if (isNaN(empId) || empId < 1) {
    return errorResponse(ts('k_1drgngw'), 400, 400);
  }
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return errorResponse(ts('k_1i9m41z'), 400, 400);
  }

  const [year, mon] = month.split('-');
  const _startDate = `${year}-${mon}-01`;
  const _endDate = `${year}-${mon}-31`;

  const conditions = [
    eq(hrPieceWorkDetail.employeeId, empId),
    and(
      eq(hrPieceWorkDetail.syncStatus, 1),
    ),
  ];

  if (processCode) {
    conditions.push(eq(hrPieceWorkDetail.processCode, processCode));
  }

  const details = await db.select({
    quantity: hrPieceWorkDetail.quantity,
    defectiveQuantity: hrPieceWorkDetail.defectiveQuantity,
    processCode: hrPieceWorkDetail.processCode,
    workDate: hrPieceWorkDetail.workDate,
  })
    .from(hrPieceWorkDetail)
    .where(and(...conditions));

  const totalQuantity = details.reduce((s, d) => s + (d.quantity ?? 0), 0);
  const totalDefective = details.reduce((s, d) => s + (d.defectiveQuantity ?? 0), 0);
  const defectRate = totalQuantity > 0 ? totalDefective / totalQuantity : 0;

  return successResponse({
    employeeId: empId,
    month,
    processCode: processCode || null,
    totalQuantity,
    totalDefective,
    defectRate: Number((defectRate * 100).toFixed(2)),
    recordCount: details.length,
    details,
  });
}, { errorMessage: '查询缺陷率失败' });
