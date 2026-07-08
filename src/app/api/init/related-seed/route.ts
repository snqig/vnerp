import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const POST = withPermission(async (request: NextRequest) => {
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    await conn.execute('DELETE FROM prd_screen_plate');
    await conn.execute('ALTER TABLE prd_screen_plate AUTO_INCREMENT = 1');
    const screenPlates = [
      { code: 'SP-001', name: '手机标签网版A型', type: '丝网版', mesh: 200, spec: '500×400mm', max_use: 10000, remaining: 8000, maint: 30, remark: '华为手机标签专用' },
      { code: 'SP-002', name: '电池标签网版B型', type: '丝网版', mesh: 180, spec: '600×450mm', max_use: 8000, remaining: 6500, maint: 30, remark: '电池标签专用' },
      { code: 'SP-003', name: '电子产品网版C型', type: '丝网版', mesh: 250, spec: '450×350mm', max_use: 12000, remaining: 10000, maint: 25, remark: '电子产品标签' },
      { code: 'SP-004', name: '日化标签网版D型', type: '丝网版', mesh: 150, spec: '550×400mm', max_use: 9000, remaining: 7200, maint: 30, remark: '日化产品标签' },
      { code: 'SP-005', name: '食品标签网版E型', type: '丝网版', mesh: 200, spec: '480×380mm', max_use: 11000, remaining: 9500, maint: 25, remark: '食品标签专用' },
      { code: 'SP-006', name: '医药标签网版F型', type: '丝网版', mesh: 300, spec: '420×320mm', max_use: 15000, remaining: 13000, maint: 20, remark: '医药标签高精度' },
      { code: 'SP-007', name: '物流标签网版G型', type: '丝网版', mesh: 120, spec: '650×500mm', max_use: 7000, remaining: 5000, maint: 35, remark: '物流标签大面积' },
      { code: 'SP-008', name: '防伪标签网版H型', type: '丝网版', mesh: 350, spec: '380×280mm', max_use: 20000, remaining: 18000, maint: 15, remark: '防伪标签超高精度' },
      { code: 'SP-009', name: '汽车标签网版I型', type: '丝网版', mesh: 180, spec: '520×400mm', max_use: 8500, remaining: 6000, maint: 30, remark: '汽车标签耐高温' },
      { code: 'SP-010', name: '酒类标签网版J型', type: '丝网版', mesh: 220, spec: '460×360mm', max_use: 9500, remaining: 8000, maint: 25, remark: '酒类标签专用' },
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
      { code: 'DIE-001', name: '手机标签刀模A型', type: '平压平', spec: '500×400mm', max_use: 500000, remaining: 400000, maint: 60, remark: '华为手机标签专用' },
      { code: 'DIE-002', name: '电池标签刀模B型', type: '平压平', spec: '600×450mm', max_use: 450000, remaining: 350000, maint: 60, remark: '电池标签专用' },
      { code: 'DIE-003', name: '电子产品刀模C型', type: '圆压圆', spec: '450×350mm', max_use: 800000, remaining: 650000, maint: 45, remark: '电子产品标签' },
      { code: 'DIE-004', name: '日化标签刀模D型', type: '平压平', spec: '550×400mm', max_use: 400000, remaining: 300000, maint: 60, remark: '日化产品标签' },
      { code: 'DIE-005', name: '食品标签刀模E型', type: '圆压圆', spec: '480×380mm', max_use: 700000, remaining: 550000, maint: 45, remark: '食品标签专用' },
      { code: 'DIE-006', name: '医药标签刀模F型', type: '平压平', spec: '420×320mm', max_use: 350000, remaining: 280000, maint: 60, remark: '医药标签专用' },
      { code: 'DIE-007', name: '物流标签刀模G型', type: '圆压圆', spec: '650×500mm', max_use: 900000, remaining: 750000, maint: 30, remark: '物流标签大面积' },
      { code: 'DIE-008', name: '防伪标签刀模H型', type: '平压平', spec: '380×280mm', max_use: 300000, remaining: 250000, maint: 60, remark: '防伪标签高精度' },
      { code: 'DIE-009', name: '汽车标签刀模I型', type: '圆压圆', spec: '520×400mm', max_use: 600000, remaining: 480000, maint: 45, remark: '汽车标签耐高温' },
      { code: 'DIE-010', name: '酒类标签刀模J型', type: '平压平', spec: '460×360mm', max_use: 420000, remaining: 350000, maint: 60, remark: '酒类标签专用' },
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
      { no: 'EMP001', name: '张三', dept: '生产部', section: '印刷车间', position: '制表员' },
      { no: 'EMP002', name: '李四', dept: '品质部', section: '品质检验', position: '品管员' },
      { no: 'EMP003', name: '王五', dept: '生产部', section: '生产管理', position: '厂务主管' },
      { no: 'EMP004', name: '赵六', dept: '品质部', section: '品质审核', position: '审核员' },
      { no: 'EMP005', name: '钱七', dept: '销售部', section: '业务组', position: '业务员' },
      { no: 'EMP006', name: '孙八', dept: '管理层', section: '总经理室', position: '总经理' },
      { no: 'EMP007', name: '周九', dept: '生产部', section: '印刷车间', position: '印刷技师' },
      { no: 'EMP008', name: '吴十', dept: '品质部', section: '品质检验', position: '高级品管' },
      { no: 'EMP009', name: '郑冬', dept: '生产部', section: '后道加工', position: '厂务助理' },
      { no: 'EMP010', name: '陈明', dept: '销售部', section: '大客户组', position: '高级业务' },
    ];
    let empCount = 0;
    for (const emp of employees) {
      try {
        await conn.execute(
          `INSERT INTO sys_employee (employee_no, name, dept_name, section, position, status) VALUES (?, ?, ?, ?, ?, 1)`,
          [emp.no, emp.name, emp.dept, emp.section, emp.position]
        );
        empCount++;
      } catch (e: any) {
      }
    }
    stats.employees = empCount;

    return stats;
  });

  return successResponse(result, '关联种子数据初始化成功');
});
