import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET } from './route';

/**
 * `/api/public/company-branding` 单测。
 *
 * 该接口**免鉴权**（登录页需要品牌信息，而登录页必然是未登录状态），
 * 因此必须守住安全边界：只暴露展示型字段，不得泄露企业敏感信息。
 */

vi.mock('@/lib/company-profile', () => ({
  getCompanyProfile: vi.fn(),
}));

import { getCompanyProfile } from '@/lib/company-profile';

const mockGetCompanyProfile = vi.mocked(getCompanyProfile);

const request = {} as NextRequest;

describe('公司品牌公开接口测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应返回公司全称、简称与 LOGO', async () => {
    mockGetCompanyProfile.mockResolvedValue({
      fullName: '越南达昌科技有限公司',
      shortName: '达昌科技',
      logo: '/uploads/company/logo-1.png',
    });

    const res = await GET(request);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      full_name: '越南达昌科技有限公司',
      short_name: '达昌科技',
      logo: '/uploads/company/logo-1.png',
    });
  });

  it('不得泄露敏感企业信息（税号 / 银行账号 / 法人 / 联系方式）', async () => {
    mockGetCompanyProfile.mockResolvedValue({
      fullName: '越南达昌科技有限公司',
      shortName: '达昌科技',
      logo: '/uploads/company/logo-1.png',
    });

    const res = await GET(request);
    const body = await res.json();

    // 响应键集合被精确约束为三个展示型字段：多一个都意味着可能泄露
    expect(Object.keys(body.data).sort()).toEqual(['full_name', 'logo', 'short_name']);

    const serialized = JSON.stringify(body);
    for (const sensitive of ['tax_no', 'bank_account', 'bank_name', 'legal_person', 'email', 'contact_phone', 'reg_address']) {
      expect(serialized).not.toContain(sensitive);
    }
  });

  it('档案为空时应返回 null 字段而非报错', async () => {
    mockGetCompanyProfile.mockResolvedValue({
      fullName: null,
      shortName: null,
      logo: null,
    });

    const res = await GET(request);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ full_name: null, short_name: null, logo: null });
  });
});
