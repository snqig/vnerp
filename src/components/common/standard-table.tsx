'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  TriangleAlert,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** 排序方向 */
export type SortDirection = 'asc' | 'desc';
/** 当前排序状态；null 表示未排序（默认顺序） */
export type SortState = { field: string; direction: SortDirection } | null;

export interface StandardTableColumn<T> {
  /** 列唯一标识，同时作为排序字段名 */
  key: string;
  /** 表头内容（业务侧传入已国际化的文案，如 t('costNo')） */
  title: React.ReactNode;
  /** 取值字段；不传且无 render 时渲染空 */
  dataIndex?: string;
  /** 自定义单元格渲染。传了则忽略 dataIndex */
  render?: (row: T, index: number) => React.ReactNode;
  /** 是否允许点击表头排序，默认 false */
  sortable?: boolean;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
}

export interface StandardTableCustomStyle {
  containerClassName?: string;
  tableClassName?: string;
  headerClassName?: string;
  headerCellClassName?: string;
  rowClassName?: string | ((row: unknown, index: number) => string);
  cellClassName?: string;
  paginationClassName?: string;
  /** 表格体最大高度，超出滚动（表头吸顶） */
  maxHeight?: number | string;
}

export interface StandardTableProps<T> {
  columns: StandardTableColumn<T>[];
  dataSource?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  pageSizeOptions?: number[];

  /** 是否开启行勾选；false 时不渲染勾选列 */
  rowSelectable?: boolean;
  /** 当前已勾选行（受控）。不传则组件内部自管 */
  selectedRows?: T[];
  /** 勾选变化回调，返回当前所有已勾选行数据集合 */
  onRowSelectedChange?: (selectedRows: T[]) => void;
  /** 预留扩展：是否跨页保留选中。默认 false（仅当前页） */
  preserveCrossPageSelection?: boolean;

  /** 是否开启行展开；true 时在勾选列前渲染展开控制列 */
  expandable?: boolean;
  /** 当前已展开行 key（受控）。不传则组件内部自管 */
  expandedRowKeys?: string[];
  /** 展开行变化回调，返回当前所有已展开行 key */
  onExpandedRowChange?: (keys: string[]) => void;
  /** 展开行内容渲染 */
  expandedRowRender?: (row: T, index: number) => React.ReactNode;

  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange?: (sort: SortState) => void;
  /** 受控排序状态；不传则组件内部自管 */
  sortState?: SortState;

  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** 自定义空数据文案，不传则用组件内置国际化文案 */
  emptyText?: React.ReactNode;

