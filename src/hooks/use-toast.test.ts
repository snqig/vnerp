import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useToast } from './use-toast'

describe('useToast Hook测试', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('应该返回初始状态', () => {
    const { result } = renderHook(() => useToast())

    expect(result.current.toasts).toEqual([])
    expect(typeof result.current.toast).toBe('function')
    expect(typeof result.current.dismiss).toBe('function')
  })

  it('应该添加toast', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: '测试消息' })
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].title).toBe('测试消息')
    expect(result.current.toasts[0].variant).toBe('default')
  })

  it('应该支持destructive变体', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({
        title: '错误消息',
        variant: 'destructive',
      })
    })

    expect(result.current.toasts[0].variant).toBe('destructive')
  })

  it('应该支持描述', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({
        title: '标题',
        description: '详细描述',
      })
    })

    expect(result.current.toasts[0].description).toBe('详细描述')
  })

  it('应该自动生成唯一ID', () => {
    const { result } = renderHook(() => useToast())

    let id1: string
    let id2: string

    act(() => {
      id1 = result.current.toast({ title: '消息1' })
      id2 = result.current.toast({ title: '消息2' })
    })

    expect(id1).toBeDefined()
    expect(id2).toBeDefined()
    expect(id1).not.toBe(id2)
  })

  it('应该自动移除toast', async () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: '自动移除' })
    })

    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it('应该手动移除toast', () => {
    const { result } = renderHook(() => useToast())

    let id: string

    act(() => {
      id = result.current.toast({ title: '手动移除' })
    })

    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      result.current.dismiss(id)
    })

    expect(result.current.toasts).toHaveLength(0)
  })

  it('应该支持多个toast同时存在', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: '消息1' })
      result.current.toast({ title: '消息2' })
      result.current.toast({ title: '消息3' })
    })

    expect(result.current.toasts).toHaveLength(3)
    expect(result.current.toasts[0].title).toBe('消息1')
    expect(result.current.toasts[1].title).toBe('消息2')
    expect(result.current.toasts[2].title).toBe('消息3')
  })

  it('应该只移除指定的toast', () => {
    const { result } = renderHook(() => useToast())

    let id1: string
    let id2: string

    act(() => {
      id1 = result.current.toast({ title: '消息1' })
      id2 = result.current.toast({ title: '消息2' })
    })

    act(() => {
      result.current.dismiss(id1)
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].title).toBe('消息2')
  })

  it('应该处理不存在的toast ID', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: '消息1' })
    })

    act(() => {
      result.current.dismiss('non-existent-id')
    })

    expect(result.current.toasts).toHaveLength(1)
  })

  it('应该正确清理定时器', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      result.current.toast({ title: '消息1' })
      result.current.toast({ title: '消息2' })
    })

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    // 1.5秒后，两个toast都应该还在
    expect(result.current.toasts).toHaveLength(2)

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    // 3秒后，两个toast都应该被移除
    expect(result.current.toasts).toHaveLength(0)
  })
})