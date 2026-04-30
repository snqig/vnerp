import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './button'

describe('Button 组件测试', () => {
  it('应该正确渲染基础按钮', () => {
    render(<Button>点击我</Button>)
    expect(screen.getByRole('button', { name: '点击我' })).toBeInTheDocument()
  })

  it('应该支持不同变体样式', () => {
    const { rerender } = render(<Button variant="default">默认</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'default')

    rerender(<Button variant="destructive">危险</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'destructive')

    rerender(<Button variant="outline">轮廓</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'outline')

    rerender(<Button variant="ghost">幽灵</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'ghost')

    rerender(<Button variant="link">链接</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'link')
  })

  it('应该支持不同尺寸', () => {
    const { rerender } = render(<Button size="default">默认</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'default')

    rerender(<Button size="sm">小</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'sm')

    rerender(<Button size="lg">大</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'lg')

    rerender(<Button size="icon">图标</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'icon')
  })

  it('应该处理点击事件', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>点击</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('应该在禁用时不可点击', () => {
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>禁用</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    
    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('应该显示加载状态', () => {
    render(<Button loading>加载中</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-loading', 'true')
    expect(button).toBeDisabled()
    expect(document.querySelector('[data-slot="button"]')).toHaveClass('opacity-70')
  })

  it('应该支持全宽模式', () => {
    render(<Button fullWidth>全宽按钮</Button>)
    expect(screen.getByRole('button')).toHaveClass('w-full')
  })

  it('应该支持自定义className', () => {
    render(<Button className="custom-class">自定义</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('应该支持asChild属性', () => {
    render(
      <Button asChild>
        <a href="/test">链接按钮</a>
      </Button>
    )
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('应该正确渲染子元素', () => {
    render(
      <Button>
        <span>图标</span>
        <span>文本</span>
      </Button>
    )
    expect(screen.getByText('图标')).toBeInTheDocument()
    expect(screen.getByText('文本')).toBeInTheDocument()
  })

  it('应该支持不同形状', () => {
    const { rerender } = render(<Button shape="default">默认</Button>)
    expect(screen.getByRole('button')).toHaveClass('rounded-md')

    rerender(<Button shape="pill">胶囊</Button>)
    expect(screen.getByRole('button')).toHaveClass('rounded-full')

    rerender(<Button shape="square">方形</Button>)
    expect(screen.getByRole('button')).toHaveClass('rounded-none')
  })

  it('应该在加载时显示加载图标', () => {
    render(<Button loading>加载</Button>)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('应该支持type属性', () => {
    render(<Button type="submit">提交</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
})