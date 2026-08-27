import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPool } from '@/lib/db';
import { SagaLogRepository } from '@/infrastructure/repositories/SagaLogRepository';
import { CrossModuleSagaHandler } from '@/application/handlers/CrossModuleSagaHandler';
import { InMemoryEventBus, EventHandler } from '@/infrastructure/event-bus/EventBus';
import { DomainEvent } from '@/domain/shared/DomainTypes';

describe('跨模块一致性集成测试', () => {
  let sagaLogRepository: SagaLogRepository;
  let eventBus: InMemoryEventBus;
  let sagaHandler: CrossModuleSagaHandler;

  beforeEach(async () => {
    sagaLogRepository = new SagaLogRepository();
    eventBus = new InMemoryEventBus();
    sagaHandler = new CrossModuleSagaHandler(sagaLogRepository, eventBus);

    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.execute(
        'DELETE FROM saga_log WHERE saga_type IN (?, ?, ?)',
        ['workorder_completion', 'material_issue', 'work_report']
      );
    } finally {
      conn.release();
    }
  });

  afterEach(async () => {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.execute(
        'DELETE FROM saga_log WHERE saga_type IN (?, ?, ?)',
        ['workorder_completion', 'material_issue', 'work_report']
      );
    } finally {
      conn.release();
    }
  });

  describe('工单完工 Saga', () => {
    it('完整链路成功时应记录所有步骤为 success', async () => {
      const publishedEvents: string[] = [];
      
      const createHandler = (eventType: string): EventHandler => ({
        handle: async () => { publishedEvents.push(eventType); }
      });

      eventBus.subscribe('workorder.status.update', createHandler('workorder.status.update'));
      eventBus.subscribe('workorder.completed', createHandler('workorder.completed'));
      eventBus.subscribe('production.finance.cost_collect', createHandler('production.finance.cost_collect'));
      eventBus.subscribe('hr.salary.piece_calculate', createHandler('hr.salary.piece_calculate'));

      await sagaHandler.handleWorkOrderCompletion(99999);

      expect(publishedEvents).toContain('workorder.status.update');
      expect(publishedEvents).toContain('workorder.completed');
      expect(publishedEvents).toContain('production.finance.cost_collect');
      expect(publishedEvents).toContain('hr.salary.piece_calculate');
    });

    it('中间步骤失败时应触发补偿事件', async () => {
      const compensationEvents: string[] = [];
      
      eventBus.subscribe('workorder.status.update', { handle: async () => {} });
      eventBus.subscribe('workorder.completed', { 
        handle: async () => { throw new Error('库存入库失败'); } 
      });
      eventBus.subscribe('saga.compensate.update_workorder', { 
        handle: async () => { compensationEvents.push('saga.compensate.update_workorder'); } 
      });

      await expect(sagaHandler.handleWorkOrderCompletion(99998)).rejects.toThrow('库存入库失败');

      expect(compensationEvents).toContain('saga.compensate.update_workorder');
    });
  });

  describe('领料 Saga', () => {
    it('领料完整链路应成功执行', async () => {
      const events: string[] = [];
      
      const createHandler = (eventType: string): EventHandler => ({
        handle: async () => { events.push(eventType); }
      });

      eventBus.subscribe('material.pick.issued', createHandler('material.pick.issued'));
      eventBus.subscribe('inventory.material.deduct', createHandler('inventory.material.deduct'));
      eventBus.subscribe('finance.material.issue', createHandler('finance.material.issue'));

      await sagaHandler.handleMaterialIssue(88888);

      expect(events).toHaveLength(3);
    });

    it('库存扣减失败时应补偿领料单状态', async () => {
      const events: string[] = [];
      
      eventBus.subscribe('material.pick.issued', { 
        handle: async () => { events.push('material.pick.issued'); } 
      });
      eventBus.subscribe('inventory.material.deduct', { 
        handle: async () => { throw new Error('库存不足'); } 
      });
      eventBus.subscribe('saga.compensate.update_pick_order', { 
        handle: async () => { events.push('saga.compensate.update_pick_order'); } 
      });

      await expect(sagaHandler.handleMaterialIssue(88887)).rejects.toThrow('库存不足');

      expect(events).toContain('saga.compensate.update_pick_order');
    });
  });

  describe('报工 Saga', () => {
    it('报工完整链路应成功执行', async () => {
      const events: string[] = [];
      
      const createHandler = (eventType: string): EventHandler => ({
        handle: async () => { events.push(eventType); }
      });

      eventBus.subscribe('workreport.validated', createHandler('workreport.validated'));
      eventBus.subscribe('workreport.submitted', createHandler('workreport.submitted'));
      eventBus.subscribe('hr.piecework.record', createHandler('hr.piecework.record'));

      await sagaHandler.handleWorkReport(77777);

      expect(events).toHaveLength(3);
    });
  });

  describe('Saga 状态流转', () => {
    it('应正确处理 pending → executing → success 流程', async () => {
      eventBus.subscribe('workorder.status.update', { handle: async () => {} });
      eventBus.subscribe('workorder.completed', { handle: async () => {} });
      eventBus.subscribe('production.finance.cost_collect', { handle: async () => {} });
      eventBus.subscribe('hr.salary.piece_calculate', { handle: async () => {} });

      await sagaHandler.handleWorkOrderCompletion(66666);

      const sagas = await sagaLogRepository.findPendingSagas();
      expect(sagas.length).toBe(0);
    });
  });
});