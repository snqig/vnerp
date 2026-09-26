import { getTranslations } from 'next-intl/server';
import type { DbRow } from '@/types/db';

;
import { NextRequest } from 'next/server';
import { query, queryOne, SqlValue } from '@/lib/db';
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

export const GET = withPermission(async (request: NextRequest, userInfo, context) => {
  const ts = await getTranslations('Common');
  const { material_id: materialIdStr } = await context.params;
  const materialId = parseInt(materialIdStr);

  if (isNaN(materialId)) {
    return errorResponse(ts('k_1g7lyca'), 400, 400);
  }

  const card = await queryOne<StandardCard>(
    `SELECT * FROM prd_standard_card
     WHERE material_id = ? AND status = 3 AND deleted = 0
     ORDER BY version DESC LIMIT 1`,
    [materialId]
  );

  if (!card) {
    return errorResponse(ts('k_1020hvi'), 404, 404);
  }

  let items: DbRow[] = [];

  // color_standard_items / process_standard_items / quality_standard_items 三张明细子表在当前库里
  // 并不存在（早期代码按设想的 schema 写死，运行期必然报 Table doesn't exist → 接口 500）。
  // 明细字段目前都在 prd_standard_card 这张宽表的列上，所以这里不额外查明细，直接回传主表。
  // TODO(数据模型)：明细子表落地后再接回 items。
  items = [];

  return successResponse({
    ...card,
    items,
  });
});
