/**
 * toDateInput — 后端日期值 → <input type="date"> 安全格式单元测试
 *
 * 背景：mysql2 未开 dateStrings，DATE/DATETIME 列读取返回 Date 对象，
 * API JSON 序列化为 UTC ISO 串（东八区钟面偏移 -8h），date input 只接受
 * YYYY-MM-DD，直接绑定导致编辑回显空白。
 */
import { describe, it, expect } from 'vitest';

import { toDateInput, toDateTimeLocal, nowDateTimeLocal } from '@/lib/date-utils';

describe('toDateInput', () => {
  it('空值（null/undefined/空串）→ 空串', () => {
    expect(toDateInput(null)).toBe('');
    expect(toDateInput(undefined)).toBe('');
    expect(toDateInput('')).toBe('');
  });

  it('已是 YYYY-MM-DD → 原样', () => {
    expect(toDateInput('2026-10-04')).toBe('2026-10-04');
  });

  it('YYYY-MM-DD HH:mm:ss（空格分隔，无时区语义）→ 取前 10 位', () => {
    expect(toDateInput('2026-10-04 12:30:00')).toBe('2026-10-04');
  });

  it('YYYY-MM-DDTHH:mm:ss（T 分隔，无时区语义）→ 取前 10 位', () => {
    expect(toDateInput('2026-10-04T12:30:00')).toBe('2026-10-04');
  });

  it('ISO 带 Z 时区 → 按本地日历日换算（东八区 16:00Z = 次日零点）', () => {
    expect(toDateInput('2026-10-03T16:00:00.000Z')).toBe(
      (() => {
        const d = new Date('2026-10-03T16:00:00.000Z');
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      })()
    );
  });

  it('Date 对象 → 本地日历日', () => {
    expect(toDateInput(new Date(2026, 9, 4))).toBe('2026-10-04');
  });

  it('非法字符串 → 原样返回不抛错', () => {
    expect(toDateInput('abc')).toBe('abc');
  });
});

/**
 * toDateTimeLocal — 后端日期时间值 → <input type="datetime-local"> 安全格式
 *
 * 背景：DATETIME 列经 API 序列化为 UTC ISO 串（...Z），datetime-local input
 * 只接受无时区的 YYYY-MM-DDTHH:mm：直接绑定回显空白；即使 slice(0,16)
 * 得到合法格式，取的也是 UTC 钟面（东八区偏移 -8h）。必须按本地时区换算。
 */
describe('toDateTimeLocal', () => {
  const localMinute = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`;

  it('空值 → 空串', () => {
    expect(toDateTimeLocal(null)).toBe('');
    expect(toDateTimeLocal(undefined)).toBe('');
    expect(toDateTimeLocal('')).toBe('');
  });

  it('ISO 带 Z → 按本地时区换算到分钟', () => {
    const iso = '2026-10-03T16:30:00.000Z';
    expect(toDateTimeLocal(iso)).toBe(localMinute(new Date(iso)));
  });

  it('Date 对象 → 本地钟面', () => {
    const d = new Date(2026, 9, 4, 9, 5);
    expect(toDateTimeLocal(d)).toBe('2026-10-04T09:05');
  });

  it('YYYY-MM-DDTHH:mm:ss 无时区 → 取前 16 位（钟面即业务时间）', () => {
    expect(toDateTimeLocal('2026-10-04T12:30:45')).toBe('2026-10-04T12:30');
  });

  it('YYYY-MM-DD HH:mm:ss 空格分隔（dateStrings 直返）→ T 分隔，取前 16 位', () => {
    expect(toDateTimeLocal('2026-10-04 12:30:45')).toBe('2026-10-04T12:30');
  });

  it('非法字符串 → 原样返回不抛错', () => {
    expect(toDateTimeLocal('abc')).toBe('abc');
  });

  it('nowDateTimeLocal 与当前本地钟面一致（分钟）', () => {
    const v = nowDateTimeLocal();
    expect(v).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    const d = new Date();
    expect(v).toBe(localMinute(d));
  });
});
