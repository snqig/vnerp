'use client';

import { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface TableSort<T> {
  sortField: keyof T | null;
  sortDirection: SortDirection;
  toggleSort: (field: keyof T) => void;
  sortedData: T[];
  getSortIcon: (field: keyof T) => string;
}

/**
 * Generic client-side table sorting hook.
 *
 * @param data The array to sort.
 * @param defaultField Optional default sort field.
 */
export function useTableSort<T extends Record<string, unknown>>(
  data: T[],
  defaultField?: keyof T
): TableSort<T> {
  const [sortField, setSortField] = useState<keyof T | null>(defaultField || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toggleSort = (field: keyof T) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr, 'zh-CN')
        : bStr.localeCompare(aStr, 'zh-CN');
    });
  }, [data, sortField, sortDirection]);

  const getSortIcon = (field: keyof T) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return {
    sortField,
    sortDirection,
    toggleSort,
    sortedData,
    getSortIcon,
  };
}
