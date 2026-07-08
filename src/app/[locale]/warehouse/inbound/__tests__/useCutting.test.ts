import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { PrintLabel } from '../types';

vi.mock('@/lib/auth-fetch', () => ({
  authFetch: vi.fn(),
}));

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

import { useCutting } from '../hooks/useCutting';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from 'sonner';

const mockJsonResponse = (data: any, ok = true) =>
  ({
    ok,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
  }) as any;

const makeLabel = (overrides: Partial<PrintLabel> = {}): PrintLabel => ({
  id: '1-0',
  labelNo: 'PO-001-1',
  orderNo: 'PO-001',
  order_no: 'PO-001',
  materialName: 'PET薄膜',
  material_name: 'PET薄膜',
  specification: '1200×1000mm',
  material_spec: '1200×1000mm',
  quantity: 100,
  unit: 'KG',
  supplier: '供应商A',
  supplier_name: '供应商A',
  batchNo: 'B001',
  batch_no: 'B001',
  record: { id: 1 },
  item: { idx: 0, material_code: 'MAT-001', material_name: 'PET薄膜', material_spec: '1200×1000mm', quantity: 100, unit: 'KG', batch_no: 'B001' },
  ...overrides,
});

const baseDeps = {
  currentLabel: makeLabel(),
  user: { id: '1', realName: '操作员', username: 'operator' },
  fetchInboundRecords: vi.fn().mockResolvedValue(undefined),
  setPrintLabels: vi.fn(),
  setIsCuttingResultOpen: vi.fn(),
  setIsCuttingDialogOpen: vi.fn(),
};

