import { getTranslations } from 'next-intl/server';

import type { DbConnection, DbRow } from '@/types/db';

export async function seedMasterData(
  conn: DbConnection,
  stats: Record<string, number>
): Promise<Record<string, unknown>[]> {
  const ts = await getTranslations('Common');
  const warehouses = [
    { code: 'WH001', name: ts('k_tkxvoe'), type: 1, address: ts('k_1aa8fj4') },
    { code: 'WH002', name: ts('k_llwvwj'), type: 2, address: ts('k_1arndl7') },
    { code: 'WH003', name: ts('k_93mh3v'), type: 3, address: ts('k_qmqjdz') },
    { code: 'WH004', name: ts('k_dw90w7'), type: 4, address: ts('k_1bbjfh6') },
  ];
  for (const wh of warehouses) {
    await conn.execute(
      `INSERT INTO inv_warehouse (warehouse_code, warehouse_name, warehouse_type, address, status) VALUES (?, ?, ?, ?, 1)`,
      [wh.code, wh.name, wh.type, wh.address]
    );
  }
  stats.warehouses = warehouses.length;

  const suppliers = [
    {
      code: 'SUP001',
      name: ts('k_12u5d5'),
      type: 1,
      contact: ts('k_yi1f90'),
      phone: '0769-22223333',
      settlement: ts('k_isj9pm'),
    },
    {
      code: 'SUP002',
      name: ts('k_165xuza'),
      type: 2,
      contact: ts('k_nxfiar'),
      phone: '0755-88889999',
      settlement: ts('k_g2lx0p'),
    },
    {
      code: 'SUP003',
      name: ts('k_2h9m6'),
      type: 1,
      contact: ts('k_100yj6q'),
      phone: '020-33334444',
      settlement: ts('k_16x2l80'),
    },
    {
      code: 'SUP004',
      name: ts('k_tmtxw2'),
      type: 1,
      contact: ts('k_vrzjo6'),
      phone: '0571-66667777',
      settlement: ts('k_k83jsa'),
    },
    {
      code: 'SUP005',
      name: ts('k_wrmtv9'),
      type: 2,
      contact: ts('k_jof3bq'),
      phone: '021-11112222',
      settlement: ts('k_isj9pm'),
    },
  ];
  for (const s of suppliers) {
    await conn.execute(
      `INSERT INTO pur_supplier (supplier_code, supplier_name, supplier_type, contact_name, contact_phone, payment_terms, status) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [s.code, s.name, s.type, s.contact, s.phone, s.settlement]
    );
  }
  stats.suppliers = suppliers.length;

  const customers = [
    {
      code: 'CUS001',
      name: ts('k_gx8egb'),
      type: 1,
      contact: ts('k_1qztjm0'),
      phone: '0757-88880001',
      industry: ts('k_ym4c50'),
    },
    {
      code: 'CUS002',
      name: ts('k_1xr1xyd'),
      type: 1,
      contact: ts('k_13ux5kt'),
      phone: '0756-88880002',
      industry: ts('k_ym4c50'),
    },
    {
      code: 'CUS003',
      name: ts('k_1a4dctg'),
      type: 1,
      contact: ts('k_d0rrro'),
      phone: '0755-88880003',
      industry: ts('k_1pmedts'),
    },
    {
      code: 'CUS004',
      name: ts('k_ie3k75'),
      type: 1,
      contact: ts('k_tmo3dp'),
      phone: '0755-88880004',
      industry: ts('k_10z71bm'),
    },
    {
      code: 'CUS005',
      name: ts('k_bxab2d'),
      type: 1,
      contact: ts('k_151y9ca'),
      phone: '0755-88880005',
      industry: ts('k_w8c8c7'),
    },
    {
      code: 'CUS006',
      name: ts('k_1ycsj6e'),
      type: 1,
      contact: ts('k_auwya3'),
      phone: '010-88880006',
      industry: ts('k_1pmedts'),
    },
    {
      code: 'CUS007',
      name: ts('k_14c5x1i'),
      type: 1,
      contact: ts('k_1tkj25g'),
      phone: '0532-88880007',
      industry: ts('k_ym4c50'),
    },
    {
      code: 'CUS008',
      name: ts('k_z6l3vn'),
      type: 1,
      contact: ts('k_19lzkm7'),
      phone: '0755-88880008',
      industry: ts('k_1pmedts'),
    },
    {
      code: 'CUS009',
      name: ts('k_1pza3xe'),
      type: 1,
      contact: ts('k_v31en3'),
      phone: '0593-88880009',
      industry: ts('k_10z71bm'),
    },
    {
      code: 'CUS010',
      name: ts('k_2hg0zk'),
      type: 1,
      contact: ts('k_12otfds'),
      phone: '010-88880010',
      industry: ts('k_1pmedts'),
    },
  ];
  for (const c of customers) {
    await conn.execute(
      `INSERT INTO crm_customer (customer_code, customer_name, customer_type, contact_name, contact_phone, industry, status) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [c.code, c.name, c.type, c.contact, c.phone, c.industry]
    );
  }
  stats.customers = customers.length;

  const materials = [
    {
      code: 'MAT001',
      name: ts('k_1rrfno4'),
      spec: '1000×1200mm',
      type: 1,
      unit: ts('k_accfpb'),
      cat: 1,
      pp: 8.5,
      sp: 12.0,
    },
    {
      code: 'MAT002',
      name: ts('k_t6u8hv'),
      spec: '1000×1200mm',
      type: 1,
      unit: ts('k_accfpb'),
      cat: 1,
      pp: 12.0,
      sp: 18.0,
    },
    {
      code: 'MAT003',
      name: ts('k_st8b1b'),
      spec: '920×1100mm',
      type: 1,
      unit: ts('k_accfpb'),
      cat: 1,
      pp: 6.5,
      sp: 10.0,
    },
    {
      code: 'MAT004',
      name: ts('k_17ac3e5'),
      spec: '600mm×200m',
      type: 1,
      unit: ts('k_1v8rak6'),
      cat: 1,
      pp: 85.0,
      sp: 120.0,
    },
    {
      code: 'MAT005',
      name: ts('k_mzhdu8'),
      spec: '600mm×200m',
      type: 1,
      unit: ts('k_1v8rak6'),
      cat: 1,
      pp: 65.0,
      sp: 95.0,
    },
    {
      code: 'MAT006',
      name: ts('k_133reaf'),
      spec: ts('k_19sj1tx'),
      type: 4,
      unit: 'kg',
      cat: 2,
      pp: 85.0,
      sp: 120.0,
    },
    {
      code: 'MAT007',
      name: ts('k_l9kfgb'),
      spec: ts('k_8br3sf'),
      type: 4,
      unit: 'kg',
      cat: 2,
      pp: 95.0,
      sp: 135.0,
    },
    {
      code: 'MAT008',
      name: ts('k_sonvqu'),
      spec: 'AG-500',
      type: 4,
      unit: 'kg',
      cat: 2,
      pp: 850.0,
      sp: 1200.0,
    },
    {
      code: 'MAT009',
      name: ts('k_1xbkp60'),
      spec: ts('k_1ikfdu9'),
      type: 4,
      unit: 'kg',
      cat: 2,
      pp: 120.0,
      sp: 168.0,
    },
    {
      code: 'MAT010',
      name: ts('k_1czvfki'),
      spec: 'SP-200',
      type: 4,
      unit: 'kg',
      cat: 2,
      pp: 180.0,
      sp: 250.0,
    },
    {
      code: 'MAT011',
      name: ts('k_1085ar9'),
      spec: '120×80mm',
      type: 3,
      unit: ts('k_accfpb'),
      cat: 4,
      pp: 0.8,
      sp: 2.5,
    },
    {
      code: 'MAT012',
      name: ts('k_1d31fut'),
      spec: '180×100mm',
      type: 3,
      unit: ts('k_accfpb'),
      cat: 4,
      pp: 1.2,
      sp: 3.8,
    },
    {
      code: 'MAT013',
      name: ts('k_1u8tdc0'),
      spec: '50×30mm',
      type: 3,
      unit: ts('k_accfpb'),
      cat: 4,
      pp: 0.15,
      sp: 0.45,
    },
    {
      code: 'MAT014',
      name: ts('k_hd09uq'),
      spec: '150×80mm',
      type: 3,
      unit: ts('k_accfpb'),
      cat: 4,
      pp: 2.5,
      sp: 5.5,
    },
    {
      code: 'MAT015',
      name: ts('k_e0f7iv'),
      spec: '200×150mm',
      type: 3,
      unit: ts('k_accfpb'),
      cat: 4,
      pp: 3.5,
      sp: 7.8,
    },
    {
      code: 'MAT016',
      name: ts('k_18cwdu4'),
      spec: '100×60mm',
      type: 3,
      unit: ts('k_accfpb'),
      cat: 4,
      pp: 0.45,
      sp: 1.35,
    },
    {
      code: 'MAT017',
      name: ts('k_kbbj1u'),
      spec: '40×20mm',
      type: 3,
      unit: ts('k_accfpb'),
      cat: 4,
      pp: 0.08,
      sp: 0.25,
    },
    {
      code: 'MAT018',
      name: ts('k_4nmn45'),
      spec: '80×50mm',
      type: 3,
      unit: ts('k_accfpb'),
      cat: 4,
      pp: 0.35,
      sp: 0.95,
    },
    {
      code: 'MAT019',
      name: ts('k_1yfxa7v'),
      spec: '250×120mm',
      type: 3,
      unit: ts('k_accfpb'),
      cat: 4,
      pp: 2.8,
      sp: 6.5,
    },
    {
      code: 'MAT020',
      name: ts('k_13ae7oe'),
      spec: '150×100mm',
      type: 3,
      unit: ts('k_accfpb'),
      cat: 4,
      pp: 1.5,
      sp: 3.2,
    },
  ];
  for (const m of materials) {
    await conn.execute(
      `INSERT INTO inv_material (material_code, material_name, specification, material_type, unit, category_id, purchase_price, sale_price, safety_stock, is_batch_managed, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 100, 1, 1)`,
      [m.code, m.name, m.spec, m.type, m.unit, m.cat, m.pp, m.sp]
    );
  }
  stats.materials = materials.length;

  const equipmentList = [
    {
      code: 'EQP001',
      name: ts('k_1q8v5a6'),
      type: 1,
      brand: ts('k_gp5epx'),
      model: 'DY-600S',
      loc: ts('k_13tvggg'),
      cap: 8000,
      oee: 85.5,
    },
    {
      code: 'EQP002',
      name: ts('k_gj6rls'),
      type: 1,
      brand: ts('k_gp5epx'),
      model: 'DY-300S',
      loc: ts('k_14nu9jd'),
      cap: 4000,
      oee: 78.6,
    },
    {
      code: 'EQP003',
      name: ts('k_eo8n5i'),
      type: 1,
      brand: ts('k_gp5epx'),
      model: 'DY-200P',
      loc: ts('k_37kh06'),
      cap: 2000,
      oee: 82.3,
    },
    {
      code: 'EQP004',
      name: ts('k_nz7qme'),
      type: 5,
      brand: ts('k_1hrgt08'),
      model: 'DM-UV800',
      loc: ts('k_1830jdo'),
      cap: 50,
      oee: 90.0,
    },
    {
      code: 'EQP005',
      name: ts('k_ytji5f'),
      type: 5,
      brand: ts('k_st5o5a'),
      model: 'HL-IR3000',
      loc: ts('k_epdeip'),
      cap: 12000,
      oee: 88.1,
    },
    {
      code: 'EQP006',
      name: ts('k_1lz4qhz'),
      type: 5,
      brand: ts('k_st5o5a'),
      model: 'HL-IR1500',
      loc: ts('k_dvelfs'),
      cap: 8000,
      oee: 80.4,
    },
    {
      code: 'EQP007',
      name: ts('k_1p7n04p'),
      type: 3,
      brand: ts('k_nrjp9a'),
      model: 'XH-1050MQ',
      loc: ts('k_1mbqzik'),
      cap: 9000,
      oee: 86.7,
    },
    {
      code: 'EQP008',
      name: ts('k_6cgay7'),
      type: 3,
      brand: ts('k_nrjp9a'),
      model: 'XH-700MQ',
      loc: ts('k_1n5pslh'),
      cap: 5000,
      oee: 79.3,
    },
    {
      code: 'EQP009',
      name: ts('k_15ziaz2'),
      type: 4,
      brand: ts('k_2waoh1'),
      model: 'XY-T200',
      loc: ts('k_1e7ajmd'),
      cap: 500,
      oee: 95.0,
    },
    {
      code: 'EQP010',
      name: ts('k_1y6nk12'),
      type: 4,
      brand: ts('k_wddu0h'),
      model: 'CK-V1000',
      loc: ts('k_1ddbqjg'),
      cap: 20000,
      oee: 92.0,
    },
  ];
  for (const eq of equipmentList) {
    await conn.execute(
      `INSERT INTO eqp_equipment (equipment_code, equipment_name, equipment_type, brand, model, location, rated_capacity, oee, availability, performance, quality_rate, current_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        eq.code,
        eq.name,
        eq.type,
        eq.brand,
        eq.model,
        eq.loc,
        eq.cap,
        eq.oee,
        Math.round(eq.oee * 0.95 * 10) / 10,
        Math.round(eq.oee * 0.97 * 10) / 10,
        Math.round(eq.oee * 1.02 * 10) / 10,
      ]
    );
  }
  stats.equipment = equipmentList.length;

  const dieTemplates = [
    { code: 'DT001', name: ts('k_1rx3jnt'), type: 2, spec: '120×80mm', max: 50000, cur: 12000 },
    {
      code: 'DT002',
      name: ts('k_s73vly'),
      type: 2,
      spec: '180×100mm',
      max: 40000,
      cur: 8000,
    },
    {
      code: 'DT003',
      name: ts('k_103gr26'),
      type: 2,
      spec: '50×30mm',
      max: 100000,
      cur: 35000,
    },
    {
      code: 'DT004',
      name: ts('k_yseshv'),
      type: 2,
      spec: '150×80mm',
      max: 60000,
      cur: 15000,
    },
    { code: 'DT005', name: ts('k_19ouvla'), type: 2, spec: '200×150mm', max: 30000, cur: 5000 },
    { code: 'DT006', name: ts('k_j4cb3r'), type: 2, spec: '100×60mm', max: 80000, cur: 20000 },
    {
      code: 'DT007',
      name: ts('k_12r9fel'),
      type: 2,
      spec: '40×20mm',
      max: 120000,
      cur: 40000,
    },
    { code: 'DT008', name: ts('k_s60jqs'), type: 1, spec: '80×50mm', max: 80000, cur: 18000 },
    {
      code: 'DT009',
      name: ts('k_1cdqfsg'),
      type: 2,
      spec: '250×120mm',
      max: 30000,
      cur: 3000,
    },
    {
      code: 'DT010',
      name: ts('k_1ymq9m3'),
      type: 1,
      spec: '150×100mm',
      max: 50000,
      cur: 10000,
    },
  ];
  for (const dt of dieTemplates) {
    await conn.execute(
      `INSERT INTO prd_die_template (template_code, template_name, template_type, specification, max_usage, current_usage, remaining_usage, warning_usage, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        dt.code,
        dt.name,
        dt.type,
        dt.spec,
        dt.max,
        dt.cur,
        dt.max - dt.cur,
        Math.round(dt.max * 0.2),
      ]
    );
  }
  stats.dieTemplates = dieTemplates.length;

  const processRoutes = [
    {
      code: 'PR001',
      name: ts('k_1avnolt'),
      pid: 11,
      steps: [
        { s: 1, n: ts('k_up6rlz'), t: 6, st: 15, su: 30, fp: 1 },
        { s: 2, n: ts('k_iv310u'), t: 6, st: 10, su: 15, fp: 0 },
        { s: 3, n: ts('k_kkulp'), t: 1, st: 20, su: 30, fp: 1 },
        { s: 4, n: ts('k_5i3tcf'), t: 6, st: 8, su: 10, fp: 0 },
        { s: 5, n: ts('k_12b93ht'), t: 3, st: 10, su: 20, fp: 0 },
        { s: 6, n: ts('k_eywvjp'), t: 4, st: 5, su: 5, fp: 0 },
      ],
    },
    {
      code: 'PR002',
      name: ts('k_1phh3h7'),
      pid: 13,
      steps: [
        { s: 1, n: ts('k_up6rlz'), t: 6, st: 12, su: 25, fp: 1 },
        { s: 2, n: ts('k_iv310u'), t: 6, st: 8, su: 12, fp: 0 },
        { s: 3, n: ts('k_kkulp'), t: 1, st: 15, su: 25, fp: 1 },
        { s: 4, n: ts('k_5i3tcf'), t: 6, st: 6, su: 8, fp: 0 },
        { s: 5, n: ts('k_eywvjp'), t: 4, st: 4, su: 5, fp: 0 },
      ],
    },
    {
      code: 'PR003',
      name: ts('k_slt3fs'),
      pid: 14,
      steps: [
        { s: 1, n: ts('k_up6rlz'), t: 6, st: 15, su: 30, fp: 1 },
        { s: 2, n: ts('k_1obdtyt'), t: 6, st: 12, su: 20, fp: 1 },
        { s: 3, n: ts('k_1hwdxc8'), t: 1, st: 18, su: 30, fp: 1 },
        { s: 4, n: ts('k_5i3tcf'), t: 6, st: 10, su: 12, fp: 0 },
        { s: 5, n: ts('k_lzjfgc'), t: 1, st: 15, su: 20, fp: 0 },
        { s: 6, n: ts('k_5i3tcf'), t: 6, st: 10, su: 12, fp: 0 },
        { s: 7, n: ts('k_eywvjp'), t: 4, st: 6, su: 8, fp: 0 },
      ],
    },
    {
      code: 'PR004',
      name: ts('k_18jgym1'),
      pid: 12,
      steps: [
        { s: 1, n: ts('k_up6rlz'), t: 6, st: 15, su: 30, fp: 1 },
        { s: 2, n: ts('k_iv310u'), t: 6, st: 10, su: 15, fp: 0 },
        { s: 3, n: ts('k_x0vfm5'), t: 1, st: 15, su: 25, fp: 1 },
        { s: 4, n: ts('k_5i3tcf'), t: 6, st: 8, su: 10, fp: 0 },
        { s: 5, n: ts('k_q0zua9'), t: 1, st: 15, su: 25, fp: 0 },
        { s: 6, n: ts('k_5i3tcf'), t: 6, st: 8, su: 10, fp: 0 },
        { s: 7, n: ts('k_12b93ht'), t: 3, st: 8, su: 15, fp: 0 },
        { s: 8, n: ts('k_eywvjp'), t: 4, st: 5, su: 5, fp: 0 },
      ],
    },
    {
      code: 'PR005',
      name: ts('k_1yc8qjv'),
      pid: 16,
      steps: [
        { s: 1, n: ts('k_up6rlz'), t: 6, st: 12, su: 25, fp: 1 },
        { s: 2, n: ts('k_iv310u'), t: 6, st: 8, su: 12, fp: 0 },
        { s: 3, n: ts('k_kkulp'), t: 1, st: 12, su: 20, fp: 1 },
        { s: 4, n: ts('k_5i3tcf'), t: 6, st: 6, su: 8, fp: 0 },
        { s: 5, n: ts('k_12b93ht'), t: 3, st: 6, su: 12, fp: 0 },
        { s: 6, n: ts('k_eywvjp'), t: 4, st: 3, su: 5, fp: 0 },
      ],
    },
  ];
  for (const pr of processRoutes) {
    await conn.execute(
      `INSERT INTO prd_process_route (route_code, route_name, product_id, version, is_default, status) VALUES (?, ?, ?, '1.0', 1, 1)`,
      [pr.code, pr.name, pr.pid]
    );
    const [rows] = (await conn.execute('SELECT LAST_INSERT_ID() as id')) as [DbRow[], unknown];
    const routeId = rows[0].id;
    for (const step of pr.steps) {
      await conn.execute(
        `INSERT INTO prd_process_route_step (route_id, step_seq, step_name, step_type, standard_time, setup_time, is_key_process, is_first_piece_required, quality_check) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          routeId,
          step.s,
          step.n,
          step.t,
          step.st,
          step.su,
          step.fp ? 1 : 0,
          step.fp,
          step.fp ? 1 : 0,
        ]
      );
    }
  }
  stats.processRoutes = processRoutes.length;
  return materials;
}

export async function seedCommercialData(
  conn: DbConnection,
  stats: Record<string, number>
): Promise<{
  saleOrderIds: number[];
  purchaseOrders: Record<string, unknown>[];
  deliveryOrders: Record<string, unknown>[];
  salesOrders: Record<string, unknown>[];
}> {
  const ts = await getTranslations('Common');
  const salesOrders = [
    {
      no: 'SO20260401001',
      cid: 1,
      date: '2026-04-01',
      delivery: '2026-04-15',
      items: [{ mid: 11, qty: 50000, price: 2.5 }],
    },
    {
      no: 'SO20260401002',
      cid: 2,
      date: '2026-04-01',
      delivery: '2026-04-18',
      items: [{ mid: 12, qty: 30000, price: 3.8 }],
    },
    {
      no: 'SO20260402003',
      cid: 3,
      date: '2026-04-02',
      delivery: '2026-04-20',
      items: [{ mid: 13, qty: 200000, price: 0.45 }],
    },
    {
      no: 'SO20260402004',
      cid: 4,
      date: '2026-04-02',
      delivery: '2026-04-22',
      items: [{ mid: 14, qty: 80000, price: 5.5 }],
    },
    {
      no: 'SO20260403005',
      cid: 5,
      date: '2026-04-03',
      delivery: '2026-04-16',
      items: [{ mid: 15, qty: 20000, price: 7.8 }],
    },
    {
      no: 'SO20260403006',
      cid: 6,
      date: '2026-04-03',
      delivery: '2026-04-17',
      items: [{ mid: 16, qty: 100000, price: 1.35 }],
    },
    {
      no: 'SO20260404007',
      cid: 7,
      date: '2026-04-04',
      delivery: '2026-04-19',
      items: [{ mid: 17, qty: 300000, price: 0.25 }],
    },
    {
      no: 'SO20260405008',
      cid: 8,
      date: '2026-04-05',
      delivery: '2026-04-25',
      items: [{ mid: 18, qty: 150000, price: 0.95 }],
    },
    {
      no: 'SO20260406009',
      cid: 9,
      date: '2026-04-06',
      delivery: '2026-04-20',
      items: [{ mid: 19, qty: 40000, price: 6.5 }],
    },
    {
      no: 'SO20260407010',
      cid: 10,
      date: '2026-04-07',
      delivery: '2026-04-28',
      items: [{ mid: 20, qty: 60000, price: 3.2 }],
    },
  ];
  const saleOrderIds: number[] = [];
  for (const order of salesOrders) {
    let totalAmount = 0;
    for (const item of order.items) totalAmount += item.qty * item.price;
    await conn.execute(
      `INSERT INTO sal_order (order_no, order_date, customer_id, total_amount, total_with_tax, delivery_date, status) VALUES (?, ?, ?, ?, ?, ?, 2)`,
      [
        order.no,
        order.date,
        order.cid,
        totalAmount,
        Math.round(totalAmount * 1.13 * 100) / 100,
        order.delivery,
      ]
    );
    const [rows] = (await conn.execute('SELECT LAST_INSERT_ID() as id')) as [DbRow[], unknown];
    const orderId = rows[0].id;
    saleOrderIds.push(orderId);
    for (const item of order.items) {
      const amount = item.qty * item.price;
      await conn.execute(
        `INSERT INTO sal_order_detail (order_id, material_id, quantity, unit_price, amount, total_amount, delivered_qty) VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [orderId, item.mid, item.qty, item.price, amount, Math.round(amount * 1.13 * 100) / 100]
      );
      const [matRows] = await conn.execute(
        `SELECT material_name, unit FROM inv_material WHERE id = ?`,
        [item.mid]
      );
      const mat = matRows[0];
      await conn.execute(
        `INSERT INTO sal_order_item (order_id, material_name, quantity, unit, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, mat?.material_name || '', item.qty, mat?.unit || ts('k_d5a1x9'), item.price, amount]
      );
    }
  }
  stats.salesOrders = salesOrders.length;

  const purchaseOrders = [
    {
      no: 'PO20260401001',
      sid: 1,
      sname: ts('k_12u5d5'),
      date: '2026-04-01',
      delivery: '2026-04-08',
      items: [
        {
          mid: 1,
          mcode: 'MAT001',
          mname: ts('k_1rrfno4'),
          mspec: '1000×1200mm',
          qty: 500000,
          price: 8.5,
          unit: ts('k_accfpb'),
        },
        {
          mid: 2,
          mcode: 'MAT002',
          mname: ts('k_t6u8hv'),
          mspec: '1000×1200mm',
          qty: 200000,
          price: 12.0,
          unit: ts('k_accfpb'),
        },
      ],
    },
    {
      no: 'PO20260401002',
      sid: 2,
      sname: ts('k_165xuza'),
      date: '2026-04-01',
      delivery: '2026-04-10',
      items: [
        {
          mid: 6,
          mcode: 'MAT006',
          mname: ts('k_133reaf'),
          mspec: ts('k_19sj1tx'),
          qty: 100,
          price: 85.0,
          unit: 'kg',
        },
        {
          mid: 7,
          mcode: 'MAT007',
          mname: ts('k_l9kfgb'),
          mspec: ts('k_8br3sf'),
          qty: 80,
          price: 95.0,
          unit: 'kg',
        },
        {
          mid: 8,
          mcode: 'MAT008',
          mname: ts('k_sonvqu'),
          mspec: 'AG-500',
          qty: 10,
          price: 850.0,
          unit: 'kg',
        },
      ],
    },
    {
      no: 'PO20260402003',
      sid: 3,
      sname: ts('k_2h9m6'),
      date: '2026-04-02',
      delivery: '2026-04-09',
      items: [
        {
          mid: 4,
          mcode: 'MAT004',
          mname: ts('k_17ac3e5'),
          mspec: '600mm×200m',
          qty: 300,
          price: 85.0,
          unit: ts('k_1v8rak6'),
        },
        {
          mid: 5,
          mcode: 'MAT005',
          mname: ts('k_mzhdu8'),
          mspec: '600mm×200m',
          qty: 500,
          price: 65.0,
          unit: ts('k_1v8rak6'),
        },
      ],
    },
    {
      no: 'PO20260403004',
      sid: 4,
      sname: ts('k_tmtxw2'),
      date: '2026-04-03',
      delivery: '2026-04-15',
      items: [
        {
          mid: 3,
          mcode: 'MAT003',
          mname: ts('k_st8b1b'),
          mspec: '920×1100mm',
          qty: 400000,
          price: 6.5,
          unit: ts('k_accfpb'),
        },
      ],
    },
    {
      no: 'PO20260404005',
      sid: 5,
      sname: ts('k_wrmtv9'),
      date: '2026-04-04',
      delivery: '2026-04-12',
      items: [
        {
          mid: 9,
          mcode: 'MAT009',
          mname: ts('k_1xbkp60'),
          mspec: ts('k_1ikfdu9'),
          qty: 50,
          price: 120.0,
          unit: 'kg',
        },
        {
          mid: 10,
          mcode: 'MAT010',
          mname: ts('k_1czvfki'),
          mspec: 'SP-200',
          qty: 20,
          price: 180.0,
          unit: 'kg',
        },
      ],
    },
  ];
  for (const po of purchaseOrders) {
    let totalAmount = 0;
    let totalQty = 0;
    for (const item of po.items) {
      totalAmount += item.qty * item.price;
      totalQty += item.qty;
    }
    const taxAmount = Math.round(totalAmount * 0.13 * 100) / 100;
    const grandTotal = Math.round(totalAmount * 1.13 * 100) / 100;
    await conn.execute(
      `INSERT INTO pur_purchase_order (po_no, supplier_id, supplier_name, order_date, delivery_date, total_amount, total_quantity, tax_rate, tax_amount, grand_total, status) VALUES (?, ?, ?, ?, ?, ?, ?, 13.00, ?, ?, 30)`,
      [po.no, po.sid, po.sname, po.date, po.delivery, totalAmount, totalQty, taxAmount, grandTotal]
    );
    const [rows] = (await conn.execute('SELECT LAST_INSERT_ID() as id')) as [DbRow[], unknown];
    const poId = rows[0].id;
    for (let i = 0; i < po.items.length; i++) {
      const item = po.items[i];
      const amount = item.qty * item.price;
      const lineTax = Math.round(amount * 0.13 * 100) / 100;
      const lineTotal = Math.round(amount * 1.13 * 100) / 100;
      await conn.execute(
        `INSERT INTO pur_purchase_order_line (po_id, line_no, material_id, material_code, material_name, material_spec, unit, order_qty, unit_price, amount, tax_rate, tax_amount, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 13.00, ?, ?)`,
        [
          poId,
          i + 1,
          item.mid,
          item.mcode,
          item.mname,
          item.mspec,
          item.unit,
          item.qty,
          item.price,
          amount,
          lineTax,
          lineTotal,
        ]
      );
    }
  }
  stats.purchaseOrders = purchaseOrders.length;

  const deliveryOrders = [
    {
      no: 'DN20260415001',
      soi: 0,
      cid: 1,
      cname: ts('k_fraptg'),
      date: '2026-04-15',
      items: [
        {
          mid: 11,
          name: ts('k_1085ar9'),
          spec: '120×80mm',
          qty: 48800,
          unit: ts('k_accfpb'),
          price: 2.5,
        },
      ],
      sign: 1,
      status: 3,
    },
    {
      no: 'DN20260418002',
      soi: 1,
      cid: 2,
      cname: ts('k_1jfjhy6'),
      date: '2026-04-18',
      items: [
        {
          mid: 12,
          name: ts('k_1d31fut'),
          spec: '180×100mm',
          qty: 29500,
          unit: ts('k_accfpb'),
          price: 3.8,
        },
      ],
      sign: 1,
      status: 3,
    },
    {
      no: 'DN20260420003',
      soi: 2,
      cid: 3,
      cname: ts('k_5lwcax'),
      date: '2026-04-20',
      items: [
        { mid: 13, name: ts('k_1u8tdc0'), spec: '50×30mm', qty: 150000, unit: ts('k_accfpb'), price: 0.45 },
      ],
      sign: 0,
      status: 2,
    },
    {
      no: 'DN20260422004',
      soi: 3,
      cid: 4,
      cname: ts('k_97eh4c'),
      date: '2026-04-22',
      items: [
        { mid: 14, name: ts('k_hd09uq'), spec: '150×80mm', qty: 70000, unit: ts('k_accfpb'), price: 5.5 },
      ],
      sign: 0,
      status: 2,
    },
    {
      no: 'DN20260416005',
      soi: 4,
      cid: 5,
      cname: ts('k_5llr4v'),
      date: '2026-04-16',
      items: [
        { mid: 15, name: ts('k_e0f7iv'), spec: '200×150mm', qty: 19800, unit: ts('k_accfpb'), price: 7.8 },
      ],
      sign: 1,
      status: 3,
    },
    {
      no: 'DN20260417006',
      soi: 5,
      cid: 6,
      cname: ts('k_tslc5n'),
      date: '2026-04-17',
      items: [
        { mid: 16, name: ts('k_18cwdu4'), spec: '100×60mm', qty: 97800, unit: ts('k_accfpb'), price: 1.35 },
      ],
      sign: 1,
      status: 3,
    },
    {
      no: 'DN20260419007',
      soi: 6,
      cid: 7,
      cname: ts('k_12oxamt'),
      date: '2026-04-19',
      items: [
        {
          mid: 17,
          name: ts('k_kbbj1u'),
          spec: '40×20mm',
          qty: 280000,
          unit: ts('k_accfpb'),
          price: 0.25,
        },
      ],
      sign: 0,
      status: 2,
    },
    {
      no: 'DN20260425008',
      soi: 7,
      cid: 8,
      cname: ts('k_1x2h3m7'),
      date: '2026-04-25',
      items: [
        { mid: 18, name: ts('k_4nmn45'), spec: '80×50mm', qty: 140000, unit: ts('k_accfpb'), price: 0.95 },
      ],
      sign: 0,
      status: 1,
    },
    {
      no: 'DN20260420009',
      soi: 8,
      cid: 9,
      cname: ts('k_mplbox'),
      date: '2026-04-20',
      items: [
        {
          mid: 19,
          name: ts('k_1yfxa7v'),
          spec: '250×120mm',
          qty: 35000,
          unit: ts('k_accfpb'),
          price: 6.5,
        },
      ],
      sign: 0,
      status: 1,
    },
    {
      no: 'DN20260428010',
      soi: 9,
      cid: 10,
      cname: ts('k_1og3l7r'),
      date: '2026-04-28',
      items: [
        { mid: 20, name: ts('k_13ae7oe'), spec: '150×100mm', qty: 55000, unit: ts('k_accfpb'), price: 3.2 },
      ],
      sign: 0,
      status: 1,
    },
  ];
  for (const dn of deliveryOrders) {
    let totalQty = 0,
      totalAmount = 0;
    for (const item of dn.items) {
      totalQty += item.qty;
      totalAmount += item.qty * item.price;
    }
    await conn.execute(
      `INSERT INTO sal_delivery (delivery_no, order_id, order_no, customer_id, customer_name, delivery_date, warehouse_id, total_qty, total_amount, sign_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dn.no,
        saleOrderIds[dn.soi],
        salesOrders[dn.soi].no,
        dn.cid,
        dn.cname,
        dn.date,
        1,
        totalQty,
        totalAmount,
        dn.sign,
        dn.status,
      ]
    );
    const [rows] = (await conn.execute('SELECT LAST_INSERT_ID() as id')) as [DbRow[], unknown];
    const dnId = rows[0].id;
    let lineNo = 1;
    for (const item of dn.items) {
      await conn.execute(
        `INSERT INTO sal_delivery_detail (delivery_id, line_no, material_id, material_name, material_spec, quantity, unit, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dnId,
          lineNo++,
          item.mid,
          item.name,
          item.spec,
          item.qty,
          item.unit,
          item.price,
          item.qty * item.price,
        ]
      );
    }
  }
  stats.deliveryOrders = deliveryOrders.length;

  const returnOrders = [
    {
      no: 'RT20260416001',
      soi: 0,
      dnNo: 'DN20260415001',
      cid: 1,
      cname: ts('k_fraptg'),
      date: '2026-04-16',
      type: 1,
      reason: ts('k_1lxwpsi'),
      items: [
        {
          mid: 11,
          name: ts('k_1085ar9'),
          spec: '120×80mm',
          qty: 2000,
          unit: ts('k_accfpb'),
          price: 2.5,
        },
      ],
    },
    {
      no: 'RT20260418002',
      soi: 4,
      dnNo: 'DN20260416005',
      cid: 5,
      cname: ts('k_5llr4v'),
      date: '2026-04-18',
      type: 3,
      reason: ts('k_qshohd'),
      items: [
        { mid: 15, name: ts('k_e0f7iv'), spec: '200×150mm', qty: 500, unit: ts('k_accfpb'), price: 7.8 },
      ],
    },
  ];
  for (const rt of returnOrders) {
    let totalAmount = 0;
    for (const item of rt.items) {
      totalAmount += item.qty * item.price;
    }
    await conn.execute(
      `INSERT INTO sal_return (return_no, status, order_id, order_no, customer_id, customer_name, warehouse_id, delivery_no, reason, return_date, total_amount) VALUES (?, 3, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rt.no,
        saleOrderIds[rt.soi],
        salesOrders[rt.soi].no,
        rt.cid,
        rt.cname,
        1,
        rt.dnNo,
        rt.reason,
        rt.date,
        totalAmount,
      ]
    );
    const [rows] = (await conn.execute('SELECT LAST_INSERT_ID() as id')) as [DbRow[], unknown];
    const rtId = rows[0].id;
    let lineNo = 1;
    for (const item of rt.items) {
      await conn.execute(
        `INSERT INTO sal_return_detail (return_id, line_no, material_id, material_name, material_spec, unit, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rtId,
          lineNo++,
          item.mid,
          item.name,
          item.spec,
          item.unit,
          item.qty,
          item.price,
          item.qty * item.price,
        ]
      );
    }
  }
  stats.returnOrders = returnOrders.length;

  const outboundOrders = [
    {
      no: 'OUT20260402001',
      type: 'production',
      wh: 1,
      whname: ts('k_tkxvoe'),
      date: '2026-04-02',
      status: 'completed',
      items: [
        {
          mid: 1,
          name: ts('k_1rrfno4'),
          spec: '1000×1200mm',
          qty: 55000,
          unit: ts('k_accfpb'),
          price: 8.5,
        },
      ],
    },
    {
      no: 'OUT20260403002',
      type: 'production',
      wh: 4,
      whname: ts('k_dw90w7'),
      date: '2026-04-03',
      status: 'completed',
      items: [
        {
          mid: 6,
          name: ts('k_133reaf'),
          spec: ts('k_19sj1tx'),
          qty: 8,
          unit: 'kg',
          price: 85.0,
        },
      ],
    },
    {
      no: 'OUT20260415003',
      type: 'sale',
      wh: 3,
      whname: ts('k_93mh3v'),
      date: '2026-04-15',
      status: 'completed',
      items: [
        {
          mid: 11,
          name: ts('k_1085ar9'),
          spec: '120×80mm',
          qty: 48800,
          unit: ts('k_accfpb'),
          price: 2.5,
        },
      ],
    },
    {
      no: 'OUT20260418004',
      type: 'sale',
      wh: 3,
      whname: ts('k_93mh3v'),
      date: '2026-04-18',
      status: 'completed',
      items: [
        {
          mid: 12,
          name: ts('k_1d31fut'),
          spec: '180×100mm',
          qty: 29500,
          unit: ts('k_accfpb'),
          price: 3.8,
        },
      ],
    },
    {
      no: 'OUT20260417006',
      type: 'sale',
      wh: 3,
      whname: ts('k_93mh3v'),
      date: '2026-04-17',
      status: 'completed',
      items: [
        { mid: 16, name: ts('k_18cwdu4'), spec: '100×60mm', qty: 97800, unit: ts('k_accfpb'), price: 1.35 },
      ],
    },
  ];
  for (const ob of outboundOrders) {
    let totalQty = 0,
      totalAmount = 0;
    for (const item of ob.items) {
      totalQty += item.qty;
      totalAmount += item.qty * item.price;
    }
    await conn.execute(
      `INSERT INTO inv_outbound_order (order_no, order_date, outbound_type, warehouse_id, warehouse_name, total_qty, total_amount, status, audit_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
      [ob.no, ob.date, ob.type, ob.wh, ob.whname, totalQty, totalAmount, ob.status]
    );
    const [rows] = (await conn.execute('SELECT LAST_INSERT_ID() as id')) as [DbRow[], unknown];
    const obId = rows[0].id;
    for (const item of ob.items) {
      await conn.execute(
        `INSERT INTO inv_outbound_item (order_id, material_id, material_name, material_spec, quantity, unit, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          obId,
          item.mid,
          item.name,
          item.spec,
          item.qty,
          item.unit,
          item.price,
          item.qty * item.price,
        ]
      );
    }
  }
  stats.outboundOrders = outboundOrders.length;

  const sampleOrders = [
    {
      no: 'SMP20260325001',
      cid: 1,
      cname: ts('k_gx8egb'),
      pname: ts('k_14r8a43'),
      spec: '120×80mm',
      qty: 50,
      date: '2026-03-25',
      delivery: '2026-04-01',
      status: 'completed',
      remark: ts('k_1m4dzr0'),
    },
    {
      no: 'SMP20260328002',
      cid: 4,
      cname: ts('k_ie3k75'),
      pname: ts('k_yu4aii'),
      spec: '150×80mm',
      qty: 30,
      date: '2026-03-28',
      delivery: '2026-04-05',
      status: 'completed',
      remark: ts('k_ejsy09'),
    },
    {
      no: 'SMP20260405003',
      cid: 9,
      cname: ts('k_1pza3xe'),
      pname: ts('k_9u1hyw'),
      spec: '200×100mm',
      qty: 20,
      date: '2026-04-05',
      delivery: '2026-04-15',
      status: 'producing',
      remark: ts('k_w2tvyh'),
    },
    {
      no: 'SMP20260408004',
      cid: 8,
      cname: ts('k_z6l3vn'),
      pname: ts('k_tzwgew'),
      spec: '80×60mm',
      qty: 30,
      date: '2026-04-08',
      delivery: '2026-04-20',
      status: 'pending',
      remark: ts('k_xpgckt'),
    },
  ];
  for (const so of sampleOrders) {
    await conn.execute(
      `INSERT INTO sal_sample_order (order_no, notify_date, customer_id, customer_name, product_name, specification, quantity, order_date, delivery_date, status, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        so.no,
        so.date,
        so.cid,
        so.cname,
        so.pname,
        so.spec,
        so.qty,
        so.date,
        so.delivery,
        so.status,
        so.remark,
      ]
    );
  }
  stats.sampleOrders = sampleOrders.length;

  return { saleOrderIds, purchaseOrders, deliveryOrders, salesOrders };
}

export async function seedProductionData(
  conn: DbConnection,
  stats: Record<string, number>,
  saleOrderIds: number[],
  salesOrders: Record<string, unknown>[],
  materials: Record<string, unknown>[]
) {
  const ts = await getTranslations('Common');
  const bomList = [
    {
      name: ts('k_hkc956'),
      pid: 11,
      items: [
        { mid: 1, qty: 55000, unit: ts('k_accfpb'), loss: 10 },
        { mid: 6, qty: 5, unit: 'kg', loss: 0 },
        { mid: 10, qty: 0.5, unit: 'kg', loss: 0 },
      ],
    },
    {
      name: ts('k_68aq4a'),
      pid: 12,
      items: [
        { mid: 2, qty: 33000, unit: ts('k_accfpb'), loss: 10 },
        { mid: 7, qty: 4, unit: 'kg', loss: 0 },
        { mid: 10, qty: 0.5, unit: 'kg', loss: 0 },
      ],
    },
    {
      name: ts('k_k1vs36'),
      pid: 13,
      items: [
        { mid: 3, qty: 220000, unit: ts('k_accfpb'), loss: 10 },
        { mid: 8, qty: 0.5, unit: 'kg', loss: 0 },
        { mid: 6, qty: 3, unit: 'kg', loss: 0 },
      ],
    },
    {
      name: ts('k_18v9k7k'),
      pid: 14,
      items: [
        { mid: 3, qty: 88000, unit: ts('k_accfpb'), loss: 10 },
        { mid: 8, qty: 1, unit: 'kg', loss: 0 },
        { mid: 9, qty: 2, unit: 'kg', loss: 0 },
      ],
    },
    {
      name: ts('k_fknjav'),
      pid: 15,
      items: [
        { mid: 1, qty: 22000, unit: ts('k_accfpb'), loss: 10 },
        { mid: 7, qty: 3, unit: 'kg', loss: 0 },
        { mid: 9, qty: 2, unit: 'kg', loss: 0 },
      ],
    },
    {
      name: ts('k_1x3ktrz'),
      pid: 16,
      items: [
        { mid: 1, qty: 110000, unit: ts('k_accfpb'), loss: 10 },
        { mid: 6, qty: 8, unit: 'kg', loss: 0 },
        { mid: 10, qty: 0.5, unit: 'kg', loss: 0 },
      ],
    },
    {
      name: ts('k_1bym75x'),
      pid: 17,
      items: [
        { mid: 5, qty: 310, unit: ts('k_1v8rak6'), loss: 5 },
        { mid: 6, qty: 6, unit: 'kg', loss: 0 },
        { mid: 9, qty: 3, unit: 'kg', loss: 0 },
      ],
    },
    {
      name: ts('k_vpf3bd'),
      pid: 18,
      items: [
        { mid: 4, qty: 165, unit: ts('k_1v8rak6'), loss: 5 },
        { mid: 7, qty: 4, unit: 'kg', loss: 0 },
        { mid: 9, qty: 2, unit: 'kg', loss: 0 },
      ],
    },
    {
      name: ts('k_18029s3'),
      pid: 19,
      items: [
        { mid: 2, qty: 44000, unit: ts('k_accfpb'), loss: 10 },
        { mid: 7, qty: 5, unit: 'kg', loss: 0 },
        { mid: 8, qty: 0.8, unit: 'kg', loss: 0 },
      ],
    },
    {
      name: ts('k_1kjhujo'),
      pid: 20,
      items: [
        { mid: 2, qty: 66000, unit: ts('k_accfpb'), loss: 10 },
        { mid: 6, qty: 4, unit: 'kg', loss: 0 },
        { mid: 9, qty: 2, unit: 'kg', loss: 0 },
      ],
    },
  ];
  const bomIds: number[] = [];
  for (const bom of bomList) {
    let totalCost = 0;
    for (const item of bom.items) {
      const [matRows] = await conn.execute(`SELECT purchase_price FROM inv_material WHERE id = ?`, [
        item.mid,
      ]);
      totalCost += item.qty * (matRows[0]?.purchase_price || 0);
    }
    await conn.execute(
      `INSERT INTO prd_bom (bom_name, product_id, version, total_cost, status, create_time) VALUES (?, ?, '1.0', ?, 1, NOW())`,
      [bom.name, bom.pid, Math.round(totalCost * 100) / 100]
    );
    const [rows] = (await conn.execute('SELECT LAST_INSERT_ID() as id')) as [DbRow[], unknown];
    const bomId = rows[0].id;
    bomIds.push(bomId);
    for (const item of bom.items) {
      const [matRows] = await conn.execute(
        `SELECT material_name, purchase_price, unit FROM inv_material WHERE id = ?`,
        [item.mid]
      );
      const mat = matRows[0];
      await conn.execute(
        `INSERT INTO prd_bom_detail (bom_id, material_id, material_name, quantity, unit, loss_rate, unit_cost, total_cost, item_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          bomId,
          item.mid,
          mat?.material_name || '',
          item.qty,
          item.unit || mat?.unit,
          item.loss,
          mat?.purchase_price || 0,
          item.qty * (mat?.purchase_price || 0),
        ]
      );
    }
  }
  stats.boms = bomList.length;

  const workOrders = [
    {
      no: 'WO20260401001',
      soi: 0,
      bi: 0,
      pname: ts('k_1085ar9'),
      qty: 50000,
      unit: ts('k_accfpb'),
      status: 'completed',
      psd: '2026-04-02',
      ped: '2026-04-14',
      asd: '2026-04-02',
      aed: '2026-04-13',
    },
    {
      no: 'WO20260401002',
      soi: 1,
      bi: 1,
      pname: ts('k_1d31fut'),
      qty: 30000,
      unit: ts('k_accfpb'),
      status: 'completed',
      psd: '2026-04-02',
      ped: '2026-04-17',
      asd: '2026-04-02',
      aed: '2026-04-16',
    },
    {
      no: 'WO20260402003',
      soi: 2,
      bi: 2,
      pname: ts('k_1u8tdc0'),
      qty: 200000,
      unit: ts('k_accfpb'),
      status: 'producing',
      psd: '2026-04-03',
      ped: '2026-04-19',
      asd: '2026-04-03',
      aed: null,
    },
    {
      no: 'WO20260402004',
      soi: 3,
      bi: 3,
      pname: ts('k_hd09uq'),
      qty: 80000,
      unit: ts('k_accfpb'),
      status: 'producing',
      psd: '2026-04-03',
      ped: '2026-04-21',
      asd: '2026-04-04',
      aed: null,
    },
    {
      no: 'WO20260403005',
      soi: 4,
      bi: 4,
      pname: ts('k_e0f7iv'),
      qty: 20000,
      unit: ts('k_accfpb'),
      status: 'completed',
      psd: '2026-04-04',
      ped: '2026-04-15',
      asd: '2026-04-04',
      aed: '2026-04-14',
    },
    {
      no: 'WO20260403006',
      soi: 5,
      bi: 5,
      pname: ts('k_18cwdu4'),
      qty: 100000,
      unit: ts('k_accfpb'),
      status: 'completed',
      psd: '2026-04-04',
      ped: '2026-04-16',
      asd: '2026-04-04',
      aed: '2026-04-15',
    },
    {
      no: 'WO20260404007',
      soi: 6,
      bi: 6,
      pname: ts('k_kbbj1u'),
      qty: 300000,
      unit: ts('k_accfpb'),
      status: 'confirmed',
      psd: '2026-04-05',
      ped: '2026-04-18',
      asd: null,
      aed: null,
    },
    {
      no: 'WO20260405008',
      soi: 7,
      bi: 7,
      pname: ts('k_4nmn45'),
      qty: 150000,
      unit: ts('k_accfpb'),
      status: 'confirmed',
      psd: '2026-04-06',
      ped: '2026-04-24',
      asd: null,
      aed: null,
    },
    {
      no: 'WO20260406009',
      soi: 8,
      bi: 8,
      pname: ts('k_1yfxa7v'),
      qty: 40000,
      unit: ts('k_accfpb'),
      status: 'pending',
      psd: '2026-04-07',
      ped: '2026-04-19',
      asd: null,
      aed: null,
    },
    {
      no: 'WO20260407010',
      soi: 9,
      bi: 9,
      pname: ts('k_13ae7oe'),
      qty: 60000,
      unit: ts('k_accfpb'),
      status: 'pending',
      psd: '2026-04-08',
      ped: '2026-04-27',
      asd: null,
      aed: null,
    },
  ];
  for (const wo of workOrders) {
    const cname = salesOrders[wo.soi]?.name || '';
    await conn.execute(
      `INSERT INTO prod_work_order (work_order_no, order_id, order_no, bom_id, customer_name, product_name, quantity, unit, status, priority, plan_start_date, plan_end_date, actual_start_date, actual_end_date, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', ?, ?, ?, ?, NOW())`,
      [
        wo.no,
        saleOrderIds[wo.soi],
        salesOrders[wo.soi]?.no || '',
        bomIds[wo.bi],
        cname,
        wo.pname,
        wo.qty,
        wo.unit,
        wo.status,
        wo.psd,
        wo.ped,
        wo.asd,
        wo.aed,
      ]
    );
    const [rows] = (await conn.execute('SELECT LAST_INSERT_ID() as id')) as [DbRow[], unknown];
    const woId = rows[0].id;
    const soItem = salesOrders[wo.soi]?.items?.[0];
    if (soItem) {
      await conn.execute(
        `INSERT INTO prod_work_order_item (work_order_id, line_no, material_id, material_name, quantity, unit, unit_price, total_price) VALUES (?, 1, ?, ?, ?, ?, ?, ?)`,
        [
          woId,
          soItem.mid,
          materials[soItem.mid - 1]?.name || '',
          soItem.qty,
          wo.unit,
          soItem.price,
          soItem.qty * soItem.price,
        ]
      );
    }
  }
  stats.workOrders = workOrders.length;

  const workReports = [
    {
      no: 'WR20260402001',
      woid: 1,
      wono: 'WO20260401001',
      proc: ts('k_up6rlz'),
      seq: 1,
      eqp: 4,
      plan: 50000,
      comp: 50000,
      qual: 50000,
      def: 0,
      start: '2026-04-02 08:00',
      end: '2026-04-02 18:00',
      fp: 2,
    },
    {
      no: 'WR20260404001',
      woid: 1,
      wono: 'WO20260401001',
      proc: ts('k_kkulp'),
      seq: 3,
      eqp: 1,
      plan: 50000,
      comp: 50000,
      qual: 49200,
      def: 800,
      start: '2026-04-04 08:00',
      end: '2026-04-06 16:00',
      fp: 2,
    },
    {
      no: 'WR20260408001',
      woid: 1,
      wono: 'WO20260401001',
      proc: ts('k_12b93ht'),
      seq: 5,
      eqp: 7,
      plan: 49200,
      comp: 49200,
      qual: 48800,
      def: 400,
      start: '2026-04-08 08:00',
      end: '2026-04-09 18:00',
      fp: 0,
    },
    {
      no: 'WR20260403002',
      woid: 2,
      wono: 'WO20260401002',
      proc: ts('k_up6rlz'),
      seq: 1,
      eqp: 4,
      plan: 30000,
      comp: 30000,
      qual: 30000,
      def: 0,
      start: '2026-04-03 08:00',
      end: '2026-04-03 18:00',
      fp: 2,
    },
    {
      no: 'WR20260405002',
      woid: 2,
      wono: 'WO20260401002',
      proc: ts('k_kkulp'),
      seq: 3,
      eqp: 2,
      plan: 30000,
      comp: 30000,
      qual: 29500,
      def: 500,
      start: '2026-04-05 08:00',
      end: '2026-04-08 16:00',
      fp: 2,
    },
    {
      no: 'WR20260404003',
      woid: 5,
      wono: 'WO20260403005',
      proc: ts('k_up6rlz'),
      seq: 1,
      eqp: 4,
      plan: 20000,
      comp: 20000,
      qual: 20000,
      def: 0,
      start: '2026-04-04 08:00',
      end: '2026-04-04 18:00',
      fp: 2,
    },
    {
      no: 'WR20260406003',
      woid: 5,
      wono: 'WO20260403005',
      proc: ts('k_kkulp'),
      seq: 3,
      eqp: 3,
      plan: 20000,
      comp: 20000,
      qual: 19800,
      def: 200,
      start: '2026-04-06 08:00',
      end: '2026-04-08 16:00',
      fp: 2,
    },
    {
      no: 'WR20260405004',
      woid: 6,
      wono: 'WO20260403006',
      proc: ts('k_up6rlz'),
      seq: 1,
      eqp: 4,
      plan: 100000,
      comp: 100000,
      qual: 100000,
      def: 0,
      start: '2026-04-05 08:00',
      end: '2026-04-05 18:00',
      fp: 2,
    },
    {
      no: 'WR20260407004',
      woid: 6,
      wono: 'WO20260403006',
      proc: ts('k_kkulp'),
      seq: 3,
      eqp: 1,
      plan: 100000,
      comp: 100000,
      qual: 98500,
      def: 1500,
      start: '2026-04-07 08:00',
      end: '2026-04-10 16:00',
      fp: 2,
    },
    {
      no: 'WR20260412004',
      woid: 6,
      wono: 'WO20260403006',
      proc: ts('k_12b93ht'),
      seq: 5,
      eqp: 7,
      plan: 98500,
      comp: 98500,
      qual: 97800,
      def: 700,
      start: '2026-04-12 08:00',
      end: '2026-04-14 16:00',
      fp: 0,
    },
  ];
  for (const wr of workReports) {
    await conn.execute(
      ts('k_zu8nd7'),
      [
        wr.no,
        wr.woid || 1,
        wr.wono,
        wr.proc,
        wr.seq,
        wr.eqp,
        wr.plan,
        wr.comp,
        wr.qual,
        wr.def,
        wr.start,
        wr.end,
        wr.fp ? 1 : 0,
        wr.fp || null,
      ]
    );
  }
  stats.workReports = workReports.length;

  const processCards = [
    {
      no: 'PC20260402001',
      woId: 1,
      woNo: 'WO20260401001',
      pcode: 'MAT011',
      pname: ts('k_1085ar9'),
      mspec: '120×80mm',
      pdate: '2026-04-02',
      pqty: 50000,
      mlId: 11,
      mlNo: 'SL-MAT001-001-20260408-001',
      bStatus: 1,
      cUser: ts('k_1trrg56'),
    },
    {
      no: 'PC20260402002',
      woId: 2,
      woNo: 'WO20260401002',
      pcode: 'MAT012',
      pname: ts('k_1d31fut'),
      mspec: '180×100mm',
      pdate: '2026-04-02',
      pqty: 30000,
      mlId: 12,
      mlNo: 'SL-MAT001-001-20260408-002',
      bStatus: 1,
      cUser: ts('k_1trrg56'),
    },
    {
      no: 'PC20260403003',
      woId: 3,
      woNo: 'WO20260402003',
      pcode: 'MAT013',
      pname: ts('k_1u8tdc0'),
      mspec: '50×30mm',
      pdate: '2026-04-03',
      pqty: 200000,
      mlId: 13,
      mlNo: 'SL-MAT004-001-20260410-001',
      bStatus: 1,
      cUser: ts('k_1trrg56'),
    },
    {
      no: 'PC20260404004',
      woId: 4,
      woNo: 'WO20260402004',
      pcode: 'MAT014',
      pname: ts('k_hd09uq'),
      mspec: '150×80mm',
      pdate: '2026-04-04',
      pqty: 80000,
      mlId: 14,
      mlNo: 'SL-MAT003-001-20260415-001',
      bStatus: 0,
      cUser: ts('k_1trrg56'),
    },
    {
      no: 'PC20260404005',
      woId: 5,
      woNo: 'WO20260403005',
      pcode: 'MAT015',
      pname: ts('k_e0f7iv'),
      mspec: '200×150mm',
      pdate: '2026-04-04',
      pqty: 20000,
      mlId: 15,
      mlNo: 'SL-MAT002-001-20260408-001',
      bStatus: 1,
      cUser: ts('k_1trrg56'),
    },
  ];
  for (const pc of processCards) {
    await conn.execute(
      `INSERT INTO prd_process_card (card_no, qr_code, work_order_id, work_order_no, product_code, product_name, material_spec, work_order_date, plan_qty, main_label_id, main_label_no, burdening_status, create_user_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pc.no,
        pc.no,
        pc.woId,
        pc.woNo,
        pc.pcode,
        pc.pname,
        pc.mspec,
        pc.pdate,
        pc.pqty,
        pc.mlId,
        pc.mlNo,
        pc.bStatus,
        pc.cUser,
      ]
    );
  }
  stats.processCards = processCards.length;

  const cuttingRecords = [
    {
      no: 'CUT20260409001',
      srcLabel: 'RM-MAT001-001-20260408',
      srcId: 1,
      cutStr: '120+120+120+120+120+120+120+120',
      origW: 1000,
      cutW: 960,
      remainW: 40,
      op: ts('k_dfpu9c'),
    },
    {
      no: 'CUT20260410002',
      srcLabel: 'RM-MAT004-001-20260410',
      srcId: 5,
      cutStr: '80+80+80+80+80+80+80+80',
      origW: 600,
      cutW: 640,
      remainW: 0,
      op: ts('k_4i4ny2'),
    },
    {
      no: 'CUT20260411003',
      srcLabel: 'RM-MAT005-001-20260410',
      srcId: 6,
      cutStr: '100+100+100+100+100',
      origW: 600,
      cutW: 500,
      remainW: 100,
      op: ts('k_dfpu9c'),
    },
    {
      no: 'CUT20260415004',
      srcLabel: 'RM-MAT003-001-20260415',
      srcId: 7,
      cutStr: '150+150+150+150+150+150',
      origW: 920,
      cutW: 900,
      remainW: 20,
      op: ts('k_cwpqhl'),
    },
    {
      no: 'CUT20260416005',
      srcLabel: 'RM-MAT002-001-20260408',
      srcId: 2,
      cutStr: '180+180+180+180',
      origW: 1000,
      cutW: 720,
      remainW: 280,
      op: ts('k_4i4ny2'),
    },
  ];
  for (const cr of cuttingRecords) {
    // #29 E2E 造数合法性：按业务键 label_no 真实查源标签 ID，
    // 与 auto_increment 解耦（原硬编码 srcId 在非干净库重跑会指向错误/不存在标签）。
    const [srcRows] = (await conn.execute(
      'SELECT id FROM inv_material_label WHERE label_no = ? LIMIT 1',
      [cr.srcLabel]
    )) as [DbRow[], unknown];
    if (!srcRows.length) {
      throw new Error(`切割源标签不存在，无法继续 seed: ${cr.srcLabel}`);
    }
    const srcId = (srcRows[0] as DbRow).id;
    await conn.execute(
      `INSERT INTO inv_cutting_record (record_no, source_label_id, source_label_no, cut_width_str, original_width, cut_total_width, remain_width, operator_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [cr.no, srcId, cr.srcLabel, cr.cutStr, cr.origW, cr.cutW, cr.remainW, cr.op]
    );
    const [rows] = (await conn.execute('SELECT LAST_INSERT_ID() as id')) as [DbRow[], unknown];
    const cutId = rows[0].id;
    const widths = cr.cutStr.split('+').map(Number);
    for (let i = 0; i < widths.length; i++) {
      const newLabelNo = `SL-${cr.srcLabel.split('-').slice(1).join('-')}-${String(i + 1).padStart(3, '0')}`;
      await conn.execute(
        `INSERT INTO inv_material_label (label_no, qr_code, material_code, material_name, specification, unit, batch_no, quantity, width, warehouse_id, is_main_material, is_cut, parent_label_id, label_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 2, 1)`,
        [
          newLabelNo,
          newLabelNo,
          'MAT001',
          ts('k_13j56l9'),
          `${widths[i]}mm`,
          ts('k_accfpb'),
          'B20260408A',
          50000,
          widths[i],
          1,
          srcId,
        ]
      );
      const [newRows] = (await conn.execute('SELECT LAST_INSERT_ID() as id')) as [DbRow[], unknown];
      const newLabelId = newRows[0].id;
      await conn.execute(
        `INSERT INTO inv_cutting_detail (record_id, new_label_id, new_label_no, cut_width, sequence) VALUES (?, ?, ?, ?, ?)`,
        [cutId, newLabelId, newLabelNo, widths[i], i + 1]
      );
    }
    if (cr.remainW > 0) {
      const remLabelNo = `RE-${cr.srcLabel.split('-').slice(1).join('-')}-001`;
      await conn.execute(
        `INSERT INTO inv_material_label (label_no, qr_code, material_code, material_name, specification, unit, batch_no, quantity, width, remaining_width, warehouse_id, is_main_material, is_cut, parent_label_id, label_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 3, 1)`,
        [
          remLabelNo,
          remLabelNo,
          'MAT001',
          ts('k_1teqcu4'),
          `${cr.remainW}mm`,
          ts('k_accfpb'),
          'B20260408A',
          20000,
          cr.remainW,
          cr.remainW,
          1,
          srcId,
        ]
      );
    }
  }
  stats.cuttingRecords = cuttingRecords.length;
}

export async function seedInventoryData(
  conn: DbConnection,
  stats: Record<string, number>,
  _purchaseOrders: Record<string, unknown>[]
) {
  const ts = await getTranslations('Common');
  const inboundOrders = [
    {
      no: 'IN20260408001',
      supplier: ts('k_12u5d5'),
      date: '2026-04-08',
      wh: 1,
      poId: 1,
      poNo: 'PO20260401001',
      items: [
        {
          mid: 1,
          name: ts('k_1rrfno4'),
          spec: '1000×1200mm',
          qty: 500000,
          unit: ts('k_accfpb'),
          price: 8.5,
          batch: 'B20260408A',
        },
      ],
    },
    {
      no: 'IN20260409002',
      supplier: ts('k_165xuza'),
      date: '2026-04-09',
      wh: 4,
      poId: 2,
      poNo: 'PO20260401002',
      items: [
        {
          mid: 6,
          name: ts('k_133reaf'),
          spec: ts('k_19sj1tx'),
          qty: 100,
          unit: 'kg',
          price: 85.0,
          batch: 'B20260409A',
        },
        {
          mid: 8,
          name: ts('k_sonvqu'),
          spec: 'AG-500',
          qty: 10,
          unit: 'kg',
          price: 850.0,
          batch: 'B20260409B',
        },
      ],
    },
    {
      no: 'IN20260409003',
      supplier: ts('k_2h9m6'),
      date: '2026-04-09',
      wh: 4,
      poId: 3,
      poNo: 'PO20260402003',
      items: [
        {
          mid: 4,
          name: ts('k_17ac3e5'),
          spec: '600mm×200m',
          qty: 300,
          unit: ts('k_1v8rak6'),
          price: 85.0,
          batch: 'B20260409C',
        },
      ],
    },
    {
      no: 'IN20260415004',
      supplier: ts('k_tmtxw2'),
      date: '2026-04-15',
      wh: 1,
      poId: 4,
      poNo: 'PO20260403004',
      items: [
        {
          mid: 3,
          name: ts('k_st8b1b'),
          spec: '920×1100mm',
          qty: 400000,
          unit: ts('k_accfpb'),
          price: 6.5,
          batch: 'B20260415A',
        },
      ],
    },
    {
      no: 'IN20260412005',
      supplier: ts('k_wrmtv9'),
      date: '2026-04-12',
      wh: 4,
      poId: 5,
      poNo: 'PO20260404005',
      items: [
        {
          mid: 9,
          name: ts('k_1xbkp60'),
          spec: ts('k_1ikfdu9'),
          qty: 50,
          unit: 'kg',
          price: 120.0,
          batch: 'B20260412A',
        },
        {
          mid: 10,
          name: ts('k_1czvfki'),
          spec: 'SP-200',
          qty: 20,
          unit: 'kg',
          price: 180.0,
          batch: 'B20260412B',
        },
      ],
    },
  ];
  for (const io of inboundOrders) {
    let totalQty = 0;
    let totalAmt = 0;
    for (const item of io.items) {
      totalQty += item.qty;
      totalAmt += item.qty * item.price;
    }
    await conn.execute(
      ts('k_1ti4wo'),
      [io.no, io.supplier, io.date, io.wh, io.poId, io.poNo, totalQty, totalAmt]
    );
    const [rows] = (await conn.execute('SELECT LAST_INSERT_ID() as id')) as [DbRow[], unknown];
    const orderId = rows[0].id;
    for (const item of io.items) {
      await conn.execute(
        `INSERT INTO inv_inbound_item (order_id, material_id, material_name, material_spec, quantity, unit, unit_price, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.mid, item.name, item.spec, item.qty, item.unit, item.price, item.batch]
      );
    }
  }
  stats.inboundOrders = inboundOrders.length;

  const inventoryData = [
    {
      mid: 1,
      name: ts('k_1rrfno4'),
      wh: 1,
      whname: ts('k_tkxvoe'),
      qty: 412000,
      cost: 8.5,
      unit: ts('k_accfpb'),
    },
    {
      mid: 2,
      name: ts('k_t6u8hv'),
      wh: 1,
      whname: ts('k_tkxvoe'),
      qty: 200000,
      cost: 12.0,
      unit: ts('k_accfpb'),
    },
    {
      mid: 3,
      name: ts('k_st8b1b'),
      wh: 1,
      whname: ts('k_tkxvoe'),
      qty: 380000,
      cost: 6.5,
      unit: ts('k_accfpb'),
    },
    {
      mid: 4,
      name: ts('k_17ac3e5'),
      wh: 4,
      whname: ts('k_dw90w7'),
      qty: 280,
      cost: 85.0,
      unit: ts('k_1v8rak6'),
    },
    {
      mid: 5,
      name: ts('k_mzhdu8'),
      wh: 4,
      whname: ts('k_dw90w7'),
      qty: 450,
      cost: 65.0,
      unit: ts('k_1v8rak6'),
    },
    {
      mid: 6,
      name: ts('k_133reaf'),
      wh: 4,
      whname: ts('k_dw90w7'),
      qty: 92,
      cost: 85.0,
      unit: 'kg',
    },
    {
      mid: 7,
      name: ts('k_l9kfgb'),
      wh: 4,
      whname: ts('k_dw90w7'),
      qty: 68,
      cost: 95.0,
      unit: 'kg',
    },
    { mid: 8, name: ts('k_sonvqu'), wh: 4, whname: ts('k_dw90w7'), qty: 8, cost: 850.0, unit: 'kg' },
    { mid: 9, name: ts('k_1xbkp60'), wh: 4, whname: ts('k_dw90w7'), qty: 38, cost: 120.0, unit: 'kg' },
    {
      mid: 10,
      name: ts('k_1czvfki'),
      wh: 4,
      whname: ts('k_dw90w7'),
      qty: 15,
      cost: 180.0,
      unit: 'kg',
    },
  ];
  for (const inv of inventoryData) {
    await conn.execute(
      `INSERT INTO inv_inventory (material_id, material_name, warehouse_id, warehouse_name, quantity, available_qty, locked_qty, unit, unit_cost, total_cost, safety_stock, version) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 100, 1)`,
      [
        inv.mid,
        inv.name,
        inv.wh,
        inv.whname,
        inv.qty,
        inv.qty,
        inv.unit,
        inv.cost,
        inv.qty * inv.cost,
      ]
    );
  }
  stats.inventory = inventoryData.length;

  for (const inv of inventoryData) {
    const batchNo = `B${String(inv.mid).padStart(6, '0')}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    await conn.execute(
      `INSERT INTO inv_inventory_batch (batch_no, material_id, material_name, warehouse_id, warehouse_name, quantity, available_qty, locked_qty, unit, unit_price, inbound_date, status, version) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, CURDATE(), 'normal', 1)`,
      [batchNo, inv.mid, inv.name, inv.wh, inv.whname, inv.qty, inv.qty, inv.unit, inv.cost]
    );
  }
  stats.inventoryBatch = inventoryData.length;

  const materialLabels = [
    {
      no: 'RM-MAT001-001-20260408',
      po: 'PO20260401001',
      supplier: ts('k_12u5d5'),
      rdate: '2026-04-08',
      mcode: 'MAT001',
      mname: ts('k_1rrfno4'),
      spec: '1000×1200mm',
      unit: ts('k_accfpb'),
      batch: 'B20260408A',
      qty: 500000,
      wh: 1,
      isMain: 1,
      type: 1,
      width: 1000,
      length: 1200,
    },
    {
      no: 'RM-MAT002-001-20260408',
      po: 'PO20260401001',
      supplier: ts('k_12u5d5'),
      rdate: '2026-04-08',
      mcode: 'MAT002',
      mname: ts('k_t6u8hv'),
      spec: '1000×1200mm',
      unit: ts('k_accfpb'),
      batch: 'B20260408B',
      qty: 200000,
      wh: 1,
      isMain: 1,
      type: 1,
      width: 1000,
      length: 1200,
    },
    {
      no: 'RM-MAT006-001-20260409',
      po: 'PO20260401002',
      supplier: ts('k_165xuza'),
      rdate: '2026-04-09',
      mcode: 'MAT006',
      mname: ts('k_133reaf'),
      spec: ts('k_19sj1tx'),
      unit: 'kg',
      batch: 'B20260409A',
      qty: 100,
      wh: 4,
      isMain: 0,
      type: 1,
      width: null,
      length: null,
    },
    {
      no: 'RM-MAT008-001-20260409',
      po: 'PO20260401002',
      supplier: ts('k_165xuza'),
      rdate: '2026-04-09',
      mcode: 'MAT008',
      mname: ts('k_sonvqu'),
      spec: 'AG-500',
      unit: 'kg',
      batch: 'B20260409B',
      qty: 10,
      wh: 4,
      isMain: 0,
      type: 1,
      width: null,
      length: null,
    },
    {
      no: 'RM-MAT004-001-20260410',
      po: 'PO20260402003',
      supplier: ts('k_2h9m6'),
      rdate: '2026-04-10',
      mcode: 'MAT004',
      mname: ts('k_17ac3e5'),
      spec: '600mm×200m',
      unit: ts('k_1v8rak6'),
      batch: 'B20260410A',
      qty: 300,
      wh: 1,
      isMain: 1,
      type: 1,
      width: 600,
      length: 200000,
    },
    {
      no: 'RM-MAT005-001-20260410',
      po: 'PO20260402003',
      supplier: ts('k_2h9m6'),
      rdate: '2026-04-10',
      mcode: 'MAT005',
      mname: ts('k_mzhdu8'),
      spec: '600mm×200m',
      unit: ts('k_1v8rak6'),
      batch: 'B20260410B',
      qty: 500,
      wh: 1,
      isMain: 1,
      type: 1,
      width: 600,
      length: 200000,
    },
    {
      no: 'RM-MAT003-001-20260415',
      po: 'PO20260403004',
      supplier: ts('k_tmtxw2'),
      rdate: '2026-04-15',
      mcode: 'MAT003',
      mname: ts('k_st8b1b'),
      spec: '920×1100mm',
      unit: ts('k_accfpb'),
      batch: 'B20260415A',
      qty: 400000,
      wh: 1,
      isMain: 1,
      type: 1,
      width: 920,
      length: 1100,
    },
    {
      no: 'RM-MAT009-001-20260412',
      po: 'PO20260404005',
      supplier: ts('k_wrmtv9'),
      rdate: '2026-04-12',
      mcode: 'MAT009',
      mname: ts('k_1xbkp60'),
      spec: ts('k_1ikfdu9'),
      unit: 'kg',
      batch: 'B20260412A',
      qty: 50,
      wh: 4,
      isMain: 0,
      type: 1,
      width: null,
      length: null,
    },
    {
      no: 'RM-MAT010-001-20260412',
      po: 'PO20260404005',
      supplier: ts('k_wrmtv9'),
      rdate: '2026-04-12',
      mcode: 'MAT010',
      mname: ts('k_1czvfki'),
      spec: 'SP-200',
      unit: 'kg',
      batch: 'B20260412B',
      qty: 20,
      wh: 4,
      isMain: 0,
      type: 1,
      width: null,
      length: null,
    },
    {
      no: 'RM-MAT007-001-20260409',
      po: 'PO20260401002',
      supplier: ts('k_165xuza'),
      rdate: '2026-04-09',
      mcode: 'MAT007',
      mname: ts('k_l9kfgb'),
      spec: ts('k_8br3sf'),
      unit: 'kg',
      batch: 'B20260409C',
      qty: 80,
      wh: 4,
      isMain: 0,
      type: 1,
      width: null,
      length: null,
    },
  ];
  for (const ml of materialLabels) {
    await conn.execute(
      `INSERT INTO inv_material_label (label_no, qr_code, purchase_order_no, supplier_name, receive_date, material_code, material_name, specification, unit, batch_no, quantity, width, length_per_roll, warehouse_id, is_main_material, label_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        ml.no,
        ml.no,
        ml.po,
        ml.supplier,
        ml.rdate,
        ml.mcode,
        ml.mname,
        ml.spec,
        ml.unit,
        ml.batch,
        ml.qty,
        ml.width,
        ml.length,
        ml.wh,
        ml.isMain,
        ml.type,
      ]
    );
  }
  stats.materialLabels = materialLabels.length;

  const traceRecords = [
    {
      no: 'TR20260413001',
      cardNo: 'PC20260402001',
      woNo: 'WO20260401001',
      pcode: 'MAT011',
      mlId: 11,
      type: 1,
      opName: ts('k_16tz9yb'),
    },
    {
      no: 'TR20260414002',
      cardNo: 'PC20260402002',
      woNo: 'WO20260401002',
      pcode: 'MAT012',
      mlId: 12,
      type: 1,
      opName: ts('k_16tz9yb'),
    },
    {
      no: 'TR20260414003',
      cardNo: 'PC20260403003',
      woNo: 'WO20260402003',
      pcode: 'MAT013',
      mlId: 13,
      type: 2,
      opName: ts('k_1q7nsnd'),
    },
    {
      no: 'TR20260415004',
      cardNo: 'PC20260404005',
      woNo: 'WO20260403005',
      pcode: 'MAT015',
      mlId: 15,
      type: 1,
      opName: ts('k_yk85ne'),
    },
  ];
  for (const tr of traceRecords) {
    await conn.execute(
      `INSERT INTO inv_trace_record (trace_no, card_no, work_order_no, product_code, main_label_id, trace_type, operator_name) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tr.no, tr.cardNo, tr.woNo, tr.pcode, tr.mlId, tr.type, tr.opName]
    );
  }
  stats.traceRecords = traceRecords.length;

  const inkOpenings = [
    {
      no: 'INK20260402001',
      mid: 6,
      mcode: 'MAT006',
      mname: ts('k_133reaf'),
      batch: 'B20260409A',
      inkType: 'solvent',
      openTime: '2026-04-02 08:30:00',
      expireHours: 48,
      remainQty: 8,
      unit: 'kg',
      status: 2,
      opName: ts('k_m2zz7q'),
    },
    {
      no: 'INK20260402002',
      mid: 7,
      mcode: 'MAT007',
      mname: ts('k_l9kfgb'),
      batch: 'B20260409C',
      inkType: 'uv',
      openTime: '2026-04-02 09:00:00',
      expireHours: 168,
      remainQty: 12,
      unit: 'kg',
      status: 1,
      opName: ts('k_m2zz7q'),
    },
    {
      no: 'INK20260403003',
      mid: 8,
      mcode: 'MAT008',
      mname: ts('k_sonvqu'),
      batch: 'B20260409B',
      inkType: 'solvent',
      openTime: '2026-04-03 10:00:00',
      expireHours: 72,
      remainQty: 3,
      unit: 'kg',
      status: 1,
      opName: ts('k_m2zz7q'),
    },
    {
      no: 'INK20260404004',
      mid: 9,
      mcode: 'MAT009',
      mname: ts('k_1xbkp60'),
      batch: 'B20260412A',
      inkType: 'uv',
      openTime: '2026-04-04 14:00:00',
      expireHours: 168,
      remainQty: 15,
      unit: 'kg',
      status: 1,
      opName: ts('k_m2zz7q'),
    },
    {
      no: 'INK20260405005',
      mid: 6,
      mcode: 'MAT006',
      mname: ts('k_133reaf'),
      batch: 'B20260409A',
      inkType: 'solvent',
      openTime: '2026-04-05 08:00:00',
      expireHours: 48,
      remainQty: 5,
      unit: 'kg',
      status: 1,
      opName: ts('k_m2zz7q'),
    },
  ];
  for (const io of inkOpenings) {
    const expireTime = new Date(new Date(io.openTime).getTime() + io.expireHours * 3600000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    await conn.execute(
      `INSERT INTO ink_opening_record (record_no, material_id, material_code, material_name, batch_no, ink_type, open_time, expire_hours, expire_time, remaining_qty, unit, status, operator_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        io.no,
        io.mid,
        io.mcode,
        io.mname,
        io.batch,
        io.inkType,
        io.openTime,
        io.expireHours,
        expireTime,
        io.remainQty,
        io.unit,
        io.status,
        io.opName,
      ]
    );
  }
  stats.inkOpenings = inkOpenings.length;

  const scanLogs = [
    {
      type: 'cutting',
      qr: 'RM-MAT001-001-20260408',
      label: 'RM-MAT001-001-20260408',
      op: ts('k_1kbgydi'),
      result: 1,
      msg: ts('k_191s6x3'),
      opName: ts('k_dfpu9c'),
    },
    {
      type: 'process',
      qr: 'PC20260402001',
      label: 'PC20260402001',
      op: ts('k_1xygl3f'),
      result: 1,
      msg: ts('k_26f00i'),
      opName: ts('k_1kpsg7l'),
    },
    {
      type: 'trace',
      qr: 'MAT011',
      label: 'SL-MAT001-001-20260408-001',
      op: ts('k_1g1b5nq'),
      result: 1,
      msg: ts('k_3oe1k7'),
      opName: ts('k_16tz9yb'),
    },
    {
      type: 'cutting',
      qr: 'RM-MAT004-001-20260410',
      label: 'RM-MAT004-001-20260410',
      op: ts('k_1kbgydi'),
      result: 1,
      msg: ts('k_191s6x3'),
      opName: ts('k_4i4ny2'),
    },
    {
      type: 'process',
      qr: 'PC20260402002',
      label: 'PC20260402002',
      op: ts('k_1xygl3f'),
      result: 1,
      msg: ts('k_26f00i'),
      opName: ts('k_1kpsg7l'),
    },
  ];
  for (const sl of scanLogs) {
    await conn.execute(
      `INSERT INTO inv_scan_log (scan_type, qr_content, label_no, operation, result, message, operator_name) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sl.type, sl.qr, sl.label, sl.op, sl.result, sl.msg, sl.opName]
    );
  }
  stats.scanLogs = scanLogs.length;
}

export async function seedQualityData(conn: DbConnection, stats: Record<string, number>) {
  const ts = await getTranslations('Common');
  const inspections = [
    {
      no: 'QI20260408001',
      type: 1,
      source: ts('k_136sbj1'),
      sno: 'IN20260408001',
      mid: 1,
      batch: 'B20260408A',
      qty: 500000,
      qual: 499500,
      unqual: 500,
      result: 1,
    },
    {
      no: 'QI20260409002',
      type: 1,
      source: ts('k_136sbj1'),
      sno: 'IN20260409002',
      mid: 6,
      batch: 'B20260409A',
      qty: 100,
      qual: 100,
      unqual: 0,
      result: 1,
    },
    {
      no: 'QI20260409003',
      type: 1,
      source: ts('k_136sbj1'),
      sno: 'IN20260409003',
      mid: 4,
      batch: 'B20260409C',
      qty: 300,
      qual: 300,
      unqual: 0,
      result: 1,
    },
    {
      no: 'QI20260415004',
      type: 1,
      source: ts('k_136sbj1'),
      sno: 'IN20260415004',
      mid: 3,
      batch: 'B20260415A',
      qty: 400000,
      qual: 399800,
      unqual: 200,
      result: 1,
    },
    {
      no: 'QI20260410005',
      type: 2,
      source: ts('k_1dnbwip'),
      sno: 'WO20260401001',
      mid: 11,
      batch: 'B20260410A',
      qty: 10,
      qual: 10,
      unqual: 0,
      result: 1,
    },
    {
      no: 'QI20260411006',
      type: 2,
      source: ts('k_1dnbwip'),
      sno: 'WO20260401002',
      mid: 12,
      batch: 'B20260411A',
      qty: 10,
      qual: 10,
      unqual: 0,
      result: 1,
    },
    {
      no: 'QI20260412007',
      type: 3,
      source: ts('k_nwgik6'),
      sno: 'WO20260401001',
      mid: 11,
      batch: 'B20260410A',
      qty: 48800,
      qual: 48800,
      unqual: 0,
      result: 1,
    },
    {
      no: 'QI20260413008',
      type: 3,
      source: ts('k_nwgik6'),
      sno: 'WO20260401002',
      mid: 12,
      batch: 'B20260411A',
      qty: 29500,
      qual: 29500,
      unqual: 0,
      result: 1,
    },
    {
      no: 'QI20260414009',
      type: 3,
      source: ts('k_nwgik6'),
      sno: 'WO20260403005',
      mid: 15,
      batch: 'B20260414A',
      qty: 19800,
      qual: 19800,
      unqual: 0,
      result: 1,
    },
    {
      no: 'QI20260415010',
      type: 3,
      source: ts('k_nwgik6'),
      sno: 'WO20260403006',
      mid: 16,
      batch: 'B20260415A',
      qty: 97800,
      qual: 97800,
      unqual: 0,
      result: 1,
    },
  ];
  for (const qi of inspections) {
    await conn.execute(
      `INSERT INTO qc_inspection (inspection_no, inspection_type, source_type, source_no, material_id, batch_no, inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector, inspection_date, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), NOW())`,
      [
        qi.no,
        qi.type,
        qi.source,
        qi.sno,
        qi.mid,
        qi.batch,
        qi.qty,
        qi.qual,
        qi.unqual,
        qi.result,
        ts('k_xg00gk'),
      ]
    );
  }
  stats.inspections = inspections.length;

  const unqualifiedList = [
    {
      no: 'UQ20260408001',
      iid: 1,
      source: ts('k_136sbj1'),
      sno: 'IN20260408001',
      mid: 1,
      name: ts('k_1rrfno4'),
      qty: 500,
      dtype: ts('k_uc4c46'),
      desc: ts('k_1ghkxek'),
      handleType: 3,
      handleResult: 1,
      handler: ts('k_xg00gk'),
    },
    {
      no: 'UQ20260409002',
      iid: 2,
      source: ts('k_1abxvh9'),
      sno: 'WO20260401001',
      mid: 11,
      name: ts('k_1085ar9'),
      qty: 800,
      dtype: ts('k_1f857zp'),
      desc: ts('k_eu4g77'),
      handleType: 1,
      handleResult: 2,
      handler: ts('k_m41nb8'),
    },
    {
      no: 'UQ20260410003',
      iid: 3,
      source: ts('k_1abxvh9'),
      sno: 'WO20260401002',
      mid: 12,
      name: ts('k_1d31fut'),
      qty: 500,
      dtype: ts('k_bnrquk'),
      desc: ts('k_xdsdrq'),
      handleType: 1,
      handleResult: 2,
      handler: ts('k_m41nb8'),
    },
    {
      no: 'UQ20260415004',
      iid: 4,
      source: ts('k_nwgik6'),
      sno: 'WO20260403006',
      mid: 16,
      name: ts('k_18cwdu4'),
      qty: 700,
      dtype: ts('k_zzinqk'),
      desc: ts('k_1nlzkln'),
      handleType: 1,
      handleResult: 2,
      handler: ts('k_1aynav4'),
    },
    {
      no: 'UQ20260416005',
      iid: 5,
      source: ts('k_f6j4pr'),
      sno: 'RT20260416001',
      mid: 11,
      name: ts('k_1085ar9'),
      qty: 2000,
      dtype: ts('k_1f857zp'),
      desc: ts('k_1qn7jg4'),
      handleType: 2,
      handleResult: 1,
      handler: ts('k_13lyufz'),
    },
  ];
  for (const uq of unqualifiedList) {
    await conn.execute(
      `INSERT INTO qc_unqualified (unqualified_no, inspection_id, source_type, source_no, material_id, material_name, quantity, defect_type, defect_desc, handle_type, handle_result, handler, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        uq.no,
        uq.iid,
        uq.source,
        uq.sno,
        uq.mid,
        uq.name,
        uq.qty,
        uq.dtype,
        uq.desc,
        uq.handleType,
        uq.handleResult,
        uq.handler,
      ]
    );
  }
  stats.unqualified = unqualifiedList.length;
}

export async function seedFinancialData(
  conn: DbConnection,
  stats: Record<string, number>,
  deliveryOrders: Record<string, unknown>[]
) {
  const ts = await getTranslations('Common');
  const reconciliations = [
    {
      no: 'RC20260430001',
      cid: 1,
      cname: ts('k_gx8egb'),
      start: '2026-04-01',
      end: '2026-04-30',
      deliveryAmt: 122000,
      returnAmt: 5000,
      adjustAmt: 0,
      netAmt: 117000,
    },
    {
      no: 'RC20260430002',
      cid: 2,
      cname: ts('k_1xr1xyd'),
      start: '2026-04-01',
      end: '2026-04-30',
      deliveryAmt: 112100,
      returnAmt: 0,
      adjustAmt: 0,
      netAmt: 112100,
    },
    {
      no: 'RC20260430003',
      cid: 5,
      cname: ts('k_bxab2d'),
      start: '2026-04-01',
      end: '2026-04-30',
      deliveryAmt: 154440,
      returnAmt: 3900,
      adjustAmt: 0,
      netAmt: 150540,
    },
    {
      no: 'RC20260430004',
      cid: 6,
      cname: ts('k_1ycsj6e'),
      start: '2026-04-01',
      end: '2026-04-30',
      deliveryAmt: 132030,
      returnAmt: 0,
      adjustAmt: 0,
      netAmt: 132030,
    },
  ];
  for (const rc of reconciliations) {
    await conn.execute(
      `INSERT INTO sal_reconciliation (reconciliation_no, customer_id, customer_name, period_start, period_end, delivery_amount, return_amount, discount_amount, net_amount, status, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2, NOW())`,
      [
        rc.no,
        rc.cid,
        rc.cname,
        rc.start,
        rc.end,
        rc.deliveryAmt,
        rc.returnAmt,
        rc.adjustAmt,
        rc.netAmt,
      ]
    );
    const [rows] = (await conn.execute('SELECT LAST_INSERT_ID() as id')) as [DbRow[], unknown];
    const rcId = rows[0].id;
    const dnList = deliveryOrders.filter((d: Record<string, unknown>) => d.cid === rc.cid);
    for (const dn of dnList) {
      const [dnRows] = await conn.execute(
        'SELECT id, delivery_date, total_amount FROM sal_delivery WHERE delivery_no = ?',
        [dn.no]
      );
      if (dnRows.length > 0) {
        await conn.execute(
          `INSERT INTO sal_reconciliation_line (reconciliation_id, source_type, source_id, source_no, source_date, amount, create_time) VALUES (?, 1, ?, ?, ?, ?, NOW())`,
          [rcId, dnRows[0].id, dn.no, dnRows[0].delivery_date, dnRows[0].total_amount]
        );
      }
    }
  }
  stats.reconciliations = reconciliations.length;

  const receivables = [
    {
      no: 'AR20260415001',
      cid: 1,
      amt: 122000,
      received: 61000,
      balance: 61000,
      due: '2026-05-15',
    },
    { no: 'AR20260418002', cid: 2, amt: 112100, received: 0, balance: 112100, due: '2026-05-18' },
    {
      no: 'AR20260416003',
      cid: 5,
      amt: 154440,
      received: 77220,
      balance: 77220,
      due: '2026-05-16',
    },
    {
      no: 'AR20260417004',
      cid: 6,
      amt: 132030,
      received: 66015,
      balance: 66015,
      due: '2026-05-17',
    },
    { no: 'AR20260420005', cid: 3, amt: 67500, received: 0, balance: 67500, due: '2026-05-20' },
    { no: 'AR20260422006', cid: 4, amt: 385000, received: 0, balance: 385000, due: '2026-05-22' },
  ];
  for (const ar of receivables) {
    await conn.execute(
      `INSERT INTO fin_receivable (receivable_no, customer_id, amount, received_amount, balance, due_date, status, create_time) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [ar.no, ar.cid, ar.amt, ar.received, ar.balance, ar.due]
    );
  }
  stats.receivables = receivables.length;

  const payables = [
    {
      no: 'AP20260408001',
      sid: 1,
      amt: 6700000,
      paid: 3350000,
      balance: 3350000,
      due: '2026-05-08',
    },
    { no: 'AP20260409002', sid: 2, amt: 17000, paid: 0, balance: 17000, due: '2026-06-09' },
    { no: 'AP20260409003', sid: 3, amt: 25500, paid: 25500, balance: 0, due: '2026-04-09' },
    { no: 'AP20260415004', sid: 4, amt: 2600000, paid: 0, balance: 2600000, due: '2026-05-30' },
    { no: 'AP20260412005', sid: 5, amt: 9600, paid: 0, balance: 9600, due: '2026-05-12' },
  ];
  for (const ap of payables) {
    await conn.execute(
      `INSERT INTO fin_payable (payable_no, supplier_id, amount, paid_amount, balance, due_date, status, create_time) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [ap.no, ap.sid, ap.amt, ap.paid, ap.balance, ap.due]
    );
  }
  stats.payables = payables.length;

  const receiptRecords = [
    { no: 'RR20260415001', arId: 1, cid: 1, amt: 61000, method: ts('k_1uzoqwt'), date: '2026-04-15' },
    { no: 'RR20260416002', arId: 3, cid: 5, amt: 77220, method: ts('k_1uzoqwt'), date: '2026-04-16' },
    { no: 'RR20260417003', arId: 4, cid: 6, amt: 66015, method: ts('k_rstq44'), date: '2026-04-17' },
  ];
  for (const rr of receiptRecords) {
    await conn.execute(
      `INSERT INTO fin_receipt_record (receipt_no, receivable_id, customer_id, amount, payment_method, receipt_date, create_time) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [rr.no, rr.arId, rr.cid, rr.amt, rr.method, rr.date]
    );
  }
  stats.receiptRecords = receiptRecords.length;

  const paymentRecords = [
    { no: 'PR20260409001', apId: 3, sid: 3, amt: 25500, method: ts('k_1uzoqwt'), date: '2026-04-09' },
    {
      no: 'PR20260410002',
      apId: 1,
      sid: 1,
      amt: 3350000,
      method: ts('k_1uzoqwt'),
      date: '2026-04-10',
    },
  ];
  for (const pr of paymentRecords) {
    await conn.execute(
      `INSERT INTO fin_payment_record (payment_no, payable_id, supplier_id, amount, payment_method, payment_date, create_time) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [pr.no, pr.apId, pr.sid, pr.amt, pr.method, pr.date]
    );
  }
  stats.paymentRecords = paymentRecords.length;
}

export async function seedMaintenanceData(conn: DbConnection, stats: Record<string, number>) {
  const ts = await getTranslations('Common');
  const maintenancePlans = [
    {
      no: 'MP20260401001',
      eqId: 1,
      type: 2,
      cycleType: 3,
      cycleValue: 1,
      planDate: '2026-05-01',
      content: ts('k_1dw4wwv'),
    },
    {
      no: 'MP20260401002',
      eqId: 2,
      type: 2,
      cycleType: 3,
      cycleValue: 1,
      planDate: '2026-05-01',
      content: ts('k_lp9vri'),
    },
    {
      no: 'MP20260401003',
      eqId: 3,
      type: 3,
      cycleType: 4,
      cycleValue: 3,
      planDate: '2026-07-01',
      content: ts('k_vdx92m'),
    },
    {
      no: 'MP20260401004',
      eqId: 4,
      type: 2,
      cycleType: 3,
      cycleValue: 1,
      planDate: '2026-05-01',
      content: ts('k_1o0dxfc'),
    },
    {
      no: 'MP20260401005',
      eqId: 5,
      type: 2,
      cycleType: 3,
      cycleValue: 1,
      planDate: '2026-05-01',
      content: ts('k_1iz2ks6'),
    },
    {
      no: 'MP20260401006',
      eqId: 7,
      type: 2,
      cycleType: 3,
      cycleValue: 1,
      planDate: '2026-05-01',
      content: ts('k_uksfen'),
    },
    {
      no: 'MP20260401007',
      eqId: 9,
      type: 3,
      cycleType: 4,
      cycleValue: 3,
      planDate: '2026-07-01',
      content: ts('k_1dp0mgs'),
    },
    {
      no: 'MP20260401008',
      eqId: 10,
      type: 3,
      cycleType: 4,
      cycleValue: 3,
      planDate: '2026-07-01',
      content: ts('k_wn80ge'),
    },
  ];
  for (const mp of maintenancePlans) {
    await conn.execute(
      `INSERT INTO eqp_maintenance_plan (plan_no, equipment_id, maintenance_type, cycle_type, cycle_value, plan_date, content, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [mp.no, mp.eqId, mp.type, mp.cycleType, mp.cycleValue, mp.planDate, mp.content]
    );
  }
  stats.maintenancePlans = maintenancePlans.length;

  const maintenanceRecords = [
    {
      no: 'MR20260401001',
      eqId: 1,
      type: 2,
      start: '2026-04-01 08:00',
      end: '2026-04-01 17:00',
      content: ts('k_12v6gjz'),
      result: 1,
      cost: 800,
    },
    {
      no: 'MR20260401002',
      eqId: 2,
      type: 2,
      start: '2026-04-01 08:00',
      end: '2026-04-01 17:00',
      content: ts('k_10ew3t7'),
      result: 1,
      cost: 600,
    },
    {
      no: 'MR20260401003',
      eqId: 4,
      type: 2,
      start: '2026-04-01 08:00',
      end: '2026-04-01 17:00',
      content: ts('k_1dbnp0d'),
      result: 1,
      cost: 3500,
    },
    {
      no: 'MR20260401004',
      eqId: 5,
      type: 2,
      start: '2026-04-01 08:00',
      end: '2026-04-01 17:00',
      content: ts('k_q2knmk'),
      result: 1,
      cost: 2200,
    },
    {
      no: 'MR20260401005',
      eqId: 7,
      type: 2,
      start: '2026-04-01 08:00',
      end: '2026-04-01 17:00',
      content: ts('k_1orz82j'),
      result: 1,
      cost: 1500,
    },
  ];
  for (const mr of maintenanceRecords) {
    await conn.execute(
      `INSERT INTO eqp_maintenance_record (record_no, equipment_id, maintenance_type, maintenance_content, start_time, end_time, downtime_hours, cost, result, create_time) VALUES (?, ?, ?, ?, ?, ?, 8, ?, ?, NOW())`,
      [mr.no, mr.eqId, mr.type, mr.content, mr.start, mr.end, mr.cost, mr.result]
    );
  }
  stats.maintenanceRecords = maintenanceRecords.length;
}

export async function seedContactsAndLocations(conn: DbConnection, stats: Record<string, number>) {
  const ts = await getTranslations('Common');
  const locations = [
    { code: 'LOC-A1-01', name: ts('k_4ipif9'), wh: 1, zone: 'A', row: '1', col: '1', type: 1 },
    { code: 'LOC-A1-02', name: ts('k_18jlcl6'), wh: 1, zone: 'A', row: '1', col: '2', type: 1 },
    { code: 'LOC-A2-01', name: ts('k_1m96i12'), wh: 1, zone: 'A', row: '2', col: '1', type: 4 },
    { code: 'LOC-B1-01', name: ts('k_1b1738q'), wh: 2, zone: 'B', row: '1', col: '1', type: 3 },
    { code: 'LOC-B1-02', name: ts('k_ou29o5'), wh: 2, zone: 'B', row: '1', col: '2', type: 3 },
    { code: 'LOC-C1-01', name: ts('k_gblzcb'), wh: 3, zone: 'C', row: '1', col: '1', type: 2 },
    { code: 'LOC-C1-02', name: ts('k_gbro9g'), wh: 3, zone: 'C', row: '1', col: '2', type: 2 },
    { code: 'LOC-D1-01', name: ts('k_a7qv94'), wh: 4, zone: 'D', row: '1', col: '1', type: 1 },
    { code: 'LOC-D1-02', name: ts('k_njjsgv'), wh: 4, zone: 'D', row: '1', col: '2', type: 5 },
    { code: 'LOC-D2-01', name: ts('k_ifg1ej'), wh: 4, zone: 'D', row: '2', col: '1', type: 5 },
  ];
  for (const loc of locations) {
    await conn.execute(
      `INSERT INTO inv_location (location_code, location_name, warehouse_id, zone, row_no, column_no, location_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [loc.code, loc.name, loc.wh, loc.zone, loc.row, loc.col, loc.type]
    );
  }
  stats.locations = locations.length;

  const contacts = [
    {
      cid: 1,
      name: ts('k_100yj6q'),
      pos: ts('k_tguqd0'),
      phone: '0757-12345678',
      email: 'zhang@meidi.com',
      primary: 1,
    },
    {
      cid: 2,
      name: ts('k_1gqe670'),
      pos: ts('k_rso698'),
      phone: '0571-87654321',
      email: 'li@haier.com',
      primary: 1,
    },
    {
      cid: 3,
      name: ts('k_nxfiar'),
      pos: ts('k_4k0jzw'),
      phone: '0755-11223344',
      email: 'wang@huawei.com',
      primary: 1,
    },
    {
      cid: 4,
      name: ts('k_1r0ff3k'),
      pos: ts('k_xhecx9'),
      phone: '0755-55667788',
      email: 'zhao@byd.com',
      primary: 1,
    },
    {
      cid: 5,
      name: ts('k_1vsbiwa'),
      pos: ts('k_xqphzh'),
      phone: '010-99887766',
      email: 'chen@xiaomi.com',
      primary: 1,
    },
    {
      cid: 6,
      name: ts('k_fs3x2e'),
      pos: ts('k_1dse5pm'),
      phone: '0769-33445566',
      email: 'liu@oppo.com',
      primary: 1,
    },
    {
      cid: 7,
      name: ts('k_ydadml'),
      pos: ts('k_6msqwb'),
      phone: '021-66778899',
      email: 'sun@ge.com',
      primary: 1,
    },
    {
      cid: 8,
      name: ts('k_151y9ca'),
      pos: ts('k_tguqd0'),
      phone: '0755-44556677',
      email: 'zhou@dji.com',
      primary: 1,
    },
    {
      cid: 9,
      name: ts('k_bk6fhu'),
      pos: ts('k_1omw0fk'),
      phone: '0593-22334455',
      email: 'wu@catl.com',
      primary: 1,
    },
    {
      cid: 10,
      name: ts('k_11zgt9'),
      pos: ts('k_18zlinj'),
      phone: '010-11223344',
      email: 'zheng@baidu.com',
      primary: 1,
    },
  ];
  for (const c of contacts) {
    await conn.execute(
      `INSERT INTO crm_customer_contact (customer_id, contact_name, position, phone, email, is_primary) VALUES (?, ?, ?, ?, ?, ?)`,
      [c.cid, c.name, c.pos, c.phone, c.email, c.primary]
    );
  }
  stats.contacts = contacts.length;
}
