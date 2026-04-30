import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table'

describe('Table 组件测试', () => {
  it('应该正确渲染完整表格', () => {
    render(
      <Table>
        <TableCaption>用户列表</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>姓名</TableHead>
            <TableHead>邮箱</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>张三</TableCell>
            <TableCell>zhangsan@example.com</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(screen.getByText('用户列表')).toBeInTheDocument()
    expect(screen.getByText('姓名')).toBeInTheDocument()
    expect(screen.getByText('张三')).toBeInTheDocument()
  })

  it('应该渲染表格容器', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>测试</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(container.querySelector('[data-slot="table-container"]')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="table"]')).toBeInTheDocument()
  })

  it('应该渲染表头', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>列1</TableHead>
            <TableHead>列2</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    )

    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(2)
    expect(headers[0]).toHaveTextContent('列1')
    expect(headers[1]).toHaveTextContent('列2')
  })

  it('应该渲染表格主体', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>数据1</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>数据2</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(2)
  })

  it('应该渲染表格底部', () => {
    render(
      <Table>
        <TableFooter>
          <TableRow>
            <TableCell>总计</TableCell>
            <TableCell>100</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    expect(screen.getByText('总计')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('应该支持自定义className', () => {
    const { container } = render(
      <Table className="custom-table">
        <TableBody>
          <TableRow>
            <TableCell>测试</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(container.querySelector('[data-slot="table"]')).toHaveClass('custom-table')
  })

  it('应该支持行自定义className', () => {
    render(
      <Table>
        <TableBody>
          <TableRow className="highlight-row">
            <TableCell>高亮行</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(screen.getByRole('row')).toHaveClass('highlight-row')
  })

  it('应该支持单元格自定义className', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="text-right">右对齐</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(screen.getByRole('cell')).toHaveClass('text-right')
  })

  it('应该渲染空表格', () => {
    const { container } = render(
      <Table>
        <TableBody></TableBody>
      </Table>
    )

    expect(container.querySelector('[data-slot="table-body"]')).toBeInTheDocument()
  })

  it('应该支持表头自定义className', () => {
    render(
      <Table>
        <TableHeader className="sticky-header">
          <TableRow>
            <TableHead>标题</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    )

    expect(screen.getAllByRole('rowgroup')[0]).toHaveClass('sticky-header')
  })
})