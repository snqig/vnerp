'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { statusConfig, type InboundItem, type InboundRecord } from '../types';
import { InboundRecordActions, type OutboundKind } from './InboundRecordActions';

export type InboundViewMode = 'list' | 'table' | 'kanban';

type RecordId = string | number;

interface InboundRecordViewsProps {
  viewMode: InboundViewMode;
  records: InboundRecord[];
  selectedRecords: RecordId[];
  setSelectedRecords: (updater: RecordId[] | ((prev: RecordId[]) => RecordId[])) => void;
  onEdit: (r: InboundRecord) => void;
  onAudit: (r: InboundRecord) => void;
  onPrint: (r: InboundRecord) => void;
  onTransfer: (r: InboundRecord) => void;
  onOutbound: (kind: OutboundKind, r: InboundRecord) => void;
  onDelete: (r: InboundRecord) => void;
}

interface DerivedItem {
  materialCode: string;
  materialSummary: string;
  spec: string;
  qtyUnit: string;
  warehouseName: string;
  poNo: string;
  batchNo: string;
}

function deriveItem(record: InboundRecord): DerivedItem {
  const firstItem = record.items?.[0] || ({} as Partial<InboundItem>);
  const materialCode = firstItem.material_code || '-';
  const materialSummary =
    (record.items?.length || 0) > 1
      ? `${firstItem.material_name} 等${record.items?.length}项`
      : firstItem.material_name || '-';
  const spec = firstItem.material_spec || '-';
  const qtyUnit =
    firstItem.quantity !== undefined
      ? `${firstItem.quantity} ${firstItem.unit || ''}`
      : `共 ${record.total_quantity || 0} 件`;
  const warehouseName = record.warehouse_name || '-';
  const poNo = record.po_no || '-';
  const batchNo = firstItem.batch_no || '-';
  return { materialCode, materialSummary, spec, qtyUnit, warehouseName, poNo, batchNo };
}

const KANBAN_COLUMNS: { status: string; labelKey: string }[] = [
  { status: 'draft', labelKey: 'draft' },
  { status: 'pending', labelKey: 'pending' },
  { status: 'rejected', labelKey: 'rejected' },
  { status: 'approved', labelKey: 'approved' },
  { status: 'completed', labelKey: 'completed' },
];

