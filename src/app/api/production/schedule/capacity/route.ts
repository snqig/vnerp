import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (request: NextRequest, userInfo) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // 1. 获取各车间设备数量与总产能
  const equipmentRows: any = await query(
    `SELECT 
      workshop,
      equipment_type,
      COUNT(*) as equipment_count,
      SUM(capacity_per_hour) as total_capacity_per_hour
    FROM eqp_equipment
    WHERE deleted = 0 AND status = 'available'
    GROUP BY workshop, equipment_type
    ORDER BY workshop`
  );

  // 2. 获取排程占用情况
  let scheduleFilter = '';
  const scheduleParams: any[] = [];
  if (startDate && endDate) {
    scheduleFilter = ' AND planned_start >= ? AND planned_end <= ?';
    scheduleParams.push(startDate, endDate);
  }

  const scheduleRows: any = await query(
    `SELECT 
      workshop,
      COUNT(*) as schedule_count,
      COALESCE(SUM(planned_qty), 0) as total_planned_qty,
      COALESCE(SUM(completed_qty), 0) as total_completed_qty,
      COALESCE(SUM(TIMESTAMPDIFF(HOUR, planned_start, planned_end)), 0) as total_planned_hours
    FROM prd_schedule
    WHERE deleted = 0 AND status IN (2, 3) ${scheduleFilter}
    GROUP BY workshop`,
    scheduleParams
  );

  // 3. 按设备统计占用
  const equipmentUsageRows: any = await query(
    `SELECT 
      e.id as equipment_id,
      e.equipment_name,
      e.equipment_type,
      e.workshop,
      e.capacity_per_hour,
      COUNT(sd.id) as schedule_count,
      COALESCE(SUM(TIMESTAMPDIFF(HOUR, sd.planned_start, sd.planned_end)), 0) as used_hours
    FROM eqp_equipment e
    LEFT JOIN prd_schedule_detail sd ON e.id = sd.equipment_id 
      AND sd.status IN (2, 3) ${scheduleFilter ? 'AND sd.planned_start >= ? AND sd.planned_end <= ?' : ''}
    WHERE e.deleted = 0 AND e.status = 'available'
    GROUP BY e.id, e.equipment_name, e.equipment_type, e.workshop, e.capacity_per_hour
    ORDER BY e.workshop, e.equipment_type`,
    scheduleFilter ? [startDate, endDate] : []
  );

  // 4. 组装车间级产能数据
  const workshopMap = new Map();

  for (const row of equipmentRows) {
    const key = row.workshop;
    if (!workshopMap.has(key)) {
      workshopMap.set(key, {
        workshop: row.workshop,
        equipmentCount: 0,
        totalCapacity: 0,
        usedCapacity: 0,
        availableCapacity: 0,
        utilizationRate: 0,
      });
    }
    const item = workshopMap.get(key);
    item.equipmentCount += row.equipment_count;
    // 假设每天8小时，计算日产能
    item.totalCapacity += row.total_capacity_per_hour * 8;
  }

  // 计算已用产能（基于排程小时数）
  for (const row of scheduleRows) {
    const item = workshopMap.get(row.workshop);
    if (item) {
      // 已用产能 = 已排程小时数 * 平均产能
      item.usedCapacity = row.total_planned_hours * 100; // 简化计算
      item.availableCapacity = Math.max(0, item.totalCapacity - item.usedCapacity);
      item.utilizationRate =
        item.totalCapacity > 0 ? Math.round((item.usedCapacity / item.totalCapacity) * 100) : 0;
    }
  }

  // 设备级利用率
  const equipmentUtilization = equipmentUsageRows.map((row: any) => {
    const dailyCapacity = row.capacity_per_hour * 8;
    const utilizationRate = dailyCapacity > 0 ? Math.round((row.used_hours / 8) * 100) : 0;
    return {
      equipmentId: row.equipment_id,
      equipmentName: row.equipment_name,
      equipmentType: row.equipment_type,
      workshop: row.workshop,
      capacityPerHour: row.capacity_per_hour,
      scheduleCount: row.schedule_count,
      usedHours: row.used_hours,
      utilizationRate: Math.min(100, utilizationRate),
    };
  });

  const capacityData = Array.from(workshopMap.values());

  return successResponse(
    {
      workshopCapacity: capacityData,
      equipmentUtilization,
      summary: {
        totalEquipment: equipmentRows.reduce((sum: number, r: any) => sum + r.equipment_count, 0),
        totalWorkshops: workshopMap.size,
        avgUtilization:
          capacityData.length > 0
            ? Math.round(
                capacityData.reduce((sum: number, c: any) => sum + c.utilizationRate, 0) /
                  capacityData.length
              )
            : 0,
      },
    },
    '获取产能分析成功'
  );
});
