import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction, SqlValue } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { clearConfigCache } from '@/lib/global-config';
import {
  isSecretConfigKey,
  isUnchangedMask,
  maskConfigRow,
  maskSecretValue,
} from '@/lib/config-secret';
import type { DbRow } from '@/types/db';


// 说明：默认配置种子（DEFAULT_CONFIGS / 旧键迁移 / 127 键 upsert / 补列 DDL）已移出本路由，
// 见 src/lib/system-config-seed.ts 与 database/migrations/079_settings_config_schema.sql。
// 读接口不再承担写副作用（BUG-SET-002）。

/**
 * GET /api/settings/system —— **纯读**。
 *
 * 修复 BUG-SET-002：此前入口第一行就是 `await initDefaultConfigs()`，
 * 让一个读接口在每次请求里：SHOW COLUMNS + 8 次 ALTER 尝试 + 10 条旧键 UPDATE +
 * 127 次「SELECT 后 INSERT/UPDATE」。现在种子改由启动任务与 CLI 承担。
 *
 * 修复 BUG-SET-006 ②：凭证类键（如 sys.default.password）在响应中脱敏，
 * 由 config-secret 统一判定「凭证」与「策略」（password_min_length 不打码）。
 */
export const GET = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  let where = 'WHERE status = 1';
  const params: SqlValue[] = [];

  if (category && category !== 'all') {
    where += ' AND category = ?';
    params.push(category);
  }

  const rawRows = await query(
    `SELECT id, config_name, config_key, config_value, config_type_enum as config_type, 
            category, display_name, description, sort_order, 
            is_required, approval_required, status 
     FROM sys_config ${where} ORDER BY sort_order`,
    params
  );
  const rows = (rawRows as DbRow[]).map(maskConfigRow);

  // 提取唯一的分类，并按最小sort_order排序
  const categoryOrder = new Map<string, number>();
  rows.forEach((row: DbRow) => {
    if (!categoryOrder.has(row.category)) {
      categoryOrder.set(row.category, row.sort_order);
    }
  });

  const categories: string[] = [];
  const grouped: Record<string, unknown[]> = {};

  // 按分类的最小sort_order排序
  const sortedCategories = Array.from(categoryOrder.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([cat]) => cat);

  rows.forEach((row: DbRow) => {
    if (!categories.includes(row.category)) {
      categories.push(row.category);
    }
    if (!grouped[row.category]) {
      grouped[row.category] = [];
    }
    grouped[row.category].push({
      ...row,
      is_required: Boolean(row.is_required),
      approval_required: Boolean(row.approval_required),
    });
  });

  return successResponse({
    list: rows,
    categories: sortedCategories,
    grouped,
  });
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { configs, updates, operator_id, remark } = body;

    const configData = configs || updates;

    if (!configData || !Array.isArray(configData) || configData.length === 0) {
      return errorResponse(ts('k_1lm5lx5'), 400, 400);
    }

    // 规范化提交项：
    //   ① 前端拿到脱敏值 ****** 后原样回传时必须跳过，否则会把掩码写进库（BUG-SET-006 ② 的配套）；
    //   ② 值缺失时不得写字符串 "undefined"（BUG-SET-009）；
    //   ③ config_key 必须存在，避免 UPDATE 命中 0 行却报成功。
    interface NormalizedConfig {
      config_key: string;
      value: string;
    }
    const normalized: NormalizedConfig[] = [];
    for (const config of configData as DbRow[]) {
      const key = String(config?.config_key ?? '').trim();
      if (!key) continue;
      if (config?.config_value === undefined || config?.config_value === null) continue;
      if (isUnchangedMask(config.config_value)) continue; // 未修改的脱敏值，跳过
      normalized.push({ config_key: key, value: String(config.config_value) });
    }

    if (normalized.length === 0) {
      return errorResponse(ts('k_1lm5lx5'), 400, 400);
    }

    const requireApproval = await queryOne(
      `SELECT config_value FROM sys_config WHERE config_key = 'require_approval_for_config_change'`
    );

    const needApproval = requireApproval?.config_value === 'true';

    if (needApproval) {
      // 变更记录表由迁移 079 正式创建（原先在这里用翻译词条当 DDL 懒建表，已移除）。
      // 审批件的 old_value 对凭证键脱敏：流水用于追溯"谁改了什么"，不应复制现值口令。
      for (const item of normalized) {
        const current = await queryOne(`SELECT config_value FROM sys_config WHERE config_key = ?`, [
          item.config_key,
        ]);

        if (!current) continue;

        await execute(
          `INSERT INTO sys_config_change_log (
          config_key, old_value, new_value, operator_id, remark, status
        ) VALUES (?, ?, ?, ?, ?, 0)`,
          [
            item.config_key,
            isSecretConfigKey(item.config_key)
              ? maskSecretValue(current.config_value)
              : String(current.config_value ?? ''),
            item.value,
            operator_id || 1,
            remark || null,
          ]
        );
      }

      return successResponse(null, ts('k_wl3nh7'));
    } else {
      // 保存放入同一事务：此前逐条 UPDATE 无事务，中途失败会留下"改了一半"的配置
      await transaction(async (conn) => {
        for (const item of normalized) {
          await conn.execute(
            `UPDATE sys_config SET config_value = ?, update_time = NOW() WHERE config_key = ?`,
            [item.value, item.config_key]
          );
        }
      });

      clearConfigCache();

      return successResponse(null, ts('k_xmc3sn'));
    }
  },
  { logTitle: '保存系统配置' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { log_id, action, approver_id } = body;

    if (!log_id) {
      return errorResponse(ts('k_km5v1e'), 400, 400);
    }

    const log = await queryOne(`SELECT * FROM sys_config_change_log WHERE id = ?`, [log_id]);

    if (!log) {
      return commonErrors.notFound(ts('k_a50pct'));
    }

    if (log.status !== 0) {
      return errorResponse(ts('k_19uwe71'), 400, 400);
    }

    switch (action) {
      case 'approve':
        // 审批件里的 new_value 已是真实待生效值（POST 只对 old_value 脱敏）；
        // 若历史数据里落进了掩码，必须拒绝，避免把 ****** 当成口令写入。
        if (isSecretConfigKey(log.config_key) && isUnchangedMask(log.new_value)) {
          return errorResponse(ts('k_4ty90w'), 400, 400);
        }

        // 先落配置、成功后再标记审批通过：避免"标记成功但配置没生效"（BUG-SET-005 的同类问题）
        await transaction(async (conn) => {
          await conn.execute(
            `UPDATE sys_config SET config_value = ?, update_time = NOW() WHERE config_key = ?`,
            [log.new_value, log.config_key]
          );

          await conn.execute(
            `UPDATE sys_config_change_log SET status = 1, approver_id = ?, approve_time = NOW() WHERE id = ?`,
            [approver_id || 1, log_id]
          );
        });

        clearConfigCache();

        return successResponse(null, ts('k_3agana'));

      case 'reject':
        await execute(
          `UPDATE sys_config_change_log SET status = 2, approver_id = ?, approve_time = NOW() WHERE id = ?`,
          [approver_id || 1, log_id]
        );

        return successResponse(null, ts('k_1nb7aqp'));

      default:
        return errorResponse(ts('k_4ty90w'), 400, 400);
    }
  },
  { logTitle: '审批配置变更' }
);
