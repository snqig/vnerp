import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from './input'

describe('Input 组件测试', () => {
  it('应该正确渲染基础输入框', () => {
    render(<Input placeholder="请输入" />)
    expect(screen.getByPlaceholderText('请输入')).toBeInTheDocument()
  })

  it('应该支持不同类型', () => {
    const { rerender } = render(<Input type="text" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')

    rerender(<Input type="password" />)
    expect(screen.getByPlaceholderText('')).toHaveAttribute('type', 'password')

    rerender(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')

    rerender(<Input type="number" />)
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number')
  })

  it('应该处理输入事件', () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '测试内容' } })

    expect(handleChange).toHaveBeenCalled()
  })

  it('应该支持禁用状态', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('应该支持只读状态', () => {
    render(<Input readOnly value="只读内容" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('readOnly')
  })

  it('应该支持默认值', () => {
    render(<Input defaultValue="默认值" />)
    expect(screen.getByRole('textbox')).toHaveValue('默认值')
  })

  it('应该支持自定义className', () => {
    render(<Input className="custom-input" />)
    expect(screen.getByRole('textbox')).toHaveClass('custom-input')
  })

  it('应该支持必填属性', () => {
    render(<Input required />)
    expect(screen.getByRole('textbox')).toHaveAttribute('required')
  })

  it('应该支持name属性', () => {
    render(<Input name="username" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('name', 'username')
  })

  it('应该支持id属性', () => {
    render(<Input id="user-input" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'user-input')
  })

  it('应该正确应用样式类', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('w-full')
    expect(input).toHaveClass('rounded-md')
    expect(input).toHaveClass('border')
  })
})