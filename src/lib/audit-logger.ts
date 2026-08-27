/**
 * VNERP 审计日志核心模块
 * 功能：自动记录操作日志、数据变更、库存流水、财务流水
 * 原则：所有操作留痕，所有修改留底，所有单据不可删，所有变动有据可查
 */

import { NextRequest } from 'next/server';
import { AsyncLocalStorage } from 'node:async_hooks';
import { query, execute, type SqlValue } from '@/lib/db';
import { maskSensitiveData } from '@/lib/logger';

// ============================================================
// 类型定义
// ============================================================

export interface AuditLogEntry {
  module: string;
  type: string;
  title?: string;
  content?: string;
  beforeData?: unknown;
  afterData?: unknown;
  requestUrl?: string;
  requestMethod?: string;
  requestParam?: unknown;
  responseResult?: unknown;
  status?: number;
  errorMsg?: string;
  durationMs?: number;
}

export interface StockFlowEntry {
  flowNo: string;
  businessType: string;
  sourceType?: string;
  sourceNo?: string;
  sourceId?: number;
  warehouseId: number;
  warehouseName?: string;
  materialId?: number;
  materialCode?: string;
  materialName?: string;
  productId?: number;
  productCode?: string;
  productName?: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  unitPrice?: number;
  totalAmount?: number;
  batchNo?: string;
  createBy?: string;
  createById?: number;
  remark?: string;
}

export interface FinanceFlowEntry {
  flowNo: string;
  type: string;
  subType?: string;
  sourceType?: string;
  sourceNo?: string;
  sourceId?: number;
  customerId?: number;
  customerName?: string;
  supplierId?: number;
  supplierName?: string;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  currency?: string;
  accountCode?: string;
  accountName?: string;
  voucherNo?: string;
  period?: string;
  createBy?: string;
  createById?: number;
  remark?: string;
}

export interface DataChangeEntry {
  tableName: string;
  recordId: number;
  recordNo?: string;
  fieldName: string;
  fieldLabel?: string;
  oldValue?: string;
  newValue?: string;
  changeType?: string;
  module?: string;
  username?: string;
  userId?: number;
  ip?: string;
}

export interface DocumentCancelEntry {
  tableName: string;
  recordId: number;
  recordNo: string;
  documentType: string;
  cancelReason: string;
  originalStatus?: string;
  cancelStatus?: string;
  cancelBy?: string;
  cancelById?: number;
  snapshotData?: Record<string, unknown>;
}

// ============================================================
// 当前用户上下文（在API路由中设置）
// 使用 AsyncLocalStorage 实现请求级隔离，避免并发竞态
// ============================================================

interface AuditUserContext {
  userId?: number;
  username?: string;
  ip?: string;
  userAgent?: string;
}

const auditContextStorage = new AsyncLocalStorage<AuditUserContext>();

export function setAuditUserContext(
  userId?: number,
  username?: string,
  ip?: string,
  userAgent?: string
) {
  auditContextStorage.enterWith({ userId, username, ip, userAgent });
}

export function clearAuditUserContext() {
  auditContextStorage.enterWith({});
}

export function getAuditUserContext(): AuditUserContext {
  return { ...auditContextStorage.getStore() };
}

// ============================================================
// 辅助函数
// ============================================================

function getClientIp(request?: NextRequest): string {
  if (!request) return getAuditUserContext().ip || 'unknown';

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

function getUserAgent(request?: NextRequest): string {
  if (!request) return getAuditUserContext().userAgent || 'unknown';
  return request.headers.get('user-agent') || 'unknown';
}

function safeJsonStringify(data: unknown): string | null {
  if (data === null || data === undefined) return null;
  try {
    return JSON.stringify(maskSensitiveData(data));
  } catch (error) {
    console.error('[audit-logger] safeJsonStringify failed:', error);
    return null;
  }
}

function generateFlowNo(prefix: string): string {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${prefix}${dateStr}${random}`;
}

// ============================================================
// 核心审计日志记录函数
// ============================================================

/**
 * 记录操作日志（核心）
 */
export async function logOperation(entry: AuditLogEntry, request?: NextRequest): Promise<void> {
  try {
    const user = getAuditUserContext();
    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);

    await execute(
      `INSERT INTO sys_operate_log (
        module, type, title, username, user_id, content,
        before_data, after_data, ip, user_agent,
        request_url, request_method, request_param, response_result,
        status, error_msg, duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.module,
        entry.type,
        entry.title || '',
        user.username || 'system',
        user.userId || 0,
        entry.content || '',
        safeJsonStringify(entry.beforeData),
        safeJsonStringify(entry.afterData),
        ip,
        userAgent,
        entry.requestUrl || '',
        entry.requestMethod || '',
        safeJsonStringify(entry.requestParam),
        safeJsonStringify(entry.responseResult),
        entry.status ?? 1,
        entry.errorMsg || '',
        entry.durationMs || 0,
      ]
    );
  } catch (error) {
    console.error('[audit-logger] logging failed:', error);
  }
}

