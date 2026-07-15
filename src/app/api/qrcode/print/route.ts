import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const POST = withPermission(async (request: NextRequest, _userInfo) => {
  try {
    const body = await request.json();
    const { qr_code, label_type, label_spec, printer_id, copies = 1, data = {} } = body;

    if (!qr_code) {
      return errorResponse('缺少二维码编码', 400);
    }

    // 验证二维码是否存在
    const qrRecord = await queryOne(
      'SELECT * FROM qrcode_record WHERE qr_code = ? AND deleted = 0',
      [qr_code]
    );

    if (!qrRecord) {
      return errorResponse('二维码不存在', 404);
    }

    // 记录打印任务
    const insertResult = await execute(
      `INSERT INTO label_print_records
       (qr_code, label_type, label_spec, printer_id, copies, print_data, status, operator_id, create_time)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
      [
        qr_code,
        label_type,
        label_spec || `L-${label_type}`,
        printer_id,
        copies,
        JSON.stringify(data),
        1, // TODO: 获取当前用户ID
      ]
    );

    // 更新二维码打印次数
    await execute('UPDATE qrcode_record SET print_count = print_count + ? WHERE qr_code = ?', [
      copies,
      qr_code,
    ]);

    // 这里可以调用实际的打印服务
    // 实际部署时应该调用打印中间件服务
    const printResult = {
      task_id: insertResult.insertId,
      qr_code,
      label_type,
      label_spec,
      copies,
      status: 'success',
      message: '打印任务已发送',
    };

    return successResponse(printResult, '打印任务已创建');
  } catch (error) {
    return errorResponse('创建打印任务失败: ' + (error as Error).message, 500);
  }
});

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  try {
    const { searchParams } = new URL(request.url);
    const qr_code = searchParams.get('qr_code');

    if (!qr_code) {
      return errorResponse('缺少二维码编码', 400);
    }

    const records = await query(
      `SELECT * FROM label_print_records 
       WHERE qr_code = ? 
       ORDER BY create_time DESC 
       LIMIT 20`,
      [qr_code]
    );

    return successResponse(records, '获取打印记录成功');
  } catch (error) {
    return errorResponse('获取打印记录失败: ' + (error as Error).message, 500);
  }
});
