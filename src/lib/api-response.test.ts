import { describe, it, expect, vi } from 'vitest'
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from './api-response'

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: ResponseInit) => ({
      ...data,
      status: init?.status || 200,
      json: async () => data,
    }),
  },
}))

describe('API响应工具测试', () => {
  describe('successResponse - 成功响应', () => {
    it('应该创建成功响应', () => {
      const response = successResponse({ id: 1 }, '创建成功')
      expect(response.code).toBe(200)
      expect(response.success).toBe(true)
      expect(response.message).toBe('创建成功')
      expect(response.data).toEqual({ id: 1 })
    })

    it('应该使用默认消息', () => {
      const response = successResponse({ id: 1 })
      expect(response.message).toBe('操作成功')
    })

    it('应该支持自定义状态码', () => {
      const response = successResponse({ id: 1 }, '创建成功', 201)
      expect(response.code).toBe(201)
    })
  })

  describe('errorResponse - 错误响应', () => {
    it('应该创建错误响应', () => {
      const response = errorResponse('操作失败', 400, 400)
      expect(response.code).toBe(400)
      expect(response.success).toBe(false)
      expect(response.message).toBe('操作失败')
      expect(response.data).toBeNull()
      expect(response.status).toBe(400)
    })

    it('应该使用默认状态码', () => {
      const response = errorResponse('服务器错误')
      expect(response.code).toBe(500)
      expect(response.status).toBe(500)
    })
  })

  describe('paginatedResponse - 分页响应', () => {
    it('应该创建分页响应', () => {
      const data = [{ id: 1 }, { id: 2 }]
      const pagination = { page: 1, pageSize: 10, total: 2, totalPages: 1 }
      const response = paginatedResponse(data, pagination)

      expect(response.code).toBe(200)
      expect(response.success).toBe(true)
      expect(response.data).toEqual(data)
      expect(response.pagination).toEqual(pagination)
    })
  })

  describe('commonErrors - 常见错误', () => {
    it('应该创建未授权错误', () => {
      const response = commonErrors.unauthorized()
      expect(response.code).toBe(401)
      expect(response.message).toBe('未授权，请先登录')
    })

    it('应该创建禁止访问错误', () => {
      const response = commonErrors.forbidden()
      expect(response.code).toBe(403)
      expect(response.message).toBe('无权访问该资源')
    })

    it('应该创建资源不存在错误', () => {
      const response = commonErrors.notFound()
      expect(response.code).toBe(404)
      expect(response.message).toBe('资源不存在')
    })

    it('应该创建请求参数错误', () => {
      const response = commonErrors.badRequest()
      expect(response.code).toBe(400)
      expect(response.message).toBe('请求参数错误')
    })

    it('应该创建资源冲突错误', () => {
      const response = commonErrors.conflict()
      expect(response.code).toBe(409)
      expect(response.message).toBe('资源冲突')
    })

    it('应该创建验证错误', () => {
      const response = commonErrors.validationError()
      expect(response.code).toBe(422)
      expect(response.message).toBe('数据验证失败')
    })

    it('应该创建服务器错误', () => {
      const response = commonErrors.serverError()
      expect(response.code).toBe(500)
      expect(response.message).toBe('服务器内部错误')
    })

    it('应该支持自定义消息', () => {
      const response = commonErrors.notFound('用户不存在')
      expect(response.message).toBe('用户不存在')
    })
  })

  describe('withErrorHandler - 错误处理包装器', () => {
    it('应该成功执行处理器', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true })
      const wrapped = withErrorHandler(handler)
      const result = await wrapped()
      expect(result).toEqual({ success: true })
    })

    it('应该捕获并处理错误', async () => {
      const error = new Error('测试错误')
      const handler = vi.fn().mockRejectedValue(error)
      const wrapped = withErrorHandler(handler)
      const result = await wrapped()
      expect(result.success).toBe(false)
      expect(result.message).toBe('测试错误')
    })

    it('应该使用默认错误消息', async () => {
      const handler = vi.fn().mockRejectedValue('未知错误')
      const wrapped = withErrorHandler(handler)
      const result = await wrapped()
      expect(result.success).toBe(false)
      expect(result.message).toBe('操作失败')
    })
  })

  describe('validateRequestBody - 请求体验证', () => {
    it('应该验证必填字段', () => {
      const result = validateRequestBody({}, ['name', 'email'])
      expect(result.valid).toBe(false)
      expect(result.missing).toEqual(['name', 'email'])
    })

    it('应该通过完整数据', () => {
      const result = validateRequestBody({ name: 'John', email: 'john@example.com' }, ['name', 'email'])
      expect(result.valid).toBe(true)
      expect(result.missing).toEqual([])
    })

    it('应该检测空字符串', () => {
      const result = validateRequestBody({ name: '', email: 'john@example.com' }, ['name', 'email'])
      expect(result.valid).toBe(false)
      expect(result.missing).toContain('name')
    })

    it('应该检测null值', () => {
      const result = validateRequestBody({ name: null, email: 'john@example.com' }, ['name', 'email'])
      expect(result.valid).toBe(false)
      expect(result.missing).toContain('name')
    })

    it('应该检测undefined值', () => {
      const result = validateRequestBody({ name: undefined, email: 'john@example.com' }, ['name', 'email'])
      expect(result.valid).toBe(false)
      expect(result.missing).toContain('name')
    })

    it('应该允许可选字段为空', () => {
      const result = validateRequestBody({ name: 'John' }, ['name', 'email'])
      expect(result.valid).toBe(false)
      expect(result.missing).toEqual(['email'])
    })
  })
})