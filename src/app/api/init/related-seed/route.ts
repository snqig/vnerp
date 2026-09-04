import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const POST = withPermission(async (_request: NextRequest) => {
  const ts = await getTranslations('Common');
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    await conn.execute('DELETE FROM prd_screen_plate');
    await conn.execute('ALTER TABLE prd_screen_plate AUTO_INCREMENT = 1');
    const screenPlates = [
      {
        code: 'SP-001',
        name: ts('k_mrpink'),
        type: ts('k_1c6y1m1'),
        mesh: 200,
        spec: '500×400mm',
        max_use: 10000,
        remaining: 8000,
        maint: 30,
        remark: ts('k_1t71vue'),
      },
      {
        code: 'SP-002',
        name: ts('k_1u8h5xb'),
        type: ts('k_1c6y1m1'),
        mesh: 180,
        spec: '600×450mm',
        max_use: 8000,
        remaining: 6500,
        maint: 30,
        remark: ts('k_6rxtl6'),
      },
      {
        code: 'SP-003',
        name: ts('k_1so1nmr'),
        type: ts('k_1c6y1m1'),
        mesh: 250,
        spec: '450×350mm',
        max_use: 12000,
        remaining: 10000,
        maint: 25,
        remark: ts('k_1cj6vh9'),
      },
      {
        code: 'SP-004',
        name: ts('k_zj2e37'),
        type: ts('k_1c6y1m1'),
        mesh: 150,
        spec: '550×400mm',
        max_use: 9000,
        remaining: 7200,
        maint: 30,
        remark: ts('k_m26viz'),
      },
      {
        code: 'SP-005',
        name: ts('k_406lvp'),
        type: ts('k_1c6y1m1'),
        mesh: 200,
        spec: '480×380mm',
        max_use: 11000,
        remaining: 9500,
        maint: 25,
        remark: ts('k_1398utf'),
      },
      {
        code: 'SP-006',
        name: ts('k_1lnbtbw'),
        type: ts('k_1c6y1m1'),
        mesh: 300,
        spec: '420×320mm',
        max_use: 15000,
        remaining: 13000,
        maint: 20,
        remark: ts('k_cic60i'),
      },
      {
        code: 'SP-007',
        name: ts('k_1qeje9h'),
        type: ts('k_1c6y1m1'),
        mesh: 120,
        spec: '650×500mm',
        max_use: 7000,
        remaining: 5000,
        maint: 35,
        remark: ts('k_1w90bc'),
      },
      {
        code: 'SP-008',
        name: ts('k_4xbw28'),
        type: ts('k_1c6y1m1'),
        mesh: 350,
        spec: '380×280mm',
        max_use: 20000,
        remaining: 18000,
        maint: 15,
        remark: ts('k_1fwysl'),
      },
      {
        code: 'SP-009',
        name: ts('k_8h0d3y'),
        type: ts('k_1c6y1m1'),
        mesh: 180,
        spec: '520×400mm',
        max_use: 8500,
        remaining: 6000,
        maint: 30,
        remark: ts('k_1c5v6hi'),
      },
      {
        code: 'SP-010',
        name: ts('k_rl2cyh'),
        type: ts('k_1c6y1m1'),
        mesh: 220,
        spec: '460×360mm',
        max_use: 9500,
        remaining: 8000,
        maint: 25,
        remark: ts('k_1efozwg'),
      },
    ];
    for (const sp of screenPlates) {
      await conn.execute(
        `INSERT INTO prd_screen_plate (plate_code, plate_name, plate_type, mesh_count, size_spec, max_use_count, remaining_count, maintenance_days, remark, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [sp.code, sp.name, sp.type, sp.mesh, sp.spec, sp.max_use, sp.remaining, sp.maint, sp.remark]
      );
    }
    stats.screen_plates = screenPlates.length;

    await conn.execute('DELETE FROM prd_die');
    await conn.execute('ALTER TABLE prd_die AUTO_INCREMENT = 1');
    const dies = [
      {
        code: 'DIE-001',
        name: ts('k_hrf6dm'),
        type: ts('k_zchq4o'),
        spec: '500×400mm',
        max_use: 500000,
        remaining: 400000,
        maint: 60,
        remark: ts('k_1t71vue'),
      },
      {
        code: 'DIE-002',
        name: ts('k_1s4jyyt'),
        type: ts('k_zchq4o'),
        spec: '600×450mm',
        max_use: 450000,
        remaining: 350000,
        maint: 60,
        remark: ts('k_6rxtl6'),
      },
      {
        code: 'DIE-003',
        name: ts('k_h2gnhp'),
        type: ts('k_1jhg6ds'),
        spec: '450×350mm',
        max_use: 800000,
        remaining: 650000,
        maint: 45,
        remark: ts('k_1cj6vh9'),
      },
      {
        code: 'DIE-004',
        name: ts('k_alsfcd'),
        type: ts('k_zchq4o'),
        spec: '550×400mm',
        max_use: 400000,
        remaining: 300000,
        maint: 60,
        remark: ts('k_m26viz'),
      },
      {
        code: 'DIE-005',
        name: ts('k_ezwqez'),
        type: ts('k_1jhg6ds'),
        spec: '480×380mm',
        max_use: 700000,
        remaining: 550000,
        maint: 45,
        remark: ts('k_1398utf'),
      },
      {
        code: 'DIE-006',
        name: ts('k_1jhc3dy'),
        type: ts('k_zchq4o'),
        spec: '420×320mm',
        max_use: 350000,
        remaining: 280000,
        maint: 60,
        remark: ts('k_1pvkji9'),
      },
      {
        code: 'DIE-007',
        name: ts('k_2ezbkn'),
        type: ts('k_1jhg6ds'),
        spec: '650×500mm',
        max_use: 900000,
        remaining: 750000,
        maint: 30,
        remark: ts('k_1w90bc'),
      },
      {
        code: 'DIE-008',
        name: ts('k_17tqrr2'),
        type: ts('k_zchq4o'),
        spec: '380×280mm',
        max_use: 300000,
        remaining: 250000,
        maint: 60,
        remark: ts('k_1jb4ong'),
      },
      {
        code: 'DIE-009',
        name: ts('k_p9amc0'),
        type: ts('k_1jhg6ds'),
        spec: '520×400mm',
        max_use: 600000,
        remaining: 480000,
        maint: 45,
        remark: ts('k_1c5v6hi'),
      },
      {
        code: 'DIE-010',
        name: ts('k_1snz8yn'),
        type: ts('k_zchq4o'),
        spec: '460×360mm',
        max_use: 420000,
        remaining: 350000,
        maint: 60,
        remark: ts('k_1efozwg'),
      },
    ];
    for (const d of dies) {
      await conn.execute(
        `INSERT INTO prd_die (die_code, die_name, die_type, size_spec, max_use_count, remaining_count, maintenance_days, remark, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [d.code, d.name, d.type, d.spec, d.max_use, d.remaining, d.maint, d.remark]
      );
    }
    stats.dies = dies.length;

    try {
      await conn.execute('DELETE FROM sys_employee');
      await conn.execute('ALTER TABLE sys_employee AUTO_INCREMENT = 1');
    } catch {}

    const employees = [
      { no: 'EMP001', name: ts('k_9zg2wy'), dept: ts('k_18glq49'), section: ts('k_jrjrsq'), position: ts('k_76u4q9') },
      { no: 'EMP002', name: ts('k_153eri6'), dept: ts('k_11g5fpo'), section: ts('k_sfgh94'), position: ts('k_1a47xi5') },
      { no: 'EMP003', name: ts('k_1i8i0ai'), dept: ts('k_18glq49'), section: ts('k_1e172y0'), position: ts('k_ivsh8c') },
      { no: 'EMP004', name: ts('k_pddxj'), dept: ts('k_11g5fpo'), section: ts('k_co8659'), position: ts('k_17dvhpo') },
      { no: 'EMP005', name: ts('k_1808thp'), dept: ts('k_1orob69'), section: ts('k_1xke7ls'), position: ts('k_15vw6tw') },
      { no: 'EMP006', name: ts('k_1knaijx'), dept: ts('k_836s2c'), section: ts('k_dvem8t'), position: ts('k_6msqwb') },
      { no: 'EMP007', name: ts('k_18mkbsu'), dept: ts('k_18glq49'), section: ts('k_jrjrsq'), position: ts('k_ohv8s0') },
      { no: 'EMP008', name: ts('k_1iu0yh2'), dept: ts('k_11g5fpo'), section: ts('k_sfgh94'), position: ts('k_bl4k1i') },
      { no: 'EMP009', name: ts('k_1fdvvxs'), dept: ts('k_18glq49'), section: ts('k_1ykcbn9'), position: ts('k_xy6amz') },
      { no: 'EMP010', name: ts('k_orolx7'), dept: ts('k_1orob69'), section: ts('k_1dyc8db'), position: ts('k_54vlul') },
    ];
    let empCount = 0;
    for (const emp of employees) {
      try {
        await conn.execute(
          `INSERT INTO sys_employee (employee_no, name, dept_name, section, position, status) VALUES (?, ?, ?, ?, ?, 1)`,
          [emp.no, emp.name, emp.dept, emp.section, emp.position]
        );
        empCount++;
      } catch (_e) {}
    }
    stats.employees = empCount;

    return stats;
  });

  return successResponse(result, ts('k_qqykg4'));
});
