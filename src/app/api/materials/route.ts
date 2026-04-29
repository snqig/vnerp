import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const pageSize = parseInt(searchParams.get('pageSize') || '100');
  const page = parseInt(searchParams.get('page') || '1');
  const keyword = searchParams.get('keyword');

  let sql = `
    SELECT id, material_code, material_name, specification, unit, purchase_price, sale_price, material_type, category_id
    FROM inv_material
    WHERE deleted = 0
  `;
  const values: any[] = [];

  if (keyword) {
    sql += ` AND (material_code LIKE ? OR material_name LIKE ?)`;
    const likeKeyword = `%${keyword}%`;
    values.push(likeKeyword, likeKeyword);
  }

  const offset = (page - 1) * pageSize;
  sql += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
  values.push(pageSize, offset);

  const list = await query(sql, values);

  let countSql = `SELECT COUNT(*) as total FROM inv_material WHERE deleted = 0`;
  const countValues: any[] = [];
  if (keyword) {
    countSql += ` AND (material_code LIKE ? OR material_name LIKE ?)`;
    const likeKeyword = `%${keyword}%`;
    countValues.push(likeKeyword, likeKeyword);
  }
  const countResult = await query(countSql, countValues);
  const total = (countResult as any[])[0]?.total || 0;

  return successResponse({
    data: list,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});
