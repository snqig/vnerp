import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || 20);
    const title = searchParams.get('title') || '';
    const operName = searchParams.get('operName') || '';
    const businessId = searchParams.get('businessId') || '';
    const businessType = searchParams.get('businessType') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (title) {
      where += ' AND (operation LIKE ? OR request_url LIKE ?)';
      params.push(`%${title}%`, `%${title}%`);
    }
    if (operName) {
      where += ' AND username LIKE ?';
      params.push(`%${operName}%`);
    }
    if (businessId) {
      where += ' AND business_id = ?';
      params.push(businessId);
    }
    if (businessType) {
      where += ' AND business_type = ?';
      params.push(businessType);
    }
    if (startDate) {
      where += ' AND create_time >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND create_time <= ?';
      params.push(endDate + ' 23:59:59');
    }

    const totalRows: any = await query(
      `SELECT COUNT(*) as total FROM sys_operation_log ${where}`,
      params
    );
    const total = totalRows[0]?.total || 0;

    const rows: any = await query(
      `SELECT id, COALESCE(operation, '') as title, COALESCE(username, '') as oper_name,
            COALESCE(operation, '') as oper_type, COALESCE(method, '') as oper_method,
            COALESCE(request_url, '') as oper_url, COALESCE(ip, '') as oper_ip,
            COALESCE(create_time, NOW()) as oper_time, status,
            COALESCE(business_type, '') as business_type,
            COALESCE(business_id, '') as business_id,
            COALESCE(request_params, '') as request_params,
            COALESCE(response_result, '') as response_result
     FROM sys_operation_log ${where}
     ORDER BY create_time DESC
     LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return successResponse({ list: rows, total, page, pageSize });
  },
  { logTitle: '获取操作日志', logType: 'system' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (id) {
      await query(`DELETE FROM sys_operation_log WHERE id = ?`, [Number(id)]);
      return successResponse(null, '删除成功');
    }
    await query(`TRUNCATE TABLE sys_operation_log`);
    return successResponse(null, '清空成功');
  },
  { logTitle: '清空操作日志', logType: 'system' }
);

// 导出操作日志
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { action } = body;

    if (action === 'export') {
      const { startDate, endDate, businessType } = body;
      let where = 'WHERE 1=1';
      const params: any[] = [];

      if (startDate) {
        where += ' AND create_time >= ?';
        params.push(startDate);
      }
      if (endDate) {
        where += ' AND create_time <= ?';
        params.push(endDate + ' 23:59:59');
      }
      if (businessType) {
        where += ' AND business_type = ?';
        params.push(businessType);
      }

      const rows: any = await query(
        `SELECT id, operation, username, method, request_url, ip, status,
              business_type, business_id, create_time
       FROM sys_operation_log ${where}
       ORDER BY create_time DESC
       LIMIT 10000`,
        params
      );

      // 转换为CSV格式
      const headers = [
        'ID',
        '操作',
        '操作人',
        '请求方法',
        '请求URL',
        'IP',
        '状态',
        '业务类型',
        '业务ID',
        '操作时间',
      ];
      const csvRows = rows.map((row: any) => [
        row.id,
        row.operation || '',
        row.username || '',
        row.method || '',
        row.request_url || '',
        row.ip || '',
        row.status === 1 ? '成功' : '失败',
        row.business_type || '',
        row.business_id || '',
        row.create_time || '',
      ]);

      const csv = [headers, ...csvRows]
        .map((row) =>
          row.map((cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');

      return successResponse({ csv, count: rows.length }, '导出成功');
    }

    return errorResponse('不支持的操作', 400, 400);
  },
  { logTitle: '导出操作日志', logType: 'system' }
);