describe('useCutting', () => {
  beforeEach(() => {
    vi.mocked(authFetch).mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('初始表单状态包含操作员信息', () => {
    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        user: { id: '99', realName: '张三', username: 'zhangsan' },
      })
    );
    expect(result.current.cuttingForm.operatorId).toBe('99');
    expect(result.current.cuttingForm.operatorName).toBe('张三');
    expect(result.current.cuttingForm.cutWidths).toBe('');
    expect(result.current.cuttingForm.remark).toBe('');
  });

  it('currentLabel 为空时显示错误并返回', async () => {
    const { result } = renderHook(() =>
      useCutting({ ...baseDeps, currentLabel: null })
    );
    await act(async () => {
      await result.current.handleCutting();
    });
    expect(toast.error).toHaveBeenCalledWith('selectCutLabel');
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('物料不可分切时显示错误并返回', async () => {
    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({ materialName: '木材', material_name: '木材' }),
      })
    );
    await act(async () => {
      await result.current.handleCutting();
    });
    expect(toast.error).toHaveBeenCalledWith('materialNotCuttable');
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('cutWidths 为空时显示错误并返回', async () => {
    const { result } = renderHook(() => useCutting(baseDeps));
    await act(async () => {
      await result.current.handleCutting();
    });
    expect(toast.error).toHaveBeenCalledWith('inputCutWidth');
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('分切总宽度超过规格宽度时显示错误并返回', async () => {
    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({ specification: '100×200mm', material_spec: '100×200mm' }),
      })
    );
    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '60+60' })));

    await act(async () => {
      await result.current.handleCutting();
    });
    expect(toast.error).toHaveBeenCalledWith('specParseFailed');
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('成功分切后调用 API、刷新记录、映射标签', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: {
          newLabels: [
            { id: 10, labelNo: 'PO-001-C1', cutWidth: 50, cutQty: 50, isRemainder: false },
            { id: 11, labelNo: 'PO-001-C2', cutWidth: 50, cutQty: 50, isRemainder: false },
            { id: 12, isRemainder: true, cutWidth: 20, cutQty: 20 },
          ],
        },
      })
    );

    const setPrintLabels = vi.fn();
    const setIsCuttingResultOpen = vi.fn();
    const setIsCuttingDialogOpen = vi.fn();
    const fetchInboundRecords = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({ specification: '120×1000mm', material_spec: '120×1000mm' }),
        fetchInboundRecords,
        setPrintLabels,
        setIsCuttingResultOpen,
        setIsCuttingDialogOpen,
      })
    );

    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '50+50' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    expect(authFetch).toHaveBeenCalledWith('/api/warehouse/inbound/cutting', expect.objectContaining({ method: 'POST' }));
    expect(toast.success).toHaveBeenCalledWith('cutSuccess');
    expect(setIsCuttingDialogOpen).toHaveBeenCalledWith(false);
    expect(fetchInboundRecords).toHaveBeenCalled();
    expect(setPrintLabels).toHaveBeenCalled();
    expect(setIsCuttingResultOpen).toHaveBeenCalledWith(true);

    const mappedLabels = setPrintLabels.mock.calls[0][0];
    expect(mappedLabels).toHaveLength(3);
    expect(mappedLabels[0].labelNo).toBe('PO-001-C1');
    expect(mappedLabels[2].isRemainder).toBe(true);
  });

  it('API 返回失败时显示错误消息', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: false, message: '库存不足' })
    );

    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({ specification: '120×1000mm', material_spec: '120×1000mm' }),
      })
    );

    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '50' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    expect(toast.error).toHaveBeenCalledWith('库存不足');
    expect(baseDeps.setPrintLabels).not.toHaveBeenCalled();
  });

  it('网络异常时显示 cutFailed', async () => {
    vi.mocked(authFetch).mockRejectedValue(new Error('网络断开'));

    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({ specification: '120×1000mm', material_spec: '120×1000mm' }),
      })
    );

    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '50' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    expect(toast.error).toHaveBeenCalledWith('cutFailed');
  });

  it('成功后清空 cutWidths 和 remark', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: { newLabels: [] } })
    );

    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({ specification: '120×1000mm', material_spec: '120×1000mm' }),
      })
    );

    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '50', remark: '测试备注' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    expect(result.current.cuttingForm.cutWidths).toBe('');
    expect(result.current.cuttingForm.remark).toBe('');
  });

  it('API 成功但无新标签时不打开结果对话框', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: { newLabels: [] } })
    );

    const setPrintLabels = vi.fn();
    const setIsCuttingResultOpen = vi.fn();

    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({ specification: '120×1000mm', material_spec: '120×1000mm' }),
        setPrintLabels,
        setIsCuttingResultOpen,
      })
    );

    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '50' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    expect(setPrintLabels).not.toHaveBeenCalled();
    expect(setIsCuttingResultOpen).not.toHaveBeenCalled();
  });

  it('PET、PC、PVC 物料均可分切', async () => {
    const materials = ['PET薄膜', 'PC板材', 'PVC管材'];
    for (const mat of materials) {
      vi.mocked(authFetch).mockClear();
      vi.mocked(toast.error).mockClear();

      const { result } = renderHook(() =>
        useCutting({
          ...baseDeps,
          currentLabel: makeLabel({
            materialName: mat,
            material_name: mat,
            specification: '120×1000mm',
            material_spec: '120×1000mm',
          }),
          setPrintLabels: vi.fn(),
          setIsCuttingResultOpen: vi.fn(),
          setIsCuttingDialogOpen: vi.fn(),
        })
      );

      act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '50' })));
      await act(async () => {
        await result.current.handleCutting();
      });

      // 不应触发 materialNotCuttable 错误
      expect(toast.error).not.toHaveBeenCalledWith('materialNotCuttable');
    }
  });

  it('user 为 null 时操作员默认为 id=1 / 系统管理员', () => {
    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        user: null,
      })
    );
    expect(result.current.cuttingForm.operatorId).toBe('');
    expect(result.current.cuttingForm.operatorName).toBe('');
  });

  it('规格不可解析时跳过总量校验直接请求 API', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: { newLabels: [] } })
    );

    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({
          specification: '不规则规格',
          material_spec: '不规则规格',
        }),
      })
    );

    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '999+999' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    // 规格 "不规则规格" 无法解析宽度，不会触发 specParseFailed，直接调用 API
    expect(toast.error).not.toHaveBeenCalledWith('specParseFailed');
    expect(authFetch).toHaveBeenCalled();
  });

  it('单个宽度值（无 + 分隔符）也能正常分切', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: {
          newLabels: [
            { id: 20, labelNo: 'PO-001-C1', cutWidth: 50, cutQty: 50, isRemainder: false },
          ],
        },
      })
    );

    const setPrintLabels = vi.fn();
    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({ specification: '120×1000mm', material_spec: '120×1000mm' }),
        setPrintLabels,
      })
    );

    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '50' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    expect(authFetch).toHaveBeenCalled();
    expect(setPrintLabels).toHaveBeenCalled();
    const mapped = setPrintLabels.mock.calls[0][0];
    expect(mapped).toHaveLength(1);
    expect(mapped[0].cutWidth).toBe(50);
  });

  it('余料标签(isRemainder)的 materialName 包含余料前缀', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: {
          newLabels: [
            { id: 30, cutWidth: 50, cutQty: 50, isRemainder: false },
            { id: 31, cutWidth: 20, cutQty: 20, isRemainder: true },
          ],
        },
      })
    );

    const setPrintLabels = vi.fn();
    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({
          materialName: 'PET薄膜',
          material_name: 'PET薄膜',
          specification: '120×1000mm',
          material_spec: '120×1000mm',
        }),
        setPrintLabels,
      })
    );

    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '50+50' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    const mapped = setPrintLabels.mock.calls[0][0];
    expect(mapped[0].isRemainder).toBe(false);
    expect(mapped[0].materialName).toBe('PET薄膜');
    expect(mapped[1].isRemainder).toBe(true);
    // 余料标签的 materialName 应包含 remainderMaterial key（mock t() 返回 key 本身）
    expect(mapped[1].materialName).toContain('remainderMaterial');
    expect(mapped[1].materialName).toContain('PET薄膜');
  });

  it('newLabels 缺少 labelNo 时回退生成 ${orderNo}-C${idx+1}', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: {
          newLabels: [
            { id: 40, cutWidth: 50, cutQty: 50, isRemainder: false },
            { id: 41, cutWidth: 50, cutQty: 50, isRemainder: false },
          ],
        },
      })
    );

    const setPrintLabels = vi.fn();
    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({
          order_no: 'PO-099',
          orderNo: 'PO-099',
          specification: '120×1000mm',
          material_spec: '120×1000mm',
        }),
        setPrintLabels,
      })
    );

    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '50+50' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    const mapped = setPrintLabels.mock.calls[0][0];
    expect(mapped[0].labelNo).toBe('PO-099-C1');
    expect(mapped[1].labelNo).toBe('PO-099-C2');
  });

  it('宽度值为 NaN 时仍发送请求（hasInvalid 仅告警不阻断）', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: { newLabels: [] } })
    );

    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({ specification: '120×1000mm', material_spec: '120×1000mm' }),
      })
    );

    // 'abc' split by '+' → ['abc'] → map(Number) → [NaN]
    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: 'abc' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    // NaN > specWidth 为 false，不会触发 specParseFailed，直接调用 API
    expect(toast.error).not.toHaveBeenCalledWith('specParseFailed');
    expect(authFetch).toHaveBeenCalled();
  });

  it('newLabels 包含 newSpec 字段时 specification 使用 newSpec', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: {
          newLabels: [
            { id: 50, labelNo: 'PO-001-C1', cutWidth: 50, cutQty: 50, isRemainder: false, newSpec: '50×1000mm' },
          ],
        },
      })
    );

    const setPrintLabels = vi.fn();
    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({ specification: '120×1000mm', material_spec: '120×1000mm' }),
        setPrintLabels,
      })
    );

    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '50' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    const mapped = setPrintLabels.mock.calls[0][0];
    expect(mapped[0].specification).toBe('50×1000mm');
  });

  it('newLabels 缺少 id 时回退为 cut-${idx}', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: {
          newLabels: [
            { cutWidth: 50, cutQty: 50, isRemainder: false },
          ],
        },
      })
    );

    const setPrintLabels = vi.fn();
    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({ specification: '120×1000mm', material_spec: '120×1000mm' }),
        setPrintLabels,
      })
    );

    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '50' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    const mapped = setPrintLabels.mock.calls[0][0];
    expect(mapped[0].id).toBe('cut-0');
  });

  it('API 返回失败且无 message 时回退到 cutFailed', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: false })
    );

    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        currentLabel: makeLabel({ specification: '120×1000mm', material_spec: '120×1000mm' }),
      })
    );

    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '50' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    expect(toast.error).toHaveBeenCalledWith('cutFailed');
  });

  it('user 为 null 且表单为空时请求体 operatorId/operatorName 回退到默认值', async () => {
    vi.mocked(authFetch).mockResolvedValue(
      mockJsonResponse({ success: true, data: { newLabels: [] } })
    );

    const { result } = renderHook(() =>
      useCutting({
        ...baseDeps,
        user: null,
        currentLabel: makeLabel({ specification: '120×1000mm', material_spec: '120×1000mm' }),
      })
    );

    act(() => result.current.setCuttingForm((prev) => ({ ...prev, cutWidths: '50' })));

    await act(async () => {
      await result.current.handleCutting();
    });

    const callArgs = vi.mocked(authFetch).mock.calls[0];
    const requestBody = JSON.parse(callArgs[1]?.body as string);
    expect(requestBody.operatorId).toBe('1');
    expect(requestBody.operatorName).toBe('系统管理员');
  });
});
