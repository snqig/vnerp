import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody
} from '@/lib/api-response';
import { getShPrefix, generateDocNo } from '@/lib/global-config';

// ============================================================
// 发货类型定义（符合设计文档 3.1 节）
// ============================================================
export type ShipmentType = 'normal' | 'partial' | 'return' | 're_ship';

// 发货状态定义（符合设计文档 4.1 节）
export type ShipmentStatus = 'draft' | 'pending' | 'ready' | 'partial' | 'shipped' | 'cancelled';

// ============================================================
// 数据接口定义（符合设计文档第4节数据结构）
// ============================================================

// 发货单主表接口（shipments 表）
export interface Shipment {
  id?: number;
  shipment_no: string;                    // 格式：SH+YYYYMMDD+4位序号
  sales_order_id: number;                // 关联销售订单 ID
  type: ShipmentType;                    // 发货类型：normal/partial/return/re_ship
  status: number;                        // 状态：1=草稿 2=待审批 3=待发货 4=部分发货 5=已发货 6=已取消
  customer_id: number;                   // 客户 ID
  customer_name?: string;                // 客户名称（冗余字段）
  warehouse_id: number;                  // 仓库 ID
  total_quantity: number;                // 发货总数量
  shipped_quantity: number;              // 已发货数量
  logistics_company?: string;            // 物流公司
  tracking_no?: string;                  // 物流单号
  applicant_id?: number;                 // 申请人 ID
  approver_id?: number;                  // 审批人 ID
  ship_time?: string;                    // 发货时间
  remark?: string;                       // 备注
  parent_shipment_id?: number;           // 父发货单 ID（补发时关联）
  create_time?: string;
  update_time?: string;
}

// 发货单明细表接口（shipment_items 表）
export interface ShipmentItem {
  id?: number;
  shipment_id: number;                   // 发货单 ID
  material_id: number;                   // 成品 ID
  material_name?: string;                // 成品名称
  specification?: string;                // 规格
  quantity: number;                      // 发货数量
  shipped_quantity: number;              // 已发货数量
  unit?: string;                         // 单位
  qr_code?: string;                      // 成品二维码编码
  batch_no?: string;                     // 成品批次号
  warehouse_location?: string;           // 库位
}

// FIFO 推荐结果接口
interface FIFORecommendation {
  material_id: number;
  material_name: string;
  quantity: number;
  recommended_batches: Array<{
    inventory_id: number;
    batch_no: string;
    qr_code: string;
    available_quantity: number;
    recommended_quantity: number;
    inbound_date: string;
    warehouse_location: string;
  }>;
}

// ============================================================
// 常量定义
// ============================================================

// 发货类型映射
const SHIPMENT_TYPE_MAP: Record<ShipmentType, { label: string; code: string }> = {
  normal: { label: '正常发货', code: 'normal' },
  partial: { label: '部分发货', code: 'partial' },
  return: { label: '退货发货', code: 'return' },
  re_ship: { label: '补发发货', code: 're_ship' },
};

