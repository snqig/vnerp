/**
 * PurchaseOrderLine.receive 守卫单元测试（文档 IT-IN-003 / ERR-IN 超收边界）
 *
 * 直接测试领域实体，不依赖数据库，精确定位「部分收货累计 / 超收拒绝 /
 * 容差边界 / 关闭行 / 回补」的数学不变量。集成层（inbound-from-po）再验证
 * 该守卫经 PurchaseInboundSyncHandler 透传到真实 PO 回写。
 */
import { describe, it, expect } from 'vitest';
import { PurchaseOrderLine } from '@/domain/purchase/entities/PurchaseOrderLine';
import { DomainError } from '@/domain/shared/DomainTypes';

function makeLine(overrides: Partial<{
  orderQty: number;
  receivedQty: number;
  returnedQty: number;
  unitPrice: number;
}> = {}) {
  const orderQty = overrides.orderQty ?? 100;
  const unitPrice = overrides.unitPrice ?? 10;
  const amount = orderQty * unitPrice;
  return PurchaseOrderLine.create({
    lineNo: 1,
    materialId: 101,
    materialCode: 'M001',
    materialName: '材料1',
    unit: '件',
    orderQty,
    receivedQty: overrides.receivedQty ?? 0,
    returnedQty: overrides.returnedQty ?? 0,
    unitPrice,
    amount,
    taxRate: 13,
    taxAmount: amount * 0.13,
    lineTotal: amount * 1.13,
  });
}

describe('PurchaseOrderLine.receive 部分收货 / 超收守卫', () => {
  it('IT-IN-002 部分收货：多次入库累计 receivedQty', () => {
    const line = makeLine({ orderQty: 200 });
    line.receive(50, 5);
    expect(line.receivedQty).toBe(50);
    expect(line.remainingQty).toBe(150);

    line.receive(60, 5);
    expect(line.receivedQty).toBe(110);
    expect(line.remainingQty).toBe(90);
    expect(line.isFullyReceived).toBe(false);
  });

  it('ERR-IN 超收拒绝：累计超过 orderQty*(1+tolerance) 抛 DomainError，状态不变', () => {
    const line = makeLine({ orderQty: 100, receivedQty: 50 });
    // 50 + 60 = 110 > 100*1.05 = 105
    expect(() => line.receive(60, 5)).toThrow(DomainError);
    expect(() => line.receive(60, 5)).toThrow(/入库数量超限/);
    // 守卫在赋值前抛错，receivedQty 必须保持原值
    expect(line.receivedQty).toBe(50);
  });

  it('ERR-IN 容差边界：恰好等于上限不抛错', () => {
    const line = makeLine({ orderQty: 100, receivedQty: 0 });
    line.receive(105, 5); // 100 * 1.05 = 105
    expect(line.receivedQty).toBe(105);
  });

  it('ERR-IN 入库数量必须大于0', () => {
    const line = makeLine();
    expect(() => line.receive(0, 5)).toThrow(/入库数量必须大于0/);
    expect(() => line.receive(-5, 5)).toThrow(/入库数量必须大于0/);
  });

  it('IT-IN 已关闭行不允许再入库', () => {
    const line = makeLine();
    line.close();
    expect(line.isClosed).toBe(true);
    expect(() => line.receive(10, 5)).toThrow(/已关闭/);
  });

  it('reverseReceive 回补：减少 receivedQty，且不能超过已收量', () => {
    const line = makeLine({ receivedQty: 50 });
    line.reverseReceive(20);
    expect(line.receivedQty).toBe(30);
    expect(() => line.reverseReceive(100)).toThrow(/超过已收数量/);
  });

  it('isFullyReceived 正确反映收货完成度', () => {
    expect(makeLine({ orderQty: 100, receivedQty: 100 }).isFullyReceived).toBe(true);
    expect(makeLine({ orderQty: 100, receivedQty: 99 }).isFullyReceived).toBe(false);
  });
});
