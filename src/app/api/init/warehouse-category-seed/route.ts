import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, queryOne, transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const POST = withPermission(
  async (_request: NextRequest) => {
  const ts = await getTranslations('Common');
    const result = await transaction(async (conn) => {
      const stats: Record<string, number> = {};

      try {
        await conn.execute(
          ts('k_1mtj8gx')
        );
      } catch (_e) {}
      try {
        await conn.execute(`ALTER TABLE inv_warehouse ADD KEY idx_category_id (category_id)`);
      } catch (_e) {}

      try {
        await conn.execute(
          ts('k_10wmnf1')
        );
      } catch (_e) {}
      try {
        await conn.execute(
          ts('k_1lvfpxw')
        );
      } catch (_e) {}
      try {
        await conn.execute(
          ts('k_sq3k7j')
        );
      } catch (_e) {}

      await conn.execute('DELETE FROM inv_inventory');
      await conn.execute('ALTER TABLE inv_inventory AUTO_INCREMENT = 1');
      await conn.execute('DELETE FROM inv_material');
      await conn.execute('ALTER TABLE inv_material AUTO_INCREMENT = 1');
      await conn.execute('DELETE FROM inv_material_category');
      await conn.execute('ALTER TABLE inv_material_category AUTO_INCREMENT = 1');
      await conn.execute('DELETE FROM inv_warehouse');
      await conn.execute('ALTER TABLE inv_warehouse AUTO_INCREMENT = 1');
      await conn.execute('DELETE FROM sys_warehouse_category');
      await conn.execute('ALTER TABLE sys_warehouse_category AUTO_INCREMENT = 1');

      const warehouseCategories = [
        {
          code: 'WH-CAT-001',
          name: ts('k_tkxvoe'),
          description: ts('k_183l72z'),
          sort_order: 1,
        },
        {
          code: 'WH-CAT-002',
          name: ts('k_llwvwj'),
          description: ts('k_1i024zw'),
          sort_order: 2,
        },
        {
          code: 'WH-CAT-003',
          name: ts('k_93mh3v'),
          description: ts('k_1amdzmh'),
          sort_order: 3,
        },
        {
          code: 'WH-CAT-004',
          name: ts('k_6jdwbc'),
          description: ts('k_v1eexy'),
          sort_order: 4,
        },
        {
          code: 'WH-CAT-005',
          name: ts('k_359r5x'),
          description: ts('k_1li0atp'),
          sort_order: 5,
        },
        {
          code: 'WH-CAT-006',
          name: ts('k_mm26ai'),
          description: ts('k_3wneb5'),
          sort_order: 6,
        },
        {
          code: 'WH-CAT-007',
          name: ts('k_15ys8xk'),
          description: ts('k_1bqzwib'),
          sort_order: 7,
        },
        {
          code: 'WH-CAT-008',
          name: ts('k_1r16jah'),
          description: ts('k_1epu43v'),
          sort_order: 8,
        },
        {
          code: 'WH-CAT-009',
          name: ts('k_1degaw1'),
          description: ts('k_1fr0tat'),
          sort_order: 9,
        },
        {
          code: 'WH-CAT-010',
          name: ts('k_mjllii'),
          description: ts('k_1wyx3v2'),
          sort_order: 10,
        },
        {
          code: 'WH-CAT-011',
          name: ts('k_1u2d3kp'),
          description: ts('k_ubbxce'),
          sort_order: 11,
        },
        {
          code: 'WH-CAT-012',
          name: ts('k_b4io61'),
          description: ts('k_1f4b94z'),
          sort_order: 12,
        },
        {
          code: 'WH-CAT-013',
          name: ts('k_1kkagc2'),
          description: ts('k_1077hb6'),
          sort_order: 13,
        },
        {
          code: 'WH-CAT-014',
          name: ts('k_xwi5uk'),
          description: ts('k_17wwwdr'),
          sort_order: 14,
        },
        {
          code: 'WH-CAT-015',
          name: ts('k_1pwbrdf'),
          description: ts('k_kk9qqx'),
          sort_order: 15,
        },
        {
          code: 'WH-CAT-016',
          name: ts('k_ibhg2e'),
          description: ts('k_mke78k'),
          sort_order: 16,
        },
        {
          code: 'WH-CAT-017',
          name: ts('k_rdodnh'),
          description: ts('k_1xr3j3h'),
          sort_order: 17,
        },
        {
          code: 'WH-CAT-018',
          name: ts('k_154o9d2'),
          description: ts('k_6tg97p'),
          sort_order: 18,
        },
        {
          code: 'WH-CAT-019',
          name: ts('k_1vkyj18'),
          description: ts('k_1mtt0it'),
          sort_order: 19,
        },
        {
          code: 'WH-CAT-020',
          name: ts('k_ajgslm'),
          description: ts('k_189bm9w'),
          sort_order: 20,
        },
      ];
      for (const cat of warehouseCategories) {
        await conn.execute(
          `INSERT INTO sys_warehouse_category (code, name, description, sort_order, status) VALUES (?, ?, ?, ?, ?)`,
          [cat.code, cat.name, cat.description, cat.sort_order, 1]
        );
      }
      stats.sys_warehouse_category = warehouseCategories.length;

      const [whCatRows] = await conn.execute(
        'SELECT id, code FROM sys_warehouse_category ORDER BY id'
      );
      const whCatMap: Record<string, number> = {};
      for (const row of whCatRows) whCatMap[row.code] = row.id;

      const warehouses = [
        {
          code: 'WH-RM-001',
          name: ts('k_uve7mn'),
          type: 1,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_12oisap'),
          phone: '13800138001',
          remark: ts('k_14e84af'),
          catCode: 'WH-CAT-001',
        },
        {
          code: 'WH-RM-002',
          name: ts('k_14x33o5'),
          type: 1,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_2lozme'),
          phone: '13800138002',
          remark: ts('k_4lsc2t'),
          catCode: 'WH-CAT-001',
        },
        {
          code: 'WH-SF-001',
          name: ts('k_1cc1bjy'),
          type: 2,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_1eni05u'),
          phone: '13800138003',
          remark: ts('k_16ty2zt'),
          catCode: 'WH-CAT-002',
        },
        {
          code: 'WH-SF-002',
          name: ts('k_g5jetr'),
          type: 2,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_fp3bnh'),
          phone: '13800138004',
          remark: ts('k_ruezd0'),
          catCode: 'WH-CAT-002',
        },
        {
          code: 'WH-FG-001',
          name: ts('k_1r8s9m0'),
          type: 3,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_192nqye'),
          phone: '13800138005',
          remark: ts('k_xgbjxt'),
          catCode: 'WH-CAT-003',
        },
        {
          code: 'WH-FG-002',
          name: ts('k_1g1zkpj'),
          type: 3,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_a492g1'),
          phone: '13800138006',
          remark: ts('k_ybh4rq'),
          catCode: 'WH-CAT-003',
        },
        {
          code: 'WH-FL-001',
          name: ts('k_dkcgcf'),
          type: 4,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_h495b'),
          phone: '13800138007',
          remark: ts('k_19khe93'),
          catCode: 'WH-CAT-004',
        },
        {
          code: 'WH-FL-002',
          name: ts('k_nxprup'),
          type: 4,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_x7no2w'),
          phone: '13800138008',
          remark: ts('k_1v88lv4'),
          catCode: 'WH-CAT-004',
        },
        {
          code: 'WH-YM-001',
          name: ts('k_quybvc'),
          type: 5,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_1dn6a58'),
          phone: '13800138009',
          remark: ts('k_p4hbn1'),
          catCode: 'WH-CAT-005',
        },
        {
          code: 'WH-YM-002',
          name: ts('k_ef9bix'),
          type: 5,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_cgbj9v'),
          phone: '13800138010',
          remark: ts('k_1gz5ebp'),
          catCode: 'WH-CAT-005',
        },
        {
          code: 'WH-WH-001',
          name: ts('k_1hw1nn'),
          type: 6,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_yxakz6'),
          phone: '13800138011',
          remark: ts('k_mc68y3'),
          catCode: 'WH-CAT-006',
        },
        {
          code: 'WH-WH-002',
          name: ts('k_1je657z'),
          type: 6,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_1yy1731'),
          phone: '13800138012',
          remark: ts('k_mc68y3'),
          catCode: 'WH-CAT-006',
        },
        {
          code: 'WH-LC-001',
          name: ts('k_1dbpz55'),
          type: 7,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_1u7sra8'),
          phone: '13800138013',
          remark: ts('k_1moqhoo'),
          catCode: 'WH-CAT-007',
        },
        {
          code: 'WH-LC-002',
          name: ts('k_1tpsrwd'),
          type: 7,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_1wzcsav'),
          phone: '13800138014',
          remark: ts('k_1moqhoo'),
          catCode: 'WH-CAT-007',
        },
        {
          code: 'WH-DJ-001',
          name: ts('k_10qjmrr'),
          type: 8,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_1khj41w'),
          phone: '13800138015',
          remark: ts('k_124sujs'),
          catCode: 'WH-CAT-008',
        },
        {
          code: 'WH-DJ-002',
          name: ts('k_15otzrw'),
          type: 8,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_1itr6t7'),
          phone: '13800138016',
          remark: ts('k_hcxb4w'),
          catCode: 'WH-CAT-008',
        },
        {
          code: 'WH-TH-001',
          name: ts('k_uodyuc'),
          type: 9,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_1do0k9a'),
          phone: '13800138017',
          remark: ts('k_o08014'),
          catCode: 'WH-CAT-009',
        },
        {
          code: 'WH-TH-002',
          name: ts('k_p813ba'),
          type: 9,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_1e84sxl'),
          phone: '13800138018',
          remark: ts('k_1pzxxua'),
          catCode: 'WH-CAT-009',
        },
        {
          code: 'WH-FP-001',
          name: ts('k_j5262s'),
          type: 10,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_ydel3u'),
          phone: '13800138019',
          remark: ts('k_1gml79g'),
          catCode: 'WH-CAT-010',
        },
        {
          code: 'WH-FP-002',
          name: ts('k_1gr0xpg'),
          type: 10,
          province: ts('k_1m883h2'),
          city: ts('k_trhsn1'),
          address: ts('k_yxn8zp'),
          phone: '13800138020',
          remark: ts('k_su9olp'),
          catCode: 'WH-CAT-010',
        },
      ];
      for (const wh of warehouses) {
        await conn.execute(
          `INSERT INTO inv_warehouse (warehouse_code, warehouse_name, category_id, warehouse_type, province, city, address, contact_phone, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            wh.code,
            wh.name,
            whCatMap[wh.catCode] || null,
            wh.type,
            wh.province,
            wh.city,
            wh.address,
            wh.phone,
            wh.remark,
          ]
        );
      }
      stats.inv_warehouse = warehouses.length;

      const [whRows] = await conn.execute(
        'SELECT id, warehouse_code FROM inv_warehouse ORDER BY id'
      );
      const whMap: Record<string, number> = {};
      for (const row of whRows) whMap[row.warehouse_code] = row.id;

      const materialCategories = [
        {
          code: 'MATCAT-001',
          name: ts('k_1nvc7li'),
          parent_id: 0,
          type: 1,
          sort: 1,
          remark: ts('k_r54eu1'),
        },
        {
          code: 'MATCAT-002',
          name: ts('k_qa51ew'),
          parent_id: 0,
          type: 1,
          sort: 2,
          remark: ts('k_mkgwex'),
        },
        {
          code: 'MATCAT-003',
          name: ts('k_1486thi'),
          parent_id: 0,
          type: 1,
          sort: 3,
          remark: ts('k_zh8rkn'),
        },
        {
          code: 'MATCAT-004',
          name: ts('k_13zbzpd'),
          parent_id: 0,
          type: 1,
          sort: 4,
          remark: ts('k_17wly58'),
        },
        {
          code: 'MATCAT-005',
          name: ts('k_1vet0tv'),
          parent_id: 0,
          type: 1,
          sort: 5,
          remark: ts('k_14je6d9'),
        },
        {
          code: 'MATCAT-006',
          name: ts('k_445c63'),
          parent_id: 0,
          type: 2,
          sort: 6,
          remark: ts('k_brzyj6'),
        },
        {
          code: 'MATCAT-007',
          name: ts('k_chmbxj'),
          parent_id: 0,
          type: 2,
          sort: 7,
          remark: ts('k_1lednda'),
        },
        {
          code: 'MATCAT-008',
          name: ts('k_12htltx'),
          parent_id: 0,
          type: 2,
          sort: 8,
          remark: ts('k_tgcqqp'),
        },
        {
          code: 'MATCAT-009',
          name: ts('k_sonvqu'),
          parent_id: 0,
          type: 2,
          sort: 9,
          remark: ts('k_16evfj7'),
        },
        {
          code: 'MATCAT-010',
          name: ts('k_19g3g95'),
          parent_id: 0,
          type: 3,
          sort: 10,
          remark: ts('k_1kpywcj'),
        },
        {
          code: 'MATCAT-011',
          name: ts('k_8rm02u'),
          parent_id: 0,
          type: 3,
          sort: 11,
          remark: ts('k_147pcgw'),
        },
        {
          code: 'MATCAT-012',
          name: ts('k_o1n053'),
          parent_id: 0,
          type: 3,
          sort: 12,
          remark: ts('k_1xee3i2'),
        },
        {
          code: 'MATCAT-013',
          name: ts('k_1xbkp60'),
          parent_id: 0,
          type: 3,
          sort: 13,
          remark: ts('k_1arcldx'),
        },
        {
          code: 'MATCAT-014',
          name: ts('k_cf0xu4'),
          parent_id: 0,
          type: 3,
          sort: 14,
          remark: ts('k_1yjkhwx'),
        },
        {
          code: 'MATCAT-015',
          name: ts('k_19bsl0r'),
          parent_id: 0,
          type: 4,
          sort: 15,
          remark: ts('k_s7ph9n'),
        },
        {
          code: 'MATCAT-016',
          name: ts('k_bc1vi6'),
          parent_id: 0,
          type: 4,
          sort: 16,
          remark: ts('k_19b82rg'),
        },
        {
          code: 'MATCAT-017',
          name: ts('k_blsarv'),
          parent_id: 0,
          type: 3,
          sort: 17,
          remark: ts('k_ve8wko'),
        },
        {
          code: 'MATCAT-018',
          name: ts('k_wh590j'),
          parent_id: 0,
          type: 3,
          sort: 18,
          remark: ts('k_dqj6t8'),
        },
        {
          code: 'MATCAT-019',
          name: ts('k_awij9v'),
          parent_id: 0,
          type: 3,
          sort: 19,
          remark: ts('k_fbz4cp'),
        },
        {
          code: 'MATCAT-020',
          name: ts('k_zm48wv'),
          parent_id: 0,
          type: 3,
          sort: 20,
          remark: ts('k_vkq2zm'),
        },
      ];
      for (const cat of materialCategories) {
        await conn.execute(
          `INSERT INTO inv_material_category (category_code, category_name, parent_id, category_type, sort_order, remark) VALUES (?, ?, ?, ?, ?, ?)`,
          [cat.code, cat.name, cat.parent_id, cat.type, cat.sort, cat.remark]
        );
      }
      stats.inv_material_category = materialCategories.length;

      const [matCatRows] = await conn.execute(
        'SELECT id, category_code FROM inv_material_category ORDER BY id'
      );
      const matCatMap: Record<string, number> = {};
      for (const row of matCatRows) matCatMap[row.category_code] = row.id;

      const materials = [
        {
          code: 'MAT-PET-001',
          name: ts('k_1beoels'),
          spec: '0.1mm×1000mm',
          unit: 'KG',
          catCode: 'MATCAT-001',
          whCode: 'WH-RM-001',
          safety: 500,
          price: 25.5,
        },
        {
          code: 'MAT-PET-002',
          name: ts('k_65kdrf'),
          spec: '0.125mm×1000mm',
          unit: 'KG',
          catCode: 'MATCAT-001',
          whCode: 'WH-RM-001',
          safety: 400,
          price: 28.0,
        },
        {
          code: 'MAT-PVC-001',
          name: ts('k_ivtki9'),
          spec: '0.15mm×1200mm',
          unit: 'KG',
          catCode: 'MATCAT-002',
          whCode: 'WH-RM-002',
          safety: 350,
          price: 18.5,
        },
        {
          code: 'MAT-PVC-002',
          name: ts('k_1vpl6kp'),
          spec: '0.2mm×1200mm',
          unit: 'KG',
          catCode: 'MATCAT-002',
          whCode: 'WH-RM-002',
          safety: 300,
          price: 20.0,
        },
        {
          code: 'MAT-BOPP-001',
          name: ts('k_1ttc2i1'),
          spec: '0.08mm×1100mm',
          unit: 'KG',
          catCode: 'MATCAT-003',
          whCode: 'WH-RM-001',
          safety: 450,
          price: 15.0,
        },
        {
          code: 'MAT-PE-001',
          name: ts('k_xosan2'),
          spec: '0.05mm×1000mm',
          unit: 'KG',
          catCode: 'MATCAT-004',
          whCode: 'WH-RM-001',
          safety: 600,
          price: 12.0,
        },
        {
          code: 'MAT-ADH-001',
          name: ts('k_zimokp'),
          spec: '80g×1000mm',
          unit: 'KG',
          catCode: 'MATCAT-005',
          whCode: 'WH-RM-001',
          safety: 500,
          price: 22.0,
        },
        {
          code: 'MAT-UV-001',
          name: ts('k_76g1oh'),
          spec: ts('k_v98uoh'),
          unit: 'KG',
          catCode: 'MATCAT-006',
          whCode: 'WH-YM-001',
          safety: 100,
          price: 180.0,
        },
        {
          code: 'MAT-UV-002',
          name: ts('k_8ozpu5'),
          spec: ts('k_v98uoh'),
          unit: 'KG',
          catCode: 'MATCAT-006',
          whCode: 'WH-YM-001',
          safety: 120,
          price: 170.0,
        },
        {
          code: 'MAT-SOL-001',
          name: ts('k_6gy97h'),
          spec: ts('k_o2dp1f'),
          unit: 'KG',
          catCode: 'MATCAT-007',
          whCode: 'WH-YM-002',
          safety: 150,
          price: 95.0,
        },
        {
          code: 'MAT-SOL-002',
          name: ts('k_1xhgikx'),
          spec: ts('k_o2dp1f'),
          unit: 'KG',
          catCode: 'MATCAT-007',
          whCode: 'WH-YM-002',
          safety: 150,
          price: 90.0,
        },
        {
          code: 'MAT-WB-001',
          name: ts('k_l9y2ij'),
          spec: ts('k_o2dp1f'),
          unit: 'KG',
          catCode: 'MATCAT-008',
          whCode: 'WH-YM-001',
          safety: 100,
          price: 75.0,
        },
        {
          code: 'MAT-AG-001',
          name: ts('k_9ca8kw'),
          spec: ts('k_9xqoyw'),
          unit: 'G',
          catCode: 'MATCAT-009',
          whCode: 'WH-LC-001',
          safety: 50,
          price: 3500.0,
        },
        {
          code: 'MAT-SCR-001',
          name: ts('k_slr7j5'),
          spec: ts('k_1byet2g'),
          unit: 'PCS',
          catCode: 'MATCAT-010',
          whCode: 'WH-FL-001',
          safety: 30,
          price: 280.0,
        },
        {
          code: 'MAT-DIE-001',
          name: ts('k_z9vrjv'),
          spec: '500×400mm',
          unit: 'PCS',
          catCode: 'MATCAT-011',
          whCode: 'WH-FL-002',
          safety: 20,
          price: 650.0,
        },
        {
          code: 'MAT-THN-001',
          name: ts('k_12r70qc'),
          spec: ts('k_1n532ss'),
          unit: 'L',
          catCode: 'MATCAT-012',
          whCode: 'WH-WH-001',
          safety: 200,
          price: 35.0,
        },
        {
          code: 'MAT-VAR-001',
          name: ts('k_dac0h0'),
          spec: ts('k_o2dp1f'),
          unit: 'KG',
          catCode: 'MATCAT-013',
          whCode: 'WH-YM-001',
          safety: 80,
          price: 150.0,
        },
        {
          code: 'MAT-PKG-001',
          name: ts('k_1t0rka1'),
          spec: '400×300×200mm',
          unit: 'PCS',
          catCode: 'MATCAT-014',
          whCode: 'WH-FG-001',
          safety: 1000,
          price: 3.5,
        },
        {
          code: 'MAT-FG-001',
          name: ts('k_vr2rf6'),
          spec: '50×30mm',
          unit: 'PCS',
          catCode: 'MATCAT-015',
          whCode: 'WH-FG-001',
          safety: 10000,
          price: 0.15,
        },
        {
          code: 'MAT-FG-002',
          name: ts('k_6u6uez'),
          spec: '0.15mm×800mm',
          unit: 'KG',
          catCode: 'MATCAT-016',
          whCode: 'WH-FG-002',
          safety: 2000,
          price: 32.0,
        },
      ];
      for (const mat of materials) {
        await conn.execute(
          `INSERT INTO inv_material (material_code, material_name, specification, unit, category_id, warehouse_id, safety_stock, purchase_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            mat.code,
            mat.name,
            mat.spec,
            mat.unit,
            matCatMap[mat.catCode] || null,
            whMap[mat.whCode] || null,
            mat.safety,
            mat.price,
          ]
        );
      }
      stats.inv_material = materials.length;

      const [matRows] = await conn.execute(
        'SELECT id, material_code FROM inv_material ORDER BY id'
      );
      const matMap: Record<string, number> = {};
      for (const row of matRows) matMap[row.material_code] = row.id;

      const inventories = [
        {
          matCode: 'MAT-PET-001',
          whCode: 'WH-RM-001',
          qty: 850,
          locked: 50,
          batch: 'B20240501001',
        },
        {
          matCode: 'MAT-PET-002',
          whCode: 'WH-RM-001',
          qty: 620,
          locked: 30,
          batch: 'B20240502001',
        },
        {
          matCode: 'MAT-PVC-001',
          whCode: 'WH-RM-002',
          qty: 480,
          locked: 20,
          batch: 'B20240503001',
        },
        {
          matCode: 'MAT-PVC-002',
          whCode: 'WH-RM-002',
          qty: 390,
          locked: 15,
          batch: 'B20240504001',
        },
        {
          matCode: 'MAT-BOPP-001',
          whCode: 'WH-RM-001',
          qty: 720,
          locked: 40,
          batch: 'B20240505001',
        },
        { matCode: 'MAT-PE-001', whCode: 'WH-RM-001', qty: 950, locked: 60, batch: 'B20240506001' },
        {
          matCode: 'MAT-ADH-001',
          whCode: 'WH-RM-001',
          qty: 680,
          locked: 35,
          batch: 'B20240507001',
        },
        { matCode: 'MAT-UV-001', whCode: 'WH-YM-001', qty: 180, locked: 10, batch: 'B20240508001' },
        { matCode: 'MAT-UV-002', whCode: 'WH-YM-001', qty: 210, locked: 15, batch: 'B20240509001' },
        {
          matCode: 'MAT-SOL-001',
          whCode: 'WH-YM-002',
          qty: 260,
          locked: 20,
          batch: 'B20240510001',
        },
        {
          matCode: 'MAT-SOL-002',
          whCode: 'WH-YM-002',
          qty: 240,
          locked: 18,
          batch: 'B20240511001',
        },
        { matCode: 'MAT-WB-001', whCode: 'WH-YM-001', qty: 150, locked: 8, batch: 'B20240512001' },
        { matCode: 'MAT-AG-001', whCode: 'WH-LC-001', qty: 85, locked: 5, batch: 'B20240513001' },
        { matCode: 'MAT-SCR-001', whCode: 'WH-FL-001', qty: 45, locked: 3, batch: 'B20240514001' },
        { matCode: 'MAT-DIE-001', whCode: 'WH-FL-002', qty: 32, locked: 2, batch: 'B20240515001' },
        {
          matCode: 'MAT-THN-001',
          whCode: 'WH-WH-001',
          qty: 350,
          locked: 25,
          batch: 'B20240516001',
        },
        {
          matCode: 'MAT-VAR-001',
          whCode: 'WH-YM-001',
          qty: 130,
          locked: 10,
          batch: 'B20240517001',
        },
        {
          matCode: 'MAT-PKG-001',
          whCode: 'WH-FG-001',
          qty: 2500,
          locked: 200,
          batch: 'B20240518001',
        },
        {
          matCode: 'MAT-FG-001',
          whCode: 'WH-FG-001',
          qty: 18000,
          locked: 500,
          batch: 'B20240519001',
        },
        {
          matCode: 'MAT-FG-002',
          whCode: 'WH-FG-002',
          qty: 4500,
          locked: 300,
          batch: 'B20240520001',
        },
      ];
      for (const inv of inventories) {
        await conn.execute(
          `INSERT INTO inv_inventory (material_id, warehouse_id, quantity, locked_qty, available_qty, batch_no)
         VALUES (?, ?, ?, ?, ?, ?)`,
          [
            matMap[inv.matCode] || null,
            whMap[inv.whCode] || null,
            inv.qty,
            inv.locked,
            inv.qty - inv.locked,
            inv.batch,
          ]
        );
      }
      stats.inv_inventory = inventories.length;

      return stats;
    });

    const verification = await verifyDataIntegrity();

    return successResponse(
      {
        stats: result,
        verification,
      },
      ts('k_kh1rbm')
    );
  },
  { errorMessage: '初始化仓库分类种子数据失败' }
);

