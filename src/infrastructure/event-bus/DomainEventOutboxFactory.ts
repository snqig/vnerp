import { MemoryDomainEventOutbox } from './MemoryDomainEventOutbox';
import { MysqlDomainEventOutboxRepository } from '@/infrastructure/repositories/MysqlDomainEventOutboxRepository';
import type { IDomainEventOutboxRepository } from './types/IDomainEventOutboxRepository';

// re-export 类供 instanceof 检查使用
export { MemoryDomainEventOutbox };
// DbDomainEventOutbox 作为别名指向 MysqlDomainEventOutboxRepository
export const DbDomainEventOutbox = MysqlDomainEventOutboxRepository;

/**
 * EVENT_BUS_TYPE 配置项类型
 * - memory: 纯内存模式，事件不持久化（默认，向后兼容）
 * - db: 数据库持久化模式，事件落库 + OutboxPoller 自动消费
 */
export type EventBusType = 'memory' | 'db';

/**
 * 读取 EVENT_BUS_TYPE 环境变量，返回合法值
 * - 未设置或非法值时降级为 'memory'（向后兼容）
 */
export function getEventBusType(): EventBusType {
  const raw = (process.env.EVENT_BUS_TYPE || '').toLowerCase().trim();
  return raw === 'db' ? 'db' : 'memory';
}

// 单例缓存：避免每次调用都创建新实例
let memoryOutbox: MemoryDomainEventOutbox | null = null;
let dbOutbox: MysqlDomainEventOutboxRepository | null = null;

/**
 * 领域事件 Outbox 工厂
 *
 * 根据 EVENT_BUS_TYPE 环境变量返回对应实现：
 * - memory 模式：返回 MemoryDomainEventOutbox 单例（no-op）
 * - db 模式：返回 MysqlDomainEventOutboxRepository 单例
 *
 * 设计原则：
 * - 单例缓存，避免重复创建
 * - 配置在进程启动后通常不变，运行时切换需重启进程
 * - 工厂方法便于单元测试 mock
 */
export function getDomainEventOutbox(): IDomainEventOutboxRepository {
  const type = getEventBusType();
  if (type === 'db') {
    if (!dbOutbox) {
      dbOutbox = new MysqlDomainEventOutboxRepository();
    }
    return dbOutbox;
  }

  if (!memoryOutbox) {
    memoryOutbox = new MemoryDomainEventOutbox();
  }
  return memoryOutbox;
}

/**
 * 重置工厂单例缓存（仅供单元测试使用）
 * 生产代码不要调用
 */
export function __resetOutboxFactoryForTest(): void {
  memoryOutbox = null;
  dbOutbox = null;
}
