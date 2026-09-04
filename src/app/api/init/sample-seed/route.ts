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

      await conn.execute('DELETE FROM sal_sample_order');
      await conn.execute('ALTER TABLE sal_sample_order AUTO_INCREMENT = 1');

      const sampleOrders = [
        {
          order_no: 'SP20240501001',
          notify_date: '2024-05-01',
          customer_name: ts('k_5lwcax'),
          product_name: ts('k_uhu3f6'),
          material_no: 'MAT-PET-001',
          version: 'A',
          size_spec: '50×30mm',
          material_spec: ts('k_1beoels'),
          quantity: 5000,
          customer_require_date: '2024-05-15',
          delivery_status: 'signed',
          remark: ts('k_mdahx4'),
        },
        {
          order_no: 'SP20240502001',
          notify_date: '2024-05-02',
          customer_name: ts('k_97eh4c'),
          product_name: ts('k_105tbzt'),
          material_no: 'MAT-PVC-001',
          version: 'B',
          size_spec: '80×40mm',
          material_spec: ts('k_1vpl6kp'),
          quantity: 3000,
          customer_require_date: '2024-05-18',
          delivery_status: 'signed',
          remark: ts('k_fg60c7'),
        },
        {
          order_no: 'SP20240503001',
          notify_date: '2024-05-03',
          customer_name: ts('k_gx8egb'),
          product_name: ts('k_r4734d'),
          material_no: 'MAT-BOPP-001',
          version: 'A',
          size_spec: '200×150mm',
          material_spec: ts('k_1ttc2i1'),
          quantity: 2000,
          customer_require_date: '2024-05-20',
          delivery_status: 'delivered',
          remark: ts('k_1w0tvdf'),
        },
        {
          order_no: 'SP20240504001',
          notify_date: '2024-05-04',
          customer_name: ts('k_1xr1xyd'),
          product_name: ts('k_15iq00c'),
          material_no: 'MAT-ADH-001',
          version: 'C',
          size_spec: '60×40mm',
          material_spec: ts('k_zimokp'),
          quantity: 8000,
          customer_require_date: '2024-05-22',
          delivery_status: 'signed',
          remark: ts('k_13pbhzn'),
        },
        {
          order_no: 'SP20240505001',
          notify_date: '2024-05-05',
          customer_name: ts('k_1ycsj6e'),
          product_name: ts('k_1flkybq'),
          material_no: 'MAT-PE-001',
          version: 'A',
          size_spec: '40×20mm',
          material_spec: ts('k_xosan2'),
          quantity: 10000,
          customer_require_date: '2024-05-25',
          delivery_status: 'signed',
          remark: ts('k_1gze7m4'),
        },
        {
          order_no: 'SP20240506001',
          notify_date: '2024-05-06',
          customer_name: ts('k_1pjpzfi'),
          product_name: ts('k_19acnbc'),
          material_no: 'MAT-PET-002',
          version: 'B',
          size_spec: '35×25mm',
          material_spec: ts('k_65kdrf'),
          quantity: 6000,
          customer_require_date: '2024-05-28',
          delivery_status: 'delivered',
          remark: ts('k_1c53nhs'),
        },
        {
          order_no: 'SP20240507001',
          notify_date: '2024-05-07',
          customer_name: ts('k_1pq323l'),
          product_name: ts('k_oy64h8'),
          material_no: 'MAT-PVC-002',
          version: 'A',
          size_spec: '45×30mm',
          material_spec: ts('k_1vpl6kp'),
          quantity: 4000,
          customer_require_date: '2024-05-30',
          delivery_status: 'signed',
          remark: ts('k_1y33mxk'),
        },
        {
          order_no: 'SP20240508001',
          notify_date: '2024-05-08',
          customer_name: ts('k_2hg0zk'),
          product_name: ts('k_1usnbey'),
          material_no: 'MAT-BOPP-001',
          version: 'D',
          size_spec: '100×60mm',
          material_spec: ts('k_1ttc2i1'),
          quantity: 2500,
          customer_require_date: '2024-06-02',
          delivery_status: 'delivered',
          remark: ts('k_swmmyl'),
        },
        {
          order_no: 'SP20240509001',
          notify_date: '2024-05-09',
          customer_name: ts('k_14c5x1i'),
          product_name: ts('k_zj10tt'),
          material_no: 'MAT-ADH-001',
          version: 'A',
          size_spec: '120×80mm',
          material_spec: ts('k_zimokp'),
          quantity: 3500,
          customer_require_date: '2024-06-05',
          delivery_status: 'signed',
          remark: ts('k_exelr0'),
        },
        {
          order_no: 'SP20240510001',
          notify_date: '2024-05-10',
          customer_name: ts('k_v06d6h'),
          product_name: ts('k_xauhyw'),
          material_no: 'MAT-PET-001',
          version: 'B',
          size_spec: '70×50mm',
          material_spec: ts('k_1beoels'),
          quantity: 4500,
          customer_require_date: '2024-06-08',
          delivery_status: 'delivered',
          remark: ts('k_wql2md'),
        },
        {
          order_no: 'SP20240511001',
          notify_date: '2024-05-11',
          customer_name: ts('k_1g9uzn3'),
          product_name: ts('k_u9vuky'),
          material_no: 'MAT-PVC-001',
          version: 'A',
          size_spec: '55×35mm',
          material_spec: ts('k_ivtki9'),
          quantity: 5500,
          customer_require_date: '2024-06-10',
          delivery_status: 'signed',
          remark: ts('k_1ehlk1u'),
        },
        {
          order_no: 'SP20240512001',
          notify_date: '2024-05-12',
          customer_name: ts('k_17xewts'),
          product_name: ts('k_9l21s1'),
          material_no: 'MAT-PE-001',
          version: 'C',
          size_spec: '30×20mm',
          material_spec: ts('k_xosan2'),
          quantity: 7000,
          customer_require_date: '2024-06-12',
          delivery_status: 'delivered',
          remark: ts('k_13sy0jz'),
        },
        {
          order_no: 'SP20240513001',
          notify_date: '2024-05-13',
          customer_name: ts('k_z6l3vn'),
          product_name: ts('k_1owwr3h'),
          material_no: 'MAT-PET-002',
          version: 'A',
          size_spec: '65×45mm',
          material_spec: ts('k_65kdrf'),
          quantity: 3200,
          customer_require_date: '2024-06-15',
          delivery_status: 'signed',
          remark: ts('k_w41c90'),
        },
        {
          order_no: 'SP20240514001',
          notify_date: '2024-05-14',
          customer_name: ts('k_1pza3xe'),
          product_name: ts('k_qmghk8'),
          material_no: 'MAT-PVC-002',
          version: 'B',
          size_spec: '90×60mm',
          material_spec: ts('k_1vpl6kp'),
          quantity: 2800,
          customer_require_date: '2024-06-18',
          delivery_status: 'delivered',
          remark: ts('k_1jitnd3'),
        },
        {
          order_no: 'SP20240515001',
          notify_date: '2024-05-15',
          customer_name: ts('k_jmm7b1'),
          product_name: ts('k_1mgl5gw'),
          material_no: 'MAT-BOPP-001',
          version: 'A',
          size_spec: '150×10mm',
          material_spec: ts('k_1ttc2i1'),
          quantity: 4200,
          customer_require_date: '2024-06-20',
          delivery_status: 'signed',
          remark: ts('k_1d5m2z'),
        },
        {
          order_no: 'SP20240516001',
          notify_date: '2024-05-16',
          customer_name: ts('k_2gzd1r'),
          product_name: ts('k_15h7af1'),
          material_no: 'MAT-ADH-001',
          version: 'D',
          size_spec: '25×15mm',
          material_spec: ts('k_zimokp'),
          quantity: 9000,
          customer_require_date: '2024-06-22',
          delivery_status: 'delivered',
          remark: ts('k_1siu5me'),
        },
        {
          order_no: 'SP20240517001',
          notify_date: '2024-05-17',
          customer_name: ts('k_10t68nv'),
          product_name: ts('k_1y1jkzo'),
          material_no: 'MAT-PET-001',
          version: 'A',
          size_spec: '20×15mm',
          material_spec: ts('k_1beoels'),
          quantity: 12000,
          customer_require_date: '2024-06-25',
          delivery_status: 'signed',
          remark: ts('k_qgejc7'),
        },
        {
          order_no: 'SP20240518001',
          notify_date: '2024-05-18',
          customer_name: ts('k_cwvc0j'),
          product_name: ts('k_1pr12gh'),
          material_no: 'MAT-PVC-001',
          version: 'B',
          size_spec: '18×12mm',
          material_spec: ts('k_ivtki9'),
          quantity: 6500,
          customer_require_date: '2024-06-28',
          delivery_status: 'delivered',
          remark: ts('k_s92zi8'),
        },
        {
          order_no: 'SP20240519001',
          notify_date: '2024-05-19',
          customer_name: ts('k_1vr3lvt'),
          product_name: ts('k_yj6ld'),
          material_no: 'MAT-PE-001',
          version: 'A',
          size_spec: '15×10mm',
          material_spec: ts('k_xosan2'),
          quantity: 15000,
          customer_require_date: '2024-07-01',
          delivery_status: 'signed',
          remark: ts('k_1l1z7qz'),
        },
        {
          order_no: 'SP20240520001',
          notify_date: '2024-05-20',
          customer_name: ts('k_laykel'),
          product_name: ts('k_1yxmkcp'),
          material_no: 'MAT-PET-002',
          version: 'C',
          size_spec: '22×18mm',
          material_spec: ts('k_65kdrf'),
          quantity: 7500,
          customer_require_date: '2024-07-05',
          delivery_status: 'pending',
          remark: ts('k_55vigb'),
        },
      ];

      for (const order of sampleOrders) {
        await conn.execute(
          `INSERT INTO sal_sample_order (order_no, notify_date, customer_name, product_name, material_no, version, size_spec, material_spec, quantity, customer_require_date, delivery_status, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            order.order_no,
            order.notify_date,
            order.customer_name,
            order.product_name,
            order.material_no,
            order.version,
            order.size_spec,
            order.material_spec,
            order.quantity,
            order.customer_require_date,
            order.delivery_status,
            order.remark,
          ]
        );
      }
      stats.sal_sample_order = sampleOrders.length;

      return stats;
    });

    const verification = await verifyDataIntegrity();

    return successResponse(
      {
        stats: result,
        verification,
      },
      ts('k_mjgm')
    );
  },
  { errorMessage: '初始化样品订单种子数据失败' }
);

async function verifyDataIntegrity() {
  const errors: string[] = [];
  const details: Record<string, unknown> = {};

  const count = await queryOne('SELECT COUNT(*) as cnt FROM sal_sample_order WHERE deleted = 0');
  details.sample_order_count = count?.cnt || 0;
  if (details.sample_order_count !== 20)
    errors.push(`样品订单数量不正确: 期望20, 实际${details.sample_order_count}`);

  const statusDist = await queryOne(`SELECT
    COALESCE(SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
    COALESCE(SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END), 0) as delivered,
    COALESCE(SUM(CASE WHEN delivery_status = 'signed' THEN 1 ELSE 0 END), 0) as signed
  FROM sal_sample_order WHERE deleted = 0`);
  details.status_distribution = statusDist;

  const totalQty = await queryOne(
    'SELECT COALESCE(SUM(quantity), 0) as total FROM sal_sample_order WHERE deleted = 0'
  );
  details.total_quantity = totalQty?.total || 0;

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
