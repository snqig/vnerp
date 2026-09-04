'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';
import { logger } from '@/lib/logger';
import type {
  InboundRecord,
  Warehouse,
  WarehouseCategory,
  Supplier,
  LabelItem,
} from '../types';

export function useInboundData() {
  const t = useTranslations('Warehouse');
  const ts = useTranslations('Warehouse');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  const [inboundRecords, setInboundRecords] = useState<InboundRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<(string | number)[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseCategories, setWarehouseCategories] = useState<WarehouseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [labelList, setLabelList] = useState<LabelItem[]>([]);

  const fetchInboundRecords = useCallback(async () => {
    const ctx = { module: 'Warehouse', action: 'fetchInboundRecords' };
    logger.stepStart(ctx, 'fetchInboundRecords', { searchQuery, statusFilter });
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('keyword', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', '1');
      params.append('pageSize', '1000');

      const response = await authFetch(`/api/warehouse/inbound?${params.toString()}`);
      logger.info(ctx, ts('k_1arfebi'), { status: response.status, ok: response.ok });
      const result = await response.json();

      if (result.success) {
        const records = Array.isArray(result.data?.list)
          ? result.data.list
          : Array.isArray(result.data)
            ? result.data
            : [];
        logger.branch(ctx, 'dataShape', 'result.data.list', Array.isArray(result.data?.list), {
          hasList: !!result.data?.list,
          isDataArray: Array.isArray(result.data),
        });
        logger.info(ctx, ts('k_gwnk33'), { count: records.length });
        setInboundRecords(records);
      } else {
        logger.warn(ctx, ts('k_11ohwaz'), { message: result.message, code: result.code });
      }
    } catch (error) {
      logger.error(ctx, ts('k_qfg52'), { error: (error as Error).message, stack: (error as Error).stack });
    }
  }, [searchQuery, statusFilter]);

  const handleRefresh = useCallback(async () => {
    const ctx = { module: 'Warehouse', action: 'handleRefresh' };
    logger.stepStart(ctx, 'handleRefresh');
    setIsLoading(true);
    await fetchInboundRecords();
    setIsLoading(false);
    toast.success(t('dataRefreshed'));
    logger.stepEnd(ctx, 'handleRefresh');
  }, [fetchInboundRecords, t]);

  const fetchWarehouses = useCallback(async () => {
    const ctx = { module: 'Warehouse', action: 'fetchWarehouses' };
    try {
      const response = await authFetch('/api/warehouse?all=true');
      const result = await response.json();
      if (result.success) {
        const rawList = Array.isArray(result.data) ? result.data : [];
        // /api/warehouse 返回 code/name，统一映射为 warehouse_code/warehouse_name 供前端使用
        const list = rawList.map((w: Loose) => ({
          ...w,
          warehouse_code: w.warehouse_code ?? w.code,
          warehouse_name: w.warehouse_name ?? w.name,
        }));
        logger.info(ctx, ts('k_zloowg'), { count: list.length });
        setWarehouses(list);
      } else {
        logger.warn(ctx, ts('k_19qa3rw'), { message: result.message });
      }
    } catch (error) {
      logger.error(ctx, ts('k_olsy6v'), { error: (error as Error).message });
    }
  }, []);

  const fetchWarehouseCategories = useCallback(async () => {
    const ctx = { module: 'Warehouse', action: 'fetchWarehouseCategories' };
    try {
      const response = await authFetch('/api/organization/warehouse-category');
      const result = await response.json();
      if (result.success) {
        const list = result.data || [];
        logger.info(ctx, ts('k_1qin9a8'), { count: list.length });
        setWarehouseCategories(list);
      } else {
        logger.warn(ctx, ts('k_oq4t0s'), { message: result.message });
      }
    } catch (error) {
      logger.error(ctx, tc('categoryFetchFailed'), { error: (error as Error).message });
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    const ctx = { module: 'Warehouse', action: 'fetchSuppliers' };
    try {
      const response = await authFetch('/api/purchase/suppliers?pageSize=1000');
      const result = await response.json();
      if (result.success) {
        const supplierList = Array.isArray(result.data) ? result.data : (result.data?.list || []);
        logger.info(ctx, ts('k_1ppv1hb'), { count: supplierList.length });
        setSuppliers(supplierList);
      } else {
        logger.warn(ctx, ts('k_15ry1c9'), { message: result.message });
      }
    } catch (error) {
      logger.error(ctx, ts('k_j12ivi'), { error: (error as Error).message });
    }
  }, []);

  const fetchLabels = useCallback(async () => {
    const ctx = { module: 'Warehouse', action: 'fetchLabels' };
    try {
      const response = await authFetch('/api/warehouse/inbound/labels?pageSize=1000');
      const result = await response.json();
      if (result.success) {
        const list = result.data?.list || [];
        logger.info(ctx, ts('k_jzvqb'), { count: list.length });
        setLabelList(list);
      } else {
        logger.warn(ctx, ts('k_maapbp'), { message: result.message });
      }
    } catch (error) {
      logger.error(ctx, ts('k_1p0z1yg'), { error: (error as Error).message });
    }
  }, []);

  useEffect(() => {
    const ctx = { module: 'Warehouse', action: 'mountInit' };
    logger.info(ctx, ts('k_15hxua8'));
    fetchInboundRecords();
    fetchWarehouses();
    fetchWarehouseCategories();
    fetchSuppliers();
    fetchLabels();
  }, [fetchInboundRecords, fetchWarehouses, fetchWarehouseCategories, fetchSuppliers, fetchLabels]);

  const totalInboundToday = useMemo(() => {
    const today = new Date().toDateString();
    return inboundRecords.filter(
      (r) => new Date((r.create_time || r.createTime || '')).toDateString() === today
    ).length;
  }, [inboundRecords]);

  const totalInboundMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return inboundRecords.filter((r) => {
      const recordDate = new Date((r.create_time || r.createTime || ''));
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    }).length;
  }, [inboundRecords]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isLoading,
    inboundRecords,
    selectedRecords,
    setSelectedRecords,
    warehouses,
    warehouseCategories,
    suppliers,
    labelList,
    fetchInboundRecords,
    handleRefresh,
    fetchLabels,
    totalInboundToday,
    totalInboundMonth,
  };
}
