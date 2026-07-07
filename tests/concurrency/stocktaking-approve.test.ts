/**
 * 盘点审批并发测试
 * 测试多个审批同时修改库存的场景
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  createTestWarehouse,
  createTestMaterial,
  cleanupTestWarehouse,
  cleanupTestMaterial,
  getCurrentInventory,
  TestMaterial,
  TestWarehouse,
  TEST_CONFIG,
} from './setup';
import {
  runConcurrentTest,
  printTestReport,
  saveTestReport,
  verifyInventoryNotNegative,
  TestResult,
} from './utils';
import { query, execute, transaction } from '@/lib/db';

// P0-2 基线重置已完成（Migration 019）：inv_stocktaking/inv_stocktaking_item 表已创建
describe('盘点审批并发测试', () => {
  let testWarehouse: TestWarehouse;
  let testMaterial: TestMaterial;

  // 测试前准备
  beforeAll(async () => {
    console.log('准备测试环境...');
    testWarehouse = await createTestWarehouse();
    // 创建测试物料，初始库存为 500
    testMaterial = await createTestMaterial(testWarehouse.id, 500);
    console.log(
      `测试仓库: ${testWarehouse.warehouse_name} (ID: ${testWarehouse.id})`
    );
    console.log(
      `测试物料: ${testMaterial.material_name} (ID: ${testMaterial.id}, 初始库存: ${testMaterial.initial_quantity})`
    );
  }, TEST_CONFIG.TEST_TIMEOUT);

  // 测试后清理
  afterAll(async () => {
    console.log('清理测试环境...');
    await cleanupTestMaterial(testMaterial.id);
    await cleanupTestWarehouse(testWarehouse.id);
    console.log('测试环境清理完成');
  }, TEST_CONFIG.TEST_TIMEOUT);

  it(
    '并发创建和审批盘点单',
    async () => {
      const concurrentCount = 5; // 并发数量

      // 创建盘点单的函数
      const createStocktaking = async (index: number): Promise<number> => {
        const checkNo = `IC_${Date.now()}_${index}`;

        const result: any = await transaction(async (conn) => {
          // 创建盘点单主表
          const [checkResult]: any = await conn.execute(
            `INSERT INTO inv_stocktaking (
              taking_no, taking_type, warehouse_id, status, taking_date, operator_id, create_time, update_time, deleted
            ) VALUES (?, 1, ?, 1, NOW(), 1, NOW(), NOW(), 0)`,
            [checkNo, testWarehouse.id]
          );

          const checkId = checkResult.insertId;

          // 创建盘点明细
          await conn.execute(
            `INSERT INTO inv_stocktaking_item (
              taking_id, material_id, material_code, material_name,
              system_qty, actual_qty, diff_qty, unit, batch_no, create_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, '个', ?, NOW())`,
            [
              checkId,
              testMaterial.id,
              testMaterial.material_code,
              testMaterial.material_name,
              testMaterial.initial_quantity,
              testMaterial.initial_quantity,
              0,
              testMaterial.batch_no,
            ]
          );

          return checkId;
        });

        return result;
      };

      // 审批盘点单的函数
      const approveStocktaking = async (checkId: number): Promise<TestResult> => {
        try {
          await transaction(async (conn) => {
            // 获取盘点单信息并加锁
            const [checkRows]: any = await conn.execute(
              `SELECT id, taking_no, status, warehouse_id FROM inv_stocktaking WHERE id = ? AND deleted = 0 FOR UPDATE`,
              [checkId]
            );

            if (!checkRows || checkRows.length === 0) {
              throw new Error('盘点单不存在');
            }

            const check = checkRows[0];

            if (check.status !== 1) {
              throw new Error(`盘点单状态不正确: ${check.status}`);
            }

            // 获取盘点明细
            const [itemRows]: any = await conn.execute(
              `SELECT * FROM inv_stocktaking_item WHERE taking_id = ?`,
              [checkId]
            );

            // 模拟盘点差异（随机增加或减少库存）
            const diffQty = Math.floor(Math.random() * 20) - 10; // -10 到 +10 之间

            for (const item of itemRows) {
              // 更新盘点明细
              const actualQty = parseFloat(item.system_qty) + diffQty;
              await conn.execute(
                `UPDATE inv_stocktaking_item SET
                  actual_qty = ?,
                  diff_qty = ?
                WHERE id = ?`,
                [actualQty, diffQty, item.id]
              );

              // 检查是否会产生负库存
              const [inventoryRows]: any = await conn.execute(
                `SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE`,
                [item.material_id, check.warehouse_id]
              );

              if (inventoryRows && inventoryRows.length > 0) {
                const currentQty = parseFloat(inventoryRows[0].quantity);
                if (currentQty + diffQty < 0) {
                  throw new Error(
                    `盘点后将产生负库存: 当前 ${currentQty}, 差异 ${diffQty}`
                  );
                }

                // 更新库存
                await conn.execute(
                  `UPDATE inv_inventory SET
                    quantity = quantity + ?,
                    update_time = NOW()
                  WHERE material_id = ? AND warehouse_id = ?`,
                  [diffQty, item.material_id, check.warehouse_id]
                );

                // 记录库存流水
                await conn.execute(
                  `INSERT INTO inv_inventory_log (material_id, warehouse_id, change_qty, change_type, order_no, remark, create_time)
                   VALUES (?, ?, ?, 'STOCKTAKING', ?, ?, NOW())`,
                  [item.material_id, check.warehouse_id, diffQty, check.taking_no, '盘点调整']
                );
              }
            }

            // 更新盘点单状态为已完成
            await conn.execute(
              `UPDATE inv_stocktaking SET status = 3, update_time = NOW() WHERE id = ?`,
              [checkId]
            );
          });

          return { success: true, duration: 0 };
        } catch (error) {
          return {
            success: false,
            duration: 0,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      };

      // 步骤1: 创建多个盘点单
      console.log(`\n步骤1: 创建 ${concurrentCount} 个盘点单...`);
      const checkIds: number[] = [];
      for (let i = 0; i < concurrentCount; i++) {
        const checkId = await createStocktaking(i);
        checkIds.push(checkId);
      }
      console.log(`已创建 ${checkIds.length} 个盘点单`);

      // 步骤2: 并发审批盘点单
      console.log(`\n步骤2: 并发审批盘点单...`);
      const report = await runConcurrentTest(
        '盘点审批并发测试',
        (index) => approveStocktaking(checkIds[index]),
        concurrentCount
      );

      printTestReport(report);
      saveTestReport(report, `stocktaking-approve-${Date.now()}.json`);

      // 步骤3: 验证数据一致性
      console.log('\n步骤3: 验证数据一致性...');
      const finalInventory = await getCurrentInventory(
        testMaterial.id,
        testWarehouse.id
      );

      console.log(`初始库存: ${testMaterial.initial_quantity}`);
      console.log(`成功审批数量: ${report.successCount}`);
      console.log(`最终库存: ${finalInventory}`);

      // 验证库存不为负
      const notNegativeCheck = await verifyInventoryNotNegative(
        testMaterial.id,
        testWarehouse.id
      );
      expect(notNegativeCheck.valid).toBe(true);
      console.log(`库存不为负验证: ${notNegativeCheck.valid ? '通过' : '失败'}`);

      // 断言
      expect(report.successCount + report.failureCount).toBe(concurrentCount);
      expect(notNegativeCheck.valid).toBe(true);
    },
    TEST_CONFIG.TEST_TIMEOUT * 2
  );

  it(
    '测试盘点产生负库存的保护',
    async () => {
      // 创建一个新的物料，库存较少
      const lowStockMaterial = await createTestMaterial(testWarehouse.id, 5);
      const concurrentCount = 3;

      console.log(
        `\n测试盘点产生负库存场景: 初始库存=${lowStockMaterial.initial_quantity}, 并发请求数=${concurrentCount}`
      );

      const createAndApproveStocktaking = async (
        index: number
      ): Promise<TestResult> => {
        try {
          const checkNo = `IC_LOW_${Date.now()}_${index}`;

          await transaction(async (conn) => {
            // 创建盘点单
            const [checkResult]: any = await conn.execute(
              `INSERT INTO inv_stocktaking (
                taking_no, taking_type, warehouse_id, status, taking_date, operator_id, create_time, update_time, deleted
              ) VALUES (?, 1, ?, 1, NOW(), 1, NOW(), NOW(), 0)`,
              [checkNo, testWarehouse.id]
            );

            const checkId = checkResult.insertId;

            // 创建盘点明细
            await conn.execute(
              `INSERT INTO inv_stocktaking_item (
                taking_id, material_id, material_code, material_name,
                system_qty, actual_qty, diff_qty, unit, batch_no, create_time
              ) VALUES (?, ?, ?, ?, ?, ?, ?, '个', ?, NOW())`,
              [
                checkId,
                lowStockMaterial.id,
                lowStockMaterial.material_code,
                lowStockMaterial.material_name,
                lowStockMaterial.initial_quantity,
                lowStockMaterial.initial_quantity,
                0,
                lowStockMaterial.batch_no,
              ]
            );

            // 立即审批
            const [checkRows]: any = await conn.execute(
              `SELECT id, taking_no, status, warehouse_id FROM inv_stocktaking WHERE id = ? AND deleted = 0 FOR UPDATE`,
              [checkId]
            );

            const check = checkRows[0];

            // 模拟盘点差异：尝试减少库存（可能导致负库存）
            const diffQty = -10; // 尝试减少10

            // 检查是否会产生负库存
            const [inventoryRows]: any = await conn.execute(
              `SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE`,
              [lowStockMaterial.id, check.warehouse_id]
            );

            if (inventoryRows && inventoryRows.length > 0) {
              const currentQty = parseFloat(inventoryRows[0].quantity);
              if (currentQty + diffQty < 0) {
                throw new Error(
                  `盘点后将产生负库存: 当前 ${currentQty}, 差异 ${diffQty}`
                );
              }

              // 更新库存
              await conn.execute(
                `UPDATE inv_inventory SET
                  quantity = quantity + ?,
                  update_time = NOW()
                WHERE material_id = ? AND warehouse_id = ?`,
                [diffQty, lowStockMaterial.id, check.warehouse_id]
              );
            }

            // 更新盘点单状态
            await conn.execute(
              `UPDATE inv_stocktaking SET status = 3, update_time = NOW() WHERE id = ?`,
              [checkId]
            );
          });

          return { success: true, duration: 0 };
        } catch (error) {
          return {
            success: false,
            duration: 0,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      };

      const report = await runConcurrentTest(
        '盘点负库存保护测试',
        createAndApproveStocktaking,
        concurrentCount
      );

      printTestReport(report);

      // 验证库存不为负
      const notNegativeCheck = await verifyInventoryNotNegative(
        lowStockMaterial.id,
        testWarehouse.id
      );
      expect(notNegativeCheck.valid).toBe(true);

      console.log(`\n结果分析:`);
      console.log(`- 成功数量: ${report.successCount}`);
      console.log(`- 失败数量: ${report.failureCount}`);
      console.log(`- 最终库存: ${notNegativeCheck.quantity}`);
      console.log(`- 库存不为负: ${notNegativeCheck.valid ? '是' : '否'}`);

      // 清理
      await cleanupTestMaterial(lowStockMaterial.id);
    },
    TEST_CONFIG.TEST_TIMEOUT
  );
});
