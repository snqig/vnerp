import { getTranslations } from 'next-intl/server';
import type { DbRow } from '@/types/db';

;
import { NextRequest } from 'next/server';
import { query, queryOne, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import {
  StandardCardType,
  ColorStandardItem,
  ProcessStandardItem,
  QualityStandardItem,
  StandardCard,
} from '../route';

// POST /api/standard-cards/scan - 扫码查看标准卡（设计文档 6.3 节）
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { qr_code } = body;

    if (!qr_code) {
      return errorResponse(ts('k_m4aj8u'), 400, 400);
    }

    // 通过二维码查找关联的工单
    const qrRecord = await queryOne(
      'SELECT * FROM qrcode_record WHERE qr_code = ? AND deleted = 0',
      [qr_code]
    );

    if (!qrRecord) {
      return errorResponse(ts('k_pn7c6u'), 404, 404);
    }

    let workOrderNo = qrRecord.work_order_no;
    let workOrderId = qrRecord.work_order_id;

    // 如果没有直接关联工单，尝试通过 ref_no 查找
    if (!workOrderNo && qrRecord.ref_no) {
      const workOrder = await queryOne<{ work_order_no: string; id: number }>(
        'SELECT work_order_no, id FROM prod_work_order WHERE order_no = ? AND deleted = 0',
        [qrRecord.ref_no]
      );
      if (workOrder) {
        workOrderNo = workOrder.work_order_no;
        workOrderId = workOrder.id;
      }
    }

    if (!workOrderId) {
      return errorResponse(ts('k_s8ykq8'), 404, 404);
    }

    // 查询工单关联的标准卡
    // 修复：prod_work_order 上没有 material_id 列（物料号在 legacy_material_id 上）。
    const cards = await query<StandardCard>(
      `SELECT sc.* FROM prd_standard_card sc
     LEFT JOIN prod_work_order wo ON wo.legacy_material_id = sc.material_id
     WHERE wo.id = ? AND sc.status = 3 AND sc.deleted = 0`,
      [workOrderId]
    );

    // 为每个标准卡加载明细数据
    const cardsWithItems: (DbRow & { items?: DbRow[] })[] = [];
    for (const card of cards) {
      let items: DbRow[] = [];

      // color_standard_items / process_standard_items / quality_standard_items 三张明细子表在当前库里
      // 并不存在（早期代码按设想的 schema 写死，运行期必然报 Table doesn't exist → 接口 500）。
      // 标准卡的明细目前全部落在 prd_standard_card 这张宽表的列上，因此这里直接回传主表。
      // TODO(数据模型)：若标准卡确实需要明细行，需先补建三张明细表 + 迁移，再接回这里的 items。
      switch (card.type as StandardCardType) {
        case 'color':
        case 'process':
        case 'quality':
        case 'comprehensive':
          items = [];
          break;
      }

      cardsWithItems.push({
        ...(card as unknown as Record<string, unknown>),
        items,
      } as DbRow & { items?: DbRow[] });
    }

    return successResponse({
      work_order_no: workOrderNo,
      standard_cards: cardsWithItems,
    });
  },
  { logTitle: '扫码查看标准卡', logType: 'business' }
);
