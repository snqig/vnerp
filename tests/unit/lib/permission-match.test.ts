/**
 * permission-match 单元测试
 * 背景：三套权限码词汇表交集为 0（见 docs/qa/BUG-管理员权限缺失-根因与修复-20260915.md §5），
 * 本模块做通配符展开 + 模块别名归一。用例数据取自 sys_menu.permission 实际形态。
 */
import { describe, it, expect } from 'vitest';
import { matchPermission, hasPermissionIn } from '@/lib/permission-match';

describe('matchPermission：精确与全局', () => {
  it('精确码直接命中', () => {
    expect(matchPermission('order:view', 'order:view')).toBe(true);
  });

  it('全局 * 放行一切', () => {
    expect(matchPermission('*', 'order:view')).toBe(true);
    expect(matchPermission('*', 'finance:payable')).toBe(true);
  });

  it('非通配的非精确码不放行', () => {
    expect(matchPermission('order:view', 'order:create')).toBe(false);
    expect(matchPermission('orders:*x', 'order:view')).toBe(false);
  });

  it('空值不放行', () => {
    expect(matchPermission('', 'order:view')).toBe(false);
    expect(matchPermission('orders:*', '')).toBe(false);
  });
});

describe('matchPermission：2 段顶层通配（目录=整个域）', () => {
  it('orders:* 放行 order 模块全部动作（单复数别名）', () => {
    expect(matchPermission('orders:*', 'order:view')).toBe(true);
    expect(matchPermission('orders:*', 'order:create')).toBe(true);
    expect(matchPermission('orders:*', 'order:delete')).toBe(true);
  });

  it('orders:* 放行订单域关联模块（别名表定义）', () => {
    expect(matchPermission('orders:*', 'workorder:view')).toBe(true);
    expect(matchPermission('orders:*', 'delivery:create')).toBe(true);
    expect(matchPermission('orders:*', 'bom:view')).toBe(true);
    expect(matchPermission('orders:*', 'customer:view')).toBe(true);
    expect(matchPermission('orders:*', 'product:view')).toBe(true);
  });

  it('orders:* 不放行无关模块', () => {
    expect(matchPermission('orders:*', 'warehouse:view')).toBe(false);
    expect(matchPermission('orders:*', 'hr:salary')).toBe(false);
  });

  it('warehouse:* 只命中 warehouse 模块', () => {
    expect(matchPermission('warehouse:*', 'warehouse:view')).toBe(true);
    expect(matchPermission('warehouse:*', 'inventory:view')).toBe(false);
  });

  it('dashboard_center:* 归一为 dashboard', () => {
    expect(matchPermission('dashboard_center:*', 'dashboard:view')).toBe(true);
  });

  it('engineering:* 放行标准卡与样品（工程技术部语义）', () => {
    expect(matchPermission('engineering:*', 'standard-card:view')).toBe(true);
    expect(matchPermission('engineering:*', 'sample:create')).toBe(true);
    expect(matchPermission('engineering:*', 'order:view')).toBe(false);
  });
});

describe('matchPermission：3 段子菜单通配（仅尾段匹配）', () => {
  it('warehouse:inbound:* 放行 inbound 模块（尾段=API 模块名）', () => {
    expect(matchPermission('warehouse:inbound:*', 'inbound:create')).toBe(true);
    expect(matchPermission('warehouse:inbound:*', 'inbound:approve')).toBe(true);
  });

  it('warehouse:inbound:* 不放行出库/库存', () => {
    expect(matchPermission('warehouse:inbound:*', 'outbound:create')).toBe(false);
    expect(matchPermission('warehouse:inbound:*', 'inventory:view')).toBe(false);
  });

  it('quality:complaint:* 只放行 quality:complaint，不放行质量模块其他动作', () => {
    expect(matchPermission('quality:complaint:*', 'quality:complaint')).toBe(true);
    expect(matchPermission('quality:complaint:*', 'quality:view')).toBe(false);
    expect(matchPermission('quality:complaint:*', 'quality:inspect')).toBe(false);
  });

  it('finance:receivable:* 只放行 finance:receivable', () => {
    expect(matchPermission('finance:receivable:*', 'finance:receivable')).toBe(true);
    expect(matchPermission('finance:receivable:*', 'finance:view')).toBe(false);
    expect(matchPermission('finance:receivable:*', 'finance:payable')).toBe(false);
  });

  it('settings:warehouse-category:* 不放行 warehouse 模块（v2 越权回归点）', () => {
    expect(matchPermission('settings:warehouse-category:*', 'warehouse:view')).toBe(false);
    expect(matchPermission('settings:warehouse-category:*', 'warehouse:create')).toBe(false);
  });

  it('orders:return:* 放行 material:return（销售退货 → 物料退货 API）', () => {
    expect(matchPermission('orders:return:*', 'material:return')).toBe(true);
    expect(matchPermission('orders:return:*', 'material:view')).toBe(false);
  });

  it('production:orders:* 放行订单域（生产订单页需 workorder:view）', () => {
    expect(matchPermission('production:orders:*', 'workorder:view')).toBe(true);
    expect(matchPermission('production:orders:*', 'order:view')).toBe(true);
  });

  it('单复数/别名尾段：orders:customers:* / orders:products:*', () => {
    expect(matchPermission('orders:customers:*', 'customer:view')).toBe(true);
    expect(matchPermission('orders:products:*', 'product:view')).toBe(true);
  });

  it('qrcode:manage:* 放行 qrcode:view（manage 别名）', () => {
    expect(matchPermission('qrcode:manage:*', 'qrcode:view')).toBe(true);
  });

  it('prepress:die-template:* 放行 prepress 模块', () => {
    expect(matchPermission('prepress:die-template:*', 'prepress:die')).toBe(true);
    expect(matchPermission('prepress:die-template:*', 'prepress:screen-plate')).toBe(true);
  });

  it('4 段码 hr:salary:calculate:* 仅尾段 calculate 匹配', () => {
    expect(matchPermission('hr:salary:calculate:*', 'hr:salary')).toBe(false);
    expect(matchPermission('hr:salary:*', 'hr:salary')).toBe(true);
  });
});

