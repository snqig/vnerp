import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * `useCompanyName` 单测。
 *
 * 数据源口径（2026-09 统一后）：
 *   公司名称与 LOGO 均取自 `sys_company`（`/api/organization?type=company`），
 *   即 `settings/organization` 页面编辑的那条记录 —— 不再优先读 `sys_config`。
 *
 * 注意：Hook 内含**模块级缓存**，测试之间必须 `vi.resetModules()` 重新加载模块，
 * 否则前一个用例写入的缓存会污染后续断言。
 */

type CompanyHookModule = typeof import('./useCompanyName');

const DEFAULT_NAME = '公司名称';
const DEFAULT_LOGO = '/loginlogo.png';

/** 构造符合 authFetch 校验（res.ok / res.status / res.headers）的响应 */
const mockJsonResponse = (data: unknown, opts: { ok?: boolean; status?: number } = {}) => ({
  ok: opts.ok !== false,
  status: opts.status ?? 200,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => data,
});

/** 每次用例重新加载模块，隔离模块级缓存与并发去重状态 */
async function freshModule(): Promise<CompanyHookModule> {
  vi.resetModules();
  return await import('./useCompanyName');
}

/** 渲染 Hook 并推进所有定时器，等待数据就绪 */
async function renderCompanyHook(
  mod: CompanyHookModule
): Promise<{ companyName: string; logoUrl: string; loading: boolean }> {
  const { result } = renderHook(() => mod.useCompanyName());
  await act(async () => {
    await vi.runAllTimersAsync();
  });
  return result.current;
}

describe('useCompanyName Hook测试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('接口返回全称时应采用该全称（组织档案为唯一真相源）', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockJsonResponse({ success: true, data: { full_name: '丝网印刷管理系统' } }));
    global.fetch = mockFetch;

    const mod = await freshModule();
    const state = await renderCompanyHook(mod);

    expect(state.companyName).toBe('丝网印刷管理系统');
    expect(state.loading).toBe(false);
    // 只请求组织档案接口，不再请求 /api/system/config
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/organization?type=company',
      expect.anything()
    );
  });

  it('全称为空时应回退到简称', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(mockJsonResponse({ success: true, data: { short_name: '达昌印刷' } }));

    const mod = await freshModule();
    const state = await renderCompanyHook(mod);

    expect(state.companyName).toBe('达昌印刷');
  });

  it('应读取组织档案中的 LOGO', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: { full_name: '达昌印刷', logo: '/uploads/company/logo-1.png' },
      })
    );

    const mod = await freshModule();
    const state = await renderCompanyHook(mod);

    expect(state.logoUrl).toBe('/uploads/company/logo-1.png');
  });

  it('未配置 LOGO 时应回退内置默认图', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(mockJsonResponse({ success: true, data: { full_name: '达昌印刷' } }));

    const mod = await freshModule();
    const state = await renderCompanyHook(mod);

    expect(state.logoUrl).toBe(DEFAULT_LOGO);
  });

  it('兼容 data 包在 list 中的响应形态', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: { list: [{ full_name: '列表形态公司', logo: '/uploads/company/x.png' }] },
      })
    );

    const mod = await freshModule();
    const state = await renderCompanyHook(mod);

    expect(state.companyName).toBe('列表形态公司');
    expect(state.logoUrl).toBe('/uploads/company/x.png');
  });

  it('401 响应应保持 i18n 默认名与默认 LOGO', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse({}, { status: 401, ok: false }));

    const mod = await freshModule();
    const state = await renderCompanyHook(mod);

    expect(state.loading).toBe(false);
    expect(state.companyName).toBe(DEFAULT_NAME);
    expect(state.logoUrl).toBe(DEFAULT_LOGO);
  });

  it('网络失败时应保持默认值', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('网络错误'));

    const mod = await freshModule();
    const state = await renderCompanyHook(mod);

    expect(state.loading).toBe(false);
    expect(state.companyName).toBe(DEFAULT_NAME);
    expect(state.logoUrl).toBe(DEFAULT_LOGO);
  });

  it('档案为空时应保持默认值', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse({ success: true, data: null }));

    const mod = await freshModule();
    const state = await renderCompanyHook(mod);

    expect(state.loading).toBe(false);
    expect(state.companyName).toBe(DEFAULT_NAME);
    expect(state.logoUrl).toBe(DEFAULT_LOGO);
  });

  it('updateCompanyProfile 应广播给已挂载组件（上传 LOGO 后即时生效）', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockJsonResponse({
        success: true,
        data: { full_name: '达昌印刷', logo: '/uploads/company/old.png' },
      })
    );

    const mod = await freshModule();
    // 使用 renderHook 保持组件挂载，以便验证订阅回调
    const { result } = renderHook(() => mod.useCompanyName());
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.logoUrl).toBe('/uploads/company/old.png');

    act(() => {
      mod.updateCompanyProfile({ logoUrl: '/uploads/company/new.png' });
    });

    expect(result.current.logoUrl).toBe('/uploads/company/new.png');
  });

  it('refreshCompanyProfile 应重新拉取并广播最新档案', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse({ success: true, data: { full_name: '旧名称', logo: '/uploads/company/a.png' } })
      )
      .mockResolvedValue(
        mockJsonResponse({ success: true, data: { full_name: '新名称', logo: '/uploads/company/b.png' } })
      );
    global.fetch = mockFetch;

    const mod = await freshModule();
    const { result } = renderHook(() => mod.useCompanyName());
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.companyName).toBe('旧名称');

    await act(async () => {
      await mod.refreshCompanyProfile();
    });

    expect(result.current.companyName).toBe('新名称');
    expect(result.current.logoUrl).toBe('/uploads/company/b.png');
  });
});
