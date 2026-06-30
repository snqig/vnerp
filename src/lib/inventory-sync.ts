import { query, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import { logInventoryChange } from './audit-logger';

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
 */
export async function checkInventoryAvailability(
  materialId: number,
  warehouseId: number,
  requiredQty: number,
  batchNo?: string
): Promise<InventoryCheckResult> {
  try {
    let sql = `
      SELECT quantity, locked_qty, available_qty
      FROM inv_inventory
      WHERE material_id = ? AND warehouse_id = ? AND deleted = 0
    `;
    const params: any[] = [materialId, warehouseId];

    if (batchNo) {
      sql += ' AND batch_no = ?';
      params.push(batchNo);
    }

    const rows: any = await query(sql, params);

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
  } catch (error: any) {
    secureLog('error', '库存检查失败', { error: error.message, materialId, warehouseId });
    return {
      success: false,
      message: `库存检查异常: ${error.message}`,
    };
  }
}

/**
 * 调整库存（统一入口）
 * 每次调整自动记录库存流水
 */
export async function adjustInventory(
  adjustment: InventoryAdjustment
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
      batchNo || undefined
    );
    if (!checkResult.success) {
      return checkResult;
    }
  }

  try {
    const result = await transaction(async (conn) => {
      // 1. 获取当前库存
      let selectSql = `
        SELECT id, quantity, locked_qty, available_qty, version
        FROM inv_inventory
        WHERE material_id = ? AND warehouse_id = ? AND deleted = 0
      `;
      const selectParams: any[] = [materialId, warehouseId];

      if (batchNo) {
        selectSql += ' AND batch_no = ?';
        selectParams.push(batchNo);
      } else {
        selectSql += ' AND (batch_no IS NULL OR batch_no = "")';
      }

      const [inventoryRows]: any = await conn.execute(selectSql, selectParams);

      let inventoryId: number;
      let beforeQty: number;
      let beforeLockedQty: number;
      let beforeAvailableQty: number;

      if (inventoryRows.length === 0) {
        // 库存记录不存在，入库时创建
        if (quantity < 0) {
          throw new Error('库存记录不存在，无法出库');
        }

        secureLog('info', 'adjustInventory 创建新库存记录', {
          operation: 'adjustInventory',
          materialId,
          warehouseId,
          batchNo,
          initialQty: quantity,
          businessNo,
        });

        const [insertResult]: any = await conn.execute(
          `INSERT INTO inv_inventory (
            material_id, warehouse_id, batch_no, quantity, locked_qty, available_qty
          ) VALUES (?, ?, ?, ?, 0, ?)`,
          [materialId, warehouseId, batchNo || null, quantity, quantity]
        );
        inventoryId = insertResult.insertId;
        beforeQty = 0;
        beforeLockedQty = 0;
        beforeAvailableQty = 0;
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

        const [updateResult]: any = await conn.execute(
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

      await conn.execute(
        `INSERT INTO inv_inventory_log (
          material_id, warehouse_id, batch_no, operation_type, operation_qty,
          before_qty, after_qty, business_type, business_no, remark, operator_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          materialId,
          warehouseId,
          batchNo || null,
          operationTypeMap[operationType] || 3,
          Math.abs(quantity),
          beforeQty,
          afterQty,
          businessType,
          businessNo,
          remark,
          operatorId || null,
        ]
      );

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
  } catch (error: any) {
    secureLog('error', '库存调整失败', {
      error: error.message,
      materialId,
      warehouseId,
      quantity,
      businessNo,
    });
    return {
      success: false,
      message: `库存调整失败: ${error.message}`,
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
      const [rows]: any = await conn.execute(
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

      const [lockUpdateResult]: any = await conn.execute(
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
      await conn.execute(
        `INSERT INTO inv_inventory_log (
          material_id, warehouse_id, operation_type, operation_qty,
          before_qty, after_qty, business_type, business_no, remark, operator_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          materialId,
          warehouseId,
          6, // 6-锁定
          lockQty,
          currentAvailable,
          newAvailable,
          '库存锁定',
          businessNo,
          `锁定库存: ${lockQty}`,
          operatorId || null,
        ]
      );
    });

    return {
      success: true,
      message: `库存锁定成功: ${lockQty}`,
    };
  } catch (error: any) {
    secureLog('error', '库存锁定失败', {
      error: error.message,
      materialId,
      warehouseId,
      lockQty,
      businessNo,
    });
    return {
      success: false,
      message: `库存锁定失败: ${error.message}`,
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
      const [rows]: any = await conn.execute(
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

      const [unlockUpdateResult]: any = await conn.execute(
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
      await conn.execute(
        `INSERT INTO inv_inventory_log (
          material_id, warehouse_id, operation_type, operation_qty,
          before_qty, after_qty, business_type, business_no, remark, operator_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          materialId,
          warehouseId,
          7, // 7-解锁
          unlockQty,
          currentAvailable,
          newAvailable,
          '库存解锁',
          businessNo,
          `解锁库存: ${unlockQty}`,
          operatorId || null,
        ]
      );
    });

    return {
      success: true,
      message: `库存解锁成功: ${unlockQty}`,
    };
  } catch (error: any) {
    secureLog('error', '库存解锁失败', {
      error: error.message,
      materialId,
      warehouseId,
      unlockQty,
      businessNo,
    });
    return {
      success: false,
      message: `库存解锁失败: ${error.message}`,
    };
  }
}

/**
 * 获取负库存预警列表
 */
export async function getNegativeStockWarnings(): Promise<any[]> {
  const rows: any = await query(
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

  return rows.map((row: any) => ({
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
): Promise<{ list: any[]; total: number }> {
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
  const params: any[] = [];

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
  const countResult: any = await query(countSql, params);
  const total = countResult[0]?.total || 0;

  sql += ' ORDER BY l.create_time DESC LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const rows: any = await query(sql, params);

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
    list: rows.map((row: any) => ({
      ...row,
      operation_type_label: operationTypeLabels[row.operation_type] || '未知',
    })),
    total,
  };
}
