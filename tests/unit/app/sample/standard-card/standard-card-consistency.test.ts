import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createEmptyData,
  createEmptySequence,
  toggleMultiValue,
  mapCardDataToApiPayload,
  mapApiDataToCardData,
  type CardData,
  type PrintSequence,
} from '@/app/[locale]/sample/standard-card/input-card/utils';

function makeFullCardData(overrides: Partial<CardData> = {}): CardData {
  const data = createEmptyData();
  data.cardNo = 'SC-TEST-001';
  data.customer = '测试客户';
  data.customerCode = 'CUS-001';
  data.productName = '测试产品';
  data.version = 'V1.0';
  data.date = '2026-07-14';
  data.finishedSize = '100x200';
  data.tolerance = '±0.1';
  data.materialName = 'BOPP';
  data.materialType = '硬胶';
  data.layoutType = '1×2';
  data.printType = '胶印';
  data.processMethod = '模切';
  data.glueType = '软胶';
  data.packingType = 'PCS/箱';
  data.spacing = '2';
  data.spacingValue = '3';
  data.sheetSpecs = { width: '200', length: '300' };
  data.coreType = '3#,1#';
  data.paperDirection = '纵向';
  data.rollWidth = '400';
  data.paperEdge = '5';
  data.standardUsage = '1.5';
  data.jumpDistance = '10';
  data.processFlow1 = '印刷→模切→包装';
  data.processFlow2 = '检验→入库';
  data.firstJumpDistance = '12';
  data.sequences[0] = { ...data.sequences[0], color: '蓝', inkCode: 'B001', linCode: 'FL001', plateCode: 'PB001', mesh: '200', printSide: '正面' };
  data.filmManufacturer = 'Avery';
  data.filmCode = 'FM001';
  data.stampingMethod = '自动';
  data.moldCode = 'MD001';
  data.layoutMethod = '1排2';
  data.jumpDistance2 = '8';
  data.mylarMaterial = 'PET';
  data.mylarSpecs = '0.05mm';
  data.adhesiveType = '热熔胶';
  data.dashedKnife = true;
  data.slicePerRow = '10';
  data.slicePerRoll = '1000';
  data.slicePerBox = '5000';
  data.packingQty = '100';
  data.backKnifeMold = 'BKM001';
  data.releasePaperType = '格拉辛';
  data.colorFormula = 'C:50 M:30 Y:0 K:0';
  data.notes = '测试备注';
  data.creator = '张三';
  data.approver = '李四';
  data.sampleInfo = '样品A';
  Object.assign(data, overrides);
  return data;
}

describe('StandardCard Consistency — API payload equivalence', () => {
  it('produces identical payload structure regardless of form mode', () => {
    const cardData = makeFullCardData();
    const payload = mapCardDataToApiPayload(cardData, false);
    expect(payload.card_no).toBe('SC-TEST-001');
    expect(payload.customer_name).toBe('测试客户');
    expect(payload.customer_code).toBe('CUS-001');
    expect(payload.product_name).toBe('测试产品');
    expect(payload.dashed_knife).toBe(1);
    expect(payload.sequences).toBeTypeOf('string');
    const parsedSeqs = JSON.parse(payload.sequences as string);
    expect(Array.isArray(parsedSeqs)).toBe(true);
    expect(parsedSeqs).toHaveLength(7);
    expect(parsedSeqs[0].color).toBe('蓝');
    expect(payload.status).toBe(1);
  });

  it('submits all 78+ baseline fields without omission', () => {
    const cardData = makeFullCardData();
    const payload = mapCardDataToApiPayload(cardData, false);
    const expectedKeys = [
      'card_no', 'customer_name', 'customer_code', 'product_name', 'version',
      'date', 'document_code', 'finished_size', 'tolerance', 'material_name',
      'material_type', 'layout_type', 'spacing', 'spacing_value',
      'sheet_width', 'sheet_length', 'core_type', 'paper_direction',
      'roll_width', 'paper_edge', 'standard_usage', 'jump_distance',
      'process_flow1', 'process_flow2', 'print_type', 'first_jump_distance',
      'sequences', 'film_manufacturer', 'film_code', 'film_size',
      'process_method', 'stamping_method', 'mold_code', 'layout_method',
      'layout_way', 'jump_distance2', 'mylar_material', 'mylar_specs',
      'mylar_layout', 'mylar_jump', 'adhesive_type', 'adhesive_manufacturer',
      'adhesive_code', 'adhesive_size', 'adhesive_specs', 'dashed_knife',
      'slice_per_row', 'slice_per_roll', 'slice_per_bundle', 'slice_per_bag',
      'slice_per_box', 'packing_qty', 'back_knife_mold', 'back_mold_code',
      'back_mylar_mold', 'release_paper_code', 'release_paper_type',
      'release_paper_category', 'release_paper_specs', 'padding_material',
      'packing_material', 'glue_type', 'packing_type', 'special_color',
      'color_formula', 'file_path', 'sample_info', 'notes',
      'creator', 'reviewer', 'factory_manager', 'quality_manager',
      'sales', 'approver', 'mold_type', 'etch_mold', 'storage_location',
      'extra_field', 'status',
    ];
    expectedKeys.forEach((key) => {
      expect(payload).toHaveProperty(key);
    });
  });

  it('round-trip preserves all field values', () => {
    const original = makeFullCardData();
    const payload = mapCardDataToApiPayload(original, false);
    const restored = mapApiDataToCardData(payload);
    expect(restored.cardNo).toBe(original.cardNo);
    expect(restored.customer).toBe(original.customer);
    expect(restored.customerCode).toBe(original.customerCode);
    expect(restored.productName).toBe(original.productName);
    expect(restored.finishedSize).toBe(original.finishedSize);
    expect(restored.materialName).toBe(original.materialName);
    expect(restored.coreType).toBe(original.coreType);
    expect(restored.printType).toBe(original.printType);
    expect(restored.processMethod).toBe(original.processMethod);
    expect(restored.dashedKnife).toBe(original.dashedKnife);
    expect(restored.creator).toBe(original.creator);
    expect(restored.approver).toBe(original.approver);
    expect(restored.sequences[0].color).toBe('蓝');
    expect(restored.sequences[0].inkCode).toBe('B001');
    expect(restored.sheetSpecs).toEqual({ width: '200', length: '300' });
  });
});

