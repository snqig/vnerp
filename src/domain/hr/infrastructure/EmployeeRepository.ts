import { eq, and, desc, sql } from 'drizzle-orm';
import { getDrizzleDb } from '@/lib/db';
import { sysEmployee } from '@/lib/db/schema';

const db = getDrizzleDb();
import { Employee, EmployeeStatus } from '../aggregates/Employee';
import { IEmployeeRepository } from '../repositories/IEmployeeRepository';

export class EmployeeRepository implements IEmployeeRepository {
  private toDomain(row: typeof sysEmployee.$inferSelect): Employee {
    const statusMap: Record<string, EmployeeStatus> = {
      '1': EmployeeStatus.CONFIRMED,
      '2': EmployeeStatus.PROBATION,
      '3': EmployeeStatus.RESIGNED,
      '0': EmployeeStatus.SUSPENDED,
    };
    return new Employee(
      row.id,
      row.employeeNo || '',
      row.name,
      row.gender === 1 ? 'M' : 'F',
      row.phone || '',
      row.email || '',
      row.deptId || 0,
      0,
      Number(row.remark || 0),
      0,
      row.entryDate ? new Date(row.entryDate) : new Date(),
      undefined,
      undefined,
      statusMap[String(row.status)] || EmployeeStatus.CONFIRMED,
      row.emergencyContact || '',
      row.remark || ''
    );
  }

  private toPersistence(emp: Employee): typeof sysEmployee.$inferInsert {
    const statusMap: Record<EmployeeStatus, number> = {
      [EmployeeStatus.ONBOARDING]: 2,
      [EmployeeStatus.PROBATION]: 2,
      [EmployeeStatus.CONFIRMED]: 1,
      [EmployeeStatus.SUSPENDED]: 0,
      [EmployeeStatus.RESIGNED]: 3,
    };
    return {
      employeeNo: emp.employeeNo,
      name: emp.name,
      gender: emp.gender === 'M' ? 1 : 2,
      phone: emp.phone,
      email: emp.email,
      deptId: emp.deptId,
      status: statusMap[emp.status],
      entryDate: emp.entryDate,
      emergencyContact: emp.emergencyContact || undefined,
      remark: emp.remark || undefined,
    };
  }

  async getById(id: number): Promise<Employee | null> {
    const row = await db.select().from(sysEmployee)
      .where(and(eq(sysEmployee.id, id), eq(sysEmployee.deleted, 0)))
      .then(rows => rows[0]);
    return row ? this.toDomain(row) : null;
  }

  async getByEmployeeNo(employeeNo: string): Promise<Employee | null> {
    const row = await db.select().from(sysEmployee)
      .where(and(eq(sysEmployee.employeeNo, employeeNo), eq(sysEmployee.deleted, 0)))
      .then(rows => rows[0]);
    return row ? this.toDomain(row) : null;
  }

  async existsByEmployeeNo(employeeNo: string): Promise<boolean> {
    const row = await db.select({ id: sysEmployee.id }).from(sysEmployee)
      .where(and(eq(sysEmployee.employeeNo, employeeNo), eq(sysEmployee.deleted, 0)))
      .then(rows => rows[0]);
    return !!row;
  }

  async findAll(status?: EmployeeStatus, deptId?: number): Promise<Employee[]> {
    const conditions = [eq(sysEmployee.deleted, 0)];
    if (status !== undefined) {
      const statusMap: Record<EmployeeStatus, number> = {
        [EmployeeStatus.ONBOARDING]: 2,
        [EmployeeStatus.PROBATION]: 2,
        [EmployeeStatus.CONFIRMED]: 1,
        [EmployeeStatus.SUSPENDED]: 0,
        [EmployeeStatus.RESIGNED]: 3,
      };
      conditions.push(eq(sysEmployee.status, statusMap[status]));
    }
    if (deptId !== undefined) {
      conditions.push(eq(sysEmployee.deptId, deptId));
    }
    const rows = await db.select().from(sysEmployee)
      .where(and(...conditions))
      .orderBy(desc(sysEmployee.createTime));
    return rows.map(r => this.toDomain(r));
  }

  async save(employee: Employee): Promise<number> {
    const data = this.toPersistence(employee);
    const result = await db.insert(sysEmployee).values(data);
    return Number(result[0].insertId);
  }

  async update(employee: Employee): Promise<void> {
    if (!employee.id) throw new Error('Employee ID required for update');
    const data = this.toPersistence(employee);
    await db.update(sysEmployee)
      .set(data)
      .where(eq(sysEmployee.id, employee.id));
  }

  async softDelete(id: number): Promise<void> {
    await db.update(sysEmployee)
      .set({ deleted: 1 })
      .where(eq(sysEmployee.id, id));
  }

  async generateEmployeeNo(): Promise<string> {
    const result = await db.select({ max: sql`MAX(employee_no)` }).from(sysEmployee)
      .then(rows => rows[0]?.max as string | undefined);
    const num = result ? parseInt(result.replace(/\D/g, '')) + 1 : 1;
    return `EMP${String(num).padStart(6, '0')}`;
  }
}