// 发货状态映射（符合设计文档 4.1 节）
const SHIPMENT_STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '草稿', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  2: { label: '待审批', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  3: { label: '待发货', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  4: { label: '部分发货', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  5: { label: '已发货', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  6: { label: '已取消', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

// ============================================================
// 工具函数
// ============================================================

// 生成发货单编号（符合设计文档格式：SH+YYYYMMDD+4位序号）
function generateShipmentNo(): string {
  return generateDocNo(getShPrefix());
}

// FIFO 先进先出算法（符合设计文档核心原则）
async function getFIFORecommendation(
  materialId: number,
  requiredQuantity: number
): Promise<FIFORecommendation> {
  // 查询该成品的库存批次，按入库时间升序排列（先进先出）
  const batches = await query<any>(
    `SELECT
      i.id as inventory_id,
      i.batch_no,
      i.qr_code,
      i.quantity as available_quantity,
      i.inbound_date,
      i.warehouse_location,
      m.material_name
    FROM wh_inventory i
    LEFT JOIN bas_material m ON i.material_id = m.id
    WHERE i.material_id = ?
      AND i.quantity > 0
      AND i.status = 1
    ORDER BY i.inbound_date ASC`,
    [materialId]
  );

  const recommendedBatches: any[] = [];
  let remainingQuantity = requiredQuantity;

  for (const batch of batches) {
    if (remainingQuantity <= 0) break;

    const recommendQty = Math.min(batch.available_quantity, remainingQuantity);
    recommendedBatches.push({
      inventory_id: batch.inventory_id,
      batch_no: batch.batch_no,
      qr_code: batch.qr_code,
      available_quantity: batch.available_quantity,
      recommended_quantity: recommendQty,
      inbound_date: batch.inbound_date,
      warehouse_location: batch.warehouse_location,
    });

    remainingQuantity -= recommendQty;
  }

  return {
    material_id: materialId,
    material_name: batches[0]?.material_name || '',
    quantity: requiredQuantity,
    recommended_batches: recommendedBatches,
  };
}

// 验证二维码是否有效且可发货
async function validateQRCodeForShipping(qrCode: string, shipmentId: number): Promise<{
  valid: boolean;
  error?: string;
  data?: any;
}> {
  // 查询二维码记录
  const qrRecord = await queryOne<any>(
    `SELECT * FROM qrcode_record WHERE qr_code = ? AND deleted = 0`,
    [qrCode]
  );

  if (!qrRecord) {
    return { valid: false, error: '二维码不存在' };
  }

  // 检查是否已发货
  if (qrRecord.status === 'shipped') {
    return { valid: false, error: '该成品已发货' };
  }

  // 检查是否与发货单关联的成品一致
  const shipmentItems = await query<any>(
    `SELECT * FROM shipment_items WHERE shipment_id = ?`,
    [shipmentId]
  );

  const itemExists = shipmentItems.some(
    (item) => item.material_id === qrRecord.material_id
  );

  if (!itemExists) {
    return { valid: false, error: '成品信息与发货单不符' };
  }

  return { valid: true, data: qrRecord };
}

// ============================================================
// GET - 获取发货单列表或详情
// ============================================================
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const salesOrderId = searchParams.get('sales_order_id');
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  // 查询单个发货单
  if (id) {
    const shipment = await queryOne<Shipment>(
      `SELECT * FROM shipments WHERE id = ? AND deleted = 0`,
      [parseInt(id)]
    );

    if (!shipment) {
      return commonErrors.notFound('发货单不存在');
    }

    // 查询发货单明细
    const items = await query<ShipmentItem>(
      `SELECT * FROM shipment_items WHERE shipment_id = ?`,
      [parseInt(id)]
    );

    return successResponse({
      ...shipment,
      items,
    });
  }

  // 根据销售订单ID查询发货单（符合设计文档 5.1 节）
  if (salesOrderId) {
    const shipments = await query<Shipment>(
      `SELECT s.*, c.customer_name, so.order_no as sales_order_no
       FROM shipments s
       LEFT JOIN crm_customer c ON s.customer_id = c.id
       LEFT JOIN sal_order so ON s.sales_order_id = so.id
       WHERE s.sales_order_id = ? AND s.deleted = 0
       ORDER BY s.create_time DESC`,
      [parseInt(salesOrderId)]
    );

    // 为每个发货单加载明细和FIFO推荐
    const result = [];
    for (const shipment of shipments) {
      const items = await query<ShipmentItem>(
        `SELECT * FROM shipment_items WHERE shipment_id = ?`,
        [shipment.id!]
      );

      // 为每个明细项生成FIFO推荐
      const itemsWithFIFO = [];
      for (const item of items) {
        const fifoRecommendation = await getFIFORecommendation(
          item.material_id,
          item.quantity - item.shipped_quantity
        );

        itemsWithFIFO.push({
          ...item,
          recommended_qr_codes: fifoRecommendation.recommended_batches.map(
            (b) => b.qr_code
          ),
          warehouse_location:
            fifoRecommendation.recommended_batches[0]?.warehouse_location,
        });
      }

      result.push({
        ...shipment,
        items: itemsWithFIFO,
      });
    }

    return successResponse(result);
  }

  // 查询列表
  let sql = `SELECT s.*, c.customer_name, so.order_no as sales_order_no
    FROM shipments s
    LEFT JOIN crm_customer c ON s.customer_id = c.id
    LEFT JOIN sal_order so ON s.sales_order_id = so.id
    WHERE s.deleted = 0`;
  const values: any[] = [];

  if (keyword) {
    sql += ' AND (s.shipment_no LIKE ? OR c.customer_name LIKE ? OR so.order_no LIKE ?)';
    const like = `%${keyword}%`;
    values.push(like, like, like);
  }

  if (status && status !== 'all') {
    sql += ' AND s.status = ?';
    values.push(parseInt(status));
  }

  if (type && type !== 'all') {
    sql += ' AND s.type = ?';
    values.push(type);
  }

  sql += ' ORDER BY s.create_time DESC LIMIT ? OFFSET ?';
  values.push(pageSize, (page - 1) * pageSize);

  const list = await query<Shipment>(sql, values);

  const countSql = `SELECT COUNT(*) as total FROM shipments WHERE deleted = 0`;
  const countResult = await queryOne(countSql) as any;

  return successResponse({
    list,
    total: countResult?.total || 0,
    page,
    pageSize,
  });
}, '获取发货单列表失败');

// ============================================================
// POST - 创建发货单（符合设计文档 3.2 节正常发货流程）
// ============================================================
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // 验证必填字段
  const validation = validateRequestBody(body, [
    'sales_order_id',
    'customer_id',
    'warehouse_id',
    'items',
  ]);

  if (!validation.valid) {
    return errorResponse(
      `缺少必填字段: ${validation.missing.join(', ')}`,
      400,
      400
    );
  }

  // 验证发货类型
  const validTypes: ShipmentType[] = ['normal', 'partial', 'return', 're_ship'];
  if (body.type && !validTypes.includes(body.type)) {
    return errorResponse(
      `无效的发货类型，必须是: ${validTypes.join(', ')}`,
      400,
      400
    );
  }

  const shipmentType: ShipmentType = body.type || 'normal';

  const result = await transaction(async (conn) => {
    const {
      sales_order_id,
      customer_id,
      customer_name,
      warehouse_id,
      logistics_company,
      tracking_no,
      applicant_id,
      remark,
      parent_shipment_id,
      items,
    } = body;

    // 计算总数量
    let totalQuantity = 0;
    for (const item of items) {
      totalQuantity += parseFloat(item.quantity) || 0;
    }

    // 生成发货单编号
    const shipmentNo = body.shipment_no || generateShipmentNo();

    // 插入发货单主表（符合设计文档 4.1 节 shipments 表结构）
    await conn.execute(
      `INSERT INTO shipments (
        shipment_no, sales_order_id, type, status,
        customer_id, customer_name, warehouse_id,
        total_quantity, shipped_quantity,
        logistics_company, tracking_no,
        applicant_id, remark, parent_shipment_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
      [
        shipmentNo,
        sales_order_id,
        shipmentType,
        1, // 默认草稿状态
        customer_id,
        customer_name || null,
        warehouse_id,
        totalQuantity,
        logistics_company || null,
        tracking_no || null,
        applicant_id || null,
        remark || null,
        parent_shipment_id || null,
      ]
    );

    const [rows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
    const shipmentId = rows[0].id;

    // 插入发货单明细（符合设计文档 4.2 节 shipment_items 表结构）
    for (const item of items) {
      await conn.execute(
        `INSERT INTO shipment_items (
          shipment_id, material_id, material_name, specification,
          quantity, shipped_quantity, unit, batch_no, warehouse_location
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [
          shipmentId,
          item.material_id,
          item.material_name || null,
          item.specification || null,
          item.quantity,
          item.unit || 'pcs',
          item.batch_no || null,
          item.warehouse_location || null,
        ]
      );
    }

    // 如果是正常发货，自动生成FIFO推荐
    if (shipmentType === 'normal') {
      for (const item of items) {
        const fifoRecommendation = await getFIFORecommendation(
          item.material_id,
          parseFloat(item.quantity)
        );

        // 更新明细表的推荐信息
        if (fifoRecommendation.recommended_batches.length > 0) {
          await conn.execute(
            `UPDATE shipment_items
             SET batch_no = ?, warehouse_location = ?
             WHERE shipment_id = ? AND material_id = ?`,
            [
              fifoRecommendation.recommended_batches[0].batch_no,
              fifoRecommendation.recommended_batches[0].warehouse_location,
              shipmentId,
              item.material_id,
            ]
          );
        }
      }
    }

    return {
      id: shipmentId,
      shipment_no: shipmentNo,
      type: shipmentType,
      status: 1,
    };
  });

  return successResponse(result, '发货单创建成功');
}, '创建发货单失败');

// ============================================================
// PUT - 更新发货单
// ============================================================
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return commonErrors.badRequest('缺少发货单ID');
  }

  // 检查发货单是否存在
  const existing = await queryOne<{ id: number; status: number }>(
    'SELECT id, status FROM shipments WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!existing) {
    return commonErrors.notFound('发货单不存在');
  }

  // 如果是状态更新
  if (body.status !== undefined) {
    const newStatus = parseInt(body.status);

    // 状态流转验证（符合设计文档业务规则）
    const allowedTransitions: Record<number, number[]> = {
      1: [2, 6], // 草稿 → 待审批/已取消
      2: [3, 6], // 待审批 → 待发货/已取消
      3: [4, 5], // 待发货 → 部分发货/已发货
      4: [5],    // 部分发货 → 已发货
      5: [],     // 已发货（终态）
      6: [],     // 已取消（终态）
    };

    if (!allowedTransitions[existing.status]?.includes(newStatus)) {
      return errorResponse(
        `不允许从状态 "${SHIPMENT_STATUS_MAP[existing.status].label}" 转换到状态 "${SHIPMENT_STATUS_MAP[newStatus]?.label || newStatus}"`,
        400,
        400
      );
    }

    await execute(
      'UPDATE shipments SET status = ?, approver_id = ? WHERE id = ?',
      [newStatus, body.approver_id || null, id]
    );

    // 如果是待发货状态，记录审批时间
    if (newStatus === 3) {
      await execute(
        'UPDATE shipments SET approve_time = NOW() WHERE id = ?',
        [id]
      );
    }
  } else {
    // 更新其他字段
    const fields: string[] = [];
    const values: any[] = [];
    const allowedFields = [
      'logistics_company',
      'tracking_no',
      'remark',
      'customer_name',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (fields.length > 0) {
      values.push(id);
      await execute(
        `UPDATE shipments SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  return successResponse(null, '发货单更新成功');
}, '更新发货单失败');

// ============================================================
// DELETE - 删除发货单（软删除）
// ============================================================
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return commonErrors.badRequest('缺少发货单ID');
  }

  const existing = await queryOne<{ id: number; status: number }>(
    'SELECT id, status FROM shipments WHERE id = ? AND deleted = 0',
    [parseInt(id)]
  );

  if (!existing) {
    return commonErrors.notFound('发货单不存在');
  }

  // 只有草稿和已取消状态可以删除
  if (![1, 6].includes(existing.status)) {
    return errorResponse(
      `当前状态为"${SHIPMENT_STATUS_MAP[existing.status].label}"，不允许删除`,
      400,
      400
    );
  }

  await execute(
    'UPDATE shipments SET deleted = 1 WHERE id = ?',
    [parseInt(id)]
  );

  return successResponse(null, '发货单删除成功');
}, '删除发货单失败');

// ============================================================
// POST /api/sales/delivery/{id}/ship - 扫码发货（符合设计文档 5.2 节）
// ============================================================
export async function POST_ship(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandler(async () => {
    const resolvedParams = await params;
    const shipmentId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { items, logistics_company, tracking_no } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse('缺少发货明细数据', 400, 400);
    }

    // 查询发货单
    const shipment = await queryOne<Shipment>(
      'SELECT * FROM shipments WHERE id = ? AND deleted = 0',
      [shipmentId]
    );

    if (!shipment) {
      return commonErrors.notFound('发货单不存在');
    }

    // 验证发货单状态（只有待发货状态才能执行发货操作）
    if (shipment.status !== 3) {
      return errorResponse(
        `当前状态为"${SHIPMENT_STATUS_MAP[shipment.status].label}"，不能执行发货操作`,
        400,
        400
      );
    }

    const result = await transaction(async (conn) => {
      let totalShippedQty = 0;

      // 处理每个发货项
      for (const item of items) {
        const { material_id, qr_code, quantity } = item;

        // 验证二维码（符合设计文档"扫码优先"原则）
        const validation = await validateQRCodeForShipping(qr_code, shipmentId);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        // 更新明细表已发货数量
        await conn.execute(
          `UPDATE shipment_items
           SET shipped_quantity = shipped_quantity + ?, qr_code = ?
           WHERE shipment_id = ? AND material_id = ?`,
          [quantity, qr_code, shipmentId, material_id]
        );

        // 扣减库存（符合设计文档"实时同步"原则）
        await conn.execute(
          `UPDATE wh_inventory
           SET quantity = quantity - ?, updated_at = NOW()
           WHERE qr_code = ?`,
          [quantity, qr_code]
        );

        // 更新二维码状态为已发货
        await conn.execute(
          `UPDATE qrcode_record
           SET status = 'shipped', shipped_at = NOW(), shipment_id = ?
           WHERE qr_code = ?`,
          [shipmentId, qr_code]
        );

        totalShippedQty += parseFloat(quantity);
      }

      // 更新发货单主表
      const newShippedQty = shipment.shipped_quantity + totalShippedQty;
      const newStatus = newShippedQty >= shipment.total_quantity ? 5 : 4; // 已发货 or 部分发货

      await conn.execute(
        `UPDATE shipments
         SET shipped_quantity = ?, status = ?, ship_time = NOW(),
         logistics_company = COALESCE(? , logistics_company),
         tracking_no = COALESCE(? , tracking_no)
         WHERE id = ?`,
        [
          newShippedQty,
          newStatus,
          logistics_company || null,
          tracking_no || null,
          shipmentId,
        ]
      );

      // 更新销售订单已发货数量（符合设计文档"实时同步"原则）
      await conn.execute(
        `UPDATE sal_order
         SET shipped_qty = shipped_qty + ?, status =
           CASE WHEN shipped_qty + ? >= total_qty THEN 4 ELSE status END
         WHERE id = ?`,
        [totalShippedQty, totalShippedQty, shipment.sales_order_id]
      );

      // 如果全部发货完成，自动生成应收单（符合设计文档 3.2 节第7步）
      if (newStatus === 5) {
        const receivableNo = `AR${Date.now()}`;
        await conn.execute(
          `INSERT INTO fin_receivable (
            receivable_no, order_id, order_type, customer_id,
            amount, status, create_time
          ) VALUES (?, ?, 'sales', ?, ?, 1, NOW())`,
          [
            receivableNo,
            shipment.sales_order_id,
            shipment.customer_id,
            0, // 金额需要根据订单明细计算
          ]
        );
      }

      return {
        shipment_no: shipment.shipment_no,
        status: newStatus,
        ship_time: new Date().toISOString(),
        shipped_quantity: newShippedQty,
      };
    });

    return successResponse(result, '扫码发货成功');
  }, '扫码发货失败')(request);
}

// ============================================================
// POST /api/sales/delivery/partial - 提交部分发货申请（符合设计文档 5.3 节）
// ============================================================
export async function POST_partial(request: NextRequest) {
  return withErrorHandler(async () => {
    const body = await request.json();
    const { sales_order_id, quantity, remark } = body;

    if (!sales_order_id) {
      return errorResponse('缺少销售订单ID', 400, 400);
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      return errorResponse('发货数量必须大于0', 400, 400);
    }

    // 查询销售订单
    const order = await queryOne<any>(
      'SELECT * FROM sal_order WHERE id = ? AND deleted = 0',
      [sales_order_id]
    );

    if (!order) {
      return commonErrors.notFound('销售订单不存在');
    }

    // 验证部分发货数量不超过订单剩余数量
    const remainingQty = order.total_qty - (order.shipped_qty || 0);
    if (parseFloat(quantity) > remainingQty) {
      return errorResponse(
        `部分发货数量${quantity}超过订单剩余数量${remainingQty}`,
        400,
        400
      );
    }

    // 创建部分发货单
    const shipmentNo = generateShipmentNo();
    const result = await execute(
      `INSERT INTO shipments (
        shipment_no, sales_order_id, type, status,
        customer_id, customer_name, warehouse_id,
        total_quantity, shipped_quantity, remark
      ) VALUES (?, ?, 'partial', 2, ?, ?, ?, ?, 0, ?)`,
      [
        shipmentNo,
        sales_order_id,
        order.customer_id,
        order.customer_name,
        order.warehouse_id || 1,
        quantity,
        remark || `先发货${quantity}件，剩余${remainingQty - parseFloat(quantity)}件明天发货`,
      ]
    );

    return successResponse(
      {
        id: result.insertId,
        shipment_no: shipmentNo,
        type: 'partial',
        status: 2, // 待审批
      },
      '部分发货申请提交成功'
    );
  }, '提交部分发货申请失败')(request);
}

// ============================================================
// POST /api/sales/delivery/re-ship - 提交补发申请（符合设计文档 5.4 节）
// ============================================================
export async function POST_reShip(request: NextRequest) {
  return withErrorHandler(async () => {
    const body = await request.json();
    const { parent_shipment_id, quantity, reason } = body;

    if (!parent_shipment_id) {
      return errorResponse('缺少原发货单ID', 400, 400);
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      return errorResponse('补发数量必须大于0', 400, 400);
    }

    // 查询原发货单
    const parentShipment = await queryOne<Shipment>(
      'SELECT * FROM shipments WHERE id = ? AND deleted = 0',
      [parent_shipment_id]
    );

    if (!parentShipment) {
      return commonErrors.notFound('原发货单不存在');
    }

    // 创建补发发货单
    const shipmentNo = generateShipmentNo();
    const result = await execute(
      `INSERT INTO shipments (
        shipment_no, sales_order_id, type, status,
        customer_id, customer_name, warehouse_id,
        total_quantity, shipped_quantity,
        parent_shipment_id, remark
      ) VALUES (?, ?, 're_ship', 2, ?, ?, ?, ?, 0, ?, ?)`,
      [
        shipmentNo,
        parentShipment.sales_order_id,
        parentShipment.customer_id,
        parentShipment.customer_name,
        parentShipment.warehouse_id,
        quantity,
        parent_shipment_id,
        reason || `客户反馈问题，补发${quantity}件`,
      ]
    );

    // 复制原发货单的明细到补发单
    const parentItems = await query<ShipmentItem>(
      'SELECT * FROM shipment_items WHERE shipment_id = ?',
      [parent_shipment_id]
    );

    if (parentItems.length > 0) {
      for (const item of parentItems.slice(0, 1)) {
        // 只复制第一个产品作为补发对象
        await execute(
          `INSERT INTO shipment_items (
            shipment_id, material_id, material_name, specification,
            quantity, shipped_quantity, unit
          ) VALUES (?, ?, ?, ?, ?, 0, ?)`,
          [
            result.insertId,
            item.material_id,
            item.material_name,
            item.specification,
            Math.min(parseFloat(quantity), item.quantity),
            item.unit,
          ]
        );
      }
    }

    return successResponse(
      {
        id: result.insertId,
        shipment_no: shipmentNo,
        type: 're_ship',
        status: 2, // 待审批
      },
      '补发申请提交成功'
    );
  }, '提交补发申请失败')(request);
}
