import { query } from '@/lib/db';

export const FIFO_MODE = { OFF: 'off', HINT: 'hint', FORCE: 'force' } as const;
export type FIFOMode = (typeof FIFO_MODE)[keyof typeof FIFO_MODE];

export const FIFO_CONFIG_KEY = 'fifo_control_mode';

export async function getFIFOMode(): Promise<FIFOMode> {
  try {
    const rows = await query(`SELECT config_value FROM sys_config WHERE config_key = ?`, [
      FIFO_CONFIG_KEY,
    ]);
    const mode = (rows as Loose[])?.[0]?.config_value || 'off';
    if (Object.values(FIFO_MODE).includes(mode)) return mode as FIFOMode;
    return 'off';
  } catch {
    return 'off';
  }
}

export async function setFIFOMode(mode: FIFOMode): Promise<void> {
  const { execute } = await import('@/lib/db');
  await execute(
    `INSERT INTO sys_config (config_key, config_value, description)
     VALUES (?, ?, 'FIFO出库管控模式: off=关闭, hint=提示, force=强制')
     ON DUPLICATE KEY UPDATE config_value = ?, update_time = NOW()`,
    [FIFO_CONFIG_KEY, mode, mode]
  );
}

export async function checkFIFOWidthMatch(materialId: number, width: number): Promise<boolean> {
  const rows = await query(
    `SELECT COUNT(*) as cnt FROM inv_inventory_batch
     WHERE material_id = ? AND width = ? AND available_qty > 0 AND deleted = 0 AND status = 1`,
    [materialId, width]
  );
  return ((rows as Loose[])?.[0]?.cnt || 0) > 0;
}
