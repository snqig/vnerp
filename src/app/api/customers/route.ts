import { getTranslations } from 'next-intl/server';

;
﻿import { NextRequest } from 'next/server';
import { execute, queryOne, transaction, queryPaginated, SqlValue } from '@/lib/db';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
  commonErrors,
  validateRequestBody,
} from '@/lib/api-response';
import { invalidateCache } from '@/lib/api-cache';
import { withPermission } from '@/lib/api-permissions';
import type { DbRow } from '@/types/db';

// 客户数据接口
interface Customer {
  id?: number;
  customer_code: string;
  customer_name: string;
  short_name?: string;
  customer_type: number;
  industry?: string;
  scale?: string;
  credit_level?: string;
  province?: string;
  city?: string;
  district?: string;
  address?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  fax?: string;
  website?: string;
  business_license?: string;
  tax_number?: string;
  bank_name?: string;
  bank_account?: string;
  salesman_id?: number;
  follow_up_status?: number;
  status: number;
  remark?: string;
  create_time?: string;
  update_time?: string;
}

// 构建查询条件
function buildQueryConditions(params: {
  status?: string;
  customerType?: string;
  followUpStatus?: string;
  keyword?: string;
}): { sql: string; countSql: string; values: DbRow[] } {
  let sql = `
    SELECT
      id, customer_code, customer_name, short_name, customer_type,
      industry, scale, credit_level, province, city, district, address,
      contact_name, contact_phone, contact_email, fax, website,
      business_license, tax_number, bank_name, bank_account,
      salesman_id, follow_up_status, status, remark, create_time, update_time
    FROM crm_customer
    WHERE deleted = 0
  `;
  let countSql = 'SELECT COUNT(*) as total FROM crm_customer WHERE deleted = 0';
  const values: SqlValue[] = [];

  if (params.status && params.status !== 'all') {
    const condition = ' AND status = ?';
    sql += condition;
    countSql += condition;
    values.push(parseInt(params.status));
  }

  if (params.customerType && params.customerType !== 'all') {
    const condition = ' AND customer_type = ?';
    sql += condition;
    countSql += condition;
    values.push(parseInt(params.customerType));
  }

  if (params.followUpStatus && params.followUpStatus !== 'all') {
    const condition = ' AND follow_up_status = ?';
    sql += condition;
    countSql += condition;
    values.push(parseInt(params.followUpStatus));
  }

  if (params.keyword) {
    const condition =
      ' AND (customer_code LIKE ? OR customer_name LIKE ? OR contact_name LIKE ? OR contact_phone LIKE ?)';
    sql += condition;
    countSql += condition;
    const likeKeyword = `%${params.keyword}%`;
    values.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword);
  }

  sql += ' ORDER BY create_time DESC';

  return { sql, countSql, values };
}

// GET - 获取客户列表或单个客户
export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');
  const keyword = searchParams.get('keyword');
  const customerType = searchParams.get('customerType');
  const followUpStatus = searchParams.get('followUpStatus');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  // 查询单个客户
  if (id) {
    const customer = await queryOne<Customer>(
      `SELECT
        id, customer_code, customer_name, short_name, customer_type,
        industry, scale, credit_level, province, city, district, address,
        contact_name, contact_phone, contact_email, fax, website,
        business_license, tax_number, bank_name, bank_account,
        salesman_id, follow_up_status, status, remark, create_time, update_time
      FROM crm_customer
      WHERE id = ? AND deleted = 0`,
      [parseInt(id)]
    );

    if (!customer) {
      return commonErrors.notFound(ts('k_ob0ao9'));
    }

    return successResponse(customer);
  }

  // 构建查询条件
  const { sql, countSql, values } = buildQueryConditions({
    status: status ?? undefined,
    customerType: customerType ?? undefined,
    followUpStatus: followUpStatus ?? undefined,
    keyword: keyword ?? undefined,
  });

  // 使用分页查询工具
  const result = await queryPaginated<Customer>(sql, countSql, values, {
    page,
    pageSize,
  });

  return paginatedResponse(result.data, result.pagination);
});

