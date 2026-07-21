import { getDrizzleDb } from '@/lib/db';
import { sagaLog as sagaLogTable } from '@/lib/db/schema';
import { eq, and, lt } from 'drizzle-orm';

export type SagaStatus = 'pending' | 'executing' | 'success' | 'compensating' | 'compensated' | 'failed';

export type SagaStepStatus = 'pending' | 'success' | 'failed' | 'compensating' | 'compensated';

export interface SagaStep {
  name: string;
  status: SagaStepStatus;
  errorMessage?: string;
  completedAt?: Date;
}

export interface SagaLogRecord {
  id: number;
  sagaId: string;
  sagaType: string;
  status: SagaStatus;
  payload: Record<string, unknown>;
  steps: SagaStep[];
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const db = getDrizzleDb();

export class SagaLogRepository {
  async create(
    sagaId: string,
    sagaType: string,
    payload: Record<string, unknown>
  ): Promise<SagaLogRecord> {
    const result = await db
      .insert(sagaLogTable)
      .values({
        sagaId,
        sagaType,
        status: 'pending',
        payload: JSON.stringify(payload),
        steps: JSON.stringify([]),
      });

    const insertedId = Number(result[0].insertId);
    const [record] = await db.select().from(sagaLogTable).where(eq(sagaLogTable.id, insertedId));
    return this.mapToRecord(record);
  }

  async get(sagaId: string): Promise<SagaLogRecord | null> {
    const result = await db
      .select()
      .from(sagaLogTable)
      .where(eq(sagaLogTable.sagaId, sagaId));

    return result.length > 0 ? this.mapToRecord(result[0]) : null;
  }

  async updateStatus(sagaId: string, status: SagaStatus): Promise<void> {
    await db
      .update(sagaLogTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(sagaLogTable.sagaId, sagaId));
  }

  async updateStatusWithError(sagaId: string, status: SagaStatus, errorMessage: string): Promise<void> {
    await db
      .update(sagaLogTable)
      .set({ status, errorMessage, updatedAt: new Date() })
      .where(eq(sagaLogTable.sagaId, sagaId));
  }

  async addStep(sagaId: string, stepName: string): Promise<void> {
    const record = await this.get(sagaId);
    if (!record) return;

    const newStep: SagaStep = { name: stepName, status: 'pending' };
    const updatedSteps = [...record.steps, newStep];

    await db
      .update(sagaLogTable)
      .set({ steps: JSON.stringify(updatedSteps), updatedAt: new Date() })
      .where(eq(sagaLogTable.sagaId, sagaId));
  }

  async updateStepStatus(sagaId: string, stepName: string, status: SagaStepStatus, errorMessage?: string): Promise<void> {
    const record = await this.get(sagaId);
    if (!record) return;

    const updatedSteps = record.steps.map((step) =>
      step.name === stepName
        ? { ...step, status, errorMessage, completedAt: new Date() }
        : step
    );

    await db
      .update(sagaLogTable)
      .set({ steps: JSON.stringify(updatedSteps), updatedAt: new Date() })
      .where(eq(sagaLogTable.sagaId, sagaId));
  }

  async getStepsByStatus(sagaId: string, status: SagaStepStatus): Promise<SagaStep[]> {
    const record = await this.get(sagaId);
    if (!record) return [];
    return record.steps.filter((step) => step.status === status);
  }

  async findPendingSagas(sagaType?: string): Promise<SagaLogRecord[]> {
    if (sagaType) {
      const results = await db
        .select()
        .from(sagaLogTable)
        .where(and(eq(sagaLogTable.status, 'pending'), eq(sagaLogTable.sagaType, sagaType)));
      return results.map((r) => this.mapToRecord(r));
    }

    const results = await db.select().from(sagaLogTable).where(eq(sagaLogTable.status, 'pending'));
    return results.map((r) => this.mapToRecord(r));
  }

  async findAll(sagaType?: string, status?: SagaStatus): Promise<SagaLogRecord[]> {
    let query = db.select().from(sagaLogTable);

    if (sagaType) {
      query = query.where(eq(sagaLogTable.sagaType, sagaType)) as typeof query;
    }

    if (status) {
      query = query.where(eq(sagaLogTable.status, status)) as typeof query;
    }

    const results = await query.orderBy(sagaLogTable.createdAt);
    return results.map((r) => this.mapToRecord(r));
  }

  async cleanUpOldSagas(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await db
      .delete(sagaLogTable)
      .where(
        and(
          eq(sagaLogTable.status, 'success'),
          lt(sagaLogTable.createdAt, cutoffDate)
        )
      );

    await db
      .delete(sagaLogTable)
      .where(
        and(
          eq(sagaLogTable.status, 'compensated'),
          lt(sagaLogTable.createdAt, cutoffDate)
        )
      );
  }

  private mapToRecord(raw: typeof sagaLogTable.$inferSelect): SagaLogRecord {
    return {
      id: raw.id,
      sagaId: raw.sagaId,
      sagaType: raw.sagaType,
      status: raw.status as SagaStatus,
      payload: typeof raw.payload === 'string' ? JSON.parse(raw.payload) : {},
      steps: typeof raw.steps === 'string' ? JSON.parse(raw.steps) : [],
      errorMessage: raw.errorMessage || undefined,
      createdAt: raw.createdAt || new Date(),
      updatedAt: raw.updatedAt || new Date(),
    };
  }
}