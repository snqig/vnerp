'use client';

import { useState, useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import type { InboundFormData, PurchaseOrder } from '../types';

export function usePurchaseOrderSearch(setFormData: Dispatch<SetStateAction<InboundFormData>>) {
  const [poSearchResults, setPoSearchResults] = useState<PurchaseOrder[]>([]);
  const [poSearchLoading, setPoSearchLoading] = useState(false);
  const [poDropdownVisible, setPoDropdownVisible] = useState(false);
  const [expandedPoId, setExpandedPoId] = useState<number | null>(null);
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

  // 展开/收起 PO 明细行列表（用于选择具体行入库）
  const handlePoToggleExpand = useCallback((poId: number) => {
    setExpandedPoId((prev) => (prev === poId ? null : poId));
  }, []);

  // 选择具体明细行入库：填充表单并关联 PO 行
  const handlePoLineSelect = useCallback(
    (po: Loose, line: Loose) => {
      const remaining = Number(line.order_qty || 0) - Number(line.received_qty || 0);
      setFormData((prev) => ({
        ...prev,
        purchaseOrderNo: po.po_no || '',
        supplier: po.supplier_name || prev.supplier,
        materialCode: line.material_code || prev.materialCode,
        materialName: line.material_name || prev.materialName,
        specification: line.material_spec || prev.specification,
        quantity: line.order_qty ? String(remaining > 0 ? remaining : 0) : prev.quantity,
        unit: line.unit || prev.unit,
        currency: po.currency || prev.currency,
        baseCurrency: po.base_currency || prev.baseCurrency,
        // PO 关联字段
        poId: po.id,
        lineNo: line.line_no,
        materialId: line.material_id,
        unitPrice: line.unit_price,
      }));
      setPoDropdownVisible(false);
      setPoSearchResults([]);
      setExpandedPoId(null);
    },
    [setFormData]
  );

  // 向后兼容：未传 line 时取第一行（保留旧测试与调用方行为）
  const handlePoSelect = useCallback(
    (po: Loose, line?: Loose) => {
      const selectedLine = line || po.lines?.[0] || {};
      handlePoLineSelect(po, selectedLine);
    },
    [handlePoLineSelect]
  );

  return {
    poSearchResults,
    poSearchLoading,
    poDropdownVisible,
    setPoDropdownVisible,
    handlePoSearchChange,
    handlePoSelect,
    handlePoLineSelect,
    handlePoToggleExpand,
    expandedPoId,
  };
}