describe('matchPermission：dashboard 展示型只读限定', () => {
  it('dashboard:warehouse:* 仅放行只读动作', () => {
    expect(matchPermission('dashboard:warehouse:*', 'warehouse:view')).toBe(true);
    expect(matchPermission('dashboard:warehouse:*', 'warehouse:create')).toBe(false);
    expect(matchPermission('dashboard:warehouse:*', 'warehouse:delete')).toBe(false);
  });

  it('dashboard:finance:* 放行 stats 但不放行写入', () => {
    expect(matchPermission('dashboard:finance:*', 'finance:view')).toBe(true);
    expect(matchPermission('dashboard:finance:*', 'finance:stats')).toBe(true);
    expect(matchPermission('dashboard:finance:*', 'finance:create')).toBe(false);
    expect(matchPermission('dashboard:finance:*', 'finance:payable')).toBe(false);
  });

  it('dashboard:production:* 放行 production:schedule（只读动作集内）', () => {
    expect(matchPermission('dashboard:production:*', 'production:schedule')).toBe(true);
  });

  it('dashboard:sales:* 只读放行订单域', () => {
    expect(matchPermission('dashboard:sales:*', 'order:view')).toBe(true);
    expect(matchPermission('dashboard:sales:*', 'order:create')).toBe(false);
  });

  it('非 dashboard 的 3 段码不受只读限定', () => {
    expect(matchPermission('warehouse:inbound:*', 'inbound:create')).toBe(true);
  });
});

describe('hasPermissionIn：集合判定', () => {
  it('任一持有码命中即放行', () => {
    expect(hasPermissionIn(['orders:*', 'warehouse:*'], 'order:view')).toBe(true);
    expect(hasPermissionIn(['orders:*', 'warehouse:*'], 'warehouse:view')).toBe(true);
  });

  it('全部不命中则拒绝', () => {
    expect(hasPermissionIn(['orders:*', 'quality:complaint:*'], 'finance:payable')).toBe(false);
  });

  it('真实角色场景：business_manager 查订单放行、写财务拒绝', () => {
    const bm = [
      'dashboard_center:*', 'orders:*', 'dashboard:main:*', 'dashboard:finance:*',
      'orders:sales:*', 'orders:customers:*', 'crm:follow:*', 'crm:analysis:*',
    ];
    expect(hasPermissionIn(bm, 'order:view')).toBe(true);
    expect(hasPermissionIn(bm, 'customer:create')).toBe(true);
    expect(hasPermissionIn(bm, 'finance:view')).toBe(true); // dashboard:finance 只读
    expect(hasPermissionIn(bm, 'finance:create')).toBe(false);
    expect(hasPermissionIn(bm, 'crm:follow')).toBe(true);
  });

  it('真实角色场景：accountant 财务全权、仓库只读', () => {
    const acc = ['dashboard_center:*', 'finance:*', 'dashboard:warehouse:*', 'finance:receivable:*'];
    expect(hasPermissionIn(acc, 'finance:payable')).toBe(true);
    expect(hasPermissionIn(acc, 'finance:create')).toBe(true);
    expect(hasPermissionIn(acc, 'warehouse:view')).toBe(true); // 看板只读
    expect(hasPermissionIn(acc, 'warehouse:create')).toBe(false);
  });
});
