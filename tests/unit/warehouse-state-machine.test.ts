/**
 * 库存状态机单元测试
 * 测试入库单、出库单的状态流转规则
 */

import { describe, it, expect } from 'vitest';
import {
  WarehouseStateMachine,
  inboundStateMachine,
  outboundStateMachine,
  type InboundStatus,
  type OutboundStatus,
} from '@/lib/warehouse-state-machine';

describe('库存状态机', () => {
  describe('入库单状态流转', () => {
    describe('canTransitionInbound', () => {
      it('应该允许 draft → pending', () => {
        expect(WarehouseStateMachine.canTransitionInbound('draft', 'pending')).toBe(true);
      });

      it('应该允许 draft → cancelled', () => {
        expect(WarehouseStateMachine.canTransitionInbound('draft', 'cancelled')).toBe(true);
      });

      it('应该不允许 draft → completed', () => {
        expect(WarehouseStateMachine.canTransitionInbound('draft', 'completed')).toBe(false);
      });

      it('应该允许 pending → completed', () => {
        expect(WarehouseStateMachine.canTransitionInbound('pending', 'completed')).toBe(true);
      });

      it('应该允许 pending → cancelled', () => {
        expect(WarehouseStateMachine.canTransitionInbound('pending', 'cancelled')).toBe(true);
      });

      it('应该允许 completed → pending（撤销审核）', () => {
        expect(WarehouseStateMachine.canTransitionInbound('completed', 'pending')).toBe(true);
      });

      it('应该不允许 cancelled → 任何状态', () => {
        const statuses: InboundStatus[] = ['draft', 'pending', 'completed', 'cancelled'];
        for (const to of statuses) {
          if (to === 'cancelled') continue;
          expect(WarehouseStateMachine.canTransitionInbound('cancelled', to)).toBe(false);
        }
      });

      it('应该不允许 pending → draft', () => {
        expect(WarehouseStateMachine.canTransitionInbound('pending', 'draft')).toBe(false);
      });

      it('应该不允许 completed → cancelled', () => {
        expect(WarehouseStateMachine.canTransitionInbound('completed', 'cancelled')).toBe(false);
      });
    });

    describe('canEditInbound', () => {
      it('应该允许编辑草稿状态', () => {
        expect(WarehouseStateMachine.canEditInbound('draft')).toBe(true);
      });

      it('应该不允许编辑待审核状态', () => {
        expect(WarehouseStateMachine.canEditInbound('pending')).toBe(false);
      });

      it('应该不允许编辑已完成状态', () => {
        expect(WarehouseStateMachine.canEditInbound('completed')).toBe(false);
      });

      it('应该不允许编辑已取消状态', () => {
        expect(WarehouseStateMachine.canEditInbound('cancelled')).toBe(false);
      });
    });

    describe('canDeleteInbound', () => {
      it('应该允许删除草稿状态', () => {
        expect(WarehouseStateMachine.canDeleteInbound('draft')).toBe(true);
      });

      it('应该不允许删除非草稿状态', () => {
        expect(WarehouseStateMachine.canDeleteInbound('pending')).toBe(false);
        expect(WarehouseStateMachine.canDeleteInbound('completed')).toBe(false);
        expect(WarehouseStateMachine.canDeleteInbound('cancelled')).toBe(false);
      });
    });

    describe('canAuditInbound', () => {
      it('应该允许审核待审核状态', () => {
        expect(WarehouseStateMachine.canAuditInbound('pending')).toBe(true);
      });

      it('应该不允许审核非待审核状态', () => {
        expect(WarehouseStateMachine.canAuditInbound('draft')).toBe(false);
        expect(WarehouseStateMachine.canAuditInbound('completed')).toBe(false);
        expect(WarehouseStateMachine.canAuditInbound('cancelled')).toBe(false);
      });
    });

    describe('getInboundStatusLabel', () => {
      it('应该返回正确的状态标签', () => {
        expect(WarehouseStateMachine.getInboundStatusLabel('draft')).toBe('草稿');
        expect(WarehouseStateMachine.getInboundStatusLabel('pending')).toBe('待审核');
        expect(WarehouseStateMachine.getInboundStatusLabel('completed')).toBe('已完成');
        expect(WarehouseStateMachine.getInboundStatusLabel('cancelled')).toBe('已取消');
      });
    });

    describe('getInboundStatusColor', () => {
      it('应该返回正确的状态颜色', () => {
        expect(WarehouseStateMachine.getInboundStatusColor('draft')).toContain('gray');
        expect(WarehouseStateMachine.getInboundStatusColor('pending')).toContain('yellow');
        expect(WarehouseStateMachine.getInboundStatusColor('completed')).toContain('green');
        expect(WarehouseStateMachine.getInboundStatusColor('cancelled')).toContain('red');
      });
    });
  });

  describe('出库单状态流转', () => {
    describe('canTransitionOutbound', () => {
      it('应该允许 draft → pending', () => {
        expect(WarehouseStateMachine.canTransitionOutbound('draft', 'pending')).toBe(true);
      });

      it('应该允许 draft → cancelled', () => {
        expect(WarehouseStateMachine.canTransitionOutbound('draft', 'cancelled')).toBe(true);
      });

      it('应该不允许 draft → completed', () => {
        expect(WarehouseStateMachine.canTransitionOutbound('draft', 'completed')).toBe(false);
      });

      it('应该允许 pending → completed', () => {
        expect(WarehouseStateMachine.canTransitionOutbound('pending', 'completed')).toBe(true);
      });

      it('应该允许 pending → cancelled', () => {
        expect(WarehouseStateMachine.canTransitionOutbound('pending', 'cancelled')).toBe(true);
      });

      it('应该允许 completed → pending（撤销确认）', () => {
        expect(WarehouseStateMachine.canTransitionOutbound('completed', 'pending')).toBe(true);
      });

      it('应该不允许 cancelled → 任何状态', () => {
        const statuses: OutboundStatus[] = ['draft', 'pending', 'completed', 'cancelled'];
        for (const to of statuses) {
          if (to === 'cancelled') continue;
          expect(WarehouseStateMachine.canTransitionOutbound('cancelled', to)).toBe(false);
        }
      });
    });

    describe('canEditOutbound', () => {
      it('应该允许编辑草稿状态', () => {
        expect(WarehouseStateMachine.canEditOutbound('draft')).toBe(true);
      });

      it('应该不允许编辑非草稿状态', () => {
        expect(WarehouseStateMachine.canEditOutbound('pending')).toBe(false);
        expect(WarehouseStateMachine.canEditOutbound('completed')).toBe(false);
        expect(WarehouseStateMachine.canEditOutbound('cancelled')).toBe(false);
      });
    });

    describe('canDeleteOutbound', () => {
      it('应该允许删除草稿状态', () => {
        expect(WarehouseStateMachine.canDeleteOutbound('draft')).toBe(true);
      });

      it('应该不允许删除非草稿状态', () => {
        expect(WarehouseStateMachine.canDeleteOutbound('pending')).toBe(false);
        expect(WarehouseStateMachine.canDeleteOutbound('completed')).toBe(false);
        expect(WarehouseStateMachine.canDeleteOutbound('cancelled')).toBe(false);
      });
    });

    describe('canConfirmOutbound', () => {
      it('应该允许确认待确认状态', () => {
        expect(WarehouseStateMachine.canConfirmOutbound('pending')).toBe(true);
      });

      it('应该不允许确认非待确认状态', () => {
        expect(WarehouseStateMachine.canConfirmOutbound('draft')).toBe(false);
        expect(WarehouseStateMachine.canConfirmOutbound('completed')).toBe(false);
        expect(WarehouseStateMachine.canConfirmOutbound('cancelled')).toBe(false);
      });
    });

    describe('getOutboundStatusLabel', () => {
      it('应该返回正确的状态标签', () => {
        expect(WarehouseStateMachine.getOutboundStatusLabel('draft')).toBe('草稿');
        expect(WarehouseStateMachine.getOutboundStatusLabel('pending')).toBe('待确认');
        expect(WarehouseStateMachine.getOutboundStatusLabel('completed')).toBe('已完成');
        expect(WarehouseStateMachine.getOutboundStatusLabel('cancelled')).toBe('已取消');
      });
    });

    describe('getOutboundStatusColor', () => {
      it('应该返回正确的状态颜色', () => {
        expect(WarehouseStateMachine.getOutboundStatusColor('draft')).toContain('gray');
        expect(WarehouseStateMachine.getOutboundStatusColor('pending')).toContain('blue');
        expect(WarehouseStateMachine.getOutboundStatusColor('completed')).toContain('green');
        expect(WarehouseStateMachine.getOutboundStatusColor('cancelled')).toContain('red');
      });
    });
  });

  describe('状态流转错误信息', () => {
    it('应该返回入库单状态流转错误信息', () => {
      const error = WarehouseStateMachine.getTransitionError('inbound', 'draft', 'completed');
      expect(error).toContain('入库单');
      expect(error).toContain('草稿');
      expect(error).toContain('已完成');
      expect(error).toContain('不合法');
    });

    it('应该返回出库单状态流转错误信息', () => {
      const error = WarehouseStateMachine.getTransitionError('outbound', 'draft', 'completed');
      expect(error).toContain('出库单');
      expect(error).toContain('草稿');
      expect(error).toContain('已完成');
      expect(error).toContain('不合法');
    });
  });

  describe('状态机配置完整性', () => {
    it('入库单状态机应该包含所有必要的状态', () => {
      const statuses: InboundStatus[] = ['draft', 'pending', 'completed', 'cancelled'];
      for (const status of statuses) {
        expect(inboundStateMachine[status]).toBeDefined();
        expect(inboundStateMachine[status].label).toBeDefined();
        expect(inboundStateMachine[status].color).toBeDefined();
        expect(inboundStateMachine[status].allowedTransitions).toBeDefined();
        expect(inboundStateMachine[status].allowedOperations).toBeDefined();
      }
    });

    it('出库单状态机应该包含所有必要的状态', () => {
      const statuses: OutboundStatus[] = ['draft', 'pending', 'completed', 'cancelled'];
      for (const status of statuses) {
        expect(outboundStateMachine[status]).toBeDefined();
        expect(outboundStateMachine[status].label).toBeDefined();
        expect(outboundStateMachine[status].color).toBeDefined();
        expect(outboundStateMachine[status].allowedTransitions).toBeDefined();
        expect(outboundStateMachine[status].allowedOperations).toBeDefined();
      }
    });

    it('每个状态应该有至少一个允许的操作', () => {
      const inboundStatuses: InboundStatus[] = ['draft', 'pending', 'completed', 'cancelled'];
      for (const status of inboundStatuses) {
        expect(inboundStateMachine[status].allowedOperations.length).toBeGreaterThan(0);
      }

      const outboundStatuses: OutboundStatus[] = ['draft', 'pending', 'completed', 'cancelled'];
      for (const status of outboundStatuses) {
        expect(outboundStateMachine[status].allowedOperations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('边界情况', () => {
    it('应该处理无效状态输入', () => {
      // @ts-expect-error 测试无效输入
      expect(WarehouseStateMachine.canTransitionInbound('invalid', 'draft')).toBe(false);
      // @ts-expect-error 测试无效输入
      expect(WarehouseStateMachine.getInboundStatusLabel('invalid')).toBe('invalid');
    });

    it('应该处理相同状态的转换', () => {
      expect(WarehouseStateMachine.canTransitionInbound('draft', 'draft')).toBe(false);
      expect(WarehouseStateMachine.canTransitionOutbound('pending', 'pending')).toBe(false);
    });
  });
});
