/**
 * 单元测试：事务可重试错误判定 isRetryableTransactionError
 *
 * 回归两类曾经漏判的场景：
 * 1. FIFO 乐观锁冲突抛出的是自定义错误，文案为中文（「批次X乐观锁冲突: 期望版本Y」），
 *    不含 version / affectedRows 等英文关键字 —— 早期纯文案匹配会漏判，导致冲突永不重试。
 * 2. InnoDB 死锁 / 锁等待超时应按 errno / code / sqlState 判定，不依赖文案。
 */

import { describe, it, expect } from 'vitest';
import { isRetryableTransactionError } from '@/lib/db';
import { FifoOptimisticLockConflictError } from '@/lib/fifo-allocation';

describe('isRetryableTransactionError', () => {
  it('FIFO 乐观锁冲突错误（中文文案）判定为可重试', () => {
    const err = new FifoOptimisticLockConflictError('批次B-001乐观锁冲突: 期望版本3, 实际版本5');
    expect(isRetryableTransactionError(err)).toBe(true);
  });

  it('InnoDB 死锁：errno=1213 / code=ER_LOCK_DEADLOCK / sqlState=40001 均可重试', () => {
    expect(isRetryableTransactionError({ errno: 1213, code: 'ER_LOCK_DEADLOCK' })).toBe(true);
    expect(isRetryableTransactionError({ errno: 1205, code: 'ER_LOCK_WAIT_TIMEOUT' })).toBe(true);
    expect(isRetryableTransactionError({ sqlState: '40001' })).toBe(true);
    expect(
      isRetryableTransactionError({ message: 'Deadlock found when trying to get lock' })
    ).toBe(true);
    expect(isRetryableTransactionError({ message: 'Lock wait timeout exceeded' })).toBe(true);
  });

  it('中文乐观锁文案（含「已被其他操作修改」）可重试', () => {
    expect(isRetryableTransactionError(new Error('该记录已被其他操作修改，请刷新后重试'))).toBe(
      true
    );
  });

  it('普通业务错误不可重试（避免无意义重放事务）', () => {
    expect(isRetryableTransactionError(new Error('物料ID 11 不存在'))).toBe(false);
    expect(isRetryableTransactionError(new Error('库存不足'))).toBe(false);
    expect(isRetryableTransactionError(null)).toBe(false);
    expect(isRetryableTransactionError(undefined)).toBe(false);
    expect(isRetryableTransactionError('deadlock')).toBe(false);
  });
});
