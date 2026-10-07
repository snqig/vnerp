/**
 * MRP 引擎核心算法单元测试
 * 覆盖 explodeBOM、calculateNetRequirements、runFullMRP 的核心逻辑
 *
 * 2026-09-30 更新：mrp-engine 已重构（BOM 改走 mdm_product→prd_bom.product_id→prd_bom_detail→inv_material），
 * 测试 mock 同步对齐新 SQL 形状：
 *   - 根节点信息优先查 mdm_product（product_code/product_name AS material_code/material_name），缺失回落 inv_material；
 *   - prd_bom 按 product_id 查（含 status=1, deleted=0），不再 SELECT material_id/is_default；
 *   - prd_bom_detail 通过 LEFT JOIN inv_material 一次取齐 material_code/material_name。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  explodeBOM,
  calculateNetRequirements,
  runFullMRP,
  type BOMNode,
} from '@/lib/mrp-engine';

// 构造 mock 连接：按 SQL 关键词匹配返回预设数据
function createMockConn(queryMocks: Array<{ match: RegExp; result: any[] }>) {
  const calls: string[] = [];
  const conn = {
    async query(sql: string, params?: any[]): Promise<any[]> {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push(normalized);
      for (const m of queryMocks) {
        if (m.match.test(normalized)) {
          return m.result;
        }
      }
      return [];
    },
    async execute(sql: string, params?: any[]): Promise<any> {
      return { affectedRows: 1, insertId: 1 };
    },
    _calls: calls,
  };
  return conn;
}

// 通用：mdm_product 根节点查询
const mdmProductMatch = /SELECT product_code AS material_code, product_name AS material_name, unit\s+FROM mdm_product WHERE id = \? AND deleted = 0/;
// 通用：inv_material 根节点回落查询
const invMaterialRootMatch = /SELECT material_code, material_name, unit FROM inv_material WHERE id = \? AND deleted = 0/;
// 通用：prd_bom 头查询（按 product_id，无 material_id / is_default 列）
const prdBomMatch = /SELECT b\.id, b\.product_id, b\.version, b\.status\s+FROM prd_bom b\s+WHERE b\.product_id = \? AND b\.status = 1 AND b\.deleted = 0/;
// 通用：prd_bom_detail + JOIN inv_material
const prdBomDetailMatch = /SELECT bd\.id, bd\.bom_id, bd\.material_id, bd\.quantity, bd\.unit, bd\.loss_rate,\s+m\.material_code, m\.material_name\s+FROM prd_bom_detail bd\s+LEFT JOIN inv_material m ON m\.id = bd\.material_id\s+WHERE bd\.bom_id = \?/;
// 通用：inv_material 提前行检查（仅 SELECT id，不含其他列）
const invMaterialExistsMatch = /SELECT id FROM inv_material WHERE id = \? AND deleted = 0/;
// 通用：子物料代码名称查询（prd_bom_detail 已 LEFT JOIN，这里仅做 fallback）
const invMaterialInfoMatch = /SELECT id, material_code, material_name.*FROM inv_material WHERE id = \?/;
// 通用：calculateNetRequirements 工单查询
const workOrderCalcMatch = /SELECT wo\.id, wo\.work_order_no, wo\.planned_qty AS plan_qty, wo\.plan_start_date,\s+wo\.product_id\s+FROM prod_work_order wo/;
// 通用：runFullMRP 工单查询（无 work_order_no，含 plan_start_date）
const workOrderRunFullMatch = /SELECT wo\.id, wo\.planned_qty AS plan_qty, wo\.plan_start_date, wo\.product_id\s+FROM prod_work_order wo/;
// 通用：库存查询（含 WHERE 条件，用 (?=FROM) 前瞻匹配即可）
const inventoryMatch = /SELECT COALESCE\(SUM\(available_qty\), 0\) as total_available\s+FROM inv_inventory(?=\s+WHERE|$)/;
// 通用：安全库存 + 物料信息（material_purchase / safety_stock 词）
const materialSafetyMatch = /safety_stock/;
// 通用：在途
const inTransitMatch = /in_transit/;
// 通用：采购价格
const purchasePriceMatch = /SELECT purchase_price FROM inv_material WHERE id = \? AND deleted = 0/;

describe('MRP 引擎 - explodeBOM', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('应该正确展开单层BOM为树形结构', async () => {
    vi.doMock('@/lib/calc-param-service', () => ({
      CalcParamService: {
        getInt: vi.fn().mockResolvedValue(7),
      },
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    }));
    vi.doMock('@/lib/constants', () => ({
      WORK_ORDER_STATUSES_OPEN: ['pending', 'confirmed', 'producing'],
    }));
    const { explodeBOM } = await import('@/lib/mrp-engine');

    const conn = {
      async query(sql: string, params?: any[]): Promise<any[]> {
        const s = sql.replace(/\s+/g, ' ').trim();
        // 产品域根节点
        if (mdmProductMatch.test(s)) {
          return [{ material_code: 'PROD-001', material_name: '产品A', unit: '件' }];
        }
        // 提前期行检查
        if (invMaterialExistsMatch.test(s)) {
          return [{ id: params?.[0] }];
        }
        // BOM — 仅产品ID=1有BOM
        if (prdBomMatch.test(s)) {
          if (params?.[0] === 1) {
            return [{ id: 100, product_id: 1, version: '1.0', status: 1 }];
          }
          return [];
        }
        // BOM 明细 + JOIN inv_material
        if (prdBomDetailMatch.test(s)) {
          if (params?.[0] === 100) {
            return [
              { id: 201, bom_id: 100, material_id: 101, quantity: 2, unit: 'kg', loss_rate: 5, material_code: 'MAT-001', material_name: '材料1' },
              { id: 202, bom_id: 100, material_id: 102, quantity: 4, unit: 'pcs', loss_rate: 0, material_code: 'MAT-002', material_name: '材料2' },
            ];
          }
          return [];
        }
        // inv_material 代码名称 fallback
        if (invMaterialInfoMatch.test(s)) {
          if (params?.[0] === 101) return [{ id: 101, material_code: 'MAT-001', material_name: '材料1' }];
          if (params?.[0] === 102) return [{ id: 102, material_code: 'MAT-002', material_name: '材料2' }];
          return [];
        }
        return [];
      },
      async execute() { return { affectedRows: 1, insertId: 1 }; },
    };

    const tree = await explodeBOM(conn, 1, 10);

    expect(tree.material_id).toBe(1);
    expect(tree.material_code).toBe('PROD-001');
    expect(tree.material_name).toBe('产品A');
    expect(tree.quantity).toBe(10);
    expect(tree.is_leaf).toBe(false);
    expect(tree.children).toHaveLength(2);

    const child1 = tree.children![0];
    expect(child1.material_id).toBe(101);
    expect(child1.material_code).toBe('MAT-001');
    // 10 * 2 * (1 + 5/100) = 21
    expect(child1.quantity).toBe(21);
    expect(child1.is_leaf).toBe(true);
    expect(child1.scrap_rate).toBe(0.05);

    const child2 = tree.children![1];
    expect(child2.material_id).toBe(102);
    // 10 * 4 * (1 + 0) = 40
    expect(child2.quantity).toBe(40);
  });

  it('无BOM的产品应标记为叶子节点', async () => {
    vi.doMock('@/lib/calc-param-service', () => ({
      CalcParamService: {
        getInt: vi.fn().mockResolvedValue(7),
      },
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    }));
    vi.doMock('@/lib/constants', () => ({
      WORK_ORDER_STATUSES_OPEN: ['pending', 'confirmed', 'producing'],
    }));
    const { explodeBOM } = await import('@/lib/mrp-engine');

    const conn = createMockConn([
      {
        // mdm_product 未命中（产品域无此 ID），回落 inv_material
        match: mdmProductMatch,
        result: [],
      },
      {
        match: invMaterialRootMatch,
        result: [
          { material_code: 'RAW-001', material_name: '原材料', unit: 'kg' },
        ],
      },
      {
        match: invMaterialExistsMatch,
        result: [{ id: 999 }],
      },
      {
        match: prdBomMatch,
        result: [],
      },
    ]);

    const tree = await explodeBOM(conn, 999, 5);

    expect(tree.material_id).toBe(999);
    expect(tree.material_code).toBe('RAW-001');
    expect(tree.is_leaf).toBe(true);
    expect(tree.children).toHaveLength(0);
  });

  it('应该处理多层BOM展开（半成品）', async () => {
    vi.doMock('@/lib/calc-param-service', () => ({
      CalcParamService: {
        getInt: vi.fn().mockResolvedValue(7),
      },
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    }));
    vi.doMock('@/lib/constants', () => ({
      WORK_ORDER_STATUSES_OPEN: ['pending', 'confirmed', 'producing'],
    }));
    const { explodeBOM } = await import('@/lib/mrp-engine');

    const conn = {
      async query(sql: string, params?: any[]): Promise<any[]> {
        const s = sql.replace(/\s+/g, ' ').trim();
        // 产品域根节点
        if (mdmProductMatch.test(s)) {
          const id = params?.[0];
          if (id === 1) return [{ material_code: 'PROD-001', material_name: '产品A', unit: '件' }];
          if (id === 101) return [{ material_code: 'SEMI-001', material_name: '半成品1', unit: '件' }];
          return [];
        }
        // 提前期行检查
        if (invMaterialExistsMatch.test(s)) {
          return [{ id: params?.[0] }];
        }
        // BOM 查询（按 product_id）
        if (prdBomMatch.test(s)) {
          if (params?.[0] === 1) {
            return [{ id: 100, product_id: 1, version: '1.0', status: 1 }];
          }
          if (params?.[0] === 101) {
            return [{ id: 200, product_id: 101, version: '1.0', status: 1 }];
          }
          return [];
        }
        // BOM 明细 + JOIN inv_material
        if (prdBomDetailMatch.test(s)) {
          const bomId = params?.[0];
          if (bomId === 100) {
            return [{
              id: 201, bom_id: 100, material_id: 101, quantity: 1, unit: '件', loss_rate: 0,
              material_code: 'SEMI-001', material_name: '半成品1',
            }];
          }
          if (bomId === 200) {
            return [{
              id: 301, bom_id: 200, material_id: 201, quantity: 3, unit: 'kg', loss_rate: 0,
              material_code: 'RAW-001', material_name: '原材料1',
            }];
          }
          return [];
        }
        return [];
      },
      async execute() { return { affectedRows: 1, insertId: 1 }; },
    };

    const tree = await explodeBOM(conn, 1, 10);

    expect(tree.is_leaf).toBe(false);
    expect(tree.children).toHaveLength(1);

    const semi = tree.children![0];
    expect(semi.material_id).toBe(101);
    expect(semi.is_leaf).toBe(false);
    expect(semi.children).toHaveLength(1);

    const raw = semi.children![0];
    expect(raw.material_id).toBe(201);
    expect(raw.is_leaf).toBe(true);
    // 10 * 1 * (1 + 0) = 10 → 10 * 3 * (1 + 0) = 30
    expect(raw.quantity).toBe(30);
  });
});

describe('MRP 引擎 - calculateNetRequirements', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('空工单列表应返回空数组', async () => {
    vi.doMock('@/lib/calc-param-service', () => ({
      CalcParamService: {
        getInt: vi.fn().mockResolvedValue(7),
      },
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    }));
    vi.doMock('@/lib/constants', () => ({
      WORK_ORDER_STATUSES_OPEN: ['pending', 'confirmed', 'producing'],
    }));
    const { calculateNetRequirements } = await import('@/lib/mrp-engine');

    const conn = createMockConn([]);
    const result = await calculateNetRequirements(conn, [], 1);
    expect(result).toEqual([]);
  });

  it('应该正确计算净需求（考虑库存和在途）', async () => {
    vi.doMock('@/lib/calc-param-service', () => ({
      CalcParamService: {
        getInt: vi.fn().mockResolvedValue(7),
      },
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    }));
    vi.doMock('@/lib/constants', () => ({
      WORK_ORDER_STATUSES_OPEN: ['pending', 'confirmed', 'producing'],
    }));
    const { calculateNetRequirements } = await import('@/lib/mrp-engine');

    const conn = {
      async query(sql: string, params?: any[]): Promise<any[]> {
        const s = sql.replace(/\s+/g, ' ').trim();
        // 工单查询（calculateNetRequirements 取 product_id）
        if (workOrderCalcMatch.test(s)) {
          return [{
            id: 1,
            work_order_no: 'WO001',
            plan_qty: 10,
            plan_start_date: '2026-07-10',
            product_id: 1,
          }];
        }
        // 产品域根节点
        if (mdmProductMatch.test(s)) {
          return [{ material_code: 'PROD-001', material_name: '产品A', unit: '件' }];
        }
        // 提前期行检查
        if (invMaterialExistsMatch.test(s)) {
          return [{ id: params?.[0] }];
        }
        // BOM（按 product_id=1）
        if (prdBomMatch.test(s)) {
          if (params?.[0] === 1) {
            return [{ id: 100, product_id: 1, version: '1.0', status: 1 }];
          }
          return [];
        }
        // BOM 明细 + JOIN inv_material
        if (prdBomDetailMatch.test(s)) {
          if (params?.[0] === 100) {
            return [{
              id: 201, bom_id: 100, material_id: 101, quantity: 2, unit: 'kg', loss_rate: 0,
              material_code: 'MAT-001', material_name: '材料1',
            }];
          }
          return [];
        }
        // inv_material 代码名称 fallback（explodeBOM 内部调用 + calculateNetRequirements 物料主数据）
        if (invMaterialInfoMatch.test(s)) {
          if (params?.[0] === 101) return [{ id: 101, material_code: 'MAT-001', material_name: '材料1', unit: 'kg', safety_stock: 0, purchase_price: 0 }];
          return [];
        }
        // 库存查询
        if (inventoryMatch.test(s)) {
          return [{ total_available: 10 }];
        }
        // 安全库存 + 物料主数据
        if (materialSafetyMatch.test(s) && !inTransitMatch.test(s)) {
          return [{ id: 101, material_code: 'MAT-001', material_name: '材料1', unit: 'kg', safety_stock: 0, purchase_price: 0, lead_time_days: 7 }];
        }
        // 分配查询（必须先于 in_transit 检查，因为 SQL 含 mii.issued_qty）
        if (/mii\.issued_qty.*total_allocated/i.test(s)) {
          return [{ total_allocated: 0 }];
        }
        // 在途查询
        if (inTransitMatch.test(s)) {
          return [{ total_in_transit: 0 }];
        }
        return [];
      },
      async execute() { return { affectedRows: 1, insertId: 1 }; },
    };

    const result = await calculateNetRequirements(conn, [1], 1);

    expect(result.length).toBeGreaterThan(0);
    const mat = result.find((r) => r.material_id === 101);
    expect(mat).toBeDefined();
    expect(mat!.material_code).toBe('MAT-001');
    // 总需求 = 10 * 2 = 20
    expect(mat!.gross_requirement).toBe(20);
    // 库存 10
    expect(mat!.on_hand_qty).toBe(10);
    // 净需求 = 20 - 10 + 0(分配) - 0(在途) + 0(安全库存) = 10
    expect(mat!.net_requirement).toBe(10);
  });
});

describe('MRP 引擎 - runFullMRP', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('空工单列表应返回空结果', async () => {
    vi.doMock('@/lib/calc-param-service', () => ({
      CalcParamService: {
        getInt: vi.fn().mockResolvedValue(7),
      },
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    }));
    vi.doMock('@/lib/constants', () => ({
      WORK_ORDER_STATUSES_OPEN: ['pending', 'confirmed', 'producing'],
    }));
    const { runFullMRP } = await import('@/lib/mrp-engine');

    const conn = createMockConn([]);
    const result = await runFullMRP(conn, [], 1, null, 'system', false);

    expect(result.bom_tree.children).toEqual([]);
    expect(result.net_requirements).toEqual([]);
    expect(result.planned_orders).toEqual([]);
    expect(result.summary.total_materials).toBe(0);
  });

  it('应该执行完整MRP流程（不自动生成请购单）', async () => {
    vi.doMock('@/lib/calc-param-service', () => ({
      CalcParamService: {
        getInt: vi.fn().mockResolvedValue(7),
      },
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    }));
    vi.doMock('@/lib/constants', () => ({
      WORK_ORDER_STATUSES_OPEN: ['pending', 'confirmed', 'producing'],
    }));
    const { runFullMRP } = await import('@/lib/mrp-engine');

    const conn = {
      async query(sql: string, params?: any[]): Promise<any[]> {
        const s = sql.replace(/\s+/g, ' ').trim();
        // calculateNetRequirements 的工单查询
        if (workOrderCalcMatch.test(s)) {
          return [{
            id: 1,
            work_order_no: 'WO001',
            plan_qty: 10,
            plan_start_date: '2026-07-10',
            product_id: 1,
          }];
        }
        // runFullMRP 的工单查询（含 plan_start_date，取 product_id）
        if (workOrderRunFullMatch.test(s)) {
          return [{
            id: 1,
            plan_qty: 10,
            plan_start_date: '2026-07-10',
            product_id: 1,
          }];
        }
        // 产品域根节点
        if (mdmProductMatch.test(s)) {
          return [{ material_code: 'PROD-001', material_name: '产品A', unit: '件' }];
        }
        // 提前期行检查
        if (invMaterialExistsMatch.test(s)) {
          return [{ id: params?.[0] }];
        }
        // BOM
        if (prdBomMatch.test(s)) {
          if (params?.[0] === 1) {
            return [{ id: 100, product_id: 1, version: '1.0', status: 1 }];
          }
          return [];
        }
        // BOM 明细 + JOIN inv_material
        if (prdBomDetailMatch.test(s)) {
          if (params?.[0] === 100) {
            return [{
              id: 201, bom_id: 100, material_id: 101, quantity: 2, unit: 'kg', loss_rate: 0,
              material_code: 'MAT-001', material_name: '材料1',
            }];
          }
          return [];
        }
        // 库存查询
        if (inventoryMatch.test(s)) {
          return [{ total_available: 5 }];
        }
        // 安全库存 + 物料主数据
        if (materialSafetyMatch.test(s) && !inTransitMatch.test(s)) {
          return [{ id: 101, material_code: 'MAT-001', material_name: '材料1', unit: 'kg', safety_stock: 0, purchase_price: 10, lead_time_days: 7 }];
        }
        // 采购价格（runFullMRP summary 计算用）
        if (purchasePriceMatch.test(s)) {
          return [{ purchase_price: 10 }];
        }
        // 分配查询（必须先于 in_transit 检查，因为 SQL 含 mii.issued_qty）
        if (/mii\.issued_qty.*total_allocated/i.test(s)) {
          return [{ total_allocated: 0 }];
        }
        // 在途查询
        if (inTransitMatch.test(s)) {
          return [{ total_in_transit: 0 }];
        }
        return [];
      },
      async execute() { return { affectedRows: 1, insertId: 1 }; },
    };

    const result = await runFullMRP(conn, [1], 1, null, 'system', false);

    expect(result.bom_tree).toBeDefined();
    expect(result.bom_tree.children!.length).toBeGreaterThan(0);
    expect(result.net_requirements.length).toBeGreaterThan(0);
    expect(result.summary.total_materials).toBeGreaterThan(0);
    // 不应自动生成请购单
    expect(result.purchase_requests).toBeUndefined();
  });
});