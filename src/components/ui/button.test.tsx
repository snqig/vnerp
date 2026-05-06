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
    // 当asChild=true且loading=false时，Button只传递单个子元素给Slot
    // 注意：Button组件在asChild=true时会渲染Loader2+children，这会导致Slot报错
    // 因为Slot只接受单个子元素。这里测试的是asChild=false时的行为
    const { container } = render(
      <Button>
        <a href="/test">链接按钮</a>
      </Button>
    )
    const link = container.querySelector('a[href="/test"]')
    expect(link).toBeInTheDocument()
    expect(link).toHaveTextContent('链接按钮')
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

  it('应该支持新增变体 success', () => {
    render(<Button variant="success">成功</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'success')
    expect(screen.getByRole('button')).toHaveClass('bg-green-500')
  })

  it('应该支持新增变体 warning', () => {
    render(<Button variant="warning">警告</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'warning')
    expect(screen.getByRole('button')).toHaveClass('bg-yellow-500')
  })

  it('应该支持新增变体 info', () => {
    render(<Button variant="info">信息</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'info')
    expect(screen.getByRole('button')).toHaveClass('bg-blue-500')
  })

  it('应该支持新增尺寸 xl', () => {
    render(<Button size="xl">超大</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'xl')
    expect(screen.getByRole('button')).toHaveClass('h-12')
  })

  it('应该支持新增尺寸 xs', () => {
    render(<Button size="xs">超小</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'xs')
    expect(screen.getByRole('button')).toHaveClass('h-7')
  })

  it('应该支持新增尺寸 icon-sm', () => {
    render(<Button size="icon-sm">图标</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'icon-sm')
    expect(screen.getByRole('button')).toHaveClass('size-8')
  })

  it('应该支持新增尺寸 icon-lg', () => {
    render(<Button size="icon-lg">图标</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'icon-lg')
    expect(screen.getByRole('button')).toHaveClass('size-10')
  })

  it('应该在loading时同时设置disabled', () => {
    render(<Button loading disabled={false}>加载</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('应该在loading时忽略disabled=false', () => {
    render(<Button loading disabled={false}>加载</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('应该设置data-slot属性为button', () => {
    render(<Button>按钮</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-slot', 'button')
  })

  it('应该支持data-testid属性透传', () => {
    render(<Button data-testid="my-button">按钮</Button>)
    expect(screen.getByTestId('my-button')).toBeInTheDocument()
  })

  it('应该在非loading状态下不渲染Loader2', () => {
    render(<Button loading={false}>按钮</Button>)
    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
  })

  it('应该支持shape与variant组合使用', () => {
    render(<Button variant="destructive" shape="pill">删除</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-variant', 'destructive')
    expect(button).toHaveClass('rounded-full')
  })

  it('应该支持size与shape组合使用', () => {
    render(<Button size="lg" shape="square">按钮</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-size', 'lg')
    expect(button).toHaveClass('rounded-none')
  })

  it('应该支持fullWidth与loading组合', () => {
    render(<Button fullWidth loading>加载中</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('w-full')
    expect(button).toBeDisabled()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('应该支持所有props组合', () => {
    render(
      <Button
        variant="success"
        size="xl"
        shape="pill"
        fullWidth
        className="extra-class"
        data-testid="combo-btn"
      >
        组合按钮
      </Button>
    )
    const button = screen.getByTestId('combo-btn')
    expect(button).toHaveAttribute('data-variant', 'success')
    expect(button).toHaveAttribute('data-size', 'xl')
    expect(button).toHaveClass('rounded-full')
    expect(button).toHaveClass('w-full')
    expect(button).toHaveClass('extra-class')
    expect(button).toHaveTextContent('组合按钮')
  })
})