/**
 * 记录登录日志
 */
export async function logLogin(
  username: string,
  userId: number,
  status: number,
  loginType: number = 1,
  errorMsg?: string,
  request?: NextRequest
): Promise<void> {
  try {
    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);

    // 解析浏览器和操作系统
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Unknown';

    if (userAgent && userAgent !== 'unknown') {
      if (userAgent.includes('Chrome')) browser = 'Chrome';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Safari')) browser = 'Safari';
      else if (userAgent.includes('Edge')) browser = 'Edge';

      if (userAgent.includes('Windows')) os = 'Windows';
      else if (userAgent.includes('Mac')) os = 'macOS';
      else if (userAgent.includes('Linux')) os = 'Linux';

      if (userAgent.includes('Mobile')) device = 'Mobile';
      else device = 'Desktop';
    }

    await execute(
      `INSERT INTO sys_login_log (
        username, user_id, login_type, status, ip, 
        browser, os, device, error_msg
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, userId, loginType, status, ip, browser, os, device, errorMsg || '']
    );

    // 如果登录失败，检查是否需要记录异常
    if (status === 0) {
      await checkAbnormalLogin(username, ip, errorMsg || '登录失败');
    }
  } catch (error) {
    console.error('[audit-logger] logging failed:', error);
  }
}

/**
 * 检查异常登录行为
 */
async function checkAbnormalLogin(
  username: string,
  ip: string,
  description: string
): Promise<void> {
  try {
    // 检查最近30分钟内该用户的失败次数
    const rows = await query<{ fail_count: number }>(
      `SELECT COUNT(*) as fail_count
       FROM sys_login_log
       WHERE username = ? AND status = 0
       AND create_time > DATE_SUB(NOW(), INTERVAL 30 MINUTE)`,
      [username]
    );

    const failCount = rows[0]?.fail_count || 0;

    if (failCount >= 5) {
      // 记录异常登录
      await execute(
        `INSERT INTO login_abnormal (
          username, ip, abnormal_type, risk_level, description
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          username,
          ip,
          'password_error',
          failCount >= 10 ? 3 : 2,
          `30分钟内密码错误${failCount}次: ${description}`,
        ]
      );
    }

    // 检查异地登录（简化版：与前一次成功登录IP对比）
    const lastLogin = await query<{ ip: string }>(
      `SELECT ip FROM sys_login_log
       WHERE username = ? AND status = 1
       ORDER BY create_time DESC LIMIT 1`,
      [username]
    );

    if (lastLogin.length > 0 && lastLogin[0].ip !== ip) {
      await execute(
        `INSERT INTO login_abnormal (
          username, ip, abnormal_type, risk_level, description
        ) VALUES (?, ?, ?, ?, ?)`,
        [username, ip, 'location_change', 1, `异地登录: 上次IP ${lastLogin[0].ip}, 本次IP ${ip}`]
      );
    }
  } catch (error) {
    console.error('[audit-logger] logging failed:', error);
  }
}

/**
 * 记录库存流水
 */
