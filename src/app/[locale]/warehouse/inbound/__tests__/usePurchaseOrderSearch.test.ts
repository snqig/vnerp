import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { InboundFormData } from '../types';
import { INITIAL_FORM_DATA } from '../types';

vi.mock('@/lib/auth-fetch', () => ({
  authFetch: vi.fn(),
}));

import { usePurchaseOrderSearch } from '../hooks/usePurchaseOrderSearch';
import { authFetch } from '@/lib/auth-fetch';

const mockJsonResponse = (data: unknown, ok = true) =>
  ({
    ok,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
  }) as Response;

describe('usePurchaseOrderSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(authFetch).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('初始状态为空', () => {
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));
    expect(result.current.poSearchResults).toEqual([]);
    expect(result.current.poSearchLoading).toBe(false);
    expect(result.current.poDropdownVisible).toBe(false);
  });

  it('空关键词不触发搜索并清空结果', async () => {
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));
    act(() => result.current.handlePoSearchChange(''));
    expect(authFetch).not.toHaveBeenCalled();
    expect(result.current.poSearchResults).toEqual([]);
    expect(result.current.poDropdownVisible).toBe(false);
  });

  it('输入关键词后 300ms 触发搜索', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: { list: [{ po_no: 'PO-001', supplier_name: '供应商A' }] } })
    );
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    act(() => result.current.handlePoSearchChange('PO-0'));
    expect(authFetch).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(300); });
    await waitFor(() => expect(authFetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.poSearchResults).toHaveLength(1));
    expect(result.current.poDropdownVisible).toBe(true);
    expect(result.current.poSearchLoading).toBe(false);
  });

  it('搜索结果为空时隐藏下拉', async () => {
    vi.mocked(authFetch).mockResolvedValue(mockJsonResponse({ success: true, data: { list: [] } }));
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    act(() => result.current.handlePoSearchChange('XYZ'));
    act(() => { vi.advanceTimersByTime(300); });
    await waitFor(() => expect(authFetch).toHaveBeenCalled());
    await waitFor(() => expect(result.current.poSearchResults).toEqual([]));
    expect(result.current.poDropdownVisible).toBe(false);
  });

  it('API 失败时清空结果并隐藏下拉', async () => {
    vi.mocked(authFetch).mockRejectedValue(new Error('网络错误'));
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    act(() => result.current.handlePoSearchChange('PO'));
    act(() => { vi.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.poSearchLoading).toBe(false));
    expect(result.current.poSearchResults).toEqual([]);
    expect(result.current.poDropdownVisible).toBe(false);
  });

  it('handlePoSelect 填充表单并关闭下拉', () => {
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    const po = {
      po_no: 'PO-100',
      supplier_name: '供应商X',
      lines: [
        {
          material_code: 'MAT-100',
          material_name: '物料X',
          material_spec: '100mm',
          order_qty: 200,
          received_qty: 50,
          unit: 'KG',
        },
      ],
    };

    act(() => result.current.handlePoSelect(po));

    expect(setFormData).toHaveBeenCalledWith(expect.any(Function));
    const updater = setFormData.mock.calls[0][0] as (prev: InboundFormData) => InboundFormData;
    const newState = updater(INITIAL_FORM_DATA);
    expect(newState.purchaseOrderNo).toBe('PO-100');
    expect(newState.supplier).toBe('供应商X');
    expect(newState.materialCode).toBe('MAT-100');
    expect(newState.materialName).toBe('物料X');
    expect(newState.specification).toBe('100mm');
    expect(newState.quantity).toBe('150');
    expect(newState.unit).toBe('KG');

    expect(result.current.poDropdownVisible).toBe(false);
    expect(result.current.poSearchResults).toEqual([]);
  });

  it('handlePoSelect 无 lines 时保持表单原值', () => {
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    act(() => result.current.handlePoSelect({ po_no: 'PO-200', supplier_name: '供应商Y' }));

    const updater = setFormData.mock.calls[0][0] as (prev: InboundFormData) => InboundFormData;
    const newState = updater(INITIAL_FORM_DATA);
    expect(newState.purchaseOrderNo).toBe('PO-200');
    expect(newState.supplier).toBe('供应商Y');
    expect(newState.materialCode).toBe(INITIAL_FORM_DATA.materialCode);
    expect(newState.materialName).toBe(INITIAL_FORM_DATA.materialName);
  });

  it('handlePoSearchChange 调用 setFormData 更新 purchaseOrderNo', () => {
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    act(() => result.current.handlePoSearchChange('keyword'));

    expect(setFormData).toHaveBeenCalledWith(expect.any(Function));
    const updater = setFormData.mock.calls[0][0] as (prev: InboundFormData) => InboundFormData;
    const newState = updater(INITIAL_FORM_DATA);
    expect(newState.purchaseOrderNo).toBe('keyword');
  });

  it('连续输入时只触发最后一次搜索（防抖）', async () => {
    vi.mocked(authFetch).mockResolvedValue(mockJsonResponse({ success: true, data: { list: [] } }));
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    act(() => result.current.handlePoSearchChange('A'));
    act(() => { vi.advanceTimersByTime(150); });
    act(() => result.current.handlePoSearchChange('AB'));
    act(() => { vi.advanceTimersByTime(150); });
    act(() => result.current.handlePoSearchChange('ABC'));

    expect(authFetch).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(300); });
    await waitFor(() => expect(authFetch).toHaveBeenCalledTimes(1));
    expect(authFetch).toHaveBeenCalledWith(
      expect.stringContaining('keyword=ABC')
    );
  });

  it('API 返回 success=false 时清空结果并隐藏下拉', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: false, message: '无权限' })
    );
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    act(() => result.current.handlePoSearchChange('PO'));
    act(() => { vi.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.poSearchLoading).toBe(false));
    expect(result.current.poSearchResults).toEqual([]);
    expect(result.current.poDropdownVisible).toBe(false);
  });

  it('data 为裸数组（非 {list: [...]}）时也能正确处理', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: [{ po_no: 'PO-200', supplier_name: '供应商B' }],
      })
    );
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    act(() => result.current.handlePoSearchChange('PO-2'));
    act(() => { vi.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.poSearchResults).toHaveLength(1));
    expect((result.current.poSearchResults[0] as any).po_no).toBe('PO-200');
    expect(result.current.poDropdownVisible).toBe(true);
  });

  it('handlePoSelect 中 lines 缺少 received_qty 时 quantity 为 order_qty 全量', () => {
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    const po = {
      po_no: 'PO-300',
      supplier_name: '供应商C',
      lines: [{ material_code: 'MAT-300', material_name: '物料C', material_spec: '300mm', order_qty: 100, unit: 'PCS' }],
    };

    act(() => result.current.handlePoSelect(po));

    const updater = setFormData.mock.calls[0][0] as (prev: InboundFormData) => InboundFormData;
    const newState = updater(INITIAL_FORM_DATA);
    // order_qty=100, received_qty=undefined → 100 - 0 = 100
    expect(newState.quantity).toBe('100');
  });

  it('handlePoSelect 中 order_qty 为 0 时 quantity 保持 prev.quantity', () => {
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    const po = {
      po_no: 'PO-400',
      supplier_name: '供应商D',
      lines: [{ material_code: 'MAT-400', material_name: '物料D', material_spec: '400mm', order_qty: 0, unit: 'PCS' }],
    };

    act(() => result.current.handlePoSelect(po));

    const updater = setFormData.mock.calls[0][0] as (prev: InboundFormData) => InboundFormData;
    const newState = updater(INITIAL_FORM_DATA);
    // order_qty=0 是 falsy，quantity 保持 prev.quantity（INITIAL_FORM_DATA.quantity = ''）
    expect(newState.quantity).toBe(INITIAL_FORM_DATA.quantity);
  });

  it('handlePoLineSelect 选择具体明细行并填充 PO 关联字段', () => {
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    const po = {
      id: 99,
      po_no: 'PO-500',
      supplier_name: '供应商E',
      currency: 'USD',
      base_currency: 'CNY',
      lines: [
        { line_no: 1, material_id: 1001, material_code: 'MAT-A', material_name: '物料A', material_spec: 'A规格', order_qty: 100, received_qty: 30, unit: 'KG', unit_price: 12.5 },
        { line_no: 2, material_id: 1002, material_code: 'MAT-B', material_name: '物料B', material_spec: 'B规格', order_qty: 200, received_qty: 0, unit: 'PCS', unit_price: 8 },
      ],
    };

    // 选择第二行明细
    act(() => result.current.handlePoLineSelect(po, po.lines[1]));

    const updater = setFormData.mock.calls[0][0] as (prev: InboundFormData) => InboundFormData;
    const newState = updater(INITIAL_FORM_DATA);
    expect(newState.purchaseOrderNo).toBe('PO-500');
    expect(newState.supplier).toBe('供应商E');
    expect(newState.materialCode).toBe('MAT-B');
    expect(newState.materialName).toBe('物料B');
    expect(newState.specification).toBe('B规格');
    expect(newState.quantity).toBe('200'); // 200 - 0 = 200
    expect(newState.unit).toBe('PCS');
    expect(newState.currency).toBe('USD');
    expect(newState.baseCurrency).toBe('CNY');
    // PO 关联字段
    expect(newState.poId).toBe(99);
    expect(newState.lineNo).toBe(2);
    expect(newState.materialId).toBe(1002);
    expect(newState.unitPrice).toBe(8);

    // 选择后关闭下拉并清空
    expect(result.current.poDropdownVisible).toBe(false);
    expect(result.current.poSearchResults).toEqual([]);
    expect(result.current.expandedPoId).toBeNull();
  });

  it('handlePoLineSelect 已全部收货行数量为 0', () => {
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    const po = {
      id: 100,
      po_no: 'PO-600',
      supplier_name: '供应商F',
      lines: [
        { line_no: 1, material_id: 2001, material_code: 'MAT-C', material_name: '物料C', order_qty: 50, received_qty: 50, unit: 'KG' },
      ],
    };

    act(() => result.current.handlePoLineSelect(po, po.lines[0]));

    const updater = setFormData.mock.calls[0][0] as (prev: InboundFormData) => InboundFormData;
    const newState = updater(INITIAL_FORM_DATA);
    // 50 - 50 = 0，remaining <= 0 时 quantity 为 '0'
    expect(newState.quantity).toBe('0');
  });

  it('handlePoToggleExpand 切换展开的 PO ID', () => {
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    expect(result.current.expandedPoId).toBeNull();

    act(() => result.current.handlePoToggleExpand(5));
    expect(result.current.expandedPoId).toBe(5);

    // 再次点击同一 PO 收起
    act(() => result.current.handlePoToggleExpand(5));
    expect(result.current.expandedPoId).toBeNull();

    // 切换到其他 PO
    act(() => result.current.handlePoToggleExpand(8));
    expect(result.current.expandedPoId).toBe(8);
  });

  it('handlePoSelect 传入 line 参数时使用指定行（向后兼容）', () => {
    const setFormData = vi.fn();
    const { result } = renderHook(() => usePurchaseOrderSearch(setFormData));

    const po = {
      id: 77,
      po_no: 'PO-700',
      supplier_name: '供应商G',
      lines: [
        { line_no: 1, material_id: 3001, material_code: 'MAT-X', material_name: '物料X', order_qty: 10, received_qty: 0, unit: 'KG' },
        { line_no: 2, material_id: 3002, material_code: 'MAT-Y', material_name: '物料Y', order_qty: 20, received_qty: 5, unit: 'PCS' },
      ],
    };

    // 显式传入第二行
    act(() => result.current.handlePoSelect(po, po.lines[1]));

    const updater = setFormData.mock.calls[0][0] as (prev: InboundFormData) => InboundFormData;
    const newState = updater(INITIAL_FORM_DATA);
    expect(newState.materialCode).toBe('MAT-Y');
    expect(newState.materialName).toBe('物料Y');
    expect(newState.quantity).toBe('15'); // 20 - 5 = 15
    expect(newState.poId).toBe(77);
    expect(newState.lineNo).toBe(2);
    expect(newState.materialId).toBe(3002);
  });
});
