import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { successResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

const SPLIT_FLAG_MAP: Record<number, string> = {
  0: tc('text_htb9'),
  1: tc('text_g7sa'),
  2: tc('text_e1y8'),
};

const STATUS_MAP: Record<number, string> = {
  0: tc('text_fotcb'),
  1: tc('text_ec7df'),
  2: tc('text_efqrn'),
};

export const GET = withPermission(
  async (request: NextRequest, userInfo, { params }: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await params;
    const checkId = parseInt(resolvedParams.id);

    const check: any = await queryOne(
      `SELECT * FROM inventory_checks WHERE id = ? AND deleted = 0`,
      [checkId]
    );

    if (!check) {
      return commonErrors.notFound('盘点单不存在');
    }

    const items: any[] = await query(
      `SELECT ici.*,
            m.material_name,
            m.unit
     FROM inventory_check_items ici
     LEFT JOIN bas_material m ON ici.material_id = m.id
     WHERE ici.check_id = ?
     ORDER BY ici.id`,
      [checkId]
    );

    return successResponse(
      items.map((item: any) => ({
        ...item,
        split_flag_name: SPLIT_FLAG_MAP[item.split_flag] || '未知',
        status_name: STATUS_MAP[item.status] || '未知',
      }))
    );
  }
);
