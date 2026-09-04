import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { query, SqlValue } from '@/lib/db';
import { CommonValidations } from '@/lib/validation';
import { successResponse, errorResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';
export const GET = withPermission(
  async (request: NextRequest) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || format(new Date(), 'yyyy-MM');
    const deptId = searchParams.get('deptId');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return errorResponse(ts('k_1mjk0tu'), 400, 400);
    }

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

    let countSql = `SELECT COUNT(*) as total FROM sys_employee e WHERE e.status = 1`;
    const params: SqlValue[] = [month];
    const countParams: SqlValue[] = [];

    if (deptId) {
      const deptIdNum = parseInt(deptId);
      if (isNaN(deptIdNum) || deptIdNum < 1) {
        return errorResponse(ts('k_1l4pjax'), 400, 400);
      }
      sql += ` AND e.dept_id = ?`;
      countSql += ` AND e.dept_id = ?`;
      params.push(deptIdNum);
      countParams.push(deptIdNum);
    }

    if (keyword) {
      if (keyword.length > 100) {
        return errorResponse(ts('k_v2dfyb'), 400, 400);
      }
      sql += ` AND (e.name LIKE ? OR e.employee_no LIKE ?)`;
      countSql += ` AND (e.name LIKE ? OR e.employee_no LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ` ORDER BY e.dept_id, e.employee_no LIMIT ? OFFSET ?`;
    params.push(pageSize, (page - 1) * pageSize);

    const salaries = await query(sql, params);
    const countResult = await query(countSql, countParams);
    const total = (countResult as DbRow[])[0]?.total || 0;

    return successResponse({
      list: salaries,
      total,
      page,
      pageSize,
    });
  },
  { errorMessage: '获取薪资列表失败' }
);

export const POST = withPermission(
  async (request: NextRequest) => {
  const ts = await getTranslations('Common');
    const body = await request.json();

    const validation = CommonValidations.salary(body);
    if (!validation.valid) {
      return errorResponse(validation.errors.join(', '), 400, 400);
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

    const [employee] = await query(`SELECT id FROM sys_employee WHERE id = ? AND status = 1`, [
      employeeId,
    ]);

    if (!employee) {
      return errorResponse(ts('k_rddrsx'), 400, 400);
    }

    const salaryFields = [
      { name: ts('k_60tcky'), value: basicSalary },
      { name: ts('k_iwdle0'), value: positionAllowance },
      { name: ts('k_n10a79'), value: performanceBonus },
      { name: ts('k_13fz3y5'), value: overtimePay },
      { name: ts('k_v83vjk'), value: otherBonus },
      { name: ts('k_18jq304'), value: socialSecurity },
      { name: ts('k_1dvkc93'), value: housingFund },
      { name: ts('k_12li84i'), value: personalTax },
      { name: ts('k_mbuxmk'), value: otherDeduction },
    ];

    for (const field of salaryFields) {
      if (
        field.value !== undefined &&
        field.value !== null &&
        (isNaN(field.value) || field.value < 0)
      ) {
        return errorResponse(`${field.name} 不能为负数`, 400, 400);
      }
    }

    if (remark && remark.length > 500) {
      return errorResponse(ts('k_147a26n'), 400, 400);
    }

    const totalIncome =
      Number(basicSalary || 0) +
      Number(positionAllowance || 0) +
      Number(performanceBonus || 0) +
      Number(overtimePay || 0) +
      Number(otherBonus || 0);
    const totalDeduction =
      Number(socialSecurity || 0) +
      Number(housingFund || 0) +
      Number(personalTax || 0) +
      Number(otherDeduction || 0);
    const actualSalary = totalIncome - totalDeduction;

    const [existing] = await query(
      `SELECT id FROM sys_salary WHERE employee_id = ? AND month = ?`,
      [employeeId, month]
    );

    if (existing) {
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
          existing.id,
        ]
      );
    } else {
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
          remark || '',
        ]
      );
    }

    return successResponse(null, ts('k_9oa8xb'));
  },
  { errorMessage: '保存薪资失败' }
);

export const DELETE = withPermission(
  async (request: NextRequest) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse(ts('k_1sdbmxi'), 400, 400);
    }

    const idNum = parseInt(id);
    if (isNaN(idNum) || idNum < 1) {
      return errorResponse(ts('k_1fofyfs'), 400, 400);
    }

    const [existing] = await query(`SELECT id FROM sys_salary WHERE id = ?`, [idNum]);

    if (!existing) {
      return errorResponse(ts('k_96beij'), 404, 404);
    }

    await query(`DELETE FROM sys_salary WHERE id = ?`, [idNum]);

    return successResponse(null, ts('k_1rlgct9'));
  },
  { errorMessage: '删除薪资失败' }
);

function format(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return format.replace('yyyy', String(year)).replace('MM', month);
}
