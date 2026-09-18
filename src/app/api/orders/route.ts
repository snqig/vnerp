import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { query, queryOne, SqlValue } from '@/lib/db';
import { successResponse, errorResponse, commonErrors } from '@/lib/api-response';
import { generateDocumentNo } from '@/lib/document-numbering';
import { getSystemConfig } from '@/lib/system-config';
import { CurrencyApplicationService } from '@/application/services/CurrencyApplicationService';
import { MysqlCurrencyRepository } from '@/infrastructure/repositories/MysqlCurrencyRepository';

import { withPermission } from '@/lib/api-permissions';
import {
  SalesOrderStatusCode,
  isTerminalSalesOrderStatus,
  normalizeSalesOrderStatus,
} from '@/lib/order-status';
import type { DbRow } from '@/types/db';

/** DECIMAL 列经 mysql2 返回为字符串，统一转有限数字，非法值回落默认值。 */
function toFiniteNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** 金额按本位币折算并保留 4 位小数（与 sal_order.base_* 的 decimal(18,4) 精度一致）。 */
function convertToBase(amount: number, exchangeRate: number): number {
  return Math.round(amount * exchangeRate * 10000) / 10000;
}

// GET - 获取订单列表/详情
export const GET = withPermission(
  async (request: NextRequest) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const keyword = searchParams.get('keyword');

    // 本位币唯一真相源：sys_config.finance.base_currency（与 SalesApplicationService 同一口径）。
    // sal_order 表没有 base_currency 列，本位币是系统级配置，故由配置派生后随行返回。
    const baseCurrency = (await getSystemConfig('finance.base_currency', 'CNY')) || 'CNY';

    // 列表与详情共用：把 sal_order 的币种/本位币列映射到 API 契约。
    // 修复前该映射遗漏 currency / base_*，导致 /orders/sales 列表「币种」「本位币金额」两列
    // 取不到值，前端只能回落渲染 '-'（BUG-ORD-003）。
    const currencyFieldsOf = (order: DbRow) => ({
      currency: (order.currency as string) || baseCurrency,
      exchange_rate: toFiniteNumber(order.exchange_rate, 1) || 1,
      base_currency: baseCurrency,
      base_total_amount: toFiniteNumber(order.base_total_amount, 0),
      base_tax_amount: toFiniteNumber(order.base_tax_amount, 0),
      base_grand_total: toFiniteNumber(order.base_grand_total, 0),
    });

    if (id) {
      // 获取单个订单详情
      const orders = await query(
        `SELECT so.*, c.customer_name FROM sal_order so LEFT JOIN crm_customer c ON so.customer_id = c.id WHERE so.order_no = ? AND so.deleted = 0`,
        [id]
      );

      if (!orders || (orders as DbRow[]).length === 0) {
        return commonErrors.notFound(ts('k_2v2qxr'));
      }

      const order = (orders as DbRow[])[0];

      // 获取订单明细
      let items = await query('SELECT * FROM sal_order_item WHERE order_id = ?', [order.id]);

      if (!items || (items as DbRow[]).length === 0) {
        items = await query(
          `SELECT od.material_id, m.material_code, m.material_name, od.quantity, od.unit, od.unit_price, od.total_amount as total_price
         FROM sal_order_detail od
         LEFT JOIN inv_material m ON od.material_id = m.id
         WHERE od.order_id = ?`,
          [order.id]
        );
      }

      const orderData = {
        id: order.id,
        order_no: order.order_no,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        order_date: order.order_date,
        delivery_date: order.delivery_date,
        status: order.status,
        total_amount: parseFloat(order.total_amount),
        total_with_tax: order.total_with_tax ? parseFloat(order.total_with_tax) : undefined,
        ...currencyFieldsOf(order),
        items: (items as DbRow[]).map((item: DbRow) => ({
          material_id: item.material_id || null,
          material_code: item.material_code || '',
          material_name: item.material_name || '',
          quantity: parseFloat(item.quantity),
          unit: item.unit || '',
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price || item.total_amount || 0),
        })),
        remark: order.remark,
        create_time: order.create_time,
        update_time: order.update_time,
      };

      return successResponse(orderData);
    }

    // 获取订单列表
    let sql = `SELECT so.*, c.customer_name FROM sal_order so LEFT JOIN crm_customer c ON so.customer_id = c.id WHERE so.deleted = 0`;
    const params: SqlValue[] = [];

    if (status && status !== 'all') {
      sql += ' AND so.status = ?';
      params.push(status);
    }

    if (keyword) {
      sql += ' AND (so.order_no LIKE ? OR c.customer_name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY so.create_time DESC';

    const orders = await query(sql, params);

    const orderList = await Promise.all(
      (orders as DbRow[]).map(async (order: DbRow) => {
        let items = await query('SELECT * FROM sal_order_item WHERE order_id = ?', [order.id]);

        if (!items || (items as DbRow[]).length === 0) {
          items = await query(
            `SELECT od.material_id, m.material_name, od.quantity, od.unit, od.unit_price, od.total_amount as total_price
           FROM sal_order_detail od
           LEFT JOIN inv_material m ON od.material_id = m.id
           WHERE od.order_id = ?`,
            [order.id]
          );
        }

        return {
          id: order.id,
          order_no: order.order_no,
          customer_id: order.customer_id,
          customer_name: order.customer_name,
          order_date: order.order_date,
          delivery_date: order.delivery_date,
          status: order.status,
          total_amount: parseFloat(order.total_amount),
          total_with_tax: order.total_with_tax ? parseFloat(order.total_with_tax) : undefined,
          ...currencyFieldsOf(order),
          items: (items as DbRow[]).map((item: DbRow) => ({
            material_id: item.material_id || null,
            material_code: item.material_code || '',
            material_name: item.material_name || '',
            quantity: parseFloat(item.quantity),
            unit: item.unit || '',
            unit_price: parseFloat(item.unit_price),
            total_price: parseFloat(item.total_price || item.total_amount || 0),
          })),
          remark: order.remark,
          create_time: order.create_time,
          update_time: order.update_time,
        };
      })
    );

    return successResponse({
      list: orderList,
      total: orderList.length,
    });
  },
  { errorMessage: '获取订单失败' }
);

