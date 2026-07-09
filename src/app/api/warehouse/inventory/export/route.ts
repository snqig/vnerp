import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { query } from '@/lib/db';
import { getTranslator } from '@/lib/i18n-server';

/**
 * 库存流水导出 API
 *
 * 支持导出库存变动记录为CSV格式
 */

export const GET = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const warehouseId = searchParams.get('warehouseId');
    const movementType = searchParams.get('movementType') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const format = searchParams.get('format') || 'csv';

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (materialId) {
      where += ' AND sm.material_id = ?';
      params.push(Number(materialId));
    }
    if (warehouseId) {
      where += ' AND sm.warehouse_id = ?';
      params.push(Number(warehouseId));
    }
    if (movementType) {
      where += ' AND sm.movement_type = ?';
      params.push(movementType);
    }
    if (startDate) {
      where += ' AND sm.create_time >= ?';
      params.push(startDate + ' 00:00:00');
    }
    if (endDate) {
      where += ' AND sm.create_time <= ?';
      params.push(endDate + ' 23:59:59');
    }

    const rows: any = await query(
      `SELECT sm.id, sm.movement_type, sm.quantity, sm.unit_price,
              sm.source_type, sm.source_no, sm.remark, sm.create_time,
              m.material_code, m.material_name, m.unit,
              w.warehouse_name,
              u.real_name as operator_name
       FROM stock_movement sm
       LEFT JOIN materials m ON sm.material_id = m.id
       LEFT JOIN warehouses w ON sm.warehouse_id = w.id
       LEFT JOIN sys_user u ON sm.operator_id = u.id
       ${where}
       ORDER BY sm.create_time DESC
       LIMIT 10000`,
      params
    );

    if (format === 'csv') {
      // 获取翻译函数
      const t = await getTranslator('Export');

      // 生成CSV表头
      const headers = [
        t('id'),
        t('materialCode'),
        t('materialName'),
        t('warehouse'),
        t('movementType'),
        t('quantity'),
        t('unit'),
        t('unitPrice'),
        t('sourceType'),
        t('sourceNo'),
        t('operator'),
        t('remark'),
        t('time'),
      ];

      // 变动类型映射
      const typeMap: Record<string, string> = {
        purchase_inbound: t('movementTypePurchaseInbound'),
        sales_outbound: t('movementTypeSalesOutbound'),
        transfer_in: t('movementTypeTransferIn'),
        transfer_out: t('movementTypeTransferOut'),
        sales_return: t('movementTypeSalesReturn'),
        purchase_return: t('movementTypePurchaseReturn'),
        production_inbound: t('movementTypeProductionInbound'),
        stock_gain: t('movementTypeStockGain'),
        stock_loss: t('movementTypeStockLoss'),
        adjustment: t('movementTypeAdjustment'),
      };

      const csvRows = rows.map((r: any) => [
        r.id,
        r.material_code || '',
        r.material_name || '',
        r.warehouse_name || '',
        typeMap[r.movement_type] || r.movement_type,
        r.quantity,
        r.unit || '',
        r.unit_price || 0,
        r.source_type || '',
        r.source_no || '',
        r.operator_name || '',
        (r.remark || '').replace(/"/g, '""'),
        r.create_time,
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map((row: any[]) => row.map((v: any) => `"${v}"`).join(',')),
      ].join('\n');

      const bom = '\uFEFF';
      const csvBuffer = Buffer.from(bom + csvContent, 'utf-8');

      return new NextResponse(csvBuffer, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=inventory_log_${new Date().toISOString().slice(0, 10)}.csv`,
        },
      });
    }

    return successResponse({ list: rows, total: rows.length });
  },
  { errorMessage: '操作失败' }
);