export async function logStockFlow(entry: StockFlowEntry): Promise<void> {
  try {
    const flowNo = entry.flowNo || generateFlowNo('SF');
    const user = getAuditUserContext();

    await execute(
      `INSERT INTO stock_flow (
        flow_no, business_type, source_type, source_no, source_id,
        warehouse_id, warehouse_name, material_id, material_code, material_name,
        product_id, product_code, product_name, quantity,
        stock_before, stock_after, unit_price, total_amount,
        batch_no, create_by, create_by_id, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flowNo,
        entry.businessType,
        entry.sourceType || '',
        entry.sourceNo || '',
        entry.sourceId || null,
        entry.warehouseId,
        entry.warehouseName || '',
        entry.materialId || null,
        entry.materialCode || '',
        entry.materialName || '',
        entry.productId || null,
        entry.productCode || '',
        entry.productName || '',
        entry.quantity,
        entry.stockBefore,
        entry.stockAfter,
        entry.unitPrice || 0,
        entry.totalAmount || 0,
        entry.batchNo || '',
        entry.createBy || user.username || 'system',
        entry.createById || user.userId || 0,
        entry.remark || '',
      ]
    );
  } catch (error) {
    console.error('[audit-logger] logging failed:', error);
  }
}

/**
 * 记录财务流水
 */
export async function logFinanceFlow(entry: FinanceFlowEntry): Promise<void> {
  try {
    const flowNo = entry.flowNo || generateFlowNo('FF');
    const user = getAuditUserContext();
    const period = entry.period || new Date().toISOString().slice(0, 7);

    await execute(
      `INSERT INTO finance_flow (
        flow_no, type, sub_type, source_type, source_no, source_id,
        customer_id, customer_name, supplier_id, supplier_name,
        amount, balance_before, balance_after, currency,
        account_code, account_name, voucher_no, period,
        create_by, create_by_id, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flowNo,
        entry.type,
        entry.subType || '',
        entry.sourceType || '',
        entry.sourceNo || '',
        entry.sourceId || null,
        entry.customerId || null,
        entry.customerName || '',
        entry.supplierId || null,
        entry.supplierName || '',
        entry.amount,
        entry.balanceBefore || 0,
        entry.balanceAfter || 0,
        entry.currency || 'CNY',
        entry.accountCode || '',
        entry.accountName || '',
        entry.voucherNo || '',
        period,
        entry.createBy || user.username || 'system',
        entry.createById || user.userId || 0,
        entry.remark || '',
      ]
    );
  } catch (error) {
    console.error('[audit-logger] logging failed:', error);
  }
}

/**
 * 记录数据变更日志
 */
export async function logDataChange(entry: DataChangeEntry): Promise<void> {
  try {
    const user = getAuditUserContext();

    await execute(
      `INSERT INTO data_change_log (
        table_name, record_id, record_no, field_name, field_label,
        old_value, new_value, change_type, module,
        username, user_id, ip
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.tableName,
        entry.recordId,
        entry.recordNo || '',
        entry.fieldName,
        entry.fieldLabel || entry.fieldName,
        entry.oldValue || '',
        entry.newValue || '',
        entry.changeType || 'update',
        entry.module || '',
        entry.username || user.username || 'system',
        entry.userId || user.userId || 0,
        entry.ip || user.ip || '',
      ]
    );
  } catch (error) {
    console.error('[audit-logger] logging failed:', error);
  }
}

/**
 * 记录单据作废
 */
export async function logDocumentCancel(entry: DocumentCancelEntry): Promise<void> {
  try {
    const user = getAuditUserContext();

    await execute(
      `INSERT INTO document_cancel_log (
        table_name, record_id, record_no, document_type,
        cancel_reason, original_status, cancel_status,
        cancel_by, cancel_by_id, snapshot_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.tableName,
        entry.recordId,
        entry.recordNo,
        entry.documentType,
        entry.cancelReason,
        entry.originalStatus || '',
        entry.cancelStatus || 'cancelled',
        entry.cancelBy || user.username || 'system',
        entry.cancelById || user.userId || 0,
        safeJsonStringify(entry.snapshotData),
      ]
    );

    // 同时记录操作日志
    await logOperation({
      module: entry.documentType,
      type: '作废',
      title: entry.recordNo,
      content: `单据作废: ${entry.recordNo}, 原因: ${entry.cancelReason}`,
      beforeData: entry.snapshotData,
      status: 1,
    });
  } catch (error) {
    console.error('[audit-logger] logging failed:', error);
  }
}

// ============================================================
// 便捷方法：批量记录数据变更
// ============================================================