// POST - 创建订单
export const POST = withPermission(
  async (request: NextRequest) => {
  const ts = await getTranslations('Common');
    const body = await request.json();

    const { customer_id, customer_name, delivery_date, order_date, items, remark, currency } =
      body;

    const finalCustomerId = customer_id || null;
    let finalCustomerName = customer_name || '';

    if (!finalCustomerName && finalCustomerId) {
      const customer = await queryOne(
        'SELECT customer_name FROM crm_customer WHERE id = ? AND deleted = 0',
        [finalCustomerId]
      );
      if (customer) {
        finalCustomerName = (customer as DbRow).customer_name;
      }
    }

    if (!finalCustomerName) {
      return errorResponse(ts('k_4bpl2g'), 400, 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(ts('k_12n97pp'), 400, 400);
    }

    for (const item of items) {
      if (!item.material_name || !item.quantity || !item.unit_price) {
        return errorResponse(ts('k_11ti01b'), 400, 400);
      }
      if (item.quantity <= 0) {
        return errorResponse(ts('k_1ewtigk'), 400, 400);
      }
      if (item.unit_price < 0) {
        return errorResponse(ts('k_1p0b05s'), 400, 400);
      }
    }

    const total_amount = items.reduce(
      (sum: number, item: DbRow) => sum + item.quantity * item.unit_price,
      0
    );

    // 币种与本位币快照（写入侧根因：修复前既不落 currency 也不落 base_*，
    // 导致所有订单 currency 取库默认、base_* 恒为 0）。口径与 SalesApplicationService 一致。
    const baseCurrency = (await getSystemConfig('finance.base_currency', 'CNY')) || 'CNY';
    const effectiveCurrency =
      String(currency || '').trim() ||
      (await getSystemConfig('finance.default_currency', 'CNY')) ||
      baseCurrency;

    let exchangeRate = 1;
    if (effectiveCurrency !== baseCurrency) {
      try {
        exchangeRate = await new CurrencyApplicationService(
          new MysqlCurrencyRepository()
        ).getLatestRate(effectiveCurrency, baseCurrency);
      } catch {
        // 汇率缺失时拒绝落单，避免写入错误的本位币金额
        return errorResponse(ts('k_uigql6'), 400, 400);
      }
    }

    const baseTotalAmount = convertToBase(total_amount, exchangeRate);
    // 税额按库中已记录的口径折算，不做自动加税（不改变 total_with_tax 既有语义）
    const recordedTax = Math.max(
      toFiniteNumber(body.total_with_tax, total_amount) - total_amount,
      0
    );
    const baseTaxAmount = convertToBase(recordedTax, exchangeRate);
    const baseGrandTotal = convertToBase(baseTotalAmount + baseTaxAmount, 1);

    const orderNo = await generateDocumentNo('sales_order');

    const orderResult = await query(
      `INSERT INTO sal_order (order_no, customer_id, order_date, delivery_date, total_amount,
        currency, exchange_rate, base_total_amount, base_tax_amount, base_grand_total,
        status, remark, create_time)
     VALUES (?, ?, COALESCE(?, CURDATE()), ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
      [
        orderNo,
        finalCustomerId,
        order_date || null,
        delivery_date,
        total_amount,
        effectiveCurrency,
        exchangeRate,
        baseTotalAmount,
        baseTaxAmount,
        baseGrandTotal,
        remark || '',
      ]
    );

    const orderId = (orderResult as DbRow).insertId;

    for (const item of items) {
      await query(
        `INSERT INTO sal_order_item (order_id, material_id, material_code, material_name, quantity, unit, unit_price, total_price, create_time, deleted) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
        [
          orderId,
          item.material_id || null,
          item.material_code || '',
          item.material_name,
          item.quantity,
          item.unit,
          item.unit_price,
          item.quantity * item.unit_price,
        ]
      );
    }

    return successResponse({ id: orderId, order_no: orderNo }, ts('k_odcdl0'));
  },
  { errorMessage: '创建订单失败' }
);

