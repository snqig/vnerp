import { NextRequest, NextResponse } from 'next/server';
import { execute, query } from '@/lib/db';
import { withPermission } from '@/lib/api-permissions';

const CORRECT_DATA: Record<
  string,
  { name: string; dept_name: string; position: string; email: string; phone: string }
> = {
  E2024001: {
    name: tc('text_emlny'),
    dept_name: tc('text_epfze'),
    position: tc('text_epmky'),
    email: 'zhang@dachang.com',
    phone: '13800138001',
  },
  E2024002: {
    name: tc('text_fsgn5'),
    dept_name: tc('text_kgpg5'),
    position: tc('text_hmbgzu'),
    email: 'li@dachang.com',
    phone: '13800138002',
  },
  E2024003: {
    name: tc('text_hlpqi'),
    dept_name: tc('text_l31ft'),
    position: tc('text_i5jspi'),
    email: 'wang@dachang.com',
    phone: '13800138003',
  },
  E2024004: {
    name: tc('text_l3pza'),
    dept_name: tc('text_ypco2j'),
    position: tc('text_a9l6nc'),
    email: 'zhao@dachang.com',
    phone: '13800138004',
  },
  E2024005: {
    name: tc('text_mhuvz'),
    dept_name: tc('text_m8ygq'),
    position: tc('text_j5n8hx'),
    email: 'qian@dachang.com',
    phone: '13800138005',
  },
  E2024006: {
    name: tc('text_dy0zl'),
    dept_name: tc('text_hjr0g'),
    position: tc('text_f3xthb'),
    email: 'sun@dachang.com',
    phone: '13800138006',
  },
  E2024007: {
    name: tc('text_cue53'),
    dept_name: tc('text_exqft'),
    position: tc('text_cuzbpi'),
    email: 'zhou@dachang.com',
    phone: '13800138007',
  },
  E2024008: {
    name: tc('text_cr6wr'),
    dept_name: tc('text_d3pkx'),
    position: tc('text_ba4l3y'),
    email: 'wu@dachang.com',
    phone: '13800138008',
  },
  E2024009: {
    name: tc('text_lx6mv'),
    dept_name: tc('text_m1hlu'),
    position: tc('text_iz7pwd'),
    email: 'zheng@dachang.com',
    phone: '13800138009',
  },
  E2024010: {
    name: tc('text_mea2l'),
    dept_name: tc('text_by5hv'),
    position: tc('text_ac5giu'),
    email: 'chen@dachang.com',
    phone: '13800138010',
  },
  E2024011: {
    name: tc('text_fkvby'),
    dept_name: tc('text_avlm51'),
    position: tc('text_aves24'),
    email: 'lin@dachang.com',
    phone: '13800138011',
  },
  E2024012: {
    name: tc('text_no98p'),
    dept_name: tc('text_b7i043'),
    position: tc('text_b7f668'),
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
      const employees: any = await query(
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
    } catch (error: any) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  },
  { logTitle: '修正员工数据', logType: 'system' }
);
