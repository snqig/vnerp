/**
 * 库存出库并发测试
 * 测试多个出库单同时扣减同一库存的场景
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
  verifyInventoryConsistency,
  verifyInventoryNotNegative,
  TestResult,
} from './utils';
import { query, execute, transaction } from '@/lib/db';

describe('库存出库并发测试', () => {
  let testWarehouse: TestWarehouse;
  let testMaterial: TestMaterial;

  // 测试前准备
  beforeAll(async () => {
    console.log('准备测试环境...');
    testWarehouse = await createTestWarehouse();
    // 创建测试物料，初始库存为 1000
    testMaterial = await createTestMaterial(testWarehouse.id, 1000);
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
    '并发创建出库单并确认出库',
    async () => {
      const concurrentCount = 10; // 并发数量
      const quantityPerOrder = 50; // 每个出库单的数量

      // 创建出库单的函数
      const createOutboundOrder = async (index: number): Promise<number> => {
        const orderNo = `OUT_${Date.now()}_${index}`;

        const result: any = await transaction(async (conn) => {
          const [orderResult]: any = await conn.execute(
            `INSERT INTO inv_outbound_order (
              order_no, order_date, outbound_type,
              warehouse_id, warehouse_code, warehouse_name,
              total_qty, total_amount, operator_id, operator_name, status, create_time, update_time, deleted
            ) VALUES (?, NOW(), 'normal', ?, ?, ?, ?, 0, 1, '测试操作员', 'pending', NOW(), NOW(), 0)`,
            [
              orderNo,
              testWarehouse.id,
              testWarehouse.warehouse_code,
              testWarehouse.warehouse_name,
              quantityPerOrder,
            ]
          );

          const orderId = orderResult.insertId;

          await conn.execute(
            `INSERT INTO inv_outbound_item (
              order_id, material_id, material_name, material_spec, qty, unit, batch_no, create_time, deleted
            ) VALUES (?, ?, ?, '', ?, '个', ?, NOW(), 0)`,
            [
              orderId,
              testMaterial.id,
              testMaterial.material_name,
              quantityPerOrder,
              testMaterial.batch_no,
            ]
          );

          return orderId;
        });

        return result;
      };

      // 确认出库的函数（模拟并发扣减库存）
      const confirmOutbound = async (orderId: number): Promise<TestResult> => {
        try {
          await transaction(async (conn) => {
            // 获取出库单信息并加锁
            const [orderRows]: any = await conn.execute(
              `SELECT id, order_no, status, warehouse_id, version
               FROM inv_outbound_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
              [orderId]
            );

            if (!orderRows || orderRows.length === 0) {
              throw new Error('出库单不存在');
            }

            const order = orderRows[0];

            if (order.status !== 'pending') {
              throw new Error(`出库单状态不正确: ${order.status}`);
            }

            // 获取出库明细
            const [itemRows]: any = await conn.execute(
              `SELECT id, material_id, qty FROM inv_outbound_item WHERE order_id = ? AND deleted = 0`,
              [orderId]
            );

            for (const item of itemRows) {
              const requiredQty = parseFloat(String(item.qty));

              // 检查库存是否足够
              const [inventoryRows]: any = await conn.execute(
                `SELECT quantity, available_qty FROM inv_inventory
                 WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE`,
                [item.material_id, order.warehouse_id]
              );

              if (!inventoryRows || inventoryRows.length === 0) {
                throw new Error('库存记录不存在');
              }

              const inventory = inventoryRows[0];

              if (parseFloat(inventory.available_qty) < requiredQty) {
                throw new Error(
                  `库存不足: 需要 ${requiredQty}, 可用 ${inventory.available_qty}`
                );
              }

              // 扣减库存
              await conn.execute(
                `UPDATE inv_inventory SET
                  quantity = quantity - ?,
                  available_qty = available_qty - ?,
                  update_time = NOW()
                WHERE material_id = ? AND warehouse_id = ?`,
                [requiredQty, requiredQty, item.material_id, order.warehouse_id]
              );

              // 扣减批次库存
              await conn.execute(
                `UPDATE inv_inventory_batch SET
                  quantity = quantity - ?,
                  available_qty = available_qty - ?,
                  update_time = NOW()
                WHERE batch_no = ? AND material_id = ? AND warehouse_id = ?`,
                [
                  requiredQty,
                  requiredQty,
                  testMaterial.batch_no,
                  item.material_id,
                  order.warehouse_id,
                ]
              );
            }

            // 更新出库单状态
            await conn.execute(
              `UPDATE inv_outbound_order SET
                status = 'completed',
                audit_status = 1,
                version = version + 1,
                update_time = NOW()
              WHERE id = ?`,
              [orderId]
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

      // 步骤1: 创建多个出库单
      console.log(`\n步骤1: 创建 ${concurrentCount} 个出库单...`);
      const orderIds: number[] = [];
      for (let i = 0; i < concurrentCount; i++) {
        const orderId = await createOutboundOrder(i);
        orderIds.push(orderId);
      }
      console.log(`已创建 ${orderIds.length} 个出库单`);

      // 步骤2: 并发确认出库
      console.log(`\n步骤2: 并发确认出库...`);
      const report = await runConcurrentTest(
        '出库并发测试',
        (index) => confirmOutbound(orderIds[index]),
        concurrentCount
      );

      printTestReport(report);
      saveTestReport(report, `outbound-concurrent-${Date.now()}.json`);

      // 步骤3: 验证数据一致性
      console.log('\n步骤3: 验证数据一致性...');
      const finalInventory = await getCurrentInventory(
        testMaterial.id,
        testWarehouse.id
      );
      const expectedInventory =
        testMaterial.initial_quantity - report.successCount * quantityPerOrder;

      console.log(`初始库存: ${testMaterial.initial_quantity}`);
      console.log(`成功出库数量: ${report.successCount}`);
      console.log(`每单出库数量: ${quantityPerOrder}`);
      console.log(`预期剩余库存: ${expectedInventory}`);
      console.log(`实际剩余库存: ${finalInventory}`);

      // 验证库存不为负
      const notNegativeCheck = await verifyInventoryNotNegative(
        testMaterial.id,
        testWarehouse.id
      );
      expect(notNegativeCheck.valid).toBe(true);
      console.log(`库存不为负验证: ${notNegativeCheck.valid ? '通过' : '失败'}`);

      // 验证库存一致性
      const consistencyCheck = await verifyInventoryConsistency(
        testMaterial.id,
        testWarehouse.id,
        expectedInventory
      );
      console.log(`库存一致性验证: ${consistencyCheck.valid ? '通过' : '失败'}`);
      if (!consistencyCheck.valid) {
        console.log(`差异: ${consistencyCheck.diff}`);
      }

      // 断言
      expect(report.successCount + report.failureCount).toBe(concurrentCount);
      expect(notNegativeCheck.valid).toBe(true);
      expect(consistencyCheck.valid).toBe(true);
    },
    TEST_CONFIG.TEST_TIMEOUT * 2
  );

  it(
    '测试库存不足时的并发处理',
    async () => {
      // 创建一个新的物料，库存较少
      const lowStockMaterial = await createTestMaterial(testWarehouse.id, 100);
      const concurrentCount = 5;
      const quantityPerOrder = 30; // 每个出库单需要30，总共需要150，但库存只有100

      console.log(
        `\n测试库存不足场景: 初始库存=${lowStockMaterial.initial_quantity}, 并发请求数=${concurrentCount}, 每单数量=${quantityPerOrder}`
      );

      const createAndConfirmOutbound = async (
        index: number
      ): Promise<TestResult> => {
        try {
          const orderNo = `OUT_LOW_${Date.now()}_${index}`;

          await transaction(async (conn) => {
            // 创建出库单
            const [orderResult]: any = await conn.execute(
              `INSERT INTO inv_outbound_order (
                order_no, order_date, outbound_type,
                warehouse_id, warehouse_code, warehouse_name,
                total_qty, total_amount, operator_id, operator_name, status, create_time, update_time, deleted
              ) VALUES (?, NOW(), 'normal', ?, ?, ?, ?, 0, 1, '测试操作员', 'pending', NOW(), NOW(), 0)`,
              [
                orderNo,
                testWarehouse.id,
                testWarehouse.warehouse_code,
                testWarehouse.warehouse_name,
                quantityPerOrder,
              ]
            );

            const orderId = orderResult.insertId;

            await conn.execute(
              `INSERT INTO inv_outbound_item (
                order_id, material_id, material_name, material_spec, qty, unit, batch_no, create_time, deleted
              ) VALUES (?, ?, ?, '', ?, '个', ?, NOW(), 0)`,
              [
                orderId,
                lowStockMaterial.id,
                lowStockMaterial.material_name,
                quantityPerOrder,
                lowStockMaterial.batch_no,
              ]
            );

            // 立即确认出库
            const [orderRows]: any = await conn.execute(
              `SELECT id, order_no, status, warehouse_id, version
               FROM inv_outbound_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
              [orderId]
            );

            const order = orderRows[0];

            // 检查库存
            const [inventoryRows]: any = await conn.execute(
              `SELECT quantity, available_qty FROM inv_inventory
               WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE`,
              [lowStockMaterial.id, order.warehouse_id]
            );

            const inventory = inventoryRows[0];

            if (parseFloat(inventory.available_qty) < quantityPerOrder) {
              throw new Error(
                `库存不足: 需要 ${quantityPerOrder}, 可用 ${inventory.available_qty}`
              );
            }

            // 扣减库存
            await conn.execute(
              `UPDATE inv_inventory SET
                quantity = quantity - ?,
                available_qty = available_qty - ?,
                update_time = NOW()
              WHERE material_id = ? AND warehouse_id = ?`,
              [
                quantityPerOrder,
                quantityPerOrder,
                lowStockMaterial.id,
                order.warehouse_id,
              ]
            );

            // 更新出库单状态
            await conn.execute(
              `UPDATE inv_outbound_order SET
                status = 'completed',
                audit_status = 1,
                version = version + 1,
                update_time = NOW()
              WHERE id = ?`,
              [orderId]
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
        '库存不足并发测试',
        createAndConfirmOutbound,
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
