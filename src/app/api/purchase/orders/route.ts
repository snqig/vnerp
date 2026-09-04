import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { DomainError, NotFoundError, VersionConflictError } from '@/domain/shared/DomainTypes';
import { PurchaseApplicationService } from '@/application/services/PurchaseApplicationService';
import { CurrencyApplicationService } from '@/application/services/CurrencyApplicationService';
import { RepositoryRegistry } from '@/infrastructure/RepositoryRegistry';
import { MysqlCurrencyRepository } from '@/infrastructure/repositories/MysqlCurrencyRepository';
import { registerEventHandlers } from '@/application/EventRegistry';
import { checkMaterialsCategorized } from '@/lib/category-validation';
import { secureLog } from '@/lib/logger';
import { getSystemConfigNumber } from '@/lib/system-config';
import type { DbRow } from '@/types/db';

function getPurchaseService(): PurchaseApplicationService {
  registerEventHandlers();
  const orderRepo = RepositoryRegistry.getPurchaseOrderRepository();
  const currencyService = new CurrencyApplicationService(new MysqlCurrencyRepository());
  return new PurchaseApplicationService(orderRepo, currencyService);
}

export const GET = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const supplierId = searchParams.get('supplierId');
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const service = getPurchaseService();
  const result = await service.listOrders(status, page, pageSize, {
    keyword: keyword || undefined,
    supplierId: supplierId ? parseInt(supplierId) : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const serializedData = result.data.map((order) => ({
    id: order.id,
    po_no: order.orderNo,
    supplier_id: order.supplierId,
    supplier_name: order.supplierName,
    supplier_code: order.supplierCode,
    order_date: order.orderDate,
    delivery_date: order.deliveryDate,
    currency: order.currency,
    exchange_rate: order.exchangeRate,
    total_amount: order.totalAmount,
    total_quantity: order.totalQuantity,
    tax_rate: order.taxRate,
    tax_amount: order.taxAmount,
    grand_total: order.grandTotal,
    base_currency: order.baseCurrency,
    base_total_amount: order.baseTotalAmount,
    base_tax_amount: order.baseTaxAmount,
    base_grand_total: order.baseGrandTotal,
    status: order.status.toDbCode(),
    status_label: order.status.label(),
    over_receipt_tolerance: order.overReceiptTolerance,
    payment_terms: order.paymentTerms,
    remark: order.remark,
    create_by: order.createBy,
    audit_by: order.auditBy,
    audit_time: order.auditTime,
    total_received_qty: order.totalReceivedQty,
    is_fully_received: order.isFullyReceived,
    create_time: order.createTime,
    update_time: order.updateTime,
    lines: order.lines.map((line) => ({
      id: line.id,
      line_no: line.lineNo,
      material_id: line.materialId,
      material_code: line.materialCode,
      material_name: line.materialName,
      material_spec: line.materialSpec,
      unit: line.unit,
      order_qty: line.orderQty,
      received_qty: line.receivedQty,
      remaining_qty: line.remainingQty,
      max_receivable_qty:
        Math.round(
          (line.orderQty * (1 + order.overReceiptTolerance / 100) - line.receivedQty) * 10000
        ) / 10000,
      unit_price: line.unitPrice,
      amount: line.amount,
      tax_rate: line.taxRate,
      tax_amount: line.taxAmount,
      line_total: line.lineTotal,
      base_unit_price: line.baseUnitPrice,
      base_amount: line.baseAmount,
      base_tax_amount: line.baseTaxAmount,
      base_line_total: line.baseLineTotal,
      require_date: line.requireDate,
      is_fully_received: line.isFullyReceived,
    })),
  }));

  return paginatedResponse(serializedData, result.pagination);
});

