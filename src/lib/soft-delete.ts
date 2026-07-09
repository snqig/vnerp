/**
 * VNERP 软删除与单据作废工具
 * 功能：实现单据不可物理删除，只能作废的企业级审计要求
 * 原则：数据一旦产生，永久留存
 */

import { escapeId } from 'mysql2';
import { query, execute, transaction } from '@/lib/db';
import { logDocumentCancel, logOperation } from '@/lib/audit-logger';
import { createSnapshot } from '@/lib/data-diff';

/**
 * Validate that a table or field name only contains safe identifier characters
 * (alphanumeric + underscore, starting with letter or underscore).
 * Prevents SQL injection through dynamic identifier interpolation.
 */
function assertValidIdentifier(name: string, label = 'table name'): void {
  if (!name || typeof name !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid ${label}: "${name}" contains invalid characters`);
  }
}

// ============================================================
// 类型定义
// ============================================================

export interface SoftDeleteOptions {
  tableName: string;
  recordId: number;
  recordNo: string;
  documentType: string;
  module: string;
  cancelReason: string;
  cancelledBy?: string;
  cancelledById?: number;
  originalStatus?: string;
}

export interface CancelResult {
  success: boolean;
  message: string;
  cancelLogId?: number;
}

// ============================================================
// 可作废的单据类型配置
// ============================================================

export const CANCELLABLE_DOCUMENTS: Record<
  string,
  {
    tableName: string;
    module: string;
    statusField: string;
    cancelStatus: string;
    noField: string;
    checkConditions?: string[];
  }
> = {
  purchase_order: {
    tableName: 'pur_purchase_order',
    module: '采购管理',
    statusField: 'status',
    cancelStatus: 'cancelled',
    noField: 'purchase_no',
    checkConditions: ['not_received'],
  },
  sales_order: {
    tableName: 'sal_order',
    module: '销售管理',
    statusField: 'status',
    cancelStatus: 'cancelled',
    noField: 'order_no',
    checkConditions: ['not_shipped'],
  },
  work_order: {
    tableName: 'prod_work_order',
    module: '生产管理',
    statusField: 'status',
    cancelStatus: 'cancelled',
    noField: 'work_order_no',
    checkConditions: ['not_started'],
  },
  inbound_order: {
    tableName: 'inv_inbound_order',
    module: '库存管理',
    statusField: 'status',
    cancelStatus: 'cancelled',
    noField: 'inbound_no',
    checkConditions: ['not_settled'],
  },
  outbound_order: {
    tableName: 'inv_outbound_order',
    module: '库存管理',
    statusField: 'status',
    cancelStatus: 'cancelled',
    noField: 'outbound_no',
    checkConditions: ['not_settled'],
  },
  stocktaking: {
    tableName: 'inv_stocktaking',
    module: '库存管理',
    statusField: 'status',
    cancelStatus: 'cancelled',
    noField: 'stocktaking_no',
  },
  transfer_order: {
    tableName: 'inv_transfer_order',
    module: '库存管理',
    statusField: 'status',
    cancelStatus: 'cancelled',
    noField: 'transfer_no',
    checkConditions: ['not_completed'],
  },
  voucher: {
    tableName: 'fin_voucher',
    module: '财务管理',
    statusField: 'status',
    cancelStatus: 'cancelled',
    noField: 'voucher_no',
    checkConditions: ['not_posted'],
  },
  receivable: {
    tableName: 'fin_receivable',
    module: '财务管理',
    statusField: 'status',
    cancelStatus: 'cancelled',
    noField: 'receivable_no',
    checkConditions: ['not_paid'],
  },
  payable: {
    tableName: 'fin_payable',
    module: '财务管理',
    statusField: 'status',
    cancelStatus: 'cancelled',
    noField: 'payable_no',
    checkConditions: ['not_paid'],
  },
};

// ============================================================
// 核心软删除/作废函数
// ============================================================

/**
 * 作废单据（企业标准：不可物理删除）
 */
export async function cancelDocument(options: SoftDeleteOptions): Promise<CancelResult> {
  const {
    tableName,
    recordId,
    recordNo,
    documentType,
    module,
    cancelReason,
    cancelledBy,
    cancelledById,
    originalStatus,
  } = options;

  try {
    assertValidIdentifier(tableName);

    // 1. 查询原始数据（用于快照）
    const rows: any = await query(`SELECT * FROM ${escapeId(tableName)} WHERE id = ?`, [recordId]);

    if (rows.length === 0) {
      return { success: false, message: '单据不存在' };
    }

    const originalData = rows[0];

    // 2. 检查是否已作废
    if (originalData.status === 'cancelled' || originalData.deleted === 1) {
      return { success: false, message: '单据已作废，不可重复作废' };
    }

    // 3. 检查业务约束（如已审核、已出库等）
    const config = Object.values(CANCELLABLE_DOCUMENTS).find((c) => c.tableName === tableName);

    if (config?.checkConditions) {
      for (const condition of config.checkConditions) {
        const checkResult = await checkBusinessCondition(tableName, recordId, condition);
        if (!checkResult.passed) {
          return { success: false, message: checkResult.message };
        }
      }
    }

    // 4. 执行作废（事务）
    await transaction(async (conn) => {
      // 更新单据状态为作废
      await conn.execute(
        `UPDATE ${escapeId(tableName)} SET 
          status = ?, 
          deleted = 1,
          update_time = NOW()
         WHERE id = ?`,
        [config?.cancelStatus || 'cancelled', recordId]
      );

      // 记录作废日志
      await conn.execute(
        `INSERT INTO document_cancel_log (
          table_name, record_id, record_no, document_type,
          cancel_reason, original_status, cancel_status,
          cancel_by, cancel_by_id, snapshot_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tableName,
          recordId,
          recordNo,
          documentType,
          cancelReason,
          originalStatus || originalData.status || '',
          config?.cancelStatus || 'cancelled',
          cancelledBy || 'system',
          cancelledById || 0,
          JSON.stringify(createSnapshot(originalData)),
        ]
      );
    });

    // 5. 记录审计日志
    await logDocumentCancel({
      tableName,
      recordId,
      recordNo,
      documentType,
      cancelReason,
      originalStatus: originalStatus || originalData.status || '',
      cancelStatus: config?.cancelStatus || 'cancelled',
      cancelBy: cancelledBy,
      cancelById: cancelledById,
      snapshotData: createSnapshot(originalData),
    });

    return { success: true, message: '单据作废成功' };
  } catch (error: any) {
    return { success: false, message: `作废失败: ${error.message}` };
  }
}

