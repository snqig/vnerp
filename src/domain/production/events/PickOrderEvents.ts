import { DomainEvent } from '../../shared/DomainTypes';

/**
 * 生产领料单审核通过事件
 *
 * 生产模块发布，库存模块订阅处理。
 * 依据: docs/生产工单 - 领料 - 库存 - 完工入库 全链路完善方案.md 第三章
 */
export class PickOrderApprovedEvent implements DomainEvent {
  readonly eventType = 'prod.pick.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      pickOrderId: number;
      pickOrderNo: string;
      workOrderId: number | null;
      workOrderNo: string | null;
      warehouseId: number;
      operatorName: string | null;
      items: Array<{
        materialId: number;
        materialCode: string | null;
        materialName: string | null;
        quantity: number;
        unit: string | null;
        batchNo: string | null;
        requiredQty: number;
      }>;
    }
  ) {}
}

/**
 * 出库完成回调事件（库存 → 生产回写）
 *
 * 库存模块处理完出库后发布，生产模块订阅回写实际批次与成本。
 * 第一阶段暂不实现回写处理器，仅定义事件供后续使用。
 */
export class OutboundCompletedEvent implements DomainEvent {
  readonly eventType = 'inventory.outbound.completed';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      bizOrderId: number;
      bizType: 'material_issue';
      outboundOrderId: number | null;
      items: Array<{
        materialId: number;
        actualQty: number;
        unitCost: number;
        totalCost: number;
        batchNo: string;
      }>;
    }
  ) {}
}

/**
 * 生产退料单审核通过事件
 *
 * 生产模块发布，库存模块订阅处理（增加库存 + 写交易流水 + 写财务凭证）。
 */
export class MaterialReturnApprovedEvent implements DomainEvent {
  readonly eventType = 'prod.return.approved';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      returnId: number;
      returnNo: string;
      workOrderId: number | null;
      workOrderNo: string | null;
      warehouseId: number;
      operatorName: string | null;
      items: Array<{
        materialId: number;
        materialCode: string | null;
        materialName: string | null;
        quantity: number;
        unit: string | null;
        batchNo: string | null;
      }>;
    }
  ) {}
}
