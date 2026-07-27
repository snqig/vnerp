/**
 * VNERP 测试数据验证 - 自动化测试用例（步骤 18）
 *
 * 对应 TODO 清单步骤 11~15 的验证逻辑，封装为 Vitest 测试用例。
 * 可通过 `pnpm test:unit` 或 `pnpm vitest run tests/integration/test-data-validation.test.ts` 执行。
 *
 * 前置条件：先运行 `node scripts/test-data/01-schema-migration.mjs`
 *           再运行 `node scripts/test-data/02-generate-data.mjs` 生成测试数据。
 *
 * 验证内容：
 *   步骤 11 - FIFO 追溯链（批次可用量扣减 + 批次号一致性 + FIFO 顺序）
 *   步骤 12 - 生产全链路（工单状态 + 排程关联 + 领料单关联）
 *   步骤 13 - HR 薪资计算（计件总产量 + 薪资公式 + 社保公积金）
 *   步骤 14 - 多币种与汇率（base_* = 原币 * 汇率）
 *   步骤 15 - 外键关联完整性（无孤立记录）
 */
import mysql, { type ExecuteValues } from 'mysql2/promise';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vnerpdacahng',
  charset: 'utf8mb4',
};

let conn: mysql.Connection;

async function query<T = Record<string, unknown>>(sql: string, params: ExecuteValues = []): Promise<T[]> {
  const [rows] = (await conn.execute(sql, params)) as [unknown, unknown[]];
  return rows as T[];
}

beforeAll(async () => {
  conn = await mysql.createConnection(DB_CONFIG);
});

afterAll(async () => {
  if (conn) await conn.end();
});

