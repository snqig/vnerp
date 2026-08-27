import { NextRequest } from 'next/server';
import { getDrizzleDb } from '@/lib/db';
import { eq } from 'drizzle-orm';
import {
  orgGroup, orgLegalEntity, orgFactory, orgWorkshop, orgTeam, orgPosition,
} from '@/lib/db/schema';
import { withPermission } from '@/lib/api-permissions';
import { successResponse, errorResponse } from '@/lib/api-response';

const db = getDrizzleDb();

const tableMap: Record<string, any> = {
  group: orgGroup,
  legal_entity: orgLegalEntity,
  factory: orgFactory,
  workshop: orgWorkshop,
  team: orgTeam,
  position: orgPosition,
};

const parentKeyMap: Record<string, string> = {
  legal_entity: 'groupId',
  factory: 'legalEntityId',
  workshop: 'factoryId',
  team: 'workshopId',
  position: 'teamId',
};

export const POST = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { type, parentId, code, name, sortOrder, remark } = body;
  if (!type || !code || !name) return errorResponse('缺少必填字段', 400);
  if (!tableMap[type]) return errorResponse('无效的节点类型', 400);

  const table = tableMap[type];
  const insertData: Record<string, any> = { code, name, sortOrder: sortOrder || 0, remark: remark || null };
  if (type !== 'group' && parentId) {
    const parentKey = parentKeyMap[type];
    insertData[parentKey] = parentId;
  }

  const result = await db.insert(table).values(insertData);
  return successResponse({ id: Number(result[0].insertId) });
}, { errorMessage: '创建组织节点失败' });

export const PUT = withPermission(async (request: NextRequest) => {
  const body = await request.json();
  const { id, type, code, name, sortOrder, status, remark, ...extra } = body;
  if (!id || !type) return errorResponse('缺少ID或类型', 400);
  if (!tableMap[type]) return errorResponse('无效的节点类型', 400);

  const table = tableMap[type];
  const setData: Record<string, any> = {};
  if (code !== undefined) setData.code = code;
  if (name !== undefined) setData.name = name;
  if (sortOrder !== undefined) setData.sortOrder = sortOrder;
  if (status !== undefined) setData.status = status;
  if (remark !== undefined) setData.remark = remark;

  // Entity-specific fields
  if (type === 'factory' && extra.address !== undefined) setData.address = extra.address;
  if (type === 'factory' && extra.contactPerson !== undefined) setData.contactPerson = extra.contactPerson;
  if (type === 'factory' && extra.contactPhone !== undefined) setData.contactPhone = extra.contactPhone;
  if (type === 'workshop' && extra.managerName !== undefined) setData.managerName = extra.managerName;
  if (type === 'team' && extra.teamLeader !== undefined) setData.teamLeader = extra.teamLeader;
  if (type === 'position' && extra.skillLevel !== undefined) setData.skillLevel = extra.skillLevel;
  if (type === 'position' && extra.baseSalaryRange !== undefined) setData.baseSalaryRange = extra.baseSalaryRange;
  if (type === 'legal_entity' && extra.taxId !== undefined) setData.taxId = extra.taxId;
  if (type === 'legal_entity' && extra.legalPerson !== undefined) setData.legalPerson = extra.legalPerson;

  if (Object.keys(setData).length === 0) return errorResponse('没有需要更新的字段', 400);

  await db.update(table).set(setData).where(eq(table.id, id));
  return successResponse(null);
}, { errorMessage: '更新组织节点失败' });

export const DELETE = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id') || '');
  const type = searchParams.get('type');
  if (!id || !type) return errorResponse('缺少ID或类型', 400);
  if (!tableMap[type]) return errorResponse('无效的节点类型', 400);

  const table = tableMap[type];
  await db.update(table).set({ deleted: 1 }).where(eq(table.id, id));
  return successResponse(null);
}, { errorMessage: '删除组织节点失败' });
