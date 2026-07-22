import {
  SagaLogRepository,
  SagaStatus as _SagaStatus,
  SagaStepStatus as _SagaStepStatus,
} from '@/infrastructure/repositories/SagaLogRepository';
import { InMemoryEventBus } from '@/infrastructure/event-bus/EventBus';
import { transaction as _transaction } from '@/lib/db';

export type SagaType =
  | 'workorder_completion'
  | 'material_issue'
  | 'work_report'
  | 'hr_payroll_calculation';

export class CrossModuleSagaHandler {
  constructor(
    private readonly sagaLogRepository: SagaLogRepository,
    private readonly eventBus: InMemoryEventBus
  ) {}

  async handleWorkOrderCompletion(workOrderId: number): Promise<void> {
    const sagaId = this.generateSagaId('workorder_completion', workOrderId);
    const payload = { workOrderId };

    await this.sagaLogRepository.create(sagaId, 'workorder_completion', payload);

    try {
      await this.sagaLogRepository.updateStatus(sagaId, 'executing');

      await this.executeStep(sagaId, 'update_workorder', async () => {
        await this.eventBus.publish({
          eventType: 'workorder.status.update',
          occurredAt: new Date(),
          payload: { workOrderId, status: 'completed' },
        });
      });

      await this.executeStep(sagaId, 'inventory_inbound', async () => {
        await this.eventBus.publish({
          eventType: 'workorder.completed',
          occurredAt: new Date(),
          payload: { workOrderId },
        });
      });

      await this.executeStep(sagaId, 'finance_cost', async () => {
        await this.eventBus.publish({
          eventType: 'production.finance.cost_collect',
          occurredAt: new Date(),
          payload: { workOrderId },
        });
      });

      await this.executeStep(sagaId, 'hr_salary', async () => {
        await this.eventBus.publish({
          eventType: 'hr.salary.piece_calculate',
          occurredAt: new Date(),
          payload: { workOrderId },
        });
      });

      await this.sagaLogRepository.updateStatus(sagaId, 'success');
      await this.eventBus.publish({
        eventType: 'saga.completed',
        occurredAt: new Date(),
        payload: { sagaId, sagaType: 'workorder_completion', payload },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.sagaLogRepository.updateStatusWithError(sagaId, 'failed', errorMessage);
      await this.eventBus.publish({
        eventType: 'saga.failed',
        occurredAt: new Date(),
        payload: {
          sagaId,
          sagaType: 'workorder_completion',
          failedStep: await this.getLastFailedStep(sagaId),
          errorMessage,
        },
      });

      await this.triggerCompensation(sagaId);
      throw error;
    }
  }

  async handleMaterialIssue(pickOrderId: number): Promise<void> {
    const sagaId = this.generateSagaId('material_issue', pickOrderId);
    const payload = { pickOrderId };

    await this.sagaLogRepository.create(sagaId, 'material_issue', payload);

    try {
      await this.sagaLogRepository.updateStatus(sagaId, 'executing');

      await this.executeStep(sagaId, 'update_pick_order', async () => {
        await this.eventBus.publish({
          eventType: 'material.pick.issued',
          occurredAt: new Date(),
          payload: { pickOrderId },
        });
      });

      await this.executeStep(sagaId, 'inventory_deduct', async () => {
        await this.eventBus.publish({
          eventType: 'inventory.material.deduct',
          occurredAt: new Date(),
          payload: { pickOrderId },
        });
      });

      await this.executeStep(sagaId, 'finance_impact', async () => {
        await this.eventBus.publish({
          eventType: 'finance.material.issue',
          occurredAt: new Date(),
          payload: { pickOrderId },
        });
      });

      await this.sagaLogRepository.updateStatus(sagaId, 'success');
      await this.eventBus.publish({
        eventType: 'saga.completed',
        occurredAt: new Date(),
        payload: { sagaId, sagaType: 'material_issue', payload },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.sagaLogRepository.updateStatusWithError(sagaId, 'failed', errorMessage);
      await this.eventBus.publish({
        eventType: 'saga.failed',
        occurredAt: new Date(),
        payload: {
          sagaId,
          sagaType: 'material_issue',
          failedStep: await this.getLastFailedStep(sagaId),
          errorMessage,
        },
      });

      await this.triggerCompensation(sagaId);
      throw error;
    }
  }

  async handleWorkReport(reportId: number): Promise<void> {
    const sagaId = this.generateSagaId('work_report', reportId);
    const payload = { reportId };

    await this.sagaLogRepository.create(sagaId, 'work_report', payload);

    try {
      await this.sagaLogRepository.updateStatus(sagaId, 'executing');

      await this.executeStep(sagaId, 'validate_report', async () => {
        await this.eventBus.publish({
          eventType: 'workreport.validated',
          occurredAt: new Date(),
          payload: { reportId },
        });
      });

      await this.executeStep(sagaId, 'update_workorder_progress', async () => {
        await this.eventBus.publish({
          eventType: 'workreport.submitted',
          occurredAt: new Date(),
          payload: { reportId },
        });
      });

      await this.executeStep(sagaId, 'hr_piece_record', async () => {
        await this.eventBus.publish({
          eventType: 'hr.piecework.record',
          occurredAt: new Date(),
          payload: { reportId },
        });
      });

      await this.sagaLogRepository.updateStatus(sagaId, 'success');
      await this.eventBus.publish({
        eventType: 'saga.completed',
        occurredAt: new Date(),
        payload: { sagaId, sagaType: 'work_report', payload },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.sagaLogRepository.updateStatusWithError(sagaId, 'failed', errorMessage);
      await this.eventBus.publish({
        eventType: 'saga.failed',
        occurredAt: new Date(),
        payload: {
          sagaId,
          sagaType: 'work_report',
          failedStep: await this.getLastFailedStep(sagaId),
          errorMessage,
        },
      });

      await this.triggerCompensation(sagaId);
      throw error;
    }
  }

  private async executeStep(
    sagaId: string,
    stepName: string,
    action: () => Promise<void>
  ): Promise<void> {
    await this.sagaLogRepository.addStep(sagaId, stepName);
    await this.sagaLogRepository.updateStepStatus(sagaId, stepName, 'pending');

    try {
      await action();
      await this.sagaLogRepository.updateStepStatus(sagaId, stepName, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.sagaLogRepository.updateStepStatus(sagaId, stepName, 'failed', errorMessage);
      throw error;
    }
  }

  private async triggerCompensation(sagaId: string): Promise<void> {
    await this.sagaLogRepository.updateStatus(sagaId, 'compensating');

    const successSteps = await this.sagaLogRepository.getStepsByStatus(sagaId, 'success');
    const reversedSteps = [...successSteps].reverse();

    for (const step of reversedSteps) {
      await this.sagaLogRepository.updateStepStatus(sagaId, step.name, 'compensating');

      try {
        await this.eventBus.publish({
          eventType: `saga.compensate.${step.name}`,
          occurredAt: new Date(),
          payload: { sagaId },
        });
        await this.sagaLogRepository.updateStepStatus(sagaId, step.name, 'compensated');
      } catch (compError) {
        const errorMessage = compError instanceof Error ? compError.message : String(compError);
        await this.sagaLogRepository.updateStepStatus(sagaId, step.name, 'failed', errorMessage);
      }
    }

    const allCompensated = reversedSteps.every((s) => s.status === 'compensated');
    await this.sagaLogRepository.updateStatus(sagaId, allCompensated ? 'compensated' : 'failed');

    if (allCompensated) {
      await this.eventBus.publish({
        eventType: 'saga.compensated',
        occurredAt: new Date(),
        payload: { sagaId },
      });
    }
  }

  private async getLastFailedStep(sagaId: string): Promise<string> {
    const record = await this.sagaLogRepository.get(sagaId);
    if (!record) return '';

    const failedStep = record.steps.find((s) => s.status === 'failed');
    return failedStep?.name || '';
  }

  private generateSagaId(sagaType: string, businessId: number): string {
    return `${sagaType}:${businessId}:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`;
  }
}