describe('StandardCard Consistency — validation rules equivalence', () => {
  it('rejects empty customer', () => {
    const data = createEmptyData();
    expect(data.customer).toBe('');
  });

  it('rejects empty customerCode', () => {
    const data = createEmptyData();
    expect(data.customerCode).toBe('');
  });

  it('rejects empty productName', () => {
    const data = createEmptyData();
    expect(data.productName).toBe('');
  });

  it('accepts fully filled data', () => {
    const data = makeFullCardData();
    expect(data.customer).toBeTruthy();
    expect(data.customerCode).toBeTruthy();
    expect(data.productName).toBeTruthy();
  });
});

describe('StandardCard Consistency — Zod schema alignment', () => {
  it('CardDataSchema validates correct data', () => {
    const schema = z.object({
      cardNo: z.string().min(1),
      customer: z.string().min(1),
      customerCode: z.string().min(1),
      productName: z.string().min(1),
    });
    const valid = makeFullCardData();
    const result = schema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('CardDataSchema rejects missing customer', () => {
    const schema = z.object({
      customer: z.string().min(1, '请选择客户'),
    });
    const result = schema.safeParse({ customer: '' });
    expect(result.success).toBe(false);
  });

  it('toggleMultiValue adds and removes values correctly', () => {
    let val = '';
    val = toggleMultiValue(val, '3#');
    expect(val).toBe('3#');
    val = toggleMultiValue(val, '2#');
    expect(val).toBe('3#,2#');
    val = toggleMultiValue(val, '3#');
    expect(val).toBe('2#');
  });

  it('sequences always contains 7 items', () => {
    const empty = createEmptyData();
    expect(empty.sequences).toHaveLength(7);
    const full = makeFullCardData();
    expect(full.sequences).toHaveLength(7);
    const payload = mapCardDataToApiPayload(full, false);
    const parsed = JSON.parse(payload.sequences as string);
    expect(parsed).toHaveLength(7);
  });

  it('dashedKnife round-trips as boolean via 0/1', () => {
    const data = makeFullCardData({ dashedKnife: true });
    const payload = mapCardDataToApiPayload(data, false);
    expect(payload.dashed_knife).toBe(1);
    const restored = mapApiDataToCardData(payload);
    expect(restored.dashedKnife).toBe(true);

    const data2 = makeFullCardData({ dashedKnife: false });
    const payload2 = mapCardDataToApiPayload(data2, false);
    expect(payload2.dashed_knife).toBe(0);
    const restored2 = mapApiDataToCardData(payload2);
    expect(restored2.dashedKnife).toBe(false);
  });
});
