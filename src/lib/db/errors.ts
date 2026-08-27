/**
 * 数据库唯一约束冲突识别与转译工具
 *
 * 适配 mysql2 抛出的错误对象（MySQL 唯一键冲突错误码 ER_DUP_ENTRY / 1062）。
 * 用于把底层数据库原始报错转换为可读的中文业务提示，避免向客户端泄露
 * SQL / 表结构等敏感信息，同时让重复提交返回友好的业务冲突而非 500。
 *
 * 典型使用位置：
 *   - src/lib/error-handling.ts 的 handleError（API 统一错误响应）
 *   - src/lib/api-response.ts 的 withErrorHandler（公共 API 响应包装）
 *   - 各核心创建服务的 try-catch 前置查重兜底
 */
import type { PoolConnection, ResultSetHeader } from 'mysql2/promise';

/** MySQL 唯一键冲突错误码 */
const ER_DUP_ENTRY = 'ER_DUP_ENTRY';
const ER_DUP_ENTRY_ERRNO = 1062;

interface MysqlLikeError {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
}

/**
 * 判断是否为 MySQL 唯一约束冲突（ER_DUP_ENTRY / 1062）。
 *
 * ⚠️ 注意：此处只识别 ER_DUP_ENTRY（重复键），不得将整个 sqlState=23000
 * （完整性约束违例）类都判为唯一冲突。23000 还包含：
 *   - ER_NON_UNIQ_ERROR (1052)  列名歧义（如 JOIN 后 WHERE 未限定表的 deleted 列）
 *   - ER_NO_REFERENCED_ROW (1452) 外键不存在
 *   - ER_ROW_IS_REFERENCED (1451) 外键被引用无法删除
 *   - ER_BAD_NULL_ERROR (1048)   非空约束
 * 这些都不是"数据已存在"，若误判为唯一冲突会返回 409 且给出误导性文案，
 * 同时掩盖真实的 SQL 错误（如 1052 列歧义）。故仅以 ER_DUP_ENTRY 为准。
 */
export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as MysqlLikeError;
  return e.code === ER_DUP_ENTRY || e.errno === ER_DUP_ENTRY_ERRNO;
}

/**
 * 从 mysql2 错误中提取冲突的唯一索引名称。
 * 兼容两种消息格式：
 *   - Duplicate entry 'x' for key 'vnerpdacahng.uk_inbound_order_no'
 *   - Duplicate entry 'x' for key 'uk_inbound_order_no'
 */
export function extractUniqueIndexName(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const msg = (error as MysqlLikeError).sqlMessage;
  if (typeof msg !== 'string') return null;
  const m = msg.match(/for key '(?:`?[\w]+`?\.)?`?([^'`]+)`?'/i);
  return m ? m[1] : null;
}

/** 已知唯一索引名称 → 友好中文业务提示 */
const INDEX_MESSAGES: Record<string, string> = {
  // 本任务新增
  uk_inbound_order_no: '入库单编号已存在，请勿重复提交',
  uk_warehouse_material_batch: '同一仓库下该物料批次已存在',
  uk_inbound_order_line: '该入库单下存在重复明细行',
  uk_outbound_order_line: '该出库单下存在重复明细行',
  uk_exchange_rate_pair_date: '该币种对在同一生效日已存在汇率记录',
  uk_factory_card_no: '同工厂内工艺卡编号已存在',
  uk_factory_die_no: '同工厂内刀模编号已存在',
  // 历史已存在
  uk_material_code: '物料编码已存在',
  uk_supplier_code: '供应商编码已存在',
  uk_customer_code: '客户编码已存在',
  uk_currency_code: '币种编码已存在',
  uk_username: '用户名已存在',
  uk_role_code: '角色编码已存在',
  uk_dict_type: '字典类型编码已存在',
  uk_trans_no: '库存流水单号已存在',
  uk_qr_code: '该二维码已存在',
};

/**
 * 将唯一冲突错误映射为友好中文业务提示。
 * 命中已知索引名时返回精确提示；否则返回带索引名的通用提示。
 */
export function mapUniqueErrorToMessage(error: unknown): string {
  const idx = extractUniqueIndexName(error);
  if (idx && INDEX_MESSAGES[idx]) return INDEX_MESSAGES[idx];
  if (idx) return `数据已存在，违反唯一约束（${idx}）`;
  return '数据已存在，违反唯一约束';
}

/**
 * 数据库执行结果是否为唯一键冲突（用于手动执行 query 后判断 affectedRows/errno）。
 */
export function isDuplicateFromHeader(
  result: ResultSetHeader | unknown
): boolean {
  if (!result || typeof result !== 'object') return false;
  const r = result as { errno?: number; code?: string };
  return r.code === ER_DUP_ENTRY || r.errno === ER_DUP_ENTRY_ERRNO;
}

export type { PoolConnection };
