import { NextRequest } from 'next/server';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  validateRequestBody,
} from '@/lib/api-response';
import { withAuthAndErrorHandler, UserInfo } from '@/lib/api-auth';
import { query, execute } from '@/lib/db';

// 获取销售退货单列表
export const GET = withAuthAndErrorHandler(
  async (request: NextRequest, userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status') || '';
    const customerId = searchParams.get('customerId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (keyword) {
      where += ' AND (r.return_no LIKE ? OR r.remark LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (status && status !== 'all') {
      where += ' AND r.status = ?';
      params.push(status);
    }
    if (customerId) {
      where += ' AND r.customer_id = ?';
      params.push(Number(customerId));
    }
    if (startDate) {
      where += ' AND r.return_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND r.return_date <= ?';
      params.push(endDate);
    }

    const countRows: any = await query(
      `SELECT COUNT(*) as total FROM sales_return r ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    const rows: any = await query(
      `SELECT r.*, c.customer_name, c.customer_code,
        (SELECT COUNT(*) FROM sales_return_item WHERE return_id = r.id) as item_count
      FROM sales_return r
      LEFT JOIN customers c ON r.customer_id = c.id
      ${where}
      ORDER BY r.id DESC
      LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return paginatedResponse(rows, { page, pageSize, total, totalPages });
  },
  { permission: 'sales:view' }
);

// 创建销售退货单
export const POST = withAuthAndErrorHandler(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const validation = validateRequestBody(body, ['customer_id', 'items']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return errorResponse('退货明细不能为空', 400, 400);
    }

    // 生成退货单号
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countRows: any = await query(
      'SELECT COUNT(*) as cnt FROM sales_return WHERE return_no LIKE ?',
      [`SR${dateStr}%`]
    );
    const seq = String((countRows[0]?.cnt || 0) + 1).padStart(3, '0');
    const returnNo = `SR${dateStr}${seq}`;

    const conn = await (await import('@/lib/db')).getConnection();

    try {
      await conn.beginTransaction();

      let totalAmount = 0;
      let totalTax = 0;

      for (const item of body.items) {
        const amount = (item.return_qty || 0) * (item.unit_price || 0);
        const tax = amount * ((item.tax_rate || 13) / 100);
        totalAmount += amount;
        totalTax += tax;
      }

      const [result]: any = await conn.execute(
        `INSERT INTO sales_return
        (return_no, order_id, order_no, customer_id, customer_name, warehouse_id, return_date,
         return_type, total_amount, tax_amount, grand_total, status, remark,
         create_by, create_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          returnNo,
          body.order_id || null,
          body.order_no || '',
          body.customer_id,
          body.customer_name || '',
          body.warehouse_id || 1,
          body.return_date || new Date().toISOString().slice(0, 10),
          body.return_type || 'quality',
          totalAmount,
          totalTax,
          totalAmount + totalTax,
          'pending',
          body.remark || '',
          userInfo.userId,
        ]
      );

      const returnId = result.insertId;

      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        const amount = (item.return_qty || 0) * (item.unit_price || 0);
        const tax = amount * ((item.tax_rate || 13) / 100);

        await conn.execute(
          `INSERT INTO sales_return_item
          (return_id, line_no, order_item_id, material_id, material_code, material_name,
           material_spec, unit, return_qty, unit_price, amount, tax_rate, tax_amount, line_total, remark)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            returnId, i + 1, item.order_item_id || null,
            item.material_id, item.material_code || '', item.material_name || '',
            item.material_spec || '', item.unit || '件',
            item.return_qty, item.unit_price || 0,
            amount, item.tax_rate || 13, tax, amount + tax,
            item.remark || '',
          ]
        );
      }

      await conn.commit();
      return successResponse({ id: returnId, return_no: returnNo }, '销售退货单创建成功');
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
  { permission: 'sales:create' }
);

