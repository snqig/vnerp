import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInboundDialogs } from '../hooks/useInboundDialogs';

describe('useInboundDialogs', () => {
  it('初始状态全部为关闭/空', () => {
    const { result } = renderHook(() => useInboundDialogs());
    const s = result.current;
    expect(s.isAddDialogOpen).toBe(false);
    expect(s.isEditDialogOpen).toBe(false);
    expect(s.isMixedAddDialogOpen).toBe(false);
    expect(s.isAuditDialogOpen).toBe(false);
    expect(s.isGenerateDialogOpen).toBe(false);
    expect(s.isQRCodeDialogOpen).toBe(false);
    expect(s.isQRScanDialogOpen).toBe(false);
    expect(s.isCuttingDialogOpen).toBe(false);
    expect(s.isCuttingResultOpen).toBe(false);
    expect(s.isPrintPreviewOpen).toBe(false);
    expect(s.labelSupplier).toBe('');
    expect(s.printLabels).toEqual([]);
    expect(s.currentRecord).toBeNull();
    expect(s.currentLabel).toBeNull();
  });

  it('setIsAddDialogOpen(true) 开启新增对话框', () => {
    const { result } = renderHook(() => useInboundDialogs());
    act(() => result.current.setIsAddDialogOpen(true));
    expect(result.current.isAddDialogOpen).toBe(true);
  });

  it('setIsCuttingDialogOpen 切换分切对话框状态', () => {
    const { result } = renderHook(() => useInboundDialogs());
    act(() => result.current.setIsCuttingDialogOpen(true));
    expect(result.current.isCuttingDialogOpen).toBe(true);
    act(() => result.current.setIsCuttingDialogOpen(false));
    expect(result.current.isCuttingDialogOpen).toBe(false);
  });

  it('setPrintLabels 设置打印标签列表', () => {
    const { result } = renderHook(() => useInboundDialogs());
    const labels = [{ id: '1', labelNo: 'L1', materialName: '物料A' }] as any;
    act(() => result.current.setPrintLabels(labels));
    expect(result.current.printLabels).toEqual(labels);
  });

  it('setCurrentRecord 设置当前记录', () => {
    const { result } = renderHook(() => useInboundDialogs());
    const record = { id: 42, status: 'approved' } as any;
    act(() => result.current.setCurrentRecord(record));
    expect(result.current.currentRecord).toEqual(record);
  });

  it('setCurrentLabel 设置当前标签', () => {
    const { result } = renderHook(() => useInboundDialogs());
    const label = { id: 'L1', labelNo: 'LB-1', materialName: '物料X' } as any;
    act(() => result.current.setCurrentLabel(label));
    expect(result.current.currentLabel).toEqual(label);
  });

  it('setLabelSupplier 设置标签供应商', () => {
    const { result } = renderHook(() => useInboundDialogs());
    act(() => result.current.setLabelSupplier('供应商B'));
    expect(result.current.labelSupplier).toBe('供应商B');
  });

  it('多个对话框可同时独立开启', () => {
    const { result } = renderHook(() => useInboundDialogs());
    act(() => {
      result.current.setIsAddDialogOpen(true);
      result.current.setIsQRCodeDialogOpen(true);
      result.current.setIsPrintPreviewOpen(true);
    });
    expect(result.current.isAddDialogOpen).toBe(true);
    expect(result.current.isQRCodeDialogOpen).toBe(true);
    expect(result.current.isPrintPreviewOpen).toBe(true);
    expect(result.current.isEditDialogOpen).toBe(false);
  });
});
