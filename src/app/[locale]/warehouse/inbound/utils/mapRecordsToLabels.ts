import type { InboundRecord, PrintLabel } from '../types';

export function filterApprovedRecords(records: InboundRecord[]): InboundRecord[] {
  return records.filter((r) => r.status === 'approved' || r.status === 'completed');
}

export function mapRecordsToLabels(records: InboundRecord[]): PrintLabel[] {
  return records.flatMap((record) =>
    (record.items || []).map((item: any, idx: number) => ({
      id: `${record.id}-${idx}`,
      labelNo: `${record.order_no}-${idx + 1}`,
      orderNo: record.order_no,
      materialName: item.material_name,
      specification: item.material_spec,
      supplier: record.supplier_name,
      inboundTime: record.create_time,
      quantity: item.quantity,
      unit: item.unit,
      batchNo: item.batch_no,
      record,
      item,
    }))
  );
}
