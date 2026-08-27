import { describe, it, expect } from 'vitest';
import {
  DomainError,
  NotFoundError,
  InvalidTransitionError,
  VersionConflictError,
} from '@/domain/shared/DomainTypes';

/**
 * 8.3 DomainTypes 错误层级与构造测试
 *
 * 覆盖目标：
 * 1. DomainError 基类构造（默认 code）
 * 2. NotFoundError 子类 code = NOT_FOUND
 * 3. InvalidTransitionError 子类 code = INVALID_TRANSITION
 * 4. VersionConflictError 子类 code = VERSION_CONFLICT
 * 5. instanceof 继承链正确
 */
describe('8.3 DomainTypes 错误层级', () => {
  describe('DomainError 基类', () => {
    it('默认 code 为 DOMAIN_ERROR', () => {
      const e = new DomainError('测试错误');
      expect(e.message).toBe('测试错误');
      expect(e.code).toBe('DOMAIN_ERROR');
      expect(e.name).toBe('DomainError');
    });

    it('自定义 code', () => {
      const e = new DomainError('测试错误', 'CUSTOM_CODE');
      expect(e.code).toBe('CUSTOM_CODE');
    });

    it('继承自 Error', () => {
      const e = new DomainError('测试');
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(DomainError);
    });
  });

  describe('NotFoundError', () => {
    it('code = NOT_FOUND', () => {
      const e = new NotFoundError('订单不存在');
      expect(e.message).toBe('订单不存在');
      expect(e.code).toBe('NOT_FOUND');
      expect(e.name).toBe('NotFoundError');
    });

    it('继承自 DomainError', () => {
      expect(new NotFoundError('x')).toBeInstanceOf(DomainError);
    });
  });

  describe('InvalidTransitionError', () => {
    it('message 包含 from 和 to', () => {
      const e = new InvalidTransitionError('draft', 'completed');
      expect(e.message).toContain('draft');
      expect(e.message).toContain('completed');
      expect(e.code).toBe('INVALID_TRANSITION');
      expect(e.name).toBe('InvalidTransitionError');
    });
  });

  describe('VersionConflictError', () => {
    it('默认 message', () => {
      const e = new VersionConflictError();
      expect(e.message).toBe('数据版本冲突，请刷新后重试');
      expect(e.code).toBe('VERSION_CONFLICT');
      expect(e.name).toBe('VersionConflictError');
    });
  });
});
