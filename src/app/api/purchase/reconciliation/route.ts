import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { PurchaseReconciliationApplicationService } from '@/application/services/PurchaseReconciliationApplicationService';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
import type { PurchaseReconciliationLineProps } from '@/domain/purchase/aggregates/PurchaseReconciliation';

const reconciliationService = PurchaseReconciliationApplicationService.create();

// 采购对账单：列表查询 / 详情查询
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status');
  const supplierId = searchParams.get('supplierId');
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  // 详情查询
  if (id) {
    const rc = await queryOne<Loose>(
      `SELECT id, reconciliation_no, status, supplier_id, supplier_name,
        period_start, period_end,
        currency, exchange_rate,
        receipt_amount, return_amount, net_amount,
        discount_amount, paid_amount, balance_amount,
        base_receipt_amount, base_return_amount, base_net_amount,
        base_discount_amount, base_paid_amount, base_balance_amount,
        remark,
        create_by, confirm_by, confirm_time, close_by, close_time,
        create_time, update_time
       FROM pur_purchase_reconciliation
       WHERE id = ? AND deleted = 0`,
      [parseInt(id)]
    );
    if (!rc) return commonErrors.notFound('采购对账单不存在');

    const writeOffs = await query<Loose>(
      `SELECT id, reconciliation_id, payable_id, amount, write_off_date, remark, create_time
       FROM pur_purchase_reconciliation_writeoff
       WHERE reconciliation_id = ?
       ORDER BY write_off_date DESC, id DESC`,
      [parseInt(id)]
    );

    return successResponse({ ...rc, writeOffs });
  }

  // 列表查询
  const where: string[] = ['r.deleted = 0'];
  const values: Loose[] = [];

  if (keyword) {
    where.push('(r.reconciliation_no LIKE ? OR r.supplier_name LIKE ?)');
    const like = `%${keyword}%`;
    values.push(like, like);
  }
  if (status) {
    where.push('r.status = ?');
    values.push(parseInt(status));
  }
  if (supplierId) {
    where.push('r.supplier_id = ?');
    values.push(Number(supplierId));
  }
  if (startDate) {
    where.push('r.period_start >= ?');
    values.push(startDate);
  }
  if (endDate) {
    where.push('r.period_end <= ?');
    values.push(endDate);
  }

  const whereClause = where.join(' AND ');

  const countResult = (await queryOne<Loose>(
    `SELECT COUNT(*) as total FROM pur_purchase_reconciliation r WHERE ${whereClause}`,
    values
  )) as Loose;
  const total = countResult?.total || 0;
  const totalPages = Math.ceil(total / pageSize) || 0;

  const list = await query<Loose>(
    `SELECT r.id, r.reconciliation_no, r.status, r.supplier_id, r.supplier_name,
       r.period_start, r.period_end,
       r.currency, r.exchange_rate,
       r.receipt_amount, r.return_amount, r.net_amount,
       r.discount_amount, r.paid_amount, r.balance_amount,
       r.base_receipt_amount, r.base_return_amount, r.base_net_amount,
       r.base_discount_amount, r.base_paid_amount, r.base_balance_amount,
       r.remark,
       r.confirm_by, r.confirm_time, r.close_by, r.close_time,
       r.create_by, r.create_time, r.update_time
     FROM pur_purchase_reconciliation r
     WHERE ${whereClause}
     ORDER BY r.create_time DESC
     LIMIT ? OFFSET ?`,
    [...values, pageSize, (page - 1) * pageSize]
  );

  return successResponse({ list, total, page, pageSize, totalPages });
});

