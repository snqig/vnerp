import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { generateDocumentNo } from '@/lib/document-numbering';
import { ReconciliationApplicationService } from '@/application/services/ReconciliationApplicationService';
import { MysqlReconciliationRepository } from '@/infrastructure/repositories/MysqlReconciliationRepository';
import { MysqlReceivableRepository } from '@/infrastructure/repositories/MysqlReceivableRepository';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
import type { ReconciliationLineProps } from '@/domain/sales/aggregates/Reconciliation';

const reconciliationService = new ReconciliationApplicationService(
  new MysqlReconciliationRepository(),
  new MysqlReceivableRepository()
);

export const GET = withPermission(async (request: NextRequest, userInfo) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  if (id) {
    const rc = await queryOne<any>(
      'SELECT * FROM sal_reconciliation WHERE id = ? AND deleted = 0',
      [parseInt(id)]
    );
    if (!rc) return commonErrors.notFound('对账单不存在');

    const [lines, writeOffs] = await Promise.all([
      query<any>(
        'SELECT * FROM sal_reconciliation_line WHERE reconciliation_id = ? ORDER BY source_type, source_date',
        [parseInt(id)]
      ),
      query<any>(
        'SELECT * FROM sal_reconciliation_writeoff WHERE reconciliation_id = ? ORDER BY write_off_date DESC',
        [parseInt(id)]
      ),
    ]);

    return successResponse({ ...rc, lines, writeOffs });
  }

  let sql = `SELECT r.*, c.customer_name
    FROM sal_reconciliation r
    LEFT JOIN crm_customer c ON r.customer_id = c.id
    WHERE r.deleted = 0`;
  const values: any[] = [];

  if (keyword) {
    sql += ' AND (r.reconciliation_no LIKE ? OR r.customer_name LIKE ?)';
    const like = `%${keyword}%`;
    values.push(like, like);
  }
  if (status) {
    sql += ' AND r.status = ?';
    values.push(parseInt(status));
  }

  sql += ' ORDER BY r.create_time DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query<any>(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM sal_reconciliation WHERE deleted = 0`;
  const countResult = (await queryOne(countSql)) as any;

  return successResponse({ list, total: countResult?.total || 0, page, pageSize });
});

export const POST = withPermission(async (request: NextRequest, userInfo) => {
  const body = await request.json();
  const validation = validateRequestBody(body, ['customer_id', 'period_start', 'period_end']);
  if (!validation.valid) {
    return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
  }

  const { customer_id, customer_name, period_start, period_end, discount_amount, remark } = body;

  const deliveries = (await query<any>(
    `SELECT id, delivery_no, delivery_date, total_amount
     FROM sal_delivery
     WHERE customer_id = ? AND delivery_date BETWEEN ? AND ?
       AND deleted = 0 AND status >= 2
     ORDER BY delivery_date`,
    [customer_id, period_start, period_end]
  )) as any[];

  const returns = (await query<any>(
    `SELECT id, return_no, return_date, total_amount
     FROM sal_return
     WHERE customer_id = ? AND return_date BETWEEN ? AND ?
       AND deleted = 0 AND status >= 3
     ORDER BY return_date`,
    [customer_id, period_start, period_end]
  )) as any[];

  const deliveryAmount = deliveries.reduce(
    (sum, d) => sum + (parseFloat(d.total_amount) || 0),
    0
  );
  const returnAmount = returns.reduce(
    (sum, r) => sum + (parseFloat(r.total_amount) || 0),
    0
  );

  const lines: ReconciliationLineProps[] = [
    ...deliveries.map((d) => ({
      sourceType: 1 as const,
      sourceId: d.id,
      sourceNo: d.delivery_no,
      sourceDate: d.delivery_date,
      amount: parseFloat(d.total_amount) || 0,
    })),
    ...returns.map((r) => ({
      sourceType: 2 as const,
      sourceId: r.id,
      sourceNo: r.return_no,
      sourceDate: r.return_date,
      amount: parseFloat(r.total_amount) || 0,
    })),
  ];

  try {
    const result = await reconciliationService.createReconciliation({
      reconciliationNo: body.reconciliation_no || (await generateDocumentNo('reconciliation')),
      customerId: customer_id,
      customerName: customer_name || '',
      periodStart: period_start,
      periodEnd: period_end,
      deliveryAmount,
      returnAmount,
      discountAmount: discount_amount || 0,
      lines,
      remark: remark || '',
      createBy: userInfo.userId,
    });

    return successResponse(
      {
        id: result.id,
        reconciliation_no: result.reconciliationNo,
        delivery_amount: deliveryAmount,
        return_amount: returnAmount,
        line_count: lines.length,
      },
      '对账单创建成功'
    );
  } catch (error) {
    if (error instanceof DomainError || error instanceof NotFoundError) {
      return errorResponse(error.message, 400, 400);
    }
    throw error;
  }
}, { logTitle: '创建对账单', logType: 'business' });

export const PUT = withPermission(async (request: NextRequest, userInfo) => {
  const body = await request.json();
  const { id, action } = body;

  if (!id || !action) {
    return errorResponse('参数不完整：需要 id 和 action', 400, 400);
  }

  try {
    if (action === 'confirm') {
      await reconciliationService.confirmReconciliation(id, userInfo.userId);
      return successResponse(null, '对账单确认成功');
    }

    if (action === 'writeOff') {
      if (!body.receivable_id || !body.amount) {
        return errorResponse('核销操作需要 receivable_id 和 amount', 400, 400);
      }
      const result = await reconciliationService.writeOff({
        reconciliationId: id,
        receivableId: body.receivable_id,
        amount: parseFloat(body.amount),
        writeOffDate: body.write_off_date,
        operatorId: userInfo.userId,
        remark: body.remark,
      });
      return successResponse(result, '核销成功');
    }

    if (action === 'close') {
      await reconciliationService.closeReconciliation(id, userInfo.userId);
      return successResponse(null, '对账单已关闭');
    }

    if (action === 'updateDiscount') {
      const rc = await reconciliationService.getReconciliationById(id);
      if (rc.status.value !== 1) {
        return errorResponse('仅草稿状态可修改折扣', 400, 400);
      }
      const { query: q, execute } = await import('@/lib/db');
      const discount = parseFloat(body.discount_amount) || 0;
      const netAmount = rc.netAmount;
      const receivedAmount = rc.receivedAmount;
      const balanceAmount = Math.round((netAmount - discount - receivedAmount) * 100) / 100;
      await execute(
        `UPDATE sal_reconciliation SET discount_amount = ?, balance_amount = ? WHERE id = ?`,
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
}, { logTitle: '更新对账单', logType: 'business' });

export const DELETE = withPermission(async (request: NextRequest, userInfo) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return commonErrors.badRequest('对账单ID不能为空');

  try {
    await reconciliationService.deleteReconciliation(parseInt(id));
    return successResponse(null, '对账单删除成功');
  } catch (error) {
    if (error instanceof DomainError || error instanceof NotFoundError) {
      return errorResponse(error.message, 400, 400);
    }
    throw error;
  }
}, { logTitle: '删除对账单', logType: 'business' });
