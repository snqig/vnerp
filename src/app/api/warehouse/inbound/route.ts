import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取入库单列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    let sql = `
      SELECT 
        o.id,
        o.order_no as orderNo,
        o.order_date as orderDate,
        o.purchase_order_no as purchaseOrderNo,
        o.supplier_name as supplierName,
        o.warehouse_code as warehouseCode,
        o.warehouse_name as warehouseName,
        o.inbound_type as inboundType,
        o.total_qty as totalQty,
        o.total_amount as totalAmount,
        o.currency,
        o.status,
        o.remark,
        o.operator_name as operatorName,
        o.audit_status as auditStatus,
        o.auditor_name as auditorName,
        o.audit_time as auditTime,
        o.create_time as createTime
      FROM inv_inbound_order o
      WHERE o.deleted = 0
    `;
    const params: any[] = [];

    if (keyword) {
      sql += ` AND (o.order_no LIKE ? OR o.supplier_name LIKE ? OR o.purchase_order_no LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (status) {
      sql += ` AND o.status = ?`;
      params.push(status);
    }

    if (startDate) {
      sql += ` AND o.order_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND o.order_date <= ?`;
      params.push(endDate);
    }

    // 获取总数
    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await query<{ total: number }>(countSql, params);
    const total = countResult?.total || 0;

    // 分页查询
    sql += ` ORDER BY o.create_time DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, (page - 1) * pageSize);

    const orders = await query(sql, params);

    // 获取每个订单的明细
    for (const order of orders) {
      const items = await query(
        `SELECT 
          id,
          material_code as materialCode,
          material_name as materialName,
          specification,
          width,
          batch_no as batchNo,
          qty,
          unit,
          is_raw_material as isRawMaterial,
          location_code as locationCode
        FROM inv_inbound_item 
        WHERE order_id = ? AND deleted = 0`,
        [order.id]
      );
      order.items = items;
    }

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取入库单列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取入库单列表失败' },
      { status: 500 }
    );
  }
}

// 创建入库单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderDate,
      purchaseOrderNo,
      supplierId,
      supplierName,
      warehouseId,
      warehouseCode,
      warehouseName,
      inboundType,
      remark,
      items,
      operatorId,
      operatorName,
    } = body;

    // 生成入库单号
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const [maxOrder] = await query<{ maxNo: string }>(
      `SELECT MAX(order_no) as maxNo FROM inv_inbound_order WHERE order_no LIKE ?`,
      [`RK${dateStr}%`]
    );
    const seq = maxOrder?.maxNo 
      ? String(parseInt(maxOrder.maxNo.slice(-3)) + 1).padStart(3, '0')
      : '001';
    const orderNo = `RK${dateStr}${seq}`;

    // 计算总金额
    const totalQty = items.reduce((sum: number, item: any) => sum + (parseFloat(item.qty) || 0), 0);
    const totalAmount = items.reduce((sum: number, item: any) => sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)), 0);

    // 插入入库单主表
    const orderResult = await query(
      `INSERT INTO inv_inbound_order (
        order_no, order_date, purchase_order_no, supplier_id, supplier_name,
        warehouse_id, warehouse_code, warehouse_name, inbound_type,
        total_qty, total_amount, remark, operator_id, operator_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        orderNo,
        orderDate,
        purchaseOrderNo,
        supplierId,
        supplierName,
        warehouseId,
        warehouseCode,
        warehouseName,
        inboundType,
        totalQty,
        totalAmount,
        remark,
        operatorId,
        operatorName,
      ]
    ) as any;

    const orderId = (orderResult as any).insertId;

    // 插入入库单明细
    for (const item of items) {
      await query(
        `INSERT INTO inv_inbound_item (
          order_id, order_no, material_id, material_code, material_name,
          specification, width, batch_no, qty, unit, is_raw_material,
          package_qty, unit_price, total_price, location_code, remark
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          orderNo,
          item.materialId,
          item.materialCode,
          item.materialName,
          item.specification,
          item.width || 0,
          item.batchNo,
          item.qty,
          item.unit,
          item.isRawMaterial ? 1 : 0,
          item.packageQty || 0,
          item.unitPrice || 0,
          (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0),
          item.locationCode,
          item.remark,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: '入库单创建成功',
      data: { id: orderId, orderNo },
    });
  } catch (error) {
    console.error('创建入库单失败:', error);
    return NextResponse.json(
      { success: false, message: '创建入库单失败' },
      { status: 500 }
    );
  }
}

// 更新入库单
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: '入库单ID不能为空' },
        { status: 400 }
      );
    }

    // 检查入库单状态
    const [order] = await query<{ status: string }>(
      'SELECT status FROM inv_inbound_order WHERE id = ? AND deleted = 0',
      [id]
    );

    if (!order) {
      return NextResponse.json(
        { success: false, message: '入库单不存在' },
        { status: 404 }
      );
    }

    if (order.status === 'completed') {
      return NextResponse.json(
        { success: false, message: '已完成的入库单不能修改' },
        { status: 400 }
      );
    }

    // 更新入库单
    await query(
      `UPDATE inv_inbound_order SET
        order_date = ?,
        purchase_order_no = ?,
        supplier_id = ?,
        supplier_name = ?,
        warehouse_id = ?,
        warehouse_code = ?,
        warehouse_name = ?,
        inbound_type = ?,
        remark = ?
      WHERE id = ?`,
      [
        updateData.orderDate,
        updateData.purchaseOrderNo,
        updateData.supplierId,
        updateData.supplierName,
        updateData.warehouseId,
        updateData.warehouseCode,
        updateData.warehouseName,
        updateData.inboundType,
        updateData.remark,
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: '入库单更新成功',
    });
  } catch (error) {
    console.error('更新入库单失败:', error);
    return NextResponse.json(
      { success: false, message: '更新入库单失败' },
      { status: 500 }
    );
  }
}

// 删除入库单（软删除）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: '入库单ID不能为空' },
        { status: 400 }
      );
    }

    // 检查入库单状态
    const [order] = await query<{ status: string }>(
      'SELECT status FROM inv_inbound_order WHERE id = ? AND deleted = 0',
      [id]
    );

    if (!order) {
      return NextResponse.json(
        { success: false, message: '入库单不存在' },
        { status: 404 }
      );
    }

    if (order.status === 'completed') {
      return NextResponse.json(
        { success: false, message: '已完成的入库单不能删除' },
        { status: 400 }
      );
    }

    await query('UPDATE inv_inbound_order SET deleted = 1 WHERE id = ?', [id]);
    await query('UPDATE inv_inbound_item SET deleted = 1 WHERE order_id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: '入库单删除成功',
    });
  } catch (error) {
    console.error('删除入库单失败:', error);
    return NextResponse.json(
      { success: false, message: '删除入库单失败' },
      { status: 500 }
    );
  }
}