/**
 * 恢复已作废单据
 */
export async function restoreDocument(
  tableName: string,
  recordId: number,
  restoredBy?: string,
  restoredById?: number
): Promise<CancelResult> {
  try {
    assertValidIdentifier(tableName);

    // 1. 查询作废记录
    const cancelRows: any = await query(
      `SELECT * FROM document_cancel_log 
       WHERE table_name = ? AND record_id = ? AND is_restored = 0
       ORDER BY cancel_time DESC LIMIT 1`,
      [tableName, recordId]
    );

    if (cancelRows.length === 0) {
      return { success: false, message: '未找到作废记录或已恢复' };
    }

    const cancelRecord = cancelRows[0];

    // 2. 恢复单据（事务）
    await transaction(async (conn) => {
      // 恢复原始状态
      await conn.execute(
        `UPDATE ${escapeId(tableName)} SET 
          status = ?, 
          deleted = 0,
          update_time = NOW()
         WHERE id = ?`,
        [cancelRecord.original_status || 'draft', recordId]
      );

      // 更新作废记录
      await conn.execute(
        `UPDATE document_cancel_log SET 
          is_restored = 1,
          restore_time = NOW(),
          restore_by = ?
         WHERE id = ?`,
        [restoredBy || 'system', cancelRecord.id]
      );
    });

    // 3. 记录审计日志
    await logOperation({
      module: cancelRecord.document_type,
      type: '恢复',
      title: cancelRecord.record_no,
      content: `恢复已作废单据: ${cancelRecord.record_no}`,
      status: 1,
    });

    return { success: true, message: '单据恢复成功' };
  } catch (error: any) {
    return { success: false, message: `恢复失败: ${error.message}` };
  }
}

/**
 * 物理删除（仅允许草稿状态）
 */
export async function physicalDelete(
  tableName: string,
  recordId: number,
  options?: {
    allowedStatuses?: string[];
    module?: string;
    documentType?: string;
    recordNo?: string;
  }
): Promise<CancelResult> {
  try {
    assertValidIdentifier(tableName);

    // 1. 查询当前状态
    const rows: any = await query(`SELECT * FROM ${escapeId(tableName)} WHERE id = ?`, [recordId]);

    if (rows.length === 0) {
      return { success: false, message: '记录不存在' };
    }

    const record = rows[0];
    const allowedStatuses = options?.allowedStatuses || ['draft', '0'];

    // 2. 检查状态
    const currentStatus = String(record.status || '');
    if (!allowedStatuses.includes(currentStatus)) {
      return {
        success: false,
        message: `当前状态为 ${currentStatus}，不允许物理删除。请使用作废功能。`,
      };
    }

    // 3. 记录删除前的快照
    await logOperation({
      module: options?.module || '系统管理',
      type: '删除',
      title: options?.recordNo || String(recordId),
      content: `物理删除 ${options?.documentType || '记录'}: ${options?.recordNo || recordId}`,
      beforeData: createSnapshot(record),
      status: 1,
    });

    // 4. 执行物理删除
    await execute(`DELETE FROM ${escapeId(tableName)} WHERE id = ?`, [recordId]);

    return { success: true, message: '删除成功' };
  } catch (error: any) {
    return { success: false, message: `删除失败: ${error.message}` };
  }
}

