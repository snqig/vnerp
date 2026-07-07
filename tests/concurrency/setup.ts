/**
 * 并发测试环境设置
 * 用于初始化测试数据库连接、准备测试数据、清理测试数据
 */

import { query, execute, transaction } from '@/lib/db';

// 测试环境配置
export const TEST_CONFIG = {
  // 并发数量
  CONCURRENCY_COUNT: 10,
  // 单个测试超时时间（毫秒）
  TEST_TIMEOUT: 30000,
  // API 基础路径
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  // 测试仓库ID（需要在测试前创建）
  TEST_WAREHOUSE_ID: 1,
  // 测试操作员ID
  TEST_OPERATOR_ID: 1,
  TEST_OPERATOR_NAME: '测试操作员',
};

// 测试数据接口
export interface TestMaterial {
  id: number;
  material_code: string;
  material_name: string;
  unit: string;
  initial_quantity: number;
  batch_no: string;
}

export interface TestWarehouse {
  id: number;
  warehouse_code: string;
  warehouse_name: string;
}

/**
 * 创建测试仓库
 */
export async function createTestWarehouse(): Promise<TestWarehouse> {
  const unique = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const warehouseCode = `TEST_WH_${unique}`;
  const warehouseName = `测试仓库_${unique}`;

  const result: any = await execute(
    `INSERT INTO inv_warehouse (warehouse_code, warehouse_name, status, create_time, update_time, deleted)
     VALUES (?, ?, 1, NOW(), NOW(), 0)`,
    [warehouseCode, warehouseName]
  );

  return {
    id: result.insertId,
    warehouse_code: warehouseCode,
    warehouse_name: warehouseName,
  };
}

/**
 * 创建测试物料
 */
export async function createTestMaterial(
  warehouseId: number,
  quantity: number = 1000
): Promise<TestMaterial> {
  const materialCode = `TEST_MAT_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const materialName = `测试物料_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const batchNo = `BATCH_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  await transaction(async (conn) => {
    // 创建物料基础信息（实际表名为 inv_material）
    const [matResult]: any = await conn.execute(
      `INSERT INTO inv_material (material_code, material_name, unit, status, create_time, update_time, deleted)
       VALUES (?, ?, '个', 1, NOW(), NOW(), 0)`,
      [materialCode, materialName]
    );

    const materialId = matResult.insertId;

    // 创建库存记录
    await conn.execute(
      `INSERT INTO inv_inventory (material_id, warehouse_id, quantity, available_qty, batch_no, create_time, update_time, deleted)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
      [materialId, warehouseId, quantity, quantity, batchNo]
    );

    // 创建批次记录（material_name 为 NOT NULL，必须提供）
    await conn.execute(
      `INSERT INTO inv_inventory_batch (batch_no, material_id, material_name, warehouse_id, quantity, available_qty, status, create_time, update_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), 0)`,
      [batchNo, materialId, materialName, warehouseId, quantity, quantity]
    );
  });

  // 查询物料ID
  const [material]: any = await query(
    `SELECT id FROM inv_material WHERE material_code = ?`,
    [materialCode]
  );

  return {
    id: material.id,
    material_code: materialCode,
    material_name: materialName,
    unit: '个',
    initial_quantity: quantity,
    batch_no: batchNo,
  };
}

/**
 * 清理测试仓库
 */
export async function cleanupTestWarehouse(warehouseId: number): Promise<void> {
  await execute(`UPDATE inv_warehouse SET deleted = 1 WHERE id = ?`, [warehouseId]);
}

/**
 * 清理测试物料
 */
export async function cleanupTestMaterial(materialId: number): Promise<void> {
  await transaction(async (conn) => {
    // 删除库存记录
    await conn.execute(`UPDATE inv_inventory SET deleted = 1 WHERE material_id = ?`, [materialId]);
    // 删除批次记录
    await conn.execute(`UPDATE inv_inventory_batch SET deleted = 1 WHERE material_id = ?`, [
      materialId,
    ]);
    // 删除物料基础信息（实际表名为 inv_material）
    await conn.execute(`UPDATE inv_material SET deleted = 1 WHERE id = ?`, [materialId]);
  });
}

/**
 * 获取当前库存数量
 */
export async function getCurrentInventory(
  materialId: number,
  warehouseId: number
): Promise<number> {
  const [result]: any = await query(
    `SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0`,
    [materialId, warehouseId]
  );
  return result ? parseFloat(result.quantity) : 0;
}

