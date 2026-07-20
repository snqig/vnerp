import { NextRequest } from 'next/server';
import { getDrizzleDb } from '@/lib/db';
import { eq, and, like, desc } from 'drizzle-orm';
import { hrShift } from '@/lib/db/schema';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';

const db = getDrizzleDb();

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const conditions = [eq(hrShift.deleted, 0)];
  if (keyword) conditions.push(like(hrShift.shiftName, `%${keyword}%`));

  const list = await db.select().from(hrShift)
    .where(and(...conditions))
    .orderBy(desc(hrShift.createTime))
    .limit(pageSize).offset((page - 1) * pageSize);

  return successResponse({ list, page, pageSize });
}, { errorMessage: '获取班次列表失败' });

export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const result = await db.insert(hrShift).values(body);
  return successResponse({ id: Number(result[0].insertId) });
}, { errorMessage: '创建班次失败' });

export const PUT = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  if (!body.id) return errorResponse('缺少班次ID', 400, 400);
  await db.update(hrShift).set(body).where(eq(hrShift.id, body.id));
  return successResponse(null);
}, { errorMessage: '更新班次失败' });

export const DELETE = withPermission(async (request: NextRequest) => {
  const { id } = await request.json();
  if (!id) return errorResponse('缺少班次ID', 400, 400);
  await db.update(hrShift).set({ deleted: 1 }).where(eq(hrShift.id, id));
  return successResponse(null);
}, { errorMessage: '删除班次失败' });
