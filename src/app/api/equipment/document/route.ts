import { NextRequest, NextResponse } from 'next/server';
import { query, execute, SqlValue } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';
import fs from 'fs';
import path from 'path';

/**
 * 设备文档管理 API
 * GET  - 查询文档列表
 * POST - 上传新文档
 * PUT  - 更新文档信息
 * DELETE - 删除文档
 */

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/equipment-docs');

async function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

// GET /api/equipment/document
export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const equipmentId = searchParams.get('equipmentId');
  const docType = searchParams.get('docType');
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 20;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['deleted = 0'];
  const params: SqlValue[] = [];

  if (equipmentId) {
    conditions.push('equipment_id = ?');
    params.push(equipmentId);
  }
  if (docType) {
    conditions.push('doc_type = ?');
    params.push(docType);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countResult] = await query(
    `SELECT COUNT(*) as total FROM eqp_document ${whereClause}`,
    params
  );

  const [rows] = await query(
    `SELECT * FROM eqp_document ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return successResponse({
    list: rows,
    total: (countResult as { total: number }[])[0]?.total || 0,
    page,
    pageSize,
  });
},);

// POST /api/equipment/document
export const POST = withPermission(async (request: NextRequest) => {
  await ensureUploadDir();

  const formData = await request.formData();
  const equipmentId = formData.get('equipmentId') as string;
  const docType = formData.get('docType') as string;
  const docName = formData.get('docName') as string;
  const docNo = formData.get('docNo') as string;
  const file = formData.get('file') as File | null;

  if (!equipmentId || !docType || !docName) {
    return errorResponse('缺少必要字段：equipmentId、docType、docName', 400);
  }

  let filePath: string | null = null;
  if (file) {
    const safeName = sanitizeFilename(file.name);
    const uniqueName = `${Date.now()}_${safeName}`;
    const destPath = path.join(UPLOAD_DIR, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    filePath = `/uploads/equipment-docs/${uniqueName}`;
  }

  const result = await execute(
    `INSERT INTO eqp_document (equipment_id, doc_type, doc_name, doc_no, file_path, file_name, remark, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      equipmentId,
      docType,
      docName,
      docNo || null,
      filePath,
      file?.name || null,
      formData.get('remark') as string || null,
    ]
  );

  return successResponse({ id: result.insertId }, '文档上传成功');
},);

// PUT /api/equipment/document
export const PUT = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { id, docType, docName, docNo, remark } = body;

  if (!id) return errorResponse('缺少文档ID', 400);

  await execute(
    `UPDATE eqp_document SET doc_type = ?, doc_name = ?, doc_no = ?, remark = ?, update_time = NOW() WHERE id = ? AND deleted = 0`,
    [docType, docName, docNo || null, remark || null, id]
  );

  return successResponse(null, '文档更新成功');
},);

// DELETE /api/equipment/document
export const DELETE = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return errorResponse('缺少文档ID', 400);

  // 软删除：先取文件路径以便删除物理文件
  const [doc] = await query(
    `SELECT file_path FROM eqp_document WHERE id = ? AND deleted = 0`,
    [id]
  );

  if ((doc as unknown[]).length === 0) {
    return errorResponse('文档不存在', 404);
  }

  const docRecord = (doc as { file_path: string | null }[])[0];
  if (docRecord.file_path) {
    const fullPath = path.join(process.cwd(), 'public', docRecord.file_path);
    try { fs.unlinkSync(fullPath); } catch {}
  }

  await execute(
    `UPDATE eqp_document SET deleted = 1, update_time = NOW() WHERE id = ?`,
    [id]
  );

  return successResponse(null, '文档已删除');
},);
