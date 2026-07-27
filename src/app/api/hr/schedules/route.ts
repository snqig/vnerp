import { NextRequest } from 'next/server';
import { getDrizzleDb } from '@/lib/db';
import { eq, and, desc, count, type SQLWrapper } from 'drizzle-orm';
import { hrSchedule, hrShift, sysEmployee } from '@/lib/db/schema';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';

const db = getDrizzleDb();

export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const employeeId = searchParams.get('employeeId');
    const scheduleDate = searchParams.get('scheduleDate');

    const conditions: SQLWrapper[] = [];
    if (employeeId) conditions.push(eq(hrSchedule.employeeId, Number(employeeId)));
    if (scheduleDate) conditions.push(eq(hrSchedule.scheduleDate, new Date(scheduleDate)));

    const [{ total }] = await db
      .select({ total: count() })
      .from(hrSchedule)
      .where(and(...conditions));
    const list = await db
      .select({
        id: hrSchedule.id,
        employeeId: hrSchedule.employeeId,
        employeeName: sysEmployee.name,
        shiftId: hrSchedule.shiftId,
        shiftName: hrShift.shiftName,
        startDate: hrSchedule.scheduleDate,
        endDate: hrSchedule.scheduleDate,
        status: hrSchedule.status,
      })
      .from(hrSchedule)
      .leftJoin(hrShift, eq(hrSchedule.shiftId, hrShift.id))
      .leftJoin(sysEmployee, eq(hrSchedule.employeeId, sysEmployee.id))
      .where(and(...conditions))
      .orderBy(desc(hrSchedule.scheduleDate))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return successResponse({ list, total, page, pageSize });
  },
  { errorMessage: '获取排班列表失败' }
);

export const POST = withPermission(
  async (request: NextRequest) => {
    const body = await request.json();
    const { employeeId, shiftId, startDate, endDate } = body;

    if (!employeeId || !shiftId || !startDate) {
      return errorResponse('缺少必填字段', 400, 400);
    }

    try {
      // 如果有结束日期，批量创建排班
      if (endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const schedules = [];

        while (start <= end) {
          schedules.push({
            employeeId,
            shiftId,
            scheduleDate: new Date(start),
            scheduleType: 'normal',
            source: 'manual',
            status: 1,
          });
          start.setDate(start.getDate() + 1);
        }

        await db
          .insert(hrSchedule)
          .values(schedules)
          .onDuplicateKeyUpdate({
            set: {
              scheduleType: 'normal',
              source: 'manual',
            },
          });
      } else {
        await db
          .insert(hrSchedule)
          .values({
            employeeId,
            shiftId,
            scheduleDate: new Date(startDate),
            scheduleType: 'normal',
            source: 'manual',
            status: 1,
          })
          .onDuplicateKeyUpdate({
            set: {
              scheduleType: 'normal',
              source: 'manual',
            },
          });
      }

      return successResponse(null, '排班创建成功');
    } catch (error) {
      return errorResponse('排班创建失败', 500, 500);
    }
  },
  { errorMessage: '创建排班失败' }
);

export const DELETE = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('缺少排班ID', 400, 400);

    await db.delete(hrSchedule).where(eq(hrSchedule.id, Number(id)));
    return successResponse(null, '删除成功');
  },
  { errorMessage: '删除排班失败' }
);