/**
 * 比较并记录对象变更
 * @param tableName 表名
 * @param recordId 记录ID
 * @param recordNo 单据编号
 * @param oldData 修改前数据
 * @param newData 修改后数据
 * @param module 模块名
 * @param fieldsMapping 字段映射 { fieldName: fieldLabel }
 */
export async function logObjectChanges(
  tableName: string,
  recordId: number,
  recordNo: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  module: string,
  fieldsMapping?: Record<string, string>
): Promise<void> {
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    const oldValue = oldData[key];
    const newValue = newData[key];

    // 只记录发生变化的字段
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      await logDataChange({
        tableName,
        recordId,
        recordNo,
        fieldName: key,
        fieldLabel: fieldsMapping?.[key] || key,
        oldValue: String(oldValue ?? ''),
        newValue: String(newValue ?? ''),
        changeType: 'update',
        module,
      });
    }
  }
}

// ============================================================
// 便捷方法：记录关键业务操作
// ============================================================

/**
 * 记录审核操作
 */
export async function logAuditAction(
  module: string,
  documentType: string,
  recordId: number,
  recordNo: string,
  action: '审核' | '反审',
  beforeStatus: string,
  afterStatus: string,
  request?: NextRequest
): Promise<void> {
  await logOperation(
    {
      module,
      type: action,
      title: recordNo,
      content: `${action} ${documentType}: ${recordNo}`,
      beforeData: { status: beforeStatus },
      afterData: { status: afterStatus },
      status: 1,
    },
    request
  );

  await logDataChange({
    tableName: documentType,
    recordId,
    recordNo,
    fieldName: 'status',
    fieldLabel: '状态',
    oldValue: beforeStatus,
    newValue: afterStatus,
    changeType: 'audit',
    module,
  });
}

/**
 * 记录库存变更（用于 inv_inventory_log 统一的库存同步）
 */
export async function logInventoryChange(params: {
  materialId: number;
  warehouseId: number;
  batchNo?: string;
  operationType: string;
  quantity: number;
  beforeQty: number;
  afterQty: number;
  businessType: string;
  businessNo: string;
  operatorId?: number;
}): Promise<void> {
  try {
    const user = getAuditUserContext();
    const operationTypeMap: Record<string, string> = {
      inbound: '入库',
      outbound: '出库',
      adjust: '盘点调整',
      transfer: '调拨',
      scrap: '报废',
      lock: '锁定',
      unlock: '解锁',
    };

    await logOperation({
      module: '库存管理',
      type: operationTypeMap[params.operationType] || '库存调整',
      title: params.businessNo,
      content: `${operationTypeMap[params.operationType] || '库存调整'}: 物料${params.materialId}, 数量${params.quantity}, 库存 ${params.beforeQty} → ${params.afterQty}`,
      beforeData: { quantity: params.beforeQty },
      afterData: { quantity: params.afterQty },
      status: 1,
    });

    // 同时记录库存流水
    await logStockFlow({
      flowNo: generateFlowNo('SF'),
      businessType: params.businessType,
      sourceNo: params.businessNo,
      warehouseId: params.warehouseId,
      materialId: params.materialId,
      quantity: params.quantity,
      stockBefore: params.beforeQty,
      stockAfter: params.afterQty,
      batchNo: params.batchNo,
      createBy: user.username || 'system',
      createById: user.userId || params.operatorId || 0,
      remark: `${params.operationType}: ${params.quantity}`,
    });
  } catch (error) {
    console.error('[audit-logger] logging failed:', error);
  }
}

/**
 * 记录删除操作（实际是逻辑删除/作废）
 */
export async function logDeleteAction(
  module: string,
  documentType: string,
  recordId: number,
  recordNo: string,
  snapshotData: Record<string, unknown>,
  request?: NextRequest
): Promise<void> {
  await logOperation(
    {
      module,
      type: '删除',
      title: recordNo,
      content: `删除 ${documentType}: ${recordNo}（逻辑删除）`,
      beforeData: snapshotData,
      afterData: { deleted: 1, status: 'deleted' },
      status: 1,
    },
    request
  );
}

// ============================================================
// 查询方法
// ============================================================

/**
 * 查询操作日志
 */
