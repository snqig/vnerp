import { describe, it, expect, beforeEach } from 'vitest';
import { StocktakingOrder, type StocktakingOrderProps } from '@/domain/warehouse/aggregates/StocktakingOrder';
import { type StocktakingItemProps } from '@/domain/warehouse/entities/StocktakingItem';
import { StocktakingStatusEnum } from '@/domain/warehouse/value-objects/StocktakingStatus';
import { DomainError } from '@/domain/shared/DomainTypes';

function makeItemProps(overrides: Partial<StocktakingItemProps> = {}): StocktakingItemProps {
  return {
    id: 1,
    materialId: 1,
    materialCode: 'M001',
    materialName: '测试物料',
    batchNo: 'B001',
    bookQty: 100,
    unit: '件',
    unitPrice: 10,
    ...overrides,
  };
}

function makeOrderProps(overrides: Partial<StocktakingOrderProps> = {}): StocktakingOrderProps {
  return {
    id: 1,
    checkNo: 'ST001',
    type: 1,
    warehouseId: 1,
    warehouseName: '主仓库',
    applicantName: '申请人',
    items: [makeItemProps()],
    ...overrides,
  };
}

describe('StocktakingOrder 聚合根', () => {
  describe('create() 工厂方法', () => {
    it('合法参数创建成功，状态为 DRAFT(0)', () => {
      const order = StocktakingOrder.create(makeOrderProps());
      expect(order.status.value).toBe(StocktakingStatusEnum.DRAFT);
      expect(order.checkNo).toBe('ST001');
      expect(order.warehouseName).toBe('主仓库');
      expect(order.type).toBe(1);
      expect(order.totalItems).toBe(1);
      expect(order.diffItems).toBe(0);
      expect(order.totalDiffAmount).toBe(0);
    });

    it('有 id 时发布 StocktakingOrderCreatedEvent', () => {
      const order = StocktakingOrder.create(makeOrderProps({ id: 100 }));
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('stocktaking.created');
      expect(events[0].payload.stocktakingId).toBe(100);
      expect(events[0].payload.checkNo).toBe('ST001');
      expect(events[0].payload.warehouseId).toBe(1);
      expect(events[0].payload.stocktakingType).toBe(1);
    });

    it('无 id 时不发布创建事件', () => {
      const order = StocktakingOrder.create(makeOrderProps({ id: undefined }));
      expect(order.getDomainEvents()).toHaveLength(0);
    });

    it('warehouseId 为 0 抛 DomainError', () => {
      expect(() => StocktakingOrder.create(makeOrderProps({ warehouseId: 0 }))).toThrow(DomainError);
      expect(() => StocktakingOrder.create(makeOrderProps({ warehouseId: 0 }))).toThrow(
        /仓库ID不能为空/
      );
    });

    it('items 为空数组抛 DomainError', () => {
      expect(() => StocktakingOrder.create(makeOrderProps({ items: [] }))).toThrow(DomainError);
      expect(() => StocktakingOrder.create(makeOrderProps({ items: [] }))).toThrow(/盘点项不能为空/);
    });

    it('totalItems 自动计算为 items 长度', () => {
      const order = StocktakingOrder.create(
        makeOrderProps({
          items: [
            makeItemProps({ id: 1 }),
            makeItemProps({ id: 2 }),
            makeItemProps({ id: 3 }),
          ],
        })
      );
      expect(order.totalItems).toBe(3);
    });
  });

  describe('reconstitute() 重建方法', () => {
    it('从 DB 字段重建聚合', () => {
      const order = StocktakingOrder.reconstitute(
        makeOrderProps({
          status: StocktakingStatusEnum.APPROVED,
          totalItems: 5,
          diffItems: 2,
          totalDiffAmount: 100,
          approverId: 7,
          approverName: '审批人',
          approveTime: '2026-07-06 12:00:00',
          approveRemark: '同意',
        })
      );
      expect(order.status.value).toBe(StocktakingStatusEnum.APPROVED);
      expect(order.totalItems).toBe(5);
      expect(order.diffItems).toBe(2);
      expect(order.totalDiffAmount).toBe(100);
      expect(order.approverId).toBe(7);
      expect(order.approverName).toBe('审批人');
      expect(order.approveTime).toBe('2026-07-06 12:00:00');
      expect(order.approveRemark).toBe('同意');
    });

    it('未指定 totalItems 时自动计算为 items 长度', () => {
      const order = StocktakingOrder.reconstitute(
        makeOrderProps({
          totalItems: undefined,
          items: [
            makeItemProps({ id: 1 }),
            makeItemProps({ id: 2 }),
          ],
        })
      );
      expect(order.totalItems).toBe(2);
    });
  });

  describe('start() 开始盘点流程', () => {
    it('DRAFT → IN_PROGRESS，发布开始事件', () => {
      const order = StocktakingOrder.create(makeOrderProps({ id: 1 }));
      order.clearDomainEvents();

      order.start();

      expect(order.status.value).toBe(StocktakingStatusEnum.IN_PROGRESS);
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('stocktaking.started');
      expect(events[0].payload.checkNo).toBe('ST001');
    });

    it('非 DRAFT 状态开始盘点抛错', () => {
      const order = StocktakingOrder.reconstitute(
        makeOrderProps({ status: StocktakingStatusEnum.IN_PROGRESS })
      );
      expect(() => order.start()).toThrow(DomainError);
    });
  });

  describe('submitForApproval() 提交审批流程', () => {
    it('IN_PROGRESS → PENDING_APPROVAL，计算差异统计', () => {
      const order = StocktakingOrder.reconstitute(
        makeOrderProps({
          id: 1,
          status: StocktakingStatusEnum.IN_PROGRESS,
          items: [
            makeItemProps({ id: 1, bookQty: 100, actualQty: 80, diffQty: -20, diffAmount: -200 }),
            makeItemProps({ id: 2, bookQty: 50, actualQty: 50, diffQty: 0, diffAmount: 0 }),
            makeItemProps({ id: 3, bookQty: 30, actualQty: 35, diffQty: 5, diffAmount: 50 }),
          ],
        })
      );
      order.clearDomainEvents();

      order.submitForApproval();

      expect(order.status.value).toBe(StocktakingStatusEnum.PENDING_APPROVAL);
      expect(order.diffItems).toBe(2);
      expect(order.totalDiffAmount).toBe(-150);
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('stocktaking.submitted');
      expect(events[0].payload.totalItems).toBe(3);
      expect(events[0].payload.diffItems).toBe(2);
    });

    it('非 IN_PROGRESS 状态提交审批抛错', () => {
      const order = StocktakingOrder.create(makeOrderProps({ id: 1 }));
      expect(() => order.submitForApproval()).toThrow(DomainError);
    });
  });

  describe('approve() 审批流程', () => {
    it('PENDING_APPROVAL → APPROVED，设置审批人信息', () => {
      const order = StocktakingOrder.reconstitute(
        makeOrderProps({
          id: 1,
          status: StocktakingStatusEnum.PENDING_APPROVAL,
          items: [
            makeItemProps({ id: 1, bookQty: 100, actualQty: 80, diffQty: -20, diffAmount: -200 }),
          ],
        })
      );
      order.clearDomainEvents();

      order.approve(10, '审批人', '同意调整');

      expect(order.status.value).toBe(StocktakingStatusEnum.APPROVED);
      expect(order.approverId).toBe(10);
      expect(order.approverName).toBe('审批人');
      expect(order.approveTime).toBeTruthy();
      expect(order.approveRemark).toBe('同意调整');
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('stocktaking.approved');
      expect(events[0].payload.diffItems).toHaveLength(1);
      expect((events[0].payload as any).diffItems[0].adjustType).toBe(2); // 盘亏
    });

    it('盘盈项 adjustType 为 1', () => {
      const order = StocktakingOrder.reconstitute(
        makeOrderProps({
          id: 1,
          status: StocktakingStatusEnum.PENDING_APPROVAL,
          items: [
            makeItemProps({ id: 1, bookQty: 100, actualQty: 120, diffQty: 20, diffAmount: 200 }),
          ],
        })
      );
      order.clearDomainEvents();

      order.approve(10, '审批人');

      const events = order.getDomainEvents();
      expect((events[0].payload as any).diffItems[0].adjustType).toBe(1); // 盘盈
    });

    it('非 PENDING_APPROVAL 状态审批抛错', () => {
      const order = StocktakingOrder.create(makeOrderProps({ id: 1 }));
      expect(() => order.approve()).toThrow(DomainError);
    });
  });

  describe('cancel() 取消流程', () => {
    it('DRAFT → CANCELLED，发布取消事件', () => {
      const order = StocktakingOrder.create(makeOrderProps({ id: 1 }));
      order.clearDomainEvents();

      order.cancel('不需要');

      expect(order.status.value).toBe(StocktakingStatusEnum.CANCELLED);
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('stocktaking.cancelled');
      expect(events[0].payload.reason).toBe('不需要');
    });

    it('IN_PROGRESS → CANCELLED', () => {
      const order = StocktakingOrder.reconstitute(
        makeOrderProps({ id: 1, status: StocktakingStatusEnum.IN_PROGRESS })
      );
      order.cancel();
      expect(order.status.value).toBe(StocktakingStatusEnum.CANCELLED);
    });

    it('APPROVED → CANCELLED 抛错（终态不可取消）', () => {
      const order = StocktakingOrder.reconstitute(
        makeOrderProps({ status: StocktakingStatusEnum.APPROVED })
      );
      expect(() => order.cancel()).toThrow(DomainError);
    });
  });

  describe('processDiff() 差异处理', () => {
    it('有差异的盘点项标记为已处理', () => {
      const order = StocktakingOrder.reconstitute(
        makeOrderProps({
          id: 1,
          status: StocktakingStatusEnum.PENDING_APPROVAL,
          items: [
            makeItemProps({ id: 1, bookQty: 100, actualQty: 80, diffQty: -20, diffAmount: -200, status: 1 }),
          ],
        })
      );

      order.processDiff(1);

      expect(order.items[0].status).toBe(2);
    });

    it('不存在的盘点项抛 DomainError', () => {
      const order = StocktakingOrder.create(makeOrderProps({ id: 1 }));
      expect(() => order.processDiff(999)).toThrow(DomainError);
      expect(() => order.processDiff(999)).toThrow(/盘点项不存在/);
    });

    it('无差异的盘点项抛 DomainError', () => {
      const order = StocktakingOrder.reconstitute(
        makeOrderProps({
          id: 1,
          status: StocktakingStatusEnum.PENDING_APPROVAL,
          items: [
            makeItemProps({ id: 1, bookQty: 100, actualQty: 100, diffQty: 0, diffAmount: 0, status: 1 }),
          ],
        })
      );
      expect(() => order.processDiff(1)).toThrow(DomainError);
      expect(() => order.processDiff(1)).toThrow(/无差异/);
    });
  });

  describe('权限委托', () => {
    it('canEdit/canDelete 委托给 StocktakingStatus', () => {
      const draft = StocktakingOrder.create(makeOrderProps());
      expect(draft.canEdit()).toBe(true);
      expect(draft.canDelete()).toBe(true);

      const approved = StocktakingOrder.reconstitute(
        makeOrderProps({ status: StocktakingStatusEnum.APPROVED })
      );
      expect(approved.canEdit()).toBe(false);
      expect(approved.canDelete()).toBe(false);
    });
  });

  describe('领域事件管理', () => {
    it('getDomainEvents 返回副本（不可变）', () => {
      const order = StocktakingOrder.create(makeOrderProps({ id: 1 }));
      const events1 = order.getDomainEvents();
      order.clearDomainEvents();
      expect(events1).toHaveLength(1);
    });

    it('clearDomainEvents 清空事件', () => {
      const order = StocktakingOrder.create(makeOrderProps({ id: 1 }));
      expect(order.getDomainEvents()).toHaveLength(1);
      order.clearDomainEvents();
      expect(order.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('items 访问器返回副本', () => {
    it('外部修改 items 数组不影响内部状态', () => {
      const order = StocktakingOrder.create(makeOrderProps());
      const items = order.items;
      items.pop();
      expect(order.items).toHaveLength(1);
    });
  });
});
