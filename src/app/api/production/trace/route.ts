import { getTranslations } from 'next-intl/server';
import type { DbRow, DbResultSetHeader } from '@/types/db';

;
import { NextRequest } from 'next/server';
import { query, transaction, SqlValue } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';

/**
 * 产品序列号追溯链
 *
 * ⚠️ 数据底座缺失（本次 SQL 可执行性扫描发现）：
 * 本路由原先把追溯记录写进 `prd_product_trace_link`，但**库中不存在这张表**，
 * 且全库没有任何表带 `sn` / `material_batch` 列 —— 也就是说「按序列号串起来的
 * 父子追溯链」这个项目层次的数据模型从未真正落地，GET 必然 500、POST 必然 500。
 *
 * 处置（先按「不崩」止血，不擅自发明数据模型）：
 *   - 对外明确返回 501 Not Implemented，附带原因，而不是让 mysql 的
 *     "Table doesn't exist" 被统一折叠成 500「操作失败」。
 *   - 真正落地需要一次方案确认：是复用 qrcode_record（已有 qr_code / batch_no / material_id）
 *     扩出 sn + parent_sn，还是新建 prd_product_trace_link 并补迁移与种子。
 *   - 在此之前请把该菜单/入口下线，避免用户点到就报错。
 */
const TRACE_NOT_IMPLEMENTED =
  '产品序列号追溯链尚未落地：库中不存在 prd_product_trace_link 表，也无 sn 列可作为追溯主键';

export const GET = withPermission(
  async (_request: NextRequest, _userInfo) => {
    return errorResponse(TRACE_NOT_IMPLEMENTED, 501, 501);
  },
  { errorMessage: '追溯链查询失败' }
);

export const POST = withPermission(
  async (_request: NextRequest, _userInfo) => {
    // 见 GET 上方说明：追溯链的数据表不存在，写路径同样未实现（返回 501 而非 500）。
    return errorResponse(TRACE_NOT_IMPLEMENTED, 501, 501);
  },
  { errorMessage: '创建追溯链记录失败' }
);


async function buildTraceChain(startSn: string): Promise<unknown[]> {
  const chain: DbRow[] = [];
  const visited = new Set<string>();

  async function traverse(sn: string, level: number) {
    if (visited.has(sn)) return;
    visited.add(sn);

    const links = await query('SELECT * FROM prd_product_trace_link WHERE sn = ? AND deleted = 0', [
      sn,
    ]);

    for (const link of links) {
      chain.push({
        level,
        sn: link.sn,
        parentSn: link.parent_sn,
        materialBatch: link.material_batch,
        workorderId: link.workorder_id,
        workorderNo: link.workorder_no,
        materialId: link.material_id,
        materialCode: link.material_code,
        materialName: link.material_name,
        supplierId: link.supplier_id,
        supplierName: link.supplier_name,
        inboundDate: link.inbound_date,
        inboundNo: link.inbound_no,
        inspectionId: link.inspection_id,
        inspectionResult: link.inspection_result,
        traceType: link.trace_type,
      });

      if (link.parent_sn) {
        await traverse(link.parent_sn, level + 1);
      }

      const childLinks = await query(
        'SELECT sn FROM prd_product_trace_link WHERE parent_sn = ? AND deleted = 0',
        [sn]
      );
      for (const child of childLinks) {
        await traverse(child.sn, level - 1);
      }
    }
  }

  await traverse(startSn, 0);
  return chain.sort((a, b) => Number(a.level ?? 0) - Number(b.level ?? 0));
}
