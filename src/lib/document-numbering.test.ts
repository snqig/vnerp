import { describe, it, expect } from 'vitest';
import {
  validateDocumentNoTemplate,
  resolveResetPeriod,
  parseTemplate,
} from './document-numbering';

describe('validateDocumentNoTemplate', () => {
  it('合法模板返回 valid=true 并按顺序列出占位符', () => {
    const r = validateDocumentNoTemplate('UNQ-{YYYY}-{MMDD}-{SEQ:3}');
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.placeholders).toEqual(['YYYY', 'MMDD', 'SEQ:3']);
  });

  it('空模板报错', () => {
    const r = validateDocumentNoTemplate('');
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toContain('不能为空');
  });

  it('未闭合花括号报错', () => {
    const r = validateDocumentNoTemplate('ORD{YYYYMMDD');
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toContain('未闭合');
  });

  it('未知占位符报错', () => {
    const r = validateDocumentNoTemplate('ORD{FOO-BAR}{SEQ:3}');
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toContain('FOO-BAR');
  });

  it('多个 {SEQ:n} 报错', () => {
    const r = validateDocumentNoTemplate('X{SEQ:2}{SEQ:3}');
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toContain('最多只能包含一个');
  });

  it('{SEQ:n} 位数越界报错', () => {
    const r = validateDocumentNoTemplate('X{SEQ:11}');
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toContain('1-10');
  });

  it('只有 {SEQ:n} 没有字面量报错', () => {
    const r = validateDocumentNoTemplate('{SEQ:3}');
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toContain('非流水片段');
  });

  it('派生模板（无 SEQ）合法', () => {
    const r = validateDocumentNoTemplate('{CARD_NO}-V{VERSION}');
    expect(r.valid).toBe(true);
    expect(r.placeholders).toEqual(['CARD_NO', 'VERSION']);
  });

  it('含 TS:n 与日期片段的默认模板全部合法', () => {
    const templates = [
      'ORD{YYYYMMDD}{SEQ:6}',
      'B{YYMMDD}{SEQ:4}',
      'COST{WO_NO}{TS:6}{SEQ:2}',
      '{SC_TYPE}{YYYYMMDD}{SEQ:4}',
      'TRF-{TRANSFER_NO}-{MATERIAL_CODE}',
      'WO{WO_NO}{TS:6}',
    ];
    templates.forEach((tpl) => {
      const r = validateDocumentNoTemplate(tpl);
      expect(r.errors, `模板 ${tpl} 应合法`).toEqual([]);
    });
  });
});

describe('resolveResetPeriod', () => {
  it('含 MMDD 判定为按日', () => {
    expect(resolveResetPeriod('UNQ-{YYYY}-{MMDD}-{SEQ:3}')).toBe('daily');
  });

  it('含 YYMMDD 判定为按日', () => {
    expect(resolveResetPeriod('B{YYMMDD}{SEQ:4}')).toBe('daily');
  });

  it('含时间戳片段判定为按日', () => {
    expect(resolveResetPeriod('TRX{YYYYMMDDHHmmss}{SEQ:4}')).toBe('daily');
    expect(resolveResetPeriod('COST{WO_NO}{TS:6}{SEQ:2}')).toBe('daily');
  });

  it('仅含 YYYYMM 判定为按月', () => {
    expect(resolveResetPeriod('V{YYYYMM}-{SEQ:4}')).toBe('monthly');
  });

  it('仅含 YYYY 判定为按年', () => {
    expect(resolveResetPeriod('X{YYYY}{SEQ:4}')).toBe('yearly');
  });

  it('不含日期片段判定为不重置', () => {
    expect(resolveResetPeriod('DOC{SEQ:4}')).toBe('global');
  });

  it('上下文变量不影响周期判定', () => {
    expect(resolveResetPeriod('{SC_TYPE}{YYYYMMDD}{SEQ:4}')).toBe('daily');
  });
});

describe('parseTemplate', () => {
  it('SEQ 位于中间时正确切分前后缀', () => {
    const p = parseTemplate('UQ-{YYYYMMDD}-{SEQ:4}-X');
    expect(p.seqLength).toBe(4);
    expect(p.prefix).toBe('UQ-{YYYYMMDD}-');
    expect(p.suffix).toBe('-X');
    expect(p.variables).toEqual([]);
  });

  it('无 SEQ 时 seqLength 为 null 且不再切分', () => {
    const p = parseTemplate('{CARD_NO}-M');
    expect(p.seqLength).toBeNull();
    expect(p.prefix).toBe('{CARD_NO}-M');
    expect(p.suffix).toBe('');
    expect(p.variables).toEqual(['CARD_NO']);
  });

  it('收集业务变量但排除日期/时刻/流水占位符', () => {
    const p = parseTemplate('{SC_TYPE}{YYYYMMDD}{SEQ:4}');
    expect(p.variables).toEqual(['SC_TYPE']);
    expect(p.seqLength).toBe(4);
  });
});
