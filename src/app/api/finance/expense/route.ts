import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query, execute } from '@/lib/db';

/**
 * 费用报销 API
 */

// 获取报销单列表
export const GET = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const expenseType = searchParams.get('expenseType') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let where = 'WHERE e.deleted = 0';
    const params: any[] = [];

    if (status) { where += ' AND e.status = ?'; params.push(status); }
    if (expenseType) { where += ' AND e.expense_type = ?'; params.push(expenseType); }

    const countRows: any = await query(
      `SELECT COUNT(*) as total FROM finance_expense e ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const rows: any = await query(
      `SELECT e.*, u.real_name as applicant_name, a.real_name as approver_name
       FROM finance_expense e
       LEFT JOIN sys_user u ON e.applicant_id = u.id
       LEFT JOIN sys_user a ON e.approve_by = a.id
       ${where}
       ORDER BY e.create_time DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return successResponse({ list: rows, total, page, pageSize });
  }
);

// 创建报销单
export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const validation = validateRequestBody(body, ['expense_type', 'amount', 'expense_date']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const { expense_type, amount, expense_date, description, items } = body;

    // 生成报销单号
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countRows: any = await query(
      'SELECT COUNT(*) as cnt FROM finance_expense WHERE expense_no LIKE ?',
      [`EXP${dateStr}%`]
    );
    const seq = String((countRows[0]?.cnt || 0) + 1).padStart(3, '0');
    const expenseNo = `EXP${dateStr}${seq}`;

    const result: any = await execute(
      `INSERT INTO finance_expense
       (expense_no, applicant_id, expense_type, amount, expense_date, description, status, create_by, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())`,
      [expenseNo, userInfo.userId, expense_type, amount, expense_date, description || null, userInfo.userId]
    );

    const expenseId = result.insertId;

    // 插入明细
    if (items && Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await execute(
          `INSERT INTO finance_expense_item
           (expense_id, line_no, expense_category, description, amount, remark)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [expenseId, i + 1, item.category || '', item.description || '', item.amount || 0, item.remark || null]
        );
      }
    }

    return successResponse({ id: expenseId, expense_no: expenseNo }, '报销单创建成功');
  },
  { errorMessage: '操作失败' }
);

// 审核报销单
export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
    const body = await request.json();
    const { id, action } = body;

    if (!id) return errorResponse('报销单ID不能为空', 400, 400);

    if (action === 'approve') {
      await execute(
        `UPDATE finance_expense SET status = 'approved', approve_by = ?, approve_time = NOW(), update_time = NOW() WHERE id = ? AND status = 'pending'`,
        [userInfo.userId, id]
      );
      return successResponse(null, '报销单已审核');
    }

    if (action === 'reject') {
      const { reject_reason } = body;
      await execute(
        `UPDATE finance_expense SET status = 'rejected', approve_by = ?, approve_time = NOW(), reject_reason = ?, update_time = NOW() WHERE id = ? AND status = 'pending'`,
        [userInfo.userId, reject_reason || '', id]
      );
      return successResponse(null, '报销单已驳回');
    }

    return errorResponse('无效的操作类型', 400, 400);
  },
  { errorMessage: '操作失败' }
);
