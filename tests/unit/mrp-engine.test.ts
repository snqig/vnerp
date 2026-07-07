/**
 * MRP 引擎核心算法单元测试
 * 覆盖 explodeBOM、calculateNetRequirements、runFullMRP 的核心逻辑
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

describe('MRP 引擎 - explodeBOM', () => {
  it('应该正确展开单层BOM为树形结构', async () => {
    const conn = {
      async query(sql: string, params?: any[]): Promise<any[]> {
        const s = sql.replace(/\s+/g, ' ').trim();
        // 产品信息查询
        if (/SELECT id, material_code, material_name, unit FROM inv_material WHERE id = \?/.test(s)) {
          return [{ id: 1, material_code: 'PROD-001', material_name: '产品A', unit: '件' }];
        }
        // 提前期 + 物料信息查询
        if (/SELECT id, material_code, material_name, 7 AS lead_time_days FROM inv_material WHERE id = \?/.test(s)) {
          const id = params?.[0];
          if (id === 101) return [{ id: 101, material_code: 'MAT-001', material_name: '材料1', lead_time_days: 7 }];
          if (id === 102) return [{ id: 102, material_code: 'MAT-002', material_name: '材料2', lead_time_days: 7 }];
          return [{ id: params?.[0], material_code: '', material_name: '', lead_time_days: 7 }];
        }
        // BOM — 仅产品ID=1有BOM
        if (/SELECT id, material_id, version, status, is_default FROM prd_bom/.test(s)) {
          if (params?.[0] === 1) {
            return [{ id: 100, material_id: 1, version: '1.0', status: 1, is_default: 1 }];
          }
          return [];
        }
        // BOM 明细
        if (/SELECT bd\.id, bd\.bom_id, bd\.material_id, bd\.quantity.*FROM prd_bom_detail bd/.test(s)) {
          if (params?.[0] === 100) {
            return [
              { id: 201, bom_id: 100, material_id: 101, quantity: 2, unit: 'kg', loss_rate: 5, material_code: 'MAT-001', material_name: '材料1' },
              { id: 202, bom_id: 100, material_id: 102, quantity: 4, unit: 'pcs', loss_rate: 0, material_code: 'MAT-002', material_name: '材料2' },
            ];
          }
          return [];
        }
        return [];
      },
      async execute() { return { affectedRows: 1, insertId: 1 }; },
    };

    const tree = await explodeBOM(conn, 1, 10);

    expect(tree.material_id).toBe(1);
    expect(tree.material_code).toBe('PROD-001');
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
    const conn = createMockConn([
      {
        match: /SELECT id, material_code, material_name, unit FROM inv_material WHERE id = \?/,
        result: [
          { id: 999, material_code: 'RAW-001', material_name: '原材料', unit: 'kg' },
        ],
      },
      {
        match: /SELECT id, material_code, material_name, 7 AS lead_time_days FROM inv_material WHERE id = \?/,
        result: [{ id: 999, material_code: 'RAW-001', material_name: '原材料', lead_time_days: 7 }],
      },
      {
        match: /SELECT id, material_id, version, status, is_default FROM prd_bom/,
        result: [],
      },
    ]);

    const tree = await explodeBOM(conn, 999, 5);

    expect(tree.material_id).toBe(999);
    expect(tree.is_leaf).toBe(true);
    expect(tree.children).toHaveLength(0);
  });

  it('应该处理多层BOM展开（半成品）', async () => {
    const conn = {
      async query(sql: string, params?: any[]): Promise<any[]> {
        const s = sql.replace(/\s+/g, ' ').trim();
        // 产品信息查询
        if (/SELECT id, material_code, material_name, unit FROM inv_material WHERE id = \?/.test(s)) {
          const id = params?.[0];
          if (id === 1) {
            return [{ id: 1, material_code: 'PROD-001', material_name: '产品A', unit: '件' }];
          }
          if (id === 101) {
            return [{ id: 101, material_code: 'SEMI-001', material_name: '半成品1', unit: '件' }];
          }
          return [{ id, material_code: `MAT-${id}`, material_name: `物料${id}`, unit: 'kg' }];
        }
        // 提前期 + 物料信息查询
        if (/SELECT id, material_code, material_name, 7 AS lead_time_days FROM inv_material WHERE id = \?/.test(s)) {
          const id = params?.[0];
          if (id === 101) return [{ id: 101, material_code: 'SEMI-001', material_name: '半成品1', lead_time_days: 7 }];
          if (id === 201) return [{ id: 201, material_code: 'RAW-001', material_name: '原材料1', lead_time_days: 7 }];
          return [{ id, material_code: `MAT-${id}`, material_name: `物料${id}`, lead_time_days: 7 }];
        }
        // BOM 查询
        if (/SELECT id, material_id, version, status, is_default FROM prd_bom/.test(s)) {
          if (params?.[0] === 1) {
            return [{ id: 100, material_id: 1, version: '1.0', status: 1, is_default: 1 }];
          }
          if (params?.[0] === 101) {
            return [{ id: 200, material_id: 101, version: '1.0', status: 1, is_default: 1 }];
          }
          return [];
        }
        // BOM 明细查询
        if (/SELECT bd\.id, bd\.bom_id, bd\.material_id, bd\.quantity.*FROM prd_bom_detail bd/.test(s)) {
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
  it('空工单列表应返回空数组', async () => {
    const conn = createMockConn([]);
    const result = await calculateNetRequirements(conn, [], 1);
    expect(result).toEqual([]);
  });

  it('应该正确计算净需求（考虑库存和在途）', async () => {
    const conn = {
      async query(sql: string, params?: any[]): Promise<any[]> {
        const s = sql.replace(/\s+/g, ' ').trim();
        // 工单查询
        if (/SELECT wo\.id, wo\.work_order_no, wo\.plan_qty, wo\.plan_start_date, wo\.material_id.*FROM prd_work_order/.test(s)) {
          return [{
            id: 1,
            work_order_no: 'WO001',
            plan_qty: 10,
            plan_start_date: '2026-07-10',
            material_id: 1,
          }];
        }
        // 产品信息
        if (/SELECT id, material_code, material_name, unit FROM inv_material WHERE id = \?/.test(s)) {
          return [{ id: 1, material_code: 'PROD-001', material_name: '产品A', unit: '件' }];
        }
        if (/SELECT id, material_code, material_name, 7 AS lead_time_days FROM inv_material WHERE id = \?/.test(s)) {
          const id = params?.[0];
          if (id === 101) return [{ id: 101, material_code: 'MAT-001', material_name: '材料1', lead_time_days: 7 }];
          return [{ id, material_code: '', material_name: '', lead_time_days: 7 }];
        }
        // BOM — 仅产品ID=1有BOM，原材料无BOM
        if (/SELECT id, material_id, version, status, is_default FROM prd_bom/.test(s)) {
          if (params?.[0] === 1) {
            return [{ id: 100, material_id: 1, version: '1.0', status: 1, is_default: 1 }];
          }
          return [];
        }
        // BOM 明细
        if (/SELECT bd\.id, bd\.bom_id, bd\.material_id, bd\.quantity.*FROM prd_bom_detail bd/.test(s)) {
          if (params?.[0] === 100) {
            return [{
              id: 201, bom_id: 100, material_id: 101, quantity: 2, unit: 'kg', loss_rate: 0,
              material_code: 'MAT-001', material_name: '材料1',
            }];
          }
          return [];
        }
        // 库存查询
        if (/SELECT COALESCE\(SUM\(available_qty\)/.test(s)) {
          return [{ total_available: 10 }];
        }
        // 安全库存查询
        if (/safety_stock/.test(s) && !/po_item/.test(s) && !/in_transit/.test(s)) {
          return [{ id: 101, material_code: 'MAT-001', material_name: '材料1', unit: 'kg', safety_stock: 0, purchase_price: 0, lead_time_days: 7 }];
        }
        // 在途查询
        if (/in_transit/.test(s) || /po_item/.test(s)) {
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
  it('空工单列表应返回空结果', async () => {
    const conn = createMockConn([]);
    const result = await runFullMRP(conn, [], 1, null, 'system', false);

    expect(result.bom_tree.children).toEqual([]);
    expect(result.net_requirements).toEqual([]);
    expect(result.planned_orders).toEqual([]);
    expect(result.summary.total_materials).toBe(0);
  });

  it('应该执行完整MRP流程（不自动生成请购单）', async () => {
    const conn = {
      async query(sql: string, params?: any[]): Promise<any[]> {
        const s = sql.replace(/\s+/g, ' ').trim();
        // calculateNetRequirements 的工单查询
        if (/SELECT wo\.id, wo\.work_order_no, wo\.plan_qty, wo\.plan_start_date, wo\.material_id.*FROM prd_work_order/.test(s)) {
          return [{
            id: 1,
            work_order_no: 'WO001',
            plan_qty: 10,
            plan_start_date: '2026-07-10',
            material_id: 1,
          }];
        }
        // runFullMRP 的工单查询（无 work_order_no）
        if (/SELECT wo\.id, wo\.plan_qty, wo\.material_id.*FROM prd_work_order/.test(s)) {
          return [{
            id: 1,
            plan_qty: 10,
            material_id: 1,
          }];
        }
        // 产品信息
        if (/SELECT id, material_code, material_name, unit FROM inv_material WHERE id = \?/.test(s)) {
          return [{ id: 1, material_code: 'PROD-001', material_name: '产品A', unit: '件' }];
        }
        if (/SELECT id, material_code, material_name, 7 AS lead_time_days FROM inv_material WHERE id = \?/.test(s)) {
          const id = params?.[0];
          if (id === 101) return [{ id: 101, material_code: 'MAT-001', material_name: '材料1', lead_time_days: 7 }];
          return [{ id, material_code: '', material_name: '', lead_time_days: 7 }];
        }
        // BOM
        if (/SELECT id, material_id, version, status, is_default FROM prd_bom/.test(s)) {
          if (params?.[0] === 1) {
            return [{ id: 100, material_id: 1, version: '1.0', status: 1, is_default: 1 }];
          }
          return [];
        }
        // BOM 明细
        if (/SELECT bd\.id, bd\.bom_id, bd\.material_id, bd\.quantity.*FROM prd_bom_detail bd/.test(s)) {
          if (params?.[0] === 100) {
            return [{
              id: 201, bom_id: 100, material_id: 101, quantity: 2, unit: 'kg', loss_rate: 0,
              material_code: 'MAT-001', material_name: '材料1',
            }];
          }
          return [];
        }
        // 库存查询
        if (/SELECT COALESCE\(SUM\(available_qty\)/.test(s)) {
          return [{ total_available: 5 }];
        }
        // 安全库存
        if (/safety_stock/.test(s) && !/po_item/.test(s) && !/in_transit/.test(s)) {
          return [{ id: 101, material_code: 'MAT-001', material_name: '材料1', unit: 'kg', safety_stock: 0, purchase_price: 10, lead_time_days: 7 }];
        }
        // 采购价格
        if (/SELECT purchase_price FROM inv_material/.test(s)) {
          return [{ purchase_price: 10 }];
        }
        // 在途
        if (/in_transit/.test(s) || /po_item/.test(s)) {
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
