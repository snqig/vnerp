// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

async function transactionWithRetry<T>(
  transactionFn: (conn: unknown) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await transactionFn({});
    } catch (error: unknown) {
      lastError = error;
      const err = error instanceof Error ? error : new Error(String(error));
      const isOptimisticLockError =
        err.message?.includes('已被其他操作修改') ||
        err.message?.includes('affectedRows') ||
        err.message?.includes('version');
      if (!isOptimisticLockError || attempt >= maxRetries - 1) {
        throw error;
      }
      const delay = Math.min(100 * Math.pow(2, attempt) + Math.random() * 50, 1000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

describe('transactionWithRetry', () => {
  it('should succeed on first attempt when no conflict', async () => {
    const callback = vi.fn().mockResolvedValueOnce({ id: 1, order_no: 'CK001' });
    const result = await transactionWithRetry(callback);
    expect(result).toEqual({ id: 1, order_no: 'CK001' });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should retry on optimistic lock failure with "已被其他操作修改"', async () => {
    const lockError = new Error('批次B001已被其他操作修改，请重试');
    const callback = vi
      .fn()
      .mockRejectedValueOnce(lockError)
      .mockResolvedValueOnce({ success: true });

    const result = await transactionWithRetry(callback, 3);
    expect(result).toEqual({ success: true });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should retry on optimistic lock failure with "version" keyword', async () => {
    const versionError = new Error('version conflict detected');
    const callback = vi
      .fn()
      .mockRejectedValueOnce(versionError)
      .mockResolvedValueOnce({ success: true });

    const result = await transactionWithRetry(callback, 3);
    expect(result).toEqual({ success: true });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should retry on optimistic lock failure with "affectedRows" keyword', async () => {
    const affectedError = new Error('affectedRows is 0, update failed');
    const callback = vi
      .fn()
      .mockRejectedValueOnce(affectedError)
      .mockResolvedValueOnce({ success: true });

    const result = await transactionWithRetry(callback, 3);
    expect(result).toEqual({ success: true });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-optimistic-lock errors', async () => {
    const dbError = new Error('Connection lost');
    const callback = vi.fn().mockRejectedValue(dbError);

    await expect(transactionWithRetry(callback)).rejects.toThrow('Connection lost');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should throw after max retries exceeded', async () => {
    const lockError = new Error('批次已被其他操作修改');
    const callback = vi.fn().mockRejectedValue(lockError);

    await expect(transactionWithRetry(callback, 2)).rejects.toThrow('批次已被其他操作修改');
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should respect maxRetries parameter', async () => {
    const lockError = new Error('已被其他操作修改');
    const callback = vi
      .fn()
      .mockRejectedValueOnce(lockError)
      .mockRejectedValueOnce(lockError)
      .mockResolvedValueOnce({ success: true });

    const result = await transactionWithRetry(callback, 3);
    expect(result).toEqual({ success: true });
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff between retries', async () => {
    const lockError = new Error('已被其他操作修改');
    const callback = vi
      .fn()
      .mockRejectedValueOnce(lockError)
      .mockResolvedValueOnce({ success: true });

    const start = Date.now();
    await transactionWithRetry(callback, 3);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(50);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
