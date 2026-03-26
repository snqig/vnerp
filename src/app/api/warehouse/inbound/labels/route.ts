import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 获取物料标签列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const status = searchParams.get('status') || '';
    const materialCode = searchParams.get('materialCode') || '';
    const batchNo = searchParams.get('batchNo') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let sql = `
      SELECT 
        l.id,
        l.label_id as labelId,
        l.order_no as orderNo,
        l.purchase_order_no as purchaseOrderNo,
        l.supplier_name as supplierName,
        l.inbound_date as inboundDate,
        l.warehouse_code as warehouseCode,
        l.material_code as materialCode,
        l.material_name as materialName,
        l.specification,
        l.width,
        l.batch_no as batchNo,
        l.qty,
        l.unit,
        l.is_raw_material as isRawMaterial,
        l.package_qty as packageQty,
        l.label_qty as labelQty,
        l.label_status as labelStatus,
        l.audit_status as auditStatus,
        l.operator_name as operatorName,
        l.auditor_name as auditorName,
        l.audit_time as auditTime,
        l.color_code as colorCode,
        l.mixed_material_remark as mixedMaterialRemark,
        l.machine_no as machineNo,
        l.remark,
        l.create_time as createTime,
        l.update_time as updateTime
      FROM inv_inbound_label l
      WHERE l.deleted = 0
    `;
    const params: any[] = [];

    if (keyword) {
      sql += ` AND (l.label_id LIKE ? OR l.material_code LIKE ? OR l.material_name LIKE ? OR l.supplier_name LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (status) {
      sql += ` AND l.label_status = ?`;
      params.push(status);
    }

    if (materialCode) {
      sql += ` AND l.material_code = ?`;
      params.push(materialCode);
    }

    if (batchNo) {
      sql += ` AND l.batch_no = ?`;
      params.push(batchNo);
    }

    // 获取总数
    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await query<{ total: number }>(countSql, params);
    const total = countResult?.total || 0;

    // 分页查询
    sql += ` ORDER BY l.create_time DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, (page - 1) * pageSize);

    const labels = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: labels,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('获取物料标签列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取物料标签列表失败' },
      { status: 500 }
    );
  }
}

// 生成物料标签
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      orderNo,
      itemId,
      purchaseOrderNo,
      supplierName,
      inboundDate,
      warehouseCode,
      materialCode,
      materialName,
      specification,
      width,
      batchNo,
      qty,
      unit,
      isRawMaterial,
      packageQty,
      labelQty,
      colorCode,
      mixedMaterialRemark,
      machineNo,
      remark,
      operatorId,
      operatorName,
    } = body;

    // 生成标签ID
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const [maxLabel] = await query<{ maxId: string }>(
      `SELECT MAX(label_id) as maxId FROM inv_inbound_label WHERE label_id LIKE ?`,
      [`${dateStr}%`]
    );
    const seq = maxLabel?.maxId
      ? String(parseInt(maxLabel.maxId.slice(-5)) + 1).padStart(5, '0')
      : '00001';
    const labelId = `${dateStr}${seq}`;

    await query(
      `INSERT INTO inv_inbound_label (
        label_id, order_id, order_no, item_id, purchase_order_no, supplier_name,
        inbound_date, warehouse_code, material_code, material_name, specification,
        width, batch_no, qty, unit, is_raw_material, package_qty, label_qty,
        label_status, operator_id, operator_name, color_code, mixed_material_remark,
        machine_no, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated', ?, ?, ?, ?, ?, ?)`,
      [
        labelId,
        orderId,
        orderNo,
        itemId,
        purchaseOrderNo,
        supplierName,
        inboundDate,
        warehouseCode,
        materialCode,
        materialName,
        specification,
        width || 0,
        batchNo,
        qty,
        unit,
        isRawMaterial ? 1 : 0,
        packageQty || 0,
        labelQty || 1,
        operatorId,
        operatorName,
        colorCode,
        mixedMaterialRemark,
        machineNo,
        remark,
      ]
    );

    return NextResponse.json({
      success: true,
      message: '物料标签生成成功',
      data: { labelId },
    });
  } catch (error) {
    console.error('生成物料标签失败:', error);
    return NextResponse.json(
      { success: false, message: '生成物料标签失败' },
      { status: 500 }
    );
  }
}

// 更新标签状态（分切、使用、作废等）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, labelStatus, auditStatus, auditorId, auditorName } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: '标签ID不能为空' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (labelStatus) {
      updates.push('label_status = ?');
      params.push(labelStatus);
    }

    if (auditStatus !== undefined) {
      updates.push('audit_status = ?');
      params.push(auditStatus ? 1 : 0);
    }

    if (auditorId) {
      updates.push('auditor_id = ?');
      params.push(auditorId);
    }

    if (auditorName) {
      updates.push('auditor_name = ?');
      params.push(auditorName);
    }

    if (auditStatus) {
      updates.push('audit_time = NOW()');
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有要更新的字段' },
        { status: 400 }
      );
    }

    params.push(id);

    await query(
      `UPDATE inv_inbound_label SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return NextResponse.json({
      success: true,
      message: '标签状态更新成功',
    });
  } catch (error) {
    console.error('更新标签状态失败:', error);
    return NextResponse.json(
      { success: false, message: '更新标签状态失败' },
      { status: 500 }
    );
  }
}

// 删除物料标签
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: '标签ID不能为空' },
        { status: 400 }
      );
    }

    await query('UPDATE inv_inbound_label SET deleted = 1 WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: '物料标签删除成功',
    });
  } catch (error) {
    console.error('删除物料标签失败:', error);
    return NextResponse.json(
      { success: false, message: '删除物料标签失败' },
      { status: 500 }
    );
  }
}
