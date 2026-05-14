import { NextRequest } from 'next/server';
import { execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { config_key, config_value, config_name, description } = body;

  if (!config_key) {
    return errorResponse('缺少 config_key', 400, 400);
  }

  let sql = 'UPDATE sys_config SET config_value = ?';
  const params: any[] = [config_value];

  if (config_name !== undefined) {
    sql += ', config_name = ?';
    params.push(config_name);
  }

  if (description !== undefined) {
    sql += ', description = ?';
    params.push(description);
  }

  sql += ', update_time = NOW() WHERE config_key = ?';
  params.push(config_key);

  const result = await execute(sql, params);

  if (result.affectedRows === 0) {
    return errorResponse('配置项不存在', 404, 404);
  }

  return successResponse(null, '更新成功');
});

function withErrorHandler(handler: (request: NextRequest) => Promise<any>) {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error: any) {
      console.error('API Error:', error);
      return errorResponse(error.message || '服务器错误', 500, 500);
    }
  };
}
