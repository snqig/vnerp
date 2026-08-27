import { query, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { logInventoryChange } from './audit-logger';
import { appendInventoryLog } from './inventory-ledger';
import type mysql from 'mysql2/promise';

export interface InventoryAdjustment {
  materialId: number;
  warehouseId: number;
  batchNo?: string;
  quantity: number; // 正数增加，负数减少
  operationType: 'inbound' | 'outbound' | 'adjust' | 'transfer' | 'scrap';
  businessType: string;
  businessNo: string;
  remark?: string;
  operatorId?: number;
}

export interface InventoryCheckResult {
  success: boolean;
  message: string;
  currentStock?: number;
  availableStock?: number;
}

/**
 * 检查库存是否充足（防止负库存）
 * @param conn - 可选事务连接；传入时在事务内读取（读到未提交数据），否则使用独立查询
 */
export async function checkInventoryAvailability(
  materialId: number,
  warehouseId: number,
  requiredQty: number,
  batchNo?: string,
  conn?: mysql.PoolConnection
): Promise<InventoryCheckResult> {
  try {
    let sql = `
      SELECT quantity, locked_qty, available_qty
      FROM inv_inventory
      WHERE material_id = ? AND warehouse_id = ? AND deleted = 0
    `;
    const params: Loose[] = [materialId, warehouseId];

    if (batchNo) {
      sql += ' AND batch_no = ?';
      params.push(batchNo);
    }

    let rows: Loose;
    if (conn) {
      const [result] = await conn.execute(sql, params);
      rows = result as Loose;
    } else {
      rows = await query(sql, params);
    }

    if (rows.length === 0) {
      return {
        success: false,
        message: `物料ID ${materialId} 在仓库 ${warehouseId} 无库存记录`,
        currentStock: 0,
        availableStock: 0,
      };
    }

    const stock = rows[0];
    const availableQty = parseFloat(stock.available_qty || '0');

    if (availableQty < requiredQty) {
      return {
        success: false,
        message: `库存不足: 可用 ${availableQty}, 需要 ${requiredQty}`,
        currentStock: parseFloat(stock.quantity || '0'),
        availableStock: availableQty,
      };
    }

    return {
      success: true,
      message: '库存充足',
      currentStock: parseFloat(stock.quantity || '0'),
      availableStock: availableQty,
    };
  } catch (error) {
    secureLog('error', '库存检查失败', {
      error: (error as Error).message,
      materialId,
      warehouseId,
    });
    return {
      success: false,
      message: '库存检查异常，请稍后重试',
    };
  }
}

/**
 * 调整库存（统一入口）
 * 每次调整自动记录库存流水
 * @param conn - 可选事务连接；传入时复用外层事务（不自行 begin/commit，回滚随外层），
 *   否则独立开启事务。解决嵌套事务导致"外层回滚但库存已扣"的问题。
 */
export async function adjustInventory(
  adjustment: InventoryAdjustment,
  conn?: mysql.PoolConnection
): Promise<InventoryCheckResult> {
  const {
    materialId,
    warehouseId,
    batchNo = '',
    quantity,
    operationType,
    businessType,
    businessNo,
    remark = '',
    operatorId,
  } = adjustment;

  // 出库时检查库存
  if (quantity < 0) {
    const checkResult = await checkInventoryAvailability(
      materialId,
      warehouseId,
      Math.abs(quantity),
      batchNo || undefined,
      conn
    );
    if (!checkResult.success) {
      return checkResult;
    }
  }

  try {
    // 若外层已传入事务连接，直接复用（不自行 begin/commit，回滚随外层）；
    // 否则独立开启事务（保持向后兼容）。
    const runInTransaction = <T,>(
      cb: (c: mysql.PoolConnection) => Promise<T>
    ): Promise<T> => (conn ? cb(conn) : transaction(cb));

    const result = await runInTransaction(async (txConn) => {
      // 1. 获取当前库存
      let selectSql = `
        SELECT id, quantity, locked_qty, available_qty, version
        FROM inv_inventory
        WHERE material_id = ? AND warehouse_id = ? AND deleted = 0
      `;
      const selectParams: Loose[] = [materialId, warehouseId];

      if (batchNo) {
        selectSql += ' AND batch_no = ?';
        selectParams.push(batchNo);
      } else {
        selectSql += ' AND (batch_no IS NULL OR batch_no = "")';
      }

      const [inventoryRows]: Loose = await txConn.execute(selectSql, selectParams);

      let inventoryId: number;
      let beforeQty: number;
      let beforeLockedQty: number;
      let beforeAvailableQty: number;

      if (inventoryRows.length === 0) {
        // 库存记录不存在，入库时创建
        if (quantity < 0) {
          throw new Error('库存记录不存在，无法出库');
        }

        secureLog('info', 'adjustInventory 创建/复活库存记录', {
          operation: 'adjustInventory',
          materialId,
          warehouseId,
          batchNo,
          initialQty: quantity,
          businessNo,
        });

        // R4 修复：新建改为 UPSERT，避免 `uk_material_warehouse` 无视软删导致
        // 并发下"双事务同时 SELECT 空 → 双 INSERT"撞唯一键整事务回滚。
        // 命中既有软删行时复活并累加；无论新建或复活，随后统一重读以正确计算 beforeQty。
        await txConn.execute(
          `INSERT INTO inv_inventory (
            material_id, warehouse_id, batch_no, quantity, locked_qty, available_qty, version
          ) VALUES (?, ?, ?, ?, 0, ?, 1)
          ON DUPLICATE KEY UPDATE
            quantity      = quantity + VALUES(quantity),
            available_qty = available_qty + VALUES(available_qty),
            version       = version + 1,
            deleted       = 0`,
          [materialId, warehouseId, batchNo || null, quantity, quantity]
        );

        const [reChk]: Loose = await txConn.execute(
          `SELECT id, quantity, locked_qty, available_qty, version
           FROM inv_inventory
           WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE`,
          [materialId, warehouseId]
        );
        const inv0 = reChk[0];
        inventoryId = inv0.id;
        beforeQty = parseFloat(inv0.quantity || '0') - quantity;
        beforeLockedQty = parseFloat(inv0.locked_qty || '0');
        beforeAvailableQty = parseFloat(inv0.available_qty || '0') - quantity;
      } else {
        const inv = inventoryRows[0];
        inventoryId = inv.id;
        beforeQty = parseFloat(inv.quantity || '0');
        beforeLockedQty = parseFloat(inv.locked_qty || '0');
        beforeAvailableQty = parseFloat(inv.available_qty || '0');
        const currentVersion = parseInt(inv.version || '1', 10);

        // 读取到的库存状态（用于排查并发问题）
        secureLog('debug', 'adjustInventory 读取当前库存', {
          operation: 'adjustInventory',
          materialId,
          warehouseId,
          batchNo,
          inventoryId,
          currentVersion,
          beforeQty,
          beforeLockedQty,
          beforeAvailableQty,
          adjustQty: quantity,
          businessNo,
        });

        // 计算新库存
        const newQty = beforeQty + quantity;
        const newAvailableQty = beforeAvailableQty + quantity;

        if (newQty < 0) {
          throw new Error(`库存不足: 当前 ${beforeQty}, 调整 ${quantity}, 结果 ${newQty}`);
        }
        if (newAvailableQty < 0) {
          throw new Error(`可用库存不足: 当前可用 ${beforeAvailableQty}, 调整 ${quantity}`);
        }

        // 更新库存（乐观锁：带 version 条件，自增 version）
        secureLog('debug', 'adjustInventory 执行 UPDATE', {
          operation: 'adjustInventory',
          inventoryId,
          expectedVersion: currentVersion,
          beforeQty,
          newQty,
          beforeAvailableQty,
          newAvailableQty,
          businessNo,
        });

        const [updateResult]: Loose = await txConn.execute(
          `UPDATE inv_inventory SET
            quantity = ?,
            available_qty = ?,
            version = version + 1,
            update_time = NOW()
          WHERE id = ? AND version = ?`,
          [newQty, newAvailableQty, inventoryId, currentVersion]
        );

        secureLog('debug', 'adjustInventory UPDATE 结果', {
          operation: 'adjustInventory',
          inventoryId,
          affectedRows: updateResult.affectedRows,
          expectedVersion: currentVersion,
          newVersion: currentVersion + 1,
          businessNo,
        });

        // 乐观锁冲突检测：affectedRows=0 表示 version 已被其他事务修改
        if (updateResult.affectedRows === 0) {
          secureLog('warn', '乐观锁并发冲突', {
            operation: 'adjustInventory',
            materialId,
            warehouseId,
            batchNo,
            inventoryId,
            expectedVersion: currentVersion,
            beforeQty,
            beforeAvailableQty,
            adjustQty: quantity,
            businessNo,
          });
          throw new Error('并发冲突: 库存已被其他事务修改，请重试');
        }
      }

      // 2. 记录库存流水（不可修改、不可删除）
      const afterQty = beforeQty + quantity;
      const operationTypeMap: Record<string, number> = {
        inbound: 1,
        outbound: 2,
        adjust: 3,
        transfer: 4,
        scrap: 5,
      };

      await appendInventoryLog(txConn, {
        materialId,
        warehouseId,
        batchNo: batchNo || null,
        operationType: operationTypeMap[operationType] || 3,
        operationQty: Math.abs(quantity),
        beforeQty,
        afterQty,
        businessType,
        businessNo,
        remark,
        operatorId,
      });

      return {
        inventoryId,
        beforeQty,
        afterQty,
        adjustmentQty: quantity,
      };
    });

    // 记录审计日志
    await logInventoryChange({
      materialId,
      warehouseId,
      batchNo,
      operationType,
      quantity: Math.abs(quantity),
      beforeQty: result.beforeQty,
      afterQty: result.afterQty,
      businessType,
      businessNo,
      operatorId,
    });

    // 检查负库存预警
    if (result.afterQty < 0) {
      secureLog('warn', '负库存预警', {
        materialId,
        warehouseId,
        afterQty: result.afterQty,
        businessNo,
      });
    }

    return {
      success: true,
      message: `库存调整成功: ${result.beforeQty} → ${result.afterQty}`,
      currentStock: result.afterQty,
      availableStock: result.afterQty,
    };
  } catch (error) {
    secureLog('error', '库存调整失败', {
      error: (error as Error).message,
      materialId,
      warehouseId,
      quantity,
      businessNo,
    });
    return {
      success: false,
      message: '库存调整失败，请稍后重试',
    };
  }
}

/**
 * 锁定库存（预留）
 */
export async function lockInventory(
  materialId: number,
  warehouseId: number,
  lockQty: number,
  businessNo: string,
  operatorId?: number
): Promise<InventoryCheckResult> {
  try {
    const checkResult = await checkInventoryAvailability(materialId, warehouseId, lockQty);
    if (!checkResult.success) {
      return checkResult;
    }

    await transaction(async (conn) => {
      const [rows]: Loose = await conn.execute(
        `SELECT id, quantity, locked_qty, available_qty, version
         FROM inv_inventory
         WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
        [materialId, warehouseId]
      );

      if (rows.length === 0) {
        throw new Error('库存记录不存在');
      }

      const inv = rows[0];
      const currentLocked = parseFloat(inv.locked_qty || '0');
      const currentAvailable = parseFloat(inv.available_qty || '0');
      const currentVersion = parseInt(inv.version || '1', 10);
      const newLocked = currentLocked + lockQty;
      const newAvailable = currentAvailable - lockQty;

      // 读取到的库存状态（用于排查并发问题）
      secureLog('debug', 'lockInventory 读取当前库存', {
        operation: 'lockInventory',
        materialId,
        warehouseId,
        inventoryId: inv.id,
        currentVersion,
        currentLocked,
        currentAvailable,
        lockQty,
        newLocked,
        newAvailable,
        businessNo,
      });

      if (newAvailable < 0) {
        throw new Error(`可用库存不足，无法锁定: 可用 ${currentAvailable}, 需锁定 ${lockQty}`);
      }

      // 更新库存（乐观锁：带 version 条件，自增 version）
      secureLog('debug', 'lockInventory 执行 UPDATE', {
        operation: 'lockInventory',
        inventoryId: inv.id,
        expectedVersion: currentVersion,
        newLocked,
        newAvailable,
        businessNo,
      });

      const [lockUpdateResult]: Loose = await conn.execute(
        `UPDATE inv_inventory SET
          locked_qty = ?,
          available_qty = ?,
          version = version + 1,
          update_time = NOW()
        WHERE id = ? AND version = ?`,
        [newLocked, newAvailable, inv.id, currentVersion]
      );

      secureLog('debug', 'lockInventory UPDATE 结果', {
        operation: 'lockInventory',
        inventoryId: inv.id,
        affectedRows: lockUpdateResult.affectedRows,
        expectedVersion: currentVersion,
        newVersion: currentVersion + 1,
        businessNo,
      });

      if (lockUpdateResult.affectedRows === 0) {
        secureLog('warn', '乐观锁并发冲突', {
          operation: 'lockInventory',
          materialId,
          warehouseId,
          inventoryId: inv.id,
          expectedVersion: currentVersion,
          currentLocked,
          currentAvailable,
          lockQty,
          businessNo,
        });
        throw new Error('并发冲突: 库存已被其他事务修改，请重试');
      }

      // 记录锁定流水
      await appendInventoryLog(conn, {
        materialId,
        warehouseId,
        operationType: 6,
        operationQty: lockQty,
        beforeQty: currentAvailable,
        afterQty: newAvailable,
        businessType: '库存锁定',
        businessNo,
        remark: `锁定库存: ${lockQty}`,
        operatorId,
      });
    });

    return {
      success: true,
      message: `库存锁定成功: ${lockQty}`,
    };
  } catch (error) {
    secureLog('error', '库存锁定失败', {
      error: (error as Error).message,
      materialId,
      warehouseId,
      lockQty,
      businessNo,
    });
    return {
      success: false,
      message: '库存锁定失败，请稍后重试',
    };
  }
}

/**
 * 解锁库存（释放预留）
 */
export async function unlockInventory(
  materialId: number,
  warehouseId: number,
  unlockQty: number,
  businessNo: string,
  operatorId?: number
): Promise<InventoryCheckResult> {
  try {
    await transaction(async (conn) => {
      const [rows]: Loose = await conn.execute(
        `SELECT id, quantity, locked_qty, available_qty, version
         FROM inv_inventory
         WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
        [materialId, warehouseId]
      );

      if (rows.length === 0) {
        throw new Error('库存记录不存在');
      }

      const inv = rows[0];
      const currentLocked = parseFloat(inv.locked_qty || '0');
      const currentAvailable = parseFloat(inv.available_qty || '0');
      const currentVersion = parseInt(inv.version || '1', 10);
      const newLocked = Math.max(0, currentLocked - unlockQty);
      const newAvailable = currentAvailable + (currentLocked - newLocked);

      // 读取到的库存状态（用于排查并发问题）
      secureLog('debug', 'unlockInventory 读取当前库存', {
        operation: 'unlockInventory',
        materialId,
        warehouseId,
        inventoryId: inv.id,
        currentVersion,
        currentLocked,
        currentAvailable,
        unlockQty,
        newLocked,
        newAvailable,
        businessNo,
      });

      // 更新库存（乐观锁：带 version 条件，自增 version）
      secureLog('debug', 'unlockInventory 执行 UPDATE', {
        operation: 'unlockInventory',
        inventoryId: inv.id,
        expectedVersion: currentVersion,
        newLocked,
        newAvailable,
        businessNo,
      });

      const [unlockUpdateResult]: Loose = await conn.execute(
        `UPDATE inv_inventory SET
          locked_qty = ?,
          available_qty = ?,
          version = version + 1,
          update_time = NOW()
        WHERE id = ? AND version = ?`,
        [newLocked, newAvailable, inv.id, currentVersion]
      );

      secureLog('debug', 'unlockInventory UPDATE 结果', {
        operation: 'unlockInventory',
        inventoryId: inv.id,
        affectedRows: unlockUpdateResult.affectedRows,
        expectedVersion: currentVersion,
        newVersion: currentVersion + 1,
        businessNo,
      });

      if (unlockUpdateResult.affectedRows === 0) {
        secureLog('warn', '乐观锁并发冲突', {
          operation: 'unlockInventory',
          materialId,
          warehouseId,
          inventoryId: inv.id,
          expectedVersion: currentVersion,
          currentLocked,
          currentAvailable,
          unlockQty,
          businessNo,
        });
        throw new Error('并发冲突: 库存已被其他事务修改，请重试');
      }

      // 记录解锁流水
      await appendInventoryLog(conn, {
        materialId,
        warehouseId,
        operationType: 7,
        operationQty: unlockQty,
        beforeQty: currentAvailable,
        afterQty: newAvailable,
        businessType: '库存解锁',
        businessNo,
        remark: `解锁库存: ${unlockQty}`,
        operatorId,
      });
    });

    return {
      success: true,
      message: `库存解锁成功: ${unlockQty}`,
    };
  } catch (error) {
    secureLog('error', '库存解锁失败', {
      error: (error as Error).message,
      materialId,
      warehouseId,
      unlockQty,
      businessNo,
    });
    return {
      success: false,
      message: '库存解锁失败，请稍后重试',
    };
  }
}

/**
 * 获取负库存预警列表
 */
export async function getNegativeStockWarnings(): Promise<Loose[]> {
  const rows: Loose = await query(
    `SELECT
      i.id,
      i.material_id,
      m.material_code,
      m.material_name,
      m.specification,
      i.warehouse_id,
      w.warehouse_name,
      i.quantity,
      i.available_qty,
      i.locked_qty,
      m.safety_stock,
      m.min_stock
    FROM inv_inventory i
    LEFT JOIN inv_material m ON i.material_id = m.id
    LEFT JOIN inv_warehouse w ON i.warehouse_id = w.id
    WHERE i.deleted = 0 AND m.deleted = 0
      AND (i.quantity < 0 OR i.available_qty < 0 OR i.available_qty <= m.safety_stock)
    ORDER BY i.available_qty ASC`
  );

  return rows.map((row: Loose) => ({
    ...row,
    warningType:
      row.quantity < 0 ? 'negative' : row.available_qty < 0 ? 'negative_available' : 'low_stock',
    warningLevel: row.quantity < 0 ? 'critical' : row.available_qty < 0 ? 'critical' : 'warning',
  }));
}

/**
 * 获取库存流水
 */
export async function getInventoryLogs(
  materialId?: number,
  warehouseId?: number,
  operationType?: number,
  startDate?: string,
  endDate?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ list: Loose[]; total: number }> {
  let sql = `
    SELECT
      l.*,
      m.material_code,
      m.material_name,
      w.warehouse_name,
      u.username as operator_name
    FROM inv_inventory_log l
    LEFT JOIN inv_material m ON l.material_id = m.id
    LEFT JOIN inv_warehouse w ON l.warehouse_id = w.id
    LEFT JOIN sys_user u ON l.operator_id = u.id
    WHERE 1=1
  `;
  const params: Loose[] = [];

  if (materialId) {
    sql += ' AND l.material_id = ?';
    params.push(materialId);
  }
  if (warehouseId) {
    sql += ' AND l.warehouse_id = ?';
    params.push(warehouseId);
  }
  if (operationType) {
    sql += ' AND l.operation_type = ?';
    params.push(operationType);
  }
  if (startDate) {
    sql += ' AND l.create_time >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND l.create_time <= ?';
    params.push(endDate);
  }

  const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
  const countResult: Loose = await query(countSql, params);
  const total = countResult[0]?.total || 0;

  sql += ' ORDER BY l.create_time DESC LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const rows: Loose = await query(sql, params);

  const operationTypeLabels: Record<number, string> = {
    1: '入库',
    2: '出库',
    3: '盘点调整',
    4: '调拨',
    5: '报废',
    6: '锁定',
    7: '解锁',
  };

  return {
    list: rows.map((row: Loose) => ({
      ...row,
      operation_type_label: operationTypeLabels[row.operation_type] || '未知',
    })),
    total,
  };
}
