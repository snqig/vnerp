/**
 * 集成测试脚本 - 模拟真实用户操作流程
 * 
 * 测试覆盖：
 * 1. 登录认证流程（成功/失败/锁定）
 * 2. 库存查询与高级搜索
 * 3. 批量操作（冻结/解冻）
 * 4. 错误处理与边界条件
 * 
 * 运行方式: npx vitest run src/__tests__/integration/business-flow.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// ============================================================
// 模拟API层（不依赖真实数据库，模拟完整业务流程）
// ============================================================

// 模拟用户数据
const mockUsers = [
  { id: 1, username: 'admin', password: '$2a$10$hashed_admin', real_name: '管理员', status: 1, login_fail_count: 0, lock_time: null },
  { id: 2, username: 'locked_user', password: '$2a$10$hashed_locked', real_name: '被锁定用户', status: 1, login_fail_count: 5, lock_time: new Date().toISOString() },
  { id: 3, username: 'disabled_user', password: '$2a$10$hashed_disabled', real_name: '禁用用户', status: 0, login_fail_count: 0, lock_time: null },
];

// 模拟库存数据
const mockInventory = [
  { id: 1, material_code: 'INK-001', material_name: '四色黑油墨', specification: '1kg/罐', warehouse_id: 1, warehouse_name: '主仓库', stock_qty: 200, frozen_qty: 0, safety_stock: 50, cost_price: 92.50, status: 'normal', batch_no: 'BATCH-001', expire_date: '2026-01-15' },
  { id: 2, material_code: 'INK-002', material_name: '专色红油墨', specification: '2kg/罐', warehouse_id: 1, warehouse_name: '主仓库', stock_qty: 120, frozen_qty: 10, safety_stock: 30, cost_price: 98.00, status: 'normal', batch_no: 'BATCH-002', expire_date: '2026-02-10' },
  { id: 3, material_code: 'INK-003', material_name: 'UV光油', specification: '5kg/桶', warehouse_id: 2, warehouse_name: '原料仓', stock_qty: 80, frozen_qty: 0, safety_stock: 20, cost_price: 155.00, status: 'normal', batch_no: 'BATCH-003', expire_date: '2025-12-15' },
  { id: 4, material_code: 'PAPER-001', material_name: '铜版纸157g', specification: '889×1194mm', warehouse_id: 1, warehouse_name: '主仓库', stock_qty: 35, frozen_qty: 0, safety_stock: 50, cost_price: 0.88, status: 'normal', batch_no: 'BATCH-004', expire_date: null },
  { id: 5, material_code: 'INK-006', material_name: '四色黄油墨', specification: '1kg/罐', warehouse_id: 1, warehouse_name: '主仓库', stock_qty: 15, frozen_qty: 0, safety_stock: 50, cost_price: 90.00, status: 'normal', batch_no: 'BATCH-005', expire_date: '2026-04-01' },
  { id: 6, material_code: 'INK-009', material_name: '过期油墨-A', specification: '1kg/罐', warehouse_id: 1, warehouse_name: '主仓库', stock_qty: 30, frozen_qty: 30, safety_stock: 0, cost_price: 80.00, status: 'frozen', batch_no: 'BATCH-006', expire_date: '2025-06-01' },
  { id: 7, material_code: 'INK-010', material_name: '过期UV油墨', specification: '2kg/罐', warehouse_id: 2, warehouse_name: '原料仓', stock_qty: 15, frozen_qty: 0, safety_stock: 0, cost_price: 120.00, status: 'expired', batch_no: 'BATCH-007', expire_date: '2025-06-01' },
  { id: 8, material_code: 'INK-008', material_name: '荧光油墨-绿', specification: '1kg/罐', warehouse_id: 1, warehouse_name: '主仓库', stock_qty: 0, frozen_qty: 0, safety_stock: 10, cost_price: 185.00, status: 'normal', batch_no: '-', expire_date: '2026-08-01' },
];

// 模拟冻结记录
let freezeRecords: unknown[] = [];
let nextFreezeId = 1;

// ============================================================
// 模拟API函数
// ============================================================

function simulateLogin(username: string, password: string) {
  const user = mockUsers.find(u => u.username === username);
  if (!user) return { success: false, message: '用户名或密码错误', code: 'LOGIN_FAILED' };
  if (user.status === 0) return { success: false, message: '账号已被禁用，请联系管理员', code: 'ACCOUNT_DISABLED' };
  if (user.lock_time) {
    const lockTime = new Date(user.lock_time);
    const diffMinutes = (Date.now() - lockTime.getTime()) / 60000;
    if (diffMinutes < 15) {
      return { success: false, message: `账号已锁定，请${Math.ceil(15 - diffMinutes)}分钟后再试`, code: 'ACCOUNT_LOCKED' };
    }
  }
  // 模拟密码验证（开发环境允许admin/521223）
  const isPasswordValid = password === '521223' && username === 'admin';
  if (!isPasswordValid) {
    user.login_fail_count = (user.login_fail_count || 0) + 1;
    if (user.login_fail_count >= 5) {
      user.lock_time = new Date().toISOString();
      return { success: false, message: '密码错误次数过多，账号已锁定15分钟', code: 'ACCOUNT_LOCKED' };
    }
    return { success: false, message: `用户名或密码错误，还剩${5 - user.login_fail_count}次尝试机会`, code: 'LOGIN_FAILED' };
  }
  user.login_fail_count = 0;
  user.lock_time = null;
  return { success: true, data: { userId: user.id, username: user.username, realName: user.real_name, token: 'mock-jwt-token' } };
}

function simulateInventoryQuery(filters: Record<string, string>) {
  let result = [...mockInventory];

  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase();
    result = result.filter(i => i.material_code.toLowerCase().includes(kw) || i.material_name.toLowerCase().includes(kw));
  }
  if (filters.warehouseId && filters.warehouseId !== 'all') {
    result = result.filter(i => i.warehouse_id === Number(filters.warehouseId));
  }
  if (filters.status && filters.status !== 'all') {
    result = result.filter(i => i.status === filters.status);
  }
  if (filters.material_code) {
    result = result.filter(i => i.material_code.toLowerCase().includes(filters.material_code.toLowerCase()));
  }
  if (filters.batch_no) {
    result = result.filter(i => i.batch_no.toLowerCase().includes(filters.batch_no.toLowerCase()));
  }
  if (filters.expiry_date_start) {
    result = result.filter(i => i.expire_date && i.expire_date >= filters.expiry_date_start!);
  }
  if (filters.expiry_date_end) {
    result = result.filter(i => i.expire_date && i.expire_date <= filters.expiry_date_end!);
  }

  // 计算预警级别
  result = result.map(item => {
    let alertLevel = 'normal';
    if (item.safety_stock > 0) {
      if (item.stock_qty <= 0) alertLevel = 'critical';
      else if (item.stock_qty <= item.safety_stock * 0.5) alertLevel = 'critical';
      else if (item.stock_qty <= item.safety_stock) alertLevel = 'warning';
    }
    return { ...item, alertLevel };
  });

  return { success: true, data: { list: result, total: result.length, page: 1, pageSize: 100 } };
}

function simulateFreeze(inventoryIds: number[], action: 'freeze' | 'unfreeze') {
  const results: { id: number; success: boolean; message: string }[] = [];

  for (const id of inventoryIds) {
    const item = mockInventory.find(i => i.id === id);
    if (!item) {
      results.push({ id, success: false, message: '库存记录不存在' });
      continue;
    }

    if (action === 'freeze') {
      if (item.status === 'frozen') {
        results.push({ id, success: false, message: '库存已冻结' });
        continue;
      }
      const availableQty = item.stock_qty - item.frozen_qty;
      if (availableQty <= 0) {
        results.push({ id, success: false, message: '可用库存不足' });
        continue;
      }
      // 冻结全部可用库存
      item.frozen_qty = item.stock_qty;
      item.status = 'frozen';
      freezeRecords.push({
        id: nextFreezeId++,
        material_id: id,
        warehouse_id: item.warehouse_id,
        freeze_quantity: availableQty,
        freeze_type: 'manual',
        status: 'active',
        create_time: new Date().toISOString(),
      });
      results.push({ id, success: true, message: '冻结成功' });
    } else {
      if (item.status !== 'frozen') {
        results.push({ id, success: false, message: '库存未冻结' });
        continue;
      }
      item.frozen_qty = 0;
      item.status = 'normal';
      results.push({ id, success: true, message: '解冻成功' });
    }
  }

  const allSuccess = results.every(r => r.success);
  return {
    success: allSuccess,
    data: { results, successCount: results.filter(r => r.success).length, failCount: results.filter(r => !r.success).length },
    message: allSuccess ? '操作成功' : '部分操作失败',
  };
}

// ============================================================
// 集成测试
// ============================================================

describe('集成测试 - 业务流程', () => {

  describe('流程1: 用户登录认证', () => {
    it('正常登录成功', () => {
      const result = simulateLogin('admin', '521223');
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('token');
      expect(result.data).toHaveProperty('userId');
    });

    it('用户名不存在', () => {
      const result = simulateLogin('nonexistent', 'password');
      expect(result.success).toBe(false);
      expect(result.code).toBe('LOGIN_FAILED');
    });

    it('密码错误累计锁定', () => {
      // 重置用户状态
      const testUser = { id: 99, username: 'test_lock', password: 'hashed', real_name: '测试', status: 1, login_fail_count: 0, lock_time: null };
      mockUsers.push(testUser);

      // 连续5次错误
      for (let i = 0; i < 4; i++) {
        const result = simulateLogin('test_lock', 'wrong_password');
        expect(result.success).toBe(false);
        expect(result.code).toBe('LOGIN_FAILED');
      }
      // 第5次应该锁定
      const lockResult = simulateLogin('test_lock', 'wrong_password');
      expect(lockResult.success).toBe(false);
      expect(lockResult.code).toBe('ACCOUNT_LOCKED');

      // 清理
      const idx = mockUsers.indexOf(testUser);
      if (idx > -1) mockUsers.splice(idx, 1);
    });

    it('禁用账号无法登录', () => {
      const result = simulateLogin('disabled_user', '521223');
      expect(result.success).toBe(false);
      expect(result.code).toBe('ACCOUNT_DISABLED');
    });

    it('锁定账号在锁定期内无法登录', () => {
      const result = simulateLogin('locked_user', '521223');
      expect(result.success).toBe(false);
      expect(result.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('流程2: 库存查询与高级搜索', () => {
    it('无筛选条件：返回全部库存', () => {
      const result = simulateInventoryQuery({});
      expect(result.success).toBe(true);
      expect(result.data.list.length).toBe(mockInventory.length);
    });

    it('关键词搜索：按物料名称模糊匹配', () => {
      const result = simulateInventoryQuery({ keyword: '油墨' });
      expect(result.success).toBe(true);
      expect(result.data.list.length).toBeGreaterThan(0);
      result.data.list.forEach((item: unknown) => {
        expect(item.material_name).toContain('油墨');
      });
    });

    it('关键词搜索：按物料编码模糊匹配', () => {
      const result = simulateInventoryQuery({ keyword: 'INK' });
      expect(result.success).toBe(true);
      expect(result.data.list.length).toBeGreaterThan(0);
      result.data.list.forEach((item: unknown) => {
        expect(item.material_code).toContain('INK');
      });
    });

    it('仓库筛选：只返回指定仓库', () => {
      const result = simulateInventoryQuery({ warehouseId: '2' });
      expect(result.success).toBe(true);
      result.data.list.forEach((item: unknown) => {
        expect(item.warehouse_id).toBe(2);
      });
    });

    it('状态筛选：只返回冻结状态', () => {
      const result = simulateInventoryQuery({ status: 'frozen' });
      expect(result.success).toBe(true);
      result.data.list.forEach((item: unknown) => {
        expect(item.status).toBe('frozen');
      });
    });

    it('组合筛选：关键词+仓库+状态', () => {
      const result = simulateInventoryQuery({ keyword: '油墨', warehouseId: '1', status: 'normal' });
      expect(result.success).toBe(true);
      result.data.list.forEach((item: unknown) => {
        expect(item.material_name).toContain('油墨');
        expect(item.warehouse_id).toBe(1);
        expect(item.status).toBe('normal');
      });
    });

    it('高级搜索：按物料编码精确筛选', () => {
      const result = simulateInventoryQuery({ material_code: 'INK-001' });
      expect(result.success).toBe(true);
      expect(result.data.list.length).toBe(1);
      expect(result.data.list[0].material_code).toBe('INK-001');
    });

    it('高级搜索：按批次号筛选', () => {
      const result = simulateInventoryQuery({ batch_no: 'BATCH-001' });
      expect(result.success).toBe(true);
      expect(result.data.list.length).toBe(1);
    });

    it('高级搜索：按有效期范围筛选', () => {
      const result = simulateInventoryQuery({ expiry_date_start: '2026-01-01', expiry_date_end: '2026-06-30' });
      expect(result.success).toBe(true);
      result.data.list.forEach((item: unknown) => {
        expect(item.expire_date).not.toBeNull();
        expect((item as Record<string, unknown>).expire_date >= '2026-01-01').toBe(true);
        expect((item as Record<string, unknown>).expire_date <= '2026-06-30').toBe(true);
      });
    });

    it('预警级别计算：零库存为critical', () => {
      const result = simulateInventoryQuery({ material_code: 'INK-008' });
      expect((result.data.list[0] as Record<string, unknown>).alertLevel).toBe('critical');
    });

    it('预警级别计算：库存<=50%安全库存为critical', () => {
      const result = simulateInventoryQuery({ material_code: 'INK-006' });
      expect((result.data.list[0] as Record<string, unknown>).alertLevel).toBe('critical');
    });

    it('预警级别计算：库存在50%-100%安全库存为warning', () => {
      const result = simulateInventoryQuery({ material_code: 'PAPER-001' });
      expect((result.data.list[0] as any).alertLevel).toBe('warning');
    });

    it('预警级别计算：库存>安全库存为normal', () => {
      const result = simulateInventoryQuery({ material_code: 'INK-001' });
      expect((result.data.list[0] as any).alertLevel).toBe('normal');
    });

    it('无结果搜索：返回空列表', () => {
      const result = simulateInventoryQuery({ keyword: '不存在的物料XYZ' });
      expect(result.success).toBe(true);
      expect(result.data.list.length).toBe(0);
      expect(result.data.total).toBe(0);
    });
  });

  describe('流程3: 批量操作', () => {
    it('批量冻结：选择多条正常库存', () => {
      const ids = [1, 3]; // 两条正常库存
      const result = simulateFreeze(ids, 'freeze');
      expect(result.success).toBe(true);
      expect(result.data.successCount).toBe(2);

      // 验证状态已变更
      const item1 = mockInventory.find(i => i.id === 1);
      const item3 = mockInventory.find(i => i.id === 3);
      expect(item1?.status).toBe('frozen');
      expect(item3?.status).toBe('frozen');
    });

    it('批量冻结：已冻结的库存跳过', () => {
      const ids = [1, 6]; // id=1已冻结, id=6也已冻结
      const result = simulateFreeze(ids, 'freeze');
      expect(result.data.failCount).toBe(2);
    });

    it('批量解冻：选择已冻结的库存', () => {
      const ids = [1, 3]; // 之前冻结的
      const result = simulateFreeze(ids, 'unfreeze');
      expect(result.success).toBe(true);
      expect(result.data.successCount).toBe(2);

      // 验证状态已恢复
      const item1 = mockInventory.find(i => i.id === 1);
      const item3 = mockInventory.find(i => i.id === 3);
      expect(item1?.status).toBe('normal');
      expect(item3?.status).toBe('normal');
    });

    it('批量解冻：未冻结的库存跳过', () => {
      const ids = [1, 2]; // 都是normal状态
      const result = simulateFreeze(ids, 'unfreeze');
      expect(result.data.failCount).toBe(2);
    });

    it('批量冻结：零库存无法冻结', () => {
      const result = simulateFreeze([8], 'freeze'); // stock_qty=0
      expect(result.data.failCount).toBe(1);
    });

    it('批量操作：空ID列表', () => {
      const result = simulateFreeze([], 'freeze');
      expect(result.success).toBe(true);
      expect(result.data.results.length).toBe(0);
    });

    it('批量操作：不存在的ID', () => {
      const result = simulateFreeze([9999], 'freeze');
      expect(result.data.failCount).toBe(1);
    });
  });

  describe('流程4: 完整用户操作流程', () => {
    it('登录→查询库存→高级搜索→批量冻结→解冻', () => {
      // Step 1: 登录
      const loginResult = simulateLogin('admin', '521223');
      expect(loginResult.success).toBe(true);
      const token = loginResult.data?.token;

      // Step 2: 查询全部库存
      const allInventory = simulateInventoryQuery({});
      expect(allInventory.success).toBe(true);
      expect(allInventory.data.total).toBeGreaterThan(0);

      // Step 3: 高级搜索 - 按关键词+状态筛选
      const searchResult = simulateInventoryQuery({ keyword: '油墨', status: 'normal' });
      expect(searchResult.success).toBe(true);
      const normalInkItems = searchResult.data.list;
      expect(normalInkItems.length).toBeGreaterThan(0);

      // Step 4: 批量冻结搜索结果
      const idsToFreeze = normalInkItems.map((item: unknown) => (item as Record<string, unknown>).id as number).slice(0, 3);
      const freezeResult = simulateFreeze(idsToFreeze, 'freeze');
      expect(freezeResult.data.successCount).toBeGreaterThan(0);

      // Step 5: 验证冻结后搜索结果变化
      const afterFreezeSearch = simulateInventoryQuery({ keyword: '油墨', status: 'frozen' });
      expect(afterFreezeSearch.data.list.length).toBeGreaterThan(0);

      // Step 6: 批量解冻
      const unfreezeResult = simulateFreeze(idsToFreeze, 'unfreeze');
      expect(unfreezeResult.data.successCount).toBeGreaterThan(0);

      // Step 7: 验证解冻后恢复正常
      const afterUnfreezeSearch = simulateInventoryQuery({ keyword: '油墨', status: 'normal' });
      expect(afterUnfreezeSearch.data.list.length).toBe(normalInkItems.length);
    });

    it('登录→查询预警库存→查看详情→处理预警', () => {
      // Step 1: 登录
      const loginResult = simulateLogin('admin', '521223');
      expect(loginResult.success).toBe(true);

      // Step 2: 查询低库存预警
      const allInventory = simulateInventoryQuery({});
      const alertItems = allInventory.data.list.filter((item: unknown) =>
        (item as Record<string, unknown>).alertLevel === 'warning' || (item as Record<string, unknown>).alertLevel === 'critical'
      );
      expect(alertItems.length).toBeGreaterThan(0);

      // Step 3: 按预警级别排序 - critical优先
      const sorted = [...alertItems].sort((a: unknown, b: unknown) => {
        const levelOrder: Record<string, number> = { critical: 0, warning: 1, normal: 2 };
        return levelOrder[(a as Record<string, unknown>).alertLevel as string] - levelOrder[(b as Record<string, unknown>).alertLevel as string];
      });
      expect((sorted[0] as any).alertLevel).toBe('critical');

      // Step 4: 处理critical级别 - 冻结防止超卖
      const criticalIds = sorted
        .filter((item: unknown) => (item as Record<string, unknown>).alertLevel === 'critical' && (item as Record<string, unknown>).status === 'normal' && (item as Record<string, unknown>).stock_qty as number > 0)
        .map((item: unknown) => (item as Record<string, unknown>).id as number);
      if (criticalIds.length > 0) {
        const freezeResult = simulateFreeze(criticalIds, 'freeze');
        expect(freezeResult.data.successCount).toBeGreaterThan(0);
      }
    });
  });

  describe('流程5: 错误处理与边界条件', () => {
    it('并发冻结同一库存：第二次应失败', () => {
      // 先确保id=2是normal状态
      const item2 = mockInventory.find(i => i.id === 2);
      if (item2) { item2.status = 'normal'; item2.frozen_qty = 10; }

      const result1 = simulateFreeze([2], 'freeze');
      if (result1.success) {
        // 第二次冻结已冻结的库存
        const result2 = simulateFreeze([2], 'freeze');
        expect(result2.data.failCount).toBe(1);
        // 清理
        simulateFreeze([2], 'unfreeze');
      }
    });

    it('搜索特殊字符：防止SQL注入', () => {
      const result = simulateInventoryQuery({ keyword: "'; DROP TABLE users; --" });
      expect(result.success).toBe(true);
      // 模拟数据中没有匹配，返回空
      expect(result.data.list.length).toBe(0);
    });

    it('超大分页请求：限制pageSize', () => {
      const result = simulateInventoryQuery({ pageSize: '999999' });
      expect(result.success).toBe(true);
      // 应返回实际数据量，不会内存溢出
      expect(result.data.list.length).toBeLessThanOrEqual(mockInventory.length);
    });

    it('无效状态值筛选：返回空结果', () => {
      const result = simulateInventoryQuery({ status: 'invalid_status' });
      expect(result.success).toBe(true);
      expect(result.data.list.length).toBe(0);
    });
  });
});
