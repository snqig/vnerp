import { getTranslations } from 'next-intl/server';

import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { DomainEvent } from '@/domain/shared/DomainTypes';
import { logOperation } from '@/lib/api-response';
import { secureLog } from '@/lib/logger';

export class AuditLogHandler implements EventHandler<DomainEvent> {
  async handle(event: DomainEvent): Promise<void> {
  const ts = await getTranslations('Common');
    const operationMap: Record<string, { title: string; operType: string }> = {
      'inbound.approved': { title: ts('k_17le7g5'), operType: ts('k_1ws11do') },
      'inbound.cancelled': { title: ts('k_6cmsiy'), operType: ts('k_1589w37') },
      'inbound.created': { title: ts('k_kp5qat'), operType: ts('k_khvw5c') },
      'inbound.submitted': { title: ts('k_1u1l1dk'), operType: ts('k_ybr38x') },
      'tool.created': { title: ts('k_mthvqa'), operType: ts('k_khvw5c') },
      'tool.activated': { title: ts('k_1a0z3ky'), operType: ts('k_sgmlm4') },
      'tool.maintenance_started': { title: ts('k_4bfx78'), operType: ts('k_v1x3nb') },
      'tool.maintenance_completed': { title: ts('k_yy6vx5'), operType: ts('k_v1x3nb') },
      'tool.warning_triggered': { title: ts('k_1sxw9dx'), operType: ts('k_1qswpkf') },
      'tool.scrapped': { title: ts('k_ah6sir'), operType: ts('k_19qx965') },
    };

    const operation = operationMap[event.eventType];
    if (!operation) {
      secureLog('debug', 'No audit log mapping for event', { eventType: event.eventType });
      return;
    }

    await logOperation({
      title: operation.title,
      oper_type: operation.operType,
      oper_method: 'PUT',
      oper_url: '/api/warehouse/inbound',
      oper_param: JSON.stringify(event.payload),
      oper_result: `${operation.title}完成`,
    }).catch(() => {});

    secureLog('info', 'Audit log recorded', { eventType: event.eventType });
  }
}
