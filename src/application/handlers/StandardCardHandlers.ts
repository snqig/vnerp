import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { DomainEvent } from '@/domain/standard-card/events/StandardCardEvents';
import { db } from '@/lib/db';
import { getCacheManager } from '@/lib/cache';
import { logger } from '@/lib/logger';

export class StandardCardNotificationHandler implements EventHandler {
  async handle(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'StandardCardSubmitted':
        await this.handleSubmitted(event);
        break;
      case 'StandardCardApproved':
        await this.handleApproved(event);
        break;
      case 'StandardCardConfirmed':
        await this.handleConfirmed(event);
        break;
      case 'StandardCardObsoleted':
        await this.handleObsoleted(event);
        break;
      case 'StandardCardRejected':
        await this.handleRejected(event);
        break;
      case 'StandardCardNewVersionCreated':
        await this.handleNewVersionCreated(event);
        break;
      case 'StandardCardCreated':
        await this.handleCreated(event);
        break;
    }
  }

  private async handleCreated(event: DomainEvent): Promise<void> {}

  private async handleSubmitted(event: DomainEvent): Promise<void> {
    const { standardCardId, code, version, userId } = event.payload as {
      standardCardId: number;
      code: string;
      version: string;
      userId: number;
    };
    const ctx = { module: 'standard-card', action: 'handleSubmitted', userId, standardCardId };
    logger.stepStart(ctx, '通知流程开始', { code, version });

    try {
      await db.insert('sys_notification', {
        title: '标准卡待审核',
        content: `标准卡 ${code} V${version} 已提交，请尽快审核`,
        type: 'standard_card_audit',
        source_type: 'standard_card',
        source_id: standardCardId,
        receive_user: this.getProcessManagerUserId(),
        is_read: 0,
      });
      logger.db(ctx, 'insert', 'sys_notification', { source_id: standardCardId });

      await getCacheManager().delete(`standard_card_list`);
      logger.stepEnd(ctx, '通知流程完成');
    } catch (err) {
      logger.error(ctx, '通知流程异常', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  private async handleApproved(event: DomainEvent): Promise<void> {
    const { standardCardId, code, version, userId, approvalLevel } = event.payload as {
      standardCardId: number;
      code: string;
      version: string;
      userId: number;
      approvalLevel: string;
    };
    const ctx = { module: 'standard-card', action: 'handleApproved', userId, standardCardId };
    logger.stepStart(ctx, '审批通知流程开始', { code, version, approvalLevel });

    try {
      await db.insert('sys_notification', {
        title: '标准卡待总经理审批',
        content: `标准卡 ${code} V${version} 已通过技术主管审核，请总经理审批`,
        type: 'standard_card_approve',
        source_type: 'standard_card',
        source_id: standardCardId,
        receive_user: this.getGeneralManagerUserId(),
        is_read: 0,
      });
      logger.db(ctx, 'insert', 'sys_notification', { source_id: standardCardId });

      await getCacheManager().delete(`standard_card_${standardCardId}`);
      logger.stepEnd(ctx, '审批通知流程完成');
    } catch (err) {
      logger.error(ctx, '审批通知流程异常', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  private async handleConfirmed(event: DomainEvent): Promise<void> {
    const { standardCardId, code, version, materialId, userId } = event.payload;

    await db.insert('sys_notification', {
      title: '标准卡已生效',
      content: `标准卡 ${code} V${version} 已确认并生效，可用于生产工单`,
      type: 'standard_card_confirmed',
      source_type: 'standard_card',
      source_id: standardCardId,
      receive_user: userId,
      is_read: 0,
    });

    await getCacheManager().delete(`standard_card_${standardCardId}`);
    await getCacheManager().delete(`material_standard_card_${materialId}`);
  }

  private async handleObsoleted(event: DomainEvent): Promise<void> {
    const { standardCardId, code, version, reason, userId } = event.payload;

    await getCacheManager().delete(`standard_card_${standardCardId}`);
    await getCacheManager().delete(`standard_card_list`);
  }

  private async handleRejected(event: DomainEvent): Promise<void> {
    const { standardCardId, code, version, reason, userId } = event.payload as {
      standardCardId: number;
      code: string;
      version: string;
      reason: string;
      userId: number;
    };

    await db.insert('sys_notification', {
      title: '标准卡审核被驳回',
      content: `标准卡 ${code} V${version} 被驳回，原因：${reason}，请修改后重新提交`,
      type: 'standard_card_rejected',
      source_type: 'standard_card',
      source_id: standardCardId,
      receive_user: userId,
      is_read: 0,
    });

    await getCacheManager().delete(`standard_card_${standardCardId}`);
    await getCacheManager().delete(`standard_card_list`);
  }

  private async handleNewVersionCreated(event: DomainEvent): Promise<void> {
    const { parentStandardCardId, parentVersion, newVersion, code } = event.payload as {
      parentStandardCardId: number;
      parentVersion: string;
      newVersion: string;
      code: string;
      userId: number;
    };

    await getCacheManager().delete(`standard_card_${parentStandardCardId}`);
    await getCacheManager().delete(`standard_card_list`);
  }

  private getProcessManagerUserId(): number {
    return 2;
  }

  private getGeneralManagerUserId(): number {
    return 1;
  }

  supports(eventType: string): boolean {
    return [
      'StandardCardCreated',
      'StandardCardSubmitted',
      'StandardCardApproved',
      'StandardCardConfirmed',
      'StandardCardObsoleted',
      'StandardCardRejected',
      'StandardCardNewVersionCreated',
    ].includes(eventType);
  }
}

export class StandardCardWorkOrderLinkHandler implements EventHandler {
  async handle(event: DomainEvent): Promise<void> {
    if (event.eventType === 'StandardCardConfirmed') {
      const { materialId, standardCardId } = event.payload as {
        materialId: number;
        standardCardId: number;
      };
      if (materialId) {
        await this.updateWorkOrdersWithNewStandardCard(materialId, standardCardId);
      }
    }
  }

  private async updateWorkOrdersWithNewStandardCard(
    materialId: number,
    standardCardId: number
  ): Promise<void> {
    const pendingWorkOrders = await db.query<{ id: number }>(
      `SELECT id FROM prd_work_order
          WHERE material_id = ?
          AND status IN ('created', 'scheduled')
          AND standard_card_id IS NULL
          LIMIT 100`,
      [materialId]
    );

    for (const wo of pendingWorkOrders) {
      await db.execute(
        `UPDATE prd_work_order SET standard_card_id = ?, update_time = NOW() WHERE id = ?`,
        [standardCardId, wo.id]
      );
    }

    if (pendingWorkOrders.length > 0) {
    }
  }

  supports(eventType: string): boolean {
    return ['StandardCardConfirmed'].includes(eventType);
  }
}
