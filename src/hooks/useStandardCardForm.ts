'use client';

import { useState, useEffect, useCallback, useRef as _useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth-fetch';
import { CardData, Customer, PrintSequence } from '@/domain/sample/standard-card/types';
import {
  createEmptyData,
  mapApiDataToCardData,
  mapCardDataToApiPayload,
} from '@/domain/sample/standard-card/utils';

interface UseStandardCardFormOptions {
  mode: 'card' | 'v2';
}

export function useStandardCardForm({ mode }: UseStandardCardFormOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const editId = searchParams.get('id');
  const isEditMode = !!editId;

  const [data, setData] = useState<CardData>(createEmptyData);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCardId, setSavedCardId] = useState<number | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await authFetch('/api/customers?page=1&pageSize=999');
      const result = await response.json();
      let list: Customer[] = [];
      if (result.success && Array.isArray(result.data)) {
        list = result.data.map((item: Record<string, unknown>) => ({
          id: item.id as number,
          customerCode: (item.customer_code as string) || '',
          customerName: (item.customer_name as string) || '',
          shortName: (item.short_name as string) || '',
        }));
      } else if (result.success && result.data?.list && Array.isArray(result.data.list)) {
        list = result.data.list.map((item: Record<string, unknown>) => ({
          id: item.id as number,
          customerCode: (item.customer_code as string) || '',
          customerName: (item.customer_name as string) || '',
          shortName: (item.short_name as string) || '',
        }));
      }
      setCustomers(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const loadData = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await authFetch(`/api/standard-cards?id=${id}`);
      const result = await response.json();
      const apiData = Array.isArray(result.data) ? result.data[0] : result.data;
      if (result.success && apiData) {
        setData(mapApiDataToCardData(apiData));
      } else {
        setError(result.message || '加载失败');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (editId) {
      loadData(editId);
    }
  }, [editId, loadData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.customer-dropdown-container')) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateField = <K extends keyof CardData>(field: K, value: CardData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateSequence = (index: number, field: keyof PrintSequence, value: string) => {
    setData((prev) => ({
      ...prev,
      sequences: prev.sequences.map((seq, i) => (i === index ? { ...seq, [field]: value } : seq)),
    }));
  };

  const handleToggleMultiValue = (
    field: 'coreType' | 'printType' | 'processMethod',
    value: string
  ) => {
    setData((prev) => {
      const arr = prev[field] ? prev[field].split(',').filter(Boolean) : [];
      const idx = arr.indexOf(value);
      if (idx >= 0) {
        arr.splice(idx, 1);
      } else {
        arr.push(value);
      }
      return { ...prev, [field]: arr.join(',') };
    });
  };

  const handleSelectCustomer = (customer: Customer) => {
    updateField('customer', customer.customerName);
    updateField('customerCode', customer.customerCode);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.customerName.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.customerCode.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredCustomersLimited = filteredCustomers.slice(0, 20);

  const validate = (): string | null => {
    if (!data.customer) return '请选择客户';
    if (!data.customerCode) return '请输入客户料号';
    if (!data.productName) return '请输入品名';
    return null;
  };

  const handleSave = async (): Promise<number | null> => {
    const validationError = validate();
    if (validationError) {
      toast({ title: validationError, variant: 'destructive' });
      return null;
    }

    try {
      setSaving(true);

      const saveData = mapCardDataToApiPayload(data, isEditMode, editId || undefined);

      const url = '/api/standard-cards';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData),
      });

      const result = await response.json();

      if (!result.success) {
        toast({ title: result.message || '保存失败', variant: 'destructive' });
        return null;
      }

      const newId = result.data?.id || parseInt(editId || '0');
      toast({ title: isEditMode ? '标准卡更新成功' : '标准卡保存成功' });
      setSavedCardId(newId);

      if (!isEditMode && newId) {
        router.push(`/sample/standard-card?id=${newId}&edit=true&mode=${mode}`);
      }

      return newId;
    } catch (e) {
      console.error('[StandardCard:Save] 异常:', e instanceof Error ? e.message : e, e);
      toast({ title: '保存失败，请检查网络连接', variant: 'destructive' });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPreview = async () => {
    const savedId = await handleSave();
    const id = savedId || (editId ? parseInt(editId) : null);
    if (id) {
      router.push(`/sample/standard-card/print?id=${id}`);
    }
  };

  return {
    data,
    setData,
    loading,
    saving,
    error,
    savedCardId,
    customers,
    customerSearch,
    setCustomerSearch,
    showCustomerDropdown,
    setShowCustomerDropdown,
    filteredCustomers: filteredCustomersLimited,
    isEditMode,
    editId,
    updateField,
    updateSequence,
    handleToggleMultiValue,
    handleSelectCustomer,
    handleSave,
    handleSaveAndPreview,
  };
}
