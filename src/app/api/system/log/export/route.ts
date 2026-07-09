import { NextRequest, NextResponse } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UserInfo } from '@/lib/auth';
import { query } from '@/lib/db';
import { getTranslator } from '@/lib/i18n-server';

/**
 * 操作日志导出 API
 * 支持CSV格式导出
 */

export const GET = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
    const operation = searchParams.get('operation') || '';
    const moduleName = searchParams.get('module') || '';
    const businessType = searchParams.get('businessType') || '';
    const businessId = searchParams.get('businessId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const format = searchParams.get('format') || 'csv';

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      where += ' AND l.user_id = ?';
      params.push(Number(userId));
    }
    if (operation) {
      where += ' AND l.operation LIKE ?';
      params.push(`%${operation}%`);
    }
    if (moduleName) {
      where += ' AND l.module = ?';
      params.push(moduleName);
    }
    if (businessType) {
      where += ' AND l.business_type = ?';
      params.push(businessType);
    }
    if (businessId) {
      where += ' AND l.business_id = ?';
      params.push(businessId);
    }
    if (startDate) {
      where += ' AND l.create_time >= ?';
      params.push(startDate + ' 00:00:00');
    }
    if (endDate) {
      where += ' AND l.create_time <= ?';
      params.push(endDate + ' 23:59:59');
    }

    const rows: any = await query(
      `SELECT l.*, u.real_name as operator_name
       FROM sys_operation_log l
       LEFT JOIN sys_user u ON l.user_id = u.id
       ${where}
       ORDER BY l.create_time DESC
       LIMIT 10000`,
      params
    );

    if (format === 'csv') {
      // 获取翻译函数
      const t = await getTranslator('Export');

      // 生成CSV表头
      const headers = [
        t('id'),
        t('operator'),
        t('operationType'),
        t('module'),
        t('businessType'),
        t('businessId'),
        t('ipAddress'),
        t('status'),
        t('description'),
        t('time'),
      ];

      const csvRows = rows.map((r: any) => [
        r.id,
        r.operator_name || r.username || '',
        r.operation || '',
        r.module || '',
        r.business_type || '',
        r.business_id || '',
        r.ip_address || '',
        r.status === 1 ? t('success') : t('failed'),
        (r.description || '').replace(/"/g, '""'),
        r.create_time || '',
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
          'Content-Disposition': `attachment; filename=operation_log_${new Date().toISOString().slice(0, 10)}.csv`,
        },
      });
    }

    return successResponse({ list: rows, total: rows.length });
  },
  { errorMessage: '操作失败' }
);
