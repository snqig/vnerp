import { getTranslations } from 'next-intl/server';

;
import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { UnqualifiedApplicationService } from '@/application/services/UnqualifiedApplicationService';
import { MysqlUnqualifiedRepository } from '@/infrastructure/repositories/MysqlUnqualifiedRepository';
import {
  DomainError,
  NotFoundError,
  VersionConflictError,
} from '@/domain/shared/DomainTypes';

const service = new UnqualifiedApplicationService(new MysqlUnqualifiedRepository());

function isHandleMethodValue(value: unknown): value is 'rework' | 'scrap' | 'concession' | 'return' {
  return value === 'rework' || value === 'scrap' || value === 'concession' || value === 'return';
}

function domainErrorToResponse(e: DomainError): NextResponse {
  if (e instanceof NotFoundError) {
    return errorResponse(e.message, 404);
  }
  if (e instanceof VersionConflictError) {
    return errorResponse(e.message, 409);
  }
  return errorResponse(e.message, 422);
}

export const GET = withPermission(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const status = searchParams.get('status') || 'all';
  const keyword = searchParams.get('keyword') || searchParams.get('handleNo') || '';
  const handleType = searchParams.get('handleType')
    ? Number(searchParams.get('handleType'))
    : undefined;
  const handleStatus = searchParams.get('handleStatus')
    ? Number(searchParams.get('handleStatus'))
    : undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  const result = await service.listRecords(status, { page, pageSize }, {
    keyword: keyword || undefined,
    handleType,
    handleStatus,
    startDate,
    endDate,
  });

  const list = result.data.map((record) => ({
    id: record.id,
    unqualified_no: record.unqualifiedNo,
    handle_no: record.handleNo,
    inspection_id: record.inspectionId,
    source_type: record.sourceType,
    source_no: record.sourceNo,
    material_id: record.materialId,
    material_code: record.materialCode,
    material_name: record.materialName,
    quantity: record.quantity,
    defect_type: record.defectType,
    defect_desc: record.defectDesc,
    handle_type: record.handleType?.toDbCode() ?? null,
    handle_status: record.status.toDbCode(),
    handle_result: record.handleResult ?? null,
    responsible_dept: record.responsibleDept,
    responsible_person: record.responsiblePerson,
    cost_amount: record.costAmount,
    handler: record.handler,
    handle_date: record.handleDate,
    remark: record.remark,
    create_time: record.createTime,
    update_time: record.updateTime,
    create_by: record.createBy,
    update_by: record.updateBy,
  }));

  return successResponse({
    list,
    total: result.pagination.total,
    page: result.pagination.page,
    pageSize: result.pagination.pageSize,
    totalPages: result.pagination.totalPages,
  });
}, { logTitle: '查询不合格品列表' });

export const POST = withPermission(async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
  try {
    const body = await request.json();
    const {
      inspection_id,
      source_type,
      source_no,
      material_id,
      material_code,
      material_name,
      quantity,
      defect_type,
      defect_desc,
      handle_type,
      responsible_dept,
      responsible_person,
      remark,
    } = body;

    if (!inspection_id || inspection_id <= 0) {
      return errorResponse(ts('k_sldnwj'), 400);
    }
    if (quantity === undefined || quantity <= 0) {
      return errorResponse(ts('k_1r79tz4'), 400);
    }
    if (handle_type !== undefined && !isHandleMethodValue(handle_type)) {
      return errorResponse(ts('k_1g4hjfe'), 400);
    }

    const result = await service.createRecord({
      inspectionId: Number(inspection_id),
      sourceType: source_type,
      sourceNo: source_no,
      materialId: material_id ? Number(material_id) : undefined,
      materialCode: material_code,
      materialName: material_name,
      quantity: Number(quantity),
      defectType: defect_type,
      defectDesc: defect_desc,
      handleType: handle_type,
      responsibleDept: responsible_dept,
      responsiblePerson: responsible_person,
      remark,
      createBy: userInfo.userId,
    });

    return successResponse(
      {
        id: result.id,
        unqualified_no: result.unqualifiedNo,
        handle_no: result.handleNo,
      },
      ts('k_16kx4xo')
    );
  } catch (e) {
    if (e instanceof DomainError) return domainErrorToResponse(e);
    throw e;
  }
}, { logTitle: '创建不合格品记录', logType: 'business' });

export const PUT = withPermission(async (request: NextRequest, userInfo) => {
  const ts = await getTranslations('Common');
  try {
    const body = await request.json();
    const { action, id } = body;

    if (!id) {
      return errorResponse(ts('k_1u4r88h'), 400);
    }
    if (action === 'start') {
      const { handle_type, responsible_dept, responsible_person } = body;
      if (!isHandleMethodValue(handle_type)) {
        return errorResponse(ts('k_1g4hjfe'), 400);
      }
      if (!responsible_dept || !responsible_dept.trim()) {
        return errorResponse(ts('k_1tuvq05'), 400);
      }
      if (!responsible_person || !responsible_person.trim()) {
        return errorResponse(ts('k_1joih2d'), 400);
      }

      const result = await service.startHandle({
        id: Number(id),
        handleType: handle_type,
        responsibleDept: responsible_dept,
        responsiblePerson: responsible_person,
        updateBy: userInfo.userId,
      });

      return successResponse(result, ts('k_gchcqi'));
    }

    if (action === 'complete') {
      const { handler, handle_result, cost_amount } = body;
      if (!handler || !handler.trim()) {
        return errorResponse(ts('k_z5ky01'), 400);
      }
      if (handle_result !== 1 && handle_result !== 2) {
        return errorResponse(ts('k_1qad9h0'), 400);
      }
      if (cost_amount === undefined || cost_amount < 0) {
        return errorResponse(ts('k_sxaiey'), 400);
      }

      const result = await service.completeHandle({
        id: Number(id),
        handler,
        handleResult: Number(handle_result),
        costAmount: Number(cost_amount),
        updateBy: userInfo.userId,
      });

      return successResponse(result, ts('k_da7gln'));
    }

    return errorResponse(ts('k_17a0jsi'), 400);
  } catch (e) {
    if (e instanceof DomainError) return domainErrorToResponse(e);
    throw e;
  }
}, { logTitle: '更新不合格品处理状态', logType: 'business' });

export const DELETE = withPermission(async (request: NextRequest) => {
  const ts = await getTranslations('Common');
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse(ts('k_1u4r88h'), 400);

    await service.deleteRecord(Number(id));
    return successResponse(null, ts('k_1hlqs'));
  } catch (e) {
    if (e instanceof DomainError) return domainErrorToResponse(e);
    throw e;
  }
}, { logTitle: '删除不合格品记录', logType: 'business' });
