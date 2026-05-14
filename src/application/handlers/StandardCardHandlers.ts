import { EventHandler } from '@/infrastructure/event-bus/EventBus';
import { DomainEvent } from '@/domain/standard-card/events/StandardCardEvents';
import { db } from '@/lib/db';
import { getCacheManager } from '@/lib/cache';

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
      case 'StandardCardCreated':
        await this.handleCreated(event);
        break;
    }
  }

  private async handleCreated(event: DomainEvent): Promise<void> {
    console.log(`[StandardCardNotification] 标准卡创建: ${event.payload.code}`);
  }

  private async handleSubmitted(event: DomainEvent): Promise<void> {
    const { standardCardId, code, version, userId } = event.payload;
    console.log(`[StandardCardNotification] 标准卡提交审核: ${code} V${version}`);

    await db.insert('sys_notification', {
      title: '标准卡待审核',
      content: `标准卡 ${code} V${version} 已提交，请尽快审核`,
      type: 'standard_card_audit',
      source_type: 'standard_card',
      source_id: standardCardId,
      receive_user: this.getProcessManagerUserId(),
      is_read: 0,
    } as any);

    await getCacheManager().delete(`standard_card_list`);
  }

  private async handleApproved(event: DomainEvent): Promise<void> {
    const { standardCardId, code, version, userId, approvalLevel } = event.payload;
    console.log(`[StandardCardNotification] 标准卡已批准: ${code} V${version}`);

    await db.insert('sys_notification', {
      title: '标准卡待总经理审批',
      content: `标准卡 ${code} V${version} 已通过技术主管审核，请总经理审批`,
      type: 'standard_card_approve',
      source_type: 'standard_card',
      source_id: standardCardId,
      receive_user: this.getGeneralManagerUserId(),
      is_read: 0,
    } as any);

    await getCacheManager().delete(`standard_card_${standardCardId}`);
  }

  private async handleConfirmed(event: DomainEvent): Promise<void> {
    const { standardCardId, code, version, materialId, userId } = event.payload;
    console.log(`[StandardCardNotification] 标准卡已确认: ${code} V${version}`);

    await db.insert('sys_notification', {
      title: '标准卡已生效',
      content: `标准卡 ${code} V${version} 已确认并生效，可用于生产工单`,
      type: 'standard_card_confirmed',
      source_type: 'standard_card',
      source_id: standardCardId,
      receive_user: userId,
      is_read: 0,
    } as any);

    await getCacheManager().delete(`standard_card_${standardCardId}`);
    await getCacheManager().delete(`material_standard_card_${materialId}`);
  }

  private async handleObsoleted(event: DomainEvent): Promise<void> {
    const { standardCardId, code, version, reason, userId } = event.payload;
    console.log(`[StandardCardNotification] 标准卡已作废: ${code} V${version}`);

    await getCacheManager().delete(`standard_card_${standardCardId}`);
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
    ].includes(eventType);
  }
}

export class StandardCardWorkOrderLinkHandler implements EventHandler {
  async handle(event: DomainEvent): Promise<void> {
    if (event.eventType === 'StandardCardConfirmed') {
      const { materialId } = event.payload;
      if (materialId) {
        await this.updateWorkOrdersWithNewStandardCard(materialId, event.payload.standardCardId);
      }
    }
  }

  private async updateWorkOrdersWithNewStandardCard(
    materialId: number,
    standardCardId: number
  ): Promise<void> {
    const pendingWorkOrders = await db.query(
      `SELECT id FROM prd_work_order 
          WHERE material_id = ${materialId} 
          AND status IN ('created', 'scheduled') 
          AND standard_card_id IS NULL
          LIMIT 100`
    );

    for (const wo of pendingWorkOrders) {
      await db.execute(
        `UPDATE prd_work_order SET standard_card_id = ${standardCardId}, update_time = NOW() WHERE id = ${(wo as any).id}`
      );
    }

    if (pendingWorkOrders.length > 0) {
      console.log(
        `[StandardCardWorkOrderLink] 为 ${pendingWorkOrders.length} 个待开工工单关联了新标准卡`
      );
    }
  }

  supports(eventType: string): boolean {
    return ['StandardCardConfirmed'].includes(eventType);
  }
}