async function verifyDataIntegrity() {
  const errors: string[] = [];
  const details: Record<string, unknown> = {};

  const whCatCount = await queryOne(
    'SELECT COUNT(*) as cnt FROM sys_warehouse_category WHERE deleted = 0'
  );
  details.warehouse_category_count = whCatCount?.cnt || 0;
  if (details.warehouse_category_count !== 20)
    errors.push(`仓库分类数量不正确: 期望20, 实际${details.warehouse_category_count}`);

  const whCount = await queryOne('SELECT COUNT(*) as cnt FROM inv_warehouse WHERE deleted = 0');
  details.warehouse_count = whCount?.cnt || 0;
  if (details.warehouse_count !== 20)
    errors.push(`仓库数量不正确: 期望20, 实际${details.warehouse_count}`);

  const matCatCount = await queryOne(
    'SELECT COUNT(*) as cnt FROM inv_material_category WHERE deleted = 0'
  );
  details.material_category_count = matCatCount?.cnt || 0;
  if (details.material_category_count !== 20)
    errors.push(`物料分类数量不正确: 期望20, 实际${details.material_category_count}`);

  const matCount = await queryOne('SELECT COUNT(*) as cnt FROM inv_material WHERE deleted = 0');
  details.material_count = matCount?.cnt || 0;
  if (details.material_count !== 20)
    errors.push(`物料数量不正确: 期望20, 实际${details.material_count}`);

  const invCount = await queryOne('SELECT COUNT(*) as cnt FROM inv_inventory WHERE deleted = 0');
  details.inventory_count = invCount?.cnt || 0;
  if (details.inventory_count !== 20)
    errors.push(`库存数量不正确: 期望20, 实际${details.inventory_count}`);

  const orphanWh = await query(
    'SELECT id, warehouse_code FROM inv_warehouse WHERE category_id IS NULL AND deleted = 0'
  );
  details.orphan_warehouses = orphanWh?.length || 0;
  if (orphanWh?.length > 0) errors.push(`存在${orphanWh.length}个仓库未关联分类`);

  const orphanMat = await query(
    'SELECT id, material_code FROM inv_material WHERE category_id IS NULL AND deleted = 0'
  );
  details.orphan_materials = orphanMat?.length || 0;
  if (orphanMat?.length > 0) errors.push(`存在${orphanMat.length}个物料未关联分类`);

  const orphanInv = await query(
    'SELECT id FROM inv_inventory WHERE (material_id IS NULL OR warehouse_id IS NULL) AND deleted = 0'
  );
  details.orphan_inventory = orphanInv?.length || 0;
  if (orphanInv?.length > 0) errors.push(`存在${orphanInv.length}条库存未关联物料或仓库`);

  const totalQty = await queryOne(
    'SELECT COALESCE(SUM(quantity), 0) as total FROM inv_inventory WHERE deleted = 0'
  );
  details.total_inventory_quantity = totalQty?.total || 0;

  const totalValue = await queryOne(`
    SELECT COALESCE(SUM(i.quantity * m.purchase_price), 0) as total
    FROM inv_inventory i
    JOIN inv_material m ON i.material_id = m.id
    WHERE i.deleted = 0 AND m.deleted = 0
  `);
  details.total_inventory_value = totalValue?.total || 0;

  return { valid: errors.length === 0, errors, details };
}

export const GET = withPermission(
  async (_request: NextRequest) => {
  const ts = await getTranslations('Common');
    const verification = await verifyDataIntegrity();
    return successResponse(verification, ts('k_eyiz73'));
  },
  { errorMessage: '验证数据完整性失败' }
);
