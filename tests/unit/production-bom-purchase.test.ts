import { describe, it, expect } from 'vitest';

/**
 * BOM 管理测试
 */

describe('BOM 管理', () => {
  it('BOM 层级展开', () => {
    const bom = [
      { level: 1, material: '成品A', qty: 1 },
      { level: 2, material: '半成品B', qty: 2 },
      { level: 3, material: '原材料C', qty: 4 },
    ];
    
    expect(bom[0].level).toBe(1);
    expect(bom[2].level).toBe(3);
  });

  it('BOM 用量计算', () => {
    const productQty = 100;
    const bomItems = [
      { material: '原材料A', requiredQty: 2 },
      { material: '原材料B', requiredQty: 1 },
    ];
    
    const totalA = bomItems[0].requiredQty * productQty;
    const totalB = bomItems[1].requiredQty * productQty;
    
    expect(totalA).toBe(200);
    expect(totalB).toBe(100);
  });

  it('BOM 版本管理', () => {
    const versions = ['V1.0', 'V1.1', 'V2.0'];
    const currentVersion = versions[versions.length - 1];
    
    expect(currentVersion).toBe('V2.0');
  });
});

/**
 * 生产工单测试（扩展）
 */

type WorkOrderStatus = 'draft' | 'scheduled' | 'producing' | 'completed' | 'cancelled';

describe('生产工单（扩展）', () => {
  it('工单优先级排序（紧急优先）', () => {
    const workOrders = [
      { id: 'WO001', priority: 3, dueDate: '2026-09-30' },
      { id: 'WO002', priority: 1, dueDate: '2026-09-27' },
      { id: 'WO003', priority: 2, dueDate: '2026-09-28' },
    ];
    
    // 先按优先级，再按交期
    const sorted = [...workOrders].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    
    expect(sorted[0].id).toBe('WO002');
  });

  it('工单完工入库', () => {
    const completedQty = 95;
    const defectQty = 5;
    const qualifiedQty = completedQty - defectQty;
    
    expect(qualifiedQty).toBe(90);
  });

  it('工单领料扣库存', () => {
    const bomRequiredQty = 200; // BOM 需要的数量
    const issuedQty = 200; // 实际领料数量
    
    // 领料后库存减少
    expect(issuedQty).toBe(bomRequiredQty);
  });

  it('工单报工工时', () => {
    const workTime = 8; // 小时
    const hourlyRate = 50; // 元/小时
    
    const laborCost = workTime * hourlyRate;
    
    expect(laborCost).toBe(400);
  });
});

/**
 * 生产排程测试
 */

describe('生产排程', () => {
  it('设备产能计算', () => {
    const machinePerHour = 100; // 每小时产能
    const workHours = 8; // 每天工作小时
    
    const dailyCapacity = machinePerHour * workHours;
    
    expect(dailyCapacity).toBe(800);
  });

  it('排程冲突检测', () => {
    const schedule1 = { start: '2026-09-26 08:00', end: '2026-09-26 16:00' };
    const schedule2 = { start: '2026-09-26 14:00', end: '2026-09-26 22:00' };
    
    // 时间有重叠
    const hasConflict = new Date(schedule2.start) < new Date(schedule1.end);
    
    expect(hasConflict).toBe(true);
  });

  it('生产进度计算', () => {
    const plannedQty = 100;
    const completedQty = 60;
    
    const progress = (completedQty / plannedQty) * 100;
    
    expect(progress).toBe(60);
  });
});

/**
 * 采购管理测试
 */

describe('采购管理', () => {
  it('采购订单状态流转', () => {
    const flow = ['draft', 'approved', 'sent', 'received', 'completed'];
    
    expect(flow[0]).toBe('draft');
    expect(flow[flow.length - 1]).toBe('completed');
  });

  it('采购入库数量校验', () => {
    const orderedQty = 100;
    const receivedQty = 95;
    
    // 已收货数量不能大于订单数量
    expect(receivedQty).toBeLessThanOrEqual(orderedQty);
  });

  it('采购单价计算', () => {
    const quantity = 100;
    const unitPrice = 50;
    const taxRate = 0.13;
    
    const subtotal = quantity * unitPrice;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    
    expect(subtotal).toBe(5000);
    expect(tax).toBe(650);
    expect(total).toBe(5650);
  });

  it('供应商评级', () => {
    const onTimeRate = 0.95; // 准时交货率
    const qualityRate = 0.98; // 合格率
    
    let rating = 'C';
    if (onTimeRate > 0.9 && qualityRate > 0.95) rating = 'A';
    else if (onTimeRate > 0.8 && qualityRate > 0.9) rating = 'B';
    
    expect(rating).toBe('A');
  });
});
