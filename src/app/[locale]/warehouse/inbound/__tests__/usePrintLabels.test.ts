import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { InboundRecord } from '../types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    stepStart: vi.fn(),
    stepEnd: vi.fn(),
    branch: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { usePrintLabels } from '../hooks/usePrintLabels';
import { toast } from 'sonner';

const sampleRecord: InboundRecord = {
  id: 1,
  inbound_no: 'IN-001',
  inbound_type: 1,
  warehouse_id: 1,
  warehouse_name: '主仓库',
  material_id: 101,
  material_name: 'PET薄膜',
  material_code: 'MAT-001',
  specification: '1200×1000mm',
  quantity: 100,
  unit: 'KG',
  location: 'A-01',
  supplier_id: 1,
  supplier_name: '供应商A',
  operator_id: 1,
  operator_name: 'admin',
  inbound_date: '2026-07-07',
  status: 'approved',
  order_no: 'PO-001',
  create_time: '2026-07-07T10:00:00Z',
  items: [
    {
      material_id: 101,
      material_name: 'PET薄膜',
      material_code: 'MAT-001',
      material_spec: '1200×1000mm',
      specification: '1200×1000mm',
      quantity: 50,
      unit: 'KG',
      unit_price: 10,
      total_price: 500,
      location: 'A-01',
      batch_no: 'B001',
      remark: '',
    },
  ],
};

describe('usePrintLabels', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('window.open 被阻止时显示错误提示', async () => {
    const originalOpen = window.open;
    window.open = vi.fn(() => null);

    const { result } = renderHook(() => usePrintLabels([sampleRecord]));

    await act(async () => {
      await result.current.handlePrintLabels();
    });

    expect(toast.error).toHaveBeenCalledWith('printWindowBlocked');
    window.open = originalOpen;
  });

  it('成功打开打印窗口并写入内容', async () => {
    const mockWrite = vi.fn();
    const mockClose = vi.fn();
    const mockPrint = vi.fn();
    const mockPrintWindow = {
      document: { write: mockWrite, close: mockClose },
      print: mockPrint,
      close: vi.fn(),
      onload: null as (() => void) | null,
    };

    const originalOpen = window.open;
    window.open = vi.fn(() => mockPrintWindow as any);

    const { result } = renderHook(() => usePrintLabels([sampleRecord]));

    await act(async () => {
      await result.current.handlePrintLabels();
    });

    expect(mockWrite).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();

    const writtenContent = mockWrite.mock.calls[0][0] as string;
    expect(writtenContent).toContain('<!DOCTYPE html>');
    expect(writtenContent).toContain('PO-001-1');

    if (mockPrintWindow.onload) {
      mockPrintWindow.onload();
      expect(mockPrint).toHaveBeenCalled();
    }

    window.open = originalOpen;
  });

  it('generatePrintContent 抛出异常时显示 printFailed', async () => {
    const originalOpen = window.open;
    window.open = vi.fn(() => {
      throw new Error('无法打开窗口');
    });

    const { result } = renderHook(() => usePrintLabels([sampleRecord]));

    await act(async () => {
      await result.current.handlePrintLabels();
    });

    expect(toast.error).toHaveBeenCalledWith('printFailed');
    window.open = originalOpen;
  });

  it('空记录列表也能正常调用（不报错）', async () => {
    const mockWrite = vi.fn();
    const mockClose = vi.fn();
    const mockPrintWindow = {
      document: { write: mockWrite, close: mockClose },
      print: vi.fn(),
      close: vi.fn(),
      onload: null as (() => void) | null,
    };

    const originalOpen = window.open;
    window.open = vi.fn(() => mockPrintWindow as any);

    const { result } = renderHook(() => usePrintLabels([]));

    await act(async () => {
      await result.current.handlePrintLabels();
    });

    expect(mockWrite).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();

    window.open = originalOpen;
  });
});
