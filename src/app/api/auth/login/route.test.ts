import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('jose', () => ({
  SignJWT: class MockSignJWT {
    setProtectedHeader() {
      return this;
    }
    setIssuedAt() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    sign() {
      return Promise.resolve('mock-jwt-token');
    }
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

import { query, execute } from '@/lib/db';
import bcrypt from 'bcryptjs';

const mockCompare = vi.mocked(bcrypt.compare) as unknown as ReturnType<typeof vi.fn>;
const mockExecute = vi.mocked(execute) as unknown as ReturnType<typeof vi.fn>;

describe('登录API测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    };

    vi.mocked(query)
      .mockResolvedValueOnce([mockUser])
      .mockResolvedValueOnce([{ last_login_ip: '127.0.0.1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ dept_name: '技术部' }]);

    mockCompare.mockResolvedValueOnce(true);
    mockExecute.mockResolvedValueOnce({ affectedRows: 1 });

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.token).toBe('mock-jwt-token');
    expect(data.data.user.username).toBe('admin');
    expect(data.message).toBe('登录成功');
  });

  it('应该拒绝空用户名或密码', async () => {
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: '', password: '' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe('用户名和密码不能为空');
  });

  it('应该拒绝不存在的用户', async () => {
    vi.mocked(query).mockResolvedValue([]);

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'nonexistent', password: 'password' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toContain('用户名或密码错误');
  });

  it('应该拒绝错误的密码', async () => {
    const mockUser = {
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      status: 1,
      login_fail_count: 0,
      lock_time: null,
    };

    vi.mocked(query).mockResolvedValue([mockUser]);
    mockCompare.mockResolvedValueOnce(false);
    mockExecute.mockResolvedValueOnce({ affectedRows: 1 });

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toContain('用户名或密码错误');
  });

  it('应该锁定多次登录失败的用户', async () => {
    const mockUser = {
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      status: 1,
      login_fail_count: 4,
      lock_time: null,
    };

    vi.mocked(query).mockResolvedValue([mockUser]);
    mockCompare.mockResolvedValueOnce(false);
    mockExecute.mockResolvedValueOnce({ affectedRows: 1 });

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.message).toContain('账号已锁定');
  });

  it('应该拒绝被禁用的用户', async () => {
    const mockUser = {
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      status: 0,
      login_fail_count: 0,
      lock_time: null,
    };

    vi.mocked(query).mockResolvedValue([mockUser]);

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toContain('账号已被禁用');
  });

  it('应该处理数据库查询错误', async () => {
    vi.mocked(query).mockRejectedValue(new Error('数据库连接失败'));

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it('应该记录登录日志', async () => {
    const mockUser = {
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      real_name: '管理员',
      status: 1,
      login_fail_count: 0,
      lock_time: null,
    };

    vi.mocked(query).mockResolvedValue([mockUser]);
    mockCompare.mockResolvedValueOnce(true);
    mockExecute.mockResolvedValueOnce({ affectedRows: 1 });

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.168.1.1' },
    });

    await POST(request as any);

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE sys_user SET login_fail_count'),
      expect.any(Array)
    );
  });

  it('应该在锁定时间过后允许重新登录', async () => {
    const pastLockTime = new Date(Date.now() - 20 * 60 * 1000);
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
      login_fail_count: 5,
      lock_time: pastLockTime,
    };

    vi.mocked(query).mockResolvedValueOnce([mockUser]).mockResolvedValueOnce([]);

    mockCompare.mockResolvedValueOnce(true);
    mockExecute.mockResolvedValueOnce({ affectedRows: 1 });

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('应该在锁定时间内拒绝登录', async () => {
    const recentLockTime = new Date(Date.now() - 5 * 60 * 1000);
    const mockUser = {
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      status: 1,
      login_fail_count: 5,
      lock_time: recentLockTime,
    };

    vi.mocked(query).mockResolvedValue([mockUser]);

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.message).toContain('账号已锁定');
  });

  it('应该在密码错误时显示剩余尝试次数', async () => {
    const mockUser = {
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      status: 1,
      login_fail_count: 2,
      lock_time: null,
    };

    vi.mocked(query).mockResolvedValue([mockUser]);
    mockCompare.mockResolvedValueOnce(false);
    mockExecute.mockResolvedValueOnce({ affectedRows: 1 });

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrong' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toContain('还剩');
  });

  it('应该在首次登录时返回firstLogin标志', async () => {
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
      first_login: 1,
      login_fail_count: 0,
      lock_time: null,
    };

    vi.mocked(query).mockResolvedValueOnce([mockUser]).mockResolvedValueOnce([]);

    mockCompare.mockResolvedValueOnce(true);
    mockExecute.mockResolvedValueOnce({ affectedRows: 1 });

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user.firstLogin).toBe(true);
  });

  it('应该在非首次登录时返回firstLogin为false', async () => {
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
    };

    vi.mocked(query).mockResolvedValueOnce([mockUser]).mockResolvedValueOnce([]);

    mockCompare.mockResolvedValueOnce(true);
    mockExecute.mockResolvedValueOnce({ affectedRows: 1 });

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(data.data.user.firstLogin).toBe(false);
  });

  it('应该在密码错误达到上限时锁定账号', async () => {
    const mockUser = {
      id: 1,
      username: 'admin',
      password: 'hashed_password',
      status: 1,
      login_fail_count: 4,
      lock_time: null,
    };

    vi.mocked(query).mockResolvedValue([mockUser]);
    mockCompare.mockResolvedValueOnce(false);
    mockExecute.mockResolvedValueOnce({ affectedRows: 1 });

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrong' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.message).toContain('15分钟');
  });
});