// POST - 创建新客户
export const POST = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const body: Customer = await request.json();

    // 验证必填字段
    const validation = validateRequestBody(body, [
      'customer_code',
      'customer_name',
      'customer_type',
    ]);

    if (!validation.valid) {
      return errorResponse(`缺少必填字段: ${validation.missing.join(', ')}`, 400, 400);
    }

    // 检查客户编码是否已存在
    const existingCustomer = await queryOne<{ id: number }>(
      'SELECT id FROM crm_customer WHERE customer_code = ? AND deleted = 0',
      [body.customer_code]
    );

    if (existingCustomer) {
      return errorResponse(ts('k_1iamdln'), 409, 409);
    }

    const result = await execute(
      `INSERT INTO crm_customer (
        customer_code, customer_name, short_name, customer_type,
        industry, scale, credit_level, province, city, district, address,
        contact_name, contact_phone, contact_email, fax, website,
        business_license, tax_number, bank_name, bank_account,
        salesman_id, follow_up_status, status, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.customer_code,
        body.customer_name,
        body.short_name,
        body.customer_type,
        body.industry,
        body.scale,
        body.credit_level,
        body.province,
        body.city,
        body.district,
        body.address,
        body.contact_name,
        body.contact_phone,
        body.contact_email,
        body.fax,
        body.website,
        body.business_license,
        body.tax_number,
        body.bank_name,
        body.bank_account,
        body.salesman_id ?? null,
        body.follow_up_status || 1,
        body.status ?? 1,
        body.remark,
      ]
    );

    await invalidateCache('api:customers');
    return successResponse({ id: result.insertId }, ts('k_z91oum'));
  },
  { logTitle: '创建客户', logType: 'business' }
);

// PUT - 更新客户
export const PUT = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return commonErrors.badRequest(ts('k_t0eo5e'));
    }

    const customerId = parseInt(id);
    const body: Customer = await request.json();

    // 检查客户是否存在
    const existingCustomer = await queryOne<{ id: number }>(
      'SELECT id FROM crm_customer WHERE id = ? AND deleted = 0',
      [customerId]
    );

    if (!existingCustomer) {
      return commonErrors.notFound(ts('k_1saxg52'));
    }

    // 如果修改了客户编码，检查是否与其他客户冲突
    if (body.customer_code) {
      const codeExists = await queryOne<{ id: number }>(
        'SELECT id FROM crm_customer WHERE customer_code = ? AND id != ? AND deleted = 0',
        [body.customer_code, customerId]
      );

      if (codeExists) {
        return errorResponse(ts('k_1iamdln'), 409, 409);
      }
    }

    const fieldMapping: { [key: string]: string } = {
      customer_code: 'customer_code',
      customer_name: 'customer_name',
      short_name: 'short_name',
      customer_type: 'customer_type',
      industry: 'industry',
      scale: 'scale',
      credit_level: 'credit_level',
      province: 'province',
      city: 'city',
      district: 'district',
      address: 'address',
      contact_name: 'contact_name',
      contact_phone: 'contact_phone',
      contact_email: 'contact_email',
      fax: 'fax',
      website: 'website',
      business_license: 'business_license',
      tax_number: 'tax_number',
      bank_name: 'bank_name',
      bank_account: 'bank_account',
      salesman_id: 'salesman_id',
      follow_up_status: 'follow_up_status',
      status: 'status',
      remark: 'remark',
    };

    const updateFields: string[] = [];
    const updateParams: SqlValue[] = [];
    for (const [key, value] of Object.entries(body)) {
      if (fieldMapping[key] && value !== undefined) {
        updateFields.push(`${fieldMapping[key]} = ?`);
        updateParams.push(value);
      }
    }

    if (updateFields.length === 0) {
      return errorResponse(ts('k_ovfx8a'), 400, 400);
    }

    updateParams.push(customerId);
    const result = await execute(
      `UPDATE crm_customer SET ${updateFields.join(', ')}, update_time = NOW() WHERE id = ? AND deleted = 0`,
      updateParams
    );

    if (result.affectedRows === 0) {
      return commonErrors.notFound(ts('k_1saxg52'));
    }

    await invalidateCache('api:customers');
    return successResponse(null, ts('k_1qq0iy3'));
  },
  { logTitle: '更新客户', logType: 'business' }
);

// DELETE - 删除客户（软删除）
export const DELETE = withPermission(
  async (request: NextRequest, _userInfo) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return commonErrors.badRequest(ts('k_t0eo5e'));
    }

    const customerId = parseInt(id);

    // 检查客户是否存在
    const existingCustomer = await queryOne<{ id: number }>(
      'SELECT id FROM crm_customer WHERE id = ? AND deleted = 0',
      [customerId]
    );

    if (!existingCustomer) {
      return commonErrors.notFound(ts('k_1saxg52'));
    }

    // 使用事务软删除
    await transaction(async (connection) => {
      await connection.execute('UPDATE crm_customer SET deleted = 1 WHERE id = ?', [customerId]);
    });

    await invalidateCache('api:customers');
    return successResponse(null, ts('k_6v0l17'));
  },
  { logTitle: '删除客户', logType: 'business' }
);
