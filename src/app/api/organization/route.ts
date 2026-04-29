import { NextRequest } from 'next/server';
import { query, execute, queryOne } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  commonErrors,
  withErrorHandler,
  validateRequestBody,
} from '@/lib/api-response';

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
  create_time?: string;
  update_time?: string;
}

// GET - 获取企业信息
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'company') {
    const company = await queryOne<Company>(
      `SELECT
        id, full_name, short_name, code, legal_person, reg_address,
        contact_phone, email, tax_no, bank_name, bank_account,
        website, fax, postcode, description, create_time, update_time
      FROM sys_company
      WHERE id = 1`
    );

    return successResponse(company);
  }

  return commonErrors.badRequest('无效的请求类型');
}, '获取企业信息失败');

// PUT - 更新企业信息
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const body: Company = await request.json();

  // 检查企业信息是否存在
  const existingCompany = await queryOne<{ id: number }>(
    'SELECT id FROM sys_company WHERE id = 1'
  );

  if (!existingCompany) {
    // 如果不存在，创建新的企业信息
    const validation = validateRequestBody(body, ['full_name']);

    if (!validation.valid) {
      return errorResponse(
        `缺少必填字段: ${validation.missing.join(', ')}`,
        400,
        400
      );
    }

    const result = await execute(
      `INSERT INTO sys_company (
        id, full_name, short_name, code, legal_person, reg_address,
        contact_phone, email, tax_no, bank_name, bank_account,
        website, fax, postcode, description
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    return successResponse({ id: result.insertId }, '企业信息创建成功');
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
    return commonErrors.notFound('企业信息不存在');
  }

  return successResponse(null, '企业信息更新成功');
}, '更新企业信息失败');
