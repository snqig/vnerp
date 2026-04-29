import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

function computeExpiryWeight(expireDate: string | null): number {
  if (!expireDate) return 0;
  const now = new Date();
  const exp = new Date(expireDate);
  const daysToExpire = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysToExpire <= 0) return 100;
  if (daysToExpire <= 7) return 90;
  if (daysToExpire <= 15) return 70;
  if (daysToExpire <= 30) return 50;
  if (daysToExpire <= 60) return 30;
  if (daysToExpire <= 90) return 15;
  return 0;
}

function computeCompatibilityScore(batch: any, workOrderNo?: string, pantoneCode?: string): number {
  let score = 0;
  if (batch.material_code && pantoneCode) {
    if (batch.material_code.includes(pantoneCode)) score += 50;
  }
  if (batch.batch_no && workOrderNo) {
    const woPrefix = workOrderNo.replace(/[^A-Z]/g, '').slice(0, 3);
    if (batch.batch_no.includes(woPrefix)) score += 20;
  }
  return score;
}

function computeOverrideRiskScore(batch: any): number {
  const expiryWeight = computeExpiryWeight(batch.expire_date);
  const availableQty = Number(batch.available_qty || 0);
  let risk = 0;
  if (expiryWeight >= 90) risk += 40;
  else if (expiryWeight >= 70) risk += 25;
  else if (expiryWeight >= 50) risk += 10;
  if (availableQty <= 0) risk += 30;
  if (batch.status === 'frozen') risk += 50;
  return Math.min(100, risk);
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const materialId = searchParams.get('materialId');
  const warehouseId = searchParams.get('warehouseId');
  const requiredQty = Number(searchParams.get('requiredQty') || 0);
  const workOrderNo = searchParams.get('workOrderNo') || undefined;
  const pantoneCode = searchParams.get('pantoneCode') || undefined;
  const minPackageQty = Number(searchParams.get('minPackageQty') || 0);

  if (!materialId || !warehouseId) {
    return errorResponse('缺少必填参数: materialId, warehouseId', 400, 400);
  }

  const batchRows: any = await query(`
    SELECT
      ib.id,
      ib.batch_no,
      ib.material_id,
      ib.material_code,
      ib.material_name,
      ib.available_qty,
      ib.unit_price,
      ib.inbound_date,
      ib.expire_date,
      ib.status,
      ib.produce_date,
      ib.unit,
      CASE
        WHEN ib.expire_date IS NOT NULL AND ib.expire_date < CURDATE() THEN 'EXPIRED'
        WHEN ib.status = 'frozen' THEN 'FROZEN'
        WHEN ib.status = 'expired' THEN 'EXPIRED'
        WHEN ib.available_qty <= 0 THEN 'EMPTY'
        ELSE 'AVAILABLE'
      END as fifo_status,
      (ib.available_qty * ib.unit_price) as batch_value,
      CASE
        WHEN ib.expire_date IS NULL THEN 9999
        ELSE DATEDIFF(ib.expire_date, CURDATE())
      END as days_to_expire
    FROM inv_inventory_batch ib
    WHERE ib.material_id = ? AND ib.warehouse_id = ? AND ib.deleted = 0
    ORDER BY
      CASE
        WHEN ib.status = 'normal' AND (ib.expire_date IS NULL OR ib.expire_date >= CURDATE()) THEN 0
        WHEN ib.status = 'frozen' THEN 2
        ELSE 1
      END,
      CASE
        WHEN ib.expire_date IS NOT NULL AND DATEDIFF(ib.expire_date, CURDATE()) <= 30 THEN 0
        WHEN ib.expire_date IS NOT NULL AND DATEDIFF(ib.expire_date, CURDATE()) <= 60 THEN 1
        ELSE 2
      END,
      ib.inbound_date ASC,
      ib.expire_date ASC,
      ib.id ASC
  `, [materialId, warehouseId]);

  const availableBatches = batchRows
    .filter((b: any) => b.fifo_status === 'AVAILABLE')
    .map((b: any) => {
      const expiryWeight = computeExpiryWeight(b.expire_date);
      const compatibilityScore = computeCompatibilityScore(b, workOrderNo, pantoneCode);
      const overrideRiskScore = computeOverrideRiskScore(b);
      return {
        ...b,
        expiry_weight: expiryWeight,
        compatibility_score: compatibilityScore,
        override_risk_score: overrideRiskScore,
        is_near_expiry: expiryWeight >= 50,
        is_urgent_expiry: expiryWeight >= 70,
      };
    })
    .sort((a: any, b: any) => {
      if (a.is_urgent_expiry && !b.is_urgent_expiry) return -1;
      if (!a.is_urgent_expiry && b.is_urgent_expiry) return 1;
      if (a.compatibility_score !== b.compatibility_score) return b.compatibility_score - a.compatibility_score;
      return new Date(a.inbound_date).getTime() - new Date(b.inbound_date).getTime();
    });

  const frozenBatches = batchRows.filter((b: any) => b.fifo_status === 'FROZEN');
  const expiredBatches = batchRows.filter((b: any) => b.fifo_status === 'EXPIRED');

  let recommendedBatches: any[] = [];
  let totalAvailable = 0;
  let remainingQty = requiredQty;

  for (const batch of availableBatches) {
    totalAvailable += Number(batch.available_qty);
    if (remainingQty > 0) {
      let allocQty = Math.min(remainingQty, Number(batch.available_qty));

      if (minPackageQty > 0 && allocQty < minPackageQty && remainingQty <= Number(batch.available_qty)) {
        allocQty = Math.min(Math.ceil(remainingQty / minPackageQty) * minPackageQty, Number(batch.available_qty));
      }

      recommendedBatches.push({
        ...batch,
        allocated_qty: allocQty,
        is_fifo_recommended: true,
        allocation_reason: batch.is_urgent_expiry
          ? '即将过期优先出库'
          : batch.compatibility_score > 0
            ? '兼容性匹配优先'
            : 'FIFO标准先进先出',
      });
      remainingQty -= allocQty;
    }
  }

  const alternativeBatches = availableBatches
    .filter((b: any) => !recommendedBatches.some((r: any) => r.id === b.id))
    .slice(0, 5)
    .map((b: any) => ({
      batch_no: b.batch_no,
      available_qty: Number(b.available_qty),
      unit_price: Number(b.unit_price),
      expire_date: b.expire_date,
      compatibility_score: b.compatibility_score,
      override_risk_score: b.override_risk_score,
    }));

  const totalRecommendedQty = recommendedBatches.reduce((sum: number, b: any) => sum + Number(b.allocated_qty), 0);
  const totalRecommendedCost = recommendedBatches.reduce((sum: number, b: any) => sum + Number(b.allocated_qty) * Number(b.unit_price), 0);
  const avgCost = totalRecommendedQty > 0 ? totalRecommendedCost / totalRecommendedQty : 0;

  const firstBatch = availableBatches.length > 0 ? availableBatches[0] : null;

  const nearExpiryBatches = availableBatches.filter((b: any) => b.is_near_expiry);
  const nearExpiryValue = nearExpiryBatches.reduce((sum: number, b: any) => sum + Number(b.available_qty) * Number(b.unit_price), 0);

  const overrideLogs: any = await query(`
    SELECT id, source_type, source_no, recommended_batch, actual_batch, reason, approval_status, create_time
    FROM inv_fifo_override_log
    WHERE material_id = ? AND deleted = 0
    ORDER BY create_time DESC
    LIMIT 5
  `, [materialId]);

  return successResponse({
    materialId: Number(materialId),
    warehouseId: Number(warehouseId),
    requiredQty,
    totalAvailable,
    isSufficient: totalAvailable >= requiredQty,
    shortage: totalAvailable < requiredQty ? requiredQty - totalAvailable : 0,
    fifoRecommendation: firstBatch ? {
      batchNo: firstBatch.batch_no,
      availableQty: Number(firstBatch.available_qty),
      unitPrice: Number(firstBatch.unit_price),
      inboundDate: firstBatch.inbound_date,
      expireDate: firstBatch.expire_date,
      compatibilityScore: firstBatch.compatibility_score,
      overrideRiskScore: firstBatch.override_risk_score,
      allocationReason: firstBatch.is_urgent_expiry
        ? '即将过期优先出库'
        : firstBatch.compatibility_score > 0
          ? '兼容性匹配优先'
          : 'FIFO标准先进先出',
    } : null,
    recommendedBatches,
    alternativeBatches,
    totalRecommendedQty,
    totalRecommendedCost: Math.round(totalRecommendedCost * 100) / 100,
    avgCost: Math.round(avgCost * 10000) / 10000,
    availableBatches,
    frozenBatches,
    expiredBatches,
    nearExpiryWarning: {
      count: nearExpiryBatches.length,
      totalValue: Math.round(nearExpiryValue * 100) / 100,
      batches: nearExpiryBatches.map((b: any) => ({
        batch_no: b.batch_no,
        available_qty: Number(b.available_qty),
        days_to_expire: b.days_to_expire,
        batch_value: Math.round(Number(b.available_qty) * Number(b.unit_price) * 100) / 100,
      })),
    },
    recentOverrides: overrideLogs,
  });
});
