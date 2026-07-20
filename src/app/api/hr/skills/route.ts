import { NextRequest } from 'next/server';
import { getDrizzleDb } from '@/lib/db';
import { eq, and, like, desc, count } from 'drizzle-orm';
import { hrSkillMatrix } from '@/lib/db/schema';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';

const db = getDrizzleDb();

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const employeeId = searchParams.get('employeeId');
  const skillCategory = searchParams.get('skillCategory');

  const conditions = [eq(hrSkillMatrix.deleted, 0)];
  if (employeeId) conditions.push(eq(hrSkillMatrix.employeeId, Number(employeeId)));
  if (skillCategory) conditions.push(eq(hrSkillMatrix.skillCategory, skillCategory));

  const [{ total }] = await db.select({ total: count() }).from(hrSkillMatrix).where(and(...conditions));
  const list = await db.select().from(hrSkillMatrix)
    .where(and(...conditions))
    .orderBy(desc(hrSkillMatrix.createTime))
    .limit(pageSize).offset((page - 1) * pageSize);

  return successResponse({ list, total, page, pageSize });
}, { errorMessage: '获取技能列表失败' });

export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { employeeId, skillCode, skillName, skillCategory, skillLevel, certified, certificateId, assessor, assessDate, nextAssessDate, remark } = body;
  const result = await db.insert(hrSkillMatrix).values({
    employeeId, skillCode, skillName, skillCategory, skillLevel, certified, certificateId, assessor, assessDate, nextAssessDate, remark,
  });
  return successResponse({ id: Number(result[0].insertId) }, '技能记录创建成功');
}, { errorMessage: '创建技能记录失败' });

export const PUT = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  if (!body.id) return errorResponse('缺少技能ID', 400, 400);
  const { id, ...data } = body;
  await db.update(hrSkillMatrix).set(data).where(eq(hrSkillMatrix.id, id));
  return successResponse(null, '更新成功');
}, { errorMessage: '更新技能记录失败' });

export const DELETE = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('缺少技能ID', 400, 400);
  await db.update(hrSkillMatrix).set({ deleted: 1 }).where(eq(hrSkillMatrix.id, Number(id)));
  return successResponse(null, '删除成功');
}, { errorMessage: '删除技能记录失败' });
