import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { getDrizzleDb } from '@/lib/db';
import { eq, and, like, desc } from 'drizzle-orm';
import { hrShift } from '@/lib/db/schema';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';

const db = getDrizzleDb();

/**
 * 班次可写字段白名单。
 *
 * 审计字段（id / createTime / updateTime / deleted）一律不接受客户端提交，原因有二：
 * 1. 列表接口经 `sanitizeObject` 序列化时会把 Date 转成 'YYYY-MM-DD'（丢掉时分秒），
 *    页面「读取整行 → 编辑 → 回写整行」会把该字符串原样送回；Drizzle 的 datetime 列
 *    在写入时会对值调用 `value.toISOString()`，字符串没有该方法，于是抛 TypeError，
 *    被统一错误处理包装成「更新班次失败」（HTTP 500）。
 * 2. `update_time` 由 DDL 的 ON UPDATE CURRENT_TIMESTAMP 维护，`deleted` 由 DELETE 接口维护，
 *    允许客户端覆盖会破坏审计语义。
 */
const SHIFT_WRITABLE_FIELDS = [
  'shiftName',
  'startTime',
  'endTime',
  'allowOvertime',
  'overtimeRate',
  'nightAllowance',
  'lateThreshold',
  'earlyLeaveThreshold',
  'workingHours',
  'sortOrder',
  'status',
  'remark',
] as const;

function pickShiftWritable(body: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const key of SHIFT_WRITABLE_FIELDS) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  return patch;
}

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
  const result = await db.insert(hrShift).values(pickShiftWritable(body) as typeof hrShift.$inferInsert);
  return successResponse({ id: Number(result[0].insertId) });
}, { errorMessage: '创建班次失败' });

export const PUT = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  const body = await request.json();
  if (!body.id) return errorResponse(ts('k_1nhn83'), 400, 400);
  const patch = pickShiftWritable(body);
  if (Object.keys(patch).length === 0) {
    return errorResponse('没有可更新的字段', 400, 400);
  }
  await db.update(hrShift)
    .set(patch as Partial<typeof hrShift.$inferInsert>)
    .where(eq(hrShift.id, body.id));
  return successResponse(null);
}, { errorMessage: '更新班次失败' });

export const DELETE = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  // id 允许两种来源：查询串（页面「单条删除」与「批量删除」的实际调用方式 ?id=xxx）
  // 以及 JSON body（历史调用方式）。旧实现只读 body，而页面发的是查询串，
  // 无 body 时 request.json() 会抛异常并被统一错误处理包装成「删除班次失败」（HTTP 500）。
  const { searchParams } = new URL(request.url);
  let rawId: unknown = searchParams.get('id');
  if (rawId === null || rawId === undefined || rawId === '') {
    try {
      const body = await request.json();
      rawId = (body as { id?: unknown } | null)?.id;
    } catch {
      rawId = undefined;
    }
  }
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse(ts('k_1nhn83'), 400, 400);
  }
  await db.update(hrShift).set({ deleted: 1 }).where(eq(hrShift.id, id));
  return successResponse(null);
}, { errorMessage: '删除班次失败' });
