import { EventHandler } from '../../infrastructure/event-bus/EventBus';
import { DomainEvent } from '@/domain/shared/DomainTypes';
import { getCacheManager } from '@/infrastructure/cache/CacheManager';

export class CacheInvalidationHandler implements EventHandler<DomainEvent> {
  async handle(event: DomainEvent): Promise<void> {
    const cache = getCacheManager();

    const invalidationMap: Record<string, string[]> = {
      'inbound.approved': ['dashboard:overview', 'dashboard:inventory'],
      'inbound.cancelled': ['dashboard:overview'],
      'outbound.confirmed': ['dashboard:overview', 'dashboard:inventory'],
      'quality.inspection.completed': ['dashboard:quality'],
      'production.schedule.created': ['dashboard:production'],
    };

    const keysToDelete = invalidationMap[event.eventType] || [];
    for (const key of keysToDelete) {
      await cache.delete(key);
    }
  }
}
