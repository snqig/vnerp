import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, PUT, DELETE } from './route'

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
}))

vi.mock('@/lib/api-response', () => ({
  withErrorHandler: (handler: any) => handler,
  successResponse: (data: any, message = '操作成功') => ({
    json: async () => ({ success: true, message, data }),
    status: 200,
  }),
}))

import { query, execute } from '@/lib/db'

describe('系统配置API测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET - 查询配置', () => {
    it('应该返回配置列表', async () => {
      const mockConfigs = [
        { id: 1, config_name: '公司名称', config_key: 'company_name', config_value: '测试公司' },
        { id: 2, config_name: '系统版本', config_key: 'version', config_value: '1.0.0' },
      ]

      vi.mocked(query)
        .mockResolvedValueOnce([{ total: 2 }])
        .mockResolvedValueOnce(mockConfigs)

      const request = new Request('http://localhost/api/system/config?page=1&pageSize=20')
      const response = await GET(request as any)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.list).toHaveLength(2)
      expect(data.data.total).toBe(2)
    })

    it('应该支持按名称搜索', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([{ id: 1, config_name: '公司名称' }])

      const request = new Request('http://localhost/api/system/config?configName=公司')
      const response = await GET(request as any)
      const data = await response.json()

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('config_name LIKE ?'),
        expect.arrayContaining(['%公司%'])
      )
    })

    it('应该支持按键搜索', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([{ id: 1, config_key: 'company_name' }])

      const request = new Request('http://localhost/api/system/config?configKey=company')
      const response = await GET(request as any)
      const data = await response.json()

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('config_key LIKE ?'),
        expect.arrayContaining(['%company%'])
      )
    })

    it('应该使用默认分页参数', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([])

      const request = new Request('http://localhost/api/system/config')
      await GET(request as any)

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        expect.arrayContaining([20, 0])
      )
    })
  })

  describe('POST - 创建配置', () => {
    it('应该创建新配置', async () => {
      vi.mocked(execute).mockResolvedValue({ insertId: 100 })

      const request = new Request('http://localhost/api/system/config', {
        method: 'POST',
        body: JSON.stringify({
          config_name: '新配置',
          config_key: 'new_config',
          config_value: '值',
          config_type: 1,
          description: '描述',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.message).toBe('创建成功')
      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sys_config'),
        expect.arrayContaining(['新配置', 'new_config', '值', 1, '描述'])
      )
    })

    it('应该使用默认类型', async () => {
      vi.mocked(execute).mockResolvedValue({ insertId: 1 })

      const request = new Request('http://localhost/api/system/config', {
        method: 'POST',
        body: JSON.stringify({
          config_name: '测试',
          config_key: 'test',
          config_value: '值',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      await POST(request as any)

      expect(execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(String), expect.any(String), expect.any(String), 1, null])
      )
    })
  })

  describe('PUT - 更新配置', () => {
    it('应该更新配置', async () => {
      vi.mocked(execute).mockResolvedValue({ affectedRows: 1 })

      const request = new Request('http://localhost/api/system/config', {
        method: 'PUT',
        body: JSON.stringify({
          id: 1,
          config_name: '更新名称',
          config_key: 'updated_key',
          config_value: '更新值',
          config_type: 2,
          description: '更新描述',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request as any)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.message).toBe('更新成功')
      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sys_config'),
        expect.arrayContaining(['更新名称', 'updated_key', '更新值', 2, '更新描述', 1])
      )
    })
  })

  describe('DELETE - 删除配置', () => {
    it('应该删除配置', async () => {
      vi.mocked(execute).mockResolvedValue({ affectedRows: 1 })

      const request = new Request('http://localhost/api/system/config?id=1', {
        method: 'DELETE',
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.message).toBe('删除成功')
      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sys_config SET deleted = 1'),
        [1]
      )
    })

    it('应该拒绝缺少id的删除', async () => {
      const request = new Request('http://localhost/api/system/config', {
        method: 'DELETE',
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('缺少id')
    })
  })
})