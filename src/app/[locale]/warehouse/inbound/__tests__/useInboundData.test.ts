import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/lib/auth-fetch', () => ({
  authFetch: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    stepStart: vi.fn(),
    stepEnd: vi.fn(),
    branch: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { useInboundData } from '../hooks/useInboundData';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from 'sonner';

const mockJsonResponse = (data: any, ok = true) =>
  ({
    ok,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
  }) as any;

const sampleRecord = {
  id: 1,
  order_no: 'PO-001',
  status: 'approved',
  supplier_name: '供应商A',
  create_time: new Date().toISOString(),
  items: [],
};

describe('useInboundData', () => {
  beforeEach(() => {
    vi.mocked(authFetch).mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('初始状态为空', () => {
    vi.mocked(authFetch).mockResolvedValue(mockJsonResponse({ success: true, data: { list: [] } }));
    const { result } = renderHook(() => useInboundData());
    expect(result.current.inboundRecords).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedRecords).toEqual([]);
  });

  it('挂载后并行拉取入库单、仓库、分类、供应商、标签', async () => {
    vi.mocked(authFetch).mockImplementation(async (url: string) => {
      if (url.startsWith('/api/warehouse/inbound?')) {
        return mockJsonResponse({ success: true, data: { list: [sampleRecord] } });
      }
      if (url.startsWith('/api/warehouse?')) {
        return mockJsonResponse({ success: true, data: [{ id: 1, warehouse_name: '主仓库' }] });
      }
      if (url.startsWith('/api/organization/warehouse-category')) {
        return mockJsonResponse({ success: true, data: [{ id: 1, category_name: '原料仓' }] });
      }
      if (url.startsWith('/api/purchase/suppliers')) {
        return mockJsonResponse({ success: true, data: [{ id: 1, supplier_name: '供应商A' }] });
      }
      if (url.startsWith('/api/warehouse/inbound/labels')) {
        return mockJsonResponse({ success: true, data: { list: [{ id: 'L1', labelNo: 'LB-1' }] } });
      }
      return mockJsonResponse({ success: false });
    });

    const { result } = renderHook(() => useInboundData());

    await waitFor(() => expect(result.current.inboundRecords).toHaveLength(1));
    await waitFor(() => expect(result.current.warehouses).toHaveLength(1));
    await waitFor(() => expect(result.current.warehouseCategories).toHaveLength(1));
    await waitFor(() => expect(result.current.suppliers).toHaveLength(1));
    await waitFor(() => expect(result.current.labelList).toHaveLength(1));
  });

  it('fetchInboundRecords 处理 data 为数组的响应', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: [sampleRecord, { ...sampleRecord, id: 2 }] })
    );
    const { result } = renderHook(() => useInboundData());
    await waitFor(() => expect(result.current.inboundRecords).toHaveLength(2));
  });

  it('fetchInboundRecords 处理 API 返回失败', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: false, message: '权限不足' })
    );
    const { result } = renderHook(() => useInboundData());
    await waitFor(() => expect(authFetch).toHaveBeenCalled());
    expect(result.current.inboundRecords).toEqual([]);
  });

  it('fetchInboundRecords 处理网络异常', async () => {
    vi.mocked(authFetch).mockRejectedValue(new Error('网络断开'));
    const { result } = renderHook(() => useInboundData());
    await waitFor(() => expect(authFetch).toHaveBeenCalled());
    expect(result.current.inboundRecords).toEqual([]);
  });

  it('handleRefresh 刷新数据并显示成功提示', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: { list: [sampleRecord] } })
    );
    const { result } = renderHook(() => useInboundData());

    await waitFor(() => expect(result.current.inboundRecords).toHaveLength(1));

    vi.mocked(authFetch).mockClear();
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: { list: [sampleRecord, { ...sampleRecord, id: 2 }] } })
    );

    await act(async () => {
      await result.current.handleRefresh();
    });

    expect(result.current.isLoading).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('dataRefreshed');
    await waitFor(() => expect(result.current.inboundRecords).toHaveLength(2));
  });

  it('setSearchQuery 更新搜索关键词', () => {
    vi.mocked(authFetch).mockResolvedValue(mockJsonResponse({ success: true, data: { list: [] } }));
    const { result } = renderHook(() => useInboundData());
    act(() => result.current.setSearchQuery('PO-001'));
    expect(result.current.searchQuery).toBe('PO-001');
  });

  it('setSelectedRecords 更新选中记录', () => {
    vi.mocked(authFetch).mockResolvedValue(mockJsonResponse({ success: true, data: { list: [] } }));
    const { result } = renderHook(() => useInboundData());
    act(() => result.current.setSelectedRecords([1, 2, 3]));
    expect(result.current.selectedRecords).toEqual([1, 2, 3]);
  });

  it('totalInboundToday 统计今日入库数量', async () => {
    const todayRecord = { ...sampleRecord, create_time: new Date().toISOString() };
    const oldRecord = { ...sampleRecord, id: 2, create_time: '2020-01-01T00:00:00Z' };
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: { list: [todayRecord, oldRecord] } })
    );
    const { result } = renderHook(() => useInboundData());
    await waitFor(() => expect(result.current.inboundRecords).toHaveLength(2));
    expect(result.current.totalInboundToday).toBe(1);
  });

  it('totalInboundMonth 统计本月入库数量', async () => {
    const now = new Date();
    const thisMonthRecord = { ...sampleRecord, create_time: now.toISOString() };
    const lastMonthRecord = {
      ...sampleRecord,
      id: 2,
      create_time: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString(),
    };
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: { list: [thisMonthRecord, lastMonthRecord] } })
    );
    const { result } = renderHook(() => useInboundData());
    await waitFor(() => expect(result.current.inboundRecords).toHaveLength(2));
    expect(result.current.totalInboundMonth).toBe(1);
  });

  it('data.data 为 null 时记录列表为空', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: null })
    );
    const { result } = renderHook(() => useInboundData());
    await waitFor(() => expect(authFetch).toHaveBeenCalled());
    expect(result.current.inboundRecords).toEqual([]);
  });

  it('使用 createTime（驼峰）字段也能正确统计今日入库', async () => {
    const todayRecord = { ...sampleRecord, create_time: undefined, createTime: new Date().toISOString() };
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: { list: [todayRecord] } })
    );
    const { result } = renderHook(() => useInboundData());
    await waitFor(() => expect(result.current.inboundRecords).toHaveLength(1));
    expect(result.current.totalInboundToday).toBe(1);
  });

  it('create_time 为空字符串的记录不计入今日/本月统计', async () => {
    const emptyTimeRecord = { ...sampleRecord, id: 2, create_time: '' };
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: { list: [sampleRecord, emptyTimeRecord] } })
    );
    const { result } = renderHook(() => useInboundData());
    await waitFor(() => expect(result.current.inboundRecords).toHaveLength(2));
    // sampleRecord 的 create_time 为今天，emptyTimeRecord 的 create_time 为空 → Invalid Date 不等于今天
    expect(result.current.totalInboundToday).toBe(1);
  });

  it('statusFilter 变更时触发带 status 参数的重新拉取', async () => {
    vi.mocked(authFetch).mockImplementation(async (url: string) => {
      if (url.startsWith('/api/warehouse/inbound?')) {
        return mockJsonResponse({ success: true, data: { list: [sampleRecord] } });
      }
      return mockJsonResponse({ success: true, data: [] });
    });

    const { result } = renderHook(() => useInboundData());
    await waitFor(() => expect(result.current.inboundRecords).toHaveLength(1));

    vi.mocked(authFetch).mockClear();
    act(() => result.current.setStatusFilter('approved'));

    await waitFor(() => expect(authFetch).toHaveBeenCalled());
    const inboundCallUrl = vi
      .mocked(authFetch)
      .mock.calls.find((c) => (c[0] as string).startsWith('/api/warehouse/inbound?'))?.[0] as string;
    expect(inboundCallUrl).toContain('status=approved');
  });

  it('fetchWarehouses API 返回失败时仓库列表保持为空', async () => {
    vi.mocked(authFetch).mockImplementation(async (url: string) => {
      if (url.startsWith('/api/warehouse/inbound?')) {
        return mockJsonResponse({ success: true, data: { list: [] } });
      }
      if (url.startsWith('/api/warehouse?')) {
        return mockJsonResponse({ success: false, message: '权限不足' });
      }
      return mockJsonResponse({ success: true, data: [] });
    });

    const { result } = renderHook(() => useInboundData());
    await waitFor(() => expect(authFetch).toHaveBeenCalled());
    await waitFor(() => expect(result.current.warehouses).toEqual([]));
  });

  it('fetchSuppliers API 返回失败时供应商列表保持为空', async () => {
    vi.mocked(authFetch).mockImplementation(async (url: string) => {
      if (url.startsWith('/api/warehouse/inbound?')) {
        return mockJsonResponse({ success: true, data: { list: [] } });
      }
      if (url.startsWith('/api/purchase/suppliers')) {
        return mockJsonResponse({ success: false, message: '权限不足' });
      }
      return mockJsonResponse({ success: true, data: [] });
    });

    const { result } = renderHook(() => useInboundData());
    await waitFor(() => expect(authFetch).toHaveBeenCalled());
    await waitFor(() => expect(result.current.suppliers).toEqual([]));
  });
});
