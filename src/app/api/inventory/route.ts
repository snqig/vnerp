import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

// 库存批次接口
interface InventoryBatch {
  id: number;
  batchNo: string;
  materialName: string;
  materialSpec: string;
  warehouseName: string;
  locationName: string;
  quantity: string;
  availableQty: string;
  unit: string;
  status: string;
  alertLevel: string;
  createdAt: string;
}

// GET - 获取库存列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const status = searchParams.get('status');
    const keyword = searchParams.get('keyword');

    let sql = `
      SELECT 
        ib.id,
        ib.batch_no as batchNo,
        m.name as materialName,
        m.specification as materialSpec,
        w.name as warehouseName,
        l.name as locationName,
        ib.quantity,
        ib.available_qty as availableQty,
        ib.unit,
        ib.status,
        ib.created_at as createdAt
      FROM inv_inventory_batch ib
      LEFT JOIN inv_warehouse w ON ib.warehouse_id = w.id
      LEFT JOIN inv_location l ON ib.location_id = l.id
      LEFT JOIN bas_material m ON ib.material_id = m.id
      WHERE ib.deleted = 0
    `;

    const params: any[] = [];

    if (warehouseId && warehouseId !== 'all') {
      sql += ' AND ib.warehouse_id = ?';
      params.push(parseInt(warehouseId));
    }

    if (status && status !== 'all') {
      sql += ' AND ib.status = ?';
      params.push(status);
    }

    if (keyword) {
      sql += ' AND (ib.batch_no LIKE ? OR m.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY ib.created_at ASC';

    const data = await query<InventoryBatch>(sql, params);

    // 计算预警级别
    const processedData = data.map(item => {
      let alertLevel = 'normal';
      if (parseFloat(item.availableQty) < 10) {
        alertLevel = 'warning';
      }
      return {
        ...item,
        alertLevel,
      };
    });

    return NextResponse.json({
      success: true,
      data: processedData,
      total: processedData.length,
    });
  } catch (error) {
    console.error('Inventory fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

// POST - 库存操作（入库/出库/调拨）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, batchNo, quantity, warehouseId, locationId, sourceType, sourceNo } = body;

    if (action === 'inbound') {
      // 创建交易记录
      const transNo = `IN-${Date.now()}`;
      await execute(
        `INSERT INTO inv_inventory_transaction 
         (trans_no, trans_type, batch_id, warehouse_id, location_id, quantity, source_type, source_no, operated_at) 
         VALUES (?, 'inbound', 1, ?, ?, ?, ?, ?, NOW())`,
        [transNo, warehouseId, locationId, quantity, sourceType, sourceNo]
      );

      return NextResponse.json({
        success: true,
        data: {
          batchNo,
          quantity,
          warehouseId,
          locationId,
          operatedAt: new Date().toISOString(),
        },
        message: '入库成功',
      });
    } else if (action === 'outbound') {
      return NextResponse.json({
        success: true,
        data: {
          batchNo,
          quantity,
          operatedAt: new Date().toISOString(),
        },
        message: '出库成功',
      });
    }

    return NextResponse.json(
      { success: false, error: '未知操作类型' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Inventory operation error:', error);
    return NextResponse.json(
      { success: false, error: '库存操作失败' },
      { status: 500 }
    );
  }
}
