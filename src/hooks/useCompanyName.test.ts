import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCompanyName } from './useCompanyName'

describe('useCompanyName Hook测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应该返回默认公司名称', () => {
    const { result } = renderHook(() => useCompanyName())
    expect(result.current.companyName).toBe('越南达昌科技有限公司')
    expect(result.current.loading).toBe(true)
  })

  it('应该从组织API获取公司名称', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: { full_name: '测试公司全称' },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: false }),
      })

    global.fetch = mockFetch

    const { result } = renderHook(() => useCompanyName())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.companyName).toBe('测试公司全称')
    expect(mockFetch).toHaveBeenCalledWith('/api/organization?type=company')
  })

  it('应该使用短名称当全称不存在', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: { short_name: '测试短名' },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: false }),
      })

    global.fetch = mockFetch

    const { result } = renderHook(() => useCompanyName())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.companyName).toBe('测试短名')
  })

  it('应该从系统配置获取公司名称', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ success: false }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            list: [
              { config_key: 'company_name', config_value: '配置公司名称' },
            ],
          },
        }),
      })

    global.fetch = mockFetch

    const { result } = renderHook(() => useCompanyName())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.companyName).toBe('配置公司名称')
    expect(mockFetch).toHaveBeenCalledWith('/api/system/config?pageSize=200')
  })

  it('应该使用短名称配置', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ success: false }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            list: [
              { config_key: 'company_short_name', config_value: '短名称公司' },
            ],
          },
        }),
      })

    global.fetch = mockFetch

    const { result } = renderHook(() => useCompanyName())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.companyName).toBe('短名称公司')
  })

  it('应该在API失败时保持默认值', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('网络错误'))
    global.fetch = mockFetch

    const { result } = renderHook(() => useCompanyName())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.companyName).toBe('越南达昌科技有限公司')
  })

  it('应该在组织API成功时不再调用配置API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: { full_name: '组织名称' },
      }),
    })

    global.fetch = mockFetch

    const { result } = renderHook(() => useCompanyName())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('/api/organization?type=company')
  })

  it('应该处理空数据响应', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: null }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { list: [] } }),
      })

    global.fetch = mockFetch

    const { result } = renderHook(() => useCompanyName())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.companyName).toBe('越南达昌科技有限公司')
  })
})