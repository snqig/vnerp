import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { queryOne, transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
export const POST = withPermission(
  async (_request: NextRequest) => {
  const ts = await getTranslations('Common');
    const result = await transaction(async (conn) => {
      const stats: Record<string, number> = {};

      await conn.execute(ts('k_1v4epp2'));

      await conn.execute('DELETE FROM qc_final_inspection');
      await conn.execute('ALTER TABLE qc_final_inspection AUTO_INCREMENT = 1');
      await conn.execute('DELETE FROM prd_process_card');
      await conn.execute('ALTER TABLE prd_process_card AUTO_INCREMENT = 1');
      await conn.execute('DELETE FROM prd_standard_card');
      await conn.execute('ALTER TABLE prd_standard_card AUTO_INCREMENT = 1');

      const standardCards = [
        {
          card_no: 'SC20240501001',
          customer_name: ts('k_5lwcax'),
          customer_code: 'CUST001',
          product_name: ts('k_uhu3f6'),
          version: 'A',
          date: '2024-05-01',
          finished_size: '50×30mm',
          tolerance: '±0.1mm',
          material_name: ts('k_1fboxf5'),
          material_type: 'PET',
          process_flow1: ts('k_1o7ehgo'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_1034o47'),
          quality_manager: ts('k_uexn87'),
          packing_type: ts('k_ww5y89'),
          slice_per_box: '5000',
          slice_per_bundle: '500',
        },
        {
          card_no: 'SC20240502001',
          customer_name: ts('k_97eh4c'),
          customer_code: 'CUST002',
          product_name: ts('k_105tbzt'),
          version: 'B',
          date: '2024-05-02',
          finished_size: '80×40mm',
          tolerance: '±0.15mm',
          material_name: ts('k_v33ljd'),
          material_type: 'PVC',
          process_flow1: ts('k_1o7ehgo'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_tji4u4'),
          quality_manager: ts('k_1h5lhqb'),
          packing_type: ts('k_nsxpfq'),
          slice_per_box: '3000',
          slice_per_bundle: '300',
        },
        {
          card_no: 'SC20240503001',
          customer_name: ts('k_gx8egb'),
          customer_code: 'CUST003',
          product_name: ts('k_r4734d'),
          version: 'A',
          date: '2024-05-03',
          finished_size: '200×150mm',
          tolerance: '±0.2mm',
          material_name: ts('k_13fn8v5'),
          material_type: 'BOPP',
          process_flow1: ts('k_1h0s7kc'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_e7639v'),
          quality_manager: ts('k_1ajuies'),
          packing_type: ts('k_ww5y89'),
          slice_per_box: '2000',
          slice_per_bundle: '200',
        },
        {
          card_no: 'SC20240504001',
          customer_name: ts('k_1xr1xyd'),
          customer_code: 'CUST004',
          product_name: ts('k_15iq00c'),
          version: 'C',
          date: '2024-05-04',
          finished_size: '60×40mm',
          tolerance: '±0.1mm',
          material_name: ts('k_47qvzw'),
          material_type: ts('k_1qw7jwj'),
          process_flow1: ts('k_1o7ehgo'),
          process_flow2: ts('k_1gp8ztt'),
          print_type: ts('k_1qia5xw'),
          quality_manager: ts('k_uexn87'),
          packing_type: ts('k_nsxpfq'),
          slice_per_box: '4000',
          slice_per_bundle: '400',
        },
        {
          card_no: 'SC20240505001',
          customer_name: ts('k_1ycsj6e'),
          customer_code: 'CUST005',
          product_name: ts('k_1flkybq'),
          version: 'A',
          date: '2024-05-05',
          finished_size: '40×20mm',
          tolerance: '±0.08mm',
          material_name: ts('k_13zbzpd'),
          material_type: 'PE',
          process_flow1: ts('k_cyh2vd'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_1igi9d4'),
          quality_manager: ts('k_1h5lhqb'),
          packing_type: ts('k_ww5y89'),
          slice_per_box: '10000',
          slice_per_bundle: '1000',
        },
        {
          card_no: 'SC20240506001',
          customer_name: ts('k_1pjpzfi'),
          customer_code: 'CUST006',
          product_name: ts('k_19acnbc'),
          version: 'B',
          date: '2024-05-06',
          finished_size: '35×25mm',
          tolerance: '±0.1mm',
          material_name: ts('k_uuhicf'),
          material_type: 'PET',
          process_flow1: ts('k_1o7ehgo'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_1034o47'),
          quality_manager: ts('k_1ajuies'),
          packing_type: ts('k_ww5y89'),
          slice_per_box: '6000',
          slice_per_bundle: '600',
        },
        {
          card_no: 'SC20240507001',
          customer_name: ts('k_1pq323l'),
          customer_code: 'CUST007',
          product_name: ts('k_oy64h8'),
          version: 'A',
          date: '2024-05-07',
          finished_size: '45×30mm',
          tolerance: '±0.1mm',
          material_name: ts('k_v33ljd'),
          material_type: 'PVC',
          process_flow1: ts('k_1o7ehgo'),
          process_flow2: ts('k_1p0kpz3'),
          print_type: ts('k_tji4u4'),
          quality_manager: ts('k_uexn87'),
          packing_type: ts('k_nsxpfq'),
          slice_per_box: '4000',
          slice_per_bundle: '400',
        },
        {
          card_no: 'SC20240508001',
          customer_name: ts('k_2hg0zk'),
          customer_code: 'CUST008',
          product_name: ts('k_1usnbey'),
          version: 'D',
          date: '2024-05-08',
          finished_size: '100×60mm',
          tolerance: '±0.15mm',
          material_name: ts('k_13fn8v5'),
          material_type: 'BOPP',
          process_flow1: ts('k_1h0s7kc'),
          process_flow2: ts('k_1gp8ztt'),
          print_type: ts('k_1bisdfc'),
          quality_manager: ts('k_1h5lhqb'),
          packing_type: ts('k_nsxpfq'),
          slice_per_box: '2500',
          slice_per_bundle: '250',
        },
        {
          card_no: 'SC20240509001',
          customer_name: ts('k_14c5x1i'),
          customer_code: 'CUST009',
          product_name: ts('k_zj10tt'),
          version: 'A',
          date: '2024-05-09',
          finished_size: '120×80mm',
          tolerance: '±0.2mm',
          material_name: ts('k_47qvzw'),
          material_type: ts('k_1qw7jwj'),
          process_flow1: ts('k_1o7ehgo'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_1034o47'),
          quality_manager: ts('k_1ajuies'),
          packing_type: ts('k_ww5y89'),
          slice_per_box: '3000',
          slice_per_bundle: '300',
        },
        {
          card_no: 'SC20240510001',
          customer_name: ts('k_v06d6h'),
          customer_code: 'CUST010',
          product_name: ts('k_xauhyw'),
          version: 'B',
          date: '2024-05-10',
          finished_size: '70×50mm',
          tolerance: '±0.15mm',
          material_name: ts('k_1fboxf5'),
          material_type: 'PET',
          process_flow1: ts('k_cyh2vd'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_ka062l'),
          quality_manager: ts('k_uexn87'),
          packing_type: ts('k_ww5y89'),
          slice_per_box: '4500',
          slice_per_bundle: '450',
        },
        {
          card_no: 'SC20240511001',
          customer_name: ts('k_1g9uzn3'),
          customer_code: 'CUST011',
          product_name: ts('k_u9vuky'),
          version: 'A',
          date: '2024-05-11',
          finished_size: '55×35mm',
          tolerance: '±0.1mm',
          material_name: ts('k_1k0dx9z'),
          material_type: 'PVC',
          process_flow1: ts('k_1o7ehgo'),
          process_flow2: ts('k_1p0kpz3'),
          print_type: ts('k_1034o47'),
          quality_manager: ts('k_1h5lhqb'),
          packing_type: ts('k_nsxpfq'),
          slice_per_box: '5000',
          slice_per_bundle: '500',
        },
        {
          card_no: 'SC20240512001',
          customer_name: ts('k_17xewts'),
          customer_code: 'CUST012',
          product_name: ts('k_9l21s1'),
          version: 'C',
          date: '2024-05-12',
          finished_size: '30×20mm',
          tolerance: '±0.08mm',
          material_name: ts('k_13zbzpd'),
          material_type: 'PE',
          process_flow1: ts('k_1h0s7kc'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_e7639v'),
          quality_manager: ts('k_1ajuies'),
          packing_type: ts('k_ww5y89'),
          slice_per_box: '8000',
          slice_per_bundle: '800',
        },
        {
          card_no: 'SC20240513001',
          customer_name: ts('k_z6l3vn'),
          customer_code: 'CUST013',
          product_name: ts('k_1owwr3h'),
          version: 'A',
          date: '2024-05-13',
          finished_size: '65×45mm',
          tolerance: '±0.1mm',
          material_name: ts('k_uuhicf'),
          material_type: 'PET',
          process_flow1: ts('k_1o7ehgo'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_1034o47'),
          quality_manager: ts('k_uexn87'),
          packing_type: ts('k_nsxpfq'),
          slice_per_box: '3500',
          slice_per_bundle: '350',
        },
        {
          card_no: 'SC20240514001',
          customer_name: ts('k_1pza3xe'),
          customer_code: 'CUST014',
          product_name: ts('k_qmghk8'),
          version: 'B',
          date: '2024-05-14',
          finished_size: '90×60mm',
          tolerance: '±0.15mm',
          material_name: ts('k_v33ljd'),
          material_type: 'PVC',
          process_flow1: ts('k_1o7ehgo'),
          process_flow2: ts('k_1p0kpz3'),
          print_type: ts('k_tji4u4'),
          quality_manager: ts('k_1h5lhqb'),
          packing_type: ts('k_nsxpfq'),
          slice_per_box: '2800',
          slice_per_bundle: '280',
        },
        {
          card_no: 'SC20240515001',
          customer_name: ts('k_jmm7b1'),
          customer_code: 'CUST015',
          product_name: ts('k_1mgl5gw'),
          version: 'A',
          date: '2024-05-15',
          finished_size: '150×10mm',
          tolerance: '±0.1mm',
          material_name: ts('k_13fn8v5'),
          material_type: 'BOPP',
          process_flow1: ts('k_cyh2vd'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_1igi9d4'),
          quality_manager: ts('k_1ajuies'),
          packing_type: ts('k_ww5y89'),
          slice_per_box: '5000',
          slice_per_bundle: '500',
        },
        {
          card_no: 'SC20240516001',
          customer_name: ts('k_2gzd1r'),
          customer_code: 'CUST016',
          product_name: ts('k_15h7af1'),
          version: 'D',
          date: '2024-05-16',
          finished_size: '25×15mm',
          tolerance: '±0.05mm',
          material_name: ts('k_47qvzw'),
          material_type: ts('k_1qw7jwj'),
          process_flow1: ts('k_1o7ehgo'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_1034o47'),
          quality_manager: ts('k_uexn87'),
          packing_type: ts('k_ww5y89'),
          slice_per_box: '10000',
          slice_per_bundle: '1000',
        },
        {
          card_no: 'SC20240517001',
          customer_name: ts('k_10t68nv'),
          customer_code: 'CUST017',
          product_name: ts('k_1y1jkzo'),
          version: 'A',
          date: '2024-05-17',
          finished_size: '20×15mm',
          tolerance: '±0.05mm',
          material_name: ts('k_1fboxf5'),
          material_type: 'PET',
          process_flow1: ts('k_1h0s7kc'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_e7639v'),
          quality_manager: ts('k_1h5lhqb'),
          packing_type: ts('k_ww5y89'),
          slice_per_box: '12000',
          slice_per_bundle: '1200',
        },
        {
          card_no: 'SC20240518001',
          customer_name: ts('k_cwvc0j'),
          customer_code: 'CUST018',
          product_name: ts('k_1pr12gh'),
          version: 'B',
          date: '2024-05-18',
          finished_size: '18×12mm',
          tolerance: '±0.05mm',
          material_name: ts('k_1k0dx9z'),
          material_type: 'PVC',
          process_flow1: ts('k_1o7ehgo'),
          process_flow2: ts('k_1p0kpz3'),
          print_type: ts('k_1034o47'),
          quality_manager: ts('k_1ajuies'),
          packing_type: ts('k_nsxpfq'),
          slice_per_box: '8000',
          slice_per_bundle: '800',
        },
        {
          card_no: 'SC20240519001',
          customer_name: ts('k_1vr3lvt'),
          customer_code: 'CUST019',
          product_name: ts('k_yj6ld'),
          version: 'A',
          date: '2024-05-19',
          finished_size: '15×10mm',
          tolerance: '±0.03mm',
          material_name: ts('k_13zbzpd'),
          material_type: 'PE',
          process_flow1: ts('k_cyh2vd'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_1igi9d4'),
          quality_manager: ts('k_uexn87'),
          packing_type: ts('k_ww5y89'),
          slice_per_box: '15000',
          slice_per_bundle: '1500',
        },
        {
          card_no: 'SC20240520001',
          customer_name: ts('k_laykel'),
          customer_code: 'CUST020',
          product_name: ts('k_1yxmkcp'),
          version: 'C',
          date: '2024-05-20',
          finished_size: '22×18mm',
          tolerance: '±0.05mm',
          material_name: ts('k_uuhicf'),
          material_type: 'PET',
          process_flow1: ts('k_1o7ehgo'),
          process_flow2: ts('k_12b93ht'),
          print_type: ts('k_1034o47'),
          quality_manager: ts('k_1h5lhqb'),
          packing_type: ts('k_ww5y89'),
          slice_per_box: '9000',
          slice_per_bundle: '900',
        },
      ];

      for (const sc of standardCards) {
        await conn.execute(
          `INSERT INTO prd_standard_card (card_no, customer_name, customer_code, product_name, version, date, finished_size, tolerance, material_name, material_type, process_flow1, process_flow2, print_type, quality_manager, packing_type, slice_per_box, slice_per_bundle)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sc.card_no,
            sc.customer_name,
            sc.customer_code,
            sc.product_name,
            sc.version,
            sc.date,
            sc.finished_size,
            sc.tolerance,
            sc.material_name,
            sc.material_type,
            sc.process_flow1,
            sc.process_flow2,
            sc.print_type,
            sc.quality_manager,
            sc.packing_type,
            sc.slice_per_box,
            sc.slice_per_bundle,
          ]
        );
      }
      stats.prd_standard_card = standardCards.length;

      const [scRows] = await conn.execute(
        'SELECT id, customer_code FROM prd_standard_card ORDER BY id'
      );
      const scMap: Record<string, number> = {};
      for (const row of scRows) scMap[row.customer_code] = row.id;

      const processCards = [
        {
          card_no: 'PC20240501001',
          qr_code: 'QR-PC-001',
          work_order_no: 'WO20240501001',
          product_code: scMap['CUST001'],
          product_name: ts('k_uhu3f6'),
          material_spec: ts('k_1beoels'),
          work_order_date: '2024-05-01',
          plan_qty: 5000,
          main_label_no: 'ML001',
          burdening_status: 3,
          lock_status: 0,
          create_user_name: ts('k_mzyy00'),
        },
        {
          card_no: 'PC20240502001',
          qr_code: 'QR-PC-002',
          work_order_no: 'WO20240502001',
          product_code: scMap['CUST002'],
          product_name: ts('k_105tbzt'),
          material_spec: ts('k_1vpl6kp'),
          work_order_date: '2024-05-02',
          plan_qty: 3000,
          main_label_no: 'ML002',
          burdening_status: 3,
          lock_status: 0,
          create_user_name: ts('k_1j5okka'),
        },
        {
          card_no: 'PC20240503001',
          qr_code: 'QR-PC-003',
          work_order_no: 'WO20240503001',
          product_code: scMap['CUST003'],
          product_name: ts('k_r4734d'),
          material_spec: ts('k_1ttc2i1'),
          work_order_date: '2024-05-03',
          plan_qty: 2000,
          main_label_no: 'ML003',
          burdening_status: 3,
          lock_status: 0,
          create_user_name: ts('k_mk8u8j'),
        },
        {
          card_no: 'PC20240504001',
          qr_code: 'QR-PC-004',
          work_order_no: 'WO20240504001',
          product_code: scMap['CUST004'],
          product_name: ts('k_15iq00c'),
          material_spec: ts('k_zimokp'),
          work_order_date: '2024-05-04',
          plan_qty: 8000,
          main_label_no: 'ML004',
          burdening_status: 3,
          lock_status: 0,
          create_user_name: ts('k_mzyy00'),
        },
        {
          card_no: 'PC20240505001',
          qr_code: 'QR-PC-005',
          work_order_no: 'WO20240505001',
          product_code: scMap['CUST005'],
          product_name: ts('k_1flkybq'),
          material_spec: ts('k_xosan2'),
          work_order_date: '2024-05-05',
          plan_qty: 10000,
          main_label_no: 'ML005',
          burdening_status: 3,
          lock_status: 0,
          create_user_name: ts('k_1j5okka'),
        },
        {
          card_no: 'PC20240506001',
          qr_code: 'QR-PC-006',
          work_order_no: 'WO20240506001',
          product_code: scMap['CUST006'],
          product_name: ts('k_19acnbc'),
          material_spec: ts('k_65kdrf'),
          work_order_date: '2024-05-06',
          plan_qty: 6000,
          main_label_no: 'ML006',
          burdening_status: 3,
          lock_status: 0,
          create_user_name: ts('k_mk8u8j'),
        },
        {
          card_no: 'PC20240507001',
          qr_code: 'QR-PC-007',
          work_order_no: 'WO20240507001',
          product_code: scMap['CUST007'],
          product_name: ts('k_oy64h8'),
          material_spec: ts('k_1vpl6kp'),
          work_order_date: '2024-05-07',
          plan_qty: 4000,
          main_label_no: 'ML007',
          burdening_status: 3,
          lock_status: 0,
          create_user_name: ts('k_mzyy00'),
        },
        {
          card_no: 'PC20240508001',
          qr_code: 'QR-PC-008',
          work_order_no: 'WO20240508001',
          product_code: scMap['CUST008'],
          product_name: ts('k_1usnbey'),
          material_spec: ts('k_1ttc2i1'),
          work_order_date: '2024-05-08',
          plan_qty: 2500,
          main_label_no: 'ML008',
          burdening_status: 3,
          lock_status: 0,
          create_user_name: ts('k_1j5okka'),
        },
        {
          card_no: 'PC20240509001',
          qr_code: 'QR-PC-009',
          work_order_no: 'WO20240509001',
          product_code: scMap['CUST009'],
          product_name: ts('k_zj10tt'),
          material_spec: ts('k_zimokp'),
          work_order_date: '2024-05-09',
          plan_qty: 3500,
          main_label_no: 'ML009',
          burdening_status: 3,
          lock_status: 0,
          create_user_name: ts('k_mk8u8j'),
        },
        {
          card_no: 'PC20240510001',
          qr_code: 'QR-PC-010',
          work_order_no: 'WO20240510001',
          product_code: scMap['CUST010'],
          product_name: ts('k_xauhyw'),
          material_spec: ts('k_1beoels'),
          work_order_date: '2024-05-10',
          plan_qty: 4500,
          main_label_no: 'ML010',
          burdening_status: 3,
          lock_status: 0,
          create_user_name: ts('k_mzyy00'),
        },
        {
          card_no: 'PC20240511001',
          qr_code: 'QR-PC-011',
          work_order_no: 'WO20240511001',
          product_code: scMap['CUST011'],
          product_name: ts('k_u9vuky'),
          material_spec: ts('k_ivtki9'),
          work_order_date: '2024-05-11',
          plan_qty: 5500,
          main_label_no: 'ML011',
          burdening_status: 2,
          lock_status: 0,
          create_user_name: ts('k_1j5okka'),
        },
        {
          card_no: 'PC20240512001',
          qr_code: 'QR-PC-012',
          work_order_no: 'WO20240512001',
          product_code: scMap['CUST012'],
          product_name: ts('k_9l21s1'),
          material_spec: ts('k_xosan2'),
          work_order_date: '2024-05-12',
          plan_qty: 7000,
          main_label_no: 'ML012',
          burdening_status: 2,
          lock_status: 0,
          create_user_name: ts('k_mk8u8j'),
        },
        {
          card_no: 'PC20240513001',
          qr_code: 'QR-PC-013',
          work_order_no: 'WO20240513001',
          product_code: scMap['CUST013'],
          product_name: ts('k_1owwr3h'),
          material_spec: ts('k_65kdrf'),
          work_order_date: '2024-05-13',
          plan_qty: 3200,
          main_label_no: 'ML013',
          burdening_status: 2,
          lock_status: 0,
          create_user_name: ts('k_mzyy00'),
        },
        {
          card_no: 'PC20240514001',
          qr_code: 'QR-PC-014',
          work_order_no: 'WO20240514001',
          product_code: scMap['CUST014'],
          product_name: ts('k_qmghk8'),
          material_spec: ts('k_1vpl6kp'),
          work_order_date: '2024-05-14',
          plan_qty: 2800,
          main_label_no: 'ML014',
          burdening_status: 2,
          lock_status: 0,
          create_user_name: ts('k_1j5okka'),
        },
        {
          card_no: 'PC20240515001',
          qr_code: 'QR-PC-015',
          work_order_no: 'WO20240515001',
          product_code: scMap['CUST015'],
          product_name: ts('k_1mgl5gw'),
          material_spec: ts('k_1ttc2i1'),
          work_order_date: '2024-05-15',
          plan_qty: 4200,
          main_label_no: 'ML015',
          burdening_status: 2,
          lock_status: 0,
          create_user_name: ts('k_mk8u8j'),
        },
        {
          card_no: 'PC20240516001',
          qr_code: 'QR-PC-016',
          work_order_no: 'WO20240516001',
          product_code: scMap['CUST016'],
          product_name: ts('k_15h7af1'),
          material_spec: ts('k_zimokp'),
          work_order_date: '2024-05-16',
          plan_qty: 9000,
          main_label_no: 'ML016',
          burdening_status: 2,
          lock_status: 0,
          create_user_name: ts('k_mzyy00'),
        },
        {
          card_no: 'PC20240517001',
          qr_code: 'QR-PC-017',
          work_order_no: 'WO20240517001',
          product_code: scMap['CUST017'],
          product_name: ts('k_1y1jkzo'),
          material_spec: ts('k_1beoels'),
          work_order_date: '2024-05-17',
          plan_qty: 12000,
          main_label_no: 'ML017',
          burdening_status: 2,
          lock_status: 0,
          create_user_name: ts('k_1j5okka'),
        },
        {
          card_no: 'PC20240518001',
          qr_code: 'QR-PC-018',
          work_order_no: 'WO20240518001',
          product_code: scMap['CUST018'],
          product_name: ts('k_1pr12gh'),
          material_spec: ts('k_ivtki9'),
          work_order_date: '2024-05-18',
          plan_qty: 6500,
          main_label_no: 'ML018',
          burdening_status: 2,
          lock_status: 0,
          create_user_name: ts('k_mk8u8j'),
        },
        {
          card_no: 'PC20240519001',
          qr_code: 'QR-PC-019',
          work_order_no: 'WO20240519001',
          product_code: scMap['CUST019'],
          product_name: ts('k_yj6ld'),
          material_spec: ts('k_xosan2'),
          work_order_date: '2024-05-19',
          plan_qty: 15000,
          main_label_no: 'ML019',
          burdening_status: 2,
          lock_status: 0,
          create_user_name: ts('k_mzyy00'),
        },
        {
          card_no: 'PC20240520001',
          qr_code: 'QR-PC-020',
          work_order_no: 'WO20240520001',
          product_code: scMap['CUST020'],
          product_name: ts('k_1yxmkcp'),
          material_spec: ts('k_65kdrf'),
          work_order_date: '2024-05-20',
          plan_qty: 7500,
          main_label_no: 'ML020',
          burdening_status: 2,
          lock_status: 0,
          create_user_name: ts('k_1j5okka'),
        },
      ];

      for (const pc of processCards) {
        await conn.execute(
          `INSERT INTO prd_process_card (card_no, qr_code, work_order_no, product_code, product_name, material_spec, work_order_date, plan_qty, main_label_no, burdening_status, lock_status, create_user_name, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            pc.card_no,
            pc.qr_code,
            pc.work_order_no,
            pc.product_code,
            pc.product_name,
            pc.material_spec,
            pc.work_order_date,
            pc.plan_qty,
            pc.main_label_no,
            pc.burdening_status,
            pc.lock_status,
            pc.create_user_name,
          ]
        );
      }
      stats.prd_process_card = processCards.length;

      const [pcRows] = await conn.execute(
        'SELECT id, card_no, work_order_no, product_name, plan_qty FROM prd_process_card ORDER BY id'
      );
      const pcList: DbRow[] = pcRows;

      const inspectors = [ts('k_uexn87'), ts('k_1h5lhqb'), ts('k_1ajuies'), ts('k_a8t3vg'), ts('k_1dmpdhw')];
      const batchPrefix = 'B2024';

      for (let i = 0; i < 20; i++) {
        const pc = pcList[i];
        const planQty = Number(pc.plan_qty) || 5000;
        const isPass = i < 18;
        const qualifiedQty = isPass
          ? Math.floor(planQty * (0.98 + Math.random() * 0.02))
          : Math.floor(planQty * 0.7);
        const unqualifiedQty = planQty - qualifiedQty;
        const inspectionNo = `QFI-2024-${String(i + 1).padStart(5, '0')}`;
        const inspectionDate = `2024-${String(5 + Math.floor(i / 4)).padStart(2, '0')}-${String(10 + (i % 20)).padStart(2, '0')}`;
        const batchNo = `${batchPrefix}${String(i + 1).padStart(4, '0')}`;
        const productCode = `PRD-${String(i + 1).padStart(5, '0')}`;
        const workOrderNo = pc.work_order_no || `WO-${String(i + 1).padStart(5, '0')}`;
        const productName = pc.product_name || processCards[i].product_name;
        const inspectorName = inspectors[i % inspectors.length];
        const resultCode = isPass ? 1 : 2;

        await conn.execute(
          `INSERT INTO qc_final_inspection (inspection_no, inspection_date, work_order_id, work_order_no, product_id, product_code, product_name, batch_no, inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector_name, create_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inspectionNo,
            inspectionDate,
            pc.id,
            workOrderNo,
            processCards[i].product_code,
            productCode,
            productName,
            batchNo,
            planQty,
            qualifiedQty,
            unqualifiedQty,
            resultCode,
            inspectorName,
            1,
          ]
        );
      }
      stats.qc_final_inspection = 20;

      return stats;
    });

    const verification = await verifyDataIntegrity();

    return successResponse(
      {
        stats: result,
        verification,
      },
      ts('k_1kyzfi9')
    );
  },
  { errorMessage: '初始化终检种子数据失败' }
);

async function verifyDataIntegrity() {
  const errors: string[] = [];
  const details: Record<string, unknown> = {};

  const scCount = await queryOne('SELECT COUNT(*) as cnt FROM prd_standard_card WHERE deleted = 0');
  details.standard_card_count = scCount?.cnt || 0;
  if (details.standard_card_count !== 20)
    errors.push(`标准卡数量不正确: 期望20, 实际${details.standard_card_count}`);

  const pcCount = await queryOne('SELECT COUNT(*) as cnt FROM prd_process_card WHERE deleted = 0');
  details.process_card_count = pcCount?.cnt || 0;
  if (details.process_card_count !== 20)
    errors.push(`流程卡数量不正确: 期望20, 实际${details.process_card_count}`);

  const fiCount = await queryOne(
    'SELECT COUNT(*) as cnt FROM qc_final_inspection WHERE deleted = 0'
  );
  details.final_inspection_count = fiCount?.cnt || 0;
  if (details.final_inspection_count !== 20)
    errors.push(`终检记录数量不正确: 期望20, 实际${details.final_inspection_count}`);

  const statusDist = await queryOne(`SELECT
    COALESCE(SUM(CASE WHEN burdening_status = 2 THEN 1 ELSE 0 END), 0) as pending,
    COALESCE(SUM(CASE WHEN burdening_status = 3 THEN 1 ELSE 0 END), 0) as completed
  FROM prd_process_card WHERE deleted = 0`);
  details.process_card_status = statusDist;

  const resultDist = await queryOne(`SELECT
    COALESCE(SUM(CASE WHEN inspection_result = 1 THEN 1 ELSE 0 END), 0) as passed,
    COALESCE(SUM(CASE WHEN inspection_result = 2 THEN 1 ELSE 0 END), 0) as failed
  FROM qc_final_inspection WHERE deleted = 0`);
  details.inspection_result = resultDist;

  const totalQty = await queryOne(
    'SELECT COALESCE(SUM(plan_qty), 0) as total FROM prd_process_card WHERE deleted = 0'
  );
  details.total_plan_qty = totalQty?.total || 0;

  const totalQualified = await queryOne(
    'SELECT COALESCE(SUM(qualified_qty), 0) as total FROM qc_final_inspection WHERE deleted = 0'
  );
  details.total_qualified_qty = totalQualified?.total || 0;

  const totalUnqualified = await queryOne(
    'SELECT COALESCE(SUM(unqualified_qty), 0) as total FROM qc_final_inspection WHERE deleted = 0'
  );
  details.total_unqualified_qty = totalUnqualified?.total || 0;

  const orphanFi = await queryOne(
    'SELECT COUNT(*) as cnt FROM qc_final_inspection WHERE work_order_id IS NULL AND deleted = 0'
  );
  details.orphan_inspections = orphanFi?.cnt || 0;
  if (orphanFi?.cnt > 0) errors.push(`存在${orphanFi.cnt}条终检记录未关联工单`);

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
