import { NextRequest } from 'next/server';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query, execute } from '@/lib/db';

/**
 * 发票管理 API
 * 支持采购发票、销售发票的记录和应收应付核销
 */

// 获取发票列表
export const GET = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const invoiceType = searchParams.get('invoiceType') || '';
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (invoiceType) {
      where += ' AND invoice_type = ?';
      params.push(invoiceType);
    }
    if (keyword) {
      where += ' AND (invoice_no LIKE ? OR partner_name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }
    if (startDate) {
      where += ' AND invoice_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND invoice_date <= ?';
      params.push(endDate);
    }

    const countRows: any = await query(
      `SELECT COUNT(*) as total FROM finance_invoice ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    const rows: any = await query(
      `SELECT * FROM finance_invoice ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return paginatedResponse(rows, { page, pageSize, total, totalPages });
  },
  { errorMessage: '操作失败' }
);

// 创建发票
export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const validation = validateRequestBody(body, [
      'invoice_type',
      'partner_id',
      'partner_name',
      'invoice_date',
      'items',
    ]);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return errorResponse('发票明细不能为空', 400, 400);
    }

    // 生成发票号
    const prefix = body.invoice_type === 'purchase' ? 'PI' : 'SI';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countRows: any = await query(
      'SELECT COUNT(*) as cnt FROM finance_invoice WHERE invoice_no LIKE ?',
      [`${prefix}${dateStr}%`]
    );
    const seq = String((countRows[0]?.cnt || 0) + 1).padStart(3, '0');
    const invoiceNo = `${prefix}${dateStr}${seq}`;

    const conn = await (await import('@/lib/db')).getConnection();

    try {
      await conn.beginTransaction();

      let totalAmount = 0;
      let totalTax = 0;

      for (const item of body.items) {
        const amount = (item.quantity || 0) * (item.unit_price || 0);
        const tax = amount * ((item.tax_rate || 13) / 100);
        totalAmount += amount;
        totalTax += tax;
      }

      const [result]: any = await conn.execute(
        `INSERT INTO finance_invoice
         (invoice_no, invoice_type, source_type, source_id, source_no,
          partner_id, partner_name, invoice_date, tax_rate,
          total_amount, tax_amount, grand_total,
          status, remark, create_by, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          invoiceNo,
          body.invoice_type,
          body.source_type || null,
          body.source_id || null,
          body.source_no || '',
          body.partner_id,
          body.partner_name,
          body.invoice_date,
          body.tax_rate || 13,
          totalAmount,
          totalTax,
          totalAmount + totalTax,
          'pending',
          body.remark || '',
          userInfo.userId,
        ]
      );

      const invoiceId = result.insertId;

      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        const amount = (item.quantity || 0) * (item.unit_price || 0);
        const tax = amount * ((item.tax_rate || 13) / 100);

        await conn.execute(
          `INSERT INTO finance_invoice_item
           (invoice_id, line_no, material_id, material_name, material_spec,
            quantity, unit, unit_price, amount, tax_rate, tax_amount, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId,
            i + 1,
            item.material_id || null,
            item.material_name || '',
            item.material_spec || '',
            item.quantity,
            item.unit || '件',
            item.unit_price || 0,
            amount,
            item.tax_rate || 13,
            tax,
            amount + tax,
          ]
        );
      }

      await conn.commit();
      return successResponse({ id: invoiceId, invoice_no: invoiceNo }, '发票创建成功');
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
  { errorMessage: '操作失败' }
);

// 更新发票状态（审核/核销/作废）
export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return errorResponse('参数不完整', 400, 400);
    }

    const invoices: any = await query('SELECT * FROM finance_invoice WHERE id = ?', [id]);
    if (invoices.length === 0) {
      return errorResponse('发票不存在', 404, 404);
    }

    const invoice = invoices[0];

    if (action === 'approve') {
      if (invoice.status !== 'pending') {
        return errorResponse('只有待审核状态才能审核', 400, 400);
      }
      await execute(
        'UPDATE finance_invoice SET status = ?, audit_by = ?, audit_time = NOW() WHERE id = ?',
        ['approved', userInfo.userId, id]
      );
      return successResponse(null, '发票审核通过');
    }

    if (action === 'cancel') {
      if (invoice.status === 'cancelled') {
        return errorResponse('发票已作废', 400, 400);
      }
      await execute('UPDATE finance_invoice SET status = ? WHERE id = ?', ['cancelled', id]);
      return successResponse(null, '发票已作废');
    }

    if (action === 'write_off') {
      // 核销：关联应收/应付单
      if (invoice.status !== 'approved') {
        return errorResponse('只有已审核状态才能核销', 400, 400);
      }
      const { payableId, receivableId, writeOffAmount } = body;
      if (!writeOffAmount || writeOffAmount <= 0) {
        return errorResponse('核销金额必须大于0', 400, 400);
      }

      await execute(
        `INSERT INTO finance_write_off
         (invoice_id, invoice_no, invoice_type, payable_id, receivable_id,
          write_off_amount, write_off_by, write_off_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id,
          invoice.invoice_no,
          invoice.invoice_type,
          payableId || null,
          receivableId || null,
          writeOffAmount,
          userInfo.userId,
        ]
      );

      await execute('UPDATE finance_invoice SET status = ? WHERE id = ?', ['written_off', id]);
      return successResponse(null, '发票核销成功');
    }

    return errorResponse('不支持的操作', 400, 400);
  },
  { errorMessage: '操作失败' }
);
