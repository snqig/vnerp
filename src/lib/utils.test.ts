import { describe, it, expect } from 'vitest'
import {
  cn,
  generateId,
  generateOrderNo,
  generateBatchNo,
  generateQRCode,
  parseQRCode,
  formatDate,
  formatAmount,
  formatQuantity,
  calculateEfficiency,
} from './utils'

describe('工具函数测试', () => {
  describe('cn - 样式合并', () => {
    it('应该合并基础样式', () => {
      const result = cn('text-red-500', 'bg-blue-500')
      expect(result).toContain('text-red-500')
      expect(result).toContain('bg-blue-500')
    })

    it('应该处理条件样式', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toContain('base-class')
      expect(result).toContain('active-class')
    })

    it('应该处理空值', () => {
      const result = cn('base-class', null, undefined, false)
      expect(result).toBe('base-class')
    })
  })

  describe('generateId - 生成唯一ID', () => {
    it('应该生成带前缀的ID', () => {
      const id = generateId('test')
      expect(id).toMatch(/^test_[a-z0-9]+$/)
    })

    it('应该生成不带前缀的ID', () => {
      const id = generateId()
      expect(id).toMatch(/^[a-z0-9]+$/)
    })

    it('生成的ID应该是唯一的', () => {
      const id1 = generateId('test')
      const id2 = generateId('test')
      expect(id1).not.toBe(id2)
    })
  })

  describe('generateOrderNo - 生成单据编号', () => {
    it('应该生成正确格式的单据编号', () => {
      const orderNo = generateOrderNo('PO')
      expect(orderNo).toMatch(/^PO\d{4}\d{2}\d{2}\d{4}$/)
    })

    it('应该使用不同前缀', () => {
      const poNo = generateOrderNo('PO')
      const soNo = generateOrderNo('SO')
      expect(poNo.startsWith('PO')).toBe(true)
      expect(soNo.startsWith('SO')).toBe(true)
    })
  })

  describe('generateBatchNo - 生成批次号', () => {
    it('应该生成正确格式的批次号', () => {
      const batchNo = generateBatchNo('WH01')
      expect(batchNo).toMatch(/^WH01\d{4}\d{2}\d{2}\d{4}$/)
    })
  })

  describe('generateQRCode - 生成二维码', () => {
    it('应该生成正确格式的二维码', () => {
      const qr = generateQRCode('product', '123')
      expect(qr).toMatch(/^DCERP:product:123:\d+$/)
    })
  })

  describe('parseQRCode - 解析二维码', () => {
    it('应该正确解析有效的二维码', () => {
      const qr = 'DCERP:product:123:1234567890'
      const result = parseQRCode(qr)
      expect(result).toEqual({
        type: 'product',
        id: '123',
        timestamp: 1234567890,
      })
    })

    it('应该返回null对于无效的二维码', () => {
      const result = parseQRCode('INVALID:QR')
      expect(result).toBeNull()
    })

    it('应该返回null对于空字符串', () => {
      const result = parseQRCode('')
      expect(result).toBeNull()
    })
  })

  describe('formatDate - 格式化日期', () => {
    it('应该格式化日期为YYYY-MM-DD', () => {
      const date = new Date('2024-03-15')
      const result = formatDate(date, 'YYYY-MM-DD')
      expect(result).toBe('2024-03-15')
    })

    it('应该格式化日期为YYYY-MM-DD HH:mm:ss', () => {
      const date = new Date('2024-03-15 14:30:45')
      const result = formatDate(date, 'YYYY-MM-DD HH:mm:ss')
      expect(result).toBe('2024-03-15 14:30:45')
    })

    it('应该处理字符串日期', () => {
      const result = formatDate('2024-03-15', 'YYYY-MM-DD')
      expect(result).toBe('2024-03-15')
    })

    it('应该返回空字符串对于null值', () => {
      const result = formatDate(null)
      expect(result).toBe('')
    })

    it('应该返回空字符串对于undefined值', () => {
      const result = formatDate(undefined)
      expect(result).toBe('')
    })
  })

  describe('formatAmount - 格式化金额', () => {
    it('应该格式化数字金额', () => {
      const result = formatAmount(1234.56)
      expect(result).toBe('1,234.56')
    })

    it('应该格式化字符串金额', () => {
      const result = formatAmount('1234.56')
      expect(result).toBe('1,234.56')
    })

    it('应该处理NaN值', () => {
      const result = formatAmount('invalid')
      expect(result).toBe('0.00')
    })

    it('应该支持自定义小数位', () => {
      const result = formatAmount(1234.5, 3)
      expect(result).toBe('1,234.500')
    })
  })

  describe('formatQuantity - 格式化数量', () => {
    it('应该格式化数字数量', () => {
      const result = formatQuantity(100)
      expect(result).toBe('100')
    })

    it('应该格式化小数数量', () => {
      const result = formatQuantity(100.5)
      expect(result).toBe('100.5')
    })

    it('应该处理NaN值', () => {
      const result = formatQuantity('invalid')
      expect(result).toBe('0')
    })
  })

  describe('calculateEfficiency - 计算效率', () => {
    it('应该正确计算效率', () => {
      const result = calculateEfficiency(100, 80)
      expect(result).toBe(80)
    })

    it('应该返回0当实际时间为0', () => {
      const result = calculateEfficiency(0, 80)
      expect(result).toBe(0)
    })

    it('应该返回0当标准时间为0', () => {
      const result = calculateEfficiency(100, 0)
      expect(result).toBe(0)
    })

    it('应该返回0当时间为负数', () => {
      const result = calculateEfficiency(-100, 80)
      expect(result).toBe(0)
    })
  })
})