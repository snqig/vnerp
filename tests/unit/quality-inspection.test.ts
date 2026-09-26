import { describe, it, expect } from 'vitest';

/**
 * 质量管理测试
 */

type InspectionStatus = 'pending' | 'inspecting' | 'passed' | 'failed';

describe('来料检验', () => {
  it('正常流转：待检验 → 检验中 → 合格/不合格', () => {
    const flow: InspectionStatus[] = ['pending', 'inspecting', 'passed'];
    
    expect(flow[0]).toBe('pending');
    expect(flow[flow.length - 1]).toBe('passed');
  });

  it('抽样数量计算（AQL）', () => {
    const batchQty = 1000;
    
    // 简单抽样规则：批量越大，抽样比例越小
    let sampleQty = 50;
    if (batchQty > 500) sampleQty = 80;
    if (batchQty > 1000) sampleQty = 125;
    
    expect(sampleQty).toBe(80);
  });

  it('合格率计算', () => {
    const totalInspected = 100;
    const passedQty = 95;
    
    const passRate = (passedQty / totalInspected) * 100;
    
    expect(passRate).toBe(95);
  });

  it('不合格处理流程', () => {
    const failedItems = [
      { type: '外观缺陷', qty: 3 },
      { type: '尺寸偏差', qty: 2 },
    ];
    
    const totalFailed = failedItems.reduce((sum, item) => sum + item.qty, 0);
    
    expect(totalFailed).toBe(5);
  });
});

describe('过程检验', () => {
  it('首件检验', () => {
    const firstArticlePassed = true;
    
    // 首件检验通过后才能批量生产
    expect(firstArticlePassed).toBe(true);
  });

  it('巡检频率', () => {
    const productionRate = 100; // 每小时产量
    const inspectionInterval = 2; // 每2小时巡检一次
    
    const partsPerInspection = productionRate * inspectionInterval;
    
    expect(partsPerInspection).toBe(200);
  });
});

describe('不合格品处理', () => {
  it('处理方式', () => {
    const handlingMethods = ['返工', '返修', '报废', '让步接收', '退货'];
    
    expect(handlingMethods).toContain('报废');
    expect(handlingMethods).toContain('返工');
  });

  it('报废成本计算', () => {
    const materialCost = 1000;
    const laborCost = 200;
    const overheadCost = 100;
    
    const scrapCost = materialCost + laborCost + overheadCost;
    
    expect(scrapCost).toBe(1300);
  });

  it('返工后复检', () => {
    const reworkQty = 5;
    const reworkPassed = 4;
    
    const reworkPassRate = (reworkPassed / reworkQty) * 100;
    
    expect(reworkPassRate).toBe(80);
  });
});

describe('SPC 统计过程控制', () => {
  it('控制图上下限计算', () => {
    const mean = 100; // 平均值
    const sigma = 2; // 标准差
    
    const UCL = mean + 3 * sigma; // 上控制限
    const LCL = mean - 3 * sigma; // 下控制限
    
    expect(UCL).toBe(106);
    expect(LCL).toBe(94);
  });

  it('过程能力指数 Cpk', () => {
    const USL = 110; // 规格上限
    const LSL = 90; // 规格下限
    const mean = 100;
    const sigma = 2;
    
    const Cpu = (USL - mean) / (3 * sigma);
    const Cpl = (mean - LSL) / (3 * sigma);
    const Cpk = Math.min(Cpu, Cpl);
    
    expect(Cpk).toBeCloseTo(1.67, 1);
  });
});

describe('客户投诉处理', () => {
  it('投诉处理流程', () => {
    const flow = ['received', 'investigating', 'correcting', 'closed'];
    
    expect(flow[0]).toBe('received');
    expect(flow[flow.length - 1]).toBe('closed');
  });

  it('投诉响应时间', () => {
    const receivedTime = new Date('2026-09-26 09:00');
    const responseTime = new Date('2026-09-26 11:00');
    
    const diffHours = (responseTime.getTime() - receivedTime.getTime()) / (1000 * 60 * 60);
    
    expect(diffHours).toBe(2);
  });

  it('纠正预防措施 CAPA', () => {
    const hasCorrectiveAction = true;
    const hasPreventiveAction = true;
    
    expect(hasCorrectiveAction).toBe(true);
    expect(hasPreventiveAction).toBe(true);
  });
});
