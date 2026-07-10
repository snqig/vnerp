import { NextRequest } from 'next/server';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleOrderApplicationService } from '@/application/services/SampleOrderApplicationService';
import { MysqlSampleOrderRepository } from '@/infrastructure/repositories/MysqlSampleOrderRepository';

const service = new SampleOrderApplicationService(new MysqlSampleOrderRepository());

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || undefined;
  const customerName = searchParams.get('customerName') || undefined;
  const status = searchParams.get('status') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const result = await service.listOrders(
    { keyword, customerName, status, startDate, endDate } as any,
    page,
    pageSize
  );

  const totalPages = Math.ceil(result.total / pageSize);
  return paginatedResponse(
    result.list.map((o) => o.toProps()),
    { total: result.total, page, pageSize, totalPages }
  );
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();

    const validation = validateRequestBody(body, [
      'notify_date',
      'customer_name',
      'product_name',
      'material_no',
    ]);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const result = await service.createOrder(body);
    return successResponse(result, '打样订单创建成功');
  },
  { logTitle: '创建打样订单' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return errorResponse('打样订单ID不能为空', 400, 400);
    }

    await service.updateOrder(id, updateData);
    return successResponse({ id }, '打样订单更新成功');
  },
  { logTitle: '更新打样订单' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('打样订单ID不能为空', 400, 400);
    }

    await service.deleteOrder(parseInt(id));
    return successResponse(null, '打样订单删除成功');
  },
  { logTitle: '删除打样订单' }
);
