import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30';
  const days = parseInt(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const surplusSummary = await query(
    `SELECT
      COALESCE(SUM(current_weight), 0) as total_surplus,
      COALESCE(SUM(CASE WHEN surplus_status = 'available' THEN current_weight ELSE 0 END), 0) as available_weight,
      COALESCE(SUM(CASE WHEN surplus_status = 'reused' THEN current_weight ELSE 0 END), 0) as reused_weight,
      COALESCE(SUM(CASE WHEN surplus_status = 'discarded' THEN current_weight ELSE 0 END), 0) as discarded_weight,
      COUNT(*) as total_count,
      SUM(CASE WHEN surplus_status = 'available' THEN 1 ELSE 0 END) as available_count,
      SUM(CASE WHEN surplus_status = 'reused' THEN 1 ELSE 0 END) as reused_count,
      SUM(CASE WHEN surplus_status = 'discarded' THEN 1 ELSE 0 END) as discarded_count
    FROM inv_inventory_batch
    WHERE deleted = 0 AND is_surplus = 1 AND create_time >= ?`,
    [startDateStr]
  );

  const surplusByColor = await query(
    `SELECT
      material_code, material_name,
      COALESCE(SUM(current_weight), 0) as total_weight,
      COUNT(*) as batch_count
    FROM inv_inventory_batch
    WHERE deleted = 0 AND is_surplus = 1 AND surplus_status = 'available' AND create_time >= ?
    GROUP BY material_code, material_name
    ORDER BY total_weight DESC
    LIMIT 10`,
    [startDateStr]
  );

  const openingStatus = await query(
    `SELECT
      status,
      COUNT(*) as count,
      COALESCE(SUM(remaining_qty), 0) as total_remaining
    FROM ink_opening_record
    WHERE deleted = 0 AND open_time >= ?
    GROUP BY status`,
    [startDateStr]
  );

  const expiredWarning = await query(
    `SELECT
      record_no, material_name, batch_no, open_time, expire_time,
      remaining_qty, unit
    FROM ink_opening_record
    WHERE deleted = 0 AND status = 1 AND expire_time < NOW()
    ORDER BY expire_time ASC
    LIMIT 20`
  );

  const monthlyReuseTrend = await query(
    `SELECT
      DATE_FORMAT(create_time, '%Y-%m') as month,
      COALESCE(SUM(CASE WHEN surplus_status = 'reused' THEN current_weight ELSE 0 END), 0) as reused,
      COALESCE(SUM(current_weight), 0) as total,
      COUNT(*) as record_count
    FROM inv_inventory_batch
    WHERE deleted = 0 AND is_surplus = 1 AND create_time >= ?
    GROUP BY DATE_FORMAT(create_time, '%Y-%m')
    ORDER BY month`,
    [startDateStr]
  );

  const ss = (surplusSummary[0] || {}) as Loose;

  return successResponse({
    period: `${days}天`,
    surplusSummary: {
      totalSurplus: Number(ss.total_surplus) || 0,
      totalCount: Number(ss.total_count) || 0,
      availableWeight: Number(ss.available_weight) || 0,
      reusedWeight: Number(ss.reused_weight) || 0,
      discardedWeight: Number(ss.discarded_weight) || 0,
      availableCount: Number(ss.available_count) || 0,
      reusedCount: Number(ss.reused_count) || 0,
      discardedCount: Number(ss.discarded_count) || 0,
      reuseRate:
        Number(ss.total_surplus) > 0
          ? Math.round((Number(ss.reused_weight) / Number(ss.total_surplus)) * 100)
          : 0,
    },
    surplusByColor,
    openingStatus,
    expiredWarning,
    monthlyReuseTrend,
  });
});
