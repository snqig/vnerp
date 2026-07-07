import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  StandardCardType,
  ColorStandardItem,
  ProcessStandardItem,
  QualityStandardItem,
  StandardCard,
} from '../route';

// POST /api/standard-cards/scan - 扫码查看标准卡（设计文档 6.3 节）
export const POST = withPermission(async (request: NextRequest, userInfo) => {
  const body = await request.json();
  const { qr_code } = body;

  if (!qr_code) {
    return errorResponse('缺少二维码编码', 400, 400);
  }

  // 通过二维码查找关联的工单
  const qrRecord = await queryOne<any>(
    'SELECT * FROM qrcode_record WHERE qr_code = ? AND deleted = 0',
    [qr_code]
  );

  if (!qrRecord) {
    return errorResponse('未找到对应的二维码记录', 404, 404);
  }

  let workOrderNo = qrRecord.work_order_no;
  let workOrderId = qrRecord.work_order_id;

  // 如果没有直接关联工单，尝试通过 ref_no 查找
  if (!workOrderNo && qrRecord.ref_no) {
    const workOrder = await queryOne<{ work_order_no: string; id: number }>(
      'SELECT work_order_no, id FROM prd_work_order WHERE order_no = ? AND deleted = 0',
      [qrRecord.ref_no]
    );
    if (workOrder) {
      workOrderNo = workOrder.work_order_no;
      workOrderId = workOrder.id;
    }
  }

  if (!workOrderId) {
    return errorResponse('该二维码未关联生产工单', 404, 404);
  }

  // 查询工单关联的标准卡
  const cards = await query<StandardCard>(
    `SELECT sc.* FROM prd_standard_card sc
     LEFT JOIN prd_work_order wo ON wo.material_id = sc.material_id
     WHERE wo.id = ? AND sc.status = 3 AND sc.deleted = 0`,
    [workOrderId]
  );

  // 为每个标准卡加载明细数据
  const cardsWithItems: any[] = [];
  for (const card of cards) {
    let items: any[] = [];

    switch (card.type as StandardCardType) {
      case 'color':
        items = await query<ColorStandardItem>(
          'SELECT * FROM color_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        break;
      case 'process':
        items = await query<ProcessStandardItem>(
          'SELECT * FROM process_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        break;
      case 'quality':
        items = await query<QualityStandardItem>(
          'SELECT * FROM quality_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        break;
      case 'comprehensive':
        // 综合类型：返回所有明细
        const colorItems = await query<ColorStandardItem>(
          'SELECT *, "color" as item_type FROM color_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        const processItems = await query<ProcessStandardItem>(
          'SELECT *, "process" as item_type FROM process_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        const qualityItems = await query<QualityStandardItem>(
          'SELECT *, "quality" as item_type FROM quality_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        items = [...colorItems, ...processItems, ...qualityItems];
        break;
    }

    cardsWithItems.push({
      ...card,
      items,
    });
  }

  return successResponse({
    work_order_no: workOrderNo,
    standard_cards: cardsWithItems,
  });
}, { logTitle: '扫码查看标准卡', logType: 'business' });
