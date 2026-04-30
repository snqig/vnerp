/**
 * Button组件渲染性能测试
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Button } from './button'

describe('Button组件渲染性能测试', () => {
  it('应该在合理时间内渲染基础按钮', () => {
    const start = performance.now()
    const { container } = render(<Button>测试按钮</Button>)
    const end = performance.now()

    expect(container.querySelector('button')).toBeInTheDocument()
    expect(end - start).toBeLessThan(100) // 100ms内完成
  })

  it('应该高效渲染多个按钮', () => {
    const start = performance.now()
    const { container } = render(
      <>
        {Array.from({ length: 100 }, (_, i) => (
          <Button key={i}>按钮{i}</Button>
        ))}
      </>
    )
    const end = performance.now()

    expect(container.querySelectorAll('button')).toHaveLength(100)
    expect(end - start).toBeLessThan(500) // 500ms内渲染100个按钮
  })

  it('应该高效渲染带图标的按钮', () => {
    const start = performance.now()
    const { container } = render(
      <Button>
        <svg data-testid="icon" />
        图标按钮
      </Button>
    )
    const end = performance.now()

    expect(container.querySelector('button')).toBeInTheDocument()
    expect(end - start).toBeLessThan(100)
  })

  it('应该高效渲染不同变体按钮', () => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const
    const start = performance.now()
    const { container } = render(
      <>
        {variants.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}按钮
          </Button>
        ))}
      </>
    )
    const end = performance.now()

    expect(container.querySelectorAll('button')).toHaveLength(variants.length)
    expect(end - start).toBeLessThan(200)
  })

  it('应该高效渲染不同尺寸按钮', () => {
    const sizes = ['default', 'sm', 'lg', 'icon'] as const
    const start = performance.now()
    const { container } = render(
      <>
        {sizes.map((size) => (
          <Button key={size} size={size}>
            {size}按钮
          </Button>
        ))}
      </>
    )
    const end = performance.now()

    expect(container.querySelectorAll('button')).toHaveLength(sizes.length)
    expect(end - start).toBeLessThan(200)
  })
})