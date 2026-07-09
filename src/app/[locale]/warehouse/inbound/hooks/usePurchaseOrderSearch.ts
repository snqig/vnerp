'use client';

import { useState, useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import type { InboundFormData, PurchaseOrder } from '../types';

export function usePurchaseOrderSearch(setFormData: Dispatch<SetStateAction<InboundFormData>>) {
  const [poSearchResults, setPoSearchResults] = useState<PurchaseOrder[]>([]);
  const [poSearchLoading, setPoSearchLoading] = useState(false);
  const [poDropdownVisible, setPoDropdownVisible] = useState(false);
  const poSearchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const searchPurchaseOrders = useCallback(async (keyword: string) => {
    if (!keyword || keyword.trim().length < 1) {
      setPoSearchResults([]);
      setPoDropdownVisible(false);
      return;
    }
    setPoSearchLoading(true);
    try {
      const response = await authFetch(
        `/api/purchase/orders?keyword=${encodeURIComponent(keyword.trim())}&pageSize=20`
      );
      const result = await response.json();
      if (result.success) {
        const list = result.data?.list || result.data || [];
        setPoSearchResults(list);
        setPoDropdownVisible(list.length > 0);
      } else {
        setPoSearchResults([]);
        setPoDropdownVisible(false);
      }
    } catch {
      setPoSearchResults([]);
      setPoDropdownVisible(false);
    } finally {
      setPoSearchLoading(false);
    }
  }, []);

  const handlePoSearchChange = useCallback(
    (value: string) => {
      setFormData((prev) => ({ ...prev, purchaseOrderNo: value }));
      if (poSearchTimerRef.current) {
        clearTimeout(poSearchTimerRef.current);
      }
      poSearchTimerRef.current = setTimeout(() => {
        searchPurchaseOrders(value);
      }, 300);
    },
    [searchPurchaseOrders, setFormData]
  );

  const handlePoSelect = useCallback(
    (po: any) => {
      const firstLine = po.lines?.[0] || {};
      setFormData((prev) => ({
        ...prev,
        purchaseOrderNo: po.po_no || '',
        supplier: po.supplier_name || prev.supplier,
        materialCode: firstLine.material_code || prev.materialCode,
        materialName: firstLine.material_name || prev.materialName,
        specification: firstLine.material_spec || prev.specification,
        quantity: firstLine.order_qty
          ? String(firstLine.order_qty - (firstLine.received_qty || 0))
          : prev.quantity,
        unit: firstLine.unit || prev.unit,
      }));
      setPoDropdownVisible(false);
      setPoSearchResults([]);
    },
    [setFormData]
  );

  return {
    poSearchResults,
    poSearchLoading,
    poDropdownVisible,
    setPoDropdownVisible,
    handlePoSearchChange,
    handlePoSelect,
  };
}
