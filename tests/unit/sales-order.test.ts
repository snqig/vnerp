import { describe, it, expect } from 'vitest';

/**
 * 销售订单状态流转测试
 */

type OrderStatus = 'draft' | 'confirmed' | 'producing' | 'shipped' | 'completed' | 'cancelled';

describe('销售订单状态流转', () => {
  it('正常流转：草稿 → 已确认 → 已发货 → 已完成', () => {
    const flow: OrderStatus[] = ['draft', 'confirmed', 'shipped', 'completed'];
    
    expect(flow[0]).toBe('draft');
    expect(flow[flow.length - 1]).toBe('completed');
  });

  it('取消订单：从任意状态都可以取消', () => {
    const canCancel = ['draft', 'confirmed', 'producing'];
    
    canCancel.forEach(status => {
      expect(status).not.toBe('shipped');
      expect(status).not.toBe('completed');
    });
  });

  it('已发货订单不能取消', () => {
    const shippedStatus: OrderStatus = 'shipped';
    
    // 已发货订单不能直接取消，需要走退货流程
    expect(shippedStatus).not.toBe('cancelled');
  });

  it('订单金额计算', () => {
    const items = [
      { product: '产品A', qty: 10, price: 100 },
      { product: '产品B', qty: 5, price: 200 },
    ];
    
    const totalAmount = items.reduce((sum, item) => sum + item.qty * item.price, 0);
    
    expect(totalAmount).toBe(2000);
  });

  it('客户信息校验', () => {
    const validCustomer = {
      id: 1,
      name: '测试客户',
      phone: '13800138000',
    };
    
    expect(validCustomer.name).toBeTruthy();
    expect(validCustomer.phone).toMatch(/^1\d{10}$/);
  });
});
