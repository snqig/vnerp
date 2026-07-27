export interface ParsedSpec {
  width: number;
  length: number | null;
  raw: string;
}

export function parseSpec(spec: string | null | undefined): ParsedSpec {
  if (!spec) return { width: 0, length: null, raw: '' };
  const trimmed = spec.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\*(\d+(?:\.\d+)?)$/);
  if (match) {
    return { width: parseFloat(match[1]), length: parseFloat(match[2]), raw: trimmed };
  }
  const singleMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (singleMatch) {
    return { width: parseFloat(singleMatch[1]), length: null, raw: trimmed };
  }
  return { width: 0, length: null, raw: trimmed };
}

export function formatLargeSpec(width: number | string, length: number | string | null): string {
  const w = typeof width === 'string' ? parseFloat(width) : width;
  const l = typeof length === 'string' ? parseFloat(length) : length;
  if (l && l > 0) return `${w}*${l}`;
  return `${w}`;
}

export function formatSmallSpec(width: number | string): string {
  const w = typeof width === 'string' ? parseFloat(width) : width;
  return `${w}`;
}

export const UNIT_MARK = { NORMAL: 0, ZHIZ: 1, JUAN: 2 } as const;

export function getUnitLabel(unitMark: number): string {
  const map: Record<number, string> = { 0: '', 1: '支', 2: '卷' };
  return map[unitMark] ?? '';
}

export function getBatchTypeLabel(batchType: number): string {
  const map: Record<number, string> = { 0: '大料批次', 1: '小料批次' };
  return map[batchType] ?? '未知';
}
