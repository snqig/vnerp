import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompanyName } from './useCompanyName';

const DEFAULT_NAME = '越南达昌科技有限公司';

// 构造符合 hook fetchWithRetry 校验（res.ok / res.status / res.headers）的响应
const mockJsonResponse = (data: any, opts: { ok?: boolean; status?: number } = {}) => ({
  ok: opts.ok !== false,
  status: opts.status ?? 200,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => data,
});

describe('useCompanyName Hook测试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('应该返回默认公司名称', () => {
    const { result } = renderHook(() => useCompanyName());
    expect(result.current.companyName).toBe(DEFAULT_NAME);
  });

  it('应该从系统配置获取公司名称（config 优先）', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: {
          list: [{ config_key: 'company_name', config_value: '配置公司名称' }],
        },
      })
    );
    global.fetch = mockFetch;

    const { result } = renderHook(() => useCompanyName());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.companyName).toBe('配置公司名称');
    expect(mockFetch).toHaveBeenCalledWith('/api/system/config?pageSize=200', expect.anything());
    // config 成功后不再调用 organization
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('应该使用配置短名称当全称不存在', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: {
          list: [{ config_key: 'company_short_name', config_value: '短名称公司' }],
        },
      })
    );
    global.fetch = mockFetch;

    const { result } = renderHook(() => useCompanyName());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.companyName).toBe('短名称公司');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('config 无公司配置时应从组织API获取全称', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse({ success: true, data: { list: [] } })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({ success: true, data: { full_name: '测试公司全称' } })
      );
    global.fetch = mockFetch;

    const { result } = renderHook(() => useCompanyName());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.companyName).toBe('测试公司全称');
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/organization?type=company', expect.anything());
  });

  it('组织API无全称时应使用短名称', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse({ success: false }))
      .mockResolvedValueOnce(
        mockJsonResponse({ success: true, data: { short_name: '测试短名' } })
      );
    global.fetch = mockFetch;

    const { result } = renderHook(() => useCompanyName());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.companyName).toBe('测试短名');
  });

  it('所有API失败时应保持默认值', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('网络错误'));
    global.fetch = mockFetch;

    const { result } = renderHook(() => useCompanyName());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.companyName).toBe(DEFAULT_NAME);
  });

  it('401响应应被视为未授权并保持默认值', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockJsonResponse({}, { status: 401, ok: false }));
    global.fetch = mockFetch;

    const { result } = renderHook(() => useCompanyName());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.companyName).toBe(DEFAULT_NAME);
  });

  it('空数据响应应保持默认值', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse({ success: true, data: null }))
      .mockResolvedValueOnce(mockJsonResponse({ success: true, data: { list: [] } }));
    global.fetch = mockFetch;

    const { result } = renderHook(() => useCompanyName());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.companyName).toBe(DEFAULT_NAME);
  });
});
