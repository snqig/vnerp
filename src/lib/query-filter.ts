/**
 * 列表筛选参数防御工具（治「全部→NaN/空列表」通用坑）
 *
 * 背景：页面下拉「全部」选项常发 value='all'，而 API 侧若直接 Number('all')=NaN
 * 进 SQL（mysql2 抛错→500）或把 'all' 直拼 WHERE（永不匹配→空列表）。
 * 统一在 API 侧短路：'' / 'all' / 非数值 → undefined（即不过滤），页面无需逐个改。
 */

/** 数值型筛选：'all'/''/null/非有限数值 → undefined；其余 → number */
export function numericFilter(v: string | null | undefined): number | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  if (s === '' || s.toLowerCase() === 'all') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** 字符串型筛选：'all'/''/null → undefined；其余原样返回 */
export function stringFilter(v: string | null | undefined): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  if (s === '' || s.toLowerCase() === 'all') return undefined;
  return s;
}