/**
 * 获取批次库存数量
 */
export async function getBatchInventory(
  batchNo: string,
  materialId: number,
  warehouseId: number
): Promise<number> {
  const [result]: any = await query(
    `SELECT quantity FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0`,
    [batchNo, materialId, warehouseId]
  );
  return result ? parseFloat(result.quantity) : 0;
}

/**
 * 创建测试出库单
 */
export async function createTestOutboundOrder(
  warehouseId: number,
  warehouseCode: string,
  warehouseName: string,
  materialId: number,
  materialName: string,
  quantity: number,
  batchNo?: string
): Promise<number> {
  const orderNo = `OUT_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const result: any = await transaction(async (conn) => {
    const [orderResult]: any = await conn.execute(
      `INSERT INTO inv_outbound_order (
        order_no, order_date, outbound_type,
        warehouse_id, warehouse_code, warehouse_name,
        total_qty, total_amount, operator_id, operator_name, status, create_time, update_time, deleted
      ) VALUES (?, NOW(), 'normal', ?, ?, ?, ?, 0, 1, '测试操作员', 'pending', NOW(), NOW(), 0)`,
      [orderNo, warehouseId, warehouseCode, warehouseName, quantity]
    );

    const orderId = orderResult.insertId;

    await conn.execute(
      `INSERT INTO inv_outbound_item (
        order_id, material_id, material_name, material_spec, quantity, unit, batch_no, create_time, deleted
      ) VALUES (?, ?, ?, '', ?, '个', ?, NOW(), 0)`,
      [orderId, materialId, materialName, quantity, batchNo || '']
    );

    return orderId;
  });

  return result;
}

/**
 * 创建测试盘点单
 */
export async function createTestStocktaking(
  warehouseId: number
): Promise<{ id: number; check_no: string }> {
  const checkNo = `IC_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const result: any = await execute(
    `INSERT INTO inv_stocktaking (
      taking_no, taking_type, warehouse_id, status, taking_date, operator_id, create_time, update_time, deleted
    ) VALUES (?, 1, ?, 1, NOW(), 1, NOW(), NOW(), 0)`,
    [checkNo, warehouseId]
  );

  return {
    id: result.insertId,
    check_no: checkNo,
  };
}

/**
 * 创建测试领料单
 */
export async function createTestMaterialRequisition(
  warehouseId: number,
  materialId: number,
  materialName: string,
  quantity: number
): Promise<number> {
  const issueNo = `MR_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // 创建工单（实际表 prod_work_order 使用 work_order_no，不是 order_no；status 为 VARCHAR）
  // execute() 返回 ResultSetHeader 直接（非数组），不能用数组解构
  const woResult: any = await execute(
    `INSERT INTO prod_work_order (work_order_no, status, create_time, update_time, deleted)
     VALUES (?, 'pending', NOW(), NOW(), 0)`,
    [`WO_${Date.now()}`]
  );
  const workOrderId = woResult.insertId;

    const result: any = await transaction(async (conn) => {
      const [issueResult]: any = await conn.execute(
        `INSERT INTO prd_material_issue (
          issue_no, work_order_id, work_order_no, warehouse_id,
          issue_date, issue_type, status, operator_id, operator_name,
          create_time, update_time, deleted
        ) VALUES (?, ?, '', ?, NOW(), 'normal', 1, 1, '测试操作员', NOW(), NOW(), 0)`,
        [issueNo, workOrderId, warehouseId]
      );

      const issueId = issueResult.insertId;

      await conn.execute(
        `INSERT INTO prd_material_issue_item (
          issue_id, material_id, material_code, material_name,
          required_qty, issued_qty, unit, create_time
        ) VALUES (?, ?, '', ?, ?, 0, '个', NOW())`,
        [issueId, materialId, materialName, quantity]
      );

      return issueId;
    });

  return result;
}

/**
 * 全局测试环境初始化
 */
export async function setupTestEnvironment(): Promise<void> {
  console.log('初始化测试环境...');
  // 可以在这里添加全局初始化逻辑
}

/**
 * 全局测试环境清理
 */
export async function teardownTestEnvironment(): Promise<void> {
  console.log('清理测试环境...');
  // 可以在这里添加全局清理逻辑
}
