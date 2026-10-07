/**
 * sanitizeObject Date 出参治理（Read.md ⑮）— 回归测试
 *
 * 背景：原实现把所有 Date 截断成 UTC 纯日期串（toISOString().slice(0,10)）：
 * ① DATETIME 时间部分在 HTTP 出参丢失，前端 datetime-local 无法回显；
 * ② 北京 0–8 点的记录 UTC 日期已是前一天（错日）。
 * 现统一序列化为本地钟面 'YYYY-MM-DDTHH:mm:ss'（无时区语义，ES 规范按本地解析，
 * new Date/formatDate/toDateInput/toDateTimeLocal/slice(0,10)/slice(0,16) 全兼容）；
 * 原 preserveDateTimes 特例通道随之移除（职责已被默认行为覆盖）。
 *
 * 断言全部用本地构造 Date + 本地钟面期望值，不依赖测试机时区。
 */
import { describe, it, expect } from 'vitest';
import { successResponse } from '@/lib/api-response';

describe('sanitizeObject Date 出参序列化', () => {
  it('Date → 本地钟面 YYYY-MM-DDTHH:mm:ss（时间部分保留）', async () => {
    const res = successResponse({ list: [{ id: 1, start_time: new Date(2026, 6, 15, 8, 0, 0) }] });
    const json = await res.json();
    expect(json.data.list[0].start_time).toBe('2026-07-15T08:00:00');
  });

  it('北京 0–8 点不错日：本地钟面直接还原业务日期', async () => {
    const res = successResponse({ mix_time: new Date(2026, 0, 1, 2, 30, 5) });
    const json = await res.json();
    expect(json.data.mix_time).toBe('2026-01-01T02:30:05');
  });

  it('嵌套对象 / 数组内的 Date 一并处理', async () => {
    const res = successResponse({
      rows: [{ planned_end: new Date(2026, 11, 31, 23, 59, 59) }],
    });
    const json = await res.json();
    expect(json.data.rows[0].planned_end).toBe('2026-12-31T23:59:59');
  });

  it('非法 Date 返回空串，不再抛 RangeError 致 500', async () => {
    const res = successResponse({ bad: new Date('invalid') });
    const json = await res.json();
    expect(json.data.bad).toBe('');
  });

  it('字符串 / null / number 不受影响', async () => {
    const res = successResponse({ a: '2026-10-04 09:00:00', b: null, c: 3 });
    const json = await res.json();
    expect(json.data.a).toBe('2026-10-04 09:00:00');
    expect(json.data.b).toBeNull();
    expect(json.data.c).toBe(3);
  });
});
