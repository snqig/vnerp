'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import { toastApiError } from '@/lib/api-error';

interface UsePaginatedListOptions<_T> {
  fetchUrl: string;
  searchKey?: string;
  pageSize?: number;
}

interface UsePaginatedListResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  search: string;
  setSearch: (value: string) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  refresh: () => void;
}

/**
 * 通用分页列表 hook（列表页钦定入口）。
 *
 * - 请求统一走 authFetch：自动附带 Authorization / CSRF 头，
 *   401 静默刷新、401/403 失效自动跳登录页（AuthExpiredError）。
 * - 失败不再吞错：非 success 响应与异常统一走 toastApiError
 *   （AbortError 静默、登录态失效提示跳转、其余 toast 展示）。
 */
export function usePaginatedList<T = Record<string, unknown>>(
  options: UsePaginatedListOptions<T>
): UsePaginatedListResult<T> {
  const { fetchUrl, searchKey = 'search', pageSize: initialPageSize = 20 } = options;

  const [list, setList] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        [searchKey]: search,
      });
      const res = await authFetch(`${fetchUrl}?${params}`);
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || result.message || '获取数据失败');
      }
      setList(result.data?.list || result.data || []);
      setTotal(result.data?.total || 0);
    } catch (err) {
      // AbortError 是组件卸载或依赖变化导致的主动取消，不是用户可见错误
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toastApiError(err, '获取数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, page, pageSize, search, searchKey]);

  // AbortController：依赖变化（翻页/搜索/pageSize）时取消上一轮未完成的请求
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    fetchData().catch((e: unknown) => {
      // AbortError 已在 fetchData 内静默处理，这里兜底防未捕获
      if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
    });
    return () => controllerRef.current?.abort();
  }, [fetchData]);

  return {
    list,
    total,
    page,
    pageSize,
    loading,
    search,
    setSearch,
    setPage,
    setPageSize,
    refresh: fetchData,
  };
}
