'use client';

import { useEffect, useState, useCallback } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WarehouseCategory {
  id: number;
  code: string;
  name: string;
}

interface WarehouseItem {
  id: number;
  code: string;
  name: string;
  category_id?: number;
  status?: string | number;
}

interface WarehouseSelectProps {
  /** 当前选中的仓库 ID */
  value?: string | number;
  /** 仓库选择回调，参数为仓库 ID（字符串） */
  onChange: (warehouseId: string) => void;
  /** 占位文字 */
  placeholder?: string;
  /** 自定义样式 */
  className?: string;
  /** 是否显示分类选择（默认 true） */
  showCategory?: boolean;
  /** 是否只选启用的仓库 */
  activeOnly?: boolean;
  /** 禁用 */
  disabled?: boolean;
}

/**
 * 仓库级联选择组件
 * 先选仓库分类（来自 settings/warehouse-category 管理），再根据分类筛选具体仓库
 *
 * 数据来源：
 * - 分类: /api/warehouse/categories （sys_warehouse_category 表，settings/warehouse-category 管理）
 * - 仓库: /api/warehouse?all=true （inv_warehouse 表，按 category_id 过滤）
 */
export function WarehouseSelect({
  value,
  onChange,
  placeholder = '先选分类再选仓库',
  className,
  showCategory = true,
  activeOnly = true,
  disabled = false,
}: WarehouseSelectProps) {
  const [categories, setCategories] = useState<WarehouseCategory[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // 获取仓库分类列表
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await authFetch('/api/warehouse/categories');
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setCategories(result.data);
        }
      } catch {}
    };
    fetchCategories();
  }, []);

  // 获取仓库列表
  const fetchWarehouses = useCallback(async () => {
    try {
      const params = new URLSearchParams({ all: 'true' });
      if (activeOnly) params.set('status', 'active');
      const res = await authFetch(`/api/warehouse?${params}`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setWarehouses(result.data);
      }
    } catch {}
  }, [activeOnly]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // 根据选中的分类过滤仓库
  const filteredWarehouses = selectedCategoryId
    ? warehouses.filter((w) => String(w.category_id) === selectedCategoryId)
    : warehouses;

  const selectedWarehouse = warehouses.find((w) => String(w.id) === String(value));

  return (
    <div className="flex gap-2">
      {showCategory && (
        <Select
          value={selectedCategoryId}
          onValueChange={(v) => {
            setSelectedCategoryId(v);
            // 切换分类时清空已选仓库
            if (v !== selectedCategoryId) onChange('');
          }}
          disabled={disabled}
        >
          <SelectTrigger className={className} style={{ minWidth: '120px' }}>
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={value ? String(value) : ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={selectedWarehouse ? selectedWarehouse.name : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {filteredWarehouses.length === 0 ? (
            <SelectItem value="_empty" disabled>
              该分类下暂无仓库
            </SelectItem>
          ) : (
            filteredWarehouses.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>
                {w.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
