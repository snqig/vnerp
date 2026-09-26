import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getShPrefix, generateDocNo } from '@/lib/global-config';
import { toLocalDateStr } from '@/lib/date-utils';
import type { UserInfo } from '@/lib/auth';

// POST /api/sales/delivery/re-ship - 提交补发申请（符合设计文档 5.4 节）
//
// 原实现写的是 `shipments` / `shipment_items` 两张表，库里根本不存在；发货单的真实表是
// sal_delivery / sal_delivery_detail。字段映射关系：
//   shipments.shipment_no            -> sal_delivery.delivery_no
//   shipments.sales_order_id         -> sal_delivery.order_id
//   shipments.total_quantity         -> sal_delivery.total_qty
//   shipments.parent_shipment_id     -> 无对应列，补记在 remark 里
//   shipment_items.specification    -> sal_delivery_detail.material_spec
// 另外 sal_delivery 的状态是「1-待发货 / 2-已发货 / 3-已签收 / 9-已取消」，
// 原代码写的 status=2 是「已发货」，与「新建补发单待处理」的语义不符，这里改回 1。
export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { parent_shipment_id, quantity, reason } = body;

    if (!parent_shipment_id) {
      return errorResponse(ts('k_vfor59'), 400, 400);
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      return errorResponse(ts('k_9xle0h'), 400, 400);
    }

    // 查询原发货单
    const parentShipment = await queryOne(
      `SELECT id, order_id, order_no, customer_id, customer_name, warehouse_id
       FROM sal_delivery WHERE id = ? AND deleted = 0`,
      [parent_shipment_id]
    );

    if (!parentShipment) {
      return commonErrors.notFound(ts('k_19jajgk'));
    }

    // 创建补发发货单
    const deliveryNo = generateDocNo(getShPrefix());
    const remark = `补发自发货单 ${parentShipment.delivery_no || parent_shipment_id}：${reason || `客户反馈问题，补发${quantity}件`}`;

    const result = await execute(
      `INSERT INTO sal_delivery (
      delivery_no, order_id, order_no,
      customer_id, customer_name, warehouse_id,
      delivery_date, total_qty, status, remark,
      create_by, create_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW())`,
      [
        deliveryNo,
        parentShipment.order_id ?? null,
        parentShipment.order_no ?? null,
        parentShipment.customer_id ?? null,
        parentShipment.customer_name ?? null,
        parentShipment.warehouse_id ?? null,
        toLocalDateStr(),
        Number(quantity) || 0,
        remark,
        userInfo?.userId ?? null,
      ]
    );

    // 复制原发货单的第一个产品作为补发对象
    const parentItems = await query(
      `SELECT material_id, material_name, material_spec, quantity, unit
       FROM sal_delivery_detail WHERE delivery_id = ? AND deleted = 0`,
      [parent_shipment_id]
    );

    if (parentItems.length > 0) {
      const item = parentItems[0];
      await execute(
        `INSERT INTO sal_delivery_detail (
        delivery_id, line_no, material_id, material_name, material_spec,
        quantity, unit, remark, create_time
      ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          result.insertId,
          item.material_id ?? null,
          item.material_name ?? '',
          item.material_spec ?? '',
          Math.min(Number(quantity) || 0, Number(item.quantity) || 0),
          item.unit ?? '',
          remark,
        ]
      );
    }

    return successResponse(
      {
        id: result.insertId,
        delivery_no: deliveryNo,
        type: 're_ship',
        status: 1, // 待发货
      },
      ts('k_e5e7ic')
    );
  },
  { logTitle: '提交补发申请', logType: 'business' }
);