// PUT - 更新订单
export const PUT = withPermission(
  async (request: NextRequest) => {
  const ts = await getTranslations('Common');
    const body = await request.json();
    const { id, status, ...updateData } = body;

    if (!id) {
      return errorResponse(ts('k_jibosn'), 400, 400);
    }

    const orders = await query('SELECT * FROM sal_order WHERE id = ? AND deleted = 0', [id]);

    if (!orders || (orders as DbRow[]).length === 0) {
      return commonErrors.notFound(ts('k_2v2qxr'));
    }

    const order = (orders as DbRow[])[0];

    if (order.status === 'completed' || order.status === 'cancelled') {
      return errorResponse(ts('k_two405'), 400, 400);
    }

    const updateFields: string[] = [];
    const updateParams: SqlValue[] = [];

    if (status) {
      updateFields.push('status = ?');
      updateParams.push(status);
    }

    if (updateData.delivery_date) {
      updateFields.push('delivery_date = ?');
      updateParams.push(updateData.delivery_date);
    }

    if (updateData.remark !== undefined) {
      updateFields.push('remark = ?');
      updateParams.push(updateData.remark);
    }

    if (updateFields.length > 0) {
      updateParams.push(order.id);
      await query(
        `UPDATE sal_order SET ${updateFields.join(', ')}, update_time = NOW() WHERE id = ?`,
        updateParams
      );
    }

    return successResponse({ id, status, ...updateData }, ts('k_usync9'));
  },
  { errorMessage: '更新订单失败' }
);

// DELETE - 删除订单
export const DELETE = withPermission(
  async (request: NextRequest) => {
  const ts = await getTranslations('Common');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse(ts('k_jibosn'), 400, 400);
    }

    // 查询订单
    const orders = await query('SELECT * FROM sal_order WHERE id = ? AND deleted = 0', [id]);

    if (!orders || (orders as DbRow[]).length === 0) {
      return commonErrors.notFound(ts('k_2v2qxr'));
    }

    const order = (orders as DbRow[])[0];

    // 同上：改为按契约码比较（仅「已完成」不可删除，保持原语义）
    if (normalizeSalesOrderStatus(order.status) === SalesOrderStatusCode.COMPLETED) {
      return errorResponse(ts('k_jzbcvs'), 400, 400);
    }

    await query('UPDATE sal_order SET deleted = 1, update_time = NOW() WHERE id = ?', [order.id]);

    return successResponse(null, ts('k_11hx0td'));
  },
  { errorMessage: '删除订单失败' }
);
