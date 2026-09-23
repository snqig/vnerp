import { query } from '@/lib/db';

/**
 * 销售订单默认税率（小数形式）
 *
 * 数据源：sys_config.config_key = 'finance.tax_rate'（百分数，如 '13'）
 * Fallback：0.13（13%）
 *
 * 读取策略：实时查库，不依赖 global-config 缓存——
 * 销售订单创建是低频操作，直接查 sys_config 最可靠。
 * 税率配置修改后立即生效，无需重启服务。
 */
export async function getDefaultTaxRate(): Promise<number> {
  try {
    const rows = await query<{ config_value: string }>(
      `SELECT config_value FROM sys_config WHERE config_key = ? AND deleted = 0 LIMIT 1`,
      ['finance.tax_rate']
    );
    const raw = rows[0]?.config_value;
    if (!raw) return 0.13;
    const pct = Number(raw);
    if (!Number.isFinite(pct) || pct < 0) return 0.13;
    // sys_config 存的是百分数（'13' → 13% → 0.13）
    return pct / 100;
  } catch {
    return 0.13;
  }
}
