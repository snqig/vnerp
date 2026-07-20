import { NextRequest } from 'next/server';
import { getDrizzleDb } from '@/lib/db';
import { eq, and, desc, count } from 'drizzle-orm';
import { hrCertificate } from '@/lib/db/schema';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';

const db = getDrizzleDb();

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const employeeId = searchParams.get('employeeId');
  const certType = searchParams.get('certType');
  const status = searchParams.get('status');

  const conditions = [eq(hrCertificate.deleted, 0)];
  if (employeeId) conditions.push(eq(hrCertificate.employeeId, Number(employeeId)));
  if (certType) conditions.push(eq(hrCertificate.certType, certType));
  if (status) conditions.push(eq(hrCertificate.status, Number(status)));

  const [{ total }] = await db.select({ total: count() }).from(hrCertificate).where(and(...conditions));
  const list = await db.select().from(hrCertificate)
    .where(and(...conditions))
    .orderBy(desc(hrCertificate.createTime))
    .limit(pageSize).offset((page - 1) * pageSize);

  return successResponse({ list, total, page, pageSize });
}, { errorMessage: '获取证书列表失败' });

export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { employeeId, certName, certCode, certType, issueAuthority, issueDate, expiryDate, remindDays, status, fileUrl, remark } = body;
  const result = await db.insert(hrCertificate).values({
    employeeId, certName, certCode, certType, issueAuthority, issueDate, expiryDate, remindDays, status, fileUrl, remark,
  });
  return successResponse({ id: Number(result[0].insertId) }, '证书创建成功');
}, { errorMessage: '创建证书失败' });

export const PUT = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  if (!body.id) return errorResponse('缺少证书ID', 400, 400);
  const { id, ...data } = body;
  await db.update(hrCertificate).set(data).where(eq(hrCertificate.id, id));
  return successResponse(null, '更新成功');
}, { errorMessage: '更新证书失败' });

export const DELETE = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return errorResponse('缺少证书ID', 400, 400);
  await db.update(hrCertificate).set({ deleted: 1 }).where(eq(hrCertificate.id, Number(id)));
  return successResponse(null, '删除成功');
}, { errorMessage: '删除证书失败' });
