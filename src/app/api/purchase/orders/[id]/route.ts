import { NextRequest } from 'next/server';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { DomainError, NotFoundError } from '@/domain/shared/DomainTypes';
import { PurchaseApplicationService } from '@/application/services/PurchaseApplicationService';
import { CurrencyApplicationService } from '@/application/services/CurrencyApplicationService';
import { RepositoryRegistry } from '@/infrastructure/RepositoryRegistry';
import { MysqlCurrencyRepository } from '@/infrastructure/repositories/MysqlCurrencyRepository';
import { registerEventHandlers } from '@/application/EventRegistry';

function getPurchaseService(): PurchaseApplicationService {
  registerEventHandlers();
  const orderRepo = RepositoryRegistry.getPurchaseOrderRepository();
  const currencyService = new CurrencyApplicationService(new MysqlCurrencyRepository());
  return new PurchaseApplicationService(orderRepo, currencyService);
}

// GET /api/purchase/orders/:id — 按 id 查询采购单聚合根（订单头 + 明细）
export const GET = withPermission(
  async (
    _request: NextRequest,
    _userInfo: UserInfo,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;

    // 校验 id 为数字，非法与不存在统一返回 404
    if (!/^\d+$/.test(id)) {
      return commonErrors.notFound('采购单不存在');
    }

    const service = getPurchaseService();

    let order;
    try {
      order = await service.getOrderById(Number(id));
    } catch (error) {
      if (error instanceof NotFoundError) {
        return commonErrors.notFound(error.message);
      }
      if (error instanceof DomainError) {
        return errorResponse(error.message, 400, 400);
      }
      throw error;
    }

    const serializedOrder = {
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
    };

    return successResponse(serializedOrder, '查询成功');
  }
);
