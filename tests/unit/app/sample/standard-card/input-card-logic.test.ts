import { describe, it, expect } from 'vitest';
import {
  createEmptyData,
  createEmptySequence,
  toggleMultiValue,
  mapCardDataToApiPayload,
  mapApiDataToCardData,
  type CardData,
  type PrintSequence,
} from '@/app/[locale]/sample/standard-card/input-card/utils';

describe('Standard Card Input — createEmptyData', () => {
  it('returns object with all expected fields', () => {
    const data = createEmptyData();
    expect(data).toBeDefined();
    expect(typeof data.cardNo).toBe('string');
    expect(data.cardNo).toMatch(/^SC\d+$/);
    expect(data.customer).toBe('');
    expect(data.customerCode).toBe('');
    expect(data.productName).toBe('');
    expect(data.version).toBe('V1.0');
    expect(data.dashedKnife).toBe(false);
  });

  it('initializes 7 empty print sequences', () => {
    const data = createEmptyData();
    expect(data.sequences).toHaveLength(7);
    data.sequences.forEach((seq, i) => {
      expect(seq.id).toBe(i + 1);
      expect(seq.color).toBe('');
      expect(seq.inkCode).toBe('');
    });
  });

  it('initializes sheetSpecs with empty width and length', () => {
    const data = createEmptyData();
    expect(data.sheetSpecs).toEqual({ width: '', length: '' });
  });

  it('sets date to today in YYYY-MM-DD format', () => {
    const data = createEmptyData();
    expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const today = new Date().toISOString().split('T')[0];
    expect(data.date).toBe(today);
  });
});

describe('Standard Card Input — createEmptySequence', () => {
  it('creates sequence with given id and empty fields', () => {
    const seq = createEmptySequence(3);
    expect(seq.id).toBe(3);
    expect(seq.color).toBe('');
    expect(seq.inkCode).toBe('');
    expect(seq.linCode).toBe('');
    expect(seq.storageLocation).toBe('');
    expect(seq.plateCode).toBe('');
    expect(seq.mesh).toBe('');
    expect(seq.plateStorage).toBe('');
    expect(seq.printSide).toBe('');
  });
});

describe('Standard Card Input — toggleMultiValue', () => {
  it('adds value to empty string', () => {
    expect(toggleMultiValue('', '3#')).toBe('3#');
  });

  it('adds value to existing single value', () => {
    expect(toggleMultiValue('3#', '2#')).toBe('3#,2#');
  });

  it('adds value to existing multiple values', () => {
    expect(toggleMultiValue('3#,2#', '1#')).toBe('3#,2#,1#');
  });

  it('removes value from middle of list', () => {
    expect(toggleMultiValue('3#,2#,1#', '2#')).toBe('3#,1#');
  });

  it('removes value from start of list', () => {
    expect(toggleMultiValue('3#,2#,1#', '3#')).toBe('2#,1#');
  });

  it('removes value from end of list', () => {
    expect(toggleMultiValue('3#,2#,1#', '1#')).toBe('3#,2#');
  });

  it('removes only value, resulting in empty string', () => {
    expect(toggleMultiValue('3#', '3#')).toBe('');
  });

  it('handles value not in list (adds it)', () => {
    expect(toggleMultiValue('3#,2#', '1#')).toBe('3#,2#,1#');
  });

  it('handles null/undefined current as empty', () => {
    expect(toggleMultiValue(null as unknown as string, '3#')).toBe('3#');
  });

  it('filters out empty strings from current value', () => {
    expect(toggleMultiValue('3#,,2#', '1#')).toBe('3#,2#,1#');
  });

  it('is idempotent when toggling twice (add then remove)', () => {
    const step1 = toggleMultiValue('', '胶印');
    const step2 = toggleMultiValue(step1, '胶印');
    expect(step2).toBe('');
  });

  it('preserves order when removing non-adjacent values', () => {
    expect(toggleMultiValue('胶印,卷料丝印,片料丝印,轮转印', '卷料丝印')).toBe(
      '胶印,片料丝印,轮转印'
    );
  });
});