// ============================================================
// 业务约束检查
// ============================================================

interface CheckResult {
  passed: boolean;
  message: string;
}

async function checkBusinessCondition(
  tableName: string,
  recordId: number,
  condition: string
): Promise<CheckResult> {
  switch (condition) {
    case 'not_received': {
      // 检查采购单是否已收货
      const rows: any = await query(
        `SELECT COUNT(*) as count FROM inv_inbound_order
         WHERE source_type = 'purchase' AND source_id = ?`,
        [recordId]
      );
      if (rows[0]?.count > 0) {
        return { passed: false, message: '采购单已存在入库记录，不可作废' };
      }
      return { passed: true, message: '' };
    }

    case 'not_shipped': {
      // 检查销售单是否已发货
      const rows: any = await query(
        `SELECT COUNT(*) as count FROM inv_outbound_order
         WHERE source_type = 'sales' AND source_id = ?`,
        [recordId]
      );
      if (rows[0]?.count > 0) {
        return { passed: false, message: '销售单已存在出库记录，不可作废' };
      }
      return { passed: true, message: '' };
    }

    case 'not_started': {
      // 检查工单是否已开工
      const rows: any = await query(`SELECT status FROM prod_work_order WHERE id = ?`, [recordId]);
      if (rows[0]?.status === 'producing' || rows[0]?.status === 'completed') {
        return { passed: false, message: '工单已开始生产，不可作废' };
      }
      return { passed: true, message: '' };
    }

    case 'not_settled': {
      // 检查是否已结算
      return { passed: true, message: '' }; // 简化处理
    }

    case 'not_completed': {
      // 检查调拨单是否已完成
      const rows: any = await query(`SELECT status FROM inv_transfer_order WHERE id = ?`, [
        recordId,
      ]);
      if (rows[0]?.status === 'completed') {
        return { passed: false, message: '调拨单已完成，不可作废' };
      }
      return { passed: true, message: '' };
    }

    case 'not_paid': {
      // 检查是否已付款/收款
      const rows: any = await query(`SELECT paid_amount FROM ${escapeId(tableName)} WHERE id = ?`, [
        recordId,
      ]);
      if (rows[0]?.paid_amount > 0) {
        return { passed: false, message: '已付款记录不可作废' };
      }
      return { passed: true, message: '' };
    }

    case 'not_posted': {
      // 检查凭证是否已过账
      const rows: any = await query(`SELECT status FROM fin_voucher WHERE id = ?`, [recordId]);
      if (rows[0]?.status === 'posted') {
        return { passed: false, message: '凭证已过账，不可作废' };
      }
      return { passed: true, message: '' };
    }

    default:
      return { passed: true, message: '' };
  }
}

// ============================================================
// 便捷方法
// ============================================================

/**
 * 根据单据类型快速作废
 */
export async function quickCancel(
  docType: keyof typeof CANCELLABLE_DOCUMENTS,
  recordId: number,
  cancelReason: string,
  cancelledBy?: string,
  cancelledById?: number
): Promise<CancelResult> {
  const config = CANCELLABLE_DOCUMENTS[docType];
  if (!config) {
    return { success: false, message: '不支持的单据类型' };
  }

  // 查询单据编号
  const rows: any = await query(
    `SELECT ${escapeId(config.noField)} as doc_no, status FROM ${escapeId(config.tableName)} WHERE id = ?`,
    [recordId]
  );

  if (rows.length === 0) {
    return { success: false, message: '单据不存在' };
  }

  return cancelDocument({
    tableName: config.tableName,
    recordId,
    recordNo: rows[0].doc_no,
    documentType: docType,
    module: config.module,
    cancelReason,
    cancelledBy,
    cancelledById,
    originalStatus: rows[0].status,
  });
}

/**
 * 批量作废
 */
export async function batchCancel(
  docType: keyof typeof CANCELLABLE_DOCUMENTS,
  recordIds: number[],
  cancelReason: string,
  cancelledBy?: string,
  cancelledById?: number
): Promise<{
  success: number;
  failed: number;
  details: Array<{ id: number; result: CancelResult }>;
}> {
  const results: Array<{ id: number; result: CancelResult }> = [];
  let success = 0;
  let failed = 0;

  for (const id of recordIds) {
    const result = await quickCancel(docType, id, cancelReason, cancelledBy, cancelledById);
    results.push({ id, result });
    if (result.success) success++;
    else failed++;
  }

  return { success, failed, details: results };
}

// ============================================================
// 导出
// ============================================================

const softDeleteUtils = {
  cancelDocument,
  restoreDocument,
  physicalDelete,
  quickCancel,
  batchCancel,
  CANCELLABLE_DOCUMENTS,
};

export default softDeleteUtils;
