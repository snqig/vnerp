import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

export const POST = withPermission(async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
  try {
    const body = await request.json();
    const { qr_code, label_type, label_spec, printer_id, copies = 1, data = {} } = body;

    if (!qr_code) {
      return errorResponse(ts('k_m4aj8u'), 400);
    }

    // 验证二维码是否存在
    const qrRecord = await queryOne(
      'SELECT * FROM qrcode_record WHERE qr_code = ? AND deleted = 0',
      [qr_code]
    );

    if (!qrRecord) {
      return errorResponse(ts('k_1o9pxv'), 404);
    }

    // 记录打印任务
    //
    // 修复：label_print_records 表不存在，打印流水落在 print_log
    // （qr_id / template_id / print_time / operator / paper_type / print_count）。
    const insertResult = await execute(
      `INSERT INTO print_log
       (qr_id, template_id, print_time, operator, paper_type, print_count)
       VALUES (?, ?, NOW(), ?, ?, ?)`,
      [
        qrRecord.id,
        label_spec || `L-${label_type}`,
        userInfo.realName || String(userInfo.userId),
        label_type || 'qrcode',
        copies,
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
      message: ts('k_1kygkeu'),
    };

    return successResponse(printResult, ts('k_1a0gbn5'));
  } catch (error) {
    return errorResponse(ts('k_ea40jf') + (error as Error).message, 500);
  }
});

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  try {
    const { searchParams } = new URL(request.url);
    const qr_code = searchParams.get('qr_code');

    if (!qr_code) {
      return errorResponse(ts('k_m4aj8u'), 400);
    }

    // print_log 用 qr_id（指向 qrcode_record.id）而非 qr_code 字符串
    const [qrRow] = await query('SELECT id FROM qrcode_record WHERE qr_code = ? LIMIT 1', [qr_code]);
    const qrcodeRecordId = qrRow?.id ?? 0;

    // 修复：label_print_records → print_log（qr_code 改为 qr_id 关联）
    const records = await query(
      `SELECT * FROM print_log
       WHERE qr_id = ?
       ORDER BY print_time DESC
       LIMIT 20`,
      [qrcodeRecordId]
    );

    return successResponse(records, ts('k_1ibuu1d'));
  } catch (error) {
    return errorResponse(ts('k_1o6wku4') + (error as Error).message, 500);
  }
});
