import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  validateRequestBody,
} from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { SampleOrderApplicationService } from '@/application/services/SampleOrderApplicationService';
import { MysqlSampleOrderRepository } from '@/infrastructure/repositories/MysqlSampleOrderRepository';
import { SampleOrderStatus } from '@/domain/sample/value-objects/SampleOrderStatus';
import type { SampleOrderProps } from '@/domain/sample/aggregates/SampleOrder';
import { logger, generateTraceId } from '@/lib/logger';
import type { DbRow } from '@/types/db';

const service = new SampleOrderApplicationService(new MysqlSampleOrderRepository());

const SNAKE_TO_CAMEL: Record<string, string> = {
  order_no: 'orderNo',
  notify_date: 'notifyDate',
  customer_id: 'customerId',
  customer_name: 'customerName',
  product_name: 'productName',
  material_no: 'materialNo',
  size_spec: 'sizeSpec',
  material_spec: 'materialSpec',
  specification: 'specification',
  order_date: 'orderDate',
  customer_require_date: 'customerRequireDate',
  delivery_date: 'deliveryDate',
  actual_delivery_date: 'actualDeliveryDate',
  delivery_status: 'deliveryStatus',
  status: 'status',
  remark: 'remark',
  create_by: 'createBy',
  create_time: 'createTime',
  update_time: 'updateTime',
  process_card_id: 'processCardId',
  work_order_id: 'workOrderId',
  sales_order_id: 'salesOrderId',
  sample_fee: 'sampleFee',
  fee_charged: 'feeCharged',
  fee_deductible: 'feeDeductible',
  fee_deducted: 'feeDeducted',
  sample_version: 'sampleVersion',
  parent_version_id: 'parentVersionId',
  converted_at: 'convertedAt',
  converted_by: 'convertedBy',
};

const CAMEL_TO_SNAKE: Record<string, string> = Object.entries(SNAKE_TO_CAMEL).reduce(
  (acc, [snake, camel]) => {
    acc[camel] = snake;
    return acc;
  },
  {} as Record<string, string>
);

function snakeBodyToCamelProps(body: DbRow): Partial<SampleOrderProps> {
  const props: unknown = {};
  for (const key of Object.keys(body)) {
    const camelKey = SNAKE_TO_CAMEL[key] ?? key;
    props[camelKey] = body[key];
  }
  return props as Partial<SampleOrderProps>;
}

function camelPropsToSnake(props: SampleOrderProps): unknown {
  const result: unknown = {};
  for (const key of Object.keys(props) as (keyof SampleOrderProps)[]) {
    const snakeKey = CAMEL_TO_SNAKE[key as string] ?? (key as string);
    result[snakeKey] = props[key];
  }
  return result;
}

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const traceId = generateTraceId();
  const ctx = { module: 'sample', action: 'GET_orders', traceId };
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || undefined;
  const customerName = searchParams.get('customerName') || undefined;
  const status = searchParams.get('status') as SampleOrderStatus | null;
  const deliveryStatus = searchParams.get('deliveryStatus') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  logger.info(ctx, ts('k_1ok6dbc'), {
    keyword,
    customerName,
    status,
    deliveryStatus,
    startDate,
    endDate,
    page,
    pageSize,
  });

  const dateFrom = startDate ? new Date(startDate) : undefined;
  const dateTo = endDate ? new Date(endDate) : undefined;

  const result = await service.listOrders(
    { keyword, customerName, status: status || undefined, deliveryStatus, dateFrom, dateTo },
    page,
    pageSize
  );

  logger.info(ctx, ts('k_km7o3t'), { total: result.total, page, pageSize });

  const totalPages = Math.ceil(result.total / pageSize);
  return paginatedResponse(
    result.list.map((o) => camelPropsToSnake(o.toProps())),
    { total: result.total, page, pageSize, totalPages }
  );
});

export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'POST_orders', traceId };
    const body = await request.json();

    logger.info(ctx, ts('k_1mau0l0'), {
      snakeCaseFields: Object.keys(body),
      customerName: body.customer_name,
      materialNo: body.material_no,
    });

    const validation = validateRequestBody(body, [
      'notify_date',
      'customer_name',
      'product_name',
      'material_no',
    ]);

    if (!validation.valid) {
      logger.warn(ctx, ts('k_3glcai'), { missing: validation.missing });
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    const props = snakeBodyToCamelProps(body);
    if (props.quantity !== undefined) {
      props.quantity = Number(props.quantity) || 0;
    }
    logger.info(ctx, ts('k_8m3r86'), { camelCaseFields: Object.keys(props) });
    const result = await service.createOrder(props);
    logger.info(ctx, ts('k_a1lazc'), { id: result.id, orderNo: result.orderNo });
    return successResponse({ id: result.id, order_no: result.orderNo }, ts('k_sw0qfy'));
  },
  { logTitle: '创建打样订单' }
);

export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const traceId = generateTraceId();
    const ctx = { module: 'sample', action: 'PUT_orders', traceId };
    const body = await request.json();
    const { id, ...rest } = body;

    if (!id) {
      return errorResponse(ts('k_qcdlp'), 400, 400);
    }

    logger.info(ctx, ts('k_1luhywv'), { id, snakeCaseFields: Object.keys(rest) });

    const props = snakeBodyToCamelProps(rest);
    if (props.quantity !== undefined) {
      props.quantity = Number(props.quantity) || 0;
    }
    logger.info(ctx, ts('k_8m3r86'), { id, camelCaseFields: Object.keys(props) });
    await service.updateOrder(Number(id), props);
    logger.info(ctx, ts('k_1qsbv43'), { id });
    return successResponse({ id }, ts('k_1clhq7v'));
  },
  { logTitle: '更新打样订单' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse(ts('k_qcdlp'), 400, 400);
    }

    await service.deleteOrder(parseInt(id));
    return successResponse(null, ts('k_h84zd7'));
  },
  { logTitle: '删除打样订单' }
);
