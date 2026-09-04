import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

function pad(n: number, len: number = 3): string {
  return String(n).padStart(len, '0');
}

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().slice(0, 10);
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAmount(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

export const POST = withPermission(async (_request: NextRequest, _userInfo) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    const deleteTables = [
      'bom_line',
      'bom_material',
      'sal_delivery_detail',
      'sal_return_detail',
      'sal_reconciliation_writeoff',
      'sal_reconciliation_line',
      'prd_material_return_item',
      'inv_transfer_item',
      'inv_stocktaking_item',
      'inv_stock_adjust_item',
      'inv_sales_outbound_item',
      'pur_purchase_order_line',
      'pur_request_item',
      'hr_training_participant',
      'qc_unqualified',
      'qc_final_inspection',
      'bom_header',
      'plm_product_lifecycle',
      'plm_eco',
      'qms_lab_test',
      'mdm_product',
      'ink_mixed_record',
      'ink_formula',
      'ink_opening_record',
      'prd_die',
      'prd_die_template',
      'sal_delivery',
      'sal_return',
      'sal_reconciliation',
      'prd_material_return',
      'inv_transfer_order',
      'inv_stocktaking',
      'inv_stock_adjust',
      'inv_sales_outbound',
      'pur_purchase_order',
      'pur_request',
      'sample_order',
      'crm_follow_record',
      'crm_customer_analysis',
      'eqp_maintenance_record',
      'eqp_repair',
      'eqp_calibration',
      'eqp_scrap',
      'qms_complaint',
      'qms_supplier_audit',
      'qrcode_record',
      'fin_receivable',
      'fin_cost_record',
      'hr_training',
    ];

    for (const table of deleteTables) {
      try {
        await conn.execute(`DELETE FROM ${table}`);
      } catch (_e) {}
    }

    await conn.execute('SET FOREIGN_KEY_CHECKS=0');

    const [custRows] = await conn.execute(
      'SELECT id, customer_code, customer_name FROM crm_customer ORDER BY id'
    );
    const customers: DbRow[] = custRows;

    const [suppRows] = await conn.execute(
      'SELECT id, supplier_code, supplier_name FROM pur_supplier ORDER BY id'
    );
    const suppliers: DbRow[] = suppRows;

    const [matRows] = await conn.execute(
      'SELECT id, material_code, material_name, specification, unit, purchase_price, sale_price FROM inv_material ORDER BY id'
    );
    const materials: DbRow[] = matRows;

    const [whRows] = await conn.execute(
      'SELECT id, warehouse_code, warehouse_name FROM inv_warehouse ORDER BY id'
    );
    const warehouses: DbRow[] = whRows;

    const [woRows] = await conn.execute(
      'SELECT id, work_order_no FROM prod_work_order ORDER BY id'
    );
    const workOrders: DbRow[] = woRows;

    const [soRows] = await conn.execute(
      'SELECT id, order_no, customer_id FROM sal_order ORDER BY id'
    );
    const salesOrders: DbRow[] = soRows;

    const [eqpRows] = await conn.execute(
      'SELECT id, equipment_code, equipment_name FROM eqp_equipment ORDER BY id'
    );
    let equipment: DbRow[] = eqpRows;
    if (equipment.length === 0) {
      const eqpTypes = [
        { code: 'SMP', name: ts('k_gj6rls') },
        { code: 'SMP', name: ts('k_1q8v5a6') },
        { code: 'DIE', name: ts('k_uz95ru') },
        { code: 'DRY', name: ts('k_nfnjlc') },
        { code: 'INS', name: ts('k_ambmd6') },
        { code: 'AUX', name: ts('k_vu6aov') },
      ];
      for (let i = 1; i <= 20; i++) {
        const et = eqpTypes[(i - 1) % eqpTypes.length];
        await conn.execute(
          `INSERT INTO eqp_equipment (equipment_code, equipment_name, equipment_type, brand, model, serial_no, workshop_id, location, purchase_date, manufacturer, warranty_expire, rated_capacity, current_status, oee, availability, performance, quality_rate, total_run_hours, last_maintenance_date, next_maintenance_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `EQP-${et.code}-${String(i).padStart(4, '0')}`,
            et.name,
            (i % 5) + 1,
            randomItem([ts('k_gp5epx'), ts('k_jm4fkk'), ts('k_qkwmj0')]),
            `MODEL-${String(i).padStart(3, '0')}`,
            `SN-${String(i).padStart(6, '0')}`,
            null,
            randomItem([ts('k_1i2no0q'), ts('k_18ldhlf'), ts('k_hj2vti')]),
            randomDate(new Date(2019, 0, 1), new Date()),
            `${randomItem([ts('k_gp5epx'), ts('k_jm4fkk')])}制造`,
            randomDate(new Date(), new Date(2028, 11, 31)),
            randomInt(500, 5000),
            1,
            randomAmount(60, 95),
            randomAmount(85, 99),
            randomAmount(75, 98),
            randomAmount(90, 99.9),
            randomInt(1000, 50000),
            randomDate(new Date(2025, 0, 1), new Date()),
            randomDate(new Date(), new Date(2027, 11, 31)),
            1,
          ]
        );
      }
      const [newEqpRows] = await conn.execute(
        'SELECT id, equipment_code, equipment_name FROM eqp_equipment ORDER BY id'
      );
      equipment = newEqpRows;
    }

    const [userRows] = await conn.execute(
      'SELECT id, username, real_name FROM sys_user ORDER BY id'
    );
    const users: DbRow[] = userRows;

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const defaultUserId = users.length > 0 ? users[0].id : 1;
    const defaultUserName = users.length > 0 ? users[0].real_name : ts('k_1csar6s');

    if (customers.length === 0 || materials.length === 0 || warehouses.length === 0) {
      throw new Error(ts('k_h2iibm'));
    }

    const productNames = [
      ts('k_1085ar9'),
      ts('k_1d31fut'),
      ts('k_1u8tdc0'),
      ts('k_hd09uq'),
      ts('k_e0f7iv'),
      ts('k_18cwdu4'),
      ts('k_kbbj1u'),
      ts('k_4nmn45'),
      ts('k_1yfxa7v'),
      ts('k_13ae7oe'),
      ts('k_dcsarp'),
      ts('k_1t9le8a'),
      ts('k_1cy4l8l'),
      ts('k_qy1rec'),
      ts('k_oy99lw'),
      ts('k_1vwgk6m'),
      ts('k_ql36ga'),
      ts('k_1royxq9'),
      ts('k_73sqk3'),
      ts('k_1bp9f27'),
    ];
    const productSpecs = [
      '120×80mm',
      '180×100mm',
      '50×30mm',
      '150×80mm',
      '200×150mm',
      '100×60mm',
      '40×20mm',
      '80×50mm',
      '250×120mm',
      '150×100mm',
      '160×90mm',
      '200×80mm',
      '300×200mm',
      '80×40mm',
      '120×60mm',
      '200×150mm',
      '100×80mm',
      '60×40mm',
      '45×45mm',
      '30×15mm',
    ];
    const productUnits = [
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_accfpb'),
      ts('k_1hzbc86'),
      ts('k_accfpb'),
    ];
    const categoryNames = [ts('k_p84cjd'), ts('k_lkgocz'), ts('k_ihjq7d'), ts('k_1dp5y0w'), ts('k_ce5fj4')];
    const shortNames = [
      ts('k_1mti1ph'),
      ts('k_h2sp88'),
      ts('k_1v9uata'),
      ts('k_18zx15d'),
      ts('k_1lb2dqo'),
      ts('k_1kuuuxb'),
      ts('k_lwrvq5'),
      ts('k_1ammjtq'),
      ts('k_1hgvoqd'),
      ts('k_78kwej'),
      ts('k_o5qw5x'),
      ts('k_1bd5pi3'),
      ts('k_3inqvn'),
      ts('k_275mr2'),
      ts('k_1g467ig'),
      ts('k_1l1w2wf'),
      ts('k_n57oa5'),
      ts('k_1itwy4'),
      ts('k_cb4uk6'),
      ts('k_ps5em5'),
    ];

    const productIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      await conn.execute(
        `INSERT INTO mdm_product (product_code, product_name, short_name, specification, unit, category_id, category_name, customer_id, customer_name, bom_version, description, status, cost_price, sale_price, safety_stock, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `PRD-${pad(i + 1, 5)}`,
          productNames[i],
          shortNames[i],
          productSpecs[i],
          productUnits[i],
          (i % 5) + 1,
          categoryNames[i % 5],
          cust.id,
          cust.customer_name,
          `V${(i % 3) + 1}.0`,
          `${productNames[i]}，丝印产品`,
          randomItem(['active', 'active', 'active', 'inactive']),
          randomAmount(0.5, 15),
          randomAmount(1, 30),
          randomInt(500, 5000),
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      productIds.push(idRow[0].id);
    }
    stats.mdm_product = 20;

    const sampleTypes = [ts('k_1xrmwnc'), ts('k_d8md5o'), ts('k_1ugi7st'), ts('k_zwqu20')];
    const printMethods = [ts('k_1o7ehgo'), ts('k_1m4h9a'), ts('k_7p3zse'), ts('k_5u37od'), ts('k_1034o47')];
    const colorSequences = [ts('k_1h1n7mu'), ts('k_1loe7mj'), ts('k_1muvx42'), ts('k_1iogdaw'), ts('k_1n7z07o')];
    const progressStatuses = [ts('k_1khjpni'), ts('k_1adnx0a'), ts('k_1g5a05b'), ts('k_vlu9xm'), ts('k_19j4h')];
    const sampleReasons = [ts('k_4fa6y6'), ts('k_1oeg6ic'), ts('k_1cinzeo'), ts('k_1a3rpks'), ts('k_1hich49')];
    const trackers = [ts('k_1qnoc1b'), ts('k_va5swd'), ts('k_1hp6qwe'), ts('k_pqzh94'), ts('k_1l6p8ef')];
    const providedMaterials = [ts('k_1chmrn1'), ts('k_1lbmci5'), ts('k_1phn0q2'), ts('k_11y9h8u'), ts('k_abwpx4')];
    const mylarInfos = ['Mylar 0.125mm', 'Mylar 0.175mm', 'Mylar 0.25mm', ts('k_15dzhvg'), 'Mylar 0.1mm'];
    const sampleStocks = [ts('k_7y3qi3'), ts('k_gfxjbs'), ts('k_1lfo4bv'), ts('k_1ksu60q'), ts('k_o6t4sb')];
    const customerConfirms = [ts('k_vlu9xm'), ts('k_zfkkgx'), ts('k_lw7tao'), ts('k_vdjbls'), ts('k_1knn2m5')];

    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const orderDate = randomDate(yearStart, now);
      const orderMonth =
        parseInt(orderDate.substring(0, 4)) * 100 + parseInt(orderDate.substring(5, 7));
      const requiredDate = new Date(new Date(orderDate).getTime() + randomInt(7, 30) * 86400000)
        .toISOString()
        .slice(0, 10);
      const mat = materials[i % materials.length];
      await conn.execute(
        `INSERT INTO sample_order (sample_no, order_month, order_date, sample_type, customer_name, print_method, color_sequence, product_name, material_code, size_spec, material_desc, sample_order_no, required_date, progress_status, is_confirmed, is_urgent, is_produce_together, quantity, progress_detail, sample_count, sample_reason, order_tracker, provided_material, receive_time, mylar_info, sample_stock, customer_confirm, remark, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `SMP-2026-${pad(i + 1, 5)}`,
          orderMonth,
          orderDate,
          randomItem(sampleTypes),
          cust.customer_name,
          randomItem(printMethods),
          randomItem(colorSequences),
          productNames[i] + ts('k_1nu87vc'),
          mat.material_code,
          productSpecs[i],
          mat.material_name,
          `SO-SMP-${pad(i + 1, 5)}`,
          requiredDate,
          randomItem(progressStatuses),
          randomItem([0, 1]),
          randomItem([0, 1, 0]),
          randomItem([0, 1, 0]),
          randomInt(10, 100),
          ts('k_jkg59v'),
          randomInt(1, 5),
          randomItem(sampleReasons),
          randomItem(trackers),
          randomItem(providedMaterials),
          `${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`,
          randomItem(mylarInfos),
          randomItem(sampleStocks),
          randomItem(customerConfirms),
          `${productNames[i]}打样需求，需首件确认`,
          randomInt(0, 3),
        ]
      );
    }
    stats.sample_order = 20;

    const followTypes = ['visit', 'phone', 'email', 'wechat'];
    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const user = users[i % users.length];
      const nextDate = new Date(now.getTime() + randomInt(7, 30) * 86400000)
        .toISOString()
        .slice(0, 10);
      await conn.execute(
        `INSERT INTO crm_follow_record (customer_id, customer_name, follow_type, follow_content, contact_name, salesman_name, next_follow_date, opportunity, status, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cust.id,
          cust.customer_name,
          randomItem(followTypes),
          `跟进客户${cust.customer_name}，沟通丝印标签订单需求及交期安排`,
          `联系人${i + 1}`,
          user.real_name,
          nextDate,
          randomItem([ts('k_iqn6el'), ts('k_i96gu8'), ts('k_1ti15ob'), ts('k_1arhfg6')]),
          randomItem([1, 2]),
          ts('k_9zl0jb'),
          defaultUserId,
        ]
      );
    }
    stats.crm_follow_record = 20;

    const analysisPeriods = ['2026-Q1', '2026-Q2', '2025-Q4', '2025-Q3', '2026-Q1'];
    const customerLevels = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const period = randomItem(analysisPeriods);
      const periodYear = parseInt(period.substring(0, 4));
      const periodQ = parseInt(period.substring(6));
      const pStart = `${periodYear}-${String((periodQ - 1) * 3 + 1).padStart(2, '0')}-01`;
      const pEndMonth = periodQ * 3;
      const pEnd = `${periodYear}-${String(pEndMonth).padStart(2, '0')}-${pEndMonth === 2 ? 28 : 30}`;
      await conn.execute(
        `INSERT INTO crm_customer_analysis (customer_id, customer_name, analysis_period, period_start, period_end, order_count, order_amount, delivery_count, return_count, complaint_count, on_time_rate, satisfaction_score, customer_level, growth_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cust.id,
          cust.customer_name,
          period,
          pStart,
          pEnd,
          randomInt(5, 50),
          randomAmount(50000, 2000000),
          randomInt(4, 45),
          randomInt(0, 5),
          randomInt(0, 3),
          randomAmount(85, 99.5),
          randomAmount(3.0, 5.0),
          randomItem(customerLevels),
          randomAmount(-10, 30),
        ]
      );
    }
    stats.crm_customer_analysis = 20;

    const templateMaterials = [ts('k_1w68fx3'), ts('k_qlmqji'), ts('k_142pgd2'), ts('k_1jsyqcw'), ts('k_1w68fx3')];
    const storageLocations = [ts('k_1mbqzik'), ts('k_1n5pslh'), ts('k_13tvggg'), ts('k_14nu9jd'), ts('k_1830jdo')];
    const templateIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const maxUsage = randomInt(50000, 200000);
      const warningUsage = randomInt(10000, 50000);
      const remainingUsage = randomInt(warningUsage, maxUsage);
      const sup = suppliers[i % suppliers.length];
      await conn.execute(
        `INSERT INTO prd_die_template (template_code, template_name, template_type, specification, material, max_usage, remaining_usage, warning_usage, status, storage_location, purchase_date, supplier_id, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `DT-${pad(i + 1, 5)}`,
          `${productNames[i]}丝网版`,
          (i % 2) + 1,
          productSpecs[i],
          randomItem(templateMaterials),
          maxUsage,
          remainingUsage,
          warningUsage,
          1,
          randomItem(storageLocations),
          randomDate(yearStart, now),
          sup.id,
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      templateIds.push(idRow[0].id);
    }
    stats.prd_die_template = 20;

    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const wh = warehouses[i % warehouses.length];
      const maxUseCount = randomInt(50000, 200000);
      const usedCount = randomInt(0, maxUseCount * 0.6);
      const remainingCount = maxUseCount - usedCount;
      const maintenanceDays = randomItem([90, 180, 365]);
      const lastMaintenanceDate = randomDate(yearStart, now);
      const nextMaintenanceDate = new Date(
        new Date(lastMaintenanceDate).getTime() + maintenanceDays * 86400000
      )
        .toISOString()
        .slice(0, 10);
      await conn.execute(
        `INSERT INTO prd_die (die_code, die_name, die_type, size_spec, customer_id, product_name, max_use_count, used_count, remaining_count, maintenance_days, last_maintenance_date, next_maintenance_date, warehouse_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `DIE-${pad(i + 1, 5)}`,
          `${productNames[i]}刀模`,
          (i % 2) + 1,
          productSpecs[i],
          cust.id,
          productNames[i],
          maxUseCount,
          usedCount,
          remainingCount,
          maintenanceDays,
          lastMaintenanceDate,
          nextMaintenanceDate,
          wh.id,
          1,
        ]
      );
    }
    stats.prd_die = 20;

    const formulaNames = [
      ts('k_u6im54'),
      ts('k_xkwia2'),
      ts('k_1lqjbt4'),
      ts('k_1jaoqsu'),
      ts('k_uixpka'),
      ts('k_1wflftp'),
      ts('k_hk4ikb'),
      ts('k_1q7n0m4'),
      ts('k_dq5zt0'),
      ts('k_1iaw9ad'),
      ts('k_1ydpk0p'),
      ts('k_11in0cz'),
      ts('k_fa0tb7'),
      ts('k_1b0s0u2'),
      ts('k_vhidp7'),
      ts('k_188addn'),
      ts('k_1d0rkjx'),
      ts('k_1mggyoh'),
      ts('k_1gzkan'),
      ts('k_2p8lab'),
    ];
    const pantoneCodes = [
      'PANTONE Black C',
      'PANTONE White C',
      'PANTONE 877 C',
      'PANTONE 185 C',
      'PANTONE 286 C',
      'PANTONE 871 C',
      'PANTONE 801 C',
      'PANTONE 356 C',
      'PANTONE 109 C',
      'PANTONE 432 C',
      'PANTONE 877 C',
      'PANTONE 2685 C',
      'PANTONE 802 C',
      'PANTONE Black 4 C',
      'PANTONE 11-0601 C',
      'PANTONE 16-1546 C',
      'PANTONE 3755 C',
      'PANTONE Cool Gray 8 C',
      'PANTONE 11-0601 C',
      'PANTONE 801 C',
    ];
    const colorNames = [
      ts('k_1peuqkq'),
      ts('k_6hu6um'),
      ts('k_1sdxy3l'),
      ts('k_1xpfks5'),
      ts('k_3atm1a'),
      ts('k_1w1464q'),
      ts('k_prcqfk'),
      ts('k_2g1g8k'),
      ts('k_1j92b77'),
      ts('k_p6ymeh'),
      ts('k_1sdxy3l'),
      ts('k_1y3vpxk'),
      ts('k_1lavv2e'),
      ts('k_xnkiqo'),
      ts('k_11vcfro'),
      ts('k_stszqs'),
      ts('k_1pjh9hn'),
      ts('k_17vc2ty'),
      ts('k_wf1a47'),
      ts('k_prcqfk'),
    ];
    const inkTypes = ['solvent', 'uv', 'conductive'];
    const baseInkTypes = [ts('k_6zse9o'), ts('k_34cfgh'), ts('k_hi1ro9')];
    const formulaIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const inkType = randomItem(inkTypes);
      await conn.execute(
        `INSERT INTO ink_formula (formula_no, formula_name, pantone_code, color_name, color_code, ink_type, base_ink_type, total_weight, unit, shelf_life_hours, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `IF-2026-${pad(i + 1, 5)}`,
          formulaNames[i],
          pantoneCodes[i],
          colorNames[i],
          `C${pad(i + 1, 3)}`,
          inkType,
          baseInkTypes[inkTypes.indexOf(inkType)],
          randomAmount(1, 50),
          'kg',
          randomItem([48, 72, 168, 336, 720]),
          1,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      formulaIds.push(idRow[0].id);
    }
    stats.ink_formula = 20;

    const inkMaterials = materials.filter(
      (m: DbRow) =>
        m.material_name?.includes(ts('k_w1cwb8')) ||
        m.material_name?.includes(ts('k_1fshh99')) ||
        m.material_name?.includes(ts('k_120z5rb')) ||
        m.material_name?.includes(ts('k_1x5vg2x'))
    );
    const inkMats = inkMaterials.length > 0 ? inkMaterials : materials.slice(0, 5);

    for (let i = 0; i < 20; i++) {
      const mat = inkMats[i % inkMats.length];
      const openTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`;
      const expireHours = randomItem([48, 72, 168, 336]);
      const expireTime = new Date(new Date(openTime).getTime() + expireHours * 3600000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');
      const user = users[i % users.length];
      const remainingQty = randomAmount(0.5, 10);
      await conn.execute(
        `INSERT INTO ink_opening_record (record_no, material_id, material_code, material_name, batch_no, ink_type, open_time, expire_hours, expire_time, remaining_qty, unit, status, operator_id, operator_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `IOR-2026-${pad(i + 1, 5)}`,
          mat.id,
          mat.material_code,
          mat.material_name,
          `B2026${pad(i + 1, 4)}`,
          randomItem(inkTypes),
          openTime,
          expireHours,
          expireTime,
          remainingQty,
          'kg',
          randomItem([1, 2, 3]),
          user.id,
          user.real_name,
        ]
      );
    }
    stats.ink_opening_record = 20;

    for (let i = 0; i < 20; i++) {
      const mat = inkMats[i % inkMats.length];
      const cust = customers[i % customers.length];
      const user = users[i % users.length];
      const wh = warehouses[i % warehouses.length];
      const mixTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`;
      const quantity = randomAmount(1, 20);
      const expireTime = new Date(new Date(mixTime).getTime() + randomItem([48, 72, 168]) * 3600000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');
      await conn.execute(
        `INSERT INTO ink_mixed_record (record_no, base_ink_id, base_ink_code, base_ink_name, mix_ratio, color_name, color_code, company_id, company_name, mix_time, operator_id, operator_name, quantity, unit, warehouse_id, status, expire_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `IMR-2026-${pad(i + 1, 5)}`,
          mat.id,
          mat.material_code,
          mat.material_name,
          randomItem(['1:2:1', '3:1', '2:1:1', '4:1', '1:1']),
          colorNames[i % colorNames.length],
          `C${pad(i + 1, 3)}`,
          cust.id,
          cust.customer_name,
          mixTime,
          user.id,
          user.real_name,
          quantity,
          'kg',
          wh.id,
          randomItem([1, 2]),
          expireTime,
        ]
      );
    }
    stats.ink_mixed_record = 20;

    const lifecycleStages = ['design', 'trial', 'production', 'mature', 'decline'];
    const lifecycleStageNames = [ts('k_1vm0ufp'), ts('k_ocj2w4'), ts('k_126kps6'), ts('k_1sb06f9'), ts('k_pjioz0')];
    for (let i = 0; i < 20; i++) {
      const pIdx = i % productIds.length;
      const stage = lifecycleStages[i % lifecycleStages.length];
      const effectiveDate = randomDate(yearStart, now);
      const _user = users[i % users.length];
      await conn.execute(
        `INSERT INTO plm_product_lifecycle (product_id, product_code, product_name, lifecycle_stage, stage_status, version, change_type, change_reason, change_desc, approver, approve_time, effective_date, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productIds[pIdx],
          `PRD-${pad(pIdx + 1, 5)}`,
          productNames[pIdx],
          stage,
          1,
          `V${(i % 3) + 1}.0`,
          randomItem(['material', 'process', 'design', 'specification']),
          `${productNames[i % 20]}生命周期阶段变更`,
          `${productNames[i % 20]}进入${lifecycleStageNames[i % 5]}`,
          defaultUserName,
          `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:00:00`,
          effectiveDate,
          `${productNames[pIdx]}处于${stage}阶段`,
          defaultUserId,
        ]
      );
    }
    stats.plm_product_lifecycle = 20;

    const ecoTypes = ['material', 'process', 'design', 'specification'];
    for (let i = 0; i < 20; i++) {
      const pIdx = i % productIds.length;
      const user = users[i % users.length];
      const ecoType = randomItem(ecoTypes);
      const oldVer = `V${(i % 3) + 1}.0`;
      const newVer = `V${(i % 3) + 2}.0`;
      const applyTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`;
      const statusVal = randomItem([1, 2, 3]);
      const approveTime =
        statusVal >= 2
          ? `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`
          : null;
      await conn.execute(
        `INSERT INTO plm_eco (eco_no, eco_type, product_id, product_code, product_name, old_version, new_version, change_reason, change_content, impact_analysis, status, applicant, apply_time, approver, approve_time, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ECO-2026-${pad(i + 1, 5)}`,
          ecoType,
          productIds[pIdx],
          `PRD-${pad(pIdx + 1, 5)}`,
          productNames[pIdx],
          oldVer,
          newVer,
          `${productNames[pIdx]}${ecoType}变更需求`,
          `变更${ecoType}相关参数以满足客户要求`,
          ts('k_ewhwxt'),
          statusVal,
          user.real_name,
          applyTime,
          statusVal >= 2 ? defaultUserName : null,
          approveTime,
          null,
          defaultUserId,
        ]
      );
    }
    stats.plm_eco = 20;

    const bomIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const pIdx = i % productIds.length;
      const totalMaterialCount = randomInt(3, 12);
      const totalCost = randomAmount(5, 200);
      await conn.execute(
        `INSERT INTO bom_header (bom_no, product_id, product_code, product_name, product_spec, version, is_default, status, unit, base_qty, total_material_count, total_cost, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `BOM-2026-${pad(i + 1, 5)}`,
          productIds[pIdx],
          `PRD-${pad(pIdx + 1, 5)}`,
          productNames[pIdx],
          productSpecs[pIdx],
          `V${(i % 3) + 1}.0`,
          i < 10 ? 1 : 0,
          randomItem([10, 20, 20]),
          productUnits[pIdx],
          1,
          totalMaterialCount,
          totalCost,
          `${productNames[pIdx]}BOM`,
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      bomIds.push(idRow[0].id);
    }
    stats.bom_header = 20;

    const bomMaterialIds: number[] = [];
    for (let i = 0; i < materials.length; i++) {
      const mat = materials[i];
      const matType = i % 5 === 0 ? 'SEMI' : i % 3 === 0 ? 'PKG' : 'RAW';
      await conn.execute(
        `INSERT INTO bom_material (material_code, material_name, material_spec, material_type, category_name, unit, unit_cost, safety_stock, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mat.material_code,
          mat.material_name,
          mat.specification,
          matType,
          randomItem([ts('k_1bjxal9'), ts('k_w1cwb8'), ts('k_1xxx1ch'), ts('k_14rp9uj')]),
          mat.unit,
          mat.purchase_price || 0,
          100,
          1,
        ]
      );
      const [bmRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      bomMaterialIds.push(bmRow[0].id);
    }

    const materialTypes = ['RAW', 'SEMI', 'SUB', 'PKG', 'OTHER'];
    const processNames = [
      ts('k_1o7ehgo'),
      ts('k_12b93ht'),
      ts('k_a84lt6'),
      ts('k_7p3zse'),
      ts('k_1avl262'),
      ts('k_1qefmtk'),
      ts('k_1p0kpz3'),
      ts('k_xrdj7e'),
      ts('k_5i3tcf'),
      ts('k_55mvdr'),
    ];
    for (let i = 0; i < 20; i++) {
      const bomId = bomIds[i % bomIds.length];
      const mat = materials[i % materials.length];
      const bmId = bomMaterialIds[i % bomMaterialIds.length];
      const consumptionQty = randomAmount(0.5, 10);
      const lossRate = randomAmount(0, 5);
      const actualQty = Math.round(consumptionQty * (1 + lossRate / 100) * 1000000) / 1000000;
      const unitCost = mat.purchase_price || randomAmount(0.5, 50);
      const totalCost = Math.round(actualQty * unitCost * 10000) / 10000;
      await conn.execute(
        `INSERT INTO bom_line (bom_id, line_no, parent_line_id, level, material_id, material_code, material_name, material_spec, unit, consumption_qty, loss_rate, actual_qty, unit_cost, total_cost, material_type, is_key_material, position_no, process_seq, process_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bomId,
          i + 1,
          null,
          1,
          bmId,
          mat.material_code,
          mat.material_name,
          mat.specification,
          mat.unit,
          consumptionQty,
          lossRate,
          actualQty,
          unitCost,
          totalCost,
          randomItem(materialTypes),
          randomItem([0, 1]),
          `P${pad(i + 1, 2)}`,
          i + 1,
          randomItem(processNames),
        ]
      );
    }
    stats.bom_line = 20;

    const deliveryIds: number[] = [];
    const logisticsCompanies = [ts('k_twsprc'), ts('k_x89sz2'), ts('k_tt5xlr'), ts('k_xhwleo'), ts('k_17z1aa7')];
    for (let i = 0; i < 20; i++) {
      const so = salesOrders[i % salesOrders.length];
      const [custRow] = await conn.execute('SELECT customer_name FROM crm_customer WHERE id = ?', [
        so.customer_id,
      ]);
      const custName = custRow[0]?.customer_name || `客户${i + 1}`;
      const wh = warehouses[i % warehouses.length];
      const totalQty = randomInt(100, 50000);
      const totalAmount = randomAmount(1000, 200000);
      const signStatus = randomItem([0, 1]);
      await conn.execute(
        `INSERT INTO sal_delivery (delivery_no, order_id, order_no, customer_id, customer_name, delivery_date, contact_name, contact_phone, delivery_address, warehouse_id, logistics_company, tracking_no, total_qty, total_amount, sign_status, sign_by, sign_time, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `DN-2026-${pad(i + 1, 5)}`,
          so.id,
          so.order_no,
          so.customer_id,
          custName,
          randomDate(yearStart, now),
          `联系人${i + 1}`,
          `0769-${randomInt(22000000, 22999999)}`,
          `广东省东莞市长安镇${randomItem([ts('k_1u92brv'), ts('k_1v7sdb1'), ts('k_p8l31i')])}${randomInt(1, 200)}号`,
          wh.id,
          randomItem(logisticsCompanies),
          `SF${randomInt(1000000000, 9999999999)}`,
          totalQty,
          totalAmount,
          signStatus,
          signStatus === 1 ? defaultUserId : null,
          signStatus === 1
            ? `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:00:00`
            : null,
          randomItem([1, 2, 3]),
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      deliveryIds.push(idRow[0].id);
    }
    stats.sal_delivery = 20;

    for (let i = 0; i < 20; i++) {
      const deliveryId = deliveryIds[i % deliveryIds.length];
      const mat = materials[i % materials.length];
      const quantity = randomInt(100, 50000);
      const unitPrice = mat.sale_price || randomAmount(0.5, 30);
      const amount = Math.round(quantity * unitPrice * 100) / 100;
      await conn.execute(
        `INSERT INTO sal_delivery_detail (delivery_id, line_no, material_id, material_name, material_spec, quantity, unit, unit_price, amount, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deliveryId,
          i + 1,
          mat.id,
          mat.material_name,
          mat.specification,
          quantity,
          mat.unit,
          unitPrice,
          amount,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.sal_delivery_detail = 20;

    const returnReasons = [
      ts('k_1egjmg7'),
      ts('k_a0ojs7'),
      ts('k_lw2kwa'),
      ts('k_12nxvim'),
      ts('k_144s06h'),
      ts('k_2ifpr9'),
      ts('k_emv08g'),
      ts('k_ll6coi'),
      ts('k_1cz4w8p'),
      ts('k_j10ogk'),
    ];
    const returnIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const so = salesOrders[i % salesOrders.length];
      const [custRow] = await conn.execute('SELECT customer_name FROM crm_customer WHERE id = ?', [
        so.customer_id,
      ]);
      const custName = custRow[0]?.customer_name || `客户${i + 1}`;
      const deliveryId = deliveryIds[i % deliveryIds.length];
      const totalAmount = randomAmount(500, 50000);
      const wh = warehouses[i % warehouses.length];
      await conn.execute(
        `INSERT INTO sal_return (return_no, status, order_id, order_no, customer_id, customer_name, warehouse_id, delivery_id, delivery_no, reason, return_date, total_amount, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `RT-2026-${pad(i + 1, 5)}`,
          randomItem([1, 2, 3]),
          so.id,
          so.order_no,
          so.customer_id,
          custName,
          wh.id,
          deliveryId,
          `DN-2026-${pad((i % deliveryIds.length) + 1, 5)}`,
          randomItem(returnReasons),
          randomDate(yearStart, now),
          totalAmount,
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      returnIds.push(idRow[0].id);
    }
    stats.sal_return = 20;

    for (let i = 0; i < 20; i++) {
      const returnId = returnIds[i % returnIds.length];
      const mat = materials[i % materials.length];
      const quantity = randomInt(10, 5000);
      const unitPrice = mat.sale_price || randomAmount(0.5, 30);
      const amount = Math.round(quantity * unitPrice * 100) / 100;
      await conn.execute(
        `INSERT INTO sal_return_detail (return_id, line_no, material_id, material_name, material_spec, unit, quantity, unit_price, amount, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          returnId,
          i + 1,
          mat.id,
          mat.material_name,
          mat.specification,
          mat.unit,
          quantity,
          unitPrice,
          amount,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.sal_return_detail = 20;

    const reconciliationIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const periodStart = randomDate(yearStart, now);
      const periodEnd = new Date(new Date(periodStart).getTime() + randomInt(28, 31) * 86400000)
        .toISOString()
        .slice(0, 10);
      const deliveryAmount = randomAmount(50000, 1000000);
      const returnAmount = randomAmount(0, deliveryAmount * 0.1);
      const discountAmount = randomAmount(0, deliveryAmount * 0.02);
      const netAmount = Math.round((deliveryAmount - returnAmount - discountAmount) * 100) / 100;
      const receivedAmount = randomAmount(0, netAmount);
      const balanceAmount = Math.round((netAmount - receivedAmount) * 100) / 100;
      await conn.execute(
        `INSERT INTO sal_reconciliation (reconciliation_no, customer_id, customer_name, period_start, period_end, delivery_amount, return_amount, discount_amount, net_amount, received_amount, balance_amount, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `RC-2026-${pad(i + 1, 5)}`,
          cust.id,
          cust.customer_name,
          periodStart,
          periodEnd,
          deliveryAmount,
          returnAmount,
          discountAmount,
          netAmount,
          receivedAmount,
          balanceAmount,
          randomItem([1, 2, 3, 4]),
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      reconciliationIds.push(idRow[0].id);
    }
    stats.sal_reconciliation = 20;

    for (let i = 0; i < 20; i++) {
      const rcId = reconciliationIds[i % reconciliationIds.length];
      const so = salesOrders[i % salesOrders.length];
      const sourceType = randomItem([1, 2]);
      const sourceNo =
        sourceType === 1 ? `DN-2026-${pad((i % 20) + 1, 5)}` : `RT-2026-${pad((i % 20) + 1, 5)}`;
      const amount = randomAmount(1000, 100000);
      await conn.execute(
        `INSERT INTO sal_reconciliation_line (reconciliation_id, source_type, source_id, source_no, source_date, amount) VALUES (?, ?, ?, ?, ?, ?)`,
        [rcId, sourceType, so.id, sourceNo, randomDate(yearStart, now), amount]
      );
    }
    stats.sal_reconciliation_line = 20;

    const materialReturnIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const wo = workOrders[i % workOrders.length];
      const wh = warehouses[i % warehouses.length];
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO prd_material_return (return_no, work_order_id, work_order_no, warehouse_id, return_date, status, operator_id, operator_name, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `MR-2026-${pad(i + 1, 5)}`,
          wo.id,
          wo.work_order_no,
          wh.id,
          randomDate(yearStart, now),
          randomItem([1, 2, 3]),
          user.id,
          user.real_name,
          `生产退料-${wo.work_order_no}`,
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      materialReturnIds.push(idRow[0].id);
    }
    stats.prd_material_return = 20;

    for (let i = 0; i < 20; i++) {
      const returnId = materialReturnIds[i % materialReturnIds.length];
      const mat = materials[i % materials.length];
      await conn.execute(
        `INSERT INTO prd_material_return_item (return_id, material_id, material_code, material_name, return_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          returnId,
          mat.id,
          mat.material_code,
          mat.material_name,
          randomInt(1, 500),
          mat.unit,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.prd_material_return_item = 20;

    for (let i = 0; i < 20; i++) {
      const eq = equipment[i % equipment.length];
      const user = users[i % users.length];
      const startTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 12)).padStart(2, '0')}:00:00`;
      const endTime = `${new Date(new Date(startTime).getTime() + randomInt(1, 8) * 3600000).toISOString().slice(0, 19).replace('T', ' ')}`;
      const downtimeHours = randomAmount(0.5, 8);
      await conn.execute(
        `INSERT INTO eqp_maintenance_record (record_no, plan_id, equipment_id, maintenance_type, fault_desc, maintenance_content, start_time, end_time, downtime_hours, cost, responsible_id, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `EMR-2026-${pad(i + 1, 5)}`,
          null,
          eq.id,
          randomItem([1, 2, 3, 4, 5]),
          `${eq.equipment_name}定期保养检查`,
          ts('k_wf1kcy'),
          startTime,
          endTime,
          downtimeHours,
          randomAmount(200, 5000),
          user.id,
          randomItem([1, 1, 2]),
        ]
      );
    }
    stats.eqp_maintenance_record = 20;

    const faultDescs = [
      ts('k_o3qjal'),
      ts('k_1nk69fa'),
      ts('k_1nzscvd'),
      ts('k_1lvlv2o'),
      ts('k_11bkbht'),
      ts('k_e9zfvh'),
      ts('k_5tfiug'),
      ts('k_p3d9m9'),
      ts('k_1i6oi8r'),
      ts('k_wuhhy2'),
    ];
    for (let i = 0; i < 20; i++) {
      const eq = equipment[i % equipment.length];
      const repairCost = randomAmount(200, 15000);
      const repairStartTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 14)).padStart(2, '0')}:00:00`;
      const repairEndTime = `${new Date(new Date(repairStartTime).getTime() + randomInt(2, 48) * 3600000).toISOString().slice(0, 19).replace('T', ' ')}`;
      await conn.execute(
        `INSERT INTO eqp_repair (repair_no, equipment_id, equipment_code, equipment_name, fault_date, fault_desc, repair_type, repair_person, repair_start_time, repair_end_time, repair_cost, repair_result, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ERP-2026-${pad(i + 1, 5)}`,
          eq.id,
          eq.equipment_code,
          eq.equipment_name,
          randomDate(yearStart, now),
          randomItem(faultDescs),
          randomItem([1, 2]),
          randomItem([ts('k_dfpu9c'), ts('k_4i4ny2'), ts('k_cwpqhl'), ts('k_y0ajlb'), ts('k_vrzjo6')]),
          repairStartTime,
          repairEndTime,
          repairCost,
          ts('k_18n6iz6'),
          randomItem([1, 2]),
          defaultUserId,
        ]
      );
    }
    stats.eqp_repair = 20;

    const calibrationOrgs = [
      ts('k_c04lsi'),
      ts('k_enx5xr'),
      ts('k_4cxeyt'),
      ts('k_d7rffw'),
      ts('k_1d2vtww'),
    ];
    for (let i = 0; i < 20; i++) {
      const eq = equipment[i % equipment.length];
      const cDate = randomDate(yearStart, now);
      const nextCDate = new Date(new Date(cDate).getTime() + randomInt(90, 365) * 86400000)
        .toISOString()
        .slice(0, 10);
      await conn.execute(
        `INSERT INTO eqp_calibration (calibration_no, equipment_id, equipment_code, equipment_name, calibration_date, next_calibration_date, calibration_org, calibration_result, certificate_no, calibration_cost, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ECR-2026-${pad(i + 1, 5)}`,
          eq.id,
          eq.equipment_code,
          eq.equipment_name,
          cDate,
          nextCDate,
          randomItem(calibrationOrgs),
          randomItem([1, 1, 1, 2]),
          `CERT-2026-${pad(i + 1, 5)}`,
          randomAmount(500, 3000),
          randomItem([1, 2]),
          defaultUserId,
        ]
      );
    }
    stats.eqp_calibration = 20;

    const scrapReasons = [
      ts('k_1ajgjs'),
      ts('k_5cyhzy'),
      ts('k_n3xqlm'),
      ts('k_op2nhp'),
      ts('k_q95rmb'),
    ];
    for (let i = 0; i < 20; i++) {
      const eq = equipment[i % equipment.length];
      const originalValue = randomAmount(50000, 500000);
      const netValue = randomAmount(0, originalValue * 0.1);
      await conn.execute(
        `INSERT INTO eqp_scrap (scrap_no, equipment_id, equipment_code, equipment_name, scrap_date, scrap_reason, original_value, net_value, approval_person, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ESR-2026-${pad(i + 1, 5)}`,
          eq.id,
          eq.equipment_code,
          eq.equipment_name,
          randomDate(yearStart, now),
          randomItem(scrapReasons),
          originalValue,
          netValue,
          defaultUserName,
          randomItem([1, 2]),
          defaultUserId,
        ]
      );
    }
    stats.eqp_scrap = 20;

    const transferIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const fromWh = warehouses[i % warehouses.length];
      const toWh = warehouses[(i + 1) % warehouses.length];
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO inv_transfer_order (transfer_no, from_warehouse_id, to_warehouse_id, transfer_date, transfer_type, status, operator_id, operator_name, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `TRF-2026-${pad(i + 1, 5)}`,
          fromWh.id,
          toWh.id,
          randomDate(yearStart, now),
          randomItem([1, 2]),
          randomItem([1, 2, 3]),
          user.id,
          user.real_name,
          ts('k_1pio315'),
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      transferIds.push(idRow[0].id);
    }
    stats.inv_transfer_order = 20;

    for (let i = 0; i < 20; i++) {
      const transferId = transferIds[i % transferIds.length];
      const mat = materials[i % materials.length];
      await conn.execute(
        `INSERT INTO inv_transfer_item (transfer_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          transferId,
          mat.id,
          mat.material_code,
          mat.material_name,
          randomInt(10, 5000),
          mat.unit,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.inv_transfer_item = 20;

    const stocktakingIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const wh = warehouses[i % warehouses.length];
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO inv_stocktaking (taking_no, warehouse_id, taking_date, taking_type, status, operator_id, operator_name, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `STK-2026-${pad(i + 1, 5)}`,
          wh.id,
          randomDate(yearStart, now),
          randomItem([1, 2, 3]),
          randomItem([1, 2, 3]),
          user.id,
          user.real_name,
          ts('k_5wpbul'),
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      stocktakingIds.push(idRow[0].id);
    }
    stats.inv_stocktaking = 20;

    for (let i = 0; i < 20; i++) {
      const stkId = stocktakingIds[i % stocktakingIds.length];
      const mat = materials[i % materials.length];
      const systemQty = randomInt(100, 50000);
      const diff = randomInt(-500, 500);
      const actualQty = systemQty + diff;
      await conn.execute(
        `INSERT INTO inv_stocktaking_item (taking_id, material_id, material_code, material_name, system_qty, actual_qty, diff_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          stkId,
          mat.id,
          mat.material_code,
          mat.material_name,
          systemQty,
          actualQty,
          diff,
          mat.unit,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.inv_stocktaking_item = 20;

    const adjustIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const wh = warehouses[i % warehouses.length];
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO inv_stock_adjust (adjust_no, warehouse_id, adjust_date, adjust_type, status, operator_id, operator_name, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ADJ-2026-${pad(i + 1, 5)}`,
          wh.id,
          randomDate(yearStart, now),
          randomItem([1, 2, 3]),
          randomItem([1, 2]),
          user.id,
          user.real_name,
          ts('k_1f9yccl'),
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      adjustIds.push(idRow[0].id);
    }
    stats.inv_stock_adjust = 20;

    for (let i = 0; i < 20; i++) {
      const adjustId = adjustIds[i % adjustIds.length];
      const mat = materials[i % materials.length];
      const beforeQty = randomInt(100, 50000);
      const adjustQty = randomInt(-500, 500);
      const afterQty = beforeQty + adjustQty;
      await conn.execute(
        `INSERT INTO inv_stock_adjust_item (adjust_id, material_id, material_code, material_name, before_qty, adjust_qty, after_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          adjustId,
          mat.id,
          mat.material_code,
          mat.material_name,
          beforeQty,
          adjustQty,
          afterQty,
          mat.unit,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.inv_stock_adjust_item = 20;

    const outboundIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const so = salesOrders[i % salesOrders.length];
      const [custRow] = await conn.execute('SELECT customer_name FROM crm_customer WHERE id = ?', [
        so.customer_id,
      ]);
      const custName = custRow[0]?.customer_name || `客户${i + 1}`;
      const wh = warehouses[i % warehouses.length];
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO inv_sales_outbound (outbound_no, order_id, order_no, customer_id, customer_name, warehouse_id, outbound_date, delivery_person, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `SOB-2026-${pad(i + 1, 5)}`,
          so.id,
          so.order_no,
          so.customer_id,
          custName,
          wh.id,
          randomDate(yearStart, now),
          user.real_name,
          randomItem([1, 2, 3]),
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      outboundIds.push(idRow[0].id);
    }
    stats.inv_sales_outbound = 20;

    for (let i = 0; i < 20; i++) {
      const outboundId = outboundIds[i % outboundIds.length];
      const mat = materials[i % materials.length];
      await conn.execute(
        `INSERT INTO inv_sales_outbound_item (outbound_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          outboundId,
          mat.id,
          mat.material_code,
          mat.material_name,
          randomInt(100, 50000),
          mat.unit,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.inv_sales_outbound_item = 20;

    const poIds: number[] = [];
    const paymentTermsList = [ts('k_isj9pm'), ts('k_g2lx0p'), ts('k_yyuqrw'), ts('k_16x2l80'), ts('k_c7em3r')];
    for (let i = 0; i < 20; i++) {
      const sup = suppliers[i % suppliers.length];
      const orderDate = randomDate(yearStart, now);
      const deliveryDate = new Date(new Date(orderDate).getTime() + randomInt(7, 30) * 86400000)
        .toISOString()
        .slice(0, 10);
      const totalAmount = randomAmount(5000, 500000);
      const totalQuantity = randomInt(100, 50000);
      const taxRate = 13.0;
      const taxAmount = Math.round(((totalAmount * taxRate) / 100) * 100) / 100;
      const grandTotal = Math.round((totalAmount + taxAmount) * 100) / 100;
      await conn.execute(
        `INSERT INTO pur_purchase_order (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, currency, total_amount, total_quantity, tax_rate, tax_amount, grand_total, status, payment_terms, contact_person, contact_phone, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `PO-2026-${pad(i + 1, 5)}`,
          sup.id,
          sup.supplier_name,
          sup.supplier_code,
          orderDate,
          deliveryDate,
          'CNY',
          totalAmount,
          totalQuantity,
          taxRate,
          taxAmount,
          grandTotal,
          randomItem([10, 20, 30, 40]),
          randomItem(paymentTermsList),
          `联系人${i + 1}`,
          `0769-${randomInt(22000000, 22999999)}`,
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      poIds.push(idRow[0].id);
    }
    stats.pur_purchase_order = 20;

    for (let i = 0; i < 20; i++) {
      const poId = poIds[i % poIds.length];
      const mat = materials[i % materials.length];
      const orderQty = randomInt(100, 20000);
      const receivedQty = randomInt(0, orderQty);
      const unitPrice = mat.purchase_price || randomAmount(0.5, 50);
      const amount = Math.round(orderQty * unitPrice * 100) / 100;
      const taxRate = 13.0;
      const taxAmount = Math.round(((amount * taxRate) / 100) * 100) / 100;
      const lineTotal = Math.round((amount + taxAmount) * 100) / 100;
      const requireDate = randomDate(now, yearEnd);
      await conn.execute(
        `INSERT INTO pur_purchase_order_line (po_id, line_no, material_id, material_code, material_name, material_spec, unit, order_qty, received_qty, unit_price, amount, tax_rate, tax_amount, line_total, require_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          poId,
          i + 1,
          mat.id,
          mat.material_code,
          mat.material_name,
          mat.specification,
          mat.unit,
          orderQty,
          receivedQty,
          unitPrice,
          amount,
          taxRate,
          taxAmount,
          lineTotal,
          requireDate,
        ]
      );
    }
    stats.pur_purchase_order_line = 20;

    const requestIds: number[] = [];
    const requestDepts = [ts('k_18glq49'), ts('k_11g5fpo'), ts('k_boxyuc'), ts('k_10hgjfm'), ts('k_1rgc4zf')];
    for (let i = 0; i < 20; i++) {
      const sup = suppliers[i % suppliers.length];
      const totalAmount = randomAmount(1000, 200000);
      const user = users[i % users.length];
      const requestDate = randomDate(yearStart, now);
      const expectedDate = new Date(new Date(requestDate).getTime() + randomInt(7, 30) * 86400000)
        .toISOString()
        .slice(0, 10);
      await conn.execute(
        `INSERT INTO pur_request (request_no, request_date, request_type, request_dept, requester_name, total_amount, currency, status, priority, expected_date, supplier_name, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `PR-2026-${pad(i + 1, 5)}`,
          requestDate,
          randomItem(['material', 'equipment', 'supply']),
          randomItem(requestDepts),
          user.real_name,
          totalAmount,
          'CNY',
          randomItem([0, 1, 2, 3, 4]),
          randomItem([1, 2, 3, 4]),
          expectedDate,
          sup.supplier_name,
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      requestIds.push(idRow[0].id);
    }
    stats.pur_request = 20;

    for (let i = 0; i < 20; i++) {
      const reqId = requestIds[i % requestIds.length];
      const mat = materials[i % materials.length];
      const sup = suppliers[i % suppliers.length];
      const quantity = randomInt(50, 10000);
      const price = mat.purchase_price || randomAmount(0.5, 50);
      const amount = Math.round(quantity * price * 100) / 100;
      const expectedDate = randomDate(now, yearEnd);
      await conn.execute(
        `INSERT INTO pur_request_item (request_id, line_no, material_code, material_name, material_spec, material_unit, quantity, price, amount, supplier_name, expected_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reqId,
          i + 1,
          mat.material_code,
          mat.material_name,
          mat.specification,
          mat.unit,
          quantity,
          price,
          amount,
          sup.supplier_name,
          expectedDate,
        ]
      );
    }
    stats.pur_request_item = 20;

    const inspectionIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const wo = workOrders[i % workOrders.length];
      const pIdx = i % productIds.length;
      const inspectionQty = randomInt(500, 50000);
      const unqualifiedQty = randomInt(0, Math.round(inspectionQty * 0.05));
      const qualifiedQty = inspectionQty - unqualifiedQty;
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO qc_final_inspection (inspection_no, inspection_date, work_order_id, work_order_no, product_id, product_code, product_name, batch_no, inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector_name, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `QFI-2026-${pad(i + 1, 5)}`,
          randomDate(yearStart, now),
          wo.id,
          wo.work_order_no,
          productIds[pIdx],
          `PRD-${pad(pIdx + 1, 5)}`,
          productNames[pIdx],
          `B2026${pad(i + 1, 4)}`,
          inspectionQty,
          qualifiedQty,
          unqualifiedQty,
          randomItem([1, 1, 2, 3]),
          user.real_name,
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      inspectionIds.push(idRow[0].id);
    }
    stats.qc_final_inspection = 20;

    const defectTypes = [
      ts('k_1f857zp'),
      ts('k_bnrquk'),
      ts('k_zzinqk'),
      ts('k_uc4c46'),
      ts('k_n7qsva'),
      ts('k_nr7ega'),
      ts('k_bt382e'),
      ts('k_1n9i6r5'),
      ts('k_45n7tf'),
      ts('k_dzq7ii'),
    ];
    for (let i = 0; i < 20; i++) {
      const inspId = inspectionIds[i % inspectionIds.length];
      const mat = materials[i % materials.length];
      const quantity = randomInt(10, 2000);
      const handleDate = randomDate(yearStart, now);
      await conn.execute(
        `INSERT INTO qc_unqualified (unqualified_no, inspection_id, source_type, source_no, material_id, material_name, quantity, defect_type, defect_desc, handle_type, handle_result, handler, handle_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `UQ-2026-${pad(i + 1, 5)}`,
          inspId,
          'final_inspection',
          `QFI-2026-${pad((i % inspectionIds.length) + 1, 5)}`,
          mat.id,
          mat.material_name,
          quantity,
          randomItem(defectTypes),
          `${mat.material_name}出现${randomItem(defectTypes)}缺陷`,
          randomItem([1, 2, 3]),
          randomItem([1, 2]),
          randomItem([ts('k_x2wm7j'), ts('k_hurroh'), ts('k_ad8acy'), ts('k_1r0ff3k')]),
          handleDate,
        ]
      );
    }
    stats.qc_unqualified = 20;

    for (let i = 0; i < 20; i++) {
      const inspId = inspectionIds[i % inspectionIds.length];
      const mat = materials[i % materials.length];
      const unqualifiedQty = randomInt(10, 1000);
      const costAmount = randomAmount(100, 10000);
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO qc_unqualified (handle_no, inspection_id, material_id, material_code, material_name, quantity, handle_type, handle_status, responsible_dept, responsible_person, handle_result, cost_amount, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `UQH-2026-${pad(i + 1, 5)}`,
          inspId,
          mat.id,
          mat.material_code,
          mat.material_name,
          unqualifiedQty,
          randomItem([1, 2, 3]),
          randomItem([1, 2]),
          randomItem(requestDepts),
          user.real_name,
          `对${mat.material_name}不合格品进行处理`,
          costAmount,
          defaultUserId,
        ]
      );
    }
    stats.qc_unqualified = 20;

    const complaintTypes = ['quality', 'delivery', 'service'];
    const complaintLevels = ['serious', 'major', 'minor'];
    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const so = salesOrders[i % salesOrders.length];
      const pIdx = i % productIds.length;
      const defectQty = randomInt(10, 2000);
      const totalQty = randomInt(defectQty, 50000);
      const defectRate = Math.round((defectQty / totalQty) * 10000) / 100;
      const user = users[i % users.length];
      const reportTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`;
      const status = randomItem([1, 2, 3, 4]);
      const closeTime =
        status === 4
          ? `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`
          : null;
      await conn.execute(
        `INSERT INTO qms_complaint (complaint_no, customer_id, customer_name, order_no, product_code, product_name, complaint_type, complaint_level, defect_desc, defect_qty, total_qty, defect_rate, reporter, report_time, handler, contain_action, root_cause, corrective_action, preventive_action, verify_result, verifier, verify_time, status, close_time, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `CP-2026-${pad(i + 1, 5)}`,
          cust.id,
          cust.customer_name,
          so.order_no,
          `PRD-${pad(pIdx + 1, 5)}`,
          productNames[pIdx],
          randomItem(complaintTypes),
          randomItem(complaintLevels),
          `${productNames[pIdx]}出现${randomItem(defectTypes)}问题`,
          defectQty,
          totalQty,
          defectRate,
          user.real_name,
          reportTime,
          randomItem([ts('k_13lyufz'), ts('k_1m2czfb'), ts('k_3md17r')]),
          ts('k_uqfmiq'),
          randomItem([ts('k_hrikbj'), ts('k_1hga3x'), ts('k_1n011xl'), ts('k_cdps06')]),
          ts('k_mg9d1n'),
          ts('k_14crwu'),
          randomItem([ts('k_kgwvlw'), ts('k_pr0cpo')]),
          defaultUserName,
          reportTime,
          status,
          closeTime,
          defaultUserId,
        ]
      );
    }
    stats.qms_complaint = 20;

    const testTypes = ['adhesion', 'abrasion', 'color', 'viscosity', 'thickness'];
    const sampleSources = ['production', 'incoming', 'customer'];
    for (let i = 0; i < 20; i++) {
      const pIdx = i % productIds.length;
      const user = users[i % users.length];
      const reviewer = users[(i + 1) % users.length];
      const testTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`;
      const reviewTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`;
      await conn.execute(
        `INSERT INTO qms_lab_test (test_no, test_type, product_id, product_code, product_name, batch_no, sample_source, test_items, test_result, overall_result, tester, test_time, reviewer, review_time, equipment_used, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `LT-2026-${pad(i + 1, 5)}`,
          randomItem(testTypes),
          productIds[pIdx],
          `PRD-${pad(pIdx + 1, 5)}`,
          productNames[pIdx],
          `B2026${pad(i + 1, 4)}`,
          randomItem(sampleSources),
          randomItem([
            ts('k_1rujdfd'),
            ts('k_1bptjtd'),
            ts('k_1egu5k1'),
            ts('k_1c5x1hj'),
            ts('k_1w6v268'),
          ]),
          randomItem([ts('k_109sg5t'), ts('k_109sg5t'), ts('k_109sg5t'), ts('k_1ujsxic')]),
          randomItem(['qualified', 'qualified', 'unqualified']),
          user.real_name,
          testTime,
          reviewer.real_name,
          reviewTime,
          randomItem([ts('k_125e0x1'), ts('k_5gz273'), ts('k_11iyglt'), ts('k_16im9o6'), ts('k_1k05lua')]),
          defaultUserId,
        ]
      );
    }
    stats.qms_lab_test = 20;

    const auditTypes = ['initial', 'routine', 'followup', 'special'];
    for (let i = 0; i < 20; i++) {
      const sup = suppliers[i % suppliers.length];
      const user = users[i % users.length];
      const totalScore = randomAmount(60, 98);
      const deadline = new Date(
        new Date(randomDate(yearStart, now)).getTime() + randomInt(14, 60) * 86400000
      )
        .toISOString()
        .slice(0, 10);
      await conn.execute(
        `INSERT INTO qms_supplier_audit (audit_no, supplier_id, supplier_name, audit_type, audit_scope, audit_date, auditor, audit_items, audit_scores, total_score, conclusion, nonconformities, corrective_request, deadline, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `SA-2026-${pad(i + 1, 5)}`,
          sup.id,
          sup.supplier_name,
          randomItem(auditTypes),
          randomItem([ts('k_9696gl'), ts('k_5ne8rs'), ts('k_zfw9rx'), ts('k_1c5xrt6')]),
          randomDate(yearStart, now),
          user.real_name,
          ts('k_xmbufi'),
          `体系${randomInt(15, 25)}/过程${randomInt(15, 25)}/检验${randomInt(15, 25)}/交付${randomInt(15, 25)}`,
          totalScore,
          randomItem(['qualified', 'conditional', 'unqualified']),
          randomItem([tc('none'), ts('k_1cixpc0'), ts('k_12cqfpp'), ts('k_h024gg')]),
          randomItem([ts('k_hlbu8s'), ts('k_1r4ysg4'), ts('k_b1x868')]),
          deadline,
          randomItem([1, 2]),
          defaultUserId,
        ]
      );
    }
    stats.qms_supplier_audit = 20;

    const qrTypes = ['material', 'product', 'package'];
    for (let i = 0; i < 20; i++) {
      const mat = materials[i % materials.length];
      const wh = warehouses[i % warehouses.length];
      const sup = suppliers[i % suppliers.length];
      const cust = customers[i % customers.length];
      const wo = workOrders[i % workOrders.length];
      const pIdx = i % productIds.length;
      await conn.execute(
        `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, batch_no, material_id, material_code, material_name, specification, quantity, unit, warehouse_id, warehouse_name, supplier_id, supplier_name, customer_id, customer_name, work_order_id, work_order_no, production_date, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `QR-${pad(i + 1, 6)}`,
          randomItem(qrTypes),
          productIds[pIdx],
          `PRD-${pad(pIdx + 1, 5)}`,
          `B2026${pad(i + 1, 4)}`,
          mat.id,
          mat.material_code,
          mat.material_name,
          mat.specification,
          randomInt(100, 50000),
          mat.unit,
          wh.id,
          wh.warehouse_name,
          sup.id,
          sup.supplier_name,
          cust.id,
          cust.customer_name,
          wo.id,
          wo.work_order_no,
          randomDate(yearStart, now),
          1,
          defaultUserId,
        ]
      );
    }
    stats.qrcode_record = 20;

    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const so = salesOrders[i % salesOrders.length];
      const amount = randomAmount(5000, 500000);
      const receivedAmount = randomAmount(0, amount);
      const balance = Math.round((amount - receivedAmount) * 100) / 100;
      const dueDate = new Date(now.getTime() + randomInt(-60, 90) * 86400000)
        .toISOString()
        .slice(0, 10);
      const status = balance === 0 ? 3 : new Date(dueDate) < now ? 2 : 1;
      await conn.execute(
        `INSERT INTO fin_receivable (receivable_no, source_type, source_no, customer_id, amount, received_amount, balance, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AR-2026-${pad(i + 1, 5)}`,
          1,
          so.order_no,
          cust.id,
          amount,
          receivedAmount,
          balance,
          dueDate,
          status,
        ]
      );
    }
    stats.fin_receivable = 20;

    const costTypes = ['material', 'labor', 'overhead', 'equipment'];
    const sourceTypes = ['work_order', 'purchase', 'maintenance'];
    const departments = [ts('k_18glq49'), ts('k_11g5fpo'), ts('k_boxyuc'), ts('k_10hgjfm'), ts('k_1rgc4zf'), ts('k_x7q7u4')];
    for (let i = 0; i < 20; i++) {
      const wo = workOrders[i % workOrders.length];
      const costType = randomItem(costTypes);
      const sourceType = randomItem(sourceTypes);
      const amount = randomAmount(500, 100000);
      await conn.execute(
        `INSERT INTO fin_cost_record (cost_no, cost_type, source_type, source_no, source_id, department, amount, cost_date, description, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `CR-2026-${pad(i + 1, 5)}`,
          costType,
          sourceType,
          wo.work_order_no,
          wo.id,
          randomItem(departments),
          amount,
          randomDate(yearStart, now),
          `${costType}成本-${wo.work_order_no}`,
          1,
          defaultUserId,
        ]
      );
    }
    stats.fin_cost_record = 20;

    const trainingNames = [
      ts('k_s5ga0n'),
      ts('k_1pp7uk4'),
      ts('k_1fcgbqb'),
      ts('k_1likwi3'),
      ts('k_pfrs5'),
      ts('k_1r1sy5o'),
      ts('k_1iiwgqg'),
      ts('k_1yl3fx5'),
      ts('k_11x5qqb'),
      ts('k_1wfjz28'),
      ts('k_7jui57'),
      ts('k_15a2qm'),
      ts('k_6869aa'),
      ts('k_178h7fp'),
      ts('k_x2kbrv'),
      ts('k_1w04r5d'),
      ts('k_a8hkey'),
      ts('k_p54fuq'),
      ts('k_rfufi7'),
      ts('k_1rv134q'),
    ];
    const trainers = [ts('k_3vr19c'), ts('k_9nfhqc'), ts('k_nqtivk'), ts('k_1gmpisl'), ts('k_qkv38u'), ts('k_vy0n74'), ts('k_1sq1uu9')];
    const trainingPlaces = [
      ts('k_18duo5k'),
      ts('k_197th8h'),
      ts('k_13m5q49'),
      ts('k_1qap342'),
      ts('k_1q0phf3'),
      ts('k_x8m0o6'),
    ];
    const trainingIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      await conn.execute(
        `INSERT INTO hr_training (training_no, training_name, training_type, training_date, training_hours, trainer, training_content, training_place, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `TRN-2026-${pad(i + 1, 5)}`,
          trainingNames[i],
          randomItem([1, 2, 3, 4]),
          randomDate(yearStart, now),
          randomItem([2, 4, 6, 8, 16, 24]),
          randomItem(trainers),
          `${trainingNames[i]}内容，涵盖理论讲解和实操演练`,
          randomItem(trainingPlaces),
          1,
          defaultUserId,
        ]
      );
      const [idRow] = await conn.execute('SELECT LAST_INSERT_ID() as id');
      trainingIds.push(idRow[0].id);
    }
    stats.hr_training = 20;

    for (let i = 0; i < 20; i++) {
      const trainingId = trainingIds[i % trainingIds.length];
      const user = users[i % users.length];
      const score = randomInt(60, 100);
      await conn.execute(
        `INSERT INTO hr_training_participant (training_id, employee_id, employee_name, score, is_qualified) VALUES (?, ?, ?, ?, ?)`,
        [trainingId, user.id, user.real_name, score, score >= 60 ? 1 : 0]
      );
    }
    stats.hr_training_participant = 20;

    await conn.execute('SET FOREIGN_KEY_CHECKS=1');

    return stats;
  });

  return successResponse(result, ts('k_157xqrj'));
});
