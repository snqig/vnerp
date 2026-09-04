import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

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
    const params: SqlValue[] = [];

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

    const totalRows = await query(
      `SELECT COUNT(*) as total FROM sys_operation_log ${where}`,
      params
    );
    const total = totalRows[0]?.total || 0;

    const rows = await query(
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
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (id) {
      await query(`DELETE FROM sys_operation_log WHERE id = ?`, [Number(id)]);
      return successResponse(null, ts('k_1hlqs'));
    }
    await query(`TRUNCATE TABLE sys_operation_log`);
    return successResponse(null, tc('clearSuccess'));
  },
  { logTitle: '清空操作日志', logType: 'system' }
);

// 导出操作日志
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { action } = body;

    if (action === 'export') {
      const { startDate, endDate, businessType } = body;
      let where = 'WHERE 1=1';
      const params: SqlValue[] = [];

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

      const rows = await query(
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
        ts('k_501w24'),
        ts('k_15sp2wy'),
        ts('k_q4uify'),
        ts('k_3og21h'),
        'IP',
        ts('k_1ccx4t4'),
        ts('k_zp4vde'),
        ts('k_lirv7t'),
        ts('k_12ec3ny'),
      ];
      const csvRows = rows.map((row: DbRow) => [
        row.id,
        row.operation || '',
        row.username || '',
        row.method || '',
        row.request_url || '',
        row.ip || '',
        row.status === 1 ? ts('k_1rraohc') : ts('k_12db3qz'),
        row.business_type || '',
        row.business_id || '',
        row.create_time || '',
      ]);

      const csv = [headers, ...csvRows]
        .map((row) =>
          row.map((cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');

      return successResponse({ csv, count: rows.length }, ts('k_1hkfymq'));
    }

    return errorResponse(ts('k_12cy0bd'), 400, 400);
  },
  { logTitle: '导出操作日志', logType: 'system' }
);
