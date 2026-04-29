import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  commonErrors,
  withErrorHandler,
} from '@/lib/api-response';

const STATUS_MAP: Record<string, string> = {
  '1': '待确认',
  '2': '已确认',
  '3': '部分发货',
  '4': '已完成',
  '5': '已取消',
  '10': '草稿',
  '20': '已确认',
  '30': '生产中',
  '40': '已发货',
  '50': '已完成',
  '60': '已对账',
};

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const format = searchParams.get('format') || 'pdf';

  if (format === 'excel' || format === 'xls' || format === 'csv') {
    const orders = await query(
      `SELECT so.order_no, c.customer_name, so.order_date, so.delivery_date,
              so.total_amount, so.status, so.remark
       FROM sal_order so
       LEFT JOIN crm_customer c ON so.customer_id = c.id
       WHERE so.deleted = 0
       ORDER BY so.create_time DESC`
    );

    const BOM = '\uFEFF';
    const headers = ['订单号', '客户名称', '订单日期', '交货日期', '订单金额', '状态', '备注'];
    const rows = (orders as any[]).map(order => [
      `"${order.order_no || ''}"`,
      `"${order.customer_name || ''}"`,
      order.order_date || '',
      order.delivery_date || '',
      order.total_amount || 0,
      STATUS_MAP[String(order.status)] || order.status,
      `"${(order.remark || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = BOM + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8-sig',
        'Content-Disposition': `attachment; filename*=UTF-8''orders_${new Date().toISOString().split('T')[0]}.csv`,
      },
    });
  }

  if (!id) {
    return commonErrors.badRequest('订单编号不能为空');
  }

  const orders = await query(
    'SELECT so.*, c.customer_name FROM sal_order so LEFT JOIN crm_customer c ON so.customer_id = c.id WHERE so.order_no = ? AND so.deleted = 0',
    [id]
  );

  if (!orders || (orders as any[]).length === 0) {
    return commonErrors.notFound('订单不存在');
  }

  const order = (orders as any[])[0];

  const items = await query(
    'SELECT * FROM sal_order_item WHERE order_id = ?',
    [order.id]
  );

  const statusLabel = STATUS_MAP[String(order.status)] || order.status;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>订单 ${order.order_no}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; padding: 20px; color: #333; }
    h1 { text-align: center; border-bottom: 3px solid #1a56db; padding-bottom: 12px; color: #1a56db; }
    .info { margin: 20px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
    .info-row { display: flex; }
    .info-label { width: 100px; font-weight: bold; color: #555; }
    .info-value { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
    th { background-color: #f0f4ff; font-weight: bold; color: #1a56db; }
    tr:nth-child(even) { background-color: #fafafa; }
    .total { text-align: right; margin-top: 20px; font-size: 20px; font-weight: bold; color: #1a56db; }
    .footer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #ddd; color: #999; font-size: 12px; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <h1>销售订单</h1>
  <div class="info">
    <div class="info-row"><span class="info-label">订单号：</span><span class="info-value">${order.order_no}</span></div>
    <div class="info-row"><span class="info-label">客户：</span><span class="info-value">${order.customer_name || '-'}</span></div>
    <div class="info-row"><span class="info-label">订单日期：</span><span class="info-value">${order.order_date || '-'}</span></div>
    <div class="info-row"><span class="info-label">交货日期：</span><span class="info-value">${order.delivery_date || '-'}</span></div>
    <div class="info-row"><span class="info-label">状态：</span><span class="info-value">${statusLabel}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>产品</th>
        <th style="text-align:right">数量</th>
        <th>单位</th>
        <th style="text-align:right">单价</th>
        <th style="text-align:right">金额</th>
      </tr>
    </thead>
    <tbody>
      ${(items as any[]).map(item => `
        <tr>
          <td>${item.material_name || ''}</td>
          <td style="text-align:right">${item.quantity}</td>
          <td>${item.unit || ''}</td>
          <td style="text-align:right">¥${Number(item.unit_price || 0).toFixed(2)}</td>
          <td style="text-align:right">¥${Number(item.total_price || 0).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="total">订单总金额：¥${Number(order.total_amount || 0).toFixed(2)}</div>
  ${order.remark ? `<div style="margin-top:20px"><strong>备注：</strong>${order.remark}</div>` : ''}
  <div class="footer">
    <span>越南达昌印刷科技有限公司</span>
    <span>打印时间：${new Date().toLocaleString('zh-CN')}</span>
  </div>
</body>
</html>`;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''order_${order.order_no}.html`,
    },
  });
}, '导出订单失败');