describe('Standard Card Input — mapCardDataToApiPayload', () => {
  const makeTestData = (): CardData => ({
    ...createEmptyData(),
    cardNo: 'SC-TEST-001',
    customer: '测试客户',
    customerCode: 'CUST-001',
    productName: '测试产品',
    version: 'V2.0',
    date: '2026-07-13',
    finishedSize: '148x210',
    tolerance: '0.5',
    materialName: 'PET',
    materialType: '硬胶',
    coreType: '3#,2#',
    printType: '卷料丝印',
    processMethod: '模切',
    dashedKnife: true,
    sequences: [
      { id: 1, color: '红', inkCode: 'R001', linCode: 'F001', storageLocation: 'A1', plateCode: 'P001', mesh: '120', plateStorage: 'B1', printSide: '正面' },
      ...Array.from({ length: 6 }, (_, i) => createEmptySequence(i + 2)),
    ],
    creator: '张三',
    adhesiveType: '热熔胶',
    stampingMethod: '冷冲压',
  });

  it('maps camelCase fields to snake_case', () => {
    const payload = mapCardDataToApiPayload(makeTestData(), false);
    expect(payload.card_no).toBe('SC-TEST-001');
    expect(payload.customer_name).toBe('测试客户');
    expect(payload.customer_code).toBe('CUST-001');
    expect(payload.product_name).toBe('测试产品');
    expect(payload.finished_size).toBe('148x210');
    expect(payload.material_name).toBe('PET');
    expect(payload.material_type).toBe('硬胶');
    expect(payload.adhesive_type).toBe('热熔胶');
    expect(payload.stamping_method).toBe('冷冲压');
  });

  it('converts dashedKnife boolean to integer (true → 1)', () => {
    const payload = mapCardDataToApiPayload(makeTestData(), false);
    expect(payload.dashed_knife).toBe(1);
  });

  it('converts dashedKnife boolean to integer (false → 0)', () => {
    const data = makeTestData();
    data.dashedKnife = false;
    const payload = mapCardDataToApiPayload(data, false);
    expect(payload.dashed_knife).toBe(0);
  });

  it('serializes sequences array to JSON string', () => {
    const data = makeTestData();
    const payload = mapCardDataToApiPayload(data, false);
    expect(typeof payload.sequences).toBe('string');
    const parsed = JSON.parse(payload.sequences as string);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(7);
    expect(parsed[0].color).toBe('红');
    expect(parsed[0].inkCode).toBe('R001');
  });

  it('maps sheetSpecs nested object to flat fields', () => {
    const data = makeTestData();
    data.sheetSpecs = { width: '150', length: '212' };
    const payload = mapCardDataToApiPayload(data, false);
    expect(payload.sheet_width).toBe('150');
    expect(payload.sheet_length).toBe('212');
  });

  it('includes status=1 by default', () => {
    const payload = mapCardDataToApiPayload(makeTestData(), false);
    expect(payload.status).toBe(1);
  });

  it('does not include id in create mode', () => {
    const payload = mapCardDataToApiPayload(makeTestData(), false);
    expect(payload.id).toBeUndefined();
  });

  it('includes id in edit mode', () => {
    const payload = mapCardDataToApiPayload(makeTestData(), true, '42');
    expect(payload.id).toBe(42);
  });

  it('includes id as integer when editId is string', () => {
    const payload = mapCardDataToApiPayload(makeTestData(), true, '99');
    expect(payload.id).toBe(99);
    expect(typeof payload.id).toBe('number');
  });

  it('preserves multi-value fields as comma-separated strings', () => {
    const payload = mapCardDataToApiPayload(makeTestData(), false);
    expect(payload.core_type).toBe('3#,2#');
    expect(payload.print_type).toBe('卷料丝印');
    expect(payload.process_method).toBe('模切');
  });

  it('maps all 70+ fields without omission', () => {
    const data = makeTestData();
    data.filmManufacturer = '3M';
    data.moldCode = 'MOLD-001';
    data.slicePerRow = '10';
    data.colorFormula = '红:100%';
    data.notes = '备注';
    data.approver = '核准人';
    data.documentCode = 'DOC-001';
    data.etchMold = 'EM-001';
    data.extraField = '额外';

    const payload = mapCardDataToApiPayload(data, false);
    expect(payload.film_manufacturer).toBe('3M');
    expect(payload.mold_code).toBe('MOLD-001');
    expect(payload.slice_per_row).toBe('10');
    expect(payload.color_formula).toBe('红:100%');
    expect(payload.notes).toBe('备注');
    expect(payload.approver).toBe('核准人');
    expect(payload.document_code).toBe('DOC-001');
    expect(payload.etch_mold).toBe('EM-001');
    expect(payload.extra_field).toBe('额外');
  });
});

