import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { DomainEvent } from '@/domain/shared/DomainTypes';
import { logOperation } from '@/lib/api-response';
import { secureLog } from '@/lib/logger';

export class AuditLogHandler implements EventHandler<DomainEvent> {
  async handle(event: DomainEvent): Promise<void> {
    const operationMap: Record<string, { title: string; operType: string }> = {
      'inbound.approved': { title: '入库单审核', operType: '审核' },
      'inbound.cancelled': { title: '入库单取消', operType: '取消' },
      'inbound.created': { title: '入库单创建', operType: '创建' },
      'inbound.submitted': { title: '入库单提交', operType: '提交' },
      'tool.created': { title: '工装创建', operType: '创建' },
      'tool.activated': { title: '工装激活', operType: '激活' },
      'tool.maintenance_started': { title: '工装维修开始', operType: '维修' },
      'tool.maintenance_completed': { title: '工装维修完成', operType: '维修' },
      'tool.warning_triggered': { title: '工装预警', operType: '预警' },
      'tool.scrapped': { title: '工装报废', operType: '报废' },
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
