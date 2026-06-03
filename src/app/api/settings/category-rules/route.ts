import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandler, successResponse, errorResponse } from '@/lib/api-response';

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

interface CategoryRuleConfig {
  code_pattern: string;
  code_pattern_desc: string;
  max_depth: number;
  status_values: number[];
  status_labels: Record<number, string>;
}

const CATEGORY_RULES: Record<string, CategoryRuleConfig> = {
  warehouse: {
    code_pattern: '^WH-CAT-\\d{3,}$',
    code_pattern_desc: 'WH-CAT-XXX（3位以上数字）',
    max_depth: 3,
    status_values: [0, 1],
    status_labels: { 0: '禁用', 1: '启用' },
  },
  material: {
    code_pattern: '^MAT-CAT-\\d{3,}$',
    code_pattern_desc: 'MAT-CAT-XXX（3位以上数字）',
    max_depth: 4,
    status_values: [0, 1],
    status_labels: { 0: '禁用', 1: '启用' },
  },
};

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const categoryType = searchParams.get('type') || 'all';
  const autoFix = searchParams.get('autoFix') === 'true';

  const violations: RuleViolation[] = [];

  const typesToCheck = categoryType === 'all'
    ? Object.keys(CATEGORY_RULES)
    : [categoryType].filter(t => t in CATEGORY_RULES);

  for (const type of typesToCheck) {
    const rules = CATEGORY_RULES[type];
    const tableName = type === 'warehouse' ? 'sys_warehouse_category' : 'inv_material_category';

    try {
      const rows = await query(
        `SELECT id, code, name, status, parent_id FROM ${tableName} WHERE deleted = 0`
      ) as any[];

      const codeRegex = new RegExp(rules.code_pattern);

      for (const row of rows) {
        if (!codeRegex.test(row.code || '')) {
          violations.push({
            table: tableName,
            field: 'code',
            current_value: row.code || '',
            expected_pattern: rules.code_pattern_desc,
            record_id: row.id,
            record_name: row.name,
            severity: 'error',
            message: `编码"${row.code}"不符合规则${rules.code_pattern_desc}`,
          });
        }

        if (!rules.status_values.includes(row.status)) {
          violations.push({
            table: tableName,
            field: 'status',
            current_value: String(row.status),
            expected_pattern: rules.status_values.map(v => rules.status_labels[v]).join('/'),
            record_id: row.id,
            record_name: row.name,
            severity: 'error',
            message: `状态值${row.status}不在合法范围${rules.status_values.join('/')}内`,
          });
        }
      }

      if (type === 'material' && rules.max_depth > 0) {
        const parentMap = new Map<number, number>();
        for (const row of rows) {
          if (row.parent_id) {
            parentMap.set(row.id, row.parent_id);
          }
        }

        const getDepth = (id: number, visited: Set<number> = new Set()): number => {
          if (visited.has(id)) return -1;
          visited.add(id);
          const parentId = parentMap.get(id);
          if (!parentId) return 1;
          const parentDepth = getDepth(parentId, visited);
          return parentDepth === -1 ? -1 : parentDepth + 1;
        };

        for (const row of rows) {
          if (row.parent_id) {
            const depth = getDepth(row.id);
            if (depth > rules.max_depth) {
              violations.push({
                table: tableName,
                field: 'parent_id',
                current_value: `层级深度${depth}`,
                expected_pattern: `最大${rules.max_depth}层`,
                record_id: row.id,
                record_name: row.name,
                severity: 'warning',
                message: `分类层级深度${depth}超过最大限制${rules.max_depth}`,
              });
            } else if (depth === -1) {
              violations.push({
                table: tableName,
                field: 'parent_id',
                current_value: '循环引用',
                expected_pattern: '无循环引用',
                record_id: row.id,
                record_name: row.name,
                severity: 'error',
                message: `分类存在循环引用`,
              });
            }
          }
        }
      }
    } catch {
      violations.push({
        table: tableName,
        field: 'table',
        current_value: '',
        expected_pattern: '表存在',
        record_id: 0,
        record_name: '',
        severity: 'warning',
        message: `表${tableName}不存在或查询失败`,
      });
    }
  }

  return successResponse({
    total: violations.length,
    errors: violations.filter(v => v.severity === 'error').length,
    warnings: violations.filter(v => v.severity === 'warning').length,
    violations,
    rules: CATEGORY_RULES,
  });
}, '分类规则校验失败');
