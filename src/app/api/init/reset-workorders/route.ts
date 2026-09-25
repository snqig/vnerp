import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { transaction, SqlValue } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
import type { DbRow, DbResultSetHeader } from '@/types/db';

function pad(n: number, len: number = 3): string {
  return String(n).padStart(len, '0');
}

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().slice(0, 10);
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const POST = withPermission(async (_request: NextRequest) => {
  const ts = await getTranslations('Common');
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // ===== 1. 软删除现有工单及关联数据 =====
    await conn.execute(`UPDATE prod_work_order_material_req SET deleted = 1 WHERE deleted = 0`);
    stats.prod_work_order_material_req = 0;
    await conn.execute(`UPDATE prod_work_order_item SET deleted = 1 WHERE deleted = 0`);
    stats.prod_work_order_item = 0;
    const delResult = (await conn.execute<DbResultSetHeader>(`UPDATE prod_work_order SET deleted = 1 WHERE deleted = 0`)) as unknown as DbResultSetHeader;
    stats.prod_work_order_deleted = delResult.affectedRows || 0;

    // ===== 2. 获取基础数据 =====
    const [custRows] = await conn.execute(
      'SELECT id, customer_code, customer_name FROM crm_customer ORDER BY id'
    );
    const customers: DbRow[] = custRows;

    const [matRows] = await conn.execute(
      'SELECT id, material_code, material_name, specification, unit, purchase_price, sale_price FROM inv_material ORDER BY id'
    );
    const materials: DbRow[] = matRows;

    const [soRows] = await conn.execute(
      'SELECT so.id, so.order_no, so.customer_id, c.customer_name, so.delivery_date, so.status FROM sal_order so LEFT JOIN crm_customer c ON so.customer_id = c.id WHERE so.deleted = 0 ORDER BY so.id'
    );
    const salesOrders: DbRow[] = soRows;

    const [userRows] = await conn.execute(
      'SELECT id, username, real_name FROM sys_user WHERE deleted=0 ORDER BY id'
    );
    const adminUser = userRows.find((u: DbRow) => u.username === 'admin') || userRows[0];
    const defaultUserId = adminUser?.id || 1;
    const defaultUserName = adminUser?.real_name || ts('k_1csar6s');

    if (customers.length === 0 || materials.length === 0 || salesOrders.length === 0) {
      throw new Error(ts('k_h2iibm'));
    }

    const unit = ts('k_accfpb');
    const productNames = [
      ts('k_1085ar9'), ts('k_1d31fut'), ts('k_1u8tdc0'), ts('k_hd09uq'),
      ts('k_e0f7iv'), ts('k_18cwdu4'), ts('k_kbbj1u'), ts('k_4nmn45'),
      ts('k_1yfxa7v'), ts('k_1b6876z'),
    ];
    const statuses = ['pending', 'confirmed', 'producing', 'completed'];
    const priorities = ['urgent', 'high', 'normal', 'low'];

    // ===== 3. 为每个有效销售订单生成工单 =====
    const woData: DbRow[] = [];
    const validOrders = salesOrders.filter((so) => {
      const s = Number(so.status);
      return s >= 1 && s <= 4;
    });

    for (let i = 0; i < validOrders.length; i++) {
      const so = validOrders[i];
      const orderNo = String(so.order_no);

      // 检查是否已有有效工单
      const [existing] = await conn.execute(
        `SELECT COUNT(*) as cnt FROM prod_work_order WHERE order_no = ? AND deleted = 0`,
        [orderNo]
      );
      if ((existing as DbRow[])[0]?.cnt && Number((existing as DbRow[])[0].cnt ?? 0) > 0) continue;

      const planStart = new Date(
        new Date(String(so.delivery_date || now)).getTime() - randomInt(5, 15) * 86400000
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

      const woResult = (await conn.execute<DbResultSetHeader>(
        `INSERT INTO prod_work_order
         (work_order_no, order_no, customer_name, product_name, quantity, unit, status, priority,
          plan_start_date, plan_end_date, actual_start_date, actual_end_date, create_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `WO-${pad(i + 1, 5)}`,
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
      )) as unknown as DbResultSetHeader;
      const workOrderId = woResult.insertId;

      // 获取销售订单明细作为工单物料
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
        // 无明细时插入一条默认物料
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
        work_order_no: `WO-${pad(i + 1, 5)}`,
        order_no: orderNo,
      });
    }

    stats.prod_work_order = woData.length;
    return stats;
  });

  return successResponse(result);
}, {});
