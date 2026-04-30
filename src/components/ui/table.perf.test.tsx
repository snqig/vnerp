/**
 * Table组件渲染性能测试
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
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

describe('Table组件渲染性能测试', () => {
  const generateData = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `产品${i + 1}`,
      price: (Math.random() * 1000).toFixed(2),
      stock: Math.floor(Math.random() * 1000),
      status: Math.random() > 0.5 ? '启用' : '禁用',
    }))

  it('应该在合理时间内渲染基础表格', () => {
    const data = generateData(10)
    const start = performance.now()
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>价格</TableHead>
            <TableHead>库存</TableHead>
            <TableHead>状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.price}</TableCell>
              <TableCell>{item.stock}</TableCell>
              <TableCell>{item.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
    const end = performance.now()

    expect(container.querySelector('table')).toBeInTheDocument()
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10)
    expect(end - start).toBeLessThan(200)
  })

  it('应该高效渲染大数据量表格', () => {
    const data = generateData(100)
    const start = performance.now()
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>价格</TableHead>
            <TableHead>库存</TableHead>
            <TableHead>状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.price}</TableCell>
              <TableCell>{item.stock}</TableCell>
              <TableCell>{item.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
    const end = performance.now()

    expect(container.querySelectorAll('tbody tr')).toHaveLength(100)
    expect(end - start).toBeLessThan(1000) // 1秒内渲染100行
  })

  it('应该高效渲染复杂表格结构', () => {
    const start = performance.now()
    const { container } = render(
      <Table>
        <TableCaption>产品列表</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>价格</TableHead>
            <TableHead>库存</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {generateData(20).map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.price}</TableCell>
              <TableCell>{item.stock}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>共20条记录</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )
    const end = performance.now()

    expect(container.querySelector('caption')).toBeInTheDocument()
    expect(container.querySelector('tfoot')).toBeInTheDocument()
    expect(end - start).toBeLessThan(300)
  })
})