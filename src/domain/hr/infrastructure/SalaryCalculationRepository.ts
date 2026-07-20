import { eq, and, between, desc } from 'drizzle-orm';
import { getDrizzleDb } from '@/lib/db';
import { hrSalaryCalculation } from '@/lib/db/schema';

const db = getDrizzleDb();

export class SalaryCalculationRepository {
  async findByEmployeeMonth(employeeId: number, month: string) {
    const row = await db.select().from(hrSalaryCalculation)
      .where(and(
        eq(hrSalaryCalculation.employeeId, employeeId),
        eq(hrSalaryCalculation.calcMonth, month)
      ))
      .then(rows => rows[0]);
    return row || null;
  }

  async save(data: typeof hrSalaryCalculation.$inferInsert) {
    const existing = await this.findByEmployeeMonth(data.employeeId, data.calcMonth);
    if (existing) {
      await db.update(hrSalaryCalculation)
        .set(data)
        .where(eq(hrSalaryCalculation.id, existing.id));
      return existing.id;
    }
    const result = await db.insert(hrSalaryCalculation).values(data);
    return Number(result[0].insertId);
  }

  async batchUpdateStatus(ids: number[], status: string) {
    await db.update(hrSalaryCalculation)
      .set({ status })
      .where(
        between(hrSalaryCalculation.id, Math.min(...ids), Math.max(...ids))
      );
  }

  async listByMonth(month: string, page = 1, pageSize = 20) {
    const rows = await db.select().from(hrSalaryCalculation)
      .where(eq(hrSalaryCalculation.calcMonth, month))
      .orderBy(desc(hrSalaryCalculation.createTime))
      .limit(pageSize).offset((page - 1) * pageSize);
    return rows;
  }

  async getStats(month: string) {
    const rows = await db.select().from(hrSalaryCalculation)
      .where(eq(hrSalaryCalculation.calcMonth, month));
    const total = rows.reduce((s, r) => s + Number(r.netPay), 0);
    return {
      totalEmployees: rows.length,
      totalPayroll: total,
      avgSalary: rows.length ? total / rows.length : 0,
      maxSalary: rows.length ? Math.max(...rows.map(r => Number(r.netPay))) : 0,
      minSalary: rows.length ? Math.min(...rows.map(r => Number(r.netPay))) : 0,
    };
  }
}
