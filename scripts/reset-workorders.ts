/**
 * 重置生产工单数据并按规则重新生成
 * 使用方法: npx tsx scripts/reset-workorders.ts
 */

import { query, execute, transaction } from '../src/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

type DbRow = RowDataPacket & { [column: string]: unknown };

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

async function main() {
  console.log('========================================');
  console.log('重置生产工单数据');
  console.log('========================================\n');

  try {
    const result = await transaction(async (conn) => {
      const stats: Record<string, number> = {};
      const now = new Date();

      // Step 1: 软删除现有工单数据
      // prod_work_order_material_req 没有 deleted 字段，直接清空
      await conn.execute(`TRUNCATE TABLE prod_work_order_material_req`);
      // prod_work_order_item 没有 deleted 字段，直接清空
      await conn.execute(`TRUNCATE TABLE prod_work_order_item`);
      const [delWo] = await conn.execute(`UPDATE prod_work_order SET deleted = 1 WHERE deleted = 0`);
      stats.prod_work_order_deleted = (delWo as unknown as ResultSetHeader).affectedRows || 0;

      console.log(`软删除工单: ${stats.prod_work_order_deleted} 条`);

      // Step 2: 获取基础数据
      const [matRows] = await conn.execute(
        'SELECT id, material_code, material_name, specification, unit, purchase_price, sale_price FROM inv_material WHERE deleted = 0 ORDER BY id'
      );
      const materials: DbRow[] = matRows;

      const [soRows] = await conn.execute(
        'SELECT so.id, so.order_no, so.customer_id, c.customer_name, so.delivery_date, so.status ' +
        'FROM sal_order so LEFT JOIN crm_customer c ON so.customer_id = c.id AND c.deleted = 0 ' +
        'WHERE so.deleted = 0 ORDER BY so.id'
      );
      const salesOrders: DbRow[] = soRows;

      const [userRows] = await conn.execute(
        'SELECT id, username, real_name FROM sys_user WHERE deleted = 0 ORDER BY id'
      );
      const adminUser = userRows.find((u: DbRow) => (u.username as string) === 'admin') || userRows[0];
      const defaultUserId = adminUser?.id || 1;
      const defaultUserName = adminUser?.real_name || '系统';

      console.log(`\n物料数量: ${materials.length}`);
      console.log(`销售订单数量: ${salesOrders.length}`);
      console.log(`默认创建人: ${defaultUserName} (id=${defaultUserId})`);

      if (materials.length === 0 || salesOrders.length === 0) {
        console.error('\n错误: 缺少物料或销售订单数据，无法生成工单');
        process.exit(1);
      }

      // Step 3: 生成工单
      const unit = materials[0]?.unit || '个';
      const productNames = [
        '彩色标签打印机', '黑标标签打印机', '碳带', '标签纸卷',
        '热敏纸', '条码扫描枪', '标签机配件', '打印头',
        '色带架', '底纸卷'
      ];
      const statuses = ['pending', 'confirmed', 'producing', 'completed'];
      const priorities = ['urgent', 'high', 'normal', 'low'];

      // 查询已有最大工单序号，避免唯一索引冲突
      const [maxWoResult] = await conn.execute(
        `SELECT MAX(CAST(SUBSTRING_INDEX(work_order_no, '-', -1) AS UNSIGNED)) as max_no FROM prod_work_order WHERE deleted = 0`
      );
      const maxNo = Number((maxWoResult as DbRow[])?.[0]?.max_no) || 0;

      const validOrders = salesOrders.filter((so) => {
        const s = Number(so.status);
        return s >= 1 && s <= 4;
      });
      console.log(`有效销售订单数: ${validOrders.length}`);

      const woData: { id: number; work_order_no: string; order_no: string }[] = [];

      for (let i = 0; i < validOrders.length; i++) {
        const so = validOrders[i];
        const orderNo = String(so.order_no);

        // 检查是否已有该订单的工单（考虑软删除）
        const [existing] = await conn.execute(
          `SELECT COUNT(*) as cnt FROM prod_work_order WHERE order_no = ?`,
          [orderNo]
        );
        if ((existing as DbRow[])[0].cnt > 0) continue;

        const seq = maxNo + i + 1;
        const planStart = new Date(
          new Date(so.delivery_date || now).getTime() - randomInt(5, 15) * 86400000
        ).toISOString().slice(0, 10);
        const planEnd = new Date(
          new Date(planStart).getTime() + randomInt(5, 20) * 86400000
        ).toISOString().slice(0, 10);

        const status = randomItem(statuses);
        const actualStart = ['confirmed', 'producing'].includes(status) ? planStart : null;
        const actualEnd = status === 'completed'
          ? new Date(new Date(actualStart || planStart).getTime() + randomInt(3, 10) * 86400000)
              .toISOString().slice(0, 10)
          : null;

        const [woResult] = await conn.execute(
          `INSERT INTO prod_work_order
           (work_order_no, order_no, customer_name, product_name, quantity, unit, status, priority,
            plan_start_date, plan_end_date, actual_start_date, actual_end_date, create_by, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            `WO-${String(seq).padStart(5, '0')}`,
            orderNo,
            so.customer_name || '',
            productNames[i % productNames.length],
            randomInt(5000, 100000),
            unit,
            status,
            randomItem(priorities),
            planStart,
            planEnd,
            actualStart,
            actualEnd,
            defaultUserId,
          ]
        );
        const workOrderId = (woResult as unknown as ResultSetHeader).insertId;

        // 获取销售订单明细作为工单明细
        const [detailRows] = await conn.execute(
          `SELECT material_id, material_name, quantity, unit, unit_price
           FROM sal_order_detail WHERE order_id = ? AND deleted = 0`,
          [so.id]
        );
        const details = detailRows as DbRow[];

        if (details.length > 0) {
          let lineNo = 1;
          for (const detail of details) {
            const qty = Number(detail.quantity) || randomInt(1000, 20000);
            const uprice = Number(detail.unit_price) || 0.5;
            await conn.execute(
              `INSERT INTO prod_work_order_item
               (work_order_id, line_no, material_id, material_name, quantity, unit, unit_price, total_price, create_time)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                workOrderId,
                lineNo++,
                detail.material_id || null,
                detail.material_name || '',
                qty,
                detail.unit || unit,
                uprice,
                Math.round(qty * uprice * 100) / 100,
              ]
            );
          }
          stats.prod_work_order_item = (stats.prod_work_order_item || 0) + lineNo - 1;
        } else {
          // 没有明细时从物料表取一条
          const mat = materials[i % materials.length];
          const qty = randomInt(5000, 100000);
          const uprice = Number(mat.sale_price) || 0.5;
          await conn.execute(
            `INSERT INTO prod_work_order_item
             (work_order_id, line_no, material_id, material_name, quantity, unit, unit_price, total_price, create_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              workOrderId,
              1,
              mat.id,
              mat.material_name,
              qty,
              mat.unit || unit,
              uprice,
              Math.round(qty * uprice * 100) / 100,
            ]
          );
          stats.prod_work_order_item = (stats.prod_work_order_item || 0) + 1;
        }

        woData.push({
          id: workOrderId,
          work_order_no: `WO-${String(seq).padStart(5, '0')}`,
          order_no: orderNo,
        });
      }

      stats.prod_work_order = woData.length;
      return stats;
    });

    console.log('\n========================================');
    console.log('工单数据重新生成完成');
    console.log('========================================');
    console.log(JSON.stringify(result, null, 2));

  } catch (error: any) {
    console.error('\n执行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