export function InboundRecordViews({
  viewMode,
  records,
  selectedRecords,
  setSelectedRecords,
  onEdit,
  onAudit,
  onPrint,
  onTransfer,
  onOutbound,
  onDelete,
}: InboundRecordViewsProps) {
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const allSelected = records.length > 0 && selectedRecords.length === records.length;
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(records.map((r) => r.id));
    } else {
      setSelectedRecords([]);
    }
  };
  const toggleOne = (id: number, checked: boolean) => {
    setSelectedRecords((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  if (records.length === 0) {
    return <div className="text-center py-8 text-gray-500">{t('noInboundRecords')}</div>;
  }

  /* ---------- 列表视图（沿用卡片网格） ---------- */
  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(c) => toggleSelectAll(Boolean(c))}
          />
          <span className="text-sm text-muted-foreground">
            {allSelected ? t('cancelSelectAll') : t('selectAll')}
          </span>
        </div>
        {records.map((record) => {
          const statusInfo = statusConfig[record.status] || statusConfig.draft;
          const d = deriveItem(record);
          return (
            <div key={record.id} className="p-4 border rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Checkbox
                  checked={selectedRecords.includes(record.id)}
                  onCheckedChange={(c) => toggleOne(record.id, Boolean(c))}
                />
                <p className="font-medium text-sm">{record.order_no}</p>
                <Badge className={statusInfo.color}>{tc(statusInfo.labelKey)}</Badge>
                <div className="ml-auto">
                  <InboundRecordActions
                    record={record}
                    onEdit={() => onEdit(record)}
                    onAudit={() => onAudit(record)}
                    onPrint={() => onPrint(record)}
                    onTransfer={() => onTransfer(record)}
                    onOutbound={(k) => onOutbound(k, record)}
                    onDelete={() => onDelete(record)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 ml-7">
                <div>
                  <p className="text-xs text-gray-500">{tc('materialCode')}</p>
                  <p className="text-sm truncate">{d.materialCode}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tc('material')}</p>
                  <p className="font-medium text-sm truncate">{d.materialSummary}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tc('specification')}</p>
                  <p className="text-sm truncate">{d.spec}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tc('quantity')}/{tc('unit')}</p>
                  <p className="text-sm">{d.qtyUnit}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tc('supplier')}</p>
                  <p className="text-sm truncate">{record.supplier_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tc('warehouse')}</p>
                  <p className="text-sm truncate">{d.warehouseName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('purchaseOrderNo')}</p>
                  <p className="text-sm truncate">{d.poNo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tc('batchNo')}</p>
                  <p className="text-sm truncate">{d.batchNo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tc('currency')}</p>
                  <p className="text-sm">{record.currency || 'CNY'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">{tc('remark')}</p>
                  <p className="text-sm truncate">{record.remark || '-'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ---------- 表格视图（密集表格） ---------- */
  if (viewMode === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="p-2 w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(c) => toggleSelectAll(Boolean(c))}
                />
              </th>
              <th className="p-2 font-medium">{t('inboundNo')}</th>
              <th className="p-2 font-medium">{tc('status')}</th>
              <th className="p-2 font-medium">{tc('materialCode')}</th>
              <th className="p-2 font-medium">{tc('material')}</th>
              <th className="p-2 font-medium">{tc('specification')}</th>
              <th className="p-2 font-medium">{tc('quantity')}/{tc('unit')}</th>
              <th className="p-2 font-medium">{tc('supplier')}</th>
              <th className="p-2 font-medium">{tc('warehouse')}</th>
              <th className="p-2 font-medium">{t('purchaseOrderNo')}</th>
              <th className="p-2 font-medium">{tc('batchNo')}</th>
              <th className="p-2 font-medium text-right">{tc('operation')}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const statusInfo = statusConfig[record.status] || statusConfig.draft;
              const d = deriveItem(record);
              return (
                <tr key={record.id} className="border-b hover:bg-muted/50 transition-colors">
                  <td className="p-2">
                    <Checkbox
                      checked={selectedRecords.includes(record.id)}
                      onCheckedChange={(c) => toggleOne(record.id, Boolean(c))}
                    />
                  </td>
                  <td className="p-2 font-medium whitespace-nowrap">{record.order_no}</td>
                  <td className="p-2">
                    <Badge className={statusInfo.color}>{tc(statusInfo.labelKey)}</Badge>
                  </td>
                  <td className="p-2 text-gray-600 whitespace-nowrap">{d.materialCode}</td>
                  <td className="p-2 max-w-[180px] truncate" title={d.materialSummary}>
                    {d.materialSummary}
                  </td>
                  <td className="p-2 text-gray-600 whitespace-nowrap">{d.spec}</td>
                  <td className="p-2 whitespace-nowrap">{d.qtyUnit}</td>
                  <td className="p-2 max-w-[140px] truncate" title={record.supplier_name}>
                    {record.supplier_name || '-'}
                  </td>
                  <td className="p-2 max-w-[120px] truncate" title={d.warehouseName}>
                    {d.warehouseName}
                  </td>
                  <td className="p-2 text-gray-600 whitespace-nowrap">{d.poNo}</td>
                  <td className="p-2 text-gray-600 whitespace-nowrap">{d.batchNo}</td>
                  <td className="p-2 text-right">
                    <InboundRecordActions
                      record={record}
                      onEdit={() => onEdit(record)}
                      onAudit={() => onAudit(record)}
                      onPrint={() => onPrint(record)}
                      onTransfer={() => onTransfer(record)}
                      onOutbound={(k) => onOutbound(k, record)}
                      onDelete={() => onDelete(record)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  /* ---------- 看板视图（按状态分列） ---------- */
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {KANBAN_COLUMNS.map((col) => {
        const colRecords = records.filter((r) => String(r.status) === col.status);
        const colSelected = colRecords.filter((r) => selectedRecords.includes(r.id)).length;
        const statusInfo = statusConfig[col.status] || statusConfig.draft;
        return (
          <div key={col.status} className="flex-shrink-0 w-64 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-lg bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <Badge className={statusInfo.color}>{tc(col.labelKey)}</Badge>
                <span className="text-sm text-muted-foreground">{colRecords.length}</span>
              </div>
              {colRecords.length > 0 && (
                <Checkbox
                  checked={colSelected > 0 && colSelected === colRecords.length}
                  onCheckedChange={(c) =>
                    setSelectedRecords((prev) => {
                      const ids = colRecords.map((r) => r.id);
                      const set = new Set(prev);
                      if (c) ids.forEach((id) => set.add(id));
                      else ids.forEach((id) => set.delete(id));
                      return Array.from(set);
                    })
                  }
                  aria-label={t('selectAll')}
                />
              )}
            </div>
            <div className="space-y-3">
              {colRecords.map((record) => {
                const d = deriveItem(record);
                return (
                  <div
                    key={record.id}
                    className="border rounded-lg p-3 bg-white dark:bg-slate-900 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={selectedRecords.includes(record.id)}
                        onCheckedChange={(c) => toggleOne(record.id, Boolean(c))}
                      />
                      <span className="font-medium text-sm truncate" title={record.order_no}>
                        {record.order_no}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate" title={d.materialSummary}>
                      {d.materialSummary}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{d.spec}</p>
                    <p className="text-sm mt-1">{d.qtyUnit}</p>
                    <p className="text-xs text-gray-500 truncate mt-1" title={record.supplier_name}>
                      {record.supplier_name || '-'} · {d.warehouseName}
                    </p>
                    <div className="mt-2 flex justify-end">
                      <InboundRecordActions
                        record={record}
                        onEdit={() => onEdit(record)}
                        onAudit={() => onAudit(record)}
                        onPrint={() => onPrint(record)}
                        onTransfer={() => onTransfer(record)}
                        onOutbound={(k) => onOutbound(k, record)}
                        onDelete={() => onDelete(record)}
                      />
                    </div>
                  </div>
                );
              })}
              {colRecords.length === 0 && (
                <div className="text-center text-xs text-gray-400 py-4 border border-dashed rounded-lg">
                  {t('noInboundRecords')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
