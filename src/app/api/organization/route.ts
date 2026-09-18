import { getTranslations } from 'next-intl/server';
import { NextRequest } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { invalidateCompanyProfileCache } from '@/lib/company-profile';

// 企业信息数据接口
interface Company {
  id?: number;
  full_name?: string;
  short_name?: string;
  code?: string;
  legal_person?: string;
  reg_address?: string;
  contact_phone?: string;
  email?: string;
  tax_no?: string;
  bank_name?: string;
  bank_account?: string;
  website?: string;
  fax?: string;
  postcode?: string;
  description?: string;
  /** LOGO 静态资源路径，写入走 /api/organization/logo（本接口不修改，避免误清空） */
  logo?: string | null;
  create_time?: string;
  update_time?: string;
}

// GET - 获取企业信息
export const GET = withPermission(async (request: NextRequest, _userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'company') {
    const company = await queryOne<Company>(
      `SELECT
        id, full_name, short_name, code, legal_person, reg_address,
        contact_phone, email, tax_no, bank_name, bank_account,
        website, fax, postcode, description, logo, create_time, update_time
      FROM sys_company
      WHERE id = 1`
    );

    return successResponse(company);
  }

  return commonErrors.badRequest(ts('k_xflhs8'));
});

// PUT - 更新企业信息
//
// 注意：LOGO 不在本接口的更新列内 —— 它由 `/api/organization/logo` 专职管理。
// 若把 logo 混进「保存企业信息」的全量 UPDATE，任何未回填 logo 的提交都会把它清空。
export const PUT = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
  const ts = await getTranslations('Common');
    const body: Company = await request.json();

    // 检查企业信息是否存在
    const existingCompany = await queryOne<{ id: number }>(
      'SELECT id FROM sys_company WHERE id = 1'
    );

    if (!existingCompany) {
      // 如果不存在，创建新的企业信息
      const validation = validateRequestBody(body, ['full_name']);

      if (!validation.valid) {
        return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
      }

      const result = await execute(
        `INSERT INTO sys_company (
        id, full_name, company_name, short_name, code, legal_person, reg_address,
        contact_phone, email, tax_no, bank_name, bank_account,
        website, fax, postcode, description
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.full_name,
          // company_name 在真实表中为 NOT NULL 且无默认值，缺省时跟随全称
          body.short_name || body.full_name,
          body.short_name ?? null,
          body.code ?? null,
          body.legal_person ?? null,
          body.reg_address ?? null,
          body.contact_phone ?? null,
          body.email ?? null,
          body.tax_no ?? null,
          body.bank_name ?? null,
          body.bank_account ?? null,
          body.website ?? null,
          body.fax ?? null,
          body.postcode ?? null,
          body.description ?? null,
        ]
      );

      invalidateCompanyProfileCache();
      return successResponse({ id: result.insertId }, ts('k_1pvyl8y'));
    }

    // 更新企业信息
    const result = await execute(
      `UPDATE sys_company SET
      full_name = ?,
      short_name = ?,
      code = ?,
      legal_person = ?,
      reg_address = ?,
      contact_phone = ?,
      email = ?,
      tax_no = ?,
      bank_name = ?,
      bank_account = ?,
      website = ?,
      fax = ?,
      postcode = ?,
      description = ?
    WHERE id = 1`,
      [
        body.full_name,
        body.short_name ?? null,
        body.code ?? null,
        body.legal_person ?? null,
        body.reg_address ?? null,
        body.contact_phone ?? null,
        body.email ?? null,
        body.tax_no ?? null,
        body.bank_name ?? null,
        body.bank_account ?? null,
        body.website ?? null,
        body.fax ?? null,
        body.postcode ?? null,
        body.description ?? null,
      ]
    );

    if (result.affectedRows === 0) {
      return commonErrors.notFound(ts('k_1nf2v1x'));
    }

    // 公司名/简称变更后立即失效服务端缓存，使标题等位置及时生效
    invalidateCompanyProfileCache();

    return successResponse(null, ts('k_9deiaf'));
  },
  { logTitle: '更新企业信息' }
);
