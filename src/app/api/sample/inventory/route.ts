import { NextRequest } from 'next/server';
import { query, queryPaginated, execute } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const sampleOrderId = searchParams.get('sampleOrderId');
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  let sql = `
    SELECT si.*, so.order_no, so.customer_name
    FROM sal_sample_inventory si
    LEFT JOIN sal_sample_order so ON si.sample_order_id = so.id
    WHERE si.deleted = 0
  `;
  let countSql = `SELECT COUNT(*) as total FROM sal_sample_inventory WHERE deleted = 0`;
  const params: Loose[] = [];

  if (sampleOrderId) {
    sql += ' AND si.sample_order_id = ?';
    countSql += ' AND sample_order_id = ?';
    params.push(parseInt(sampleOrderId));
  }

  if (status) {
    sql += ' AND si.status = ?';
    countSql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY si.create_time DESC';

  const result = await queryPaginated(sql, countSql, params, { page, pageSize });
  return paginatedResponse(result.data, result.pagination);
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();

    const validation = validateRequestBody(body, ['productName', 'quantity']);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const result = await execute(
      `INSERT INTO sal_sample_inventory
       (sample_order_id, product_name, material_no, quantity, unit, warehouse_id, status, remark, create_time)
       VALUES (?, ?, ?, ?, ?, ?, 'available', ?, NOW())`,
      [
        body.sampleOrderId || null,
        body.productName,
        body.materialNo || null,
        body.quantity || 0,
        body.unit || 'pcs',
        body.warehouseId || null,
        body.remark || null,
      ]
    );

    return successResponse({ id: result.insertId }, '样品库存创建成功');
  },
  { logTitle: '创建样品库存' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { id, action, ...updateData } = body;

    if (!id) {
      return errorResponse('样品库存ID不能为空', 400, 400);
    }

    if (action) {
      const statusMap: Record<string, string> = {
        send: 'sent',
        use: 'used',
        scrap: 'scrapped',
      };

      const newStatus = statusMap[action];
      if (!newStatus) {
        return errorResponse(`不支持的操作: ${action}`, 400, 400);
      }

      const setFields = ['status = ?'];
      const setParams: Loose[] = [newStatus];

      if (action === 'send') {
        setFields.push('sent_to = ?, sent_date = ?');
        setParams.push(body.sentTo || '', body.sentDate || new Date().toISOString().slice(0, 10));
      }

      setParams.push(id);
      await execute(
        `UPDATE sal_sample_inventory SET ${setFields.join(', ')}, update_time = NOW() WHERE id = ?`,
        setParams
      );
    } else {
      const fields: string[] = [];
      const params: Loose[] = [];
      const fieldMap: Record<string, string> = {
        productName: 'product_name',
        materialNo: 'material_no',
        quantity: 'quantity',
        unit: 'unit',
        warehouseId: 'warehouse_id',
        remark: 'remark',
      };

      for (const [key, value] of Object.entries(updateData)) {
        if (fieldMap[key] && value !== undefined) {
          fields.push(`${fieldMap[key]} = ?`);
          params.push(value);
        }
      }

      if (fields.length === 0) {
        return errorResponse('没有要更新的字段', 400, 400);
      }

      params.push(id);
      await execute(
        `UPDATE sal_sample_inventory SET ${fields.join(', ')}, update_time = NOW() WHERE id = ?`,
        params
      );
    }

    return successResponse({ id }, '操作成功');
  },
  { logTitle: '更新样品库存' }
);
