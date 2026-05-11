import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';
import {
  StandardCardType,
  ColorStandardItem,
  ProcessStandardItem,
  QualityStandardItem,
  StandardCard
} from '../route';

// GET /api/standard-cards/by-material/[material_id] - 获取产品标准卡（设计文档 6.1 节）
export const GET = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ material_id: string }> }) => {
  const resolvedParams = await params;
  const materialId = parseInt(resolvedParams.material_id);

  if (isNaN(materialId)) {
    return errorResponse('无效的产品ID', 400, 400);
  }

  // 查询该产品的最新生效版本标准卡
  const card = await queryOne<StandardCard>(
    `SELECT * FROM prd_standard_card
     WHERE material_id = ? AND status = 3 AND deleted = 0
     ORDER BY version DESC LIMIT 1`,
    [materialId]
  );

  if (!card) {
    return errorResponse('未找到该产品的标准卡', 404, 404);
  }

  // 根据类型查询对应的明细数据
  let items: any[] = [];

  switch (card.type) {
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

  return successResponse({
    ...card,
    items,
  });
}, '获取产品标准卡失败');
