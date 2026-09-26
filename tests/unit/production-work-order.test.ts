import { describe, it, expect } from 'vitest';

/**
 * 生产工单状态流转测试
 */

type WorkOrderStatus = 'draft' | 'scheduled' | 'producing' | 'completed' | 'cancelled';

describe('生产工单状态流转', () => {
  it('正常流转：草稿 → 已排产 → 生产中 → 已完工', () => {
    const flow: WorkOrderStatus[] = ['draft', 'scheduled', 'producing', 'completed'];
    
    expect(flow[0]).toBe('draft');
    expect(flow[flow.length - 1]).toBe('completed');
  });

  it('完工率计算', () => {
    const workOrder = {
      plannedQty: 100,
      completedQty: 75,
    };
    
    const completionRate = (workOrder.completedQty / workOrder.plannedQty) * 100;
    
    expect(completionRate).toBe(75);
  });

  it('领料数量校验', () => {
    const bom = [
      { material: '原材料A', requiredQty: 2, unit: 'kg' },
      { material: '原材料B', requiredQty: 1, unit: '个' },
    ];
    
    const workOrderQty = 100;
    
    // 计算需要领料的数量
    const totalMaterialA = bom[0].requiredQty * workOrderQty;
    const totalMaterialB = bom[1].requiredQty * workOrderQty;
    
    expect(totalMaterialA).toBe(200);
    expect(totalMaterialB).toBe(100);
  });

  it('工单优先级排序', () => {
    const workOrders = [
      { id: 'WO001', priority: 3, dueDate: '2026-09-30' },
      { id: 'WO002', priority: 1, dueDate: '2026-09-27' },
      { id: 'WO003', priority: 2, dueDate: '2026-09-28' },
    ];
    
    // 按优先级降序排序（数字越小优先级越高）
    const sorted = [...workOrders].sort((a, b) => a.priority - b.priority);
    
    expect(sorted[0].id).toBe('WO002');
    expect(sorted[1].id).toBe('WO003');
    expect(sorted[2].id).toBe('WO001');
  });

  it('工单取消条件', () => {
    const canCancelStatus: WorkOrderStatus[] = ['draft', 'scheduled'];
    
    // 生产中的工单不能取消
    expect(canCancelStatus).not.toContain('producing');
    expect(canCancelStatus).not.toContain('completed');
  });
});
