import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { SalesOrderApprovedEvent } from '@/domain/sales/events/SalesOrderEvents';
import { WorkOrderCreatedEvent } from '@/domain/production/events/WorkOrderEvents';
import { query, transaction } from '@/lib/db';
import { getDomainEventOutbox } from '@/infrastructure/event-bus/DomainEventOutboxFactory';
import { secureLog } from '@/lib/logger';
import { WorkOrderPriority, WorkOrderStatus } from '@/lib/constants';
import type { DbRow } from '@/types/db';

export interface MaterialRequirementItem {
  materialId: number;
  materialCode: string;
  materialName: string;
  requiredQty: number;
  unit: string;
}

export interface WorkOrderCreationResult {
  workOrderId: number;
  workOrderNo: string;
  productName: string;
  plannedQty: number;
  materialCount: number;
}

export class SalesToWorkOrderHandler implements EventHandler<SalesOrderApprovedEvent> {
  async handle(event: SalesOrderApprovedEvent): Promise<void> {
    const {
      orderId,
      orderNo,
      customerId,
      customerName,
      lines,
      totalAmount: _totalAmount,
    } = event.payload;

    secureLog('info', 'Sales order approved, processing work order creation', {
      orderId,
      orderNo,
      lineCount: lines.length,
    });

    const workOrders: WorkOrderCreationResult[] = [];

    for (const line of lines) {
      try {
        const result = await this.createWorkOrderFromSalesLine({
          orderId,
          orderNo,
          customerId,
          customerName,
          materialId: line.materialId,
          materialCode: line.materialCode,
          materialName: line.materialName,
          requiredQty: line.orderQty,
          unitPrice: line.unitPrice,
        });

        if (result) {
          workOrders.push(result);
        }
      } catch (error) {
        secureLog('error', 'Failed to create work order from sales line', {
          orderNo,
          materialCode: line.materialCode,
          error: String(error),
        });
      }
    }

    secureLog('info', 'Work order creation completed', {
      orderNo,
      totalWorkOrders: workOrders.length,
      workOrders: workOrders.map((wo) => ({
        workOrderNo: wo.workOrderNo,
        productName: wo.productName,
      })),
    });
  }