  /** 行唯一键：字段名或取值函数 */
  rowKey?: string | ((row: T, index: number) => string);
  customStyle?: StandardTableCustomStyle;
  className?: string;
  /** 是否展示分页栏，默认 true */
  showPagination?: boolean;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [20, 25, 30];

function readField(row: unknown, path: string): unknown {
  return (row as Record<string, unknown> | null)?.[path];
}

export function StandardTable<T = Record<string, unknown>>({
  columns,
  dataSource = [],
  total = 0,
  page = 1,
  pageSize = 20,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,

  rowSelectable = false,
  selectedRows,
  onRowSelectedChange,
  preserveCrossPageSelection = false,

  expandable = false,
  expandedRowKeys,
  onExpandedRowChange,
  expandedRowRender,

  onPageChange,
  onPageSizeChange,
  onSortChange,
  sortState,

  loading = false,
  error = null,
  onRetry,
  emptyText,

  rowKey = 'id',
  customStyle = {},
  className,
  showPagination = true,
}: StandardTableProps<T>) {
  // 组件内置文案统一走 StandardTable 命名空间，禁止硬编码
  const t = useTranslations('StandardTable');

  const rows = React.useMemo(() => dataSource ?? [], [dataSource]);
  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 1)));

  // ---------- 行 key ----------
  const getKey = React.useCallback(
    (row: T, index: number): string => {
      if (typeof rowKey === 'function') return rowKey(row, index);
      const v = readField(row, rowKey);
      return v == null || v === '' ? `__idx_${index}` : String(v);
    },
    [rowKey]
  );

  // ---------- 勾选（默认仅当前页） ----------
  const [innerSelected, setInnerSelected] = React.useState<T[]>([]);
  const currentSelected = selectedRows ?? innerSelected;

  const emitSelected = React.useCallback(
    (next: T[]) => {
      if (selectedRows === undefined) setInnerSelected(next);
      onRowSelectedChange?.(next);
    },
    [onRowSelectedChange, selectedRows]
  );

  const selectedKeys = React.useMemo(
    () => new Set(currentSelected.map((r, i) => getKey(r, i))),
    [currentSelected, getKey]
  );

  const pageKeys = React.useMemo(() => rows.map((r, i) => getKey(r, i)), [rows, getKey]);
  const selectedInPage = pageKeys.filter((k) => selectedKeys.has(k));
  const allSelected = rows.length > 0 && selectedInPage.length === rows.length;
  const someSelected = selectedInPage.length > 0 && !allSelected;

  const toggleRow = (row: T, index: number) => {
    const key = getKey(row, index);
    const nextKeys = new Set(selectedKeys);
    if (nextKeys.has(key)) nextKeys.delete(key);
    else nextKeys.add(key);
    const next = rows.filter((_, i) => nextKeys.has(pageKeys[i]));
    emitSelected(next);
  };

  const toggleAllInPage = () => {
    const nextKeys = new Set(selectedKeys);
    if (allSelected) pageKeys.forEach((k) => nextKeys.delete(k));
    else pageKeys.forEach((k) => nextKeys.add(k));
    const next = rows.filter((_, i) => nextKeys.has(pageKeys[i]));
    emitSelected(next);
  };

  // ---------- 行展开（默认仅内部自管） ----------
  const [innerExpanded, setInnerExpanded] = React.useState<string[]>([]);
  const currentExpanded = expandedRowKeys ?? innerExpanded;
  const expandedSet = React.useMemo(() => new Set(currentExpanded), [currentExpanded]);

  const toggleExpand = (row: T, index: number) => {
    const key = getKey(row, index);
    const next = new Set(expandedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    const arr = Array.from(next);
    if (expandedRowKeys === undefined) setInnerExpanded(arr);
    onExpandedRowChange?.(arr);
  };

  // 翻页时清空勾选（除非开启跨页保留）：
  // 勾选语义为「仅当前页」，翻页必须同步清空父级选中态，否则批量操作会误伤上一页数据。
  // 这里只能在「page 变化」这一外部事件发生时同步，故使用 effect。
  const prevPageRef = React.useRef(page);
  React.useEffect(() => {
    if (prevPageRef.current !== page) {
      prevPageRef.current = page;
      if (!preserveCrossPageSelection && currentSelected.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        emitSelected([]);
      }
    }
  }, [page, preserveCrossPageSelection, currentSelected.length, emitSelected]);

  // ---------- 排序 ----------
  const [innerSort, setInnerSort] = React.useState<SortState>(null);
  const activeSort = sortState !== undefined ? sortState : innerSort;

  const handleSort = (field: string) => {
    let next: SortState;
    if (!activeSort || activeSort.field !== field) next = { field, direction: 'asc' };
    else if (activeSort.direction === 'asc') next = { field, direction: 'desc' };
    else next = null; // 升序 → 降序 → 取消排序
    if (sortState === undefined) setInnerSort(next);
    onSortChange?.(next);
    onPageChange?.(1); // 切换排序自动重置到第 1 页
  };

  // ---------- 页码跳转 ----------
  const [jumpValue, setJumpValue] = React.useState('');
  const [jumpError, setJumpError] = React.useState<string | null>(null);

  const doJump = () => {
    const raw = jumpValue.trim();
    const n = Number(raw);
    if (raw === '' || !Number.isInteger(n) || n < 1 || n > totalPages) {
      setJumpError(t('invalidPage', { max: totalPages }));
      return;
    }
    setJumpError(null);
    setJumpValue('');
    onPageChange?.(n);
  };

  // ---------- 渲染 ----------
  const colSpan = columns.length + (rowSelectable ? 1 : 0) + (expandable ? 1 : 0);
  const alignClass = (align?: 'left' | 'center' | 'right') =>
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  const renderBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className="h-24 text-center">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loading')}
            </span>
          </TableCell>
        </TableRow>
      );
    }
    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className="h-24 text-center">
            <div className="flex flex-col items-center gap-2">
              <span className="inline-flex items-center gap-2 text-sm text-destructive">
                <TriangleAlert className="h-4 w-4" />
                {error || t('error')}
              </span>
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  {t('retry')}
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      );
    }
    if (rows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={colSpan} className="h-24 text-center">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Inbox className="h-4 w-4" />
              {emptyText ?? t('empty')}
            </span>
          </TableCell>
        </TableRow>
      );
    }
    return rows.map((row, index) => {
      const key = getKey(row, index);
      const checked = selectedKeys.has(key);
      const expanded = expandedSet.has(key);
      const rowCls =
        typeof customStyle.rowClassName === 'function'
          ? customStyle.rowClassName(row, index)
          : customStyle.rowClassName;
      return (
        <React.Fragment key={key}>
          <TableRow
            data-state={checked ? 'selected' : undefined}
            className={cn(rowCls)}
          >
          {expandable && (
            <TableCell className="w-10">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleExpand(row, index)}
                aria-label={t('expandRow', { id: key })}
                aria-expanded={expandedSet.has(key)}
              >
                {expandedSet.has(key) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </TableCell>
          )}
          {rowSelectable && (
            <TableCell className="w-10">
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggleRow(row, index)}
                aria-label={t('selectRow', { id: key })}
              />
            </TableCell>
          )}
          {columns.map((col) => (
            <TableCell
              key={col.key}
              className={cn(alignClass(col.align), col.className, customStyle.cellClassName)}
              style={col.width ? { width: typeof col.width === 'number' ? `${col.width}px` : col.width } : undefined}
            >
              {col.render ? col.render(row, index) : (readField(row, col.dataIndex ?? col.key) as React.ReactNode) ?? '-'}
            </TableCell>
          ))}
          </TableRow>
          {expandable && expanded && (
            <TableRow data-state="expanded">
              <TableCell colSpan={colSpan} className="p-0">
                {expandedRowRender?.(row, index)}
              </TableCell>
            </TableRow>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className={cn('w-full', customStyle.containerClassName, className)}>
      <div
        className={cn('relative w-full overflow-auto', customStyle.containerClassName && undefined)}
        style={
          customStyle.maxHeight
            ? { maxHeight: typeof customStyle.maxHeight === 'number' ? `${customStyle.maxHeight}px` : customStyle.maxHeight }
            : undefined
        }
      >
        <Table className={customStyle.tableClassName}>
          <TableHeader className={cn('sticky top-0 z-10 bg-background', customStyle.headerClassName)}>
            <TableRow>
              {expandable && <TableHead className="w-10" />}
              {rowSelectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAllInPage}
                    disabled={rows.length === 0}
                    aria-label={t('selectAll')}
                  />
                </TableHead>
              )}
              {columns.map((col) => {
                const isActive = activeSort?.field === col.key;
                const ariaSort = isActive
                  ? activeSort?.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none';
                return (
                  <TableHead
                    key={col.key}
                    aria-sort={ariaSort}
                    style={col.width ? { width: typeof col.width === 'number' ? `${col.width}px` : col.width } : undefined}
                    className={cn(
                      alignClass(col.align),
                      isActive && 'text-foreground font-semibold',
                      col.headerClassName,
                      customStyle.headerCellClassName
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className={cn(
                          'inline-flex items-center gap-1 cursor-pointer select-none rounded-sm',
                          'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isActive && 'text-foreground'
                        )}
                        title={t('sortHint')}
                      >
                        <span>{col.title}</span>
                        {isActive ? (
                          activeSort?.direction === 'asc' ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      col.title
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>{renderBody()}</TableBody>
        </Table>
      </div>

      {showPagination && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-sm text-muted-foreground',
            customStyle.paginationClassName
          )}
        >
          <div className="flex items-center gap-3">
            <span>{t('paginationSummary', { total, pages: totalPages })}</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange?.(Number(v))}
            >
              <SelectTrigger className="h-8 w-[110px]" aria-label={t('pageSize')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt} {t('pageSizeUnit')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('prevPage')}
            </Button>
            <span className="px-1 tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              {t('nextPage')}
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              <Input
                value={jumpValue}
                onChange={(e) => {
                  setJumpValue(e.target.value);
                  if (jumpError) setJumpError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') doJump();
                }}
                className="h-8 w-16"
                placeholder={t('pageNumber')}
                aria-label={t('pageNumber')}
                inputMode="numeric"
              />
              <Button variant="outline" size="sm" onClick={doJump}>
                {t('jump')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {jumpError && (
        <p className="px-1 pb-2 text-xs text-destructive" role="alert">
          {jumpError}
        </p>
      )}

      {rowSelectable && currentSelected.length > 0 && (
        <p className="px-1 pb-2 text-xs text-muted-foreground">
          {t('selectedCount', { count: currentSelected.length })}
        </p>
      )}
    </div>
  );
}

export default StandardTable;
