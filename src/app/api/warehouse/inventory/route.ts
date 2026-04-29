import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const pageSize = parseInt(searchParams.get('pageSize') || '100');
  const page = parseInt(searchParams.get('page') || '1');
  const keyword = searchParams.get('keyword');
  const categoryId = searchParams.get('categoryId');
  const warehouseId = searchParams.get('warehouseId');
  const lowStock = searchParams.get('lowStock');

  let sql = `
    SELECT m.*, w.warehouse_name, mc.category_name
    FROM inv_material m
    LEFT JOIN inv_warehouse w ON m.warehouse_id = w.id
    LEFT JOIN inv_material_category mc ON m.category_id = mc.id
    WHERE m.deleted = 0
  `;
  const values: any[] = [];

  if (keyword) {
    sql += ` AND (m.material_code LIKE ? OR m.material_name LIKE ?)`;
    const likeKeyword = `%${keyword}%`;
    values.push(likeKeyword, likeKeyword);
  }

  if (categoryId) {
    sql += ` AND m.category_id = ?`;
    values.push(parseInt(categoryId));
  }

  if (warehouseId) {
    sql += ` AND m.warehouse_id = ?`;
    values.push(parseInt(warehouseId));
  }

  if (lowStock === 'true') {
    sql += ` AND m.safety_stock > 0 AND m.stock_qty <= m.safety_stock`;
  }

  sql += ` ORDER BY m.create_time DESC LIMIT ? OFFSET ?`;
  values.push(pageSize, (page - 1) * pageSize);

  const materials = await query(sql, values);

  const result = (materials as any[]).map((item: any) => ({
    id: item.id,
    material_code: item.material_code,
    material_name: item.material_name,
    specification: item.specification,
    category_id: item.category_id,
    category_name: item.category_name,
    material_type: item.material_type,
    unit: item.unit,
    barcode: item.barcode,
    brand: item.brand,
    safety_stock: parseFloat(item.safety_stock || '0'),
    max_stock: parseFloat(item.max_stock || '0'),
    min_stock: parseFloat(item.min_stock || '0'),
    stock_qty: parseFloat(item.stock_qty || '0'),
    quantity: parseFloat(item.stock_qty || '0'),
    min_quantity: parseFloat(item.min_stock || item.safety_stock || '0'),
    purchase_price: parseFloat(item.purchase_price || '0'),
    sale_price: parseFloat(item.sale_price || '0'),
    cost_price: parseFloat(item.cost_price || '0'),
    warehouse_id: item.warehouse_id,
    warehouse_name: item.warehouse_name,
    shelf_life: item.shelf_life,
    warning_days: item.warning_days,
    status: item.status,
    remark: item.remark,
    create_time: item.create_time,
    update_time: item.update_time,
  }));

  let countSql = `SELECT COUNT(*) as total FROM inv_material m WHERE m.deleted = 0`;
  const countValues: any[] = [];
  if (keyword) {
    countSql += ` AND (m.material_code LIKE ? OR m.material_name LIKE ?)`;
    countValues.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (categoryId) {
    countSql += ` AND m.category_id = ?`;
    countValues.push(parseInt(categoryId));
  }
  if (warehouseId) {
    countSql += ` AND m.warehouse_id = ?`;
    countValues.push(parseInt(warehouseId));
  }
  if (lowStock === 'true') {
    countSql += ` AND m.safety_stock > 0 AND m.stock_qty <= m.safety_stock`;
  }
  const countResult = await query(countSql, countValues);
  const total = (countResult as any[])[0]?.total || 0;

  return successResponse({
    list: result,
    total,
    page,
    pageSize,
  });
});
