import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { queryOne, transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const POST = withPermission(
  async (_request: NextRequest) => {
  const ts = await getTranslations('Common');
    const result = await transaction(async (conn) => {
      const stats: Record<string, number> = {};

      await conn.execute('DELETE FROM prd_ink');
      await conn.execute('ALTER TABLE prd_ink AUTO_INCREMENT = 1');

      const inks = [
        {
          code: 'INK-UV-001',
          name: ts('k_16claxc'),
          type: 3,
          color_name: ts('k_1peuqkq'),
          color_code: 'BK001',
          brand: ts('k_1wbg6d5'),
          unit: 'KG',
          spec: ts('k_v98uoh'),
          safety_stock: 100,
          shelf_life: 12,
          stock_qty: 180,
          status: 1,
          remark: ts('k_xyzcbd'),
        },
        {
          code: 'INK-UV-002',
          name: ts('k_1goas4'),
          type: 3,
          color_name: ts('k_6hu6um'),
          color_code: 'WH001',
          brand: ts('k_1wbg6d5'),
          unit: 'KG',
          spec: ts('k_v98uoh'),
          safety_stock: 120,
          shelf_life: 12,
          stock_qty: 210,
          status: 1,
          remark: ts('k_1by1h9e'),
        },
        {
          code: 'INK-UV-003',
          name: ts('k_krmzjb'),
          type: 3,
          color_name: ts('k_1xpfks5'),
          color_code: 'RD001',
          brand: ts('k_syn2i3'),
          unit: 'KG',
          spec: ts('k_v98uoh'),
          safety_stock: 80,
          shelf_life: 12,
          stock_qty: 95,
          status: 1,
          remark: ts('k_1xz977y'),
        },
        {
          code: 'INK-UV-004',
          name: ts('k_1jnu9v4'),
          type: 3,
          color_name: ts('k_3atm1a'),
          color_code: 'BL001',
          brand: ts('k_syn2i3'),
          unit: 'KG',
          spec: ts('k_v98uoh'),
          safety_stock: 80,
          shelf_life: 12,
          stock_qty: 75,
          status: 1,
          remark: ts('k_v2fd0p'),
        },
        {
          code: 'INK-UV-005',
          name: ts('k_19eilff'),
          type: 3,
          color_name: ts('k_2g1g8k'),
          color_code: 'GN001',
          brand: ts('k_1x5qr52'),
          unit: 'KG',
          spec: ts('k_v98uoh'),
          safety_stock: 60,
          shelf_life: 12,
          stock_qty: 55,
          status: 1,
          remark: ts('k_cid3d8'),
        },
        {
          code: 'INK-SOL-001',
          name: ts('k_7hf3kg'),
          type: 2,
          color_name: ts('k_1peuqkq'),
          color_code: 'BK002',
          brand: ts('k_1wbg6d5'),
          unit: 'KG',
          spec: ts('k_o2dp1f'),
          safety_stock: 150,
          shelf_life: 18,
          stock_qty: 260,
          status: 1,
          remark: ts('k_1xvojg4'),
        },
        {
          code: 'INK-SOL-002',
          name: ts('k_v6w9lg'),
          type: 2,
          color_name: ts('k_6hu6um'),
          color_code: 'WH002',
          brand: ts('k_1wbg6d5'),
          unit: 'KG',
          spec: ts('k_o2dp1f'),
          safety_stock: 150,
          shelf_life: 18,
          stock_qty: 240,
          status: 1,
          remark: ts('k_is38hy'),
        },
        {
          code: 'INK-SOL-003',
          name: ts('k_7qg5hs'),
          type: 2,
          color_name: ts('k_1w1464q'),
          color_code: 'GD001',
          brand: ts('k_syn2i3'),
          unit: 'KG',
          spec: ts('k_v98uoh'),
          safety_stock: 50,
          shelf_life: 18,
          stock_qty: 42,
          status: 1,
          remark: ts('k_1iavlbk'),
        },
        {
          code: 'INK-SOL-004',
          name: ts('k_c2b6lf'),
          type: 2,
          color_name: ts('k_1sdxy3l'),
          color_code: 'SV001',
          brand: ts('k_syn2i3'),
          unit: 'KG',
          spec: ts('k_v98uoh'),
          safety_stock: 50,
          shelf_life: 18,
          stock_qty: 38,
          status: 1,
          remark: ts('k_1b5oo27'),
        },
        {
          code: 'INK-SOL-005',
          name: ts('k_wcmfxu'),
          type: 2,
          color_name: ts('k_1j92b77'),
          color_code: 'YL001',
          brand: ts('k_1x5qr52'),
          unit: 'KG',
          spec: ts('k_o2dp1f'),
          safety_stock: 70,
          shelf_life: 18,
          stock_qty: 88,
          status: 1,
          remark: ts('k_1rhjn7x'),
        },
        {
          code: 'INK-WB-001',
          name: ts('k_l9y2ij'),
          type: 1,
          color_name: ts('k_1peuqkq'),
          color_code: 'BK003',
          brand: ts('k_1q8rbtc'),
          unit: 'KG',
          spec: ts('k_o2dp1f'),
          safety_stock: 100,
          shelf_life: 6,
          stock_qty: 150,
          status: 1,
          remark: ts('k_162218h'),
        },
        {
          code: 'INK-WB-002',
          name: ts('k_tiu8t3'),
          type: 1,
          color_name: ts('k_6hu6um'),
          color_code: 'WH003',
          brand: ts('k_1q8rbtc'),
          unit: 'KG',
          spec: ts('k_o2dp1f'),
          safety_stock: 100,
          shelf_life: 6,
          stock_qty: 130,
          status: 1,
          remark: ts('k_1ek39ql'),
        },
        {
          code: 'INK-WB-003',
          name: ts('k_5lulx3'),
          type: 1,
          color_name: ts('k_3atm1a'),
          color_code: 'BL002',
          brand: ts('k_1q8rbtc'),
          unit: 'KG',
          spec: ts('k_o2dp1f'),
          safety_stock: 60,
          shelf_life: 6,
          stock_qty: 45,
          status: 1,
          remark: ts('k_1f8n78t'),
        },
        {
          code: 'INK-SCR-001',
          name: ts('k_133reaf'),
          type: 4,
          color_name: ts('k_1peuqkq'),
          color_code: 'BK004',
          brand: ts('k_1f7ydha'),
          unit: 'KG',
          spec: ts('k_v98uoh'),
          safety_stock: 80,
          shelf_life: 12,
          stock_qty: 120,
          status: 1,
          remark: ts('k_1v19haq'),
        },
        {
          code: 'INK-SCR-002',
          name: ts('k_l9kfgb'),
          type: 4,
          color_name: ts('k_6hu6um'),
          color_code: 'WH004',
          brand: ts('k_1f7ydha'),
          unit: 'KG',
          spec: ts('k_v98uoh'),
          safety_stock: 80,
          shelf_life: 12,
          stock_qty: 105,
          status: 1,
          remark: ts('k_1buwvy'),
        },
        {
          code: 'INK-SCR-003',
          name: ts('k_aagok0'),
          type: 4,
          color_name: ts('k_1xpfks5'),
          color_code: 'RD002',
          brand: ts('k_1f7ydha'),
          unit: 'KG',
          spec: ts('k_v98uoh'),
          safety_stock: 50,
          shelf_life: 12,
          stock_qty: 62,
          status: 1,
          remark: ts('k_1748iih'),
        },
        {
          code: 'INK-SP-001',
          name: ts('k_1h4p416'),
          type: 5,
          color_name: ts('k_1sdxy3l'),
          color_code: 'AG001',
          brand: ts('k_51q4lj'),
          unit: 'G',
          spec: ts('k_9xqoyw'),
          safety_stock: 50,
          shelf_life: 3,
          stock_qty: 85,
          status: 1,
          remark: ts('k_c9kajn'),
        },
        {
          code: 'INK-SP-002',
          name: ts('k_173vlh1'),
          type: 5,
          color_name: ts('k_1sdxy3l'),
          color_code: 'AG002',
          brand: ts('k_1iauxh0'),
          unit: 'G',
          spec: ts('k_9xqoyw'),
          safety_stock: 40,
          shelf_life: 3,
          stock_qty: 55,
          status: 1,
          remark: ts('k_s2amq4'),
        },
        {
          code: 'INK-SP-003',
          name: ts('k_1saw1wl'),
          type: 5,
          color_name: ts('k_1iyvpwb'),
          color_code: 'FL001',
          brand: ts('k_1wbg6d5'),
          unit: 'KG',
          spec: ts('k_v98uoh'),
          safety_stock: 30,
          shelf_life: 6,
          stock_qty: 28,
          status: 1,
          remark: ts('k_18qns10'),
        },
        {
          code: 'INK-SP-004',
          name: ts('k_xcjixo'),
          type: 5,
          color_name: ts('k_n5xjnm'),
          color_code: 'TC001',
          brand: ts('k_1x5qr52'),
          unit: 'KG',
          spec: ts('k_v98uoh'),
          safety_stock: 25,
          shelf_life: 6,
          stock_qty: 20,
          status: 0,
          remark: ts('k_12ujn2e'),
        },
      ];

      for (const ink of inks) {
        await conn.execute(
          `INSERT INTO prd_ink (ink_code, ink_name, ink_type, color_name, color_code, brand, unit, specification, safety_stock, shelf_life, stock_qty, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ink.code,
            ink.name,
            ink.type,
            ink.color_name,
            ink.color_code,
            ink.brand,
            ink.unit,
            ink.spec,
            ink.safety_stock,
            ink.shelf_life,
            ink.stock_qty,
            ink.status,
            ink.remark,
          ]
        );
      }
      stats.prd_ink = inks.length;

      return stats;
    });

    const verification = await verifyDataIntegrity();

    return successResponse(
      {
        stats: result,
        verification,
      },
      ts('k_1f9tcyi')
    );
  },
  { errorMessage: '初始化油墨种子数据失败' }
);

async function verifyDataIntegrity() {
  const errors: string[] = [];
  const details: Record<string, unknown> = {};

  const count = await queryOne('SELECT COUNT(*) as cnt FROM prd_ink WHERE deleted = 0');
  details.ink_count = count?.cnt || 0;
  if (details.ink_count !== 20) errors.push(`油墨数量不正确: 期望20, 实际${details.ink_count}`);

  const typeDist = await queryOne(`SELECT
    COALESCE(SUM(CASE WHEN ink_type = 1 THEN 1 ELSE 0 END), 0) as water_based,
    COALESCE(SUM(CASE WHEN ink_type = 2 THEN 1 ELSE 0 END), 0) as solvent,
    COALESCE(SUM(CASE WHEN ink_type = 3 THEN 1 ELSE 0 END), 0) as uv,
    COALESCE(SUM(CASE WHEN ink_type = 4 THEN 1 ELSE 0 END), 0) as screen,
    COALESCE(SUM(CASE WHEN ink_type = 5 THEN 1 ELSE 0 END), 0) as special
  FROM prd_ink WHERE deleted = 0`);
  details.type_distribution = typeDist;

  const statusDist = await queryOne(`SELECT
    COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0) as active,
    COALESCE(SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END), 0) as disabled
  FROM prd_ink WHERE deleted = 0`);
  details.status_distribution = statusDist;

  const totalStock = await queryOne(
    'SELECT COALESCE(SUM(stock_qty), 0) as total FROM prd_ink WHERE deleted = 0'
  );
  details.total_stock = totalStock?.total || 0;

  const lowStock = await queryOne(
    'SELECT COUNT(*) as cnt FROM prd_ink WHERE deleted = 0 AND stock_qty < safety_stock'
  );
  details.low_stock_count = lowStock?.cnt || 0;

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
