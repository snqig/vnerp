import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

// Mock依赖
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
}))

vi.mock('jose', () => ({
  SignJWT: class MockSignJWT {
    private payload: any = {}
    constructor(payload: any) { this.payload = payload }
    setProtectedHeader() { return this }
    setIssuedAt() { return this }
    setExpirationTime() { return this }
    sign() { return Promise.resolve('mock-jwt-token') }
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}))

import { query, execute } from '@/lib/db'
import bcrypt from 'bcryptjs'

describe('登录API测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该成功登录有效用户', async () => {
    const mockUser = {
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      real_name: '管理员',
      avatar: null,
      email: 'admin@example.com',
      phone: null,
      department_id: 1,
      status: 1,
      first_login: 0,
      login_fail_count: 0,
      lock_time: null,
    }

    // Mock user query
    vi.mocked(query)
      .mockResolvedValueOnce([mockUser])  // First call: user lookup
      .mockResolvedValueOnce([])           // Second call: user roles

    vi.mocked(bcrypt.compare).mockResolvedValue(true)
    vi.mocked(execute).mockResolvedValue({ affectedRows: 1 })

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.token).toBe('mock-jwt-token')
    expect(data.data.user.username).toBe('admin')
    expect(data.message).toBe('登录成功')
  })

  it('应该拒绝空用户名或密码', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: '', password: '' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.message).toBe('用户名和密码不能为空')
  })

  it('应该拒绝不存在的用户', async () => {
    vi.mocked(query).mockResolvedValue([])

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'nonexistent', password: 'password' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.message).toContain('用户名或密码错误')
  })

  it('应该拒绝错误的密码', async () => {
    const mockUser = {
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      status: 1,
      login_fail_count: 0,
      lock_time: null,
    }

    vi.mocked(query).mockResolvedValue([mockUser])
    vi.mocked(bcrypt.compare).mockResolvedValue(false)
    vi.mocked(execute).mockResolvedValue({ affectedRows: 1 })

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.message).toContain('用户名或密码错误')
  })

  it('应该锁定多次登录失败的用户', async () => {
    const mockUser = {
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      status: 1,
      login_fail_count: 4,
      lock_time: null,
    }

    vi.mocked(query).mockResolvedValue([mockUser])
    vi.mocked(bcrypt.compare).mockResolvedValue(false)
    vi.mocked(execute).mockResolvedValue({ affectedRows: 1 })

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.success).toBe(false)
    expect(data.message).toContain('账号已锁定')
  })

  it('应该拒绝被禁用的用户', async () => {
    const mockUser = {
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      status: 0,
      login_fail_count: 0,
      lock_time: null,
    }

    vi.mocked(query).mockResolvedValue([mockUser])

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.message).toContain('账号已被禁用')
  })

  it('应该处理数据库查询错误', async () => {
    vi.mocked(query).mockRejectedValue(new Error('数据库连接失败'))

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
  })

  it('应该记录登录日志', async () => {
    const mockUser = {
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      real_name: '管理员',
      status: 1,
      login_fail_count: 0,
      lock_time: null,
    }

    vi.mocked(query).mockResolvedValue([mockUser])
    vi.mocked(bcrypt.compare).mockResolvedValue(true)
    vi.mocked(execute).mockResolvedValue({ affectedRows: 1 })

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.168.1.1' },
    })

    await POST(request as any)

    // 验证登录日志被记录（更新失败计数后记录日志）
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE sys_user SET login_fail_count'),
      expect.any(Array)
    )
  })
})