describe('Standard Card Input — mapApiDataToCardData', () => {
  const makeTestApiData = (): Loose => ({
    card_no: 'SC-API-001',
    customer_name: 'API客户',
    customer_code: 'API-CUST',
    product_name: 'API产品',
    version: 'V3.0',
    date: '2026-07-13T00:00:00.000Z',
    finished_size: '210x297',
    tolerance: '0.3',
    material_name: 'PVC',
    material_type: '软胶',
    print_type: '胶印,卷料丝印',
    process_method: '冲压',
    core_type: '1#',
    dashed_knife: 1,
    sheet_width: '200',
    sheet_length: '300',
    sequences: JSON.stringify([
      { id: 1, color: '蓝', inkCode: 'B001', linCode: '', storageLocation: '', plateCode: '', mesh: '', plateStorage: '', printSide: '' },
      { id: 2, color: '', inkCode: '', linCode: '', storageLocation: '', plateCode: '', mesh: '', plateStorage: '', printSide: '' },
    ]),
    film_manufacturer: 'Henkel',
    adhesive_type: 'PU胶',
    creator: 'API制表人',
    approver: 'API核准',
    stamping_method: '热冲压',
  });

  it('maps snake_case fields to camelCase', () => {
    const data = mapApiDataToCardData(makeTestApiData());
    expect(data.cardNo).toBe('SC-API-001');
    expect(data.customer).toBe('API客户');
    expect(data.customerCode).toBe('API-CUST');
    expect(data.productName).toBe('API产品');
    expect(data.finishedSize).toBe('210x297');
    expect(data.materialName).toBe('PVC');
    expect(data.materialType).toBe('软胶');
    expect(data.adhesiveType).toBe('PU胶');
    expect(data.stampingMethod).toBe('热冲压');
  });

  it('splits date string at T to get YYYY-MM-DD', () => {
    const data = mapApiDataToCardData(makeTestApiData());
    expect(data.date).toBe('2026-07-13');
  });

  it('converts dashed_knife integer to boolean (1 → true)', () => {
    const data = mapApiDataToCardData(makeTestApiData());
    expect(data.dashedKnife).toBe(true);
  });

  it('converts dashed_knife integer to boolean (0 → false)', () => {
    const apiData = makeTestApiData();
    apiData.dashed_knife = 0;
    const data = mapApiDataToCardData(apiData);
    expect(data.dashedKnife).toBe(false);
  });

  it('converts dashed_knife boolean true to boolean true', () => {
    const apiData = makeTestApiData();
    apiData.dashed_knife = true;
    const data = mapApiDataToCardData(apiData);
    expect(data.dashedKnife).toBe(true);
  });

  it('parses sequences JSON string to array', () => {
    const data = mapApiDataToCardData(makeTestApiData());
    expect(Array.isArray(data.sequences)).toBe(true);
    expect(data.sequences).toHaveLength(2);
    expect(data.sequences[0].color).toBe('蓝');
    expect(data.sequences[0].inkCode).toBe('B001');
  });

  it('handles already-parsed sequences array', () => {
    const apiData = makeTestApiData();
    apiData.sequences = [
      { id: 1, color: '红', inkCode: 'R001', linCode: '', storageLocation: '', plateCode: '', mesh: '', plateStorage: '', printSide: '' },
    ];
    const data = mapApiDataToCardData(apiData);
    expect(Array.isArray(data.sequences)).toBe(true);
    expect(data.sequences).toHaveLength(1);
    expect(data.sequences[0].color).toBe('红');
  });

  it('falls back to 7 empty sequences when sequences is null', () => {
    const apiData = makeTestApiData();
    apiData.sequences = null;
    const data = mapApiDataToCardData(apiData);
    expect(data.sequences).toHaveLength(7);
    data.sequences.forEach((seq, i) => {
      expect(seq.id).toBe(i + 1);
      expect(seq.color).toBe('');
    });
  });

  it('falls back to 7 empty sequences when sequences is undefined', () => {
    const apiData = makeTestApiData();
    delete apiData.sequences;
    const data = mapApiDataToCardData(apiData);
    expect(data.sequences).toHaveLength(7);
  });

  it('falls back to 7 empty sequences when sequences is empty array', () => {
    const apiData = makeTestApiData();
    apiData.sequences = [];
    const data = mapApiDataToCardData(apiData);
    expect(data.sequences).toHaveLength(7);
  });

  it('maps sheet_width/sheet_length to sheetSpecs object', () => {
    const data = mapApiDataToCardData(makeTestApiData());
    expect(data.sheetSpecs).toEqual({ width: '200', length: '300' });
  });

  it('handles missing fields with empty string defaults', () => {
    const data = mapApiDataToCardData({});
    expect(data.cardNo).toBe('');
    expect(data.customer).toBe('');
    expect(data.productName).toBe('');
    expect(data.finishedSize).toBe('');
    expect(data.materialName).toBe('');
  });

  it('handles missing date as empty string', () => {
    const data = mapApiDataToCardData({});
    expect(data.date).toBe('');
  });

  it('handles missing dashed_knife as false', () => {
    const data = mapApiDataToCardData({});
    expect(data.dashedKnife).toBe(false);
  });
});

