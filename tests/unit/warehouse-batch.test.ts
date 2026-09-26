import { describe, it, expect } from 'vitest';

/**
 * 库存批次相关测试
 */

describe('库存批次模块', () => {
  it('批次号格式校验', () => {
    const validBatchNo = 'B20260926-001';
    const invalidBatchNo = '';
    
    expect(validBatchNo).toMatch(/^B\d{8}-\d{3}$/);
    expect(invalidBatchNo).not.toMatch(/^B\d{8}-\d{3}$/);
  });

  it('批次有效期计算', () => {
    const productionDate = new Date('2026-09-26');
    const shelfLifeDays = 365;
    
    const expireDate = new Date(productionDate);
    expireDate.setDate(expireDate.getDate() + shelfLifeDays);
    
    expect(expireDate.getFullYear()).toBe(2027);
    expect(expireDate.getMonth()).toBe(8); // 9月（0-based）
  });

  it('FIFO 批次排序逻辑', () => {
    const batches = [
      { batchNo: 'B003', inboundDate: new Date('2026-09-26'), availableQty: 100 },
      { batchNo: 'B001', inboundDate: new Date('2026-09-20'), availableQty: 50 },
      { batchNo: 'B002', inboundDate: new Date('2026-09-23'), availableQty: 200 },
    ];
    
    // 按入库日期升序排序（先进先出）
    const sorted = [...batches].sort((a, b) => 
      a.inboundDate.getTime() - b.inboundDate.getTime()
    );
    
    expect(sorted[0].batchNo).toBe('B001');
    expect(sorted[1].batchNo).toBe('B002');
    expect(sorted[2].batchNo).toBe('B003');
  });

  it('批次可用数量校验', () => {
    const batch = {
      quantity: 100,
      lockedQty: 20,
      frozenQty: 0,
      availableQty: 80,
    };
    
    // 可用数量 = 总数量 - 锁定 - 冻结
    const calculatedAvailable = batch.quantity - batch.lockedQty - batch.frozenQty;
    expect(calculatedAvailable).toBe(batch.availableQty);
  });
});