// 创建采购对账单：自动聚合收货金额与退货金额
export const POST = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const validation = validateRequestBody(body, ['supplier_id', 'period_start', 'period_end']);
    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const {
      supplier_id,
      supplier_name,
      period_start,
      period_end,
      discount_amount,
      remark,
      reconciliation_no,
    } = body;

    // 聚合收货金额：取已收货（status>=40）的采购单，按行累计 received_qty * unit_price
    const receipts = (await query<Loose>(
      `SELECT po.id, po.po_no, po.order_date,
       COALESCE(SUM(l.received_qty * l.unit_price), 0) AS received_amount
     FROM pur_purchase_order po
     LEFT JOIN pur_purchase_order_line l ON l.po_id = po.id
     WHERE po.supplier_id = ? AND po.deleted = 0 AND po.status >= 40
       AND po.order_date BETWEEN ? AND ?
     GROUP BY po.id, po.po_no, po.order_date
     HAVING received_amount > 0
     ORDER BY po.order_date`,
      [supplier_id, period_start, period_end]
    )) as Loose[];

    // 聚合退货金额：取已完成（status>=3）的采购退货单
    const returns = (await query<Loose>(
      `SELECT id, return_no, return_date, total_amount
     FROM pur_purchase_return
     WHERE supplier_id = ? AND return_date BETWEEN ? AND ?
       AND deleted = 0 AND status >= 3
     ORDER BY return_date`,
      [supplier_id, period_start, period_end]
    )) as Loose[];

    const receiptAmount = receipts.reduce((sum, r) => sum + (Number(r.received_amount) || 0), 0);
    const returnAmount = returns.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);

    // 构建对账明细行（仅内存，不持久化）
    const lines: PurchaseReconciliationLineProps[] = [
      ...receipts.map((r) => ({
        sourceType: 1 as const,
        sourceId: r.id,
        sourceNo: r.po_no,
        sourceDate: r.order_date ? String(r.order_date) : '',
        amount: Math.round((Number(r.received_amount) || 0) * 100) / 100,
      })),
      ...returns.map((r) => ({
        sourceType: 2 as const,
        sourceId: r.id,
        sourceNo: r.return_no,
        sourceDate: r.return_date ? String(r.return_date) : '',
        amount: Math.round((Number(r.total_amount) || 0) * 100) / 100,
      })),
    ];

    try {
      const result = await reconciliationService.createReconciliation({
        reconciliationNo: reconciliation_no || '',
        supplierId: Number(supplier_id),
        supplierName: supplier_name || '',
        periodStart: period_start,
        periodEnd: period_end,
        receiptAmount: Math.round(receiptAmount * 100) / 100,
        returnAmount: Math.round(returnAmount * 100) / 100,
        discountAmount: discount_amount ? Number(discount_amount) : 0,
        lines,
        remark: remark || '',
        createBy: userInfo.userId,
      });

      return successResponse(
        {
          id: result.id,
          reconciliation_no: result.reconciliationNo,
          receipt_amount: receiptAmount,
          return_amount: returnAmount,
          line_count: lines.length,
        },
        '采购对账单创建成功'
      );
    } catch (error) {
      if (error instanceof DomainError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { logTitle: '创建采购对账单', logType: 'business' }
);

// 对账单操作：确认 / 核销 / 关闭 / 修改折扣
export const PUT = withPermission(
  async (request: NextRequest, userInfo) => {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return errorResponse('参数不完整：需要 id 和 action', 400, 400);
    }

    try {
      if (action === 'confirm') {
        const result = await reconciliationService.confirmReconciliation(id, userInfo.userId);
        return successResponse(result, '采购对账单确认成功');
      }

      if (action === 'writeOff') {
        if (!body.payable_id || !body.amount) {
          return errorResponse('核销操作需要 payable_id 和 amount', 400, 400);
        }
        const result = await reconciliationService.writeOff({
          reconciliationId: id,
          payableId: Number(body.payable_id),
          amount: Number(body.amount),
          writeOffDate: body.write_off_date,
          operatorId: userInfo.userId,
          remark: body.remark,
        });
        return successResponse(result, '核销成功');
      }

      if (action === 'close') {
        const result = await reconciliationService.closeReconciliation(id, userInfo.userId);
        return successResponse(result, '采购对账单已关闭');
      }

      if (action === 'updateDiscount') {
        const recon = await reconciliationService.getReconciliationById(id);
        if (recon.status.value !== 1) {
          return errorResponse('仅草稿状态可修改折扣', 400, 400);
        }
        const discount = Number(body.discount_amount) || 0;
        const netAmount = recon.netAmount;
        const paidAmount = recon.paidAmount;
        const balanceAmount = Math.round((netAmount - discount - paidAmount) * 100) / 100;
        await execute(
          `UPDATE pur_purchase_reconciliation
         SET discount_amount = ?, balance_amount = ?, update_time = NOW()
         WHERE id = ?`,
          [discount, balanceAmount, id]
        );
        return successResponse({ discountAmount: discount, balanceAmount }, '折扣更新成功');
      }

      return errorResponse('不支持的操作类型', 400, 400);
    } catch (error) {
      if (error instanceof DomainError || error instanceof NotFoundError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { logTitle: '更新采购对账单', logType: 'business' }
);

// 软删除对账单（仅草稿状态）
export const DELETE = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return commonErrors.badRequest('对账单ID不能为空');

    try {
      await reconciliationService.deleteReconciliation(parseInt(id));
      return successResponse(null, '采购对账单删除成功');
    } catch (error) {
      if (error instanceof DomainError || error instanceof NotFoundError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { logTitle: '删除采购对账单', logType: 'business' }
);
