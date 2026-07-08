import { describe, it, expect } from 'vitest';
import { filterApprovedRecords, mapRecordsToLabels } from '../utils/mapRecordsToLabels';
import type { InboundRecord } from '../types';

const makeRecord = (overrides: Partial<InboundRecord> = {}): InboundRecord => ({
  id: 1,
  inbound_no: 'IN-001',
  inbound_type: 1,
  warehouse_id: 1,
  warehouse_name: '主仓库',
  material_id: 101,
  material_name: 'PET薄膜',
  material_code: 'MAT-001',
  specification: '1200×1000mm',
  quantity: 100,
  unit: 'KG',
  location: 'A-01',
  supplier_id: 1,
  supplier_name: '供应商A',
  operator_id: 1,
  operator_name: 'admin',
  inbound_date: '2026-07-07',
  status: 'approved',
  order_no: 'PO-001',
  create_time: '2026-07-07T10:00:00Z',
  items: [
    {
      material_id: 101,
      material_name: 'PET薄膜',
      material_code: 'MAT-001',
      material_spec: '1200×1000mm',
      specification: '1200×1000mm',
      quantity: 50,
      unit: 'KG',
      unit_price: 10,
      total_price: 500,
      location: 'A-01',
      batch_no: 'B001',
      remark: '',
    },
  ],
  ...overrides,
});

describe('filterApprovedRecords', () => {
  it('保留 approved 和 completed 状态的记录', () => {
    const records = [
      makeRecord({ id: 1, status: 'approved' }),
      makeRecord({ id: 2, status: 'completed' }),
      makeRecord({ id: 3, status: 'draft' }),
      makeRecord({ id: 4, status: 'pending' }),
      makeRecord({ id: 5, status: 'rejected' }),
    ];
    const result = filterApprovedRecords(records);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual([1, 2]);
  });

  it('空数组返回空数组', () => {
    expect(filterApprovedRecords([])).toEqual([]);
  });

  it('全部为非批准状态时返回空数组', () => {
    const records = [
      makeRecord({ id: 1, status: 'draft' }),
      makeRecord({ id: 2, status: 'pending' }),
    ];
    expect(filterApprovedRecords(records)).toEqual([]);
  });

  it('不修改原始数组', () => {
    const records = [
      makeRecord({ id: 1, status: 'approved' }),
      makeRecord({ id: 2, status: 'draft' }),
    ];
    const original = [...records];
    filterApprovedRecords(records);
    expect(records).toEqual(original);
  });
});

describe('mapRecordsToLabels', () => {
  it('将含单个 item 的记录映射为一个标签', () => {
    const records = [makeRecord()];
    const labels = mapRecordsToLabels(records);
    expect(labels).toHaveLength(1);
    expect(labels[0]).toMatchObject({
      id: '1-0',
      labelNo: 'PO-001-1',
      orderNo: 'PO-001',
      materialName: 'PET薄膜',
      specification: '1200×1000mm',
      supplier: '供应商A',
      quantity: 50,
      unit: 'KG',
      batchNo: 'B001',
    });
  });

  it('将含多个 items 的记录展开为多个标签', () => {
    const records = [
      makeRecord({
        id: 10,
        order_no: 'PO-010',
        items: [
          { material_name: '物料A', material_spec: '100mm', quantity: 10, unit: 'PCS', batch_no: 'B1' } as any,
          { material_name: '物料B', material_spec: '200mm', quantity: 20, unit: 'PCS', batch_no: 'B2' } as any,
          { material_name: '物料C', material_spec: '300mm', quantity: 30, unit: 'PCS', batch_no: 'B3' } as any,
        ],
      }),
    ];
    const labels = mapRecordsToLabels(records);
    expect(labels).toHaveLength(3);
    expect(labels[0].id).toBe('10-0');
    expect(labels[0].labelNo).toBe('PO-010-1');
    expect(labels[1].id).toBe('10-1');
    expect(labels[1].labelNo).toBe('PO-010-2');
    expect(labels[2].id).toBe('10-2');
    expect(labels[2].labelNo).toBe('PO-010-3');
  });

  it('多条记录混合展开', () => {
    const records = [
      makeRecord({ id: 1, order_no: 'PO-1', items: [{ material_name: 'A' } as any] }),
      makeRecord({ id: 2, order_no: 'PO-2', items: [{ material_name: 'B' } as any, { material_name: 'C' } as any] }),
    ];
    const labels = mapRecordsToLabels(records);
    expect(labels).toHaveLength(3);
    expect(labels.map((l) => l.labelNo)).toEqual(['PO-1-1', 'PO-2-1', 'PO-2-2']);
  });

  it('items 为空数组时跳过该记录', () => {
    const records = [makeRecord({ items: [] }), makeRecord({ id: 2, items: [{ material_name: 'A' } as any] })];
    const labels = mapRecordsToLabels(records);
    expect(labels).toHaveLength(1);
  });

  it('items 为 undefined 时跳过该记录', () => {
    const records = [makeRecord({ items: undefined }), makeRecord({ id: 2, items: [{ material_name: 'A' } as any] })];
    const labels = mapRecordsToLabels(records);
    expect(labels).toHaveLength(1);
  });

  it('标签包含 record 和 item 原始引用', () => {
    const records = [makeRecord()];
    const labels = mapRecordsToLabels(records);
    expect(labels[0].record).toBe(records[0]);
    expect(labels[0].item).toBe(records[0].items![0]);
  });

  it('inboundTime 映射自 record.create_time', () => {
    const records = [makeRecord({ create_time: '2026-01-15T08:30:00Z' })];
    const labels = mapRecordsToLabels(records);
    expect(labels[0].inboundTime).toBe('2026-01-15T08:30:00Z');
  });

  it('空数组返回空数组', () => {
    expect(mapRecordsToLabels([])).toEqual([]);
  });

  it('order_no 为 undefined 时 labelNo 回退为 "undefined-1"', () => {
    const records = [
      makeRecord({ id: 99, order_no: undefined, items: [{ material_name: '物料X', material_spec: '100mm', quantity: 5, unit: 'PCS', batch_no: 'BX' } as any] }),
    ];
    const labels = mapRecordsToLabels(records);
    expect(labels).toHaveLength(1);
    expect(labels[0].labelNo).toBe('undefined-1');
  });
});
