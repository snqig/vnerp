import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { exportReportToExcel, ReportColumnDef } from '@/lib/excel-report-service';

const OP_TYPE_MAP: Record<number, string> = {
  0: 'other',
  1: 'purchase_inbound',
  2: 'production_outbound',
  3: 'qc',
  4: 'return',
  5: 'adjust',
  6: 'split_in',
  7: 'split_out',
};

const OP_LABEL_CN: Record<string, string> = {
  purchase_inbound: '购入',
  production_outbound: '生产出库',
  qc: '品管',
  return: '退货',
  adjust: '调整',
  other: '其他',
  split_in: '分切入库',
  split_out: '分切出库',
};

const BASE_COLUMNS = [
  { key: 'materialCode', header: '物料编码', width: 15 },
  { key: 'materialName', header: '物料名称', width: 20 },
  { key: 'specDisplay', header: '规格', width: 15 },
  { key: 'unit', header: '单位', width: 8 },
  { key: 'categoryName', header: '分类', width: 12 },
  { key: 'supplierName', header: '供应商', width: 15 },
  { key: 'warehouseName', header: '仓库', width: 12 },
];

function getDateColumnKey(day: number, opKey: string, field: 'qty' | 'amount'): string {
  return `d${day}_${opKey}_${field}`;
}

export const GET = withPermission(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const viewMode = searchParams.get('viewMode') || 'all';
    const keyword = searchParams.get('keyword') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const exportFlag = searchParams.get('export') === '1';

    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    let whereClause = `WHERE DATE_FORMAT(l.create_time, '%Y-%m') = ?`;
    const queryParams: (string | number)[] = [monthStr];

    if (viewMode === 'large') {
      whereClause += ` AND (l.batch_type IS NULL OR l.batch_type = 0)`;
    } else if (viewMode === 'small') {
      whereClause += ` AND l.batch_type = 1`;
    }

    const dailySql = `
      SELECT
        m.id as material_id,
        m.material_code,
        m.material_name,
        m.specification,
        m.width,
        m.length,
        m.unit_mark,
        COALESCE(l.unit, m.unit) as unit,
        mc.name as category_name,
        s.supplier_name,
        w.warehouse_name,
        DATE_FORMAT(l.create_time, '%d') as day_num,
        l.business_type,
        l.operation_type,
        l.operation_qty,
        l.unit_price,
        l.batch_type,
        l.batch_no,
        l.warehouse_id
      FROM inv_inventory_log l
      LEFT JOIN inv_material m ON l.material_id = m.id
      LEFT JOIN inv_material_category mc ON m.category_id = mc.id
      LEFT JOIN pur_supplier s ON l.supplier_id = s.id
      LEFT JOIN inv_warehouse w ON l.warehouse_id = w.id
      ${whereClause}
      ORDER BY m.material_code, l.create_time
    `;

    const rows = (await query(dailySql, queryParams)) as Loose[];

    const grouped: Record<string, Loose> = {};
    for (const row of rows) {
      const key = `${row.material_id}_${row.warehouse_id || 0}`;
      if (!grouped[key]) {
        const w = parseFloat(row.width) || 0;
        const l = parseFloat(row.length) || 0;
        let specDisplay = row.specification || '';
        if (viewMode === 'large' && w > 0) {
          specDisplay = l > 0 ? `${w}*${l}` : `${w}`;
        } else if (viewMode === 'small' && w > 0) {
          specDisplay = `${w}`;
        }

        grouped[key] = {
          material_id: row.material_id,
          materialCode: row.material_code || '',
          materialName: row.material_name || '',
          specification: row.specification || '',
          specDisplay,
          unit: row.unit || '',
          width: w,
          length: l,
          categoryName: row.category_name || '',
          supplierName: row.supplier_name || '',
          warehouseName: row.warehouse_name || '',
          warehouseId: row.warehouse_id,
        };
      }

      const day = parseInt(row.day_num);
      if (day < 1 || day > 31) continue;

      const opType = parseInt(row.operation_type) || 0;
      const opKey = OP_TYPE_MAP[opType] || 'other';
      const qty = parseFloat(row.operation_qty) || 0;
      const price = parseFloat(row.unit_price) || 0;
      const amount = Math.abs(qty * price);

      const qtyKey = getDateColumnKey(day, opKey, 'qty');
      const amtKey = getDateColumnKey(day, opKey, 'amount');

      grouped[key][qtyKey] = (grouped[key][qtyKey] || 0) + Math.abs(qty);
      grouped[key][amtKey] = (grouped[key][amtKey] || 0) + amount;
    }

    let result = Object.values(grouped);

    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (r) =>
          (r.materialCode || '').toLowerCase().includes(kw) ||
          (r.materialName || '').toLowerCase().includes(kw)
      );
    }

    if (exportFlag) {
      const colDefs: ReportColumnDef[] = [
        {
          header: '基础信息',
          children: BASE_COLUMNS.map((c) => ({
            key: c.key,
            header: c.header,
            width: c.width,
          })),
        },
      ];

      const opKeys = Object.keys(OP_LABEL_CN);
      for (let day = 1; day <= daysInMonth; day++) {
        const dayChildren: ReportColumnDef['children'] = [];
        for (const opKey of opKeys) {
          const label = OP_LABEL_CN[opKey] || opKey;
          dayChildren.push(
            {
              key: getDateColumnKey(day, opKey, 'qty'),
              header: `${day}日${label}数量`,
              width: 12,
              formatter: (v) => String(v ?? '0'),
            },
            {
              key: getDateColumnKey(day, opKey, 'amount'),
              header: `${day}日${label}金额`,
              width: 12,
              formatter: (v) => String(v ?? '0'),
            }
          );
        }
        colDefs.push({ header: `${day}日`, children: dayChildren });
      }

      const buffer = exportReportToExcel({
        fileName: `库存月报_${year}${String(month).padStart(2, '0')}`,
        sheetName: `${year}年${month}月`,
        columnDefs: colDefs,
        data: result as Record<string, unknown>[],
        title: `库存月报 ${year}年${month}月`,
        freezeRow: 2,
        freezeCol: 1,
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="inventory_report_${year}${String(month).padStart(2, '0')}.xlsx"`,
        },
      });
    }

    const total = result.length;
    const offset = (page - 1) * pageSize;
    const paged = result.slice(offset, offset + pageSize);

    return successResponse({ list: paged, total, page, pageSize });
  },
  { errorMessage: '获取库存月报失败' }
);
