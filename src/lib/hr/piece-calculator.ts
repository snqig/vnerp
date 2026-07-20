import { getDrizzleDb } from '@/lib/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { hrPieceWorkDetail, hrPieceRate } from '@/lib/db/schema';

const db = getDrizzleDb();

export interface PieceSalaryResult {
  details: {
    processCode: string;
    quantity: number;
    defectiveQuantity: number;
    unitPrice: number;
    qualifiedRate: number;
    amount: number;
  }[];
  totalAmount: number;
  totalQuantity: number;
  totalDefective: number;
  avgDefectiveRate: number;
}

export async function calculatePieceSalary(
  employeeId: number,
  month: string
): Promise<PieceSalaryResult> {
  const [year, mon] = month.split('-');
  const startDate = `${year}-${mon}-01`;
  const endDate = `${year}-${mon}-31`;

  const details = await db.select().from(hrPieceWorkDetail)
    .where(and(
      eq(hrPieceWorkDetail.employeeId, employeeId),
      gte(hrPieceWorkDetail.workDate, new Date(startDate)),
      lte(hrPieceWorkDetail.workDate, new Date(endDate)),
    ));

  const results: PieceSalaryResult['details'] = [];
  let totalAmount = 0;
  let totalQuantity = 0;
  let totalDefective = 0;

  for (const d of details) {
    const qty = d.quantity ?? 0;
    const defective = d.defectiveQuantity ?? 0;
    const qualifiedRate = qty > 0 ? (qty - defective) / qty : 0;
    const rate = qualifiedRate < 0 ? 0 : qualifiedRate;

    const amount = qty * Number(d.unitPrice) * rate;
    results.push({
      processCode: d.processCode,
      quantity: qty,
      defectiveQuantity: defective,
      unitPrice: Number(d.unitPrice),
      qualifiedRate: rate,
      amount,
    });
    totalAmount += amount;
    totalQuantity += qty;
    totalDefective += defective;
  }

  return {
    details: results,
    totalAmount,
    totalQuantity,
    totalDefective,
    avgDefectiveRate: totalQuantity > 0 ? totalDefective / totalQuantity : 0,
  };
}

/**
 * 获取工序单价（按产品类型匹配最新的生效单价）
 */
export async function getPieceUnitPrice(
  processCode: string,
  productType?: string
): Promise<number> {
  const rates = await db.select().from(hrPieceRate)
    .where(and(
      eq(hrPieceRate.processCode, processCode),
      productType ? eq(hrPieceRate.productType, productType) : undefined,
      eq(hrPieceRate.status, 1),
      eq(hrPieceRate.deleted, 0),
    ))
    .orderBy(hrPieceRate.effectiveDate)
    .limit(1);

  return rates.length > 0 ? Number(rates[0].unitPrice) : 0;
}
