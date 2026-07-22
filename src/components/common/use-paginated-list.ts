'use client';

import { useState, useEffect, useCallback } from 'react';

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
  refresh: () => void;
}

export function usePaginatedList<T = Loose>(
  options: UsePaginatedListOptions<T>
): UsePaginatedListResult<T> {
  const { fetchUrl, searchKey = 'search', pageSize = 20 } = options;

  const [list, setList] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
      const res = await fetch(`${fetchUrl}?${params}`);
      const result = await res.json();
      if (result.success) {
        setList(result.data?.list || result.data || []);
        setTotal(result.data?.total || 0);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, page, pageSize, search, searchKey]);

  useEffect(() => {
    fetchData();
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
    refresh: fetchData,
  };
}
