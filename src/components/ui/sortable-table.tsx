'use client';

import { useState, useMemo } from 'react';
import { TableHead } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface SortableTableHeaderProps {
  field: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function SortableTableHeader({
  field,
  sortField,
  sortDirection,
  onSort,
  children,
  className = '',
}: SortableTableHeaderProps) {
  const isActive = sortField === field;
  const ariaSort = isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 min-h-[44px] ${className}`}
      role="button"
      tabIndex={0}
      aria-sort={ariaSort}
      onClick={() => onSort(field)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort(field);
        }
      }}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="w-3 h-3" aria-hidden="true" />
          ) : (
            <ArrowDown className="w-3 h-3" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" aria-hidden="true" />
        )}
      </div>
    </TableHead>
  );
}

export function useTableSort<T>(data: T[], defaultField: string = '') {
  const [sortField, setSortField] = useState(defaultField);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Loose)[sortField];
      const bVal = (b as Loose)[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal ?? '');
      const bStr = String(bVal ?? '');
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data, sortField, sortDirection]);

  return { sortField, sortDirection, handleSort, sortedData };
}
