import { describe, it, expect } from 'vitest';
import { generatePrintContent } from '../utils/generatePrintContent';
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

describe('generatePrintContent', () => {
  it('生成包含指定标题的 HTML 文档', () => {
    const html = generatePrintContent([makeRecord()], '测试标题');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>测试标题</title>');
  });

  it('只包含 approved 和 completed 状态的记录标签', () => {
    const records = [
      makeRecord({ id: 1, status: 'approved', order_no: 'PO-A', items: [{ material_name: '物料A', material_spec: '100mm', quantity: 10, unit: 'PCS', batch_no: 'B1' } as any] }),
      makeRecord({ id: 2, status: 'draft', order_no: 'PO-B', items: [{ material_name: '物料B', material_spec: '200mm', quantity: 20, unit: 'PCS', batch_no: 'B2' } as any] }),
      makeRecord({ id: 3, status: 'completed', order_no: 'PO-C', items: [{ material_name: '物料C', material_spec: '300mm', quantity: 30, unit: 'PCS', batch_no: 'B3' } as any] }),
    ];
    const html = generatePrintContent(records, '打印预览');
    expect(html).toContain('PO-A-1');
    expect(html).toContain('PO-C-1');
    expect(html).not.toContain('PO-B');
  });

  it('标签包含物料名称和规格', () => {
    const html = generatePrintContent(
      [makeRecord({ items: [{ material_name: '铜版纸', material_spec: '80gsm', quantity: 100, unit: '张', batch_no: 'B001' } as any] })],
      '打印'
    );
    expect(html).toContain('铜版纸');
    expect(html).toContain('80gsm');
    expect(html).toContain('100 张');
    expect(html).toContain('供应商A');
  });

  it('包含 QR 码 data URI', () => {
    const html = generatePrintContent(
      [makeRecord({ order_no: 'PO-QR', items: [{ material_name: 'M', material_spec: 'S', quantity: 1, unit: 'U', batch_no: 'B' } as any] })],
      '打印'
    );
    expect(html).toContain('data:image/png;base64,');
    const expectedB64 = btoa('PO-QR-1@001:type:IN');
    expect(html).toContain(expectedB64);
  });

  it('空记录列表生成有效 HTML 但无标签', () => {
    const html = generatePrintContent([], '空打印');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('物料标签打印');
    expect(html).not.toContain('class="label"');
  });

  it('全部为 draft 状态时不生成任何标签', () => {
    const records = [makeRecord({ status: 'draft' })];
    const html = generatePrintContent(records, '打印');
    expect(html).not.toContain('class="label"');
  });

  it('包含 @page A4 landscape 样式', () => {
    const html = generatePrintContent([], '打印');
    expect(html).toContain('@page');
    expect(html).toContain('A4 landscape');
  });

  it('包含"已入库"状态标签', () => {
    const html = generatePrintContent(
      [makeRecord({ status: 'approved' })],
      '打印'
    );
    expect(html).toContain('已入库');
    expect(html).toContain('status-in');
  });

  it('specification 为空时渲染 "-"', () => {
    const html = generatePrintContent(
      [makeRecord({
        status: 'approved',
        items: [{ material_name: '物料', material_spec: '', quantity: 10, unit: 'KG', batch_no: 'B1' } as any],
      })],
      '打印'
    );
    expect(html).toContain('-');
  });

  it('supplier 为空时渲染 "-"', () => {
    const html = generatePrintContent(
      [makeRecord({
        status: 'approved',
        supplier_name: '',
        items: [{ material_name: '物料', material_spec: '100mm', quantity: 10, unit: 'KG', batch_no: 'B1' } as any],
      })],
      '打印'
    );
    expect(html).toContain('供应商: -');
  });

  it('inboundTime 为空时渲染 "-"', () => {
    const html = generatePrintContent(
      [makeRecord({
        status: 'approved',
        create_time: '',
        items: [{ material_name: '物料', material_spec: '100mm', quantity: 10, unit: 'KG', batch_no: 'B1' } as any],
      })],
      '打印'
    );
    expect(html).toContain('入库时间: -');
  });
});
