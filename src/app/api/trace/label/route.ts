import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const scenario = searchParams.get('scenario') || '';
  let sql = 'SELECT * FROM label_template WHERE status = 1';
  const params: unknown[] = [];
  if (scenario) {
    sql += ' AND scenario = ?';
    params.push(scenario);
  }
  sql += ' ORDER BY id ASC';
  const rows = await query<Record<string, unknown>>(sql, params);
  return successResponse(rows);
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { name, scenario, htmlTemplate, widthMm, heightMm, qrSizeMm } = body;
    if (!name || !scenario || !htmlTemplate) {
      return errorResponse('缺少必填字段: name, scenario, htmlTemplate', 400, 400);
    }
    const result = await execute(
      `INSERT INTO label_template (name, scenario, html_template, width_mm, height_mm, qr_size_mm, status, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [name, scenario, htmlTemplate, widthMm || 60, heightMm || 40, qrSizeMm || 20]
    );
    return successResponse({ id: result.insertId }, '标签模板创建成功');
  },
  { logTitle: '创建标签模板' }
);
