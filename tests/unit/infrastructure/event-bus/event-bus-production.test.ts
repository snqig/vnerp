import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/infrastructure/repositories/MysqlDomainEventOutboxRepository', () => ({
  MysqlDomainEventOutboxRepository: vi.fn(),
}));

vi.mock('@/infrastructure/event-bus/MemoryDomainEventOutbox', () => ({
  MemoryDomainEventOutbox: vi.fn(),
}));

const { __resetOutboxFactoryForTest, getEventBusType } = await import('@/infrastructure/event-bus/DomainEventOutboxFactory');

describe('EventBusFactory 生产环境强制 DB 模式', () => {
  beforeEach(() => {
    __resetOutboxFactoryForTest();
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    __resetOutboxFactoryForTest();
    vi.unstubAllEnvs();
  });

  it('生产环境未配置 EVENT_BUS_TYPE 应抛出错误', () => {
    vi.stubEnv('EVENT_BUS_TYPE', '');
    
    expect(() => getEventBusType()).toThrow(
      '生产环境必须配置 EVENT_BUS_TYPE=db，memory 模式不支持多实例部署'
    );
  });

  it('生产环境配置 EVENT_BUS_TYPE=memory 应抛出错误', () => {
    vi.stubEnv('EVENT_BUS_TYPE', 'memory');
    
    expect(() => getEventBusType()).toThrow(
      '生产环境必须配置 EVENT_BUS_TYPE=db，memory 模式不支持多实例部署'
    );
  });

  it('生产环境配置 EVENT_BUS_TYPE=db 应返回 db', () => {
    vi.stubEnv('EVENT_BUS_TYPE', 'db');
    
    const type = getEventBusType();
    expect(type).toBe('db');
  });
});

describe('EventBusFactory 开发环境降级', () => {
  beforeEach(() => {
    __resetOutboxFactoryForTest();
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    __resetOutboxFactoryForTest();
    vi.unstubAllEnvs();
  });

  it('开发环境未配置 EVENT_BUS_TYPE 应默认返回 memory', () => {
    vi.stubEnv('EVENT_BUS_TYPE', '');
    
    const type = getEventBusType();
    expect(type).toBe('memory');
  });

  it('开发环境配置 EVENT_BUS_TYPE=db 应返回 db', () => {
    vi.stubEnv('EVENT_BUS_TYPE', 'db');
    
    const type = getEventBusType();
    expect(type).toBe('db');
  });
});