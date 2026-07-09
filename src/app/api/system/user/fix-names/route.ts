import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

const CORRECT_DATA: Record<
  string,
  { name: string; dept_name: string; position: string; email: string; phone: string }
> = {
  E2024001: {
    name: '张达昌',
    dept_name: '总经办',
    position: '总经理',
    email: 'zhang@dachang.com',
    phone: '13800138001',
  },
  E2024002: {
    name: '李行政',
    dept_name: '行政部',
    position: '行政经理',
    email: 'li@dachang.com',
    phone: '13800138002',
  },
  E2024003: {
    name: '王财务',
    dept_name: '财务部',
    position: '财务经理',
    email: 'wang@dachang.com',
    phone: '13800138003',
  },
  E2024004: {
    name: '赵人事',
    dept_name: '人力资源部',
    position: '人事经理',
    email: 'zhao@dachang.com',
    phone: '13800138004',
  },
  E2024005: {
    name: '钱销售',
    dept_name: '销售部',
    position: '销售经理',
    email: 'qian@dachang.com',
    phone: '13800138005',
  },
  E2024006: {
    name: '孙生产',
    dept_name: '生产部',
    position: '生产经理',
    email: 'sun@dachang.com',
    phone: '13800138006',
  },
  E2024007: {
    name: '周技术',
    dept_name: '技术部',
    position: '技术经理',
    email: 'zhou@dachang.com',
    phone: '13800138007',
  },
  E2024008: {
    name: '吴品质',
    dept_name: '品质部',
    position: '品质经理',
    email: 'wu@dachang.com',
    phone: '13800138008',
  },
  E2024009: {
    name: '郑采购',
    dept_name: '采购部',
    position: '采购经理',
    email: 'zheng@dachang.com',
    phone: '13800138009',
  },
  E2024010: {
    name: '陈仓储',
    dept_name: '仓储部',
    position: '仓库主管',
    email: 'chen@dachang.com',
    phone: '13800138010',
  },
  E2024011: {
    name: '林印刷',
    dept_name: '印刷车间',
    position: '印刷机长',
    email: 'lin@dachang.com',
    phone: '13800138011',
  },
  E2024012: {
    name: '黄后道',
    dept_name: '后道车间',
    position: '后道组长',
    email: 'huang@dachang.com',
    phone: '13800138012',
  },
};

const EMP_PREFIX_MAP: Record<string, string> = {};
Object.keys(CORRECT_DATA).forEach((key) => {
  EMP_PREFIX_MAP['EMP' + key.substring(1)] = key;
});

export const POST = withPermission(
  async (_request: NextRequest, _userInfo) => {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, message: 'Not available in production' },
        { status: 403 }
      );
    }

    try {
      const employees: Loose = await query(
        'SELECT id, employee_no, name, dept_name, position, email, phone FROM sys_employee'
      );

      const results: {
        employee_no: string;
        old_name: string;
        new_name: string;
        updated: boolean;
      }[] = [];
      let empUpdated = 0;
      let userUpdated = 0;

      for (const emp of employees) {
        const empNo = emp.employee_no;
        const correctKey = EMP_PREFIX_MAP[empNo] || (CORRECT_DATA[empNo] ? empNo : null);
        const correct = correctKey ? CORRECT_DATA[correctKey] : null;

        if (correct && emp.name !== correct.name) {
          await execute(
            'UPDATE sys_employee SET name = ?, dept_name = ?, position = ?, email = ?, phone = ? WHERE id = ?',
            [
              correct.name,
              correct.dept_name,
              correct.position,
              correct.email,
              correct.phone,
              emp.id,
            ]
          );
          empUpdated++;

          await execute(
            'UPDATE sys_user SET real_name = ? WHERE username COLLATE utf8mb4_unicode_ci = ? AND deleted = 0',
            [correct.name, empNo]
          );
          userUpdated++;

          results.push({
            employee_no: empNo,
            old_name: emp.name,
            new_name: correct.name,
            updated: true,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `修正完成：员工表 ${empUpdated} 条，用户表 ${userUpdated} 条`,
        details: results,
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, message: (error as Error).message },
        { status: 500 }
      );
    }
  },
  { logTitle: '修正员工数据', logType: 'system' }
);
