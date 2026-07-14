import { query, execute, queryOne, type SqlValue } from '@/lib/db';
import { IEmployeeRepository } from '@/domain/hr/repositories/IEmployeeRepository';
import { Employee, EmployeeStatus } from '@/domain/hr/aggregates/Employee';

type EmployeeRow = {
  id: number;
  employee_no: string;
  name: string;
  gender: 'M' | 'F';
  phone: string;
  email: string;
  dept_id: number;
  position_id: number;
  base_salary: number;
  position_allowance: number;
  entry_date: string;
  probation_end: string | null;
  resign_date: string | null;
  status: string;
  emergency_contact: string;
  remark: string;
};

function rowToEmployee(row: EmployeeRow): Employee {
  return new Employee(
    row.id,
    row.employee_no,
    row.name,
    row.gender,
    row.phone,
    row.email,
    row.dept_id,
    row.position_id,
    row.base_salary,
    row.position_allowance,
    new Date(row.entry_date),
    row.probation_end ? new Date(row.probation_end) : undefined,
    row.resign_date ? new Date(row.resign_date) : undefined,
    row.status as EmployeeStatus,
    row.emergency_contact,
    row.remark
  );
}

export class MysqlEmployeeRepository implements IEmployeeRepository {
  async getById(id: number): Promise<Employee | null> {
    const rows = await query<EmployeeRow>(
      'SELECT * FROM hr_employee WHERE id = ? AND deleted = 0',
      [id]
    );
    return rows.length > 0 ? rowToEmployee(rows[0]) : null;
  }

  async getByEmployeeNo(employeeNo: string): Promise<Employee | null> {
    const rows = await query<EmployeeRow>(
      'SELECT * FROM hr_employee WHERE employee_no = ? AND deleted = 0',
      [employeeNo]
    );
    return rows.length > 0 ? rowToEmployee(rows[0]) : null;
  }

  async existsByEmployeeNo(employeeNo: string): Promise<boolean> {
    const row = await queryOne<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM hr_employee WHERE employee_no = ? AND deleted = 0',
      [employeeNo]
    );
    return (row?.cnt ?? 0) > 0;
  }

  async findAll(status?: EmployeeStatus, deptId?: number): Promise<Employee[]> {
    let sql = 'SELECT * FROM hr_employee WHERE deleted = 0';
    const params: SqlValue[] = [];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (deptId) {
      sql += ' AND dept_id = ?';
      params.push(deptId);
    }
    sql += ' ORDER BY id DESC';
    const rows = await query<EmployeeRow>(sql, params);
    return rows.map(rowToEmployee);
  }

  async save(employee: Employee): Promise<number> {
    const result = await execute(
      `INSERT INTO hr_employee (employee_no, name, gender, phone, email, dept_id, position_id,
        base_salary, position_allowance, entry_date, probation_end, status, emergency_contact, remark,
        create_time, update_time, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
      [
        employee.employeeNo,
        employee.name,
        employee.gender,
        employee.phone,
        employee.email,
        employee.deptId,
        employee.positionId,
        employee.baseSalary,
        employee.positionAllowance,
        employee.entryDate,
        employee.probationEnd,
        employee.status,
        employee.emergencyContact,
        employee.remark,
      ]
    );
    return result.insertId;
  }

  async update(employee: Employee): Promise<void> {
    await execute(
      `UPDATE hr_employee SET name=?, gender=?, phone=?, email=?, dept_id=?, position_id=?,
        base_salary=?, position_allowance=?, status=?, emergency_contact=?, remark=?,
        resign_date=?, update_time=NOW()
       WHERE id=? AND deleted=0`,
      [
        employee.name,
        employee.gender,
        employee.phone,
        employee.email,
        employee.deptId,
        employee.positionId,
        employee.baseSalary,
        employee.positionAllowance,
        employee.status,
        employee.emergencyContact,
        employee.remark,
        employee.resignDate,
        employee.id,
      ]
    );
  }

  async softDelete(id: number): Promise<void> {
    await execute('UPDATE hr_employee SET deleted=1, update_time=NOW() WHERE id=?', [id]);
  }

  async generateEmployeeNo(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const row = await queryOne<{ seq: number }>(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(employee_no, 11) AS UNSIGNED)), 0) + 1 as seq
       FROM hr_employee WHERE employee_no LIKE CONCAT('EMP', ?, '%')`,
      [dateStr]
    );
    const seq = row?.seq ?? 1;
    return `EMP${dateStr}-${String(seq).padStart(4, '0')}`;
  }
}