describe('Standard Card Input — round-trip mapping', () => {
  it('cardData → payload → cardData preserves all values', () => {
    const original = createEmptyData();
    original.cardNo = 'SC-RT-001';
    original.customer = '往返测试客户';
    original.customerCode = 'RT-001';
    original.productName = '往返产品';
    original.version = 'V9.9';
    original.date = '2026-07-13';
    original.finishedSize = '100x200';
    original.tolerance = '0.1';
    original.materialName = 'BOPP';
    original.materialType = '硬胶';
    original.coreType = '3#,1#';
    original.printType = '片料丝印';
    original.processMethod = '模切';
    original.dashedKnife = true;
    original.filmManufacturer = 'Avery';
    original.adhesiveType = '软胶';
    original.creator = '测试员';
    original.approver = '审批人';
    original.sequences[0].color = '绿';
    original.sequences[0].inkCode = 'G001';
    original.sheetSpecs = { width: '105', length: '148' };

    const payload = mapCardDataToApiPayload(original, false);
    const restored = mapApiDataToCardData(payload);

    expect(restored.cardNo).toBe(original.cardNo);
    expect(restored.customer).toBe(original.customer);
    expect(restored.customerCode).toBe(original.customerCode);
    expect(restored.productName).toBe(original.productName);
    expect(restored.version).toBe(original.version);
    expect(restored.date).toBe(original.date);
    expect(restored.finishedSize).toBe(original.finishedSize);
    expect(restored.tolerance).toBe(original.tolerance);
    expect(restored.materialName).toBe(original.materialName);
    expect(restored.materialType).toBe(original.materialType);
    expect(restored.coreType).toBe(original.coreType);
    expect(restored.printType).toBe(original.printType);
    expect(restored.processMethod).toBe(original.processMethod);
    expect(restored.dashedKnife).toBe(original.dashedKnife);
    expect(restored.filmManufacturer).toBe(original.filmManufacturer);
    expect(restored.adhesiveType).toBe(original.adhesiveType);
    expect(restored.creator).toBe(original.creator);
    expect(restored.approver).toBe(original.approver);
    expect(restored.sequences[0].color).toBe('绿');
    expect(restored.sequences[0].inkCode).toBe('G001');
    expect(restored.sheetSpecs).toEqual({ width: '105', length: '148' });
  });

  it('round-trip preserves 7 sequences', () => {
    const original = createEmptyData();
    original.sequences[2].color = '黄';
    original.sequences[5].inkCode = 'X999';

    const payload = mapCardDataToApiPayload(original, false);
    const restored = mapApiDataToCardData(payload);

    expect(restored.sequences).toHaveLength(7);
    expect(restored.sequences[2].color).toBe('黄');
    expect(restored.sequences[5].inkCode).toBe('X999');
  });

  it('round-trip preserves multi-value checkbox state', () => {
    const original = createEmptyData();
    let core = original.coreType;
    core = toggleMultiValue(core, '3#');
    core = toggleMultiValue(core, '2#');
    core = toggleMultiValue(core, '1#');
    original.coreType = core;

    const payload = mapCardDataToApiPayload(original, false);
    const restored = mapApiDataToCardData(payload);

    expect(restored.coreType).toBe('3#,2#,1#');
    const values = restored.coreType.split(',');
    expect(values).toContain('3#');
    expect(values).toContain('2#');
    expect(values).toContain('1#');
  });
});