export const POST = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const body = await request.json();

    const validation = validateRequestBody(body, ['supplier_id', 'lines']);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return errorResponse(ts('k_193r78b'), 400, 400);
    }

    // 系统设置 category.require_on_business：采购单要求物料已归类
    const materialIds = (body.lines as DbRow[]).map((line) => line.material_id).filter(Boolean);
    secureLog('info', ts('k_t9esp7'), {
      itemCount: body.lines.length,
      materialIds,
    });
    const categoryCheck = await checkMaterialsCategorized(materialIds);
    secureLog('info', ts('k_1q9ze1i'), {
      blocked: categoryCheck.blocked,
      uncategorizedCount: categoryCheck.uncategorized.length,
    });
    if (categoryCheck.blocked) {
      secureLog('warn', ts('k_r5m0xa'), {
        message: categoryCheck.message,
      });
      return errorResponse(categoryCheck.message!, 400, 400);
    }
    if (categoryCheck.message) {
      secureLog('warn', ts('k_1j8kkoq'), {
        message: categoryCheck.message,
      });
    }

    const service = getPurchaseService();

    try {
      const result = await service.createOrder({
        supplierId: body.supplier_id,
        supplierName: body.supplier_name || '',
        supplierCode: body.supplier_code || '',
        orderDate: body.order_date || new Date().toISOString().slice(0, 10),
        deliveryDate: body.delivery_date || '',
        currency: body.currency,
        exchangeRate: body.exchange_rate || 1.0,
        taxRate: body.tax_rate,
        overReceiptTolerance:
          body.over_receipt_tolerance === undefined || body.over_receipt_tolerance === null
            ? await getSystemConfigNumber('purchase.over_receipt_tolerance', 5)
            : Number(body.over_receipt_tolerance),
        paymentTerms: body.payment_terms || '',
        deliveryAddress: body.delivery_address || '',
        remark: body.remark || '',
        createBy: userInfo.userId,
        lines: body.lines.map((line: DbRow, index: number) => ({
          lineNo: index + 1,
          materialId: line.material_id,
          materialCode: line.material_code || '',
          materialName: line.material_name || '',
          materialSpec: line.material_spec || '',
          unit: line.unit || ts('k_w0gthl'),
          orderQty: line.order_qty,
          receivedQty: 0,
          returnedQty: 0,
          unitPrice: line.unit_price || 0,
          amount: 0,
          taxRate: body.tax_rate,
          taxAmount: 0,
          lineTotal: 0,
          requireDate: line.require_date,
          remark: line.remark || '',
        })),
      });

      return successResponse(
        { ...result, uncategorizedMaterials: categoryCheck.uncategorized },
        categoryCheck.message ? `采购单创建成功。${categoryCheck.message}` : ts('k_qqp9rs')
      );
    } catch (error) {
      if (error instanceof DomainError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { errorMessage: '操作失败' }
);

export const PUT = withPermission(
  async (request: NextRequest, userInfo: UserInfo) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return errorResponse(ts('k_22hbhn'), 400, 400);
    }

    if (body.currency !== undefined) {
      return errorResponse(tc('currencyImmutableWarning'), 400, 400);
    }
    if (body.exchange_rate !== undefined) {
      return errorResponse(ts('k_zgrm21'), 400, 400);
    }

    const service = getPurchaseService();

    try {
      if (action === 'submit') {
        const result = await service.submitOrder(id);
        return successResponse(result, ts('k_1gyycb1'));
      }

      if (action === 'approve') {
        const result = await service.approveOrder(id, userInfo.userId);
        return successResponse(result, ts('k_1qte13s'));
      }

      if (action === 'close') {
        const result = await service.closeOrder(id);
        return successResponse(result, ts('k_s71y9p'));
      }

      if (action === 'receive') {
        return errorResponse(
          ts('k_wo9jp1'),
          410,
          410
        );
      }

      return errorResponse(ts('k_ztn3ax'), 400, 400);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return commonErrors.notFound(error.message);
      }
      if (error instanceof VersionConflictError) {
        return errorResponse(error.message, 409, 409);
      }
      if (error instanceof DomainError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { errorMessage: '操作失败' }
);

export const DELETE = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse(ts('k_22hbhn'), 400, 400);
    }

    const service = getPurchaseService();

    try {
      await service.deleteOrder(parseInt(id));
      return successResponse(null, ts('k_1nxdv31'));
    } catch (error) {
      if (error instanceof NotFoundError) {
        return commonErrors.notFound(error.message);
      }
      if (error instanceof DomainError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }
  },
  { errorMessage: '操作失败' }
);
