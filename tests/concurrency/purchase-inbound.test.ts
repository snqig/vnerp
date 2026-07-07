/**
 * 采购入库并发测试
 * 测试超收校验并发场景
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

// P0-2 基线重置已完成（Migration 019）：inv_inbound_order.operator_id/operator_name/warehouse_code/warehouse_name 已补齐
// 表名映射：po_purchase_order → pur_purchase_order，po_purchase_order_item → pur_purchase_order_line
describe('采购入库并发测试', () => {
  let testWarehouse: TestWarehouse;
  let testMaterial: TestMaterial;

  // 测试前准备
  beforeAll(async () => {
    console.log('准备测试环境...');
    testWarehouse = await createTestWarehouse();
    // 创建测试物料，初始库存为 0
    testMaterial = await createTestMaterial(testWarehouse.id, 0);
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
    '并发创建采购入库单并审核',
    async () => {
      const concurrentCount = 6; // 并发数量
      const quantityPerInbound = 100; // 每个入库单的数量

      // 创建入库单的函数
      const createInboundOrder = async (index: number): Promise<number> => {
        const orderNo = `IN_${Date.now()}_${index}`;
        const poNo = `PO_${Date.now()}_${index}`;

        const result: any = await transaction(async (conn) => {
          // 创建采购订单（实际表名 pur_purchase_order）
          const [poResult]: any = await conn.execute(
            `INSERT INTO pur_purchase_order (
              po_no, supplier_id, supplier_name, order_date, status, total_amount,
              create_time, update_time, deleted
            ) VALUES (?, 1, '测试供应商', NOW(), 2, 0, NOW(), NOW(), 0)`,
            [poNo]
          );
          const poId = poResult.insertId;

          // 创建采购订单明细（实际表名 pur_purchase_order_line）
          await conn.execute(
            `INSERT INTO pur_purchase_order_line (
              po_id, line_no, material_id, material_code, material_name, order_qty, unit_price,
              received_qty, create_time
            ) VALUES (?, 1, ?, ?, ?, ?, 0, 0, NOW())`,
            [poId, testMaterial.id, testMaterial.material_code, testMaterial.material_name, quantityPerInbound]
          );

          // 创建入库单
          const [inboundResult]: any = await conn.execute(
            `INSERT INTO inv_inbound_order (
              order_no, inbound_date, order_type, supplier_id, supplier_name,
              warehouse_id, warehouse_code, warehouse_name,
              total_quantity, total_amount, status, operator_id, operator_name,
              create_time, update_time, deleted
            ) VALUES (?, NOW(), 'purchase', 1, '测试供应商', ?, ?, ?, ?, 0, 'pending', 1, '测试操作员', NOW(), NOW(), 0)`,
            [
              orderNo,
              testWarehouse.id,
              testWarehouse.warehouse_code,
              testWarehouse.warehouse_name,
              quantityPerInbound,
            ]
          );

          const inboundId = inboundResult.insertId;

          // 创建入库明细
          await conn.execute(
            `INSERT INTO inv_inbound_item (
              order_id, material_id, material_name, material_spec,
              batch_no, quantity, unit, unit_price, warehouse_location,
              produce_date, create_time, deleted
            ) VALUES (?, ?, ?, '', ?, ?, '个', 0, '', NULL, NOW(), 0)`,
            [
              inboundId,
              testMaterial.id,
              testMaterial.material_name,
              `BATCH_IN_${Date.now()}_${index}`,
              quantityPerInbound,
            ]
          );

          return { inboundId, poId };
        });

        return result.inboundId;
      };

      // 审核入库单的函数
      const approveInbound = async (inboundId: number): Promise<TestResult> => {
        try {
          await transaction(async (conn) => {
            // 获取入库单信息并加锁
            const [inboundRows]: any = await conn.execute(
              `SELECT id, order_no, status, warehouse_id
               FROM inv_inbound_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
              [inboundId]
            );

            if (!inboundRows || inboundRows.length === 0) {
              throw new Error('入库单不存在');
            }

            const inbound = inboundRows[0];

            if (inbound.status !== 'pending') {
              throw new Error(`入库单状态不正确: ${inbound.status}`);
            }

            // 获取入库明细
            const [itemRows]: any = await conn.execute(
              `SELECT id, material_id, material_name, batch_no, quantity
               FROM inv_inbound_item WHERE order_id = ? AND deleted = 0`,
              [inboundId]
            );

            for (const item of itemRows) {
              const qty = parseFloat(String(item.quantity));

              // 检查是否已存在该批次的库存
              const [existingBatch]: any = await conn.execute(
                `SELECT id, quantity FROM inv_inventory_batch
                 WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0
                 FOR UPDATE`,
                [item.batch_no, item.material_id, inbound.warehouse_id]
              );

              if (existingBatch && existingBatch.length > 0) {
                // 批次已存在，增加数量
                await conn.execute(
                  `UPDATE inv_inventory_batch SET
                    quantity = quantity + ?,
                    available_qty = available_qty + ?,
                    update_time = NOW()
                  WHERE id = ?`,
                  [qty, qty, existingBatch[0].id]
                );
              } else {
                // 创建新批次
                await conn.execute(
                  `INSERT INTO inv_inventory_batch (
                    batch_no, material_id, material_name, warehouse_id, quantity, available_qty,
                    status, create_time, update_time, deleted
                  ) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), 0)`,
                  [item.batch_no, item.material_id, '测试物料', inbound.warehouse_id, qty, qty]
                );
              }

              // 检查是否已存在该物料的库存记录
              const [existingInventory]: any = await conn.execute(
                `SELECT id, quantity, available_qty FROM inv_inventory
                 WHERE material_id = ? AND warehouse_id = ? AND deleted = 0
                 FOR UPDATE`,
                [item.material_id, inbound.warehouse_id]
              );

              if (existingInventory && existingInventory.length > 0) {
                // 更新库存
                await conn.execute(
                  `UPDATE inv_inventory SET
                    quantity = quantity + ?,
                    available_qty = available_qty + ?,
                    update_time = NOW()
                  WHERE id = ?`,
                  [qty, qty, existingInventory[0].id]
                );
              } else {
                // 创建库存记录
                await conn.execute(
                  `INSERT INTO inv_inventory (
                    material_id, warehouse_id, quantity, available_qty, batch_no,
                    create_time, update_time, deleted
                  ) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
                  [
                    item.material_id,
                    inbound.warehouse_id,
                    qty,
                    qty,
                    item.batch_no,
                  ]
                );
              }

              // 记录库存流水
              await conn.execute(
                `INSERT INTO inv_inventory_log (
                  material_id, warehouse_id, change_qty, change_type,
                  order_no, remark, create_time
                ) VALUES (?, ?, ?, 'INBOUND', ?, ?, NOW())`,
                [item.material_id, inbound.warehouse_id, qty, inbound.order_no, '采购入库']
              );
            }

            // 更新入库单状态
            await conn.execute(
              `UPDATE inv_inbound_order SET
                status = 'completed',
                update_time = NOW()
              WHERE id = ?`,
              [inboundId]
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

      // 步骤1: 创建多个入库单
      console.log(`\n步骤1: 创建 ${concurrentCount} 个入库单...`);
      const inboundIds: number[] = [];
      for (let i = 0; i < concurrentCount; i++) {
        const inboundId = await createInboundOrder(i);
        inboundIds.push(inboundId);
      }
      console.log(`已创建 ${inboundIds.length} 个入库单`);

      // 步骤2: 并发审核入库单
      console.log(`\n步骤2: 并发审核入库单...`);
      const report = await runConcurrentTest(
        '采购入库并发测试',
        (index) => approveInbound(inboundIds[index]),
        concurrentCount
      );

      printTestReport(report);
      saveTestReport(report, `purchase-inbound-${Date.now()}.json`);

      // 步骤3: 验证数据一致性
      console.log('\n步骤3: 验证数据一致性...');
      const finalInventory = await getCurrentInventory(
        testMaterial.id,
        testWarehouse.id
      );
      const expectedInventory = report.successCount * quantityPerInbound;

      console.log(`初始库存: ${testMaterial.initial_quantity}`);
      console.log(`成功入库数量: ${report.successCount}`);
      console.log(`每单入库数量: ${quantityPerInbound}`);
      console.log(`预期库存: ${expectedInventory}`);
      console.log(`实际库存: ${finalInventory}`);

      // 验证库存不为负
      const notNegativeCheck = await verifyInventoryNotNegative(
        testMaterial.id,
        testWarehouse.id
      );
      expect(notNegativeCheck.valid).toBe(true);
      console.log(`库存不为负验证: ${notNegativeCheck.valid ? '通过' : '失败'}`);

      // 验证库存数量正确
      expect(Math.abs(finalInventory - expectedInventory)).toBeLessThan(0.01);

      // 断言
      expect(report.successCount + report.failureCount).toBe(concurrentCount);
      expect(notNegativeCheck.valid).toBe(true);
    },
    TEST_CONFIG.TEST_TIMEOUT * 2
  );

  it(
    '测试超收校验并发',
    async () => {
      // 创建一个新的物料
      const testMat = await createTestMaterial(testWarehouse.id, 0);
      const concurrentCount = 4;
      const poQuantity = 100; // 采购订单数量
      const inboundQuantity = 120; // 入库数量（超收）

      console.log(
        `\n测试超收校验场景: 采购订单数量=${poQuantity}, 入库数量=${inboundQuantity}, 并发数=${concurrentCount}`
      );

      const createInboundWithOverReceive = async (
        index: number
      ): Promise<TestResult> => {
        try {
          const orderNo = `IN_OVER_${Date.now()}_${index}`;
          const poNo = `PO_OVER_${Date.now()}_${index}`;

          await transaction(async (conn) => {
            // 创建采购订单
            const [poResult]: any = await conn.execute(
              `INSERT INTO po_purchase_order (
                order_no, supplier_id, supplier_name, status, total_amount,
                operator_id, operator_name, create_time, update_time, deleted
              ) VALUES (?, 1, '测试供应商', 2, 0, 1, '测试操作员', NOW(), NOW(), 0)`,
              [poNo]
            );
            const poId = poResult.insertId;

            // 创建采购订单明细
            await conn.execute(
              `INSERT INTO po_purchase_order_item (
                order_id, material_id, material_name, quantity, unit_price,
                received_qty, create_time
              ) VALUES (?, ?, ?, ?, 0, 0, NOW())`,
              [poId, testMat.id, testMat.material_name, poQuantity]
            );

            // 创建入库单（超收）
            const [inboundResult]: any = await conn.execute(
              `INSERT INTO inv_inbound_order (
                order_no, inbound_date, order_type, supplier_id, supplier_name,
                warehouse_id, warehouse_code, warehouse_name,
                total_quantity, total_amount, status, operator_id, operator_name,
                create_time, update_time, deleted
              ) VALUES (?, NOW(), 'purchase', 1, '测试供应商', ?, ?, ?, ?, 0, 'pending', 1, '测试操作员', NOW(), NOW(), 0)`,
              [
                orderNo,
                testWarehouse.id,
                testWarehouse.warehouse_code,
                testWarehouse.warehouse_name,
                inboundQuantity,
              ]
            );

            const inboundId = inboundResult.insertId;

            // 创建入库明细
            await conn.execute(
              `INSERT INTO inv_inbound_item (
                order_id, material_id, material_name, material_spec,
                batch_no, quantity, unit, unit_price, warehouse_location,
                produce_date, create_time, deleted
              ) VALUES (?, ?, ?, '', ?, ?, '个', 0, '', NULL, NOW(), 0)`,
              [
                inboundId,
                testMat.id,
                testMat.material_name,
                `BATCH_OVER_${Date.now()}_${index}`,
                inboundQuantity,
              ]
            );

            // 获取入库单信息
            const [inboundRows]: any = await conn.execute(
              `SELECT id, order_no, status, warehouse_id FROM inv_inbound_order WHERE id = ? AND deleted = 0 FOR UPDATE`,
              [inboundId]
            );

            const inbound = inboundRows[0];

            // 获取入库明细
            const [itemRows]: any = await conn.execute(
              `SELECT id, material_id, quantity FROM inv_inbound_item WHERE order_id = ? AND deleted = 0`,
              [inboundId]
            );

            for (const item of itemRows) {
              const qty = parseFloat(String(item.quantity));

              // 超收校验：检查是否超过采购订单数量
              // 获取该物料在该采购订单下的已入库数量
              const [receivedRows]: any = await conn.execute(
                `SELECT COALESCE(SUM(ii.quantity), 0) as total_received
                 FROM inv_inbound_item ii
                 JOIN inv_inbound_order io ON ii.order_id = io.id
                 WHERE ii.material_id = ? AND io.status = 'completed' AND io.deleted = 0`,
                [item.material_id]
              );

              const totalReceived = parseFloat(receivedRows[0]?.total_received || 0);

              // 检查超收（允许10%的超收）
              const maxAllowed = poQuantity * 1.1;
              if (totalReceived + qty > maxAllowed) {
                throw new Error(
                  `超收校验失败: 已入库 ${totalReceived}, 本次入库 ${qty}, 最大允许 ${maxAllowed}`
                );
              }

              // 创建库存记录
              const [existingInventory]: any = await conn.execute(
                `SELECT id, quantity FROM inv_inventory
                 WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE`,
                [item.material_id, inbound.warehouse_id]
              );

              if (existingInventory && existingInventory.length > 0) {
                await conn.execute(
                  `UPDATE inv_inventory SET
                    quantity = quantity + ?,
                    available_qty = available_qty + ?,
                    update_time = NOW()
                  WHERE id = ?`,
                  [qty, qty, existingInventory[0].id]
                );
              } else {
                await conn.execute(
                  `INSERT INTO inv_inventory (
                    material_id, warehouse_id, quantity, available_qty,
                    create_time, update_time, deleted
                  ) VALUES (?, ?, ?, ?, NOW(), NOW(), 0)`,
                  [item.material_id, inbound.warehouse_id, qty, qty]
                );
              }
            }

            // 更新入库单状态
            await conn.execute(
              `UPDATE inv_inbound_order SET
                status = 'completed',
                update_time = NOW()
              WHERE id = ?`,
              [inboundId]
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
        '超收校验并发测试',
        createInboundWithOverReceive,
        concurrentCount
      );

      printTestReport(report);

      // 验证库存不为负
      const notNegativeCheck = await verifyInventoryNotNegative(
        testMat.id,
        testWarehouse.id
      );
      expect(notNegativeCheck.valid).toBe(true);

      console.log(`\n结果分析:`);
      console.log(`- 成功数量: ${report.successCount}`);
      console.log(`- 失败数量: ${report.failureCount}`);
      console.log(`- 最终库存: ${notNegativeCheck.quantity}`);
      console.log(`- 库存不为负: ${notNegativeCheck.valid ? '是' : '否'}`);

      // 清理
      await cleanupTestMaterial(testMat.id);
    },
    TEST_CONFIG.TEST_TIMEOUT
  );
});
