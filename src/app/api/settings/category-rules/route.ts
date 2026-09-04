import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { escapeId } from 'mysql2';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
import {
  CATEGORY_TABLE_META,
  getCategoryRules,
  safeRegExp,
  type CategoryType,
} from '@/lib/category-validation';

/**
 * 分类规则自查
 *
 * 修复记录（本次）：
 *   1) 原实现查询 `SELECT id, code, name, status, parent_id`，但物料分类表真实列是
 *      category_code / category_name，仓库分类表则【没有 parent_id 列】——
 *      两类查询都会抛 Unknown column，且被 catch 吞成一条 "表不存在或查询失败" 的
 *      warning，导致本接口从上线起【从未真正校验过任何数据】，永远返回 0 违规。
 *   2) 规则原为路由内硬编码常量，不可配置。现改为从 sys_calc_param 读取
 *      （迁移 074），与录入端共用 src/lib/category-validation.ts 这一份真相源。
 *   3) 查询异常不再静默吞掉，改为返回明确错误。
 */

interface RuleViolation {
  table: string;
  field: string;
  current_value: string;
  expected_pattern: string;
  record_id: number;
  record_name: string;
  severity: 'error' | 'warning';
  message: string;
}

const ALL_TYPES: CategoryType[] = ['material', 'warehouse'];

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const categoryType = searchParams.get('type') || 'all';

  const violations: RuleViolation[] = [];

  const typesToCheck: CategoryType[] =
    categoryType === 'all'
      ? ALL_TYPES
      : ALL_TYPES.filter((t) => t === (categoryType as CategoryType));

  if (typesToCheck.length === 0) {
    return errorResponse(
      `不支持的分类类型"${categoryType}"，可选值：material / warehouse / all`,
      400
    );
  }

  const rulesUsed: Record<string, unknown> = {};

  for (const type of typesToCheck) {
    const meta = CATEGORY_TABLE_META[type];
    const rules = await getCategoryRules(type);
    rulesUsed[type] = {
      code_pattern: rules.codePattern,
      code_pattern_desc: rules.codePatternDesc,
      max_depth: rules.maxDepth,
      status_values: rules.statusValues,
      enforce_on_create: rules.enforceOnCreate,
      enforce_on_update: rules.enforceOnUpdate,
    };

    // 仅在该表确有 parent_id 列时才查询它（仓库分类表为单层，无此列）
    const selectCols = [
      'id',
      `${meta.codeColumn} AS code`,
      `${meta.nameColumn} AS name`,
      'status',
      ...(meta.hasParent ? ['parent_id'] : []),
    ].join(', ');

    let rows: DbRow[];
    try {
      rows = (await query(
        `SELECT ${selectCols} FROM ${escapeId(meta.table)} WHERE deleted = 0`
      )) as DbRow[];
    } catch (e) {
      // 不再静默吞错：查询失败意味着 schema 与代码不一致，属于必须暴露的问题
      return errorResponse(
        `${meta.label}规则校验失败（表 ${meta.table} 查询异常）：${(e as Error).message}`,
        500
      );
    }

    const codeRegex = safeRegExp(rules.codePattern);
    if (!codeRegex) {
      violations.push({
        table: meta.table,
        field: 'code_pattern',
        current_value: rules.codePattern,
        expected_pattern: ts('k_r5uw0d'),
        record_id: 0,
        record_name: '',
        severity: 'error',
        message: `系统设置中的${meta.label}编码规则不是合法正则，请在计算参数中修正 category.${type}.code_pattern`,
      });
    }

    for (const row of rows) {
      const code = row.code ?? '';
      if (codeRegex && !codeRegex.test(code)) {
        violations.push({
          table: meta.table,
          field: meta.codeColumn,
          current_value: code,
          expected_pattern: rules.codePatternDesc,
          record_id: Number(row.id),
          record_name: row.name,
          severity: 'error',
          message: `编码"${code}"不符合规则${rules.codePatternDesc}`,
        });
      }

      if (!rules.statusValues.includes(Number(row.status))) {
        violations.push({
          table: meta.table,
          field: 'status',
          current_value: String(row.status),
          expected_pattern: rules.statusValues.join('/'),
          record_id: Number(row.id),
          record_name: row.name,
          severity: 'error',
          message: `状态值${row.status}不在合法范围${rules.statusValues.join('/')}内`,
        });
      }
    }

    // 层级深度 / 循环引用检查（仅有 parent_id 的分类表）
    if (meta.hasParent && rules.maxDepth > 0) {
      const parentMap = new Map<number, number>();
      for (const row of rows) {
        if (row.parent_id) parentMap.set(Number(row.id), Number(row.parent_id));
      }

      const getDepth = (id: number): number => {
        const visited = new Set<number>();
        let depth = 1;
        let cursor: number | undefined = id;
        while (cursor !== undefined) {
          if (visited.has(cursor)) return -1;
          visited.add(cursor);
          const parent = parentMap.get(cursor);
          if (parent === undefined) break;
          depth++;
          cursor = parent;
        }
        return depth;
      };

      for (const row of rows) {
        if (!row.parent_id) continue;
        const depth = getDepth(Number(row.id));
        if (depth === -1) {
          violations.push({
            table: meta.table,
            field: 'parent_id',
            current_value: ts('k_fvy3k3'),
            expected_pattern: ts('k_z9yhol'),
            record_id: Number(row.id),
            record_name: row.name,
            severity: 'error',
            message: ts('k_3uvmos'),
          });
        } else if (depth > rules.maxDepth) {
          violations.push({
            table: meta.table,
            field: 'parent_id',
            current_value: `层级深度${depth}`,
            expected_pattern: `最大${rules.maxDepth}层`,
            record_id: Number(row.id),
            record_name: row.name,
            severity: 'warning',
            message: `分类层级深度${depth}超过最大限制${rules.maxDepth}`,
          });
        }
      }
    }
  }

  return successResponse({
    total: violations.length,
    errors: violations.filter((v) => v.severity === 'error').length,
    warnings: violations.filter((v) => v.severity === 'warning').length,
    violations,
    rules: rulesUsed,
  });
});