  private async createWorkOrderFromSalesLine(params: {
    orderId: number;
    orderNo: string;
    customerId: number;
    customerName: string;
    materialId: number;
    materialCode: string;
    materialName: string;
    requiredQty: number;
    unitPrice: number;
  }): Promise<WorkOrderCreationResult | null> {
    const { orderId, orderNo, materialId, materialName, requiredQty } = params;

    const workOrderNo = this.generateWorkOrderNo();
    const today = new Date().toISOString().slice(0, 10);
    const endDate = this.calculateEndDate(requiredQty);

    // ② 主数据打通（方案 A）：销售订单行给的是 **物料** id（inv_material 域），而 BOM
    // （prd_bom.product_id）与工单的 product_id 属于 **产品** 域（mdm_product）。两域原本
    // 无任何键连接（mdm_product 无指向物料的列；名称对位仅 2/10；编码无转换规律），现由迁移
    // 20260923_add_mdm_product_material_bridge.sql 新增 mdm_product.material_id 作为显式
    // 对位列（严格三重印证回填，未确认者留 NULL）。
    // 故此处按 material_id 反查产品；**查不到就不猜** —— product_id 保持 0 并以 warn 记录，
    // 避免把「物料名」误当「产品归属」写成既成事实。
    const productRows = (await query(
      `SELECT id, product_code, product_name FROM mdm_product
       WHERE material_id = ? AND deleted = 0 LIMIT 1`,
      [materialId]
    )) as DbRow[];
    const product = productRows[0];
    const productId = Number(product?.id || 0);
    const productCode = String(product?.product_code || '');

    if (!product) {
      secureLog('warn', 'No mdm_product mapped for sales material; work order product_id left 0', {
        orderNo,
        materialId,
      });
    }

    // 单位取物料主数据。原写法把 i18n 译文 `ts('k_w0gthl')` 当单位写库（locale pollution），
    // 会把「当前语言下的译文」固化成业务数据，切语言后数据即失真。
    const unitRows = (await query(
      `SELECT unit FROM inv_material WHERE id = ? AND deleted = 0`,
      [materialId]
    )) as DbRow[];
    const unit = String(unitRows[0]?.unit || '').trim();
    // 有产品对位时用产品域名称；否则回退销售订单行带来的物料名（保持既有行为不退化）。
    const productName = String(product?.product_name || materialName || '');

    // getMaterialRequirements 按 prd_bom.product_id（**产品**域）查询，故此处必须传**产品** id
    // （原实现传的是物料 id → 恒空）。无产品对位时传 0 → 该查询自然返回空、materialCount = 0，
    // 即诚实降级，不伪造用料需求。
    const materialRequirements = productId
      ? await this.getMaterialRequirements(productId, requiredQty)
      : [];

    const workOrderId = await transaction(async (conn) => {
      // ⚠️ 原先此处写 `status = 1` / `priority = 2`（数字码写入 varchar 列）：
      //    - status 被 MySQL 强制转成字符串 '1'，成为 prod_work_order.status 的越界值
      //      （已由 20260923_converge_work_order_status_domain.sql 归一为 'pending'）；
      //    - priority 同理。二者都必须改用 src/lib/constants.ts 的规范词表。
      // 产品归属（product_id / product_code / product_name）见上方 ② 主数据打通说明。
      const [result] = await conn.execute(
        `INSERT INTO prod_work_order (
          work_order_no, sales_order_id, legacy_material_id,
          product_id, product_code, product_name,
          planned_qty, completed_qty, unit,
          plan_start_date, plan_end_date,
          priority, status, remark, create_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
        [
          workOrderNo,
          orderId,
          materialId,
          productId,
          productCode,
          productName,
          requiredQty,
          unit,
          today,
          endDate,
          WorkOrderPriority.NORMAL,
          WorkOrderStatus.PENDING,
          `由销售订单 ${orderNo} 生成`,
          0,
        ]
      );

      const woId = (result as unknown as { insertId: number }).insertId;

      // 域修正：此处原先传 `productId: materialId` —— 把**物料** id 当**产品** id 使用，
      // 属同一类域混淆（事件消费方若按 mdm_product 解读该字段即得错误主体）。
      // 现统一为上方反查得到的**产品域** id / 名称；无对位时为 0 / 回退物料名。
      await getDomainEventOutbox().saveEvents(conn, 'WorkOrder', woId, [
        new WorkOrderCreatedEvent({
          workOrderId: woId,
          workOrderNo,
          productId,
          productName,
          plannedQty: requiredQty,
        }),
      ]);

      return woId;
    });

    return {
      workOrderId,
      workOrderNo,
      productName,
      plannedQty: requiredQty,
      materialCount: materialRequirements.length,
    };
  }

  private generateWorkOrderNo(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    return `WO${dateStr}${String(date.getTime()).slice(-6)}`;
  }

  private async getMaterialRequirements(
    productId: number,
    plannedQty: number
  ): Promise<MaterialRequirementItem[]> {
    const bomRows = (await query(
      `SELECT bd.material_id, m.material_code, m.material_name, bd.quantity, bd.unit
       FROM prd_bom_detail bd
       LEFT JOIN inv_material m ON m.id = bd.material_id
       WHERE bd.bom_id IN (SELECT id FROM prd_bom WHERE product_id = ? AND status = 1)`,
      [productId]
    )) as DbRow[];

    if (bomRows.length === 0) {
      return [];
    }

    return bomRows.map((row) => ({
      materialId: Number(row.material_id ?? 0),
      materialCode: String(row.material_code ?? ''),
      materialName: String(row.material_name ?? ''),
      requiredQty: (Number(row.quantity ?? 0)) * plannedQty,
      // 原写法 `row.unit || ts('k_w0gthl')` 是 locale pollution（把译文当单位）；
      // prd_bom_detail 若无单位则留空，交由调用方按物料主数据补齐。
      unit: String(row.unit ?? ''),
    }));
  }

  private calculateEndDate(plannedQty: number): string {
    const days = Math.ceil(plannedQty / 100);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Math.min(days, 30));
    return endDate.toISOString().slice(0, 10);
  }
}
