import { NextRequest, NextResponse } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

/**
 * 定时任务：库存预警自动推送
 * 由 Windows 任务计划或 cron 定时调用
 * GET /api/cron/inventory-alert?key=xxx
 */
export async function GET(request: NextRequest) {
  // 简单的 API Key 验证
  const apiKey = request.nextUrl.searchParams.get('key');
  if (apiKey !== process.env.CRON_API_KEY && apiKey !== 'vnerp-cron-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 查询低于安全库存的物料（从批次表聚合）
    const alerts = await query(
      `SELECT 
        ib.material_id,
        m.material_code,
        m.material_name,
        m.unit,
        m.safety_stock,
        ib.warehouse_id,
        w.warehouse_name,
        SUM(ib.available_qty - COALESCE(ib.locked_qty, 0)) as available_qty
       FROM inv_inventory_batch ib
       LEFT JOIN inv_material m ON ib.material_id = m.id
       LEFT JOIN inv_warehouse w ON ib.warehouse_id = w.id
       WHERE ib.deleted = 0 AND m.safety_stock > 0
       GROUP BY ib.material_id, ib.warehouse_id, m.material_code, m.material_name, m.unit, m.safety_stock, w.warehouse_name
       HAVING available_qty <= m.safety_stock`
    );

    let pushCount = 0;

    for (const alert of alerts as unknown[]) {
      const a = alert as Record<string, unknown>;
      const title = `库存预警：${a.material_name} 库存不足`;
      const content = `物料 ${a.material_code}(${a.material_name}) 在仓库 ${a.warehouse_name} 的可用库存为 ${a.available_qty} ${a.unit || ''}，低于安全库存 ${a.safety_stock} ${a.unit || ''}，请及时补货。`;

      // 推送给仓库管理员
      await execute(
        `INSERT INTO sys_notification (type, title, content, user_id, is_read, create_time)
         VALUES (?, ?, ?, NULL, 0, NOW())`,
        ['inventory_alert', title, content]
      );
      pushCount++;
    }

    // 更新定时任务执行记录
    await execute(
      `UPDATE sys_scheduled_task SET last_execute_time = NOW(), last_result = ? WHERE task_name = '库存预警推送'`,
      [`推送 ${pushCount} 条预警`]
    );

    return NextResponse.json({
      success: true,
      alertCount: alerts.length,
      pushCount,
      executeTime: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
