import type { InboundRecord } from '../../types';

/** 跨入库单按 (物料, 批次) 合并的明细项 */
export interface AggItem {
  material_id: number;
  material_name: string;
  material_code: string;
  material_spec: string;
  batch_no: string;
  unit: string;
  quantity: number;
  unitPrice?: number;
}

/**
 * 把若干入库单的 items 跨单合并：同一 (material_id, batch_no) 累加数量。
 * 跳过没有 material_id 的明细（无法对接分类校验/库存批次）。
 */
export function aggregateInboundItems(records: InboundRecord[]): AggItem[] {
  const map = new Map<string, AggItem>();
  for (const rec of records) {
    for (const it of rec.items || []) {
      const mid = Number(it.material_id) || 0;
      if (!mid) continue;
      const key = `${mid}|${it.batch_no || ''}`;
      const qty = Number(it.quantity) || 0;
      const ex = map.get(key);
      if (ex) {
        ex.quantity += qty;
      } else {
        map.set(key, {
          material_id: mid,
          material_name: it.material_name || '',
          material_code: it.material_code || '',
          material_spec: it.material_spec || it.specification || '',
          batch_no: it.batch_no || '',
          unit: it.unit || '',
          quantity: qty,
          unitPrice: Number(it.unit_price) || 0,
        });
      }
    }
  }
  return Array.from(map.values());
}