// 更新退货单状态
export const PUT = withAuthAndErrorHandler(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return errorResponse('参数不完整', 400, 400);
    }

    const conn = await (await import('@/lib/db')).getConnection();

    try {
      await conn.beginTransaction();

      const [rows]: any = await conn.execute('SELECT * FROM sales_return WHERE id = ?', [id]);
      if (rows.length === 0) {
        await conn.rollback();
        return errorResponse('退货单不存在', 404, 404);
      }

      const returnOrder = rows[0];

      if (action === 'approve') {
        if (returnOrder.status !== 'pending') {
          await conn.rollback();
          return errorResponse('只有待审核状态才能审核', 400, 400);
        }
        await conn.execute(
          'UPDATE sales_return SET status = ?, audit_by = ?, audit_time = NOW() WHERE id = ?',
          ['approved', userInfo.userId, id]
        );
        await conn.commit();
        return successResponse(null, '退货单审核成功');
      }

      if (action === 'complete') {
        if (returnOrder.status !== 'approved') {
          await conn.rollback();
          return errorResponse('只有已审核状态才能完成退货', 400, 400);
        }

        // 退货入库 - 增加库存
        const [items]: any = await conn.execute(
          'SELECT * FROM sales_return_item WHERE return_id = ?',
          [id]
        );

        for (const item of items) {
          await conn.execute(
            `UPDATE stock SET quantity = quantity + ?, update_time = NOW()
             WHERE material_id = ? AND warehouse_id = ?`,
            [item.return_qty, item.material_id, returnOrder.warehouse_id || 1]
          );

          await conn.execute(
            `INSERT INTO stock_movement
            (movement_type, movement_no, material_id, material_code, material_name,
             warehouse_id, quantity, unit, order_no, order_type, remark, create_by, create_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              'sales_return', returnOrder.return_no,
              item.material_id, item.material_code, item.material_name,
              returnOrder.warehouse_id || 1,
              item.return_qty, item.unit,
              returnOrder.return_no, 'sales_return',
              `销售退货入库：${returnOrder.return_no}`,
              userInfo.userId,
            ]
          );
        }

        // 生成红字应收单
        await conn.execute(
          `INSERT INTO finance_receivable
          (receivable_no, source_type, source_id, source_no, customer_id, customer_name,
           amount, tax_amount, grand_total, status, remark, create_by, create_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            `RSR${returnOrder.return_no.slice(2)}`,
            'sales_return', id, returnOrder.return_no,
            returnOrder.customer_id, returnOrder.customer_name,
            -returnOrder.total_amount, -returnOrder.tax_amount, -returnOrder.grand_total,
            'pending',
            `销售退货红字应收：${returnOrder.return_no}`,
            userInfo.userId,
          ]
        );

        await conn.execute(
          'UPDATE sales_return SET status = ? WHERE id = ?',
          ['completed', id]
        );

        await conn.commit();
        return successResponse(null, '退货完成，已增加库存并生成红字应收单');
      }

      if (action === 'cancel') {
        if (returnOrder.status === 'completed') {
          // 已完成的退货单需要回滚库存
          const [items]: any = await conn.execute(
            'SELECT * FROM sales_return_item WHERE return_id = ?',
            [id]
          );

          for (const item of items) {
            // 回滚库存（扣减之前增加的库存）
            await conn.execute(
              `UPDATE stock SET quantity = quantity - ?, update_time = NOW()
               WHERE material_id = ? AND warehouse_id = ?`,
              [item.return_qty, item.material_id, returnOrder.warehouse_id || 1]
            );

            // 记录库存流水
            await conn.execute(
              `INSERT INTO stock_movement
              (movement_type, movement_no, material_id, material_code, material_name,
               warehouse_id, quantity, unit, order_no, order_type, remark, create_by, create_time)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                'sales_return_cancel',
                returnOrder.return_no,
                item.material_id,
                item.material_code,
                item.material_name,
                returnOrder.warehouse_id || 1,
                -item.return_qty,
                item.unit,
                returnOrder.return_no,
                'sales_return_cancel',
                `销售退货取消，回滚库存：${returnOrder.return_no}`,
                userInfo.userId,
              ]
            );
          }

          // 删除红字应收单
          await conn.execute(
            `DELETE FROM finance_receivable WHERE source_type = 'sales_return' AND source_id = ?`,
            [id]
          );
        }

        await conn.execute('UPDATE sales_return SET status = ? WHERE id = ?', ['cancelled', id]);
        await conn.commit();
        return successResponse(null, '退货单已取消');
      }

      await conn.rollback();
      return errorResponse('不支持的操作类型', 400, 400);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
  { permission: 'sales:audit' }
);
