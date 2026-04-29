import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { CommonValidations, Validator } from '@/lib/validation';

// 获取薪资列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || format(new Date(), 'yyyy-MM');
    const deptId = searchParams.get('deptId');
    const keyword = searchParams.get('keyword');

    // 验证月份格式
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, message: '月份格式不正确，应为 yyyy-MM' },
        { status: 400 }
      );
    }

    // 查询员工薪资数据
    let sql = `
      SELECT 
        e.id,
        e.employee_no,
        e.name,
        e.gender,
        e.dept_id,
        e.dept_name,
        e.position,
        e.entry_date,
        e.status,
        s.id as salary_id,
        s.month,
        s.basic_salary,
        s.position_allowance,
        s.performance_bonus,
        s.overtime_pay,
        s.other_bonus,
        s.social_security,
        s.housing_fund,
        s.personal_tax,
        s.other_deduction,
        s.actual_salary,
        s.remark
      FROM sys_employee e
      LEFT JOIN sys_salary s ON e.id = s.employee_id AND s.month = ?
      WHERE e.status = 1
    `;

    const params: any[] = [month];

    if (deptId) {
      // 验证部门ID
      const deptIdNum = parseInt(deptId);
      if (isNaN(deptIdNum) || deptIdNum < 1) {
        return NextResponse.json(
          { success: false, message: '部门ID格式不正确' },
          { status: 400 }
        );
      }
      sql += ` AND e.dept_id = ?`;
      params.push(deptIdNum);
    }

    if (keyword) {
      // 验证关键词长度
      if (keyword.length > 100) {
        return NextResponse.json(
          { success: false, message: '搜索关键词过长' },
          { status: 400 }
        );
      }
      sql += ` AND (e.name LIKE ? OR e.employee_no LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ` ORDER BY e.dept_id, e.employee_no`;

    const salaries = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: salaries,
    });
  } catch (error) {
    console.error('获取薪资列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取薪资列表失败' },
      { status: 500 }
    );
  }
}

// 保存薪资记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 输入验证
    const validation = CommonValidations.salary(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const {
      employeeId,
      month,
      basicSalary,
      positionAllowance,
      performanceBonus,
      overtimePay,
      otherBonus,
      socialSecurity,
      housingFund,
      personalTax,
      otherDeduction,
      remark,
    } = body;

    // 验证员工是否存在
    const [employee] = await query(
      `SELECT id FROM sys_employee WHERE id = ? AND status = 1`,
      [employeeId]
    );

    if (!employee) {
      return NextResponse.json(
        { success: false, message: '员工不存在或已停用' },
        { status: 400 }
      );
    }

    // 验证薪资金额不能为负数
    const salaryFields = [
      { name: '基本工资', value: basicSalary },
      { name: '岗位津贴', value: positionAllowance },
      { name: '绩效奖金', value: performanceBonus },
      { name: '加班费', value: overtimePay },
      { name: '其他奖金', value: otherBonus },
      { name: '社保', value: socialSecurity },
      { name: '公积金', value: housingFund },
      { name: '个人所得税', value: personalTax },
      { name: '其他扣款', value: otherDeduction },
    ];

    for (const field of salaryFields) {
      if (field.value !== undefined && field.value !== null && (isNaN(field.value) || field.value < 0)) {
        return NextResponse.json(
          { success: false, message: `${field.name} 不能为负数` },
          { status: 400 }
        );
      }
    }

    // 验证备注长度
    if (remark && remark.length > 500) {
      return NextResponse.json(
        { success: false, message: '备注长度不能超过500个字符' },
        { status: 400 }
      );
    }

    // 计算实发工资
    const totalIncome = Number(basicSalary || 0) + 
                       Number(positionAllowance || 0) + 
                       Number(performanceBonus || 0) + 
                       Number(overtimePay || 0) + 
                       Number(otherBonus || 0);
    const totalDeduction = Number(socialSecurity || 0) + 
                          Number(housingFund || 0) + 
                          Number(personalTax || 0) + 
                          Number(otherDeduction || 0);
    const actualSalary = totalIncome - totalDeduction;

    // 检查是否已存在记录
    const [existing] = await query(
      `SELECT id FROM sys_salary WHERE employee_id = ? AND month = ?`,
      [employeeId, month]
    );

    if (existing) {
      // 更新
      await query(
        `UPDATE sys_salary SET
          basic_salary = ?,
          position_allowance = ?,
          performance_bonus = ?,
          overtime_pay = ?,
          other_bonus = ?,
          social_security = ?,
          housing_fund = ?,
          personal_tax = ?,
          other_deduction = ?,
          actual_salary = ?,
          remark = ?,
          update_time = NOW()
        WHERE id = ?`,
        [
          basicSalary || 0, 
          positionAllowance || 0, 
          performanceBonus || 0, 
          overtimePay || 0, 
          otherBonus || 0,
          socialSecurity || 0, 
          housingFund || 0, 
          personalTax || 0, 
          otherDeduction || 0,
          actualSalary, 
          remark || '', 
          existing.id
        ]
      );
    } else {
      // 插入
      await query(
        `INSERT INTO sys_salary (
          employee_id, month, basic_salary, position_allowance, performance_bonus,
          overtime_pay, other_bonus, social_security, housing_fund, personal_tax,
          other_deduction, actual_salary, remark, create_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          employeeId, 
          month, 
          basicSalary || 0, 
          positionAllowance || 0, 
          performanceBonus || 0,
          overtimePay || 0, 
          otherBonus || 0, 
          socialSecurity || 0, 
          housingFund || 0, 
          personalTax || 0,
          otherDeduction || 0, 
          actualSalary, 
          remark || ''
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: '薪资保存成功',
    });
  } catch (error) {
    console.error('保存薪资失败:', error);
    return NextResponse.json(
      { success: false, message: '保存薪资失败' },
      { status: 500 }
    );
  }
}

// 删除薪资记录
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: '缺少记录ID' },
        { status: 400 }
      );
    }

    // 验证ID格式
    const idNum = parseInt(id);
    if (isNaN(idNum) || idNum < 1) {
      return NextResponse.json(
        { success: false, message: '记录ID格式不正确' },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const [existing] = await query(
      `SELECT id FROM sys_salary WHERE id = ?`,
      [idNum]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, message: '薪资记录不存在' },
        { status: 404 }
      );
    }

    await query(`DELETE FROM sys_salary WHERE id = ?`, [idNum]);

    return NextResponse.json({
      success: true,
      message: '薪资记录删除成功',
    });
  } catch (error) {
    console.error('删除薪资失败:', error);
    return NextResponse.json(
      { success: false, message: '删除薪资失败' },
      { status: 500 }
    );
  }
}

function format(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return format.replace('yyyy', String(year)).replace('MM', month);
}
