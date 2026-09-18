/**
 * 敏感配置键识别与脱敏 —— BUG-SET-006
 *
 * 背景：
 *   \`GET /api/settings/system\` 一次性返回 sys_config 全量 127 条，
 *   其中 \`sys.default.password\` 以**明文**返回给任何有权限的调用方；
 *   审批流水 \`sys_config_change_log.old_value\` 同样把现值明文落库。
 *
 * 脱敏规则（刻意区分「凭证」与「策略」）：
 *   只看键名的**最后一段**。最后一段是凭证词（password / secret / token / key…）→ 脱敏；
 *   是策略词（password_min_length / password_expire_days / force_change_password）→ 不脱敏。
 *   这样既能覆盖 \`sys.default.password\` / \`smtp.password\` / \`api.secret\`，
 *   又不会把「密码最小长度」这类需要界面展示的策略值一起打码。
 */

/** 键名最后一段命中即视为凭证 */
const SECRET_LAST_SEGMENTS = new Set([
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'accesskey',
  'access_key',
  'secretkey',
  'secret_key',
  'privatekey',
  'private_key',
  'credential',
  'credentials',
  'salt',
  'passphrase',
]);

/**
 * 显式登记的凭证键（防漏网）。
 * 与 SECRET_LAST_SEGMENTS 取「或」关系。
 */
const SECRET_CONFIG_KEYS = new Set<string>([
  'sys.default.password',
  // 预留：后续接入邮件/短信/对象存储时在此登记
  // 'notify.smtp.password',
  // 'notify.sms.token',
]);

/** 脱敏占位符（固定宽度，不泄露原值长度） */
export const MASKED_VALUE = '******';

/** 判断某个 config_key 是否为凭证类键 */
export function isSecretConfigKey(configKey: unknown): boolean {
  const key = String(configKey ?? '')
    .trim()
    .toLowerCase();
  if (!key) return false;
  if (SECRET_CONFIG_KEYS.has(key)) return true;
  const last = key.split('.').pop() ?? key;
  return SECRET_LAST_SEGMENTS.has(last);
}

/** 对单个值脱敏；空值保持原样（便于前端区分「未设置」） */
export function maskSecretValue(value: unknown): string {
  const v = value === null || value === undefined ? '' : String(value);
  return v === '' ? '' : MASKED_VALUE;
}

/**
 * 判断提交上来的值是否为「未修改的掩码」。
 * 前端拿到 ****** 后原样回传时必须跳过，否则会把掩码写进库。
 */
export function isUnchangedMask(value: unknown): boolean {
  return String(value ?? '') === MASKED_VALUE;
}

/** 对一行配置做脱敏（返回浅拷贝） */
export function maskConfigRow<T extends Record<string, unknown>>(row: T): T {
  if (!row || typeof row !== 'object') return row;
  const key = row.config_key;
  if (!isSecretConfigKey(key)) return row;
  return { ...row, config_value: maskSecretValue(row.config_value) };
}
