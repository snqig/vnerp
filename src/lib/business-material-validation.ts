/**
 * 业务单据物料分类校验 — 薄包装 category-validation.ts
 *
 * 职责：
 *   1. 从各业务 API 的 items 数组中提取 material_id 列表
 *   2. 调用 checkMaterialsCategorized 检查物料是否已归类
 *   3. 统一返回 { blocked, message } 供路由层决定拦截或警告
 *
 * 本模块只负责"提取 + 转发 + 格式化"，不做任何业务决策。
 * 决策（拦截 or 警告）由 category-validation.ts 中的
 * category.require_on_business 系统配置决定。
 */
import { checkMaterialsCategorized } from '@/lib/category-validation';

export interface BusinessCategoryCheckResult {
  /** 是否应当阻断提交 */
  blocked: boolean;
  /** 中文提示消息；无问题时为 null */
  message: string | null;
  /** 未归类的物料数量 */
  uncategorizedCount: number;
}

/**
 * 从 items 数组中提取所有 material_id（去重、过滤 null/undefined/0）。
 * 支持的 item 字段名：material_id / materialId（驼峰/下划线两种风格）。
 */
export function extractMaterialIds(items: unknown[]): number[] {
  const ids = new Set<number>();
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const raw = obj.material_id ?? obj.materialId;
    const num = Number(raw);
    if (Number.isInteger(num) && num > 0) {
      ids.add(num);
    }
  }
  return Array.from(ids);
}

/**
 * 业务单据提交前统一校验入口。
 *
 * @param items 业务单据明细行（purchase_request_item / inbound_item / outbound_item 等）
 * @param context 业务场景标签，用于日志
 * @returns { blocked, message, uncategorizedCount }
 */
export async function validateBusinessMaterials(
  items: unknown[],
  context = 'business'
): Promise<BusinessCategoryCheckResult> {
  const materialIds = extractMaterialIds(items);

  if (materialIds.length === 0) {
    return { blocked: false, message: null, uncategorizedCount: 0 };
  }

  try {
    const result = await checkMaterialsCategorized(materialIds);
    return {
      blocked: result.blocked,
      message: result.message,
      uncategorizedCount: result.uncategorized.length,
    };
  } catch (e) {
    // 校验本身出错不应阻断业务（可能是数据库临时不可用），
    // 记录日志后放行业务，由上层监控告警。
    console.error(
      `[business-material-validation] 物料分类校验异常（${context}）:`,
      (e as Error).message
    );
    return { blocked: false, message: null, uncategorizedCount: 0 };
  }
}
