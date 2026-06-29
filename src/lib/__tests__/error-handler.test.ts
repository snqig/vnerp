import { describe, it, expect } from 'vitest';

/**
 * 前端错误处理 单元测试
 */

// 错误码映射
const ERROR_MESSAGES: Record<string, string> = {
  'UNAUTHORIZED': '登录已过期，请重新登录',
  'FORBIDDEN': '您没有权限执行此操作',
  'INVALID_TOKEN': '登录凭证无效，请重新登录',
  'PERMISSION_DENIED': '权限不足，请联系管理员',
  'NOT_FOUND': '请求的数据不存在',
  'DUPLICATE_ENTRY': '数据已存在，请勿重复添加',
  'INSUFFICIENT_STOCK': '库存不足，无法出库',
  'ORDER_STATUS_ERROR': '订单状态不允许此操作',
  'INTERNAL_ERROR': '系统内部错误，请稍后重试',
  'RATE_LIMITED': '操作过于频繁，请稍后再试',
};

const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: '请求参数错误，请检查输入',
  401: '登录已过期，请重新登录',
  403: '您没有权限执行此操作',
  404: '请求的资源不存在',
  500: '服务器内部错误，请稍后重试',
};

function getErrorMessage(error: unknown): string {
  if (error instanceof TypeError && (error as TypeError).message === 'Failed to fetch') {
    return '网络连接失败，请检查网络设置';
  }

  if (error && typeof error === 'object') {
    const err = error as { code?: string; message?: string; status?: number };

    if (err.code && ERROR_MESSAGES[err.code]) {
      return ERROR_MESSAGES[err.code];
    }

    if (err.status && HTTP_ERROR_MESSAGES[err.status]) {
      return HTTP_ERROR_MESSAGES[err.status];
    }

    if (err.message) {
      if (err.message.includes('SQL') || err.message.includes('ER_')) {
        return '数据库操作失败，请联系管理员';
      }
      if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
        return '网络连接失败，请稍后重试';
      }
      if (err.message.includes('jwt') || err.message.includes('token')) {
        return '登录已过期，请重新登录';
      }
      if (err.message.length < 100 && !err.message.includes('{') && !err.message.includes('at ')) {
        return err.message;
      }
    }
  }

  if (typeof error === 'string' && error.length < 100) {
    return error;
  }

  return '操作失败，请稍后重试';
}

describe('前端错误处理', () => {
  describe('getErrorMessage', () => {
    it('网络错误：Failed to fetch', () => {
      const error = new TypeError('Failed to fetch');
      expect(getErrorMessage(error)).toBe('网络连接失败，请检查网络设置');
    });

    it('错误码映射：UNAUTHORIZED', () => {
      expect(getErrorMessage({ code: 'UNAUTHORIZED' })).toBe('登录已过期，请重新登录');
    });

    it('错误码映射：PERMISSION_DENIED', () => {
      expect(getErrorMessage({ code: 'PERMISSION_DENIED' })).toBe('权限不足，请联系管理员');
    });

    it('错误码映射：INSUFFICIENT_STOCK', () => {
      expect(getErrorMessage({ code: 'INSUFFICIENT_STOCK' })).toBe('库存不足，无法出库');
    });

    it('HTTP状态码映射：401', () => {
      expect(getErrorMessage({ status: 401 })).toBe('登录已过期，请重新登录');
    });

    it('HTTP状态码映射：403', () => {
      expect(getErrorMessage({ status: 403 })).toBe('您没有权限执行此操作');
    });

    it('HTTP状态码映射：500', () => {
      expect(getErrorMessage({ status: 500 })).toBe('服务器内部错误，请稍后重试');
    });

    it('SQL错误过滤', () => {
      expect(getErrorMessage({ message: 'SQL error: ER_DUP_ENTRY' })).toBe('数据库操作失败，请联系管理员');
    });

    it('网络超时过滤', () => {
      expect(getErrorMessage({ message: 'ECONNREFUSED 127.0.0.1:3306' })).toBe('网络连接失败，请稍后重试');
    });

    it('JWT错误过滤', () => {
      expect(getErrorMessage({ message: 'jwt expired' })).toBe('登录已过期，请重新登录');
    });

    it('用户友好消息直接返回', () => {
      expect(getErrorMessage({ message: '用户名已存在' })).toBe('用户名已存在');
    });

    it('技术性堆栈信息过滤', () => {
      expect(getErrorMessage({ message: 'Error: something at Object.<anonymous> (file.js:1:1)' }))
        .toBe('操作失败，请稍后重试');
    });

    it('字符串错误直接返回', () => {
      expect(getErrorMessage('操作成功')).toBe('操作成功');
    });

    it('未知错误返回默认消息', () => {
      expect(getErrorMessage(null)).toBe('操作失败，请稍后重试');
    });

    it('过长字符串返回默认消息', () => {
      const longError = 'a'.repeat(200);
      expect(getErrorMessage(longError)).toBe('操作失败，请稍后重试');
    });

    it('优先使用错误码而非HTTP状态码', () => {
      expect(getErrorMessage({ code: 'INSUFFICIENT_STOCK', status: 400 }))
        .toBe('库存不足，无法出库');
    });
  });
});
