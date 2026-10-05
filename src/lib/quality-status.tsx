import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

export type QualityInspectionType = 'process' | 'final';

/**
 * burdening_status 统一语义映射。
 * 同一种数值在过程检验 / 终检全局同义；颜色按数值统一，标签按检验类型取上下文文案。
 * 后端实际写入 0/1/3/5/6（process 还写 2 表示检验中），此前前端仅渲染 0-3，
 * 5(不合格)/6(返工) 无标签 → 这里补齐，杜绝「写入但 UI 不可见」。
 */
const STATUS_COLORS: Record<number, string> = {
  0: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  1: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  2: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  3: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  5: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  6: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const STATUS_LABEL_KEYS: Record<QualityInspectionType, Record<number, string>> = {
  process: { 0: 'pendingProduction', 1: 'pendingInspection', 2: 'inspecting', 3: 'inspected', 5: 'unqualified', 6: 'rework' },
  final: { 0: 'pendingProduction', 1: 'scheduled', 2: 'pendingFinalInspection', 3: 'finalInspectionCompleted', 5: 'unqualified', 6: 'rework' },
};

function resolveLabel(
  status: number,
  type: QualityInspectionType,
  t: (k: string) => string,
  tc: (k: string) => string
): string {
  const key = STATUS_LABEL_KEYS[type][status];
  if (!key) return tc('unknown');
  // 'unqualified' 属于 Common 命名空间，其余属于 Quality 命名空间
  return key === 'unqualified' ? tc('unqualified') : t(key);
}

export function getQualityStatusBadge(
  status: number,
  type: QualityInspectionType,
  t: (k: string) => string,
  tc: (k: string) => string
): ReactNode {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS[0];
  return <Badge className={color}>{resolveLabel(status, type, t, tc)}</Badge>;
}

export function getQualityStatusLabel(
  status: number,
  type: QualityInspectionType,
  t: (k: string) => string,
  tc: (k: string) => string
): string {
  return resolveLabel(status, type, t, tc);
}
