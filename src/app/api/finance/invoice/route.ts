import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query, execute, SqlValue } from '@/lib/db';

/** 金额统一按分取整，避免浮点累加误差（DECIMAL 经驱动返回字符串，必须显式转数值） */
function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

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
    const params: SqlValue[] = [];

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

    const countRows = await query(`SELECT COUNT(*) as total FROM finance_invoice ${where}`, params);
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    const rows = await query(
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
  const ts = await getTranslations('Common');
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
      return errorResponse(ts('k_1yy4hyq'), 400, 400);
    }

    // 生成发票号
    const prefix = body.invoice_type === 'purchase' ? 'PI' : 'SI';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countRows = await query(
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

      const [result] = await conn.execute(
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

      const invoiceId = (result as { insertId: number }).insertId;

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
            item.unit || ts('k_w0gthl'),
            item.unit_price || 0,
            amount,
            item.tax_rate || 13,
            tax,
            amount + tax,
          ]
        );
      }

      await conn.commit();
      return successResponse({ id: invoiceId, invoice_no: invoiceNo }, ts('k_1uuplig'));
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
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return errorResponse(ts('k_8dtv5q'), 400, 400);
    }

    const invoices = await query('SELECT * FROM finance_invoice WHERE id = ?', [id]);
    if (invoices.length === 0) {
      return errorResponse(ts('k_1rur8q3'), 404, 404);
    }

    const invoice = invoices[0];

    if (action === 'approve') {
      if (invoice.status !== 'pending') {
        return errorResponse(ts('k_phmx2o'), 400, 400);
      }
      await execute(
        'UPDATE finance_invoice SET status = ?, audit_by = ?, audit_time = NOW() WHERE id = ?',
        ['approved', userInfo.userId, id]
      );
      return successResponse(null, ts('k_1mt7z06'));
    }

    if (action === 'cancel') {
      if (invoice.status === 'cancelled') {
        return errorResponse(ts('k_ks1w3r'), 400, 400);
      }
      await execute('UPDATE finance_invoice SET status = ? WHERE id = ?', ['cancelled', id]);
      return successResponse(null, ts('k_ks1w3r'));
    }

    if (action === 'write_off') {
      // 核销：关联应收/应付单，回写已收/已付金额与余额（同一事务内完成，避免流水与余额不一致）
      if (invoice.status !== 'approved') {
        return errorResponse(ts('k_1q13io8'), 400, 400);
      }
      const { payableId, receivableId, writeOffAmount } = body;
      if (!writeOffAmount || writeOffAmount <= 0) {
        return errorResponse(ts('k_4is2uy'), 400, 400);
      }
      if (!payableId && !receivableId) {
        return errorResponse(ts('k_1afmu7x'), 400, 400);
      }

      const requested = round2(Number(writeOffAmount));
      const conn = await (await import('@/lib/db')).getConnection();

      try {
        await conn.beginTransaction();

        let actualAmount = 0;
        let notice = '';

        if (receivableId) {
          const [rows] = await conn.execute(
            'SELECT id, amount, received_amount, balance FROM fin_receivable WHERE id = ? AND deleted = 0 FOR UPDATE',
            [receivableId]
          );
          const ar = (rows as Array<Record<string, unknown>>)[0];
          if (!ar) {
            await conn.rollback();
            conn.release();
            return errorResponse(ts('k_1rur8q3'), 404, 404);
          }
          const balance = round2(Number(ar.balance ?? 0));
          if (balance <= 0) {
            await conn.rollback();
            conn.release();
            return errorResponse(ts('k_xxe1ga'), 400, 400);
          }
          actualAmount = Math.min(requested, balance);
          if (requested > balance) notice = ts('k_6ndmox');
          const received = round2(Number(ar.received_amount ?? 0) + actualAmount);
          const newBalance = round2(Math.max(0, Number(ar.amount ?? 0) - received));
          await conn.execute(
            'UPDATE fin_receivable SET received_amount = ?, balance = ?, status = ? WHERE id = ?',
            [received, newBalance, newBalance <= 0 ? 3 : 2, Number(ar.id)]
          );
        } else {
          const [rows] = await conn.execute(
            'SELECT id, amount, paid_amount, balance FROM fin_payable WHERE id = ? AND deleted = 0 FOR UPDATE',
            [payableId]
          );
          const ap = (rows as Array<Record<string, unknown>>)[0];
          if (!ap) {
            await conn.rollback();
            conn.release();
            return errorResponse(ts('k_1rur8q3'), 404, 404);
          }
          const balance = round2(Number(ap.balance ?? 0));
          if (balance <= 0) {
            await conn.rollback();
            conn.release();
            return errorResponse(ts('k_vygjfs'), 400, 400);
          }
          actualAmount = Math.min(requested, balance);
          if (requested > balance) notice = ts('k_e5to9b');
          const paid = round2(Number(ap.paid_amount ?? 0) + actualAmount);
          const newBalance = round2(Math.max(0, Number(ap.amount ?? 0) - paid));
          await conn.execute(
            'UPDATE fin_payable SET paid_amount = ?, balance = ?, status = ? WHERE id = ?',
            [paid, newBalance, newBalance <= 0 ? 3 : 2, Number(ap.id)]
          );
        }

        await conn.execute(
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
            actualAmount,
            userInfo.userId,
          ]
        );

        await conn.execute('UPDATE finance_invoice SET status = ? WHERE id = ?', ['written_off', id]);

        await conn.commit();
        conn.release();
        return successResponse({ writeOffAmount: actualAmount }, notice || ts('k_1k57w9'));
      } catch (error) {
        await conn.rollback();
        conn.release();
        throw error;
      }
    }

    return errorResponse(ts('k_12cy0bd'), 400, 400);
  },
  { errorMessage: '操作失败' }
);