// ═══════════════════════════════════════════════════════════
// 步骤 11: 验证 FIFO 追溯链
// ═══════════════════════════════════════════════════════════
describe('步骤 11: FIFO 追溯链', () => {
  describe('11a. 批次可用量扣减', () => {
    const BATCH_IDS = ['BATCH-20260701-A', 'BATCH-20260701-B', 'BATCH-20260701-C'];

    it.each([
      ['A', 1200, 1500],
      ['B', 900, 1000],
      ['C', 300, 500],
    ])('批次 %s 可用量 = %i（初始量 %i，扣减后）', async (_, expectedAvail, expectedQty) => {
      const rows = await query<{ available_qty: number; quantity: number }>(
        `SELECT available_qty, quantity FROM inv_inventory_batch WHERE batch_no = ?`,
        [`BATCH-20260701-${_}`],
      );
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].available_qty)).toBe(expectedAvail);
      expect(Number(rows[0].quantity)).toBe(expectedQty);
    });
  });

  describe('11b. 领料明细批次号一致性', () => {
    it('领料明细数量 = 3', async () => {
      const rows = await query(
        `SELECT ii.material_name, ii.batch_no, ii.issued_qty,
                ib.batch_no AS inbound_batch_no, ib.unit_price AS batch_price
         FROM prd_material_issue_item ii
         LEFT JOIN inv_inventory_batch ib
           ON ii.batch_no COLLATE utf8mb4_unicode_ci = ib.batch_no COLLATE utf8mb4_unicode_ci
         WHERE ii.issue_id = (SELECT id FROM prd_material_issue WHERE issue_no = 'MR-2026-001')
         ORDER BY ii.id`,
      );
      expect(rows).toHaveLength(3);

      // 每条明细：领料批次号 = 入库批次号，且批次价格不为 null
      for (const item of rows) {
        expect(item.batch_no).toBe(item.inbound_batch_no);
        expect(item.batch_price).not.toBeNull();
      }
    });
  });

  describe('11c. FIFO 模拟验证', () => {
    it('最早入库批次仍有可用量（优先消耗）', async () => {
      const rows = await query<{ batch_no: string; available_qty: number; inbound_date: string }>(
        `SELECT batch_no, available_qty, inbound_date
         FROM inv_inventory_batch
         WHERE material_id = (SELECT id FROM inv_material WHERE material_name = '丝印油墨-黑色' AND deleted = 0 LIMIT 1)
           AND available_qty > 0 AND deleted = 0
         ORDER BY inbound_date ASC`,
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].batch_no).toBe('BATCH-20260701-A');
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 步骤 12: 验证生产全链路
// ═══════════════════════════════════════════════════════════
describe('步骤 12: 生产全链路', () => {
  describe('12a. 工单状态', () => {
    it('工单 WO-2026-001 存在且状态 = 1（待生产），关联销售订单', async () => {
      const rows = await query<{ status: number; sales_order_id: number | null }>(
        `SELECT status, sales_order_id FROM prd_work_order WHERE work_order_no = 'WO-2026-001' AND deleted = 0`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe(1);
      expect(rows[0].sales_order_id).not.toBeNull();
    });
  });

  describe('12b. 排程关联', () => {
    it('排程 SCH-2026-001 关联工单 WO-2026-001 和销售订单 SO-2026-001', async () => {
      const rows = await query<{ work_order_no: string; order_no: string }>(
        `SELECT s.schedule_no, s.work_order_id, s.order_id, s.order_no,
                w.work_order_no
         FROM prd_schedule s
         LEFT JOIN prd_work_order w ON s.work_order_id = w.id
         WHERE s.schedule_no = 'SCH-2026-001' AND s.deleted = 0`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].work_order_no).toBe('WO-2026-001');
      expect(rows[0].order_no).toBe('SO-2026-001');
    });
  });

  describe('12c. 领料单关联', () => {
    it('领料单 MR-2026-001 关联工单 WO-2026-001，状态 = 2（已发料）', async () => {
      const rows = await query<{ work_order_no: string; status: number }>(
        `SELECT mi.issue_no, mi.work_order_id, mi.status, w.work_order_no
         FROM prd_material_issue mi
         LEFT JOIN prd_work_order w ON mi.work_order_id = w.id
         WHERE mi.issue_no = 'MR-2026-001'`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].work_order_no).toBe('WO-2026-001');
      expect(rows[0].status).toBe(2);
    });

    it('领料明细 = 3 条（黑色油墨300kg / 白色油墨100kg / 网版200个）', async () => {
      const issueIdRows = await query<{ id: number }>(
        `SELECT id FROM prd_material_issue WHERE issue_no = 'MR-2026-001'`,
      );
      expect(issueIdRows).toHaveLength(1);

      const details = await query<{ material_name: string; issued_qty: string | number; batch_no: string }>(
        `SELECT material_name, required_qty, issued_qty, batch_no
         FROM prd_material_issue_item WHERE issue_id = ? ORDER BY id`,
        [issueIdRows[0].id],
      );
      expect(details).toHaveLength(3);
      expect(details[0].material_name).toContain('黑色');
      expect(Number(details[0].issued_qty)).toBe(300);
      expect(details[1].material_name).toContain('白色');
      expect(Number(details[1].issued_qty)).toBe(100);
      expect(details[2].material_name).toBe('网版');
      expect(Number(details[2].issued_qty)).toBe(200);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 步骤 13: 验证 HR 薪资计算
// ═══════════════════════════════════════════════════════════
describe('步骤 13: HR 薪资计算', () => {
  const EMPLOYEE_ID = 1001;
  const EXPECTED_PIECE_QTY = 1266;
  const EXPECTED_PIECE_AMOUNT = 549.8; // 500*0.5 + 400*0.5 + 266*0.3 + 100*0.2

  describe('13a. 计件明细总产量', () => {
    it('计件明细总产量 = 1266 件，记录数 = 4', async () => {
      const rows = await query<{ total_qty: number; total_amount: number; record_count: number }>(
        `SELECT SUM(quantity) AS total_qty, SUM(amount) AS total_amount, COUNT(*) AS record_count
         FROM hr_piece_work_detail WHERE employee_id = ?`,
        [EMPLOYEE_ID],
      );
      expect(Number(rows[0].total_qty)).toBe(EXPECTED_PIECE_QTY);
      expect(rows[0].record_count).toBe(4);
    });

    it('计件总额 = 549.80 元', async () => {
      const rows = await query<{ total_amount: number }>(
        `SELECT SUM(amount) AS total_amount FROM hr_piece_work_detail WHERE employee_id = ?`,
        [EMPLOYEE_ID],
      );
      expect(Math.abs(Number(rows[0].total_amount) - EXPECTED_PIECE_AMOUNT)).toBeLessThan(0.01);
    });
  });

  describe('13b. 计件单价', () => {
    it.each([
      ['PRINT', 0.5],
      ['DIE_CUT', 0.3],
      ['INSPECT', 0.2],
    ])('计件单价 %s = %f', async (code, expected) => {
      const rows = await query<{ unit_price: string | number }>(
        `SELECT unit_price FROM hr_piece_rate WHERE process_code = ? AND status = 1`,
        [code],
      );
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(Number(rows[0].unit_price)).toBe(expected);
    });
  });

  describe('13c. 薪资计算结果', () => {
    const EXPECTED_GROSS = 8000 + 549.8 + 1000 + 500; // 10049.80
    const EXPECTED_SOCIAL = 840; // 8000 * 10.5%
    const EXPECTED_HOUSING = 960; // 8000 * 12%
    const EXPECTED_TAX = Math.round((EXPECTED_GROSS - 5000 - 840 - 960) * 0.10 * 100) / 100; // 324.98
    const EXPECTED_DEDUCTION = EXPECTED_SOCIAL + EXPECTED_HOUSING + EXPECTED_TAX; // 2124.98
    const EXPECTED_NET = EXPECTED_GROSS - EXPECTED_DEDUCTION; // 7924.82

    it('基本工资 = 8000', async () => {
      const rows = await query<{ base_salary: number }>(
        `SELECT base_salary FROM hr_salary_calculation WHERE employee_id = ? AND calc_month = '2026-07'`,
        [EMPLOYEE_ID],
      );
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].base_salary)).toBe(8000);
    });

    it('计件工资 = 549.80', async () => {
      const rows = await query<{ piece_salary: number }>(
        `SELECT piece_salary FROM hr_salary_calculation WHERE employee_id = ? AND calc_month = '2026-07'`,
        [EMPLOYEE_ID],
      );
      expect(Math.abs(Number(rows[0].piece_salary) - 549.8)).toBeLessThan(0.01);
    });

    it('绩效工资 = 1000，补贴 = 500', async () => {
      const rows = await query<{ performance_salary: number; allowances: number }>(
        `SELECT performance_salary, allowances FROM hr_salary_calculation WHERE employee_id = ? AND calc_month = '2026-07'`,
        [EMPLOYEE_ID],
      );
      expect(Number(rows[0].performance_salary)).toBe(1000);
      expect(Number(rows[0].allowances)).toBe(500);
    });

    it(`应发工资 = ${EXPECTED_GROSS}（基本+计件+绩效+补贴）`, async () => {
      const rows = await query<{ gross_pay: number }>(
        `SELECT gross_pay FROM hr_salary_calculation WHERE employee_id = ? AND calc_month = '2026-07'`,
        [EMPLOYEE_ID],
      );
      expect(Math.abs(Number(rows[0].gross_pay) - EXPECTED_GROSS)).toBeLessThan(0.01);
    });

    it(`社保个人 = ${EXPECTED_SOCIAL}（基数8000 * 10.5%）`, async () => {
      const rows = await query<{ social_insurance_personal: number }>(
        `SELECT social_insurance_personal FROM hr_salary_calculation WHERE employee_id = ? AND calc_month = '2026-07'`,
        [EMPLOYEE_ID],
      );
      expect(Number(rows[0].social_insurance_personal)).toBe(EXPECTED_SOCIAL);
    });

    it(`公积金个人 = ${EXPECTED_HOUSING}（基数8000 * 12%）`, async () => {
      const rows = await query<{ housing_fund_personal: number }>(
        `SELECT housing_fund_personal FROM hr_salary_calculation WHERE employee_id = ? AND calc_month = '2026-07'`,
        [EMPLOYEE_ID],
      );
      expect(Number(rows[0].housing_fund_personal)).toBe(EXPECTED_HOUSING);
    });

    it(`个税 = ${EXPECTED_TAX}（应税${EXPECTED_GROSS - 5000 - 840 - 960} * 10%）`, async () => {
      const rows = await query<{ individual_tax: number }>(
        `SELECT individual_tax FROM hr_salary_calculation WHERE employee_id = ? AND calc_month = '2026-07'`,
        [EMPLOYEE_ID],
      );
      expect(Math.abs(Number(rows[0].individual_tax) - EXPECTED_TAX)).toBeLessThan(0.01);
    });

    it(`扣款合计 = ${EXPECTED_DEDUCTION}（社保+公积金+个税）`, async () => {
      const rows = await query<{ total_deduction: number }>(
        `SELECT total_deduction FROM hr_salary_calculation WHERE employee_id = ? AND calc_month = '2026-07'`,
        [EMPLOYEE_ID],
      );
      expect(Math.abs(Number(rows[0].total_deduction) - EXPECTED_DEDUCTION)).toBeLessThan(0.01);
    });

    it(`实发工资 = ${EXPECTED_NET}，且实发 = 应发 - 扣款合计`, async () => {
      const rows = await query<{ net_pay: number; gross_pay: number; total_deduction: number }>(
        `SELECT net_pay, gross_pay, total_deduction FROM hr_salary_calculation WHERE employee_id = ? AND calc_month = '2026-07'`,
        [EMPLOYEE_ID],
      );
      expect(Math.abs(Number(rows[0].net_pay) - EXPECTED_NET)).toBeLessThan(0.01);
      // 薪资公式验证
      expect(Math.abs(Number(rows[0].net_pay) - (Number(rows[0].gross_pay) - Number(rows[0].total_deduction)))).toBeLessThan(0.01);
    });
  });

  describe('13d. 薪资档案', () => {
    it('薪资档案存在：基本工资8000，社保基数8000，公积金比例12%，个税起征点5000', async () => {
      const rows = await query<{
        base_salary: number;
        social_insurance_base: number;
        housing_fund_rate: number;
        tax_deduction: number;
      }>(`SELECT base_salary, social_insurance_base, housing_fund_rate, tax_deduction
          FROM hr_salary_profile WHERE employee_id = ? AND status = 1`, [EMPLOYEE_ID]);
      expect(rows).toHaveLength(1);
      expect(Number(rows[0].base_salary)).toBe(8000);
      expect(Number(rows[0].social_insurance_base)).toBe(8000);
      expect(Number(rows[0].housing_fund_rate)).toBe(12);
      expect(Number(rows[0].tax_deduction)).toBe(5000);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 步骤 14: 验证多币种与汇率
// ═══════════════════════════════════════════════════════════
describe('步骤 14: 多币种与汇率', () => {
  it('汇率表有 USD→CNY 记录，汇率 = 7.2', async () => {
    const rows = await query<{ from_currency: string; to_currency: string; rate: number }>(
      `SELECT from_currency, to_currency, rate FROM sys_exchange_rate
       WHERE from_currency = 'USD' AND to_currency = 'CNY'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(Number(rows[0].rate)).toBe(7.2);
  });

  describe('PO-2026-001 (CNY, rate=1.0)', () => {
    it('base_* = 原币 * 1.0', async () => {
      const rows = await query<{
        currency: string; exchange_rate: number;
        total_amount: number; base_total_amount: number;
        tax_amount: number; base_tax_amount: number;
        grand_total: number; base_grand_total: number;
      }>(`SELECT currency, exchange_rate, total_amount, base_total_amount,
                 tax_amount, base_tax_amount, grand_total, base_grand_total
          FROM pur_purchase_order WHERE po_no = 'PO-2026-001'`);
      expect(rows).toHaveLength(1);
      const po = rows[0];
      expect(po.currency).toBe('CNY');
      expect(Number(po.exchange_rate)).toBe(1.0);
      expect(Number(po.base_total_amount)).toBe(Number(po.total_amount) * Number(po.exchange_rate));
      expect(Number(po.base_tax_amount)).toBe(Number(po.tax_amount) * Number(po.exchange_rate));
      expect(Number(po.base_grand_total)).toBe(Number(po.grand_total) * Number(po.exchange_rate));
    });
  });

  describe('PO-2026-002 (USD, rate=7.2)', () => {
    it('币种 = USD，汇率 = 7.2', async () => {
      const rows = await query<{ currency: string; exchange_rate: number }>(
        `SELECT currency, exchange_rate FROM pur_purchase_order WHERE po_no = 'PO-2026-002'`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].currency).toBe('USD');
      expect(Number(rows[0].exchange_rate)).toBe(7.2);
    });

    it('base_total = 12000 * 7.2 = 86400', async () => {
      const rows = await query<{ base_total_amount: number }>(
        `SELECT base_total_amount FROM pur_purchase_order WHERE po_no = 'PO-2026-002'`,
      );
      expect(Number(rows[0].base_total_amount)).toBe(86400);
    });

    it('base_tax = 1560 * 7.2 = 11232', async () => {
      const rows = await query<{ base_tax_amount: number }>(
        `SELECT base_tax_amount FROM pur_purchase_order WHERE po_no = 'PO-2026-002'`,
      );
      expect(Number(rows[0].base_tax_amount)).toBe(11232);
    });

    it('base_grand = 13560 * 7.2 = 97632', async () => {
      const rows = await query<{ base_grand_total: number }>(
        `SELECT base_grand_total FROM pur_purchase_order WHERE po_no = 'PO-2026-002'`,
      );
      expect(Number(rows[0].base_grand_total)).toBe(97632);
    });

    it('明细 base_unit_price = 12 * 7.2 = 86.4，base_amount = 86400', async () => {
      const poRows = await query<{ id: number }>(
        `SELECT id FROM pur_purchase_order WHERE po_no = 'PO-2026-002'`,
      );
      const lineRows = await query<{ base_unit_price: number; base_amount: number }>(
        `SELECT base_unit_price, base_amount FROM pur_purchase_order_line WHERE po_id = ?`,
        [poRows[0].id],
      );
      expect(Number(lineRows[0].base_unit_price)).toBe(86.4);
      expect(Number(lineRows[0].base_amount)).toBe(86400);
    });
  });

  describe('PO-2026-003 (CNY, rate=1.0)', () => {
    it('base_total = total * rate', async () => {
      const rows = await query<{
        currency: string; total_amount: number; base_total_amount: number; exchange_rate: number;
      }>(`SELECT currency, total_amount, base_total_amount, exchange_rate
          FROM pur_purchase_order WHERE po_no = 'PO-2026-003'`);
      expect(rows[0].currency).toBe('CNY');
      expect(Number(rows[0].base_total_amount)).toBe(Number(rows[0].total_amount) * Number(rows[0].exchange_rate));
    });
  });

  describe('入库单 INB-2026-002 (USD)', () => {
    it('币种 = USD，汇率 = 7.2，base_total = total * rate', async () => {
      const rows = await query<{
        currency: string; exchange_rate: number;
        total_amount: number; base_total_amount: number;
      }>(`SELECT currency, exchange_rate, total_amount, base_total_amount
          FROM inv_inbound_order WHERE order_no = 'INB-2026-002'`);
      expect(rows).toHaveLength(1);
      expect(rows[0].currency).toBe('USD');
      expect(Number(rows[0].exchange_rate)).toBe(7.2);
      expect(
        Math.abs(Number(rows[0].base_total_amount) - Number(rows[0].total_amount) * Number(rows[0].exchange_rate)),
      ).toBeLessThan(0.01);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 步骤 15: 外键关联完整性（无孤立记录）
// ═══════════════════════════════════════════════════════════
describe('步骤 15: 外键关联完整性', () => {
  it.each([
    ['采购订单明细 → 采购订单', `SELECT COUNT(*) AS cnt FROM pur_purchase_order_line l
       LEFT JOIN pur_purchase_order p ON l.po_id = p.id WHERE p.id IS NULL`],
    ['采购订单明细 → 物料', `SELECT COUNT(*) AS cnt FROM pur_purchase_order_line l
       LEFT JOIN inv_material m ON l.material_id = m.id WHERE m.id IS NULL`],
    ['入库明细 → 入库单', `SELECT COUNT(*) AS cnt FROM inv_inbound_item i
       LEFT JOIN inv_inbound_order o ON i.order_id = o.id WHERE o.id IS NULL`],
    ['库存批次 → 物料', `SELECT COUNT(*) AS cnt FROM inv_inventory_batch b
       LEFT JOIN inv_material m ON b.material_id = m.id WHERE m.id IS NULL AND b.deleted = 0`],
    ['库存批次 → 仓库', `SELECT COUNT(*) AS cnt FROM inv_inventory_batch b
       LEFT JOIN inv_warehouse w ON b.warehouse_id = w.id WHERE w.id IS NULL AND b.deleted = 0`],
    ['排程 → 工单', `SELECT COUNT(*) AS cnt FROM prd_schedule s
       LEFT JOIN prd_work_order w ON s.work_order_id = w.id
       WHERE s.work_order_id IS NOT NULL AND w.id IS NULL AND s.deleted = 0`],
    ['领料明细 → 领料单', `SELECT COUNT(*) AS cnt FROM prd_material_issue_item i
       LEFT JOIN prd_material_issue m ON i.issue_id = m.id WHERE m.id IS NULL`],
    ['薪资计算 → 员工', `SELECT COUNT(*) AS cnt FROM hr_salary_calculation s
       LEFT JOIN sys_employee e ON s.employee_id = e.id WHERE e.id IS NULL`],
  ])('%s 无孤立记录', async (_, sql) => {
    const rows = await query<{ cnt: number }>(sql);
    expect(Number(rows[0].cnt)).toBe(0);
  });
});
