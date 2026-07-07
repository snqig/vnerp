import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

type StandardCardType = 'color' | 'process' | 'quality' | 'comprehensive';

interface StandardCard {
  id?: number;
  card_no: string;
  name: string;
  type: StandardCardType;
  version: string;
  material_id?: number;
  status: number;
  effective_date?: string;
  expiry_date?: string;
  create_user?: number;
  audit_user?: number;
  remark?: string;
  customer_name?: string;
  customer_code?: string;
  product_name?: string;
  create_time?: string;
  update_time?: string;
}

interface ColorStandardItem {
  id?: number;
  standard_card_id: number;
  color_name: string;
  pantone_code?: string;
  cmyk_value?: string;
  rgb_value?: string;
  color_sample_image?: string;
  tolerance?: string;
}

interface ProcessStandardItem {
  id?: number;
  standard_card_id: number;
  process_id?: number;
  parameter_name: string;
  standard_value: string;
  tolerance?: string;
  unit?: string;
  description?: string;
}

interface QualityStandardItem {
  id?: number;
  standard_card_id: number;
  inspection_item: string;
  standard_value: string;
  tolerance?: string;
  inspection_method?: string;
  is_key?: boolean;
  defect_level?: string;
}

export const GET = withPermission(
  async (request: NextRequest, userInfo, context) => {
    const { material_id: materialIdStr } = await context.params;
    const materialId = parseInt(materialIdStr);

    if (isNaN(materialId)) {
      return errorResponse('无效的产品ID', 400, 400);
    }

    const card = await queryOne<StandardCard>(
      `SELECT * FROM prd_standard_card
     WHERE material_id = ? AND status = 3 AND deleted = 0
     ORDER BY version DESC LIMIT 1`,
      [materialId]
    );

    if (!card) {
      return errorResponse('未找到该产品的标准卡', 404, 404);
    }

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
        const colorItems = await query<ColorStandardItem & { item_type: string }>(
          'SELECT *, "color" as item_type FROM color_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        const processItems = await query<ProcessStandardItem & { item_type: string }>(
          'SELECT *, "process" as item_type FROM process_standard_items WHERE standard_card_id = ?',
          [card.id!]
        );
        const qualityItems = await query<QualityStandardItem & { item_type: string }>(
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
  }
);
