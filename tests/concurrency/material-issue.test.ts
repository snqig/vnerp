/**
 * 领料并发测试
 * 测试多个领料单同时领料的场景
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

describe('领料并发测试', () => {
  let testWarehouse: TestWarehouse;
  let testMaterial: TestMaterial;

  // 测试前准备
  beforeAll(async () => {
    console.log('准备测试环境...');
    testWarehouse = await createTestWarehouse();
    // 创建测试物料，初始库存为 800
    testMaterial = await createTestMaterial(testWarehouse.id, 800);
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
    '并发创建和执行领料',
    async () => {
      const concurrentCount = 8; // 并发数量
      const quantityPerIssue = 60; // 每个领料单的数量

      // 创建领料单的函数
      const createMaterialIssue = async (index: number): Promise<number> => {
        const issueNo = `MR_${Date.now()}_${index}`;

        // 先创建一个测试工单
        const [woResult]: any = await execute(
          `INSERT INTO prod_work_order (order_no, status, create_time, update_time, deleted)
           VALUES (?, 1, NOW(), NOW(), 0)`,
          [`WO_${Date.now()}_${index}`]
        );
        const workOrderId = woResult.insertId;

        const result: any = await transaction(async (conn) => {
          // 创建领料单主表
          const [issueResult]: any = await conn.execute(
            `INSERT INTO prd_material_issue (
              issue_no, work_order_id, work_order_no, warehouse_id,
              issue_date, issue_type, status, operator_id, operator_name,
              create_time, update_time, deleted
            ) VALUES (?, ?, '', ?, NOW(), 1, 1, 1, '测试操作员', NOW(), NOW(), 0)`,
            [issueNo, workOrderId, testWarehouse.id]
          );

          const issueId = issueResult.insertId;

          // 创建领料明细
          await conn.execute(
            `INSERT INTO prd_material_issue_item (
              issue_id, material_id, material_code, material_name,
              required_qty, issued_qty, unit, batch_no, create_time
            ) VALUES (?, ?, '', ?, ?, 0, '个', ?, NOW())`,
            [
              issueId,
              testMaterial.id,
              testMaterial.material_name,
              quantityPerIssue,
              testMaterial.batch_no,
            ]
          );

          return issueId;
        });

        return result;
      };

      // 执行领料的函数
      const issueMaterial = async (issueId: number): Promise<TestResult> => {
        try {
          await transaction(async (conn) => {
            // 获取领料单信息并加锁
            const [issueRows]: any = await conn.execute(
              `SELECT id, issue_no, status, warehouse_id FROM prd_material_issue WHERE id = ? AND deleted = 0 FOR UPDATE`,
              [issueId]
            );

            if (!issueRows || issueRows.length === 0) {
              throw new Error('领料单不存在');
            }

            const issue = issueRows[0];

            if (issue.status !== 1) {
              throw new Error(`领料单状态不正确: ${issue.status}`);
            }

            // 获取领料明细
            const [itemRows]: any = await conn.execute(
              `SELECT id, material_id, required_qty FROM prd_material_issue_item WHERE issue_id = ?`,
              [issueId]
            );

            for (const item of itemRows) {
              const requiredQty = parseFloat(String(item.required_qty));

              // 检查库存是否足够
              const [inventoryRows]: any = await conn.execute(
                `SELECT quantity, available_qty FROM inv_inventory
                 WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE`,
                [item.material_id, issue.warehouse_id]
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
                [requiredQty, requiredQty, item.material_id, issue.warehouse_id]
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
                  issue.warehouse_id,
                ]
              );

              // 更新领料明细
              await conn.execute(
                `UPDATE prd_material_issue_item SET issued_qty = ? WHERE id = ?`,
                [requiredQty, item.id]
              );
            }

            // 更新领料单状态
            await conn.execute(
              `UPDATE prd_material_issue SET status = 2, update_time = NOW() WHERE id = ?`,
              [issueId]
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

      // 步骤1: 创建多个领料单
      console.log(`\n步骤1: 创建 ${concurrentCount} 个领料单...`);
      const issueIds: number[] = [];
      for (let i = 0; i < concurrentCount; i++) {
        const issueId = await createMaterialIssue(i);
        issueIds.push(issueId);
      }
      console.log(`已创建 ${issueIds.length} 个领料单`);

      // 步骤2: 并发执行领料
      console.log(`\n步骤2: 并发执行领料...`);
      const report = await runConcurrentTest(
        '领料并发测试',
        (index) => issueMaterial(issueIds[index]),
        concurrentCount
      );

      printTestReport(report);
      saveTestReport(report, `material-issue-${Date.now()}.json`);

      // 步骤3: 验证数据一致性
      console.log('\n步骤3: 验证数据一致性...');
      const finalInventory = await getCurrentInventory(
        testMaterial.id,
        testWarehouse.id
      );
      const expectedInventory =
        testMaterial.initial_quantity - report.successCount * quantityPerIssue;

      console.log(`初始库存: ${testMaterial.initial_quantity}`);
      console.log(`成功领料数量: ${report.successCount}`);
      console.log(`每单领料数量: ${quantityPerIssue}`);
      console.log(`预期剩余库存: ${expectedInventory}`);
      console.log(`实际剩余库存: ${finalInventory}`);

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
    '测试领料库存不足时的并发处理',
    async () => {
      // 创建一个新的物料，库存较少
      const lowStockMaterial = await createTestMaterial(testWarehouse.id, 150);
      const concurrentCount = 5;
      const quantityPerIssue = 40; // 每个领料单需要40，总共需要200，但库存只有150

      console.log(
        `\n测试领料库存不足场景: 初始库存=${lowStockMaterial.initial_quantity}, 并发请求数=${concurrentCount}, 每单数量=${quantityPerIssue}`
      );

      const createAndIssueMaterial = async (
        index: number
      ): Promise<TestResult> => {
        try {
          const issueNo = `MR_LOW_${Date.now()}_${index}`;

          await transaction(async (conn) => {
            // 创建工单
            const [woResult]: any = await conn.execute(
              `INSERT INTO prod_work_order (order_no, status, create_time, update_time, deleted)
               VALUES (?, 1, NOW(), NOW(), 0)`,
              [`WO_LOW_${Date.now()}_${index}`]
            );
            const workOrderId = woResult.insertId;

            // 创建领料单
            const [issueResult]: any = await conn.execute(
              `INSERT INTO prd_material_issue (
                issue_no, work_order_id, work_order_no, warehouse_id,
                issue_date, issue_type, status, operator_id, operator_name,
                create_time, update_time, deleted
              ) VALUES (?, ?, '', ?, NOW(), 1, 1, 1, '测试操作员', NOW(), NOW(), 0)`,
              [issueNo, workOrderId, testWarehouse.id]
            );

            const issueId = issueResult.insertId;

            // 创建领料明细
            await conn.execute(
              `INSERT INTO prd_material_issue_item (
                issue_id, material_id, material_code, material_name,
                required_qty, issued_qty, unit, batch_no, create_time
              ) VALUES (?, ?, '', ?, ?, 0, '个', ?, NOW())`,
              [
                issueId,
                lowStockMaterial.id,
                lowStockMaterial.material_name,
                quantityPerIssue,
                lowStockMaterial.batch_no,
              ]
            );

            // 立即执行领料
            const [issueRows]: any = await conn.execute(
              `SELECT id, issue_no, status, warehouse_id FROM prd_material_issue WHERE id = ? AND deleted = 0 FOR UPDATE`,
              [issueId]
            );

            const issue = issueRows[0];

            // 检查库存
            const [inventoryRows]: any = await conn.execute(
              `SELECT quantity, available_qty FROM inv_inventory
               WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE`,
              [lowStockMaterial.id, issue.warehouse_id]
            );

            const inventory = inventoryRows[0];

            if (parseFloat(inventory.available_qty) < quantityPerIssue) {
              throw new Error(
                `库存不足: 需要 ${quantityPerIssue}, 可用 ${inventory.available_qty}`
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
                quantityPerIssue,
                quantityPerIssue,
                lowStockMaterial.id,
                issue.warehouse_id,
              ]
            );

            // 更新领料单状态
            await conn.execute(
              `UPDATE prd_material_issue SET status = 2, update_time = NOW() WHERE id = ?`,
              [issueId]
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
        '领料库存不足并发测试',
        createAndIssueMaterial,
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
