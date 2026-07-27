import { NextRequest } from 'next/server';
import { getDrizzleDb } from '@/lib/db';
import { eq, and, desc, count } from 'drizzle-orm';
import { hrSkillMatrix, sysEmployee } from '@/lib/db/schema';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';

const db = getDrizzleDb();

export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const employeeId = searchParams.get('employeeId');
    const skillCategory = searchParams.get('skillCategory');

    const conditions = [eq(hrSkillMatrix.deleted, 0)];
    if (employeeId) conditions.push(eq(hrSkillMatrix.employeeId, Number(employeeId)));
    if (skillCategory) conditions.push(eq(hrSkillMatrix.skillCategory, skillCategory));

    const [{ total }] = await db
      .select({ total: count() })
      .from(hrSkillMatrix)
      .where(and(...conditions));
    const list = await db
      .select({
        id: hrSkillMatrix.id,
        employee_id: hrSkillMatrix.employeeId,
        employee_name: sysEmployee.name,
        skill_code: hrSkillMatrix.skillCode,
        skill_name: hrSkillMatrix.skillName,
        skill_category: hrSkillMatrix.skillCategory,
        skill_level: hrSkillMatrix.skillLevel,
        certified: hrSkillMatrix.certified,
        assessor: hrSkillMatrix.assessor,
        assess_date: hrSkillMatrix.assessDate,
        next_assess_date: hrSkillMatrix.nextAssessDate,
        remark: hrSkillMatrix.remark,
      })
      .from(hrSkillMatrix)
      .leftJoin(sysEmployee, eq(hrSkillMatrix.employeeId, sysEmployee.id))
      .where(and(...conditions))
      .orderBy(desc(hrSkillMatrix.createTime))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return successResponse({ list, total, page, pageSize });
  },
  { errorMessage: '获取技能列表失败' }
);

export const POST = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    const result = await db.insert(hrSkillMatrix).values({
      employeeId: body.employee_id,
      skillCode: body.skill_code,
      skillName: body.skill_name,
      skillCategory: body.skill_category,
      skillLevel: body.skill_level,
      certified: body.certified,
      certificateId: body.certificate_id,
      assessor: body.assessor,
      assessDate: body.assess_date,
      nextAssessDate: body.next_assess_date,
      remark: body.remark,
    });
    return successResponse({ id: Number(result[0].insertId) }, '技能记录创建成功');
  },
  { errorMessage: '创建技能记录失败' }
);

export const PUT = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    if (!body.id) return errorResponse('缺少技能ID', 400, 400);
    await db
      .update(hrSkillMatrix)
      .set({
        employeeId: body.employee_id,
        skillCode: body.skill_code,
        skillName: body.skill_name,
        skillCategory: body.skill_category,
        skillLevel: body.skill_level,
        certified: body.certified,
        certificateId: body.certificate_id,
        assessor: body.assessor,
        assessDate: body.assess_date,
        nextAssessDate: body.next_assess_date,
        remark: body.remark,
      })
      .where(eq(hrSkillMatrix.id, body.id));
    return successResponse(null, '更新成功');
  },
  { errorMessage: '更新技能记录失败' }
);

export const DELETE = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('缺少技能ID', 400, 400);
    await db
      .update(hrSkillMatrix)
      .set({ deleted: 1 })
      .where(eq(hrSkillMatrix.id, Number(id)));
    return successResponse(null, '删除成功');
  },
  { errorMessage: '删除技能记录失败' }
);
