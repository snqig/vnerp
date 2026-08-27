import { describe, it, expect } from 'vitest';
import { Tool } from '@/domain/dcprint/aggregates/Tool';
import { ToolStatus } from '@/domain/dcprint/value-objects/ToolStatus';
import { DomainError } from '@/domain/shared/DomainTypes';

/**
 * T401: Tool 聚合根领域事件触发测试
 *
 * 覆盖 T101 集成：Tool 现在在状态流转时触发领域事件
 * - recordUsage 触发 ToolUsedEvent (仅当 context.workOrderId 存在)
 * - recordUsage 触发 ToolWarningTriggeredEvent (跨越预警阈值时)
 * - scrap 触发 ToolScrappedEvent
 * - getDomainEvents / clearDomainEvents 事件管理
 */
function makeToolRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    tool_type: 1,
    tool_code: 'T001',
    tool_name: 'Test Die',
    spec: null,
    material_id: null,
    total_life: 1000,
    warning_threshold: 800,
    used_count: 0,
    remain_life: 1000,
    original_cost: 5000,
    accumulated_cost: 0,
    net_value: 5000,
    unit_cost: 5,
    status: ToolStatus.ACTIVE,
    manufacture_date: null,
    warehouse_location: null,
    asset_type: null,
    layout_type: null,
    pieces_per_impression: null,
    material: null,
    qr_code: null,
    supplier_id: null,
    maintenance_interval: null,
    maintenance_count: 0,
    last_maintenance_date: null,
    last_maintenance_impressions: null,
    last_used_date: null,
    mesh_count: null,
    mesh_material: null,
    size: null,
    tension_value: null,
    frame_type: null,
    customer_id: null,
    reclaim_count: 0,
    exposure_date: null,
    last_clean_date: null,
    last_reclaim_date: null,
    tension_date: null,
    scrap_reason: null,
    scrap_time: null,
    scrap_by: null,
    remark: null,
    deleted: 0,
    create_time: null,
    update_time: null,
    ...overrides,
  };
}

describe('T401: Tool 聚合根领域事件', () => {
  describe('recordUsage 触发 ToolUsedEvent', () => {
    it('context.workOrderId 提供时触发 ToolUsedEvent', () => {
      const tool = Tool.fromRow(makeToolRow({ status: ToolStatus.ACTIVE, id: 1 }));

      tool.recordUsage(100, {
        workOrderId: 1,
        workOrderNo: 'WO001',
        processName: 'print',
      });

      const events = tool.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('tool.used');
      expect(events[0].payload.workOrderId).toBe(1);
      expect(events[0].payload.useCount).toBe(100);
    });

    it('未提供 context 时不触发 ToolUsedEvent', () => {
      const tool = Tool.fromRow(makeToolRow({ status: ToolStatus.ACTIVE, id: 1 }));

      tool.recordUsage(100);

      expect(tool.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('recordUsage 触发 ToolWarningTriggeredEvent', () => {
    it('跨越预警阈值时触发预警事件', () => {
      // usedCount=790, warningThreshold=800, 使用 20 后 810 >= 800
      const tool = Tool.fromRow(
        makeToolRow({
          status: ToolStatus.ACTIVE,
          used_count: 790,
          warning_threshold: 800,
          total_life: 1000,
          remain_life: 210,
        })
      );

      tool.recordUsage(20, { workOrderId: 1, workOrderNo: 'WO001' });

      const events = tool.getDomainEvents();
      const warningEvent = events.find((e) => e.eventType === 'tool.warning_triggered');
      expect(warningEvent).toBeDefined();
    });

    it('已在 WARNING 状态时不重复触发预警事件', () => {
      // oldStatus 已是 WARNING，shouldWarn=false
      const tool = Tool.fromRow(
        makeToolRow({
          status: ToolStatus.WARNING,
          used_count: 810,
          warning_threshold: 800,
          total_life: 1000,
          remain_life: 190,
        })
      );

      tool.recordUsage(10, { workOrderId: 1, workOrderNo: 'WO001' });

      const events = tool.getDomainEvents();
      const warningEvent = events.find((e) => e.eventType === 'tool.warning_triggered');
      expect(warningEvent).toBeUndefined();
    });
  });

  describe('scrap 触发 ToolScrappedEvent', () => {
    it('scrap(reason, operatorId) 触发 ToolScrappedEvent', () => {
      const tool = Tool.fromRow(makeToolRow({ status: ToolStatus.ACTIVE, id: 1 }));

      tool.scrap('end of life', 1);

      const events = tool.getDomainEvents();
      const scrappedEvent = events.find((e) => e.eventType === 'tool.scrapped');
      expect(scrappedEvent).toBeDefined();
      expect(scrappedEvent!.payload.scrapReason).toBe('end of life');
      expect(scrappedEvent!.payload.scrapBy).toBe(1);
    });

    it('已报废工装再次 scrap 抛 DomainError', () => {
      const tool = Tool.fromRow(makeToolRow({ status: ToolStatus.SCRAPPED, id: 1 }));

      expect(() => tool.scrap('again', 1)).toThrow(DomainError);
    });
  });

  describe('领域事件管理', () => {
    it('clearDomainEvents 清空事件数组', () => {
      const tool = Tool.fromRow(makeToolRow({ status: ToolStatus.ACTIVE, id: 1 }));
      tool.recordUsage(100, { workOrderId: 1, workOrderNo: 'WO001' });
      expect(tool.getDomainEvents()).toHaveLength(1);

      tool.clearDomainEvents();

      expect(tool.getDomainEvents()).toHaveLength(0);
    });

    it('getDomainEvents 返回副本（不可变）', () => {
      const tool = Tool.fromRow(makeToolRow({ status: ToolStatus.ACTIVE, id: 1 }));
      tool.recordUsage(100, { workOrderId: 1, workOrderNo: 'WO001' });
      const events1 = tool.getDomainEvents();

      tool.clearDomainEvents();

      // 副本不受清空影响
      expect(events1).toHaveLength(1);
    });
  });
});