export async function queryOperateLogs(params: {
  module?: string;
  type?: string;
  username?: string;
  status?: number;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ list: Record<string, unknown>[]; total: number }> {
  const { module, type, username, status, startTime, endTime, page = 1, pageSize = 20 } = params;

  let where = 'WHERE 1=1';
  const queryParams: SqlValue[] = [];

  if (module) {
    where += ' AND module = ?';
    queryParams.push(module);
  }
  if (type) {
    where += ' AND type = ?';
    queryParams.push(type);
  }
  if (username) {
    where += ' AND username = ?';
    queryParams.push(username);
  }
  if (status !== undefined) {
    where += ' AND status = ?';
    queryParams.push(status);
  }
  if (startTime) {
    where += ' AND create_time >= ?';
    queryParams.push(startTime);
  }
  if (endTime) {
    where += ' AND create_time <= ?';
    queryParams.push(endTime);
  }

  const countRows = await query<{ total: number }>(
    `SELECT COUNT(*) as total FROM sys_operate_log ${where}`,
    queryParams
  );
  const total = countRows[0]?.total || 0;

  const list = await query<Record<string, unknown>>(
    `SELECT * FROM sys_operate_log ${where}
     ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [...queryParams, pageSize, (page - 1) * pageSize]
  );

  return { list, total };
}

/**
 * 查询登录日志
 */
export async function queryLoginLogs(params: {
  username?: string;
  status?: number;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ list: Record<string, unknown>[]; total: number }> {
  const { username, status, startTime, endTime, page = 1, pageSize = 20 } = params;

  let where = 'WHERE 1=1';
  const queryParams: SqlValue[] = [];

  if (username) {
    where += ' AND username = ?';
    queryParams.push(username);
  }
  if (status !== undefined) {
    where += ' AND status = ?';
    queryParams.push(status);
  }
  if (startTime) {
    where += ' AND create_time >= ?';
    queryParams.push(startTime);
  }
  if (endTime) {
    where += ' AND create_time <= ?';
    queryParams.push(endTime);
  }

  const countRows = await query<{ total: number }>(
    `SELECT COUNT(*) as total FROM sys_login_log ${where}`,
    queryParams
  );
  const total = countRows[0]?.total || 0;

  const list = await query<Record<string, unknown>>(
    `SELECT * FROM sys_login_log ${where}
     ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [...queryParams, pageSize, (page - 1) * pageSize]
  );

  return { list, total };
}

/**
 * 查询库存流水
 */
export async function queryStockFlows(params: {
  businessType?: string;
  warehouseId?: number;
  materialId?: number;
  productId?: number;
  sourceNo?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ list: Record<string, unknown>[]; total: number }> {
  const {
    businessType,
    warehouseId,
    materialId,
    productId,
    sourceNo,
    startTime,
    endTime,
    page = 1,
    pageSize = 20,
  } = params;

  let where = 'WHERE 1=1';
  const queryParams: SqlValue[] = [];

  if (businessType) {
    where += ' AND business_type = ?';
    queryParams.push(businessType);
  }
  if (warehouseId) {
    where += ' AND warehouse_id = ?';
    queryParams.push(warehouseId);
  }
  if (materialId) {
    where += ' AND material_id = ?';
    queryParams.push(materialId);
  }
  if (productId) {
    where += ' AND product_id = ?';
    queryParams.push(productId);
  }
  if (sourceNo) {
    where += ' AND source_no = ?';
    queryParams.push(sourceNo);
  }
  if (startTime) {
    where += ' AND create_time >= ?';
    queryParams.push(startTime);
  }
  if (endTime) {
    where += ' AND create_time <= ?';
    queryParams.push(endTime);
  }

  const countRows = await query<{ total: number }>(
    `SELECT COUNT(*) as total FROM stock_flow ${where}`,
    queryParams
  );
  const total = countRows[0]?.total || 0;

  const list = await query<Record<string, unknown>>(
    `SELECT * FROM stock_flow ${where}
     ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [...queryParams, pageSize, (page - 1) * pageSize]
  );

  return { list, total };
}

/**
 * 查询财务流水
 */
export async function queryFinanceFlows(params: {
  type?: string;
  customerId?: number;
  supplierId?: number;
  voucherNo?: string;
  period?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ list: Record<string, unknown>[]; total: number }> {
  const {
    type,
    customerId,
    supplierId,
    voucherNo,
    period,
    startTime,
    endTime,
    page = 1,
    pageSize = 20,
  } = params;

  let where = 'WHERE 1=1';
  const queryParams: SqlValue[] = [];

  if (type) {
    where += ' AND type = ?';
    queryParams.push(type);
  }
  if (customerId) {
    where += ' AND customer_id = ?';
    queryParams.push(customerId);
  }
  if (supplierId) {
    where += ' AND supplier_id = ?';
    queryParams.push(supplierId);
  }
  if (voucherNo) {
    where += ' AND voucher_no = ?';
    queryParams.push(voucherNo);
  }
  if (period) {
    where += ' AND period = ?';
    queryParams.push(period);
  }
  if (startTime) {
    where += ' AND create_time >= ?';
    queryParams.push(startTime);
  }
  if (endTime) {
    where += ' AND create_time <= ?';
    queryParams.push(endTime);
  }

  const countRows = await query<{ total: number }>(
    `SELECT COUNT(*) as total FROM finance_flow ${where}`,
    queryParams
  );
  const total = countRows[0]?.total || 0;

  const list = await query<Record<string, unknown>>(
    `SELECT * FROM finance_flow ${where}
     ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [...queryParams, pageSize, (page - 1) * pageSize]
  );

  return { list, total };
}

// ============================================================
// 导出审计报告
// ============================================================

/**
 * 生成审计报告数据
 */
export async function generateAuditReport(params: {
  startTime: string;
  endTime: string;
  module?: string;
}): Promise<{
  summary: {
    totalOperations: number;
    successCount: number;
    failCount: number;
    avgDuration: number;
    uniqueUsers: number;
  };
  moduleStats: Record<string, unknown>[];
  typeStats: Record<string, unknown>[];
  userStats: Record<string, unknown>[];
  dailyStats: Record<string, unknown>[];
}> {
  const { startTime, endTime, module } = params;

  let where = 'WHERE create_time >= ? AND create_time <= ?';
  const queryParams: SqlValue[] = [startTime, endTime];

  if (module) {
    where += ' AND module = ?';
    queryParams.push(module);
  }

  // 汇总统计
  const summaryRows = await query<{
    total_operations: number;
    success_count: number;
    fail_count: number;
    avg_duration: number;
    unique_users: number;
  }>(
    `SELECT
      COUNT(*) as total_operations,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as success_count,
      SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as fail_count,
      AVG(duration_ms) as avg_duration,
      COUNT(DISTINCT user_id) as unique_users
    FROM sys_operate_log ${where}`,
    queryParams
  );

  const summary = summaryRows[0];

  // 模块统计
  const moduleStats = await query<Record<string, unknown>>(
    `SELECT
      module,
      COUNT(*) as count,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as fail
    FROM sys_operate_log ${where}
    GROUP BY module
    ORDER BY count DESC`,
    queryParams
  );

  // 类型统计
  const typeStats = await query<Record<string, unknown>>(
    `SELECT
      type,
      COUNT(*) as count,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as fail
    FROM sys_operate_log ${where}
    GROUP BY type
    ORDER BY count DESC`,
    queryParams
  );

  // 用户统计
  const userStats = await query<Record<string, unknown>>(
    `SELECT
      username,
      COUNT(*) as count,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as fail
    FROM sys_operate_log ${where}
    GROUP BY username
    ORDER BY count DESC
    LIMIT 20`,
    queryParams
  );

  // 每日统计
  const dailyStats = await query<Record<string, unknown>>(
    `SELECT
      DATE(create_time) as date,
      COUNT(*) as count,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as fail
    FROM sys_operate_log ${where}
    GROUP BY DATE(create_time)
    ORDER BY date`,
    queryParams
  );

  return {
    summary: {
      totalOperations: summary.total_operations || 0,
      successCount: summary.success_count || 0,
      failCount: summary.fail_count || 0,
      avgDuration: Math.round(summary.avg_duration || 0),
      uniqueUsers: summary.unique_users || 0,
    },
    moduleStats,
    typeStats,
    userStats,
    dailyStats,
  };
}
