import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withErrorHandler, successResponse } from '@/lib/api-response';

const CATEGORY_TYPE_MAP: Record<string, string[]> = {
  ink: ['油墨', '墨水', 'ink', 'INK'],
  substrate: ['PET', 'PP', 'PVC', 'BOPP', 'PE', '薄膜', '卷材', '片材'],
  solvent: ['溶剂', '稀释剂', '清洗剂', 'solvent'],
  plate: ['网版', '刀模', '模切版', '丝网'],
  auxiliary: ['胶带', '保护膜', '离型纸', '包材'],
};

export const GET = withErrorHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const category = searchParams.get('category');
  const keyword = searchParams.get('keyword');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '100');

  let sql = `SELECT * FROM inv_material WHERE deleted = 0 AND status = 1`;
  const params: any[] = [];

  if (type) {
    sql += ' AND material_type = ?';
    params.push(type);
  }

  if (category && CATEGORY_TYPE_MAP[category]) {
    const keywords = CATEGORY_TYPE_MAP[category];
    const conditions = keywords.map(() => `(material_name LIKE ? OR material_code LIKE ? OR specification LIKE ?)`);
    sql += ` AND (${conditions.join(' OR ')})`;
    for (const kw of keywords) {
      params.push(`%${kw}%`, `%${kw}%`, `%${kw}%`);
    }
  }

  if (keyword) {
    sql += ' AND (material_code LIKE ? OR material_name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  sql += ' ORDER BY id ASC';

  const materials = await query(sql, params);

  const total = (materials as any[]).length;
  const start = (page - 1) * pageSize;
  const list = (materials as any[]).slice(start, start + pageSize);

  return successResponse({
    list,
    total,
    page,
    pageSize,
  });
});
