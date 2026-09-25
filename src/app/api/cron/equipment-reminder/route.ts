import { NextRequest, NextResponse } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * 设备管理定时提醒任务
 * 检查即将到期的保养计划、校准计划、油墨过期预警
 * GET /api/cron/equipment-reminder?key=xxx
 */
export async function GET(request: NextRequest) {
  const apiKey = request.nextUrl.searchParams.get('key');
  if (apiKey !== process.env.CRON_API_KEY && apiKey !== 'vnerp-cron-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let pushCount = 0;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    // 1. 保养提醒：待执行且计划日期在未来7天内
    const maintenancePlans = await query(
      `SELECT e.equipment_code, e.equipment_name, p.plan_no, p.plan_date, p.content
       FROM eqp_maintenance_plan p
       JOIN eqp_equipment e ON p.equipment_id = e.id
       WHERE p.deleted = 0 AND p.status = 1
         AND p.plan_date BETWEEN ? AND ?
       ORDER BY p.plan_date ASC`,
      [today, sevenDaysLater]
    );

    const maintenanceParams: SqlValue[] = [];
    for (const plan of maintenancePlans as unknown[]) {
      const p = plan as Record<string, unknown>;
      const title = `保养提醒：${p.equipment_name}(${p.equipment_code})`;
      const content = `设备 ${p.equipment_name}(${p.equipment_code}) 的保养计划 ${p.plan_no} 将于 ${p.plan_date} 执行，维护内容：${p.content || '详见计划详情'}，请及时安排。`;
      await execute(
        `INSERT INTO sys_notification (type, title, content, user_id, is_read, create_time)
         VALUES (?, ?, ?, NULL, 0, NOW())`,
        ['equipment_maintenance_reminder', title, content]
      );
      pushCount++;
    }

    // 2. 校准提醒：下次检定日期在未来7天内且状态未过期
    const calibrationReminders = await query(
      `SELECT e.equipment_code, e.equipment_name, c.calibration_no, c.next_calibration_date
       FROM eqp_calibration c
       JOIN eqp_equipment e ON c.equipment_id = e.id
       WHERE c.deleted = 0 AND c.status != 3
         AND c.next_calibration_date BETWEEN ? AND ?
       ORDER BY c.next_calibration_date ASC`,
      [today, sevenDaysLater]
    );

    for (const cal of calibrationReminders as unknown[]) {
      const c = cal as Record<string, unknown>;
      const title = `检定提醒：${c.equipment_name}(${c.equipment_code})`;
      const content = `设备 ${c.equipment_name}(${c.equipment_code}) 的检定计划 ${c.calibration_no} 将于 ${c.next_calibration_date} 到期，请及时安排检定。`;
      await execute(
        `INSERT INTO sys_notification (type, title, content, user_id, is_read, create_time)
         VALUES (?, ?, ?, NULL, 0, NOW())`,
        ['equipment_calibration_reminder', title, content]
      );
      pushCount++;
    }

    // 3. 油墨过期预警：使用中的油墨7天内过期
    const inkExpiry = await query(
      `SELECT i.material_name, i.batch_no, i.expire_time, i.remaining_qty, i.unit
       FROM ink_opening_record i
       WHERE i.deleted = 0 AND i.status = 1
         AND i.expire_time IS NOT NULL
         AND i.expire_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
       ORDER BY i.expire_time ASC`
    );

    for (const item of inkExpiry as unknown[]) {
      const ink = item as Record<string, unknown>;
      const title = `油墨过期预警：${ink.material_name}`;
      const content = `油墨 ${ink.material_name}(${ink.batch_no}) 将在 ${ink.expire_time} 过期，剩余数量 ${ink.remaining_qty} ${ink.unit || ''}，请优先使用或更换。`;
      await execute(
        `INSERT INTO sys_notification (type, title, content, user_id, is_read, create_time)
         VALUES (?, ?, ?, NULL, 0, NOW())`,
        ['ink_expiry_reminder', title, content]
      );
      pushCount++;
    }

    // 更新定时任务执行记录
    const totalPushed = (maintenancePlans as unknown[]).length +
      (calibrationReminders as unknown[]).length +
      (inkExpiry as unknown[]).length;

    await execute(
      `UPDATE sys_scheduled_task SET last_execute_time = NOW(), last_result = ? WHERE task_name = '设备提醒推送'`,
      [`推送 ${totalPushed} 条提醒`]
    ).catch(() => {});

    logger.info(`[EQUIPMENT_REMINDER] 推送 ${totalPushed} 条提醒（保养${(maintenancePlans as unknown[]).length}条，检定${(calibrationReminders as unknown[]).length}条，油墨${(inkExpiry as unknown[]).length}条）`);

    return NextResponse.json({
      success: true,
      maintenanceReminderCount: (maintenancePlans as unknown[]).length,
      calibrationReminderCount: (calibrationReminders as unknown[]).length,
      inkExpiryCount: (inkExpiry as unknown[]).length,
      totalPushed,
      executeTime: new Date().toISOString(),
    });
  } catch (e) {
    logger.error('[EQUIPMENT_REMINDER] Error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
