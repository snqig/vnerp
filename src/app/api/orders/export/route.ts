import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { commonErrors } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { getTranslator } from '@/lib/i18n-server';

export const GET = withPermission(async (request: NextRequest, _userInfo) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const format = searchParams.get('format') || 'pdf';

  // 获取翻译函数
  const t = await getTranslator('Export');

  // 状态映射
  const STATUS_MAP: Record<string, string> = {
    '1': t('statusPending'),
    '2': t('statusConfirmed'),
    '3': t('statusPartialShip'),
    '4': t('statusCompleted'),
    '5': t('statusCancelled'),
    '10': t('statusDraft'),
    '20': t('statusConfirmed'),
    '30': t('statusInProduction'),
    '40': t('statusShipped'),
    '50': t('statusCompleted'),
    '60': t('statusReconciled'),
  };

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
    const headers = [
      t('orderNo'),
      t('customerName'),
      t('orderDate'),
      t('deliveryDate'),
      t('orderAmount'),
      t('status'),
      t('remark'),
    ];
    const rows = (orders as Loose[]).map((order) => [
      `"${order.order_no || ''}"`,
      `"${order.customer_name || ''}"`,
      order.order_date || '',
      order.delivery_date || '',
      order.total_amount || 0,
      STATUS_MAP[String(order.status)] || order.status,
      `"${(order.remark || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = BOM + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8-sig',
        'Content-Disposition': `attachment; filename*=UTF-8''orders_${new Date().toISOString().split('T')[0]}.csv`,
      },
    });
  }

  if (!id) {
    return commonErrors.badRequest(t('orderIdRequired'));
  }

  const orders = await query(
    'SELECT so.*, c.customer_name FROM sal_order so LEFT JOIN crm_customer c ON so.customer_id = c.id WHERE so.order_no = ? AND so.deleted = 0',
    [id]
  );

  if (!orders || (orders as Loose[]).length === 0) {
    return commonErrors.notFound(t('orderNotFound'));
  }

  const order = (orders as Loose[])[0];

  const items = await query('SELECT * FROM sal_order_item WHERE order_id = ?', [order.id]);

  const statusLabel = STATUS_MAP[String(order.status)] || order.status;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${t('orderTitle')} ${order.order_no}</title>
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
  <h1>${t('salesOrder')}</h1>
  <div class="info">
    <div class="info-row"><span class="info-label">${t('orderNoLabel')}</span><span class="info-value">${order.order_no}</span></div>
    <div class="info-row"><span class="info-label">${t('customerLabel')}</span><span class="info-value">${order.customer_name || '-'}</span></div>
    <div class="info-row"><span class="info-label">${t('orderDateLabel')}</span><span class="info-value">${order.order_date || '-'}</span></div>
    <div class="info-row"><span class="info-label">${t('deliveryDateLabel')}</span><span class="info-value">${order.delivery_date || '-'}</span></div>
    <div class="info-row"><span class="info-label">${t('statusLabel')}</span><span class="info-value">${statusLabel}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${t('product')}</th>
        <th style="text-align:right">${t('quantity')}</th>
        <th>${t('unit')}</th>
        <th style="text-align:right">${t('unitPrice')}</th>
        <th style="text-align:right">${t('amount')}</th>
      </tr>
    </thead>
    <tbody>
      ${(items as Loose[])
        .map(
          (item) => `
        <tr>
          <td>${item.material_name || ''}</td>
          <td style="text-align:right">${item.quantity}</td>
          <td>${item.unit || ''}</td>
          <td style="text-align:right">¥${Number(item.unit_price || 0).toFixed(2)}</td>
          <td style="text-align:right">¥${Number(item.total_price || 0).toFixed(2)}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  <div class="total">${t('totalAmountLabel')}: ¥${Number(order.total_amount || 0).toFixed(2)}</div>
  ${order.remark ? `<div style="margin-top:20px"><strong>${t('remarkLabel')}:</strong>${order.remark}</div>` : ''}
  <div class="footer">
    <span>${t('companyName')}</span>
    <span>${t('printTimeLabel')}: ${new Date().toLocaleString('zh-CN')}</span>
  </div>
</body>
</html>`;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''order_${order.order_no}.html`,
    },
  });
});
