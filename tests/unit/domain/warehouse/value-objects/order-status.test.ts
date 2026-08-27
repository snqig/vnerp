import { describe, it, expect } from 'vitest';
import { OrderStatus } from '@/domain/warehouse/value-objects/OrderStatus';
import { DomainError } from '@/domain/shared/DomainTypes';

/**
 * 8.2/8.3 OrderStatus 值对象 + 状态机专项测试
 *
 * 覆盖目标：
 * 1. 静态工厂方法（draft/pending/completed/cancelled）
 * 2. from() 字符串转换（含 DB 字段映射 approved→completed）
 * 3. from() 非法值抛 DomainError
 * 4. 状态流转合法路径（draft→pending→completed→pending 反审）
 * 5. 非法状态流转抛 DomainError
 * 6. canEdit/canDelete 权限判断
 * 7. equals 相等性判断
 */
describe('8.2/8.3 OrderStatus 值对象与状态机', () => {
  describe('静态工厂方法', () => {
    it('draft() 创建草稿状态', () => {
      const s = OrderStatus.draft();
      expect(s.value).toBe('draft');
    });

    it('pending() 创建待审核状态', () => {
      const s = OrderStatus.pending();
      expect(s.value).toBe('pending');
    });

    it('completed() 创建已完成状态', () => {
      const s = OrderStatus.completed();
      expect(s.value).toBe('completed');
    });

    it('cancelled() 创建已取消状态', () => {
      const s = OrderStatus.cancelled();
      expect(s.value).toBe('cancelled');
    });
  });

  describe('from() 字符串转换', () => {
    it('合法领域状态直接映射', () => {
      expect(OrderStatus.from('draft').value).toBe('draft');
      expect(OrderStatus.from('pending').value).toBe('pending');
      expect(OrderStatus.from('completed').value).toBe('completed');
      expect(OrderStatus.from('cancelled').value).toBe('cancelled');
    });

    it('DB 状态 approved 映射为 completed（向后兼容）', () => {
      expect(OrderStatus.from('approved').value).toBe('completed');
    });

    it('非法状态字符串抛 DomainError', () => {
      expect(() => OrderStatus.from('invalid')).toThrow(DomainError);
      expect(() => OrderStatus.from('invalid')).toThrow(/无效的入库单状态/);
      expect(() => OrderStatus.from('')).toThrow(DomainError);
    });
  });

  describe('状态流转（合法路径）', () => {
    it('draft → pending（提交）', () => {
      const s = OrderStatus.draft();
      expect(s.canTransitionTo('pending')).toBe(true);
      expect(s.transitionTo('pending').value).toBe('pending');
    });

    it('draft → cancelled（取消）', () => {
      expect(OrderStatus.draft().transitionTo('cancelled').value).toBe('cancelled');
    });

    it('pending → completed（审核通过）', () => {
      expect(OrderStatus.pending().transitionTo('completed').value).toBe('completed');
    });

    it('pending → cancelled（取消）', () => {
      expect(OrderStatus.pending().transitionTo('cancelled').value).toBe('cancelled');
    });

    it('completed → pending（反审）', () => {
      expect(OrderStatus.completed().transitionTo('pending').value).toBe('pending');
    });
  });

  describe('非法状态流转', () => {
    it('draft → completed 抛 DomainError（不能直接完成）', () => {
      expect(() => OrderStatus.draft().transitionTo('completed')).toThrow(DomainError);
      expect(() => OrderStatus.draft().transitionTo('completed')).toThrow(/非法状态流转/);
    });

    it('cancelled → 任意状态抛 DomainError（终态不可流转）', () => {
      expect(() => OrderStatus.cancelled().transitionTo('draft')).toThrow(DomainError);
      expect(() => OrderStatus.cancelled().transitionTo('pending')).toThrow(DomainError);
      expect(() => OrderStatus.cancelled().transitionTo('completed')).toThrow(DomainError);
    });

    it('completed → cancelled 抛 DomainError（已完成不可取消）', () => {
      expect(() => OrderStatus.completed().transitionTo('cancelled')).toThrow(DomainError);
    });

    it('canTransitionTo 返回 false 不抛错', () => {
      expect(OrderStatus.draft().canTransitionTo('completed')).toBe(false);
      expect(OrderStatus.cancelled().canTransitionTo('pending')).toBe(false);
    });
  });

  describe('操作权限', () => {
    it('draft 状态可编辑可删除可提交', () => {
      const s = OrderStatus.draft();
      expect(s.canEdit()).toBe(true);
      expect(s.canDelete()).toBe(true);
    });

    it('pending 状态不可编辑不可删除', () => {
      const s = OrderStatus.pending();
      expect(s.canEdit()).toBe(false);
      expect(s.canDelete()).toBe(false);
    });

    it('completed 状态不可编辑不可删除', () => {
      const s = OrderStatus.completed();
      expect(s.canEdit()).toBe(false);
      expect(s.canDelete()).toBe(false);
    });

    it('cancelled 状态不可编辑不可删除', () => {
      const s = OrderStatus.cancelled();
      expect(s.canEdit()).toBe(false);
      expect(s.canDelete()).toBe(false);
    });
  });

  describe('相等性判断', () => {
    it('相同状态值相等', () => {
      expect(OrderStatus.draft().equals(OrderStatus.draft())).toBe(true);
      expect(OrderStatus.pending().equals(OrderStatus.pending())).toBe(true);
    });

    it('不同状态值不相等', () => {
      expect(OrderStatus.draft().equals(OrderStatus.pending())).toBe(false);
      expect(OrderStatus.completed().equals(OrderStatus.cancelled())).toBe(false);
    });
  });
